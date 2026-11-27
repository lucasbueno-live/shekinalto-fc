"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { publishDraw } from "@/app/actions";
import { TeamColumn } from "@/components/TeamsView";
import { Button, FormMessage } from "@/components/ui";
import { drawTeams, evaluate, fmt1, suggestTeamCount, type DrawPlayer, type DrawResult } from "@/lib/draw";
import { CopyButton } from "../../../client-bits";
import { teamsText } from "@/lib/whatsapp";

type Props = { matchId: string; players: DrawPlayer[]; dateLabel: string; positions: Record<string, string> };

export function SorteioBoard({ matchId, players, dateLabel, positions }: Props) {
  const router = useRouter();
  const maxTeams = Math.min(4, Math.floor(players.length / 2));
  const [teamCount, setTeamCount] = useState(() => Math.min(maxTeams, suggestTeamCount(players.length)));
  const [result, setResult] = useState<DrawResult | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [publishing, startPublish] = useTransition();
  const [message, setMessage] = useState<{ error?: string; ok?: string }>();

  function run(n = teamCount) {
    setDrawing(true);
    setSelected(null);
    setMessage(undefined);
    // deixa o botão mostrar "Sorteando…" antes do cálculo ocupar a tela
    setTimeout(() => {
      setResult(drawTeams(players, n, { runs: 120 }));
      setDrawing(false);
    }, 20);
  }

  // Primeiro sorteio só no navegador (cada sorteio usa uma semente diferente).
  useEffect(() => {
    const t = setTimeout(() => setResult(drawTeams(players, teamCount, { runs: 120 })), 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fixedGks = useMemo(() => players.filter((p) => p.gkRole === "fixo").length, [players]);

  function pick(id: string) {
    if (!result) return;
    if (!selected) return setSelected(id);
    if (selected === id) return setSelected(null);
    const teams = result.teams.map((t) => t.players);
    const ta = teams.findIndex((t) => t.some((p) => p.id === selected));
    const tb = teams.findIndex((t) => t.some((p) => p.id === id));
    if (ta === tb) return setSelected(id);
    const pa = teams[ta].find((p) => p.id === selected)!;
    const pb = teams[tb].find((p) => p.id === id)!;
    const next = teams.map((t, i) => (i === ta ? t.map((p) => (p.id === pa.id ? pb : p)) : i === tb ? t.map((p) => (p.id === pb.id ? pa : p)) : t));
    setResult(evaluate(next));
    setSelected(null);
  }

  function publish() {
    if (!result) return;
    startPublish(async () => {
      const res = await publishDraw(
        matchId,
        result.teams.map((t) => t.players.map((p) => p.id)),
      );
      setMessage(res);
      if (res?.ok) router.push("/");
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <fieldset>
        <legend className="mb-2 font-semibold">Quantos times?</legend>
        <div className="grid grid-cols-3 gap-2">
          {[2, 3, 4].map((n) => (
            <button
              key={n}
              type="button"
              disabled={n > maxTeams}
              aria-pressed={teamCount === n}
              onClick={() => {
                setTeamCount(n);
                run(n);
              }}
              className={`min-h-12 rounded-md font-display text-xl font-extrabold ring-1 disabled:opacity-30 ${
                teamCount === n ? "bg-chalk text-turf-950 ring-chalk" : "ring-chalk/25"
              }`}
            >
              {n} times
            </button>
          ))}
        </div>
        <p className="mt-2 text-sm text-chalk-dim">
          {players.length} confirmados, {fixedGks} {fixedGks === 1 ? "goleiro fixo" : "goleiros fixos"}. Sugestão: {suggestTeamCount(players.length)} times.
        </p>
      </fieldset>

      <div className="grid grid-cols-2 gap-3">
        <Button type="button" variant="ghost" onClick={() => run()} disabled={drawing}>
          {drawing ? "Sorteando…" : "Sortear de novo"}
        </Button>
        <Button type="button" onClick={publish} disabled={!result || drawing || publishing}>
          {publishing ? "Publicando…" : "Publicar times"}
        </Button>
      </div>
      <FormMessage state={message} />

      {result && (
        <>
          <div className="flex items-baseline justify-between rounded-lg bg-turf-950/60 px-4 py-3 ring-1 ring-chalk/10">
            <span>Diferença de força</span>
            <strong className={`font-display text-3xl font-black tabular-nums ${result.spread > 2 ? "text-danger" : "text-chalk"}`}>
              {fmt1(result.spread)}
            </strong>
          </div>

          <p className="text-sm text-chalk-dim" aria-live="polite">
            {selected ? "Agora toque em alguém do outro time para trocar." : "Para trocar dois jogadores, toque em um e depois no outro."}
          </p>

          <div className="flex flex-col gap-3">
            {result.teams.map((t, i) => (
              <TeamColumn key={t.name} team={t} index={i} selected={selected} onPick={pick} />
            ))}
          </div>
        </>
      )}

      {result && <CopyButton text={teamsText(result, dateLabel, positions)} label="Copiar times" />}
    </div>
  );
}
