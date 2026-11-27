import { describe, expect, it } from "vitest";
import { formatMatchWhen, formatTime, isValidTime, matchStart, nextWeekdayISO, reminderDue } from "../src/lib/schedule";

describe("horário do jogo", () => {
  it("valida HH:MM", () => {
    expect(isValidTime("20:00")).toBe(true);
    expect(isValidTime("7:00")).toBe(false);
    expect(isValidTime("24:00")).toBe(false);
  });

  it("início no horário de Brasília", () => {
    // 20h em Brasília = 23h UTC
    expect(matchStart("2026-12-02", "20:00").toISOString()).toBe("2026-12-02T23:00:00.000Z");
  });

  it("lembrete vence só na última hora antes do jogo", () => {
    const at = (iso: string) => new Date(iso);
    expect(reminderDue("2026-12-02", "20:00", at("2026-12-02T21:59:00Z"))).toBe(false); // 1h01 antes
    expect(reminderDue("2026-12-02", "20:00", at("2026-12-02T22:00:00Z"))).toBe(true); // 1h antes
    expect(reminderDue("2026-12-02", "20:00", at("2026-12-02T22:50:00Z"))).toBe(true); // 10 min antes
    expect(reminderDue("2026-12-02", "20:00", at("2026-12-02T23:00:00Z"))).toBe(false); // já começou
  });

  it("formata horário e data", () => {
    expect(formatTime("20:00")).toBe("20h");
    expect(formatTime("19:30")).toBe("19h30");
    expect(formatMatchWhen("2026-12-02", "20:00")).toBe("quarta-feira, 2 de dezembro, às 20h");
    expect(formatMatchWhen("2026-12-02")).toBe("quarta-feira, 2 de dezembro");
  });

  it("próxima quarta-feira", () => {
    // 27/11/2026 é sexta → próxima quarta é 02/12
    expect(nextWeekdayISO(3, new Date("2026-11-27T15:00:00Z"))).toBe("2026-12-02");
    // numa quarta, é o próprio dia
    expect(nextWeekdayISO(3, new Date("2026-12-02T15:00:00Z"))).toBe("2026-12-02");
  });
});
