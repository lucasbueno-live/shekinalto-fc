import { fmt1, type DrawResult, type TeamEval } from "@/lib/draw";
import { Icon } from "./Icon";

export const TEAM_COLORS = ["var(--color-team-a)", "var(--color-team-b)", "var(--color-team-c)", "var(--color-team-d)"];
const GK_LABEL = { fixo: "Goleiro", improvisado: "Goleiro improvisado", rodizio: "Sem goleiro fixo: rodízio no gol" } as const;
const LINE_NAME = { DEF: "defensor", MEI: "meio-campista", ATA: "atacante" } as const;

/** Lista de um time. `onPick`/`selected` só são usados na tela de sorteio (troca manual). */
export function TeamColumn({
  team,
  index,
  selected,
  onPick,
}: {
  team: TeamEval;
  index: number;
  selected?: string | null;
  onPick?: (playerId: string) => void;
}) {
  const byId = new Map(team.players.map((p) => [p.id, p]));
  const field = team.starters.filter((id) => id !== team.goalkeeperId);
  const missing = (Object.keys(team.lineDeficits) as (keyof typeof LINE_NAME)[]).map((l) => LINE_NAME[l]);
  const row = (id: string, muted = false) => {
    const p = byId.get(id)!;
    const isSel = selected === id;
    const content = (
      <>
        <span className={`truncate ${muted ? "text-chalk-dim" : ""}`}>{p.name}</span>
        <span className="shrink-0 font-display font-extrabold tabular-nums">
          <span className="mr-1.5 text-xs font-semibold text-chalk-dim">{id === team.goalkeeperId ? "GOL" : p.primaryPosition}</span>
          {id === team.goalkeeperId ? (p.gkOverall ?? p.overall) : p.overall}
        </span>
      </>
    );
    return (
      <li key={id}>
        {onPick ? (
          <button
            type="button"
            onClick={() => onPick(id)}
            aria-pressed={isSel}
            className={`flex min-h-11 w-full items-center justify-between gap-2 rounded px-2 text-left ${isSel ? "bg-bib text-turf-950" : "active:bg-chalk/10"}`}
          >
            {content}
          </button>
        ) : (
          <div className="flex min-h-9 items-center justify-between gap-2 px-2">{content}</div>
        )}
      </li>
    );
  };

  return (
    <section className="rounded-lg bg-turf-950/60 p-3 ring-1 ring-chalk/10" aria-label={team.name}>
      <header className="mb-2 flex items-center justify-between gap-2 px-2">
        <h3 className="flex items-center gap-2 font-display text-2xl font-black">
          <span aria-hidden className="size-4 rounded-sm ring-1 ring-chalk/40" style={{ background: TEAM_COLORS[index % TEAM_COLORS.length] }} />
          {team.name}
        </h3>
        <span className="text-sm text-chalk-dim">
          força <strong className="font-display text-xl font-black text-chalk tabular-nums">{fmt1(team.strength)}</strong>
        </span>
      </header>
      {missing.length > 0 && (
        <p className="mb-1 flex items-center gap-1.5 px-2 text-sm text-chalk-dim">
          <Icon name="alert" className="size-4 text-bib" />
          Falta {missing.join(", ")} de origem
        </p>
      )}
      <p className={`px-2 text-xs font-semibold ${team.gkStatus === "fixo" ? "text-chalk-dim" : "text-bib"}`}>{GK_LABEL[team.gkStatus]}</p>
      {team.goalkeeperId && <ul>{row(team.goalkeeperId)}</ul>}
      <p className="mt-2 px-2 text-xs font-semibold text-chalk-dim">Em campo</p>
      <ul>
        {field.map((id) => row(id))}
      </ul>
      {team.reserves.length > 0 && (
        <>
          <p className="mt-2 px-2 text-xs font-semibold text-chalk-dim">Reservas</p>
          <ul>
            {team.reserves.map((id) => row(id, true))}
          </ul>
        </>
      )}
    </section>
  );
}

export function TeamsView({ result }: { result: DrawResult }) {
  return (
    <div className="flex flex-col gap-3">
      {result.teams.map((t, i) => (
        <TeamColumn key={t.name} team={t} index={i} />
      ))}
    </div>
  );
}
