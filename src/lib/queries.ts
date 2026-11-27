import "server-only";
import { and, asc, desc, eq, ne } from "drizzle-orm";
import { getDb, schema } from "@/db";
import type { GkRole, Position, Ratings } from "./domain";
import type { DrawPlayer, DrawResult } from "./draw";
import { computeCard, type Card } from "./rating";

/** O que as telas podem ver de um jogador. Nunca inclui votos individuais. */
export type PlayerView = {
  id: string;
  name: string;
  nickname: string | null;
  photoUrl: string | null;
  primaryPosition: Position;
  secondaryPositions: Position[];
  gkRole: GkRole;
  role: "admin" | "player";
  active: boolean;
  card: Card;
};

export function displayName(p: { name: string; nickname: string | null }) {
  return p.nickname?.trim() || p.name;
}

export async function listPlayers(opts: { includeInactive?: boolean } = {}): Promise<PlayerView[]> {
  const db = await getDb();
  const rows = await db
    .select()
    .from(schema.players)
    .where(opts.includeInactive ? undefined : eq(schema.players.active, true));
  const allVotes = await db.select({ targetId: schema.votes.targetId, voterId: schema.votes.voterId, ratings: schema.votes.ratings }).from(schema.votes);
  const byTarget = new Map<string, Ratings[]>();
  for (const v of allVotes) {
    if (v.voterId === v.targetId) continue;
    const list = byTarget.get(v.targetId) ?? [];
    list.push(v.ratings);
    byTarget.set(v.targetId, list);
  }
  return rows
    .map((p) => ({
      id: p.id,
      name: p.name,
      nickname: p.nickname,
      photoUrl: p.photoUrl,
      primaryPosition: p.primaryPosition,
      secondaryPositions: p.secondaryPositions,
      gkRole: p.gkRole,
      role: p.role,
      active: p.active,
      card: computeCard({
        primaryPosition: p.primaryPosition,
        gkRole: p.gkRole,
        selfRatings: p.selfRatings,
        votes: byTarget.get(p.id) ?? [],
      }),
    }))
    .sort((a, b) => b.card.overall - a.card.overall);
}

export async function getPlayer(id: string) {
  return (await listPlayers({ includeInactive: true })).find((p) => p.id === id) ?? null;
}

/** O próprio voto pode ser visto por quem votou (para editar). Ninguém mais vê. */
export async function getMyVote(voterId: string, targetId: string): Promise<Ratings | null> {
  const db = await getDb();
  const [v] = await db
    .select({ ratings: schema.votes.ratings })
    .from(schema.votes)
    .where(and(eq(schema.votes.voterId, voterId), eq(schema.votes.targetId, targetId)));
  return v?.ratings ?? null;
}

export async function votedTargetIds(voterId: string): Promise<Set<string>> {
  const db = await getDb();
  const rows = await db.select({ t: schema.votes.targetId }).from(schema.votes).where(eq(schema.votes.voterId, voterId));
  return new Set(rows.map((r) => r.t));
}

export async function getCurrentMatch() {
  const db = await getDb();
  const [m] = await db
    .select()
    .from(schema.matches)
    .where(ne(schema.matches.status, "encerrada"))
    .orderBy(desc(schema.matches.date), desc(schema.matches.createdAt))
    .limit(1);
  return m ?? null;
}

export async function getMatch(id: string) {
  const db = await getDb();
  const [m] = await db.select().from(schema.matches).where(eq(schema.matches.id, id));
  return m ?? null;
}

export async function listSignups(matchId: string) {
  const db = await getDb();
  return db
    .select({
      playerId: schema.signups.playerId,
      status: schema.signups.status,
      createdAt: schema.signups.createdAt,
    })
    .from(schema.signups)
    .where(eq(schema.signups.matchId, matchId))
    .orderBy(asc(schema.signups.createdAt));
}

export async function getPublishedDraw(matchId: string): Promise<DrawResult | null> {
  const db = await getDb();
  const [d] = await db
    .select()
    .from(schema.draws)
    .where(and(eq(schema.draws.matchId, matchId), eq(schema.draws.published, true)))
    .orderBy(desc(schema.draws.createdAt))
    .limit(1);
  return d?.result ?? null;
}

export function toDrawPlayer(p: PlayerView): DrawPlayer {
  return {
    id: p.id,
    name: displayName(p),
    overall: p.card.overall,
    gkOverall: p.card.gkOverall,
    primaryPosition: p.primaryPosition,
    secondaryPositions: p.secondaryPositions,
    gkRole: p.gkRole,
  };
}
