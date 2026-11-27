import { headers } from "next/headers";
import { PageTitle, Panel, Section } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { POSITION_LABEL } from "@/lib/domain";
import { displayName, getCurrentMatch, listPlayers, listSignups } from "@/lib/queries";
import { formatMatchWhen, nextWeekdayISO } from "@/lib/schedule";
import { inviteJoinText, inviteText } from "@/lib/whatsapp";
import { CopyButton } from "../client-bits";
import { CloseMatchButton, EditMatchForm, MatchForm, NewInviteButton, NewPlayerForm, PlayerAdminRow } from "./forms";
import { getInviteCode } from "@/lib/invite";

export default async function AdminPage() {
  const me = await requireAdmin();
  const [match, players, inviteCode] = await Promise.all([getCurrentMatch(), listPlayers({ includeInactive: true }), getInviteCode()]);
  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const byId = new Map(players.map((p) => [p.id, p]));
  const confirmed = match
    ? (await listSignups(match.id)).filter((s) => s.status === "vou" && byId.get(s.playerId)?.active).map((s) => displayName(byId.get(s.playerId)!))
    : [];
  const sorted = [...players].sort((a, b) => Number(b.active) - Number(a.active) || displayName(a).localeCompare(displayName(b), "pt-BR"));

  return (
    <>
      <PageTitle sub="Só os organizadores veem esta tela.">Organizar</PageTitle>

      <Section title="Jogo da semana">
        <Panel className="flex flex-col gap-4">
          {match ? (
            <div className="flex flex-col gap-2">
              <p>
                Lista aberta para <strong>{formatMatchWhen(match.date, match.time)}</strong>
                {match.place ? `, ${match.place}` : ""}. {confirmed.length} {confirmed.length === 1 ? "confirmado" : "confirmados"}.
              </p>
              {!match.time && (
                <p className="text-sm text-danger">Este jogo está sem horário, então o lembrete de 1 hora antes não sai. Coloque o horário abaixo.</p>
              )}
              <CopyButton text={inviteText(formatMatchWhen(match.date, match.time), match.place, origin, confirmed)} label="Copiar lista do jogo" />
              <details open={!match.time}>
                <summary className="cursor-pointer text-sm font-semibold text-chalk-dim">Mudar horário ou local</summary>
                <div className="mt-3">
                  <EditMatchForm matchId={match.id} time={match.time ?? "20:00"} place={match.place ?? ""} />
                </div>
              </details>
              <CloseMatchButton matchId={match.id} />
            </div>
          ) : (
            <p className="text-chalk-dim">Nenhum jogo aberto.</p>
          )}
          <details open={!match} className="group">
            <summary className="cursor-pointer font-semibold text-bib">{match ? "Marcar outro jogo (fecha o atual)" : "Marcar jogo"}</summary>
            <div className="mt-3">
              <MatchForm defaultDate={nextWeekdayISO(3)} defaultTime={match?.time ?? "20:00"} defaultPlace={match?.place ?? ""} />
            </div>
          </details>
        </Panel>
      </Section>

      <Section title="Convite para o elenco">
        <Panel className="flex flex-col gap-3">
          <p className="text-chalk-dim">Mande este link no grupo. Quem abrir cria o próprio jogador, com nome, posição e PIN.</p>
          <p className="break-all rounded-md bg-turf-950/70 px-3 py-2 text-sm">{`${origin}/convite/${inviteCode}`}</p>
          <CopyButton text={inviteJoinText(`${origin}/convite/${inviteCode}`)} label="Copiar convite" />
          <NewInviteButton />
        </Panel>
      </Section>

      <Section title="Cadastrar jogador na mão">
        <Panel>
          <NewPlayerForm />
        </Panel>
      </Section>

      <Section title="Elenco" aside={<span className="text-chalk-dim">{players.filter((p) => p.active).length} ativos</span>}>
        <ul className="flex flex-col divide-y divide-chalk/10 overflow-hidden rounded-lg bg-turf-950/55 ring-1 ring-chalk/10">
          {sorted.map((p) => (
            <PlayerAdminRow
              key={p.id}
              id={p.id}
              name={displayName(p)}
              photoUrl={p.photoUrl}
              detail={`${p.gkRole === "fixo" ? "Goleiro" : POSITION_LABEL[p.primaryPosition]}, nota ${p.card.overall}${p.card.provisional ? " (provisória)" : ""}`}
              active={p.active}
              isAdmin={p.role === "admin"}
              isMe={p.id === me.id}
            />
          ))}
        </ul>
      </Section>
    </>
  );
}
