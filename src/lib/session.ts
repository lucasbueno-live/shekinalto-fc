import "server-only";
import { createHash } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { databaseUrl } from "@/db";

export const SESSION_COOKIE = "sfc_session";
const MAX_AGE = 60 * 60 * 24 * 180; // 180 dias: ninguém quer digitar PIN toda semana

/**
 * SESSION_SECRET é opcional. Sem ela, a chave é derivada da URL do banco (que já é secreta),
 * para o deploy não exigir configurar variável à mão.
 */
function secret() {
  const raw =
    process.env.SESSION_SECRET ??
    (databaseUrl() ? createHash("sha256").update(`${databaseUrl()}:suico-fc-session`).digest("hex") : "suico-fc-dev-local");
  return new TextEncoder().encode(raw);
}

export async function createSession(playerId: string) {
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(playerId)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(secret());
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function readSessionPlayerId(): Promise<string | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload.sub ?? null;
  } catch {
    return null;
  }
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}
