## Objetivo

1. Dar controle visual da janela lateral com **3 botões**: **Expandir**, **Encurtar** e **Ocultar**, para o usuário ver melhor as artes e nomes das ROMs.
2. Integrar bibliotecas que melhoram **performance, imagens, áudio e resolução** do launcher.

---

## Parte 1 — Botões da janela (expandir / encurtar / ocultar)

### Estado atual
`src/routes/index.tsx` já tem `sidebarMode: "normal" | "expanded" | "hidden"`. Falta um modo **compacto** e a tríade padronizada de botões.

### Mudanças
- Novo tipo `SidebarMode = "expanded" | "normal" | "compact" | "hidden"`.
- Modo `compact` = sidebar de ~120px (só thumb + ★), libera o fundo.
- Header da sidebar com 3 botões fixos:
  - ⛶ Expandir (tela cheia em grade)
  - ⊟ Encurtar / Restaurar (alterna `normal` ↔ `compact`)
  - ✕ Ocultar (mostra botão flutuante ▶ JOGOS pra reabrir)
- `useSpring` anima também a `width` (240 / 120 px) além de opacity/transform.
- Persistir escolha em `localStorage` (`mame.sidebarMode`).
- Atalhos opcionais: `[` encurtar, `]` expandir, `\` ocultar (sem conflitar com a busca).
- Corrigir bug existente: prop inválida `style2={...}` é silenciosamente ignorada pelo React — perde `boxShadow`/`width`. Mesclar dentro do `style`.

---

## Parte 2 — Bibliotecas de performance, imagens, áudio e resolução

Algumas já estão instaladas mas **não usadas**; outras serão adicionadas.

### Imagens

1. **`vite-imagetools`** *(nova)* — converte PNGs/JPGs do bundle em **WebP/AVIF** em build-time. Arte de fundo, marquee, splash ficam até ~70% menores.
   ```ts
   import bg from "@/assets/background.png?format=avif&w=1920"
   ```

2. **`react-lazy-load-image-component`** *(já instalada, mantida)* — já usada em `RomArtCard`; vou ativar `placeholderSrc` (blur tiny) e `threshold` pra começar o load antes do card entrar na viewport.

3. **`localforage`** *(já instalada, não usada)* — cache local (IndexedDB) das artes baixadas de `archive.org`. Hoje toda recarga refaz fetch; com cache, ROM já vista carrega instantânea e funciona offline.

### Performance / renderização

4. **`@tanstack/react-virtual`** *(nova)* — virtualização da lista de ROMs. Coleções com 500+ jogos hoje renderizam todos os cards de uma vez; com virtual scroll só renderiza o que está visível, dropando memória e travamentos.

5. **`use-debounce`** *(nova)* — debounce no input de busca (Fuse.js roda a cada tecla agora). 150ms de debounce remove jank durante digitação.

### Áudio

6. **`howler`** *(já dependência, mas carregada via `<script>` injetado no DOM)* — passar a importar via ES module (`import { Howl } from "howler"`). Elimina o request pra CDN, remove latência inicial de som e habilita tree-shaking. Os `@types/howler` já estão no package.json.

### Resolução / qualidade visual

7. **Fontes auto-hospedadas via `@fontsource/press-start-2p` + `@fontsource/vt323`** *(novas)* — hoje as fontes vêm do Google Fonts (request externo, FOIT). Self-hosted carrega junto do bundle com `font-display: swap`, sem layout shift.

### Resumo do package.json

Adicionar:
```
vite-imagetools, @tanstack/react-virtual, use-debounce,
@fontsource/press-start-2p, @fontsource/vt323
```

Ativar/migrar (já instaladas):
```
localforage  → cache de artes
howler       → import ES em vez de <script> injetado
```

---

## Ordem de execução

1. Atualizar `package.json` com as novas libs (instalo via `bun add`).
2. Configurar `vite-imagetools` em `vite.config.ts` e converter imports dos assets pesados (`background.png`, `10.png`, marquee).
3. Refatorar `RomArtCard` para usar `localforage` como cache HTTP das artes.
4. Trocar carregamento do Howler para `import { Howl } from "howler"` e remover script dinâmico + preconnect.
5. Trocar Google Fonts pelas `@fontsource/*` no `styles.css`.
6. Virtualizar a lista no modo `expanded` com `@tanstack/react-virtual`.
7. Aplicar `use-debounce` no `searchQuery`.
8. Implementar os 3 botões + modo `compact` + animação de `width` + persistência.
9. Corrigir o bug do `style2`.

## Fora do escopo

- Quebrar `index.tsx` em componentes menores (deixo pra um próximo passo).
- Mudar paleta neon ou a identidade visual.
- Mexer no backend (`mame-server.js`) ou no fluxo de launch.
