"use client";

import { useActionState } from "react";
import { saveVote } from "@/app/actions";
import { RatingFields } from "@/components/RatingFields";
import { Button, FormMessage } from "@/components/ui";
import { FIELD_ATTRS, type Attr, type Ratings } from "@/lib/domain";

export function VoteForm({ targetId, attrs, initial, hasVote }: { targetId: string; attrs: Attr[]; initial: Ratings | null; hasVote: boolean }) {
  const [state, action, pending] = useActionState(saveVote, undefined);
  const field = attrs.filter((a) => (FIELD_ATTRS as readonly string[]).includes(a));
  const gk = attrs.filter((a) => !(FIELD_ATTRS as readonly string[]).includes(a));
  return (
    <form action={action} className="flex flex-col gap-6">
      <input type="hidden" name="targetId" value={targetId} />
      {field.length > 0 && <RatingFields attrs={field} initial={initial} groupLabel={gk.length ? "Na linha" : undefined} />}
      {gk.length > 0 && <RatingFields attrs={gk} initial={initial} groupLabel={field.length ? "No gol" : undefined} />}
      <FormMessage state={state} />
      <Button disabled={pending}>{pending ? "Salvando…" : hasVote ? "Atualizar voto" : "Salvar voto"}</Button>
    </form>
  );
}
