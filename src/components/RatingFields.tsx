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

function hint(v: number) {
  const keys = Object.keys(HINT).map(Number);
  const k = keys.filter((x) => x <= v).pop() ?? 1;
  return HINT[k];
}

/** Sliders de 1 a 10, um por atributo. Os valores vão no form como r_VEL, r_FIN… */
export function RatingFields({ attrs, initial, groupLabel }: { attrs: Attr[]; initial: Ratings | null; groupLabel?: string }) {
  const [values, setValues] = useState<Ratings>(() => {
    const v: Ratings = {};
    for (const a of attrs) v[a] = initial?.[a] ?? 5;
    return v;
  });
  return (
    <fieldset className="flex flex-col gap-4">
      {groupLabel && <legend className="mb-1 font-display text-xl font-extrabold">{groupLabel}</legend>}
      {attrs.map((a) => (
        <label key={a} className="flex flex-col gap-1">
          <span className="flex items-baseline justify-between">
            <span className="font-semibold">{ATTR_LABEL[a]}</span>
            <span className="text-sm text-chalk-dim">
              {hint(values[a]!)} <strong className="ml-1 font-display text-2xl font-black text-chalk tabular-nums">{values[a]}</strong>
            </span>
          </span>
          <input
            type="range"
            name={`r_${a}`}
            min={1}
            max={10}
            step={1}
            value={values[a]}
            onChange={(e) => setValues((s) => ({ ...s, [a]: Number(e.target.value) }))}
            className="h-8 w-full"
          />
        </label>
      ))}
    </fieldset>
  );
}
