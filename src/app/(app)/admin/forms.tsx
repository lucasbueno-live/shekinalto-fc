"use client";

import { useActionState, useState, useTransition } from "react";
import { closeMatch, createMatch, createPlayer, resetPin, setPlayerActive, setPlayerRole, type FormState } from "@/app/actions";
import { PhotoPicker } from "@/components/PhotoPicker";
import { PositionFields } from "@/components/PositionFields";
import { Button, FormMessage, inputCls } from "@/components/ui";

export function MatchForm({ defaultDate, defaultPlace }: { defaultDate: string; defaultPlace: string }) {
  const [state, action, pending] = useActionState(createMatch, undefined);
  return (
    <form action={action} className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="font-semibold">Data</span>
          <input type="date" name="date" defaultValue={defaultDate} className={inputCls} required />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="font-semibold">Local</span>
          <input name="place" defaultValue={defaultPlace} className={inputCls} placeholder="Opcional" />
        </label>
      </div>
      <FormMessage state={state} />
      <Button disabled={pending}>{pending ? "Abrindo…" : "Abrir lista"}</Button>
    </form>
  );
}

export function CloseMatchButton({ matchId }: { matchId: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (confirm("Encerrar este jogo? A lista e os times saem da tela inicial.")) start(() => closeMatch(matchId));
      }}
      className="w-fit text-sm font-semibold text-chalk-dim underline underline-offset-4"
    >
      {pending ? "Encerrando…" : "Encerrar este jogo"}
    </button>
  );
}

export function NewPlayerForm() {
  const [formKey, setFormKey] = useState(0);
  const [state, action, pending] = useActionState(async (prev: FormState, fd: FormData) => {
    const res = await createPlayer(prev, fd);
    if (res?.ok) setFormKey((k) => k + 1); // limpa o formulário para o próximo cadastro
    return res;
  }, undefined);
  return (
    <form action={action} className="flex flex-col gap-4" key={formKey}>
      <label className="flex flex-col gap-1.5">
        <span className="font-semibold">Nome</span>
        <input name="name" className={inputCls} required />
      </label>
      <PositionFields primary="MEI" secondary={[]} gkRole="nao" />
      <label className="flex flex-col gap-1.5">
        <span className="font-semibold">PIN inicial</span>
        <input name="pin" className={inputCls} inputMode="numeric" pattern="\d{4}" maxLength={4} required placeholder="4 números" />
        <span className="text-sm text-chalk-dim">Passe para ele no privado. Dá para trocar depois no perfil.</span>
      </label>
      <FormMessage state={state} />
      <Button disabled={pending}>{pending ? "Cadastrando…" : "Cadastrar"}</Button>
    </form>
  );
}

export function PlayerAdminRow(props: { id: string; name: string; photoUrl: string | null; detail: string; active: boolean; isAdmin: boolean; isMe: boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [state, action, pinPending] = useActionState(resetPin, undefined);
  return (
    <li className={`px-4 py-3 ${props.active ? "" : "opacity-60"}`}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-semibold">
            {props.name}
            {props.isAdmin && <span className="ml-2 text-xs font-semibold text-bib">organizador</span>}
            {!props.active && <span className="ml-2 text-xs text-chalk-dim">fora do elenco</span>}
          </p>
          <p className="text-sm text-chalk-dim">{props.detail}</p>
        </div>
        <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="min-h-10 shrink-0 px-2 text-sm font-semibold text-bib">
          {open ? "Fechar" : "Opções"}
        </button>
      </div>
      {open && (
        <div className="mt-3 flex flex-col gap-3">
          <PhotoPicker playerId={props.id} photoUrl={props.photoUrl} name={props.name} />
          <form action={action} className="flex items-end gap-2">
            <input type="hidden" name="playerId" value={props.id} />
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-sm font-semibold">Novo PIN</span>
              <input name="pin" className={inputCls} inputMode="numeric" pattern="\d{4}" maxLength={4} required />
            </label>
            <Button variant="ghost" disabled={pinPending}>
              Redefinir
            </Button>
          </form>
          <FormMessage state={state} />
          {!props.isMe && (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={props.active ? "danger" : "ghost"}
                disabled={pending}
                onClick={() => start(() => setPlayerActive(props.id, !props.active))}
              >
                {props.active ? "Tirar do elenco" : "Voltar ao elenco"}
              </Button>
              <Button type="button" variant="ghost" disabled={pending} onClick={() => start(() => setPlayerRole(props.id, props.isAdmin ? "player" : "admin"))}>
                {props.isAdmin ? "Tirar de organizador" : "Tornar organizador"}
              </Button>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
