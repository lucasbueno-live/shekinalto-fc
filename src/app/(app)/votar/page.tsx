import Link from "next/link";
import { PageTitle, Panel } from "@/components/ui";
import { requirePlayer } from "@/lib/auth";
import { POSITION_LABEL } from "@/lib/domain";
import { displayName, listPlayers, votedTargetIds } from "@/lib/queries";

export default async function VotarPage() {
  const me = await requirePlayer();
  const [players, voted] = await Promise.all([listPlayers(), votedTargetIds(me.id)]);
  const others = players.filter((p) => p.id !== me.id);
  const pending = others.filter((p) => !voted.has(p.id)).sort((a, b) => a.card.voteCount - b.card.voteCount);
  const done = others.filter((p) => voted.has(p.id));
  const pct = others.length ? Math.round((done.length / others.length) * 100) : 100;

  return (
    <>
      <PageTitle sub="Quanto mais gente vota, mais justo fica o sorteio.">Votar</PageTitle>

      <div className="mb-6">
        <div className="mb-1.5 flex justify-between text-sm">
          <span>
            Você avaliou <strong>{done.length}</strong> de {others.length}
          </span>
          <span className="text-chalk-dim">{pct}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-turf-950/70" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-bib" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {pending.length === 0 ? (
        <Panel>
          <p>Você já avaliou todo mundo. Dá para mudar um voto quando quiser, é só abrir a carta no elenco.</p>
        </Panel>
      ) : (
        <>
          <h2 className="mb-2 font-display text-2xl font-extrabold">Falta avaliar</h2>
          <p className="mb-3 text-sm text-chalk-dim">Quem tem menos votos aparece primeiro.</p>
          <ul className="flex flex-col divide-y divide-chalk/10 overflow-hidden rounded-lg bg-turf-950/55 ring-1 ring-chalk/10">
            {pending.map((p) => (
              <li key={p.id}>
                <Link href={`/jogador/${p.id}`} className="flex min-h-14 items-center justify-between gap-3 px-4 active:bg-chalk/10">
                  <span>
                    <span className="block text-lg font-semibold">{displayName(p)}</span>
                    <span className="text-sm text-chalk-dim">
                      {POSITION_LABEL[p.primaryPosition]}
                      {p.card.provisional ? ", carta provisória" : ""}
                    </span>
                  </span>
                  <span className="font-display text-lg font-extrabold text-bib">Avaliar</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}
