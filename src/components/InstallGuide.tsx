"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Button, Panel } from "./ui";

type Platform = "ios" | "android" | "outro";
type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1)) return "ios";
  if (/Android/i.test(ua)) return "android";
  return "outro";
}

/** Navegadores embutidos (WhatsApp, Instagram, Facebook) não deixam instalar. */
function isInAppBrowser() {
  return /WhatsApp|Instagram|FBAN|FBAV|FB_IAB|Line\//i.test(navigator.userAgent);
}

export function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

const noop = () => () => {};
/** Lê algo do navegador sem erro de hidratação (no servidor devolve o valor padrão). */
function useClient<T>(read: () => T, server: T): T {
  return useSyncExternalStore(noop, read, () => server);
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-bib font-display text-lg font-black text-turf-950">{n}</span>
      <span className="pt-1">{children}</span>
    </li>
  );
}

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="mx-0.5 inline size-5 -translate-y-0.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}
const SHARE = "M12 3v12M8 7l4-4 4 4M5 12v8h14v-8";
const DOTS = "M12 5h.01M12 12h.01M12 19h.01";

function IosSteps() {
  return (
    <ol className="flex flex-col gap-3">
      <Step n={1}>
        Abra este site no <strong>Safari</strong>. Nos iPhones mais novos também funciona pelo Chrome.
      </Step>
      <Step n={2}>
        Toque no botão de compartilhar <Icon d={SHARE} />, o quadrado com a seta para cima. No Safari ele fica embaixo; no Chrome, em cima.
      </Step>
      <Step n={3}>
        Role a lista e toque em <strong>Adicionar à Tela de Início</strong>.
      </Step>
      <Step n={4}>
        Toque em <strong>Adicionar</strong>. O ícone do Shekinalto FC aparece junto dos seus apps.
      </Step>
    </ol>
  );
}

function AndroidSteps() {
  return (
    <ol className="flex flex-col gap-3">
      <Step n={1}>
        Abra este site no <strong>Chrome</strong>.
      </Step>
      <Step n={2}>
        Toque nos três pontinhos <Icon d={DOTS} /> no canto de cima, à direita.
      </Step>
      <Step n={3}>
        Toque em <strong>Instalar app</strong> ou <strong>Adicionar à tela inicial</strong>.
      </Step>
      <Step n={4}>
        Confirme em <strong>Instalar</strong>. O ícone aparece na tela inicial.
      </Step>
      <li className="text-sm text-chalk-dim">
        No navegador da Samsung: toque no menu <Icon d="M4 6h16M4 12h16M4 18h16" />, depois em <strong>Adicionar página a</strong> e <strong>Tela inicial</strong>.
      </li>
    </ol>
  );
}

export function InstallGuide() {
  const platform = useClient<Platform | null>(detectPlatform, null);
  const inApp = useClient(isInAppBrowser, false);
  const installed = useClient(isStandalone, false);
  const [tab, setTab] = useState<Platform | null>(null);
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [done, setDone] = useState(false);

  // No Android/Chrome dá para instalar com um toque, sem seguir os passos.
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setDone(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed || done) {
    return (
      <Panel>
        <p className="font-display text-2xl font-black">Pronto, o app está instalado.</p>
        <p className="mt-1 text-chalk-dim">Abra pelo ícone do Shekinalto FC na tela inicial do celular.</p>
      </Panel>
    );
  }

  const shown = tab ?? (platform === "ios" ? "ios" : "android");

  return (
    <div className="flex flex-col gap-5">
      {inApp && (
        <Panel className="ring-bib/60">
          <p className="font-semibold">Você abriu o link dentro do WhatsApp.</p>
          <p className="mt-1 text-chalk-dim">
            Por aqui não dá para instalar. Toque nos três pontinhos (Android) ou no ícone da bússola (iPhone) e escolha <strong>Abrir no navegador</strong>. Depois siga os passos abaixo.
          </p>
        </Panel>
      )}

      {prompt && (
        <Button
          type="button"
          className="min-h-14 text-2xl"
          onClick={async () => {
            await prompt.prompt();
            const { outcome } = await prompt.userChoice;
            if (outcome === "accepted") setDone(true);
            setPrompt(null);
          }}
        >
          Instalar agora
        </Button>
      )}

      <div role="tablist" aria-label="Tipo de celular" className="grid grid-cols-2 gap-2">
        {(["ios", "android"] as const).map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={shown === p}
            onClick={() => setTab(p)}
            className={`min-h-12 rounded-md font-display text-xl font-extrabold ring-1 ${shown === p ? "bg-chalk text-turf-950 ring-chalk" : "ring-chalk/25"}`}
          >
            {p === "ios" ? "iPhone" : "Android"}
          </button>
        ))}
      </div>

      <Panel>{shown === "ios" ? <IosSteps /> : <AndroidSteps />}</Panel>

      <p className="text-sm text-chalk-dim">
        Depois de instalado, o app abre em tela cheia, sem a barra do navegador, e você continua logado. Se aparecer a tela de entrada, é só escolher seu nome e digitar o PIN de novo.
      </p>
    </div>
  );
}

const HINT_KEY = "sfc_instalar_fechado";
function readHintClosed() {
  try {
    return localStorage.getItem(HINT_KEY) === "1";
  } catch {
    return false;
  }
}

/** Aviso discreto na tela inicial; some quando o app já está instalado ou a pessoa fecha. */
export function InstallHint() {
  const installed = useClient(isStandalone, true);
  const closedBefore = useClient(readHintClosed, true);
  const [closed, setClosed] = useState(false);
  if (installed || closedBefore || closed) return null;
  return (
    <div className="mb-5 flex items-center gap-3 rounded-lg bg-turf-950/60 py-2 pl-4 pr-2 ring-1 ring-bib/50">
      <p className="flex-1 text-sm">
        Coloque o Shekinalto FC na tela inicial do celular.{" "}
        <Link href="/instalar" className="font-semibold text-bib underline underline-offset-4">
          Ver como
        </Link>
      </p>
      <button
        type="button"
        aria-label="Fechar aviso"
        onClick={() => {
          setClosed(true);
          try {
            localStorage.setItem(HINT_KEY, "1");
          } catch {
            /* navegação privada: só some até recarregar */
          }
        }}
        className="grid size-10 shrink-0 place-items-center rounded-full text-chalk-dim active:bg-chalk/10"
      >
        <Icon d="M6 6l12 12M18 6L6 18" />
      </button>
    </div>
  );
}
