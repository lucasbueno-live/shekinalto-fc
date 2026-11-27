import { count } from "drizzle-orm";
import { redirect } from "next/navigation";
import { getDb, schema } from "@/db";
import { getCurrentPlayer } from "@/lib/auth";
import { displayName, listPlayers } from "@/lib/queries";
import { LoginForm, SetupForm } from "./forms";

export default async function EntrarPage() {
  if (await getCurrentPlayer()) redirect("/");
  const db = await getDb();
  const [{ n }] = await db.select({ n: count() }).from(schema.players);
  const players = n > 0 ? await listPlayers() : [];

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-10 pt-[max(2.5rem,env(safe-area-inset-top))]">
      <div className="mb-8">
        <p className="font-display text-xl font-extrabold text-bib">Shekinalto FC</p>
        <h1 className="mt-1 font-display text-5xl font-black leading-[0.95]">
          {n === 0 ? "Vamos montar o elenco" : "Quem é você na pelada?"}
        </h1>
      </div>
      {n === 0 ? (
        <SetupForm />
      ) : (
        <LoginForm
          players={players
            .map((p) => ({ id: p.id, label: displayName(p), sub: p.nickname ? p.name : null }))
            .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"))}
        />
      )}
    </main>
  );
}
