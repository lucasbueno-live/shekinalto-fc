// Horário dos jogos. Tudo no horário de Brasília (UTC-3, sem horário de verão desde 2019).

export const BR_OFFSET = "-03:00";
export const REMINDER_MINUTES = 60;

export function isValidTime(t: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(t);
}

/** Momento exato do início do jogo. */
export function matchStart(date: string, time: string): Date {
  return new Date(`${date}T${time}:00${BR_OFFSET}`);
}

/** O lembrete vence entre 1 hora antes e o início do jogo. Fora disso, não manda (atrasado demais não serve). */
export function reminderDue(date: string, time: string, now: Date): boolean {
  const start = matchStart(date, time).getTime();
  const t = now.getTime();
  return t >= start - REMINDER_MINUTES * 60_000 && t < start;
}

/** "20:00" → "20h"; "19:30" → "19h30". */
export function formatTime(time: string | null | undefined): string {
  if (!time) return "";
  const [h, m] = time.split(":");
  return `${Number(h)}h${m === "00" ? "" : m}`;
}

/** "quarta-feira, 3 de dezembro" (+ ", às 20h" quando houver horário). */
export function formatMatchWhen(date: string, time?: string | null): string {
  const d = new Date(`${date}T12:00:00${BR_OFFSET}`);
  const day = d.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Sao_Paulo" });
  return time ? `${day}, às ${formatTime(time)}` : day;
}

/** Próxima data (a partir de hoje) que cai no dia da semana pedido (0 = domingo … 3 = quarta). */
export function nextWeekdayISO(weekday: number, from = new Date()): string {
  const local = new Date(from.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  local.setDate(local.getDate() + ((weekday - local.getDay() + 7) % 7));
  const y = local.getFullYear();
  const m = String(local.getMonth() + 1).padStart(2, "0");
  const d = String(local.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Versão curta para notificações: "quarta, 2/12 às 20h". */
export function shortWhen(date: string, time?: string | null): string {
  const d = new Date(`${date}T12:00:00${BR_OFFSET}`);
  const weekday = d.toLocaleDateString("pt-BR", { weekday: "long", timeZone: "America/Sao_Paulo" }).replace("-feira", "");
  const [, m, day] = date.split("-").map(Number);
  const dm = `${day}/${m}`;
  return `${weekday}, ${dm}${time ? ` às ${formatTime(time)}` : ""}`;
}

/** Dias de calendário (Brasília) entre hoje e a data do jogo: 0 = hoje, 1 = amanhã. */
export function daysUntil(date: string, now = new Date()): number {
  const today = new Date(now.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const t = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());
  const [y, m, d] = date.split("-").map(Number);
  return Math.round((Date.UTC(y, m - 1, d) - t) / 86_400_000);
}

export function countdownLabel(date: string, now = new Date()): string {
  const n = daysUntil(date, now);
  if (n < 0) return "Já passou";
  if (n === 0) return "É hoje";
  if (n === 1) return "É amanhã";
  return `Faltam ${n} dias`;
}
