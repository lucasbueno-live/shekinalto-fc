import { fmt1, type DrawResult } from "./draw";

const GK_NOTE = { fixo: "", improvisado: " (improvisado)", rodizio: "" } as const;

export function teamsText(result: DrawResult, dateLabel: string, positions: Record<string, string>) {
  const lines = [`⚽ *Times de ${dateLabel}*`, ""];
  for (const t of result.teams) {
    const byId = new Map(t.players.map((p) => [p.id, p]));
    lines.push(`*${t.name}* (força ${fmt1(t.strength)})`);
    if (t.goalkeeperId) lines.push(`🧤 ${byId.get(t.goalkeeperId)?.name}${GK_NOTE[t.gkStatus]}`);
    else lines.push("🧤 rodízio no gol");
    for (const id of t.starters) {
      if (id === t.goalkeeperId) continue;
      const p = byId.get(id)!;
      lines.push(`• ${p.name} (${positions[id] ?? p.primaryPosition})`);
    }
    if (t.reserves.length) lines.push(`Reservas: ${t.reserves.map((id) => byId.get(id)?.name).join(", ")}`);
    lines.push("");
  }
  lines.push(`Diferença de força: ${fmt1(result.spread)} ponto${fmt1(result.spread) === "1,0" ? "" : "s"}`);
  return lines.join("\n");
}

/** Texto da lista do jogo para o WhatsApp, com os confirmados em ordem. */
export function inviteText(when: string, place: string | null, url: string, confirmed: string[] = []) {
  const lines = [`⚽ Lista do jogo de ${when}${place ? `, ${place}` : ""}.`, ""];
  if (confirmed.length) {
    lines.push(`Confirmados (${confirmed.length}):`);
    confirmed.forEach((name, i) => lines.push(`${i + 1}. ${name}`));
  } else {
    lines.push("Ninguém confirmou ainda.");
  }
  lines.push("", `Confirma no app se você vai: ${url}`);
  return lines.join("\n");
}

export function inviteJoinText(url: string) {
  return `⚽ Bora entrar no elenco do Shekinalto FC! Crie seu jogador por este link (é só nosso, não repassa): ${url}

Depois, no app, vá em Perfil → Colocar o app na tela inicial para ter o ícone no celular.`;
}

export const whatsappUrl = (text: string) => `https://wa.me/?text=${encodeURIComponent(text)}`;
