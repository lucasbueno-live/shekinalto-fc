import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentPlayer } from "@/lib/auth";
import { isValidInvite } from "@/lib/invite";
import { JoinForm } from "./JoinForm";

export default async function ConvitePage({ params }: { params: Promise<{ code: string }> }) {
  if (await getCurrentPlayer()) redirect("/");
  const { code } = await params;
  const valid = await isValidInvite(code);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-4 pb-10 pt-[max(2.5rem,env(safe-area-inset-top))]">
      <div className="mb-6">
        <p className="font-display text-xl font-extrabold text-bib">Shekinalto FC</p>
        <h1 className="mt-1 font-display text-5xl font-black leading-[0.95]">{valid ? "Entre para o elenco" : "Convite vencido"}</h1>
      </div>
      {valid ? (
        <>
          <p className="mb-6 text-chalk-dim">
            Crie seu jogador. Depois você coloca sua foto, faz sua autoavaliação e vota nos colegas.{" "}
            <Link href="/entrar" className="text-bib underline underline-offset-4">
              Já tenho cadastro
            </Link>
          </p>
          <JoinForm code={code} />
        </>
      ) : (
        <p className="text-chalk-dim">
          Esse link não funciona mais. Peça o link novo ao organizador ou{" "}
          <Link href="/entrar" className="text-bib underline underline-offset-4">
            entre com seu nome e PIN
          </Link>
          .
        </p>
      )}
    </main>
  );
}
