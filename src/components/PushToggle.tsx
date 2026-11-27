"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { subscribePush, unsubscribePush, type FormState } from "@/app/actions";
import { isStandalone } from "./InstallGuide";
import { Button, FormMessage } from "./ui";

type Status = "carregando" | "sem-suporte" | "iphone-instalar" | "bloqueado" | "desligado" | "ligado";

function base64ToBytes(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

const isIos = () => /iPhone|iPad|iPod/i.test(navigator.userAgent) || (/Macintosh/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);

async function registration() {
  return navigator.serviceWorker.register("/sw.js", { scope: "/" });
}

async function readStatus(): Promise<Status> {
  const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  if (!supported) return isIos() && !isStandalone() ? "iphone-instalar" : "sem-suporte";
  if (Notification.permission === "denied") return "bloqueado";
  const reg = await registration();
  const sub = await reg.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "ligado" : "desligado";
}

/**
 * Liga e desliga os avisos de jogo novo neste celular.
 * `compact` é a versão da tela inicial: só aparece enquanto os avisos estão desligados.
 */
export function PushToggle({ publicKey, compact = false }: { publicKey: string; compact?: boolean }) {
  const [status, setStatus] = useState<Status>("carregando");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<FormState>();

  useEffect(() => {
    let alive = true;
    readStatus()
      .then((s) => alive && setStatus(s))
      .catch(() => alive && setStatus("sem-suporte"));
    return () => {
      alive = false;
    };
  }, []);

  async function enable() {
    setBusy(true);
    setMsg(undefined);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "bloqueado" : "desligado");
        return;
      }
      const reg = await registration();
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ToBytes(publicKey) }));
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      const res = await subscribePush(json);
      setMsg(res);
      if (res?.ok) setStatus("ligado");
    } catch {
      setMsg({ error: "Não deu para ativar os avisos neste celular. Tente de novo pelo app instalado na tela inicial." });
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    try {
      const reg = await registration();
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await unsubscribePush(sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus("desligado");
      setMsg({ ok: "Avisos desligados neste celular." });
    } finally {
      setBusy(false);
    }
  }

  if (compact) {
    if (status !== "desligado") return null;
    return (
      <div className="mb-5 flex items-center gap-3 rounded-lg bg-turf-950/60 py-2 pl-4 pr-2 ring-1 ring-bib/50">
        <p className="flex-1 text-sm">Quer ser avisado quando marcarem jogo?</p>
        <button
          type="button"
          onClick={enable}
          disabled={busy}
          className="min-h-10 shrink-0 rounded-md bg-bib px-3 font-display text-base font-extrabold text-turf-950 active:bg-bib-deep"
        >
          {busy ? "Ativando…" : "Ativar avisos"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {status === "carregando" && <p className="text-chalk-dim">Verificando este celular…</p>}
      {status === "ligado" && (
        <>
          <p>✓ Este celular recebe um aviso quando o organizador marcar um jogo.</p>
          <Button variant="ghost" type="button" onClick={disable} disabled={busy}>
            Desligar avisos
          </Button>
        </>
      )}
      {status === "desligado" && (
        <>
          <p className="text-chalk-dim">Receba um aviso no celular quando o organizador marcar um jogo, para confirmar presença na hora.</p>
          <Button type="button" onClick={enable} disabled={busy}>
            {busy ? "Ativando…" : "Ativar avisos de jogo"}
          </Button>
        </>
      )}
      {status === "iphone-instalar" && (
        <p className="text-chalk-dim">
          No iPhone, os avisos só funcionam com o app instalado na tela inicial (iOS 16.4 ou mais novo).{" "}
          <Link href="/instalar" className="font-semibold text-bib underline underline-offset-4">
            Ver como instalar
          </Link>
          . Depois abra pelo ícone e volte aqui.
        </p>
      )}
      {status === "bloqueado" && (
        <p className="text-chalk-dim">
          Os avisos estão bloqueados para este site. Libere nas configurações do celular: em Notificações, procure o navegador ou o Shekinalto FC e permita.
        </p>
      )}
      {status === "sem-suporte" && <p className="text-chalk-dim">Este navegador não recebe avisos. Tente pelo Chrome (Android) ou pelo app instalado na tela inicial.</p>}
      <FormMessage state={msg} />
    </div>
  );
}
