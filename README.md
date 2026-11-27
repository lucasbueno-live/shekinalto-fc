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
- **Fotos:** cada um escolhe a própria foto no Perfil, e o organizador pode trocar a de qualquer um em Organizar → Opções. O celular recorta a foto em quadrado e reduz para 320×320 antes de enviar (dá cerca de 30 KB). A foto fica guardada no próprio banco, na tabela `player_photos`, então não precisa configurar armazenamento extra na Vercel.
- **Trilha** (`src/lib/soundtrack.ts`): toca pelo player oficial do YouTube incorporado. Para trocar uma música, troque o id do vídeo e o título nesse arquivo. O som só começa depois de um toque, por regra dos navegadores. No iPhone, a música para quando a tela bloqueia.
