"use client";

import { useActionState, useState } from "react";
import { changePin, updateProfile } from "@/app/actions";
import { PositionFields } from "@/components/PositionFields";
import { RatingFields } from "@/components/RatingFields";
import { Button, FormMessage, inputCls } from "@/components/ui";
import { FIELD_ATTRS, GK_ATTRS, type GkRole, type Position, type Ratings } from "@/lib/domain";

export function ProfileForm(props: {
  nickname: string;
  primary: Position;
  secondary: Position[];
  gkRole: GkRole;
  selfRatings: Ratings;
  provisional: boolean;
}) {
  const [state, action, pending] = useActionState(updateProfile, undefined);
  const [gkRole, setGkRole] = useState<GkRole>(props.gkRole);

  return (
    <form action={action} className="flex flex-col gap-6">
      <label className="flex flex-col gap-1.5">
        <span className="font-semibold">Apelido na carta</span>
        <input name="nickname" defaultValue={props.nickname} maxLength={24} className={inputCls} placeholder="Opcional" />
      </label>

      <PositionFields primary={props.primary} secondary={props.secondary} gkRole={props.gkRole} onGkRoleChange={setGkRole} />

      <div>
        <h3 className="font-display text-xl font-extrabold">Autoavaliação</h3>
        <p className="mb-3 text-sm text-chalk-dim">
          {props.provisional
            ? "Vale só até você receber 3 votos dos colegas. Seja honesto: ela entra no sorteio enquanto isso."
            : "Sua carta já usa os votos dos colegas. A autoavaliação fica guardada, mas não conta mais."}
        </p>
        <div className="flex flex-col gap-6">
          {gkRole !== "fixo" && <RatingFields attrs={[...FIELD_ATTRS]} initial={props.selfRatings} groupLabel={gkRole === "quebra_galho" ? "Na linha" : undefined} />}
          {gkRole !== "nao" && <RatingFields attrs={[...GK_ATTRS]} initial={props.selfRatings} groupLabel={gkRole === "quebra_galho" ? "No gol" : undefined} />}
        </div>
      </div>

      <FormMessage state={state} />
      <Button disabled={pending}>{pending ? "Salvando…" : "Salvar perfil"}</Button>
    </form>
  );
}

export function PinForm() {
  const [state, action, pending] = useActionState(changePin, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="font-semibold">PIN atual</span>
          <input name="current" className={inputCls} inputMode="numeric" pattern="\d{4}" maxLength={4} required autoComplete="current-password" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-semibold">Novo PIN</span>
          <input name="next" className={inputCls} inputMode="numeric" pattern="\d{4}" maxLength={4} required autoComplete="new-password" />
        </label>
      </div>
      <FormMessage state={state} />
      <Button variant="ghost" disabled={pending}>
        {pending ? "Trocando…" : "Trocar PIN"}
      </Button>
    </form>
  );
}
