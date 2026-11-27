"use client";

import { useId, useState, useTransition } from "react";
import { removePhoto, savePhoto, type FormState } from "@/app/actions";
import { Button, FormMessage } from "./ui";

const SIZE = 320;

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("imagem inválida"));
    };
    img.src = url;
  });
}

/**
 * Recorta em quadrado e reduz para 320x320 JPEG no próprio celular.
 * `focus` vai de 0 (topo) a 1 (base) e escolhe a faixa da foto que vira o quadrado.
 */
function crop(img: HTMLImageElement, focus: number): string {
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  const side = Math.min(w, h);
  const sx = (w - side) / 2;
  const sy = (h - side) * focus;
  const canvas = document.createElement("canvas");
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, side, side, 0, 0, SIZE, SIZE);
  return canvas.toDataURL("image/jpeg", 0.85);
}

export function PhotoPicker({ playerId, photoUrl, name }: { playerId: string; photoUrl: string | null; name: string }) {
  const inputId = useId();
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [focus, setFocus] = useState(0.25);
  const [preview, setPreview] = useState<string | null>(null);
  const [state, setState] = useState<FormState>();
  const [pending, start] = useTransition();

  async function onFile(file: File | undefined) {
    setState(undefined);
    if (!file) return;
    try {
      const loaded = await loadImage(file);
      const f = loaded.naturalHeight > loaded.naturalWidth ? 0.25 : 0.5;
      setImg(loaded);
      setFocus(f);
      setPreview(crop(loaded, f));
    } catch {
      setState({ error: "Não deu para abrir essa imagem. Tente uma foto JPG ou PNG." });
    }
  }

  function save() {
    if (!preview) return;
    start(async () => {
      const res = await savePhoto(playerId, preview);
      setState(res);
      if (res?.ok) {
        setImg(null);
        setPreview(null);
      }
    });
  }

  function remove() {
    if (!confirm(`Tirar a foto de ${name}? A carta volta a mostrar as iniciais.`)) return;
    start(async () => setState(await removePhoto(playerId)));
  }

  const shown = preview ?? photoUrl;
  const canAdjust = img && img.naturalHeight !== img.naturalWidth;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4">
        <div className="grid size-24 shrink-0 place-items-center overflow-hidden rounded-full bg-turf-950 ring-2 ring-chalk/30">
          {shown ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shown} alt={preview ? "Prévia da nova foto" : `Foto de ${name}`} className="h-full w-full object-cover" />
          ) : (
            <span className="px-2 text-center text-xs text-chalk-dim">sem foto</span>
          )}
        </div>
        <div className="flex flex-col gap-2">
          <label
            htmlFor={inputId}
            className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-chalk/25 px-4 font-display text-lg font-extrabold active:bg-chalk/10"
          >
            {photoUrl || preview ? "Trocar foto" : "Escolher foto"}
          </label>
          <input
            id={inputId}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              void onFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          {photoUrl && !preview && (
            <button type="button" onClick={remove} disabled={pending} className="w-fit text-sm font-semibold text-chalk-dim underline underline-offset-4">
              Tirar foto
            </button>
          )}
        </div>
      </div>

      {preview && (
        <>
          {canAdjust && (
            <label className="flex flex-col gap-1">
              <span className="text-sm font-semibold">Ajustar enquadramento</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={focus}
                onChange={(e) => {
                  const f = Number(e.target.value);
                  setFocus(f);
                  setPreview(crop(img!, f));
                }}
                className="h-8 w-full"
              />
            </label>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setImg(null);
                setPreview(null);
              }}
            >
              Cancelar
            </Button>
            <Button type="button" onClick={save} disabled={pending}>
              {pending ? "Salvando…" : "Salvar foto"}
            </Button>
          </div>
        </>
      )}
      <FormMessage state={state} />
    </div>
  );
}
