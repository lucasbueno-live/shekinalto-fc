// Popula o banco LOCAL (.pglite) com dados de teste. Não roda em produção.
// Rode com o servidor de dev parado: `npm run seed`.
//
// Acesso de teste (só no banco local):
//   Organizador (teste) → PIN 1234
//   qualquer jogador fictício → PIN 0000
import { PGlite } from "@electric-sql/pglite";
import bcrypt from "bcryptjs";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { rmSync } from "node:fs";
import type { Attr, GkRole, Position, Ratings } from "../src/lib/domain";
import { attrsFor } from "../src/lib/domain";
import { mulberry32 } from "../src/lib/draw";
import * as schema from "../src/db/schema";

if (process.env.DATABASE_URL) {
  console.error("DATABASE_URL está definida: o seed só roda no banco local.");
  process.exit(1);
}

const dir = process.env.PGLITE_DIR ?? ".pglite";
rmSync(dir, { recursive: true, force: true });

const roster: [string, Position, Position[], GkRole][] = [
  ["Organizador (teste)", "MEI", ["VOL"], "nao"],
  ["Paredão", "GOL", [], "fixo"],
  ["Mãozinha", "GOL", [], "fixo"],
  ["Tiago", "ZAG", ["VOL"], "nao"],
  ["Pedro", "ZAG", [], "quebra_galho"],
  ["João Vitor", "LAT", ["MEI"], "nao"],
  ["André", "LAT", ["ZAG"], "nao"],
  ["Felipe", "VOL", ["ZAG"], "nao"],
  ["Mateus", "VOL", ["MEI"], "nao"],
  ["Bartô", "MEI", ["ATA"], "nao"],
  ["Simão", "MEI", ["VOL"], "quebra_galho"],
  ["Tomé", "MEI", ["ATA"], "nao"],
  ["Judas Tadeu", "ATA", ["MEI"], "nao"],
  ["Tiaguinho", "ATA", [], "nao"],
  ["Marcos", "ATA", ["MEI"], "nao"],
  ["Lucas Lima", "LAT", ["VOL"], "nao"],
  ["Paulinho", "ZAG", ["LAT"], "nao"],
  ["Barnabé", "VOL", [], "nao"],
  ["Estêvão", "MEI", ["LAT"], "nao"],
  ["Timóteo", "ATA", ["LAT"], "nao"],
  ["Silas", "ZAG", ["VOL"], "nao"],
];

function nextSaturday() {
  const d = new Date();
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
  return d.toISOString().slice(0, 10);
}

async function main() {
  const client = new PGlite(dir);
  const db = drizzle(client, { schema, casing: "snake_case" });
  await migrate(db, { migrationsFolder: "drizzle" });

  const rnd = mulberry32(2026);
  const adminPin = await bcrypt.hash("1234", 10);
  const playerPin = await bcrypt.hash("0000", 10);

  // "Nível real" de cada um, para os votos fictícios ficarem coerentes.
  const truth = new Map<string, Ratings>();
  const inserted = [];
  for (const [i, [name, primary, secondary, gkRole]] of roster.entries()) {
    const level = 2.5 + rnd() * 6;
    const real: Ratings = {};
    for (const a of attrsFor(gkRole)) real[a] = Math.min(10, Math.max(1, level + (rnd() * 3 - 1.5)));
    const self: Ratings = {};
    for (const a of attrsFor(gkRole)) self[a] = Math.min(10, Math.round(real[a]! + 1));
    const [row] = await db
      .insert(schema.players)
      .values({
        name,
        primaryPosition: primary,
        secondaryPositions: secondary,
        gkRole,
        selfRatings: self,
        pinHash: i === 0 ? adminPin : playerPin,
        role: i === 0 ? "admin" : "player",
      })
      .returning();
    truth.set(row.id, real);
    inserted.push(row);
  }

  // Cada jogador recebe de 3 a 8 votos (os dois últimos ficam com carta provisória).
  for (const [idx, target] of inserted.entries()) {
    const voters = inserted.filter((p) => p.id !== target.id).sort(() => rnd() - 0.5);
    const count = idx >= inserted.length - 2 ? 1 : 3 + Math.floor(rnd() * 6);
    for (const voter of voters.slice(0, count)) {
      const ratings: Ratings = {};
      for (const [a, v] of Object.entries(truth.get(target.id)!) as [Attr, number][]) {
        ratings[a] = Math.min(10, Math.max(1, Math.round(v + (rnd() * 2 - 1))));
      }
      await db.insert(schema.votes).values({ voterId: voter.id, targetId: target.id, ratings });
    }
  }

  const [match] = await db.insert(schema.matches).values({ date: nextSaturday(), place: "Quadra da paróquia" }).returning();
  for (const [i, p] of inserted.entries()) {
    if (i === 0) continue; // o organizador confirma pelo app, para testar
    await db.insert(schema.signups).values({
      matchId: match.id,
      playerId: p.id,
      status: i % 9 === 0 ? "nao_vou" : "vou",
      createdAt: new Date(Date.now() - (roster.length - i) * 60_000),
    });
  }

  await client.close();
  console.log(`✓ Banco local criado com ${inserted.length} jogadores e o jogo de ${match.date}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
