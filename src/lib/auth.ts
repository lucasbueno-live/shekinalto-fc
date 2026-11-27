import "server-only";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cache } from "react";
import { getDb, schema } from "@/db";
import { readSessionPlayerId } from "./session";

export type CurrentPlayer = typeof schema.players.$inferSelect;

export const getCurrentPlayer = cache(async (): Promise<CurrentPlayer | null> => {
  const id = await readSessionPlayerId();
  if (!id) return null;
  const db = await getDb();
  const [p] = await db.select().from(schema.players).where(eq(schema.players.id, id));
  if (!p || !p.active) return null;
  return p;
});

export async function requirePlayer() {
  const p = await getCurrentPlayer();
  if (!p) redirect("/entrar");
  return p;
}

export async function requireAdmin() {
  const p = await requirePlayer();
  if (p.role !== "admin") redirect("/");
  return p;
}
