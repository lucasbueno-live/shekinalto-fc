import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle as drizzleNeon } from "drizzle-orm/neon-http";
import * as schema from "./schema";

/**
 * Em produção (Vercel), usa o Postgres da Neon pela variável DATABASE_URL.
 * No computador, sem DATABASE_URL, usa um Postgres embutido (PGlite) na pasta .pglite,
 * para dar para rodar o app sem criar conta em nada.
 */
export type DB = ReturnType<typeof drizzleNeon<typeof schema>>;

export function databaseUrl() {
  return process.env.DATABASE_URL ?? process.env.POSTGRES_URL ?? null;
}

const g = globalThis as unknown as { __sfcDb?: Promise<DB> };

async function create(): Promise<DB> {
  const url = databaseUrl();
  if (url) return drizzleNeon(neon(url), { schema, casing: "snake_case" });

  if (process.env.NODE_ENV === "production" && process.env.VERCEL) {
    throw new Error("Banco não configurado: conecte um banco Neon ao projeto na aba Storage da Vercel.");
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");
  const { migrate } = await import("drizzle-orm/pglite/migrator");
  const client = new PGlite(process.env.PGLITE_DIR ?? ".pglite");
  const db = drizzle(client, { schema, casing: "snake_case" });
  await migrate(db, { migrationsFolder: "drizzle" });
  return db as unknown as DB;
}

export function getDb(): Promise<DB> {
  g.__sfcDb ??= create();
  return g.__sfcDb;
}

export { schema };
