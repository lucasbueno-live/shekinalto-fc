import { timingSafeEqual } from "node:crypto";
import { sendDueReminders } from "@/lib/reminders";

/**
 * Chamado a cada 10 minutos pelo GitHub Actions (.github/workflows/lembretes.yml).
 * Exige o cabeçalho Authorization: Bearer <CRON_SECRET>.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({ error: "CRON_SECRET não configurado." }, { status: 503 });

  const got = Buffer.from(req.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  if (got.length !== want.length || !timingSafeEqual(got, want)) {
    return Response.json({ error: "Não autorizado." }, { status: 401 });
  }

  const run = await sendDueReminders();
  return Response.json(run, { headers: { "Cache-Control": "no-store" } });
}
