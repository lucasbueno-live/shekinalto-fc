// Peças pequenas de interface, compartilhadas entre as telas.
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Icon } from "./Icon";

export const inputCls =
  "w-full rounded-md border border-turf-600 bg-turf-950/70 px-3 py-3 text-base text-chalk placeholder:text-chalk-dim/60 focus:border-bib";

export function Button({
  variant = "primary",
  className = "",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "danger" }) {
  const v =
    variant === "primary"
      ? "bg-bib text-turf-950 active:bg-bib-deep disabled:bg-turf-700 disabled:text-chalk-dim"
      : variant === "danger"
        ? "border border-danger/60 text-danger active:bg-danger/10 disabled:border-chalk/15 disabled:text-chalk-dim"
        : "border border-chalk/25 text-chalk active:bg-chalk/10 disabled:border-chalk/15 disabled:text-chalk-dim";
  return (
    <button
      {...rest}
      className={`min-h-12 rounded-md px-4 font-display text-lg font-extrabold transition-colors disabled:cursor-not-allowed ${v} ${className}`}
    />
  );
}

export function PageTitle({ children, sub }: { children: ReactNode; sub?: ReactNode }) {
  return (
    <header className="mb-5">
      <h1 className="font-display text-4xl font-black leading-none">{children}</h1>
      {sub && <p className="mt-1.5 text-chalk-dim">{sub}</p>}
    </header>
  );
}

export function Section({ title, children, aside }: { title: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <section className="mb-7">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <h2 className="font-display text-2xl font-extrabold">{title}</h2>
        {aside}
      </div>
      {children}
    </section>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-lg bg-turf-950/55 p-4 ring-1 ring-chalk/10 ${className}`}>{children}</div>;
}

export function FormMessage({ state }: { state?: { error?: string; ok?: string } }) {
  if (!state) return null;
  if (state.error)
    return (
      <p role="alert" className="text-sm font-medium text-danger">
        {state.error}
      </p>
    );
  if (state.ok)
    return (
      <p role="status" className="flex items-center gap-1.5 text-sm font-medium text-chalk">
        <Icon name="check" className="size-4 text-bib" />
        {state.ok}
      </p>
    );
  return null;
}

export function formatMatchDate(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  return d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
}

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
