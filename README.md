# Shekinalto FC

App da nossa pelada: cada um vira uma carta de jogador, a galera vota as notas de forma anônima, confirma presença na lista da semana e o app sorteia times equilibrados (2, 3 ou 4 times), com trilha sonora tocando enquanto o app está aberto.

## Rodar no computador

```powershell
npm install
npm run seed   # cria o banco local (.pglite) com 21 jogadores fictícios
npm run dev
```

Abra http://localhost:3000. No banco local de teste, o organizador é **Organizador (teste)** e os PINs estão no topo de `scripts/seed.ts`.

Sem `DATABASE_URL`, o app usa um Postgres embutido (PGlite) na pasta `.pglite`. Não precisa instalar nada. Rode o `seed` com o servidor parado.

```powershell
npm test       # testes do cálculo das notas e do sorteio
```

## Subir na Vercel

1. Suba a pasta para um repositório no GitHub.
2. Na Vercel: **Add New → Project** e importe o repositório. Não precisa mexer em nada.
3. No projeto da Vercel, abra **Storage → Create Database → Neon (Postgres)** e conecte ao projeto. Isso já cria a variável `DATABASE_URL`.
4. Em **Deployments**, faça **Redeploy**. O build cria as tabelas sozinho.
5. Abra o link. Como o banco está vazio, a primeira tela pede para criar o organizador. Faça isso logo, antes de mandar o link para o grupo.

Variável opcional: `SESSION_SECRET` (qualquer texto longo). Sem ela, a chave das sessões é derivada da URL do banco.

## Como as coisas funcionam

- **Notas:** cada atributo vai de 1 a 10 no voto e vira de 40 a 99 na carta. A partir de 5 votos, o maior e o menor são descartados. Com menos de 3 votos, a carta usa a autoavaliação e aparece como "provisória". A nota geral pondera os atributos pela posição principal (`src/lib/rating.ts`).
- **Anonimato:** os votos só são lidos no servidor. As telas recebem apenas a média. Cada um vê só o próprio voto, para poder editar.
- **Sorteio** (`src/lib/draw.ts`): distribui os goleiros fixos um por time; se faltar, usa quem "fica no gol se precisar" e, se não tiver ninguém, avisa "rodízio no gol". Divide todos os confirmados (reservas incluídos) em times de tamanho parecido e busca a divisão com menor diferença de força e boa cobertura de defesa, meio e ataque. Entre as melhores opções, sorteia uma, para os times não se repetirem toda semana. O organizador pode trocar dois jogadores na mão antes de publicar.
- **Convite:** em Organizar fica o link de convite do grupo. Quem abre cria o próprio jogador (nome, posição e PIN) e cai no perfil para pôr foto e autoavaliação. Se o link vazar, "Gerar link novo" invalida o antigo.
- **Avisos (web push):** cada um ativa em Perfil → Avisos de jogo (ou no aviso da tela inicial). Quando o organizador marca um jogo, os celulares inscritos recebem uma notificação que abre a lista; quando publica os times, cada sorteado recebe o próprio time (ex.: "Você está no Time B, no gol"), e um novo sorteio substitui o aviso anterior. No iPhone só funciona com o app instalado na tela inicial (iOS 16.4+). As chaves VAPID são geradas e guardadas na tabela `settings`; o service worker é `public/sw.js`.
- **Horário e lembrete:** o jogo tem data, horário (de Brasília) e local, que dá para corrigir sem perder a lista. Uma hora antes, quem confirmou recebe um lembrete com o time. Como o plano gratuito da Vercel só agenda uma vez por dia, quem chama a rota `/api/lembretes` a cada 10 minutos é o GitHub Actions (`.github/workflows/lembretes.yml`), com a senha `CRON_SECRET` igual na Vercel e nos secrets do repositório. Cada jogo recebe o lembrete uma vez só.
- **Fotos:** cada um escolhe a própria foto no Perfil, e o organizador pode trocar a de qualquer um em Organizar → Opções. O celular recorta a foto em quadrado e reduz para 320×320 antes de enviar (dá cerca de 30 KB). A foto fica guardada no próprio banco, na tabela `player_photos`, então não precisa configurar armazenamento extra na Vercel.
- **Trilha** (`src/lib/soundtrack.ts`): toca pelo player oficial do YouTube incorporado. Para trocar uma música, troque o id do vídeo e o título nesse arquivo. O som só começa depois de um toque, por regra dos navegadores. No iPhone, a música para quando a tela bloqueia.

## Quer contribuir?

PRs são bem-vindos. O caminho:

1. Faça um fork, clone e rode `npm install`.
2. `npm run seed` cria um banco local de teste (`.pglite`) com 21 jogadores fictícios. Não precisa de conta em nada, nem de `.env`. Rode com o servidor parado.
3. `npm run dev` e abra http://localhost:3000. Os PINs de teste estão no topo de `scripts/seed.ts`.
4. Antes do PR: `npm test`, `npx tsc --noEmit` e `npm run lint`.
5. Abra o PR contra a branch `master` explicando o que muda e como testou. Se mexer em tela, mande um print no tamanho de celular, que é onde a galera usa.

Mapa rápido do código:

- `src/lib/rating.ts`: cálculo das notas da carta (tem testes em `tests/rating.test.ts`).
- `src/lib/draw.ts`: sorteio dos times (tem testes em `tests/draw.test.ts`). Mudou o algoritmo, atualize os testes.
- `src/app/actions.ts`: todas as ações do servidor (login, voto, presença, sorteio, convite, avisos).
- `src/db/schema.ts`: tabelas. Mudou o schema, rode `npm run db:generate` e inclua a migration gerada em `drizzle/`.
- `src/lib/soundtrack.ts`: a trilha sonora.

Duas regras que não mudam: os votos são anônimos (nenhuma tela ou rota pode mostrar quem deu qual nota) e o app precisa funcionar bem no celular.
