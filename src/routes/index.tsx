import { createFileRoute } from "@tanstack/react-router";
import heroImg from "@/assets/arcade-hero.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Master Games Arcade — Dev Emerson 2026" },
      {
        name: "description",
        content:
          "Master Games Arcade: setup automático de MAME + Attract-Mode Plus com tema neon. Baixe o instalador e tenha seu fliperama em minutos.",
      },
      { property: "og:title", content: "Master Games Arcade" },
      {
        property: "og:description",
        content: "Fliperama neon retrô-cyberpunk. MAME + Attract-Mode Plus instalados em 1 clique.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="min-h-screen bg-[oklch(0.05_0.02_280)] text-foreground font-mono overflow-x-hidden">
      {/* HERO */}
      <section className="relative w-full h-[100svh] min-h-[640px] overflow-hidden">
        {/* Background image - full bleed */}
        <img
          src={heroImg}
          alt="Master Games Arcade — line-up de personagens em rua neon"
          className="absolute inset-0 w-full h-full object-cover object-center"
          loading="eager"
        />

        {/* Top fade — keeps title legible without covering characters */}
        <div className="absolute inset-x-0 top-0 h-[28%] bg-[var(--gradient-fade-top)] pointer-events-none" />

        {/* Bottom fade — anchor for CTAs below the line-up */}
        <div className="absolute inset-x-0 bottom-0 h-[22%] bg-[var(--gradient-fade-bottom)] pointer-events-none" />

        {/* Scanline overlay */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.08] mix-blend-overlay"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent 0 2px, oklch(0_0_0) 2px 3px)",
          }}
        />

        {/* TOP NAV - sits in the safe sky area, away from characters */}
        <header className="relative z-10 flex items-center justify-between px-5 sm:px-10 pt-5 sm:pt-7">
          <div className="flex items-center gap-3">
            <span
              className="text-[var(--neon-pink)] font-black tracking-[0.2em] text-sm sm:text-base"
              style={{ textShadow: "var(--shadow-neon-pink)" }}
            >
              ◈ MASTER GAMES
            </span>
          </div>
          <nav className="hidden md:flex items-center gap-7 text-xs tracking-[0.25em] uppercase">
            <a href="#features" className="hover:text-[var(--neon-cyan)] transition-colors">
              Features
            </a>
            <a href="#install" className="hover:text-[var(--neon-cyan)] transition-colors">
              Install
            </a>
            <a href="#fighters" className="hover:text-[var(--neon-cyan)] transition-colors">
              Fighters
            </a>
          </nav>
          <span
            className="text-[var(--neon-cyan)] text-xs tracking-[0.3em] font-bold"
            style={{ textShadow: "var(--shadow-neon-cyan)" }}
          >
            GAME ON
          </span>
        </header>

        {/* TITLE BLOCK — top area, above the characters' heads */}
        <div className="relative z-10 mt-6 sm:mt-10 px-5 text-center">
          <p
            className="text-[var(--neon-cyan)] text-[0.65rem] sm:text-xs tracking-[0.5em] uppercase mb-3"
            style={{ textShadow: "var(--shadow-neon-cyan)" }}
          >
            ▸ Dev Emerson · 2026 · Arcade Edition ◂
          </p>
          <h1
            className="font-black uppercase leading-[0.9] text-[clamp(2.5rem,9vw,7rem)]"
            style={{
              background: "var(--gradient-neon)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 0 18px oklch(0.72 0.28 0 / 0.45))",
              letterSpacing: "-0.02em",
            }}
          >
            Master Games
            <br />
            <span className="text-[0.55em] tracking-[0.3em] font-bold">— ARCADE —</span>
          </h1>
        </div>

        {/* CTA BAR — pinned at the very bottom, in the wet-floor reflection zone (no characters) */}
        <div className="absolute inset-x-0 bottom-0 z-10 px-5 sm:px-8 pb-6 sm:pb-9">
          <div className="mx-auto max-w-4xl flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-5">
            <a
              href="/downloads/mame_setup.bat"
              download="mame_setup.bat"
              className="group relative inline-flex items-center justify-center gap-3 px-7 py-4 bg-[var(--neon-pink)] text-black font-black uppercase tracking-[0.2em] text-sm rounded-sm transition-all hover:scale-[1.03] hover:brightness-110"
              style={{ boxShadow: "var(--shadow-neon-pink)" }}
            >
              <span className="text-lg">▼</span>
              Baixar Setup .BAT
            </a>
            <a
              href="#install"
              className="inline-flex items-center justify-center gap-3 px-7 py-4 border-2 border-[var(--neon-cyan)] text-[var(--neon-cyan)] font-black uppercase tracking-[0.2em] text-sm rounded-sm transition-all hover:bg-[var(--neon-cyan)] hover:text-black"
              style={{ boxShadow: "var(--shadow-neon-cyan)" }}
            >
              Instruções
            </a>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section
        id="features"
        className="relative py-24 px-5 sm:px-10 border-t-2 border-[var(--neon-purple)]/40"
      >
        <div className="max-w-6xl mx-auto">
          <p
            className="text-[var(--neon-pink)] text-xs tracking-[0.4em] uppercase mb-4 text-center"
            style={{ textShadow: "var(--shadow-neon-pink)" }}
          >
            ◢ INSERT COIN ◣
          </p>
          <h2 className="text-center text-4xl sm:text-6xl font-black uppercase tracking-tight mb-16">
            Tudo num único <span className="text-[var(--neon-cyan)]">.bat</span>
          </h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                k: "01",
                t: "MAME 0.287",
                d: "Última build oficial baixada do GitHub mamedev. Self-extract direto pra C:\\mame com fallback SourceForge.",
                c: "var(--neon-pink)",
              },
              {
                k: "02",
                t: "Attract-Mode Plus 3.2.3",
                d: "Front-end neon com layout customizado. 7zr.exe portátil pra extrair o .7z sem dor.",
                c: "var(--neon-cyan)",
              },
              {
                k: "03",
                t: "Tema Neon Verde",
                d: "ui.ini do MAME já estilizado, layout.nut do Attract-Mode com cores neon do mesmo universo desta capa.",
                c: "var(--neon-purple)",
              },
              {
                k: "04",
                t: "Estrutura config/ v3.2+",
                d: "Respeita o breaking change do Attract-Mode Plus: tudo em C:\\AttractMode\\config\\.",
                c: "var(--neon-yellow)",
              },
              {
                k: "05",
                t: "Atalho no Desktop",
                d: "PowerShell cria o atalho 'Master Games Arcade.lnk' apontando pro attractplus.exe.",
                c: "var(--neon-red)",
              },
              {
                k: "06",
                t: "Validação Robusta",
                d: "Checa tamanho do download, descarta arquivos corrompidos, tenta múltiplos espelhos.",
                c: "var(--neon-cyan)",
              },
            ].map((f) => (
              <article
                key={f.k}
                className="relative p-6 border border-white/10 bg-black/40 backdrop-blur-sm rounded-sm hover:border-current transition-colors group"
                style={{ color: f.c }}
              >
                <div
                  className="text-5xl font-black opacity-30 mb-3"
                  style={{ textShadow: `0 0 20px currentColor` }}
                >
                  {f.k}
                </div>
                <h3 className="text-xl font-black uppercase tracking-wider mb-2">{f.t}</h3>
                <p className="text-sm text-white/70 leading-relaxed font-sans">{f.d}</p>
                <div
                  className="absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-500 bg-current"
                  style={{ boxShadow: `0 0 10px currentColor` }}
                />
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* INSTALL */}
      <section
        id="install"
        className="relative py-24 px-5 sm:px-10 bg-gradient-to-b from-transparent via-[var(--neon-purple)]/10 to-transparent"
      >
        <div className="max-w-4xl mx-auto">
          <p
            className="text-[var(--neon-cyan)] text-xs tracking-[0.4em] uppercase mb-4 text-center"
            style={{ textShadow: "var(--shadow-neon-cyan)" }}
          >
            ◢ READY PLAYER ONE ◣
          </p>
          <h2 className="text-center text-4xl sm:text-6xl font-black uppercase tracking-tight mb-16">
            4 passos. <span className="text-[var(--neon-pink)]">Press Start.</span>
          </h2>

          <ol className="space-y-4">
            {[
              {
                n: "1",
                t: "Baixe o instalador",
                d: "Clique no botão acima para baixar mame_setup.bat. Coloque-o numa pasta vazia (ex: Downloads).",
              },
              {
                n: "2",
                t: "(Opcional) Adicione a imagem de fundo",
                d: "Na MESMA pasta do .bat, coloque um arquivo chamado master_games_bg.png — será usada no layout neon do front-end.",
              },
              {
                n: "3",
                t: "Execute como Administrador",
                d: "Clique com o botão direito → Executar como administrador. O script baixa MAME 0.287, Attract-Mode Plus 3.2.3 e 7zr.exe automaticamente.",
              },
              {
                n: "4",
                t: "Adicione suas ROMs e jogue",
                d: "Coloque suas ROMs em C:\\mame\\roms. Abra o atalho 'Master Games Arcade', pressione TAB → Emuladores → MAME → Gerar Lista.",
              },
            ].map((s) => (
              <li
                key={s.n}
                className="flex gap-5 p-5 border border-[var(--neon-cyan)]/30 bg-black/50 rounded-sm hover:border-[var(--neon-cyan)] transition-colors"
              >
                <div
                  className="shrink-0 w-14 h-14 grid place-items-center text-2xl font-black border-2 border-[var(--neon-pink)] text-[var(--neon-pink)] rounded-sm"
                  style={{ boxShadow: "var(--shadow-neon-pink)" }}
                >
                  {s.n}
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase tracking-wider mb-1">{s.t}</h3>
                  <p className="text-sm text-white/70 font-sans leading-relaxed">{s.d}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-12 text-center">
            <a
              href="/downloads/mame_setup.bat"
              download="mame_setup.bat"
              className="inline-flex items-center gap-3 px-10 py-5 bg-[var(--neon-pink)] text-black font-black uppercase tracking-[0.25em] text-base rounded-sm hover:scale-[1.03] transition-transform"
              style={{ boxShadow: "var(--shadow-neon-pink)" }}
            >
              ▼ mame_setup.bat
            </a>
            <p className="mt-3 text-xs text-white/40 tracking-widest uppercase">
              Windows 10/11 · ~120 MB no total
            </p>
          </div>
        </div>
      </section>

      {/* FIGHTERS — small strip */}
      <section
        id="fighters"
        className="relative py-20 px-5 border-t-2 border-[var(--neon-pink)]/40"
      >
        <div className="max-w-6xl mx-auto text-center">
          <p
            className="text-[var(--neon-yellow)] text-xs tracking-[0.4em] uppercase mb-4"
            style={{ textShadow: "0 0 20px oklch(0.88 0.18 90 / 0.6)" }}
          >
            ◢ THE KING OF THE FIGHTERS ◣
          </p>
          <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight mb-4">
            Selecione seu lutador
          </h2>
          <p className="text-white/60 text-sm tracking-wider max-w-2xl mx-auto font-sans">
            Suporte completo a Street Fighter, King of Fighters, Fatal Fury, Samurai Shodown,
            Mortal Kombat, Marvel vs Capcom e milhares de outros clássicos via MAME.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/10 py-8 px-5 text-center text-xs tracking-[0.3em] uppercase text-white/40">
        <span className="text-[var(--neon-pink)]">◈</span> Master Games Arcade · Dev Emerson · 2026
        <span className="text-[var(--neon-cyan)] ml-2">◈</span>
      </footer>
    </main>
  );
}
