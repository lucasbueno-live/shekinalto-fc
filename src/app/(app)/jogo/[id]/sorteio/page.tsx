import Link from "next/link";
import { notFound } from "next/navigation";
import { PageTitle } from "@/components/ui";
import { formatMatchWhen } from "@/lib/schedule";
import { requireAdmin } from "@/lib/auth";
import { getMatch, listPlayers, listSignups, toDrawPlayer } from "@/lib/queries";
import { SorteioBoard } from "./SorteioBoard";

export default async function SorteioPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const match = await getMatch(id);
  if (!match) notFound();
  const [signups, players] = await Promise.all([listSignups(id), listPlayers()]);
  const byId = new Map(players.map((p) => [p.id, p]));
  const confirmed = signups.filter((s) => s.status === "vou" && byId.has(s.playerId)).map((s) => toDrawPlayer(byId.get(s.playerId)!));
  const dateLabel = formatMatchWhen(match.date, match.time);

  return (
    <>
      <Link href="/" className="mb-4 inline-block text-sm text-chalk-dim underline underline-offset-4">
        Voltar ao jogo
      </Link>
      <PageTitle sub={`${confirmed.length} confirmados para ${dateLabel}`}>Sorteio</PageTitle>
      {confirmed.length < 4 ? (
        <p className="text-chalk-dim">Precisa de pelo menos 4 confirmados para sortear.</p>
      ) : (
        <SorteioBoard
          matchId={id}
          players={confirmed}
          dateLabel={dateLabel}
          positions={Object.fromEntries(confirmed.map((p) => [p.id, p.primaryPosition]))}
        />
      )}
    </>
  );
}
