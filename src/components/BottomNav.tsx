"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Jogo", icon: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 4 3.5 2.6-1.3 4.1H9.8L8.5 8.6Z" },
  { href: "/elenco", label: "Elenco", icon: "M6 3h12l2 3v12l-8 4-8-4V6Z" },
  { href: "/votar", label: "Votar", icon: "M4 13l5 5L20 7" },
  { href: "/perfil", label: "Perfil", icon: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-8 9a8 8 0 0 1 16 0" },
];

export function BottomNav({ isAdmin, pendingVotes }: { isAdmin: boolean; pendingVotes: number }) {
  const path = usePathname();
  const items = isAdmin
    ? [...ITEMS, { href: "/admin", label: "Organizar", icon: "M4 6h16M4 12h16M4 18h10" }]
    : ITEMS;

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-chalk/10 bg-turf-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
    >
      <ul className="mx-auto flex max-w-lg">
        {items.map((it) => {
          const active = it.href === "/" ? path === "/" || path.startsWith("/jogo") : path.startsWith(it.href) || (it.href === "/elenco" && path.startsWith("/jogador"));
          return (
            <li key={it.href} className="flex-1">
              <Link
                href={it.href}
                aria-current={active ? "page" : undefined}
                className={`relative flex min-h-16 flex-col items-center justify-center gap-0.5 text-xs font-semibold ${active ? "text-bib" : "text-chalk-dim"}`}
              >
                <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d={it.icon} />
                </svg>
                {it.label}
                {it.href === "/votar" && pendingVotes > 0 && (
                  <span className="absolute right-[calc(50%-1.6rem)] top-2 grid min-w-5 place-items-center rounded-full bg-bib px-1 text-[11px] font-bold text-turf-950">
                    {pendingVotes}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
        <li id="trilha-slot" className="w-14 shrink-0" />
      </ul>
    </nav>
  );
}
