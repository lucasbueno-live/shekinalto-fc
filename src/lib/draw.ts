import { LINE_OF, type GkRole, type Position } from "./domain";

/** Jogador como o sorteio enxerga: só o que importa para equilibrar. */
export type DrawPlayer = {
  id: string;
  name: string;
  /** Nota geral da carta (para goleiro fixo, é a nota de goleiro). */
  overall: number;
  /** Nota de goleiro (fixos e quebra-galhos); null para quem não vai no gol. */
  gkOverall: number | null;
  primaryPosition: Position;
  secondaryPositions: Position[];
  gkRole: GkRole;
};

export type GkStatus = "fixo" | "improvisado" | "rodizio";
type FieldLine = "DEF" | "MEI" | "ATA";

export type TeamEval = {
  name: string;
  players: DrawPlayer[];
  goalkeeperId: string | null;
  gkStatus: GkStatus;
  /** Ids de quem começa jogando (inclui o goleiro). */
  starters: string[];
  reserves: string[];
  strength: number;
  lineDeficits: Partial<Record<FieldLine, number>>;
};

export type DrawResult = {
  teams: TeamEval[];
  /** Diferença entre o time mais forte e o mais fraco. */
  spread: number;
  warnings: string[];
  cost: number;
};

export const TEAM_NAMES = ["Time A", "Time B", "Time C", "Time D"];
export const ON_FIELD = 7;
const DEFICIT_WEIGHT = 1.5;
const NO_GK_WEIGHT = 5;
const JITTER = 2;
const TOLERANCE = 0.5;
const LINE_NAME: Record<FieldLine, string> = { DEF: "defensor", MEI: "meio-campista", ATA: "atacante" };

/** Gerador pseudoaleatório com semente (mulberry32). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function suggestTeamCount(confirmed: number): number {
  if (confirmed >= ON_FIELD * 4) return 4;
  if (confirmed >= ON_FIELD * 3) return 3;
  return 2;
}

/** Número com 1 casa decimal no formato brasileiro (77,4). */
export const fmt1 = (n: number) => n.toFixed(1).replace(".", ",");

const mean = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);

function evalTeam(players: DrawPlayer[], name: string): TeamEval {
  const fixed = players.filter((p) => p.gkRole === "fixo").sort((a, b) => (b.gkOverall ?? b.overall) - (a.gkOverall ?? a.overall));
  let gk: DrawPlayer | null = fixed[0] ?? null;
  let gkStatus: GkStatus = "fixo";
  if (!gk) {
    const qg = players
      .filter((p) => p.gkRole === "quebra_galho")
      .sort((a, b) => (b.gkOverall ?? 0) - (a.gkOverall ?? 0));
    gk = qg[0] ?? null;
    gkStatus = gk ? "improvisado" : "rodizio";
  }

  const reserveGks = fixed.slice(1);
  const field = players
    .filter((p) => p !== gk && p.gkRole !== "fixo")
    .sort((a, b) => b.overall - a.overall);
  const fieldSlots = gk ? ON_FIELD - 1 : ON_FIELD;
  const startersField = field.slice(0, fieldSlots);
  const reservesField = field.slice(fieldSlots);

  const starterScores = startersField.map((p) => p.overall);
  if (gk) starterScores.push(gk.gkOverall ?? gk.overall);
  const reserveScores = [...reservesField.map((p) => p.overall), ...reserveGks.map((p) => p.gkOverall ?? p.overall)];
  const strength = reserveScores.length ? 0.8 * mean(starterScores) + 0.2 * mean(reserveScores) : mean(starterScores);

  // Cobertura de linhas: com 6 de linha, o alvo é 2 DEF, 2 MEI e 2 ATA.
  const target = Math.floor(Math.min(fieldSlots, field.length) / 3);
  const needs: Record<FieldLine, number> = { DEF: target, MEI: target, ATA: target };
  const used = new Set<DrawPlayer>();
  for (const p of field) {
    const line = LINE_OF[p.primaryPosition];
    if (line !== "GOL" && needs[line] > 0) {
      needs[line]--;
      used.add(p);
    }
  }
  for (const p of field) {
    if (used.has(p)) continue;
    for (const s of p.secondaryPositions) {
      const line = LINE_OF[s];
      if (line !== "GOL" && needs[line] > 0) {
        needs[line]--;
        used.add(p);
        break;
      }
    }
  }
  const lineDeficits: Partial<Record<FieldLine, number>> = {};
  for (const l of ["DEF", "MEI", "ATA"] as FieldLine[]) if (needs[l] > 0) lineDeficits[l] = needs[l];

  return {
    name,
    players,
    goalkeeperId: gk?.id ?? null,
    gkStatus,
    starters: [...(gk ? [gk.id] : []), ...startersField.map((p) => p.id)],
    reserves: [...reservesField.map((p) => p.id), ...reserveGks.map((p) => p.id)],
    strength,
    lineDeficits,
  };
}

function costOf(teams: TeamEval[], minNoGk: number): number {
  const strengths = teams.map((t) => t.strength);
  const spread = Math.max(...strengths) - Math.min(...strengths);
  const deficit = teams.reduce((s, t) => s + Object.values(t.lineDeficits).reduce((a, b) => a + (b ?? 0), 0), 0);
  const noGk = teams.filter((t) => t.gkStatus === "rodizio").length;
  return spread + DEFICIT_WEIGHT * deficit + NO_GK_WEIGHT * Math.max(0, noGk - minNoGk);
}

function minNoGkFor(players: DrawPlayer[], teamCount: number) {
  const canGk = players.filter((p) => p.gkRole !== "nao").length;
  return Math.max(0, teamCount - canGk);
}

/** Avalia qualquer divisão de times (usado também na troca manual). */
export function evaluate(teams: DrawPlayer[][]): DrawResult {
  const evals = teams.map((players, i) => evalTeam(players, TEAM_NAMES[i] ?? `Time ${i + 1}`));
  const all = teams.flat();
  const cost = costOf(evals, minNoGkFor(all, teams.length));
  const strengths = evals.map((t) => t.strength);
  const warnings: string[] = [];
  for (const t of evals) {
    if (t.gkStatus === "improvisado") {
      const gk = t.players.find((p) => p.id === t.goalkeeperId);
      warnings.push(`${t.name}: goleiro improvisado (${gk?.name})`);
    }
    if (t.gkStatus === "rodizio") warnings.push(`${t.name}: sem goleiro, rodízio no gol`);
    const missing = (Object.keys(t.lineDeficits) as FieldLine[]).map((l) => LINE_NAME[l]);
    if (missing.length) warnings.push(`${t.name}: falta ${missing.join(", ")} de origem`);
  }
  return {
    teams: evals,
    spread: strengths.length ? Math.max(...strengths) - Math.min(...strengths) : 0,
    warnings,
    cost,
  };
}

/** Avança na ordem serpente: 0,1,…,N-1,N-1,…,0,0,1… */
function step(idx: number, dir: number, n: number): [number, number] {
  const next = idx + dir;
  if (next >= n) return [n - 1, -1];
  if (next < 0) return [0, 1];
  return [next, dir];
}

/** Uma rodada: distribuição inicial em serpente com variação + trocas que melhoram o custo. */
function oneRun(players: DrawPlayer[], teamCount: number, rnd: () => number, minNoGk: number) {
  const teams: DrawPlayer[][] = Array.from({ length: teamCount }, () => []);
  const jit = (x: number) => x + (rnd() * 2 - 1) * JITTER;

  const fixed = players
    .filter((p) => p.gkRole === "fixo")
    .map((p) => ({ p, k: jit(p.gkOverall ?? p.overall) }))
    .sort((a, b) => b.k - a.k)
    .map((x) => x.p);
  fixed.forEach((p, i) => teams[i % teamCount].push(p));

  // Tamanhos-alvo: diferença máxima de 1; os times com mais goleiros ficam com as vagas extras.
  const base = Math.floor(players.length / teamCount);
  let extra = players.length % teamCount;
  const order = teams.map((t, i) => ({ i, n: t.length })).sort((a, b) => b.n - a.n);
  const targetSize = new Array<number>(teamCount).fill(base);
  for (const { i } of order) {
    if (extra > 0) {
      targetSize[i]++;
      extra--;
    }
  }

  const others = players
    .filter((p) => p.gkRole !== "fixo")
    .map((p) => ({ p, k: jit(p.overall) }))
    .sort((a, b) => b.k - a.k)
    .map((x) => x.p);
  let idx = 0;
  let dir = 1;
  for (const p of others) {
    let guard = 0;
    while (teams[idx].length >= targetSize[idx] && guard++ < teamCount * 2) {
      [idx, dir] = step(idx, dir, teamCount);
    }
    teams[idx].push(p);
    [idx, dir] = step(idx, dir, teamCount);
  }

  // Busca local: troca pares do mesmo tipo (fixo com fixo, linha com linha) enquanto melhorar.
  let evals = teams.map((t, i) => evalTeam(t, TEAM_NAMES[i]));
  let cost = costOf(evals, minNoGk);
  let improved = true;
  let passes = 0;
  while (improved && passes++ < 50) {
    improved = false;
    for (let a = 0; a < teamCount && !improved; a++) {
      for (let b = a + 1; b < teamCount && !improved; b++) {
        for (let i = 0; i < teams[a].length && !improved; i++) {
          for (let j = 0; j < teams[b].length && !improved; j++) {
            const pa = teams[a][i];
            const pb = teams[b][j];
            if ((pa.gkRole === "fixo") !== (pb.gkRole === "fixo")) continue;
            teams[a][i] = pb;
            teams[b][j] = pa;
            const ea = evalTeam(teams[a], TEAM_NAMES[a]);
            const eb = evalTeam(teams[b], TEAM_NAMES[b]);
            const next = evals.slice();
            next[a] = ea;
            next[b] = eb;
            const c = costOf(next, minNoGk);
            if (c < cost - 1e-9) {
              evals = next;
              cost = c;
              improved = true;
            } else {
              teams[a][i] = pa;
              teams[b][j] = pb;
            }
          }
        }
      }
    }
  }
  return { teams: teams.map((t) => [...t]), cost };
}

function keyOf(teams: DrawPlayer[][]) {
  return teams
    .map((t) => t.map((p) => p.id).sort().join(","))
    .sort()
    .join("|");
}

export type DrawOptions = { seed?: number; runs?: number };

export function drawTeams(players: DrawPlayer[], teamCount: number, opts: DrawOptions = {}): DrawResult {
  if (teamCount < 2) throw new Error("O sorteio precisa de pelo menos 2 times.");
  if (players.length < teamCount) throw new Error("Tem menos gente confirmada do que times.");
  const rnd = mulberry32(opts.seed ?? Date.now());
  const runs = opts.runs ?? 150;
  const minNoGk = minNoGkFor(players, teamCount);

  const found = new Map<string, { teams: DrawPlayer[][]; cost: number }>();
  let best = Infinity;
  for (let r = 0; r < runs; r++) {
    const res = oneRun(players, teamCount, rnd, minNoGk);
    const key = keyOf(res.teams);
    if (!found.has(key)) found.set(key, res);
    best = Math.min(best, res.cost);
  }
  const candidates = [...found.values()]
    .filter((s) => s.cost <= best + TOLERANCE)
    .sort((a, b) => keyOf(a.teams).localeCompare(keyOf(b.teams)));
  const pick = candidates[Math.floor(rnd() * candidates.length)];

  // Ordena os times pela força para a exibição ficar estável (A é o mais forte).
  const result = evaluate(pick.teams);
  const order = result.teams.map((t, i) => ({ i, s: t.strength })).sort((x, y) => y.s - x.s);
  return evaluate(order.map(({ i }) => pick.teams[i]));
}
