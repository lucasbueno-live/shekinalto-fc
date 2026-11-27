"use client";

import { useActionState, useMemo, useState } from "react";
import { login, setupOrganizer } from "@/app/actions";
import { Button, FormMessage, inputCls } from "@/components/ui";
import { POSITIONS, POSITION_LABEL } from "@/lib/domain";

type Option = { id: string; label: string; sub: string | null };

export function LoginForm({ players }: { players: Option[] }) {
  const [state, action, pending] = useActionState(login, undefined);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<Option | null>(null);
  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase("pt-BR");
    return q ? players.filter((p) => `${p.label} ${p.sub ?? ""}`.toLocaleLowerCase("pt-BR").includes(q)) : players;
  }, [players, query]);

  if (!picked) {
    return (
      <div className="flex flex-col gap-3">
        <label className="sr-only" htmlFor="busca">
          Buscar nome
        </label>
        <input
          id="busca"
          className={inputCls}
          placeholder="Busque seu nome"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoComplete="off"
        />
        <ul className="flex flex-col divide-y divide-chalk/10 overflow-hidden rounded-lg bg-turf-950/55 ring-1 ring-chalk/10">
          {filtered.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setPicked(p)}
                className="flex min-h-14 w-full items-center justify-between px-4 text-left active:bg-chalk/10"
              >
                <span className="text-lg font-semibold">{p.label}</span>
                {p.sub && <span className="text-sm text-chalk-dim">{p.sub}</span>}
              </button>
            </li>
          ))}
          {filtered.length === 0 && <li className="px-4 py-4 text-chalk-dim">Ninguém com esse nome. Peça ao organizador o link de convite para criar seu jogador.</li>}
        </ul>
        <p className="text-sm text-chalk-dim">Seu nome não está aqui? Peça ao organizador o link de convite do grupo.</p>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="playerId" value={picked.id} />
      <p className="text-lg">
        Entrando como <strong className="font-display text-2xl font-extrabold">{picked.label}</strong>{" "}
        <button type="button" className="ml-1 text-sm text-bib underline underline-offset-4" onClick={() => setPicked(null)}>
          não sou eu
        </button>
      </p>
      <label className="flex flex-col gap-1.5">
        <span className="font-semibold">Seu PIN</span>
        <input
          name="pin"
          className={`${inputCls} text-center font-display text-4xl font-black tracking-[0.5em]`}
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          autoComplete="current-password"
          autoFocus
          required
        />
      </label>
      <FormMessage state={state} />
      <Button disabled={pending}>{pending ? "Entrando…" : "Entrar"}</Button>
      <p className="text-sm text-chalk-dim">Esqueceu o PIN? O organizador redefine para você.</p>
    </form>
  );
}

export function SetupForm() {
  const [state, action, pending] = useActionState(setupOrganizer, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      <p className="text-chalk-dim">
        Ainda não tem ninguém aqui. Quem criar agora vira o organizador: cadastra a galera, abre a lista da semana e faz o sorteio.
      </p>
      <label className="flex flex-col gap-1.5">
        <span className="font-semibold">Seu nome</span>
        <input name="name" className={inputCls} required autoComplete="name" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="font-semibold">Sua posição</span>
        <select name="primary" className={inputCls} defaultValue="MEI">
          {POSITIONS.map((p) => (
            <option key={p} value={p}>
              {POSITION_LABEL[p]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="font-semibold">Crie um PIN de 4 números</span>
        <input name="pin" className={inputCls} inputMode="numeric" pattern="\d{4}" maxLength={4} required autoComplete="new-password" />
      </label>
      <FormMessage state={state} />
      <Button disabled={pending}>{pending ? "Criando…" : "Criar elenco"}</Button>
    </form>
  );
}
