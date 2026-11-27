"use server";

import bcrypt from "bcryptjs";
import { and, count, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import { requireAdmin, requirePlayer } from "@/lib/auth";
import { attrsFor, GK_ROLES, POSITIONS, type GkRole, type Position, type Ratings } from "@/lib/domain";
import { evaluate } from "@/lib/draw";
import { listPlayers, listSignups, toDrawPlayer } from "@/lib/queries";
import { createSession, destroySession } from "@/lib/session";

export type FormState = { error?: string; ok?: string } | undefined;

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const isPin = (s: string) => /^\d{4}$/.test(s);
const asPosition = (s: string): Position | null => ((POSITIONS as readonly string[]).includes(s) ? (s as Position) : null);
const asGkRole = (s: string): GkRole => ((GK_ROLES as readonly string[]).includes(s) ? (s as GkRole) : "nao");

function readRatings(fd: FormData, gkRole: GkRole, prefix = "r_"): Ratings | null {
  const out: Ratings = {};
  for (const a of attrsFor(gkRole)) {
    const v = Number(fd.get(prefix + a));
    if (!Number.isInteger(v) || v < 1 || v > 10) return null;
    out[a] = v;
  }
  return out;
}

function readSecondary(fd: FormData, primary: Position): Position[] {
  return fd
    .getAll("secondary")
    .map((v) => asPosition(String(v)))
    .filter((p): p is Position => !!p && p !== primary && p !== "GOL");
}

// ---------- entrada ----------

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const playerId = str(fd, "playerId");
  const pin = str(fd, "pin");
  if (!playerId) return { error: "Escolha seu nome na lista." };
  if (!isPin(pin)) return { error: "O PIN tem 4 números." };

  const db = await getDb();
  const [p] = await db.select().from(schema.players).where(eq(schema.players.id, playerId));
  if (!p || !p.active) return { error: "Esse jogador não está mais no elenco. Fale com o organizador." };
  if (p.lockedUntil && p.lockedUntil > new Date()) {
    const min = Math.ceil((p.lockedUntil.getTime() - Date.now()) / 60000);
    return { error: `Muitas tentativas erradas. Tente de novo em ${min} min ou peça ao organizador para redefinir seu PIN.` };
  }
  if (!(await bcrypt.compare(pin, p.pinHash))) {
    const attempts = p.failedPinAttempts + 1;
    const locked = attempts >= MAX_ATTEMPTS;
    await db
      .update(schema.players)
      .set({
        failedPinAttempts: locked ? 0 : attempts,
        lockedUntil: locked ? new Date(Date.now() + LOCK_MINUTES * 60000) : null,
      })
      .where(eq(schema.players.id, p.id));
    return {
      error: locked
        ? `PIN errado. Entrada bloqueada por ${LOCK_MINUTES} minutos.`
        : `PIN errado. Restam ${MAX_ATTEMPTS - attempts} tentativas.`,
    };
  }
  await db.update(schema.players).set({ failedPinAttempts: 0, lockedUntil: null }).where(eq(schema.players.id, p.id));
  await createSession(p.id);
  redirect("/");
}

/** Só funciona com o banco vazio: cria o primeiro organizador. */
export async function setupOrganizer(_: FormState, fd: FormData): Promise<FormState> {
  const db = await getDb();
  const [{ n }] = await db.select({ n: count() }).from(schema.players);
  if (n > 0) return { error: "O elenco já foi criado. Entre com seu nome e PIN." };
  const name = str(fd, "name");
  const pin = str(fd, "pin");
  const primary = asPosition(str(fd, "primary"));
  if (name.length < 2) return { error: "Digite seu nome." };
  if (!isPin(pin)) return { error: "O PIN precisa ter 4 números." };
  if (!primary) return { error: "Escolha sua posição." };
  const [p] = await db
    .insert(schema.players)
    .values({
      name,
      primaryPosition: primary,
      gkRole: primary === "GOL" ? "fixo" : "nao",
      pinHash: await bcrypt.hash(pin, 10),
      role: "admin",
    })
    .returning();
  await createSession(p.id);
  redirect("/admin");
}

export async function logout() {
  await destroySession();
  redirect("/entrar");
}

// ---------- votação ----------

export async function saveVote(_: FormState, fd: FormData): Promise<FormState> {
  const me = await requirePlayer();
  const targetId = str(fd, "targetId");
  if (targetId === me.id) return { error: "Sua própria carta você ajusta no perfil." };
  const db = await getDb();
  const [target] = await db.select().from(schema.players).where(eq(schema.players.id, targetId));
  if (!target || !target.active) return { error: "Jogador não encontrado." };
  const ratings = readRatings(fd, target.gkRole);
  if (!ratings) return { error: "Dê uma nota de 1 a 10 em cada atributo." };
  await db
    .insert(schema.votes)
    .values({ voterId: me.id, targetId, ratings })
    .onConflictDoUpdate({
      target: [schema.votes.voterId, schema.votes.targetId],
      set: { ratings, updatedAt: new Date() },
    });
  revalidatePath("/", "layout");
  return { ok: "Voto salvo." };
}

// ---------- perfil ----------

export async function updateProfile(_: FormState, fd: FormData): Promise<FormState> {
  const me = await requirePlayer();
  const primary = asPosition(str(fd, "primary"));
  if (!primary) return { error: "Escolha sua posição principal." };
  const gkRole: GkRole = primary === "GOL" ? "fixo" : asGkRole(str(fd, "gkRole")) === "fixo" ? "quebra_galho" : asGkRole(str(fd, "gkRole"));
  const selfRatings = readRatings(fd, gkRole);
  if (!selfRatings) return { error: "Dê uma nota de 1 a 10 em cada atributo da autoavaliação." };
  const nickname = str(fd, "nickname").slice(0, 24) || null;
  const db = await getDb();
  await db
    .update(schema.players)
    .set({ nickname, primaryPosition: primary, secondaryPositions: readSecondary(fd, primary), gkRole, selfRatings })
    .where(eq(schema.players.id, me.id));
  revalidatePath("/", "layout");
  return { ok: "Perfil salvo." };
}

export async function changePin(_: FormState, fd: FormData): Promise<FormState> {
  const me = await requirePlayer();
  const current = str(fd, "current");
  const next = str(fd, "next");
  if (!(await bcrypt.compare(current, me.pinHash))) return { error: "O PIN atual não confere." };
  if (!isPin(next)) return { error: "O novo PIN precisa ter 4 números." };
  const db = await getDb();
  await db.update(schema.players).set({ pinHash: await bcrypt.hash(next, 10) }).where(eq(schema.players.id, me.id));
  return { ok: "PIN trocado." };
}

// ---------- foto da carta ----------

const MAX_PHOTO_BYTES = 300 * 1024;
const PHOTO_SIGNATURES: Record<string, (b: Buffer) => boolean> = {
  "image/jpeg": (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  "image/png": (b) => b.subarray(0, 4).toString("hex") === "89504e47",
  "image/webp": (b) => b.subarray(0, 4).toString("ascii") === "RIFF" && b.subarray(8, 12).toString("ascii") === "WEBP",
};

/** Cada um troca a própria foto; o organizador pode trocar a de qualquer um. */
async function canEditPhoto(playerId: string) {
  const me = await requirePlayer();
  return me.id === playerId || me.role === "admin";
}

export async function savePhoto(playerId: string, dataUrl: string): Promise<FormState> {
  if (!(await canEditPhoto(playerId))) return { error: "Você só pode trocar a sua foto." };
  const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) return { error: "Formato de imagem não aceito. Use uma foto JPG ou PNG." };
  const [, mime, b64] = m;
  const bytes = Buffer.from(b64, "base64");
  if (bytes.length > MAX_PHOTO_BYTES) return { error: "A foto ficou grande demais. Tente outra." };
  if (!PHOTO_SIGNATURES[mime](bytes)) return { error: "O arquivo não parece ser uma imagem." };

  const db = await getDb();
  const now = new Date();
  await db
    .insert(schema.playerPhotos)
    .values({ playerId, mime, data: b64, updatedAt: now })
    .onConflictDoUpdate({ target: schema.playerPhotos.playerId, set: { mime, data: b64, updatedAt: now } });
  await db
    .update(schema.players)
    .set({ photoUrl: `/foto/${playerId}?v=${now.getTime()}` })
    .where(eq(schema.players.id, playerId));
  revalidatePath("/", "layout");
  return { ok: "Foto salva." };
}

export async function removePhoto(playerId: string): Promise<FormState> {
  if (!(await canEditPhoto(playerId))) return { error: "Você só pode tirar a sua foto." };
  const db = await getDb();
  await db.delete(schema.playerPhotos).where(eq(schema.playerPhotos.playerId, playerId));
  await db.update(schema.players).set({ photoUrl: null }).where(eq(schema.players.id, playerId));
  revalidatePath("/", "layout");
  return { ok: "Foto removida." };
}

// ---------- organizador: elenco ----------

export async function createPlayer(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const name = str(fd, "name");
  const pin = str(fd, "pin");
  const primary = asPosition(str(fd, "primary"));
  if (name.length < 2) return { error: "Digite o nome do jogador." };
  if (!primary) return { error: "Escolha a posição principal." };
  if (!isPin(pin)) return { error: "O PIN inicial precisa ter 4 números." };
  const gkRole: GkRole = primary === "GOL" ? "fixo" : asGkRole(str(fd, "gkRole")) === "fixo" ? "quebra_galho" : asGkRole(str(fd, "gkRole"));
  const db = await getDb();
  await db.insert(schema.players).values({
    name,
    primaryPosition: primary,
    secondaryPositions: readSecondary(fd, primary),
    gkRole,
    pinHash: await bcrypt.hash(pin, 10),
  });
  revalidatePath("/", "layout");
  return { ok: `${name} entrou no elenco. Passe o PIN no privado.` };
}

export async function resetPin(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const id = str(fd, "playerId");
  const pin = str(fd, "pin");
  if (!isPin(pin)) return { error: "O PIN precisa ter 4 números." };
  const db = await getDb();
  await db
    .update(schema.players)
    .set({ pinHash: await bcrypt.hash(pin, 10), failedPinAttempts: 0, lockedUntil: null })
    .where(eq(schema.players.id, id));
  return { ok: "PIN redefinido." };
}

export async function setPlayerActive(id: string, active: boolean) {
  const me = await requireAdmin();
  if (id === me.id && !active) return;
  const db = await getDb();
  await db.update(schema.players).set({ active }).where(eq(schema.players.id, id));
  revalidatePath("/", "layout");
}

export async function setPlayerRole(id: string, role: "admin" | "player") {
  const me = await requireAdmin();
  if (id === me.id) return;
  const db = await getDb();
  await db.update(schema.players).set({ role }).where(eq(schema.players.id, id));
  revalidatePath("/admin");
}

// ---------- jogo da semana ----------

export async function createMatch(_: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const date = str(fd, "date");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { error: "Escolha a data do jogo." };
  const place = str(fd, "place").slice(0, 60) || null;
  const db = await getDb();
  await db.update(schema.matches).set({ status: "encerrada" }).where(ne(schema.matches.status, "encerrada"));
  await db.insert(schema.matches).values({ date, place });
  revalidatePath("/", "layout");
  return { ok: "Jogo criado. Mande o link no grupo para a galera confirmar." };
}

export async function closeMatch(matchId: string) {
  await requireAdmin();
  const db = await getDb();
  await db.update(schema.matches).set({ status: "encerrada" }).where(eq(schema.matches.id, matchId));
  revalidatePath("/", "layout");
}

export async function setSignup(matchId: string, status: "vou" | "nao_vou") {
  const me = await requirePlayer();
  const db = await getDb();
  const [m] = await db.select().from(schema.matches).where(eq(schema.matches.id, matchId));
  if (!m || m.status === "encerrada") return;
  const [existing] = await db
    .select()
    .from(schema.signups)
    .where(and(eq(schema.signups.matchId, matchId), eq(schema.signups.playerId, me.id)));
  if (existing) {
    // Quem volta para "vou" depois de desistir vai para o fim da fila.
    const resetOrder = existing.status !== status && status === "vou";
    await db
      .update(schema.signups)
      .set({ status, ...(resetOrder ? { createdAt: new Date() } : {}) })
      .where(and(eq(schema.signups.matchId, matchId), eq(schema.signups.playerId, me.id)));
  } else {
    await db.insert(schema.signups).values({ matchId, playerId: me.id, status });
  }
  revalidatePath("/", "layout");
}

// ---------- sorteio ----------

export async function publishDraw(matchId: string, teamIds: string[][]): Promise<FormState> {
  await requireAdmin();
  const db = await getDb();
  const [m] = await db.select().from(schema.matches).where(eq(schema.matches.id, matchId));
  if (!m || m.status === "encerrada") return { error: "Esse jogo já foi encerrado." };

  const confirmed = new Set((await listSignups(matchId)).filter((s) => s.status === "vou").map((s) => s.playerId));
  const players = new Map((await listPlayers()).map((p) => [p.id, toDrawPlayer(p)]));
  const ids = teamIds.flat();
  if (new Set(ids).size !== ids.length || ids.some((id) => !confirmed.has(id) || !players.has(id))) {
    return { error: "A lista de confirmados mudou. Sorteie de novo." };
  }
  if (ids.length !== confirmed.size) return { error: "Alguém confirmou depois do sorteio. Sorteie de novo." };

  // Recalcula no servidor a partir dos dados atuais, sem confiar no que veio do navegador.
  const result = evaluate(teamIds.map((t) => t.map((id) => players.get(id)!)));
  await db.update(schema.draws).set({ published: false }).where(eq(schema.draws.matchId, matchId));
  await db.insert(schema.draws).values({ matchId, teamCount: teamIds.length, result, published: true });
  await db.update(schema.matches).set({ status: "sorteada" }).where(eq(schema.matches.id, matchId));
  revalidatePath("/", "layout");
  return { ok: "Times publicados." };
}
