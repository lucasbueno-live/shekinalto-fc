import { eq } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { getCurrentPlayer } from "@/lib/auth";

// Entrega a foto da carta. A URL leva ?v=<versão>, então o navegador pode guardar por muito tempo.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await getCurrentPlayer())) return new Response("Entre no app para ver as fotos.", { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("Foto não encontrada.", { status: 404 });
  const db = await getDb();
  const [photo] = await db.select().from(schema.playerPhotos).where(eq(schema.playerPhotos.playerId, id));
  if (!photo) return new Response("Foto não encontrada.", { status: 404 });
  return new Response(Buffer.from(photo.data, "base64"), {
    headers: {
      "Content-Type": photo.mime,
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
