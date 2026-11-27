import Link from "next/link";
import { notFound } from "next/navigation";
import { PlayerCard } from "@/components/PlayerCard";
import { Panel } from "@/components/ui";
import { requirePlayer } from "@/lib/auth";
import { attrsFor, GK_ROLE_LABEL, POSITION_LABEL } from "@/lib/domain";
import { displayName, getMyVote, getPlayer } from "@/lib/queries";
import { VoteForm } from "./VoteForm";

export default async function JogadorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requirePlayer();
  const p = await getPlayer(id);
  if (!p) notFound();
  const isMe = p.id === me.id;
  const myVote = isMe ? null : await getMyVote(me.id, p.id);

  const positions = [p.primaryPosition, ...p.secondaryPositions].map((x) => POSITION_LABEL[x]).join(", ");

  return (
    <>
      <Link href="/elenco" className="mb-4 inline-block text-sm text-chalk-dim underline underline-offset-4">
        Voltar ao elenco
      </Link>
      <div className="flex justify-center">
        <PlayerCard id={p.id} name={displayName(p)} photoUrl={p.photoUrl} primaryPosition={p.primaryPosition} gkRole={p.gkRole} card={p.card} size="lg" />
      </div>
      <dl className="mx-auto mt-4 grid max-w-xs grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt className="text-chalk-dim">Nome</dt>
        <dd>{p.name}</dd>
        <dt className="text-chalk-dim">Joga de</dt>
        <dd>{positions}</dd>
        <dt className="text-chalk-dim">No gol</dt>
        <dd>{GK_ROLE_LABEL[p.gkRole]}</dd>
        <dt className="text-chalk-dim">Votos</dt>
        <dd>{p.card.provisional ? `${p.card.voteCount} de 3 para a carta valer` : `${p.card.voteCount} colegas avaliaram`}</dd>
      </dl>

      <div className="mt-8">
        {isMe ? (
          <Panel>
            <p>
              Essa é a sua carta. Você não vota em si mesmo: a nota vem da galera.{" "}
              <Link href="/perfil" className="text-bib underline underline-offset-4">
                Editar posições e autoavaliação
              </Link>
            </p>
          </Panel>
        ) : (
          <Panel>
            <h2 className="font-display text-2xl font-extrabold">{myVote ? "Seu voto" : `Avalie ${displayName(p)}`}</h2>
            <p className="mb-4 mt-1 text-sm text-chalk-dim">Ninguém vê quem deu qual nota. A carta mostra só a média.</p>
            <VoteForm key={p.id} targetId={p.id} attrs={attrsFor(p.gkRole)} initial={myVote} hasVote={!!myVote} />
          </Panel>
        )}
      </div>
    </>
  );
}
