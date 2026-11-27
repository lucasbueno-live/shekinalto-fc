import { describe, expect, it } from "vitest";
import { aggregate, computeCard, tierOf, toCardScale } from "../src/lib/rating";

const flat = (n: number) => ({ VEL: n, FIN: n, PAS: n, DRI: n, DEF: n, FIS: n });
const flatGk = (n: number) => ({ REF: n, POS: n, SAI: n, PES: n });

describe("toCardScale", () => {
  it("leva 1..10 para 40..99", () => {
    expect(toCardScale(1)).toBe(40);
    expect(toCardScale(10)).toBe(99);
    expect(toCardScale(5.5)).toBe(70);
  });
  it("limita valores fora da faixa", () => {
    expect(toCardScale(0)).toBe(40);
    expect(toCardScale(12)).toBe(99);
  });
});

describe("aggregate", () => {
  it("média simples com menos de 5 votos", () => {
    expect(aggregate([4, 6, 8])).toBe(6);
  });
  it("descarta maior e menor a partir de 5 votos", () => {
    // sem o 1 e o 10: média de 6, 7, 8
    expect(aggregate([1, 6, 7, 8, 10])).toBe(7);
  });
  it("lista vazia devolve null", () => {
    expect(aggregate([])).toBeNull();
  });
});

describe("computeCard", () => {
  it("com menos de 3 votos usa a autoavaliação e marca provisória", () => {
    const card = computeCard({
      primaryPosition: "ATA",
      gkRole: "nao",
      selfRatings: flat(10),
      votes: [flat(1), flat(1)],
    });
    expect(card.provisional).toBe(true);
    expect(card.overall).toBe(99);
    expect(card.voteCount).toBe(2);
  });

  it("com 3 votos ou mais usa só os votos dos outros", () => {
    const card = computeCard({
      primaryPosition: "MEI",
      gkRole: "nao",
      selfRatings: flat(10),
      votes: [flat(5.5), flat(5.5), flat(5.5)],
    });
    expect(card.provisional).toBe(false);
    expect(card.overall).toBe(70);
    expect(card.attrs.PAS).toBe(70);
  });

  it("pondera a nota geral pela posição principal", () => {
    const finisher = { VEL: 5, FIN: 10, PAS: 5, DRI: 5, DEF: 1, FIS: 5 };
    const votes = [finisher, finisher, finisher];
    const asAta = computeCard({ primaryPosition: "ATA", gkRole: "nao", selfRatings: {}, votes });
    const asZag = computeCard({ primaryPosition: "ZAG", gkRole: "nao", selfRatings: {}, votes });
    expect(asAta.overall).toBeGreaterThan(asZag.overall);
  });

  it("goleiro fixo tem nota geral de goleiro", () => {
    const card = computeCard({
      primaryPosition: "GOL",
      gkRole: "fixo",
      selfRatings: {},
      votes: [flatGk(10), flatGk(10), flatGk(10)],
    });
    expect(card.overall).toBe(99);
    expect(card.gkOverall).toBe(99);
    expect(card.kind).toBe("gk");
  });

  it("quebra-galho tem carta de linha e nota de goleiro separada", () => {
    const v = { ...flat(10), ...flatGk(1) };
    const card = computeCard({
      primaryPosition: "MEI",
      gkRole: "quebra_galho",
      selfRatings: {},
      votes: [v, v, v],
    });
    expect(card.kind).toBe("field");
    expect(card.overall).toBe(99);
    expect(card.gkOverall).toBe(40);
  });

  it("atributo sem nenhum dado fica em 5 (70 na carta)", () => {
    const card = computeCard({ primaryPosition: "ATA", gkRole: "nao", selfRatings: {}, votes: [] });
    expect(card.overall).toBe(70);
  });
});

describe("tierOf", () => {
  it("bronze, prata e ouro", () => {
    expect(tierOf(64)).toBe("bronze");
    expect(tierOf(65)).toBe("prata");
    expect(tierOf(74)).toBe("prata");
    expect(tierOf(75)).toBe("ouro");
  });
});
