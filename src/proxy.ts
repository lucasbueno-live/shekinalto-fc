import { NextResponse, type NextRequest } from "next/server";

// Checagem otimista: sem cookie de sessão, manda para a tela de entrada.
// A verificação de verdade acontece no servidor (requirePlayer).
export function proxy(request: NextRequest) {
  if (!request.cookies.has("sfc_session")) {
    return NextResponse.redirect(new URL("/entrar", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!entrar|convite|api/lembretes|_next|sw\\.js|manifest.webmanifest|icon|apple-icon|favicon.ico|.*\\.(?:png|svg|ico|webp|jpg)$).*)"],
};
