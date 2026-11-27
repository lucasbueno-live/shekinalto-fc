import Link from "next/link";
import { Icon } from "./Icon";
import {
  FIELD_ATTRS,
  GK_ATTRS,
  type GkRole,
  type Position,
} from "@/lib/domain";
import { tierOf, type Card } from "@/lib/rating";

type Props = {
  id: string;
  name: string;
  photoUrl: string | null;
  primaryPosition: Position;
  gkRole: GkRole;
  card: Card;
  size?: "xs" | "sm" | "lg";
  href?: string;
  note?: string;
};

/** Cores de cada faixa vêm dos tokens --color-card-<faixa>-* em globals.css. */
function tierStyle(tier: "bronze" | "prata" | "ouro") {
  const v = (k: string) => `var(--color-card-${tier}-${k})`;
  return {
    bg: `linear-gradient(160deg, ${v("hi")} 0%, ${v("mid")} 55%, ${v("lo")} 100%)`,
    ink: v("ink"),
    edge: v("edge"),
  };
}

function initials(name: string) {
  return (name.match(/\p{L}+/gu) ?? [])
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export function PlayerCard({
  id,
  name,
  photoUrl,
  primaryPosition,
  gkRole,
  card,
  size = "sm",
  href,
  note,
}: Props) {
  const tier = tierOf(card.overall);
  const s = tierStyle(tier);
  const attrs = card.kind === "gk" ? GK_ATTRS : FIELD_ATTRS;
  const lg = size === "lg";
  const xs = size === "xs";
  const pick = (x: string, sm: string, l: string) => (xs ? x : lg ? l : sm);
  const pos = card.kind === "gk" ? "GOL" : primaryPosition;

  const body = (
    <div
      className={`relative isolate overflow-hidden ${pick("w-full p-2", "w-full p-3", "w-[17.5rem] p-5")} aspect-[5/7] [clip-path:polygon(12%_0,88%_0,100%_7%,100%_86%,50%_100%,0_86%,0_7%)]`}
      style={{ background: s.bg, color: s.ink }}
    >
      {/* textura de linhas de campo */}
      <svg
        aria-hidden
        className="absolute inset-0 -z-10 h-full w-full opacity-[0.16]"
        viewBox="0 0 100 140"
        preserveAspectRatio="none"
      >
        <circle
          cx="50"
          cy="64"
          r="22"
          fill="none"
          stroke={s.edge}
          strokeWidth="1.2"
        />
        <line
          x1="0"
          y1="64"
          x2="100"
          y2="64"
          stroke={s.edge}
          strokeWidth="1.2"
        />
        <rect
          x="26"
          y="0"
          width="48"
          height="16"
          fill="none"
          stroke={s.edge}
          strokeWidth="1.2"
        />
      </svg>

      <div className="flex items-start justify-between">
        <div className="leading-none">
          <div
            className={`font-display font-black tabular-nums ${pick("text-2xl", "text-4xl", "text-6xl")}`}
          >
            {card.overall}
          </div>
          <div
            className={`font-display font-extrabold ${pick("text-sm", "text-lg", "text-2xl")}`}
          >
            {pos}
          </div>
          {!xs && gkRole === "quebra_galho" && card.gkOverall !== null && (
            <div
              className={`mt-1 flex items-center gap-1 font-semibold ${lg ? "text-sm" : "text-[11px]"}`}
            >
              <Icon
                name="glove"
                className={lg ? "size-4" : "size-3.5"}
                label="Nota no gol"
              />{" "}
              {card.gkOverall}
            </div>
          )}
        </div>
        <div
          className={`grid place-items-center overflow-hidden rounded-full font-display font-extrabold ${pick("size-9 text-sm", "size-14 text-xl", "size-28 text-4xl")}`}
          style={{
            background:
              "color-mix(in oklch, var(--color-chalk) 28%, transparent)",
            boxShadow: `inset 0 0 0 2px ${s.edge}`,
          }}
        >
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            initials(name)
          )}
        </div>
      </div>

      <div
        className={`mt-2 truncate border-b pb-1 text-center font-display font-extrabold ${pick("text-xs", "text-lg", "text-3xl")}`}
        style={{ borderColor: `${s.ink}40` }}
      >
        {name}
      </div>

      {!xs && (
        <dl
          className={`mt-2 grid grid-cols-2 gap-x-3 ${lg ? "gap-y-1.5 px-2 text-lg" : "gap-y-0.5 text-[13px]"}`}
        >
          {attrs.map((a) => (
            <div key={a} className="flex items-baseline justify-between gap-1">
              <dt className="font-semibold opacity-80">{a}</dt>
              <dd className="font-display font-black tabular-nums">
                {card.attrs[a] ?? "–"}
              </dd>
            </div>
          ))}
        </dl>
      )}

      {!xs && card.provisional && (
        <div
          className={`absolute inset-x-0 text-center font-semibold ${lg ? "bottom-7 text-xs" : "bottom-4 text-[10px]"}`}
        >
          {lg ? `Carta provisória: ${card.voteCount} de 3 votos` : `Provisória, ${card.voteCount} de 3`}
        </div>
      )}
    </div>
  );

  return (
    <figure className="flex flex-col items-center gap-1">
      {href ? (
        <Link
          href={href}
          className="block w-full rounded-lg"
          aria-label={`Carta de ${name}, nota ${card.overall}`}
          data-player={id}
        >
          {body}
        </Link>
      ) : (
        body
      )}
      {note && (
        <figcaption className="text-xs text-chalk-dim">{note}</figcaption>
      )}
    </figure>
  );
}
