import Link from "next/link";
import { Icon } from "@/components/Icon";
import { InstallHint } from "@/components/InstallGuide";
import { PlayerCard } from "@/components/PlayerCard";
import { PushToggle } from "@/components/PushToggle";
import { getVapidKeys } from "@/lib/push";
import { TeamsView } from "@/components/TeamsView";
import { capitalize, PageTitle, Panel, Section } from "@/components/ui";
import { countdownLabel, formatMatchWhen, formatTime, shortWhen } from "@/lib/schedule";
import { requirePlayer } from "@/lib/auth";
import { POSITION_LABEL } from "@/lib/domain";
import { displayName, getCurrentMatch, getPublishedDraw, listPlayers, listSignups } from "@/lib/queries";
import { CopyButton, SignupButtons } from "./client-bits";
import { teamsText } from "@/lib/whatsapp";

export default async function JogoPage() {
  const me = await requirePlayer();
  const [match, vapid] = await Promise.all([getCurrentMatch(), getVapidKeys()]);
  const isAdmin = me.role === "admin";

  if (!match) {
    return (
      <>
        <InstallHint />
        <PushToggle publicKey={vapid.publicKey} compact />
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
  const dateLabel = formatMatchWhen(match.date, match.time);
  const positions = Object.fromEntries(players.map((p) => [p.id, p.primaryPosition]));
  const meView = byId.get(me.id);
  const myPlace = going.findIndex((s) => s.playerId === me.id);

  // Em qual time eu caí, se o sorteio já saiu
  let myTeam: { name: string; role: string } | null = null;
  for (const t of draw?.teams ?? []) {
    if (!t.players.some((p) => p.id === me.id)) continue;
    myTeam = {
      name: t.name,
      role: t.goalkeeperId === me.id ? "no gol" : t.reserves.includes(me.id) ? "começando na reserva" : "em campo",
    };
  }
  const status =
    myTeam && mine === "vou"
      ? { title: `Você está no ${myTeam.name}`, sub: `Começa ${myTeam.role}.` }
      : mine === "vou"
        ? { title: "Você está na lista", sub: `Você foi o ${myPlace + 1}º a confirmar.` }
        : mine === "nao_vou"
          ? { title: "Você avisou que não vai", sub: "Mudou de ideia? Ainda dá tempo." }
          : { title: "Você vai jogar?", sub: "Confirme para entrar na lista." };
  const [weekday, dayMonth] = shortWhen(match.date).split(", ");

  return (
    <>
      <InstallHint />
      <PushToggle publicKey={vapid.publicKey} compact />

      <header className="mb-5">
        <h1 className="font-display text-5xl font-black leading-none">
          {capitalize(weekday)}, {dayMonth}
        </h1>
        <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-chalk-dim">
          {match.time && (
            <span className="flex items-center gap-1.5">
              <Icon name="clock" className="size-4" />
              {formatTime(match.time)}
            </span>
          )}
          {match.place && (
            <span className="flex items-center gap-1.5">
              <Icon name="pin" className="size-4" />
              {match.place}
            </span>
          )}
          <span className="font-semibold text-chalk">{countdownLabel(match.date)}</span>
        </p>
      </header>

      <Panel className="mb-7">
        <div className="mb-4 flex items-center gap-4">
          {meView && (
            <div className="w-24 shrink-0">
              <PlayerCard
                id={meView.id}
                name={displayName(meView)}
                photoUrl={meView.photoUrl}
                primaryPosition={meView.primaryPosition}
                gkRole={meView.gkRole}
                card={meView.card}
                size="xs"
                href="/perfil"
              />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-display text-3xl font-black leading-none">{status.title}</p>
            <p className="mt-1.5 text-chalk-dim">{status.sub}</p>
          </div>
        </div>
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

      {isAdmin &&
        (going.length >= 4 ? (
          <Link
            href={`/jogo/${match.id}/sorteio`}
            className="mb-7 flex min-h-12 items-center justify-center rounded-md border border-chalk/25 font-display text-xl font-extrabold active:bg-chalk/10"
          >
            {draw ? "Refazer sorteio" : `Sortear times com ${going.length} confirmados`}
          </Link>
        ) : (
          <div className="mb-7">
            <span
              aria-disabled="true"
              className="flex min-h-12 cursor-not-allowed items-center justify-center rounded-md border border-chalk/15 font-display text-xl font-extrabold text-chalk-dim"
            >
              Sortear times
            </span>
            <p className="mt-1.5 text-sm text-chalk-dim">O sorteio libera com 4 confirmados. Agora {going.length === 1 ? "tem 1" : `são ${going.length}`}.</p>
          </div>
        ))}

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
