import "server-only";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";

const KEY = "invite_code";

function newCode() {
  return randomBytes(9).toString("base64url"); // 12 caracteres, difícil de adivinhar
}

/** Devolve o código atual do convite, criando um na primeira vez. */
export async function getInviteCode(): Promise<string> {
  const db = await getDb();
  const [row] = await db.select().from(schema.settings).where(eq(schema.settings.key, KEY));
  if (row) return row.value;
  const code = newCode();
  await db.insert(schema.settings).values({ key: KEY, value: code }).onConflictDoNothing();
  const [after] = await db.select().from(schema.settings).where(eq(schema.settings.key, KEY));
  return after.value;
}

/** Troca o código: o link antigo para de funcionar na hora. */
export async function rotateInviteCode(): Promise<string> {
  const db = await getDb();
  const code = newCode();
  await db
    .insert(schema.settings)
    .values({ key: KEY, value: code })
    .onConflictDoUpdate({ target: schema.settings.key, set: { value: code, updatedAt: new Date() } });
  return code;
}

export async function isValidInvite(code: string): Promise<boolean> {
  if (!code || code.length > 64) return false;
  const db = await getDb();
  const [row] = await db.select().from(schema.settings).where(eq(schema.settings.key, KEY));
  if (!row) return false;
  const a = Buffer.from(row.value);
  const b = Buffer.from(code);
  return a.length === b.length && timingSafeEqual(a, b);
}
