"use client";

import { useState } from "react";
import { GK_ROLE_LABEL, GK_ROLES, POSITIONS, POSITION_LABEL, type GkRole, type Position } from "@/lib/domain";
import { inputCls } from "./ui";

/** Campos de posição principal, secundárias e papel no gol. Usado no perfil e no cadastro. */
export function PositionFields({
  primary: initialPrimary,
  secondary,
  gkRole: initialGk,
  onGkRoleChange,
}: {
  primary: Position;
  secondary: Position[];
  gkRole: GkRole;
  onGkRoleChange?: (r: GkRole) => void;
}) {
  const [primary, setPrimary] = useState<Position>(initialPrimary);
  const [gkRole, setGkRole] = useState<GkRole>(initialGk);
  const isGk = primary === "GOL";
  const effectiveGk: GkRole = isGk ? "fixo" : gkRole === "fixo" ? "quebra_galho" : gkRole;

  function pickPrimary(p: Position) {
    setPrimary(p);
    const r: GkRole = p === "GOL" ? "fixo" : gkRole === "fixo" ? "quebra_galho" : gkRole;
    setGkRole(r);
    onGkRoleChange?.(r);
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="font-semibold">Posição principal</span>
        <select name="primary" className={inputCls} value={primary} onChange={(e) => pickPrimary(e.target.value as Position)}>
          {POSITIONS.map((p) => (
            <option key={p} value={p}>
              {POSITION_LABEL[p]}
            </option>
          ))}
        </select>
      </label>

      {!isGk && (
        <fieldset>
          <legend className="mb-1.5 font-semibold">Também joga de</legend>
          <div className="flex flex-wrap gap-2">
            {POSITIONS.filter((p) => p !== "GOL" && p !== primary).map((p) => (
              <label key={p} className="cursor-pointer">
                <input type="checkbox" name="secondary" value={p} defaultChecked={secondary.includes(p)} className="peer sr-only" />
                <span className="inline-flex min-h-10 items-center rounded-full px-4 text-sm font-semibold ring-1 ring-chalk/25 peer-checked:bg-chalk peer-checked:text-turf-950 peer-focus-visible:outline-2 peer-focus-visible:outline-bib">
                  {POSITION_LABEL[p]}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {isGk ? (
        <input type="hidden" name="gkRole" value="fixo" />
      ) : (
        <fieldset>
          <legend className="mb-1.5 font-semibold">E no gol?</legend>
          <div className="flex flex-col gap-1">
            {GK_ROLES.filter((r) => r !== "fixo").map((r) => (
              <label key={r} className="flex min-h-11 items-center gap-3">
                <input
                  type="radio"
                  name="gkRole"
                  value={r}
                  checked={effectiveGk === r}
                  onChange={() => {
                    setGkRole(r);
                    onGkRoleChange?.(r);
                  }}
                  className="size-5 accent-bib"
                />
                {GK_ROLE_LABEL[r]}
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );
}
