import { BottomNav } from "@/components/BottomNav";
import { SoundtrackPlayer } from "@/components/SoundtrackPlayer";
import { requirePlayer } from "@/lib/auth";
import { listPlayers, votedTargetIds } from "@/lib/queries";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const me = await requirePlayer();
  const [players, voted] = await Promise.all([listPlayers(), votedTargetIds(me.id)]);
  const pending = players.filter((p) => p.id !== me.id && !voted.has(p.id)).length;

  return (
    <>
      <main className="mx-auto max-w-lg px-4 pb-44 pt-[max(1.5rem,env(safe-area-inset-top))]">{children}</main>
      <SoundtrackPlayer />
      <BottomNav isAdmin={me.role === "admin"} pendingVotes={pending} />
    </>
  );
}
