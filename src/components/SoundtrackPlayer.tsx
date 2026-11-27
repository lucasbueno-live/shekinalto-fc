"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SOUNDTRACK, type Track } from "@/lib/soundtrack";

// Tipos mínimos da IFrame Player API do YouTube.
type YTPlayer = {
  playVideo(): void;
  pauseVideo(): void;
  loadVideoById(id: string): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getDuration(): number;
  destroy(): void;
};
type YTNamespace = {
  Player: new (
    el: HTMLElement,
    opts: {
      width: number;
      height: number;
      videoId: string;
      playerVars: Record<string, number | string>;
      events: {
        onReady?: (e: { target: YTPlayer }) => void;
        onStateChange?: (e: { data: number }) => void;
        onError?: (e: { data: number }) => void;
      };
    },
  ) => YTPlayer;
  PlayerState: { ENDED: number; PLAYING: number; PAUSED: number };
};
declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const STORAGE_KEY = "sfc_trilha";
const PLAYER_SIZE = 200; // mínimo exigido pelo YouTube para o player visível

let apiPromise: Promise<YTNamespace> | null = null;
function loadApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  apiPromise ??= new Promise((resolve) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      resolve(window.YT!);
    };
    const s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.async = true;
    document.head.appendChild(s);
  });
  return apiPromise;
}

function shuffle<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function readPref(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}
function writePref(on: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    /* navegação privada: só não lembra a escolha */
  }
}

export function SoundtrackPlayer() {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const orderRef = useRef<Track[]>(SOUNDTRACK);
  const indexRef = useRef(0);
  const failuresRef = useRef(0);

  const [started, setStarted] = useState(false);
  const [open, setOpen] = useState(false);
  const [showVideo, setShowVideo] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [track, setTrack] = useState<Track | null>(null);
  const [broken, setBroken] = useState(false);

  const playIndex = useCallback((i: number) => {
    const order = orderRef.current;
    indexRef.current = ((i % order.length) + order.length) % order.length;
    const t = order[indexRef.current];
    setTrack(t);
    playerRef.current?.loadVideoById(t.id);
  }, []);

  const next = useCallback(() => playIndex(indexRef.current + 1), [playIndex]);

  const start = useCallback(async () => {
    if (playerRef.current || !mountRef.current) return;
    setStarted(true);
    setOpen(true);
    writePref(true);
    orderRef.current = shuffle(SOUNDTRACK);
    indexRef.current = 0;
    const first = orderRef.current[0];
    setTrack(first);
    const YT = await loadApi();
    const host = document.createElement("div");
    mountRef.current.replaceChildren(host);
    playerRef.current = new YT.Player(host, {
      width: PLAYER_SIZE,
      height: PLAYER_SIZE,
      videoId: first.id,
      playerVars: { autoplay: 1, playsinline: 1, rel: 0, controls: 1 },
      events: {
        onReady: (e) => {
          // Só em desenvolvimento: permite testar a troca de faixa pelo console.
          if (process.env.NODE_ENV !== "production") (window as unknown as { __sfcPlayer: YTPlayer }).__sfcPlayer = e.target;
          e.target.playVideo();
        },
        onStateChange: (e) => {
          if (e.data === YT.PlayerState.PLAYING) {
            failuresRef.current = 0;
            setPlaying(true);
          } else if (e.data === YT.PlayerState.PAUSED) {
            setPlaying(false);
          } else if (e.data === YT.PlayerState.ENDED) {
            next();
          }
        },
        // 2, 5, 100, 101, 150: vídeo inválido, removido ou bloqueado para incorporação → pula.
        onError: () => {
          failuresRef.current += 1;
          if (failuresRef.current >= orderRef.current.length) {
            setBroken(true);
            setPlaying(false);
            return;
          }
          next();
        },
      },
    });
  }, [next]);

  // Quem deixou a trilha ligada da última vez: começa no primeiro toque na página
  // (os navegadores não deixam tocar som antes de um toque).
  useEffect(() => {
    if (!readPref()) return;
    const onFirstTouch = () => void start();
    document.addEventListener("pointerdown", onFirstTouch, { once: true });
    return () => document.removeEventListener("pointerdown", onFirstTouch);
  }, [start]);

  useEffect(() => () => playerRef.current?.destroy(), []);

  function togglePlay() {
    const p = playerRef.current;
    if (!p) return void start();
    if (playing) {
      p.pauseVideo();
      writePref(false);
    } else {
      p.playVideo();
      writePref(true);
    }
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 mx-auto max-w-lg px-3 pb-2">
      {/* O player fica sempre montado depois do primeiro toque, para a música não parar ao trocar de tela. */}
      <div
        className={`pointer-events-auto mb-2 ml-auto w-fit overflow-hidden rounded-lg ring-1 ring-chalk/20 transition-transform ${
          showVideo && open ? "" : "absolute -left-[9999px]"
        }`}
        style={{ width: PLAYER_SIZE, height: PLAYER_SIZE }}
        aria-hidden={!(showVideo && open)}
      >
        <div ref={mountRef} />
      </div>

      {open ? (
        <div className="pointer-events-auto flex items-center gap-2 rounded-full bg-turf-950/95 py-1.5 pl-4 pr-1.5 shadow-lg shadow-black/30 ring-1 ring-chalk/15 backdrop-blur">
          <span aria-hidden className={`text-bib ${playing ? "animate-pulse" : ""}`}>
            ♪
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{broken ? "Nenhuma faixa tocou aqui" : (track?.title ?? "Trilha")}</p>
          </div>
          <IconButton label={playing ? "Pausar trilha" : "Tocar trilha"} onClick={togglePlay}>
            {playing ? <path d="M7 5h3v14H7zM14 5h3v14h-3z" fill="currentColor" /> : <path d="M8 5v14l11-7z" fill="currentColor" />}
          </IconButton>
          <IconButton label="Próxima música" onClick={() => (playerRef.current ? next() : start())}>
            <path d="M6 5v14l9-7zM16 5h2v14h-2z" fill="currentColor" />
          </IconButton>
          <IconButton label={showVideo ? "Esconder vídeo" : "Mostrar vídeo"} onClick={() => setShowVideo((v) => !v)} pressed={showVideo}>
            <path d="M4 6h12v12H4zM16 10l4-2v8l-4-2" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
          </IconButton>
          <IconButton label="Recolher trilha" onClick={() => setOpen(false)}>
            <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </IconButton>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => (started ? setOpen(true) : start())}
          className="pointer-events-auto ml-auto flex min-h-11 items-center gap-1.5 rounded-full bg-turf-950/95 px-4 font-display text-lg font-extrabold shadow-lg shadow-black/30 ring-1 ring-chalk/15"
          aria-label={started ? "Abrir trilha" : "Tocar trilha sonora"}
        >
          <span className={`text-bib ${playing ? "animate-pulse" : ""}`}>♪</span>
          {started ? "" : "Trilha"}
        </button>
      )}
    </div>
  );
}

function IconButton({
  label,
  onClick,
  children,
  pressed,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      className={`grid size-10 shrink-0 place-items-center rounded-full ${pressed ? "bg-chalk/15" : ""} active:bg-chalk/15`}
    >
      <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
        {children}
      </svg>
    </button>
  );
}
