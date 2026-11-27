import { logout } from "@/app/actions";
import { PhotoPicker } from "@/components/PhotoPicker";
import { PlayerCard } from "@/components/PlayerCard";
import { Button, PageTitle, Panel, Section } from "@/components/ui";
import { requirePlayer } from "@/lib/auth";
import { displayName, getPlayer } from "@/lib/queries";
import { PinForm, ProfileForm } from "./forms";

export default async function PerfilPage({ searchParams }: { searchParams: Promise<{ novo?: string }> }) {
  const { novo } = await searchParams;
  const me = await requirePlayer();
  const view = (await getPlayer(me.id))!;

  return (
    <>
      <PageTitle sub="Suas posições e sua autoavaliação.">Perfil</PageTitle>
      {novo && (
        <Panel className="mb-6 ring-bib/60">
          <p className="font-display text-2xl font-black">Boas-vindas ao elenco!</p>
          <p className="mt-1 text-chalk-dim">
            Coloque sua foto e faça sua autoavaliação aqui embaixo. Ela vale até 3 colegas votarem em você. Depois passe em Votar para avaliar a galera.
          </p>
        </Panel>
      )}
      <div className="mb-7 flex justify-center">
        <div className="w-44">
          <PlayerCard id={view.id} name={displayName(view)} photoUrl={view.photoUrl} primaryPosition={view.primaryPosition} gkRole={view.gkRole} card={view.card} />
        </div>
      </div>

      <Section title="Foto da carta">
        <Panel>
          <PhotoPicker playerId={me.id} photoUrl={view.photoUrl} name={displayName(view)} />
        </Panel>
      </Section>

      <Section title="Como você joga">
        <Panel>
          <ProfileForm
            nickname={me.nickname ?? ""}
            primary={me.primaryPosition}
            secondary={me.secondaryPositions}
            gkRole={me.gkRole}
            selfRatings={me.selfRatings}
            provisional={view.card.provisional}
          />
        </Panel>
      </Section>

      <Section title="Trocar PIN">
        <Panel>
          <PinForm />
        </Panel>
      </Section>

      <form action={logout}>
        <Button variant="ghost" className="w-full">
          Sair deste celular
        </Button>
      </form>
    </>
  );
}
