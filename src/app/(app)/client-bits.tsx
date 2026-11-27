"use client";

import { useState, useTransition } from "react";
import { setSignup } from "@/app/actions";
import { Button } from "@/components/ui";
import { whatsappUrl } from "@/lib/whatsapp";

export function SignupButtons({ matchId, current }: { matchId: string; current: "vou" | "nao_vou" | null }) {
  const [pending, start] = useTransition();
  const [optimistic, setOptimistic] = useState(current);
  const choose = (s: "vou" | "nao_vou") => {
    setOptimistic(s);
    start(() => setSignup(matchId, s));
  };
  return (
    <div className="grid grid-cols-2 gap-3" aria-busy={pending}>
      <Button
        type="button"
        variant={optimistic === "vou" ? "primary" : "ghost"}
        aria-pressed={optimistic === "vou"}
        onClick={() => choose("vou")}
        className="min-h-14 text-2xl"
      >
        Vou
      </Button>
      <Button
        type="button"
        variant="ghost"
        aria-pressed={optimistic === "nao_vou"}
        onClick={() => choose("nao_vou")}
        className={`min-h-14 text-2xl ${optimistic === "nao_vou" ? "bg-chalk/15" : ""}`}
      >
        Não vou
      </Button>
    </div>
  );
}

export function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.open(whatsappUrl(text), "_blank");
    }
  }
  return (
    <span className="flex items-center gap-3 text-sm">
      <button type="button" onClick={copy} className="font-semibold text-bib underline underline-offset-4">
        {copied ? "Copiado" : label}
      </button>
      <a href={whatsappUrl(text)} target="_blank" rel="noreferrer" className="font-semibold text-chalk-dim underline underline-offset-4">
        Abrir no WhatsApp
      </a>
    </span>
  );
}
