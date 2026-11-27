"use client";

import { useState } from "react";
import { ATTR_LABEL, type Attr, type Ratings } from "@/lib/domain";

const HINT: Record<number, string> = {
  1: "fraco",
  3: "abaixo da média",
  5: "na média da pelada",
  7: "acima da média",
  9: "craque",
  10: "o melhor do grupo",
};
const SCALE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

function hint(v: number) {
  const k = Object.keys(HINT)
    .map(Number)
    .filter((x) => x <= v)
    .pop();
  return HINT[k ?? 1];
}

/**
 * Uma fileira de notas de 1 a 10 por atributo, sem nada marcado de início
 * (para ninguém salvar a média por preguiça). São rádios de verdade com `required`:
 * o navegador não deixa enviar com atributo sem nota. Os valores vão como r_VEL, r_FIN…
 */
export function RatingFields({ attrs, initial, groupLabel }: { attrs: Attr[]; initial: Ratings | null; groupLabel?: string }) {
  const [values, setValues] = useState<Ratings>(() => {
    const v: Ratings = {};
    for (const a of attrs) if (initial?.[a]) v[a] = initial[a];
    return v;
  });
  const missing = attrs.filter((a) => !values[a]).length;

  return (
    <fieldset className="flex flex-col gap-5">
      {groupLabel && <legend className="mb-1 font-display text-xl font-extrabold">{groupLabel}</legend>}
      {attrs.map((a) => (
        <div key={a} role="radiogroup" aria-labelledby={`lbl-${a}`} className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-2">
            <span id={`lbl-${a}`} className="font-semibold">
              {ATTR_LABEL[a]}
            </span>
            <span className="text-sm text-chalk-dim">{values[a] ? hint(values[a]!) : "toque numa nota"}</span>
          </div>
          <div className="grid grid-cols-10 gap-1">
            {SCALE.map((n) => (
              <label key={n} className="relative">
                <input
                  type="radio"
                  name={`r_${a}`}
                  value={n}
                  required
                  defaultChecked={initial?.[a] === n}
                  onChange={() => setValues((s) => ({ ...s, [a]: n }))}
                  className="peer absolute inset-0 size-full cursor-pointer opacity-0"
                  aria-label={`${ATTR_LABEL[a]}: ${n}`}
                />
                <span
                  aria-hidden
                  className="grid h-11 place-items-center rounded-md font-display text-lg font-extrabold tabular-nums ring-1 ring-chalk/20 transition-colors peer-checked:bg-bib peer-checked:text-turf-950 peer-checked:ring-bib peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-bib"
                >
                  {n}
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}
      {missing > 0 && (
        <p className="text-sm text-chalk-dim" aria-live="polite">
          {missing === 1 ? "Falta 1 atributo" : `Faltam ${missing} atributos`}
          {groupLabel ? ` ${groupLabel.toLowerCase()}` : ""}.
        </p>
      )}
    </fieldset>
  );
}
