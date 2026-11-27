import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { generateVAPIDKeys, sendNotification } from "web-push";
import { getDb, schema } from "@/db";

/**
 * Chaves VAPID geradas na primeira vez e guardadas na tabela settings,
 * para o deploy não precisar de variável de ambiente.
 */
export async function getVapidKeys(): Promise<{ publicKey: string; privateKey: string }> {
  const db = await getDb();
  const read = async () => {
    const rows = await db
      .select()
      .from(schema.settings)
      .where(inArray(schema.settings.key, ["vapid_public", "vapid_private"]));
    const pub = rows.find((r) => r.key === "vapid_public")?.value;
    const priv = rows.find((r) => r.key === "vapid_private")?.value;
    return pub && priv ? { publicKey: pub, privateKey: priv } : null;
  };
  const existing = await read();
  if (existing) return existing;
  const keys = generateVAPIDKeys();
  await db
    .insert(schema.settings)
    .values([
      { key: "vapid_public", value: keys.publicKey },
      { key: "vapid_private", value: keys.privateKey },
    ])
    .onConflictDoNothing();
  return (await read())!;
}

export type PushPayload = { title: string; body: string; url: string; tag?: string };

/** Manda um aviso para todos os jogadores ativos que ativaram. */
export function notifyAll(payload: PushPayload) {
  return notify(() => payload);
}

/**
 * Manda um aviso por jogador: `payloadFor` devolve o texto de cada um, ou null para não avisar.
 * Apaga as inscrições que o serviço de push diz que não valem mais (404/410).
 */
export async function notify(payloadFor: (playerId: string) => PushPayload | null): Promise<{ sent: number; removed: number }> {
  const db = await getDb();
  const subs = await db
    .select({
      playerId: schema.pushSubscriptions.playerId,
      endpoint: schema.pushSubscriptions.endpoint,
      p256dh: schema.pushSubscriptions.p256dh,
      auth: schema.pushSubscriptions.auth,
    })
    .from(schema.pushSubscriptions)
    .innerJoin(schema.players, and(eq(schema.players.id, schema.pushSubscriptions.playerId), eq(schema.players.active, true)));
  const targets = subs.map((s) => ({ ...s, payload: payloadFor(s.playerId) })).filter((s) => s.payload);
  if (targets.length === 0) return { sent: 0, removed: 0 };

  const { publicKey, privateKey } = await getVapidKeys();
  const subject = process.env.VAPID_SUBJECT ?? "https://shekinalto-fc.vercel.app";
  const gone: string[] = [];
  let sent = 0;

  await Promise.allSettled(
    targets.map(async (s) => {
      try {
        await sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(s.payload), {
          vapidDetails: { subject, publicKey, privateKey },
          TTL: 60 * 60 * 24 * 3, // se o celular estiver desligado, entrega em até 3 dias
          urgency: "high",
        });
        sent++;
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) gone.push(s.endpoint);
        else console.error("Falha ao enviar aviso", status, (err as Error).message);
      }
    }),
  );
  if (gone.length) await db.delete(schema.pushSubscriptions).where(inArray(schema.pushSubscriptions.endpoint, gone));
  return { sent, removed: gone.length };
}
