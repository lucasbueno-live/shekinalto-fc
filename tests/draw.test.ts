import { describe, expect, it } from "vitest";
import { drawTeams, evaluate, mulberry32, suggestTeamCount, type DrawPlayer } from "../src/lib/draw";
import type { GkRole, Position } from "../src/lib/domain";

/** Gera um grupo realista e determinístico: notas de 55 a 88, posições variadas. */
function makeGroup(n: number, fixedGks: number, quebraGalhos = 2, seed = 7): DrawPlayer[] {
  const rnd = mulberry32(seed);
  const field: Position[] = ["ZAG", "LAT", "VOL", "MEI", "ATA"];
  const players: DrawPlayer[] = [];
  for (let i = 0; i < n; i++) {
    const isGk = i < fixedGks;
    const isQg = !isGk && i < fixedGks + quebraGalhos;
    const gkRole: GkRole = isGk ? "fixo" : isQg ? "quebra_galho" : "nao";
    const primary: Position = isGk ? "GOL" : field[Math.floor(rnd() * field.length)];
    const secondary: Position[] = isGk ? [] : [field[Math.floor(rnd() * field.length)]].filter((p) => p !== primary);
    const overall = Math.round(55 + rnd() * 33);
    players.push({
      id: `p${i}`,
      name: `Jogador ${i}`,
      overall,
      gkOverall: gkRole === "nao" ? null : gkRole === "fixo" ? overall : Math.round(45 + rnd() * 20),
      primaryPosition: primary,
      secondaryPositions: secondary,
      gkRole,
    });
  }
  return players;
}

function idsOf(result: ReturnType<typeof drawTeams>) {
  return result.teams.flatMap((t) => t.players.map((p) => p.id));
}

const cases: [number, number, number][] = [
  // jogadores, times, goleiros fixos
  [14, 2, 2],
  [18, 2, 2],
  [23, 2, 1],
  [21, 3, 2],
  [28, 4, 0],
  [18, 2, 5],
  [16, 2, 0],
];

describe("drawTeams", () => {
  for (const [n, teams, gks] of cases) {
    describe(`${n} jogadores, ${teams} times, ${gks} goleiros fixos`, () => {
      const players = makeGroup(n, gks);
      const result = drawTeams(players, teams, { seed: 42 });

      it("todo mundo aparece exatamente uma vez", () => {
        const ids = idsOf(result);
        expect(ids).toHaveLength(n);
        expect(new Set(ids).size).toBe(n);
      });

      it("tamanhos diferem em no máximo 1", () => {
        const sizes = result.teams.map((t) => t.players.length);
        expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1);
        expect(result.teams).toHaveLength(teams);
      });

      it("diferença de força de no máximo 2 pontos", () => {
        expect(result.spread).toBeLessThanOrEqual(2);
      });

      it("cada time tem no máximo 1 goleiro fixo em campo", () => {
        for (const t of result.teams) {
          if (t.gkStatus === "fixo") {
            const gk = t.players.find((p) => p.id === t.goalkeeperId);
            expect(gk?.gkRole).toBe("fixo");
          }
        }
        const withFixed = result.teams.filter((t) => t.gkStatus === "fixo").length;
        expect(withFixed).toBe(Math.min(gks, teams));
      });
    });
  }

  it("avisa quando falta goleiro e usa quebra-galho", () => {
    const players = makeGroup(14, 1, 1);
    const result = drawTeams(players, 2, { seed: 1 });
    const statuses = result.teams.map((t) => t.gkStatus).sort();
    expect(statuses).toEqual(["fixo", "improvisado"]);
    expect(result.warnings.some((w) => w.includes("improvisado"))).toBe(true);
  });

  it("avisa rodízio quando não há ninguém para o gol", () => {
    const players = makeGroup(14, 0, 0);
    const result = drawTeams(players, 2, { seed: 1 });
    expect(result.teams.every((t) => t.gkStatus === "rodizio")).toBe(true);
    expect(result.warnings.filter((w) => w.includes("rodízio"))).toHaveLength(2);
  });

  it("mesma semente dá o mesmo resultado; sementes diferentes variam", () => {
    const players = makeGroup(18, 2);
    const a = drawTeams(players, 2, { seed: 5 });
    const b = drawTeams(players, 2, { seed: 5 });
    expect(idsOf(a)).toEqual(idsOf(b));
    const keys = new Set<string>();
    for (let s = 0; s < 10; s++) {
      const r = drawTeams(players, 2, { seed: s });
      keys.add(
        r.teams
          .map((t) => t.players.map((p) => p.id).sort().join(","))
          .sort()
          .join("|"),
      );
    }
    expect(keys.size).toBeGreaterThan(1);
  });

  it("aceita menos de 7 por time (6x6)", () => {
    const result = drawTeams(makeGroup(12, 2), 2, { seed: 3 });
    expect(result.teams.map((t) => t.players.length)).toEqual([6, 6]);
  });
});

describe("evaluate", () => {
  it("recalcula força depois de uma troca manual", () => {
    const players = makeGroup(14, 2);
    const result = drawTeams(players, 2, { seed: 9 });
    const [a, b] = result.teams.map((t) => t.players.map((p) => p.id));
    // troca o melhor jogador de linha de A pelo pior de linha de B
    const byId = new Map(players.map((p) => [p.id, p]));
    const fieldA = a.filter((id) => byId.get(id)!.gkRole !== "fixo").sort((x, y) => byId.get(y)!.overall - byId.get(x)!.overall);
    const fieldB = b.filter((id) => byId.get(id)!.gkRole !== "fixo").sort((x, y) => byId.get(x)!.overall - byId.get(y)!.overall);
    const swappedA = a.map((id) => (id === fieldA[0] ? fieldB[0] : id));
    const swappedB = b.map((id) => (id === fieldB[0] ? fieldA[0] : id));
    const after = evaluate([swappedA.map((id) => byId.get(id)!), swappedB.map((id) => byId.get(id)!)]);
    expect(after.spread).toBeGreaterThanOrEqual(result.spread);
    expect(after.teams).toHaveLength(2);
  });
});

describe("suggestTeamCount", () => {
  it("sugere 2 até 20, depois 3, depois 4", () => {
    expect(suggestTeamCount(14)).toBe(2);
    expect(suggestTeamCount(18)).toBe(2);
    expect(suggestTeamCount(21)).toBe(3);
    expect(suggestTeamCount(28)).toBe(4);
  });
});
