import {
  FIELD_ATTRS,
  GK_ATTRS,
  type Attr,
  type FieldAttr,
  type GkAttr,
  type GkRole,
  type Position,
  type Ratings,
} from "./domain";

/** Votos dos outros jogadores necessários para a carta deixar de ser provisória. */
export const MIN_VOTES = 3;
/** A partir de quantos votos o maior e o menor são descartados. */
export const TRIM_FROM = 5;
/** Valor neutro (meio da escala) quando não há nenhum dado para um atributo. */
const NEUTRAL = 5.5;

export function toCardScale(avg: number): number {
  const clamped = Math.min(10, Math.max(1, avg));
  return Math.round(40 + ((clamped - 1) / 9) * 59);
}

/** Média dos votos; descarta o maior e o menor quando há votos suficientes. */
export function aggregate(values: number[]): number | null {
  if (values.length === 0) return null;
  let list = [...values].sort((a, b) => a - b);
  if (list.length >= TRIM_FROM) list = list.slice(1, -1);
  return list.reduce((s, v) => s + v, 0) / list.length;
}

const FIELD_WEIGHTS: Record<Exclude<Position, "GOL">, Partial<Record<FieldAttr, number>>> = {
  ATA: { FIN: 0.35, VEL: 0.2, DRI: 0.2, PAS: 0.1, FIS: 0.1, DEF: 0.05 },
  MEI: { PAS: 0.35, DRI: 0.2, FIN: 0.15, VEL: 0.1, DEF: 0.1, FIS: 0.1 },
  VOL: { DEF: 0.3, PAS: 0.3, FIS: 0.2, VEL: 0.1, DRI: 0.05, FIN: 0.05 },
  ZAG: { DEF: 0.45, FIS: 0.25, PAS: 0.15, VEL: 0.1, DRI: 0.03, FIN: 0.02 },
  LAT: { VEL: 0.3, DEF: 0.3, PAS: 0.2, FIS: 0.1, DRI: 0.1 },
};
const GK_WEIGHTS: Record<GkAttr, number> = { REF: 0.35, POS: 0.3, SAI: 0.2, PES: 0.15 };

function weighted(raw: Partial<Record<Attr, number>>, weights: Partial<Record<Attr, number>>) {
  let sum = 0;
  let total = 0;
  for (const [attr, w] of Object.entries(weights) as [Attr, number][]) {
    sum += (raw[attr] ?? NEUTRAL) * w;
    total += w;
  }
  return sum / total;
}

export type CardInput = {
  primaryPosition: Position;
  gkRole: GkRole;
  selfRatings: Ratings;
  /** Votos recebidos dos outros jogadores (nunca inclui o voto em si mesmo). */
  votes: Ratings[];
};

export type Card = {
  kind: "field" | "gk";
  /** Atributos já na escala da carta (40 a 99). */
  attrs: Partial<Record<Attr, number>>;
  overall: number;
  /** Nota de goleiro, para fixos e quebra-galhos. */
  gkOverall: number | null;
  provisional: boolean;
  voteCount: number;
};

export function computeCard(input: CardInput): Card {
  const { primaryPosition, gkRole, selfRatings, votes } = input;
  const provisional = votes.length < MIN_VOTES;
  const sources = provisional ? [selfRatings] : votes;

  const wanted: Attr[] =
    gkRole === "fixo" ? [...GK_ATTRS] : gkRole === "quebra_galho" ? [...FIELD_ATTRS, ...GK_ATTRS] : [...FIELD_ATTRS];

  const raw: Partial<Record<Attr, number>> = {};
  for (const attr of wanted) {
    const values = sources.map((r) => r[attr]).filter((v): v is number => typeof v === "number");
    raw[attr] = aggregate(values) ?? NEUTRAL;
  }

  const attrs: Partial<Record<Attr, number>> = {};
  for (const attr of wanted) attrs[attr] = toCardScale(raw[attr]!);

  const gkOverall = gkRole === "nao" ? null : toCardScale(weighted(raw, GK_WEIGHTS));

  if (gkRole === "fixo") {
    return { kind: "gk", attrs, overall: gkOverall!, gkOverall, provisional, voteCount: votes.length };
  }

  const fieldPos = primaryPosition === "GOL" ? "MEI" : primaryPosition;
  const overall = toCardScale(weighted(raw, FIELD_WEIGHTS[fieldPos]));
  return { kind: "field", attrs, overall, gkOverall, provisional, voteCount: votes.length };
}

export type Tier = "bronze" | "prata" | "ouro";
export function tierOf(overall: number): Tier {
  if (overall >= 75) return "ouro";
  if (overall >= 65) return "prata";
  return "bronze";
}
