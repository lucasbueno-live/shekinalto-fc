import "server-only";
import { and, eq, isNotNull, isNull, ne } from "drizzle-orm";
import { getDb, schema } from "@/db";
import { notify } from "./push";
import { getPublishedDraw, listSignups } from "./queries";
import { formatTime, reminderDue } from "./schedule";

export type ReminderRun = { checked: number; reminded: { matchId: string; sent: number }[] };

/**
 * Manda o lembrete de 1 hora antes para quem confirmou presença.
 * Pode ser chamado quantas vezes quiser: cada jogo recebe o lembrete uma vez só.
 */
export async function sendDueReminders(now = new Date()): Promise<ReminderRun> {
  const db = await getDb();
  const open = await db
    .select()
    .from(schema.matches)
    .where(and(ne(schema.matches.status, "encerrada"), isNotNull(schema.matches.time), isNull(schema.matches.reminderSentAt)));

  const reminded: ReminderRun["reminded"] = [];
  for (const m of open) {
    if (!m.time || !reminderDue(m.date, m.time, now)) continue;

    // Marca antes de enviar: se duas chamadas chegarem juntas, só uma pega o jogo.
    const claimed = await db
      .update(schema.matches)
      .set({ reminderSentAt: now })
      .where(and(eq(schema.matches.id, m.id), isNull(schema.matches.reminderSentAt)))
      .returning({ id: schema.matches.id });
    if (claimed.length === 0) continue;

    const going = new Set((await listSignups(m.id)).filter((s) => s.status === "vou").map((s) => s.playerId));
    const draw = await getPublishedDraw(m.id);
    const teamOf = new Map<string, string>();
    for (const t of draw?.teams ?? []) for (const p of t.players) teamOf.set(p.id, t.name);

    const { sent } = await notify((playerId) => {
      if (!going.has(playerId)) return null;
      const team = teamOf.get(playerId);
      return {
        title: `Tem jogo hoje às ${formatTime(m.time)}`,
        body: [m.place, team ? `Você está no ${team}.` : "Os times ainda não saíram."].filter(Boolean).join(". ").replace("..", "."),
        url: "/",
        tag: `lembrete-${m.id}`,
      };
    });
    reminded.push({ matchId: m.id, sent });
  }
  return { checked: open.length, reminded };
}
