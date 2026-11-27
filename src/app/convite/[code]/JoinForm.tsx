"use client";

import { startTransition, useActionState } from "react";
import { joinWithInvite } from "@/app/actions";
import { PositionFields } from "@/components/PositionFields";
import { Button, FormMessage, inputCls } from "@/components/ui";

export function JoinForm({ code }: { code: string }) {
  const [state, action, pending] = useActionState(joinWithInvite, undefined);
  return (
    <form
      // Envia sem o reset automático do React 19: se der erro, a pessoa não perde o que preencheu.
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        startTransition(() => action(fd));
      }}
      className="flex flex-col gap-5"
    >
      <input type="hidden" name="code" value={code} />
      <label className="flex flex-col gap-1.5">
        <span className="font-semibold">Seu nome</span>
        <input name="name" className={inputCls} required maxLength={40} autoComplete="name" />
        <span className="text-sm text-chalk-dim">Do jeito que a galera te conhece. O apelido você ajusta depois no perfil.</span>
      </label>

      <PositionFields primary="MEI" secondary={[]} gkRole="nao" />

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="font-semibold">Crie um PIN</span>
          <input name="pin" className={inputCls} inputMode="numeric" pattern="\d{4}" maxLength={4} required autoComplete="new-password" placeholder="4 números" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-semibold">Repita o PIN</span>
          <input name="pin2" className={inputCls} inputMode="numeric" pattern="\d{4}" maxLength={4} required autoComplete="new-password" />
        </label>
      </div>
      <p className="-mt-2 text-sm text-chalk-dim">Você usa o PIN para entrar em outro celular. Guarde bem.</p>

      <FormMessage state={state} />
      <Button disabled={pending}>{pending ? "Criando…" : "Criar meu jogador"}</Button>
    </form>
  );
}
