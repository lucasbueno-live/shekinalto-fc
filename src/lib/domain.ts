// Tipos e constantes do domínio. Sem dependências: usado no servidor, no cliente e nos testes.

export const POSITIONS = ["GOL", "ZAG", "LAT", "VOL", "MEI", "ATA"] as const;
export type Position = (typeof POSITIONS)[number];

export const POSITION_LABEL: Record<Position, string> = {
  GOL: "Goleiro",
  ZAG: "Zagueiro",
  LAT: "Lateral",
  VOL: "Volante",
  MEI: "Meia",
  ATA: "Atacante",
};

export type Line = "GOL" | "DEF" | "MEI" | "ATA";
export const LINE_OF: Record<Position, Line> = {
  GOL: "GOL",
  ZAG: "DEF",
  LAT: "DEF",
  VOL: "MEI",
  MEI: "MEI",
  ATA: "ATA",
};

export const GK_ROLES = ["fixo", "quebra_galho", "nao"] as const;
export type GkRole = (typeof GK_ROLES)[number];
export const GK_ROLE_LABEL: Record<GkRole, string> = {
  fixo: "Goleiro fixo",
  quebra_galho: "Fico no gol se precisar",
  nao: "Não jogo no gol",
};

export const FIELD_ATTRS = ["VEL", "FIN", "PAS", "DRI", "DEF", "FIS"] as const;
export const GK_ATTRS = ["REF", "POS", "SAI", "PES"] as const;
export type FieldAttr = (typeof FIELD_ATTRS)[number];
export type GkAttr = (typeof GK_ATTRS)[number];
export type Attr = FieldAttr | GkAttr;

export const ATTR_LABEL: Record<Attr, string> = {
  VEL: "Velocidade",
  FIN: "Finalização",
  PAS: "Passe",
  DRI: "Drible",
  DEF: "Defesa",
  FIS: "Físico",
  REF: "Reflexo",
  POS: "Posicionamento",
  SAI: "Saída do gol",
  PES: "Jogo com os pés",
};

/** Notas de 1 a 10 por atributo, como digitadas no voto ou na autoavaliação. */
export type Ratings = Partial<Record<Attr, number>>;

/** Quais atributos uma pessoa recebe nos votos, conforme o papel no gol. */
export function attrsFor(gkRole: GkRole): Attr[] {
  if (gkRole === "fixo") return [...GK_ATTRS];
  if (gkRole === "quebra_galho") return [...FIELD_ATTRS, ...GK_ATTRS];
  return [...FIELD_ATTRS];
}
