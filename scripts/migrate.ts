// Roda as migrations no Postgres de produção (Neon). Chamado pelo `npm run build` na Vercel.
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";

const url = process.env.DATABASE_URL ?? process.env.POSTGRES_URL;

async function main() {
  if (!url) {
    if (process.env.VERCEL) {
      console.error("\n✖ Falta o banco: na Vercel, abra o projeto → Storage → conecte um banco Neon e faça o deploy de novo.\n");
      process.exit(1);
    }
    console.log("Sem DATABASE_URL: pulando migrations (no computador o app usa o banco local .pglite).");
    return;
  }
  await migrate(drizzle(neon(url)), { migrationsFolder: "drizzle" });
  console.log("✓ Migrations aplicadas.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
