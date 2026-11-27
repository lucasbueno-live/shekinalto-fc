import { boolean, date, integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import type { GkRole, Position, Ratings } from "@/lib/domain";
import type { DrawResult } from "@/lib/draw";

export type Role = "admin" | "player";
export type MatchStatus = "aberta" | "sorteada" | "encerrada";
export type SignupStatus = "vou" | "nao_vou";

const ts = (name?: string) => (name ? timestamp(name, { withTimezone: true }) : timestamp({ withTimezone: true }));

export const players = pgTable("players", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  nickname: text(),
  photoUrl: text(),
  primaryPosition: text().$type<Position>().notNull(),
  secondaryPositions: jsonb().$type<Position[]>().notNull().default([]),
  gkRole: text().$type<GkRole>().notNull().default("nao"),
  selfRatings: jsonb().$type<Ratings>().notNull().default({}),
  pinHash: text().notNull(),
  role: text().$type<Role>().notNull().default("player"),
  active: boolean().notNull().default(true),
  failedPinAttempts: integer().notNull().default(0),
  lockedUntil: ts(),
  createdAt: ts().notNull().defaultNow(),
});

/**
 * Fotos das cartas, já reduzidas no celular (JPEG quadrado de ~320px, ~20 KB).
 * Ficam numa tabela à parte para a lista de jogadores não carregar as imagens.
 * players.photoUrl aponta para /foto/<id>?v=<versão>.
 */
export const playerPhotos = pgTable("player_photos", {
  playerId: uuid()
    .primaryKey()
    .references(() => players.id, { onDelete: "cascade" }),
  mime: text().notNull(),
  data: text().notNull(), // base64
  updatedAt: ts().notNull().defaultNow(),
});

/** Configurações gerais do app (ex.: invite_code, o código do link de convite). */
export const settings = pgTable("settings", {
  key: text().primaryKey(),
  value: text().notNull(),
  updatedAt: ts().notNull().defaultNow(),
});

/** Celulares que ativaram os avisos (web push). Um jogador pode ter mais de um aparelho. */
export const pushSubscriptions = pgTable("push_subscriptions", {
  endpoint: text().primaryKey(),
  playerId: uuid()
    .notNull()
    .references(() => players.id, { onDelete: "cascade" }),
  p256dh: text().notNull(),
  auth: text().notNull(),
  createdAt: ts().notNull().defaultNow(),
});

/** Votos são privados: só o servidor lê, e só agregados saem para as telas. */
export const votes = pgTable(
  "votes",
  {
    voterId: uuid()
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    targetId: uuid()
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    ratings: jsonb().$type<Ratings>().notNull(),
    updatedAt: ts().notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.voterId, t.targetId] })],
);

export const matches = pgTable("matches", {
  id: uuid().primaryKey().defaultRandom(),
  date: date().notNull(),
  place: text(),
  status: text().$type<MatchStatus>().notNull().default("aberta"),
  createdAt: ts().notNull().defaultNow(),
});

export const signups = pgTable(
  "signups",
  {
    matchId: uuid()
      .notNull()
      .references(() => matches.id, { onDelete: "cascade" }),
    playerId: uuid()
      .notNull()
      .references(() => players.id, { onDelete: "cascade" }),
    status: text().$type<SignupStatus>().notNull(),
    createdAt: ts().notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.matchId, t.playerId] })],
);

export const draws = pgTable("draws", {
  id: uuid().primaryKey().defaultRandom(),
  matchId: uuid()
    .notNull()
    .references(() => matches.id, { onDelete: "cascade" }),
  teamCount: integer().notNull(),
  result: jsonb().$type<DrawResult>().notNull(),
  published: boolean().notNull().default(false),
  createdAt: ts().notNull().defaultNow(),
});
