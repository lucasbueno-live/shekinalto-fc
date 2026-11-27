import Link from "next/link";
import { TeamsView } from "@/components/TeamsView";
import { capitalize, formatMatchDate, PageTitle, Panel, Section } from "@/components/ui";
import { requirePlayer } from "@/lib/auth";
import { POSITION_LABEL } from "@/lib/domain";
import { displayName, getCurrentMatch, getPublishedDraw, listPlayers, listSignups } from "@/lib/queries";
import { CopyButton, SignupButtons } from "./client-bits";
import { teamsText } from "@/lib/whatsapp";

export default async function JogoPage() {
  const me = await requirePlayer();
  const match = await getCurrentMatch();
  const isAdmin = me.role === "admin";

  if (!match) {
    return (
      <>
        <PageTitle>Jogo da semana</PageTitle>
        <Panel>
          <p>Ainda não tem jogo marcado.</p>
          {isAdmin ? (
            <Link href="/admin" className="mt-3 inline-block font-display text-xl font-extrabold text-bib underline underline-offset-4">
              Marcar o jogo da semana
            </Link>
          ) : (
            <p className="mt-1 text-sm text-chalk-dim">Quando o organizador abrir a lista, ela aparece aqui.</p>
          )}
        </Panel>
      </>
    );
  }

  const [signups, players, draw] = await Promise.all([listSignups(match.id), listPlayers(), getPublishedDraw(match.id)]);
  const byId = new Map(players.map((p) => [p.id, p]));
  const going = signups.filter((s) => s.status === "vou" && byId.has(s.playerId));
  const notGoing = signups.filter((s) => s.status === "nao_vou" && byId.has(s.playerId));
  const mine = signups.find((s) => s.playerId === me.id)?.status ?? null;
  const dateLabel = formatMatchDate(match.date);
  const positions = Object.fromEntries(players.map((p) => [p.id, p.primaryPosition]));

  return (
    <>
      <PageTitle sub={match.place ?? undefined}>
        {capitalize(dateLabel)}
      </PageTitle>

      <Panel className="mb-7">
        <p className="mb-3 font-semibold">{mine === "vou" ? "Você está na lista." : mine === "nao_vou" ? "Você avisou que não vai." : "Você vai jogar?"}</p>
        <SignupButtons matchId={match.id} current={mine} />
      </Panel>

      {draw && (
        <Section title="Times">
          <TeamsView result={draw} />
          <div className="mt-3">
            <CopyButton text={teamsText(draw, dateLabel, positions)} label="Copiar para o WhatsApp" />
          </div>
          {going.length !== draw.teams.reduce((s, t) => s + t.players.length, 0) && (
            <p className="mt-2 text-sm text-chalk-dim">A lista mudou depois do sorteio. O organizador pode sortear de novo.</p>
          )}
        </Section>
      )}

      {isAdmin && (
        <Link
          href={`/jogo/${match.id}/sorteio`}
          className="mb-7 flex min-h-14 items-center justify-center rounded-md bg-bib font-display text-2xl font-black text-turf-950 active:bg-bib-deep"
        >
          {draw ? "Refazer sorteio" : `Sortear times (${going.length} confirmados)`}
        </Link>
      )}

      <Section title="Confirmados" aside={<span className="text-chalk-dim">{going.length}</span>}>
        {going.length === 0 ? (
          <p className="text-chalk-dim">Ninguém confirmou ainda. Seja o primeiro.</p>
        ) : (
          <ol className="flex flex-col divide-y divide-chalk/10 overflow-hidden rounded-lg bg-turf-950/55 ring-1 ring-chalk/10">
            {going.map((s, i) => {
              const p = byId.get(s.playerId)!;
              return (
                <li key={s.playerId} className={`flex min-h-12 items-center gap-3 px-4 ${i === 14 ? "border-t-2 border-t-bib/70" : ""}`}>
                  <span className="w-6 text-right font-display text-lg font-extrabold text-chalk-dim tabular-nums">{i + 1}</span>
                  <span className="flex-1 truncate font-semibold">
                    {displayName(p)}
                    {p.id === me.id && <span className="ml-2 text-sm font-normal text-chalk-dim">você</span>}
                  </span>
                  <span className="text-sm text-chalk-dim">{p.gkRole === "fixo" ? "Goleiro" : POSITION_LABEL[p.primaryPosition]}</span>
                </li>
              );
            })}
          </ol>
        )}
        {going.length > 14 && <p className="mt-2 text-sm text-chalk-dim">A linha laranja marca as 14 vagas de 7x7. Quem vem depois entra como reserva ou num 3º time.</p>}
      </Section>

      {notGoing.length > 0 && (
        <Section title="Não vão">
          <p className="text-chalk-dim">{notGoing.map((s) => displayName(byId.get(s.playerId)!)).join(", ")}</p>
        </Section>
      )}
    </>
  );
}
