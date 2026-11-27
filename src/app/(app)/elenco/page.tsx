import Link from "next/link";
import { PlayerCard } from "@/components/PlayerCard";
import { PageTitle } from "@/components/ui";
import { LINE_OF, type Line } from "@/lib/domain";
import { displayName, listPlayers } from "@/lib/queries";

const FILTERS: { key: Line | "todos"; label: string }[] = [
  { key: "todos", label: "Todos" },
  { key: "GOL", label: "Goleiros" },
  { key: "DEF", label: "Defesa" },
  { key: "MEI", label: "Meio" },
  { key: "ATA", label: "Ataque" },
];

export default async function ElencoPage({ searchParams }: { searchParams: Promise<{ linha?: string }> }) {
  const { linha } = await searchParams;
  const filter = FILTERS.find((f) => f.key === linha)?.key ?? "todos";
  const players = await listPlayers();
  const shown = players.filter((p) => {
    if (filter === "todos") return true;
    if (filter === "GOL") return p.gkRole !== "nao";
    return LINE_OF[p.primaryPosition] === filter || p.secondaryPositions.some((s) => LINE_OF[s] === filter);
  });

  return (
    <>
      <PageTitle sub={`${players.length} jogadores, do maior para o menor`}>Elenco</PageTitle>
      <nav aria-label="Filtrar por setor" className="-mx-4 mb-5 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "todos" ? "/elenco" : `/elenco?linha=${f.key}`}
            aria-current={filter === f.key ? "page" : undefined}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold ring-1 ${
              filter === f.key ? "bg-chalk text-turf-950 ring-chalk" : "text-chalk ring-chalk/25"
            }`}
          >
            {f.label}
          </Link>
        ))}
      </nav>
      {shown.length === 0 ? (
        <p className="text-chalk-dim">Ninguém nesse setor ainda.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-x-3 gap-y-4 min-[480px]:grid-cols-3">
          {shown.map((p) => (
            <li key={p.id}>
              <PlayerCard
                id={p.id}
                name={displayName(p)}
                photoUrl={p.photoUrl}
                primaryPosition={p.primaryPosition}
                gkRole={p.gkRole}
                card={p.card}
                href={`/jogador/${p.id}`}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
