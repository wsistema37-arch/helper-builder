import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef, useCallback } from "react";
import { Star, FolderOpen, Settings2, AlertTriangle, CheckCircle } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    meta: [
      { title: "Master Games Arcade · MAME Launcher" },
      { name: "description", content: "Retro arcade MAME launcher with neon CRT vibes." },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Press+Start+2P&family=VT323&display=swap",
      },
    ],
  }),
});

interface HistoryItem {
  rom: string;
  timestamp: number;
}

const FAV_KEY = "mame.favorites";
const HIST_KEY = "mame.history";
const CFG_KEY = "mame.config";
const BACKEND = "http://localhost:7777";

function Home() {
  const [mameExePath, setMameExePath] = useState<string>("");
  const [romsPath, setRomsPath] = useState<string>("");
  const [romsList, setRomsList] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [isLaunching, setIsLaunching] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showMameInfo, setShowMameInfo] = useState(false);
  const [launchingRom, setLaunchingRom] = useState<string>("");
  const [mameStatus, setMameStatus] = useState<"checking" | "found" | "not_found">("checking");
  const [backendStatus, setBackendStatus] = useState<"checking" | "ok" | "offline">("checking");
  const [configMamePath, setConfigMamePath] = useState("C:\\Users\\cordeiro\\Downloads\\Mameplus_0.168.2\\Mameplus_0.168.2\\mame.exe");
  const [configRomsPath, setConfigRomsPath] = useState("C:\\Users\\cordeiro\\Downloads\\Mameplus_0.168.2\\Mameplus_0.168.2\\roms");
  const [configMsg, setConfigMsg] = useState("");
  const [launchMsg, setLaunchMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const checkBackend = useCallback(async () => {
    try {
      const r = await fetch(`${BACKEND}/api/health`, { signal: AbortSignal.timeout(1500) });
      if (r.ok) { setBackendStatus("ok"); return true; }
    } catch {}
    setBackendStatus("offline");
    return false;
  }, []);

  const checkMame = useCallback(async (mamePath: string) => {
    if (!mamePath) { setMameStatus("not_found"); return; }
    try {
      const r = await fetch(`${BACKEND}/api/check-mame?path=${encodeURIComponent(mamePath)}`);
      const data = await r.json();
      setMameStatus(data.exists ? "found" : "not_found");
    } catch { setMameStatus("not_found"); }
  }, []);

  const scanRoms = useCallback(async (romsDir: string) => {
    if (!romsDir) return;
    try {
      const r = await fetch(`${BACKEND}/api/roms?path=${encodeURIComponent(romsDir)}`);
      const data = await r.json();
      if (data.roms) {
        setRomsList(data.roms);
        setConfigMsg(`✓ ${data.total} ROMs encontradas`);
      } else {
        setConfigMsg(`✗ ${data.error}`);
      }
    } catch { setConfigMsg("✗ Erro ao conectar no backend"); }
  }, []);

  useEffect(() => {
    // Mostra a intro primeiro (uma vez por aba), depois cai no launcher
    try {
      const params = new URLSearchParams(window.location.search);
      const skipIntro = params.get("launcher") === "1" || sessionStorage.getItem("mga.introSeen") === "1";
      if (!skipIntro) {
        window.location.replace("/intro.html");
        return;
      }
      sessionStorage.setItem("mga.introSeen", "1");
    } catch {}
    try {
      const f = localStorage.getItem(FAV_KEY); if (f) setFavorites(JSON.parse(f));
      const h = localStorage.getItem(HIST_KEY); if (h) setHistory(JSON.parse(h));
      const cfg = localStorage.getItem(CFG_KEY);
      if (cfg) {
        const { mamePath, romsDir } = JSON.parse(cfg);
        if (mamePath) { setMameExePath(mamePath); setConfigMamePath(mamePath); }
        if (romsDir) { setRomsPath(romsDir); setConfigRomsPath(romsDir); }
      }
    } catch {}
    const DEFAULT_MAME = "C:\\Users\\cordeiro\\Downloads\\Mameplus_0.168.2\\Mameplus_0.168.2\\mame.exe";
    const DEFAULT_ROMS = "C:\\Users\\cordeiro\\Downloads\\Mameplus_0.168.2\\Mameplus_0.168.2\\roms";
    checkBackend().then(async (ok) => {
      if (!ok) { setMameStatus("not_found"); return; }
      // Tenta carregar config persistida do servidor (sobrevive a outro navegador)
      let mamePath = "", romsDir = "";
      try {
        const cfg = localStorage.getItem(CFG_KEY);
        if (cfg) { const c = JSON.parse(cfg); mamePath = c.mamePath || ""; romsDir = c.romsDir || ""; }
      } catch {}
      if (!mamePath || !romsDir) {
        try {
          const r = await fetch(`${BACKEND}/api/config`);
          const srv = await r.json();
          if (srv.mamePath && !mamePath) mamePath = srv.mamePath;
          if (srv.romsDir && !romsDir) romsDir = srv.romsDir;
        } catch {}
      }
      if (!mamePath) mamePath = DEFAULT_MAME;
      if (!romsDir) romsDir = DEFAULT_ROMS;
      setMameExePath(mamePath); setConfigMamePath(mamePath);
      setRomsPath(romsDir); setConfigRomsPath(romsDir);
      saveCfg(mamePath, romsDir);
      checkMame(mamePath);
      scanRoms(romsDir);
    });
    inputRef.current?.focus();

    // Auto-recuperação: re-checa backend a cada 5s
    const healthInterval = setInterval(() => { checkBackend(); }, 5000);
    return () => clearInterval(healthInterval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Re-scan automático de ROMs a cada 30s (pega ROMs novas sem precisar reabrir)
  useEffect(() => {
    if (!romsPath || backendStatus !== "ok") return;
    const interval = setInterval(() => { scanRoms(romsPath); }, 30000);
    return () => clearInterval(interval);
  }, [romsPath, backendStatus, scanRoms]);

  const getFilteredRoms = () => {
    const q = searchQuery.toLowerCase();
    const filtered = romsList.filter((rom) => rom.toLowerCase().includes(q));
    const favs = filtered.filter((r) => favorites.includes(r));
    const rest = filtered.filter((r) => !favorites.includes(r));
    return [...favs, ...rest];
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showConfig) return;
      const filteredRoms = getFilteredRoms();
      switch (e.key) {
        case "ArrowUp": e.preventDefault(); setSelectedIndex((p) => (p > 0 ? p - 1 : filteredRoms.length - 1)); break;
        case "ArrowDown": e.preventDefault(); setSelectedIndex((p) => (p < filteredRoms.length - 1 ? p + 1 : 0)); break;
        case "Enter": e.preventDefault(); if (filteredRoms.length > 0) handleLaunchGame(filteredRoms[selectedIndex]); break;
        case "*": case "s": case "S":
          if (document.activeElement === inputRef.current) break;
          e.preventDefault(); if (filteredRoms[selectedIndex]) toggleFavorite(filteredRoms[selectedIndex]); break;
        case "Escape": e.preventDefault(); setShowConfig((v) => !v); break;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedIndex, romsList, searchQuery, favorites, showConfig]);

  useEffect(() => {
    if (listRef.current) {
      const el = listRef.current.children[selectedIndex] as HTMLElement;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const toggleFavorite = (rom: string) => {
    setFavorites((prev) => {
      const next = prev.includes(rom) ? prev.filter((r) => r !== rom) : [...prev, rom];
      try { localStorage.setItem(FAV_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const handleLaunchGame = async (romName: string) => {
    if (!mameExePath) {
      setLaunchMsg("✗ Configure o caminho do MAME em ⚙ CONFIG (ESC)");
      setTimeout(() => setLaunchMsg(""), 3000); return;
    }
    if (backendStatus !== "ok") {
      setLaunchMsg("✗ Backend offline! Abra um terminal e rode: node mame-server.js");
      setTimeout(() => setLaunchMsg(""), 5000); return;
    }
    setIsLaunching(true);
    setLaunchMsg(`⏳ Iniciando ${romName}...`);
    try {
      const r = await fetch(`${BACKEND}/api/launch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mamePath: mameExePath, romName, romPath: romsPath ? `${romsPath}\\${romName}` : undefined }),
      });
      const data = await r.json();
      if (data.ok) {
        setLaunchMsg(`✓ ${romName} iniciado!`);
        setHistory((prev) => {
          const next = [{ rom: romName, timestamp: Date.now() }, ...prev.filter((h) => h.rom !== romName)].slice(0, 20);
          try { localStorage.setItem(HIST_KEY, JSON.stringify(next)); } catch {}
          return next;
        });
      } else { setLaunchMsg(`✗ ${data.error}`); }
    } catch { setLaunchMsg("✗ Falha ao chamar o backend."); }
    finally { setTimeout(() => { setIsLaunching(false); setTimeout(() => setLaunchMsg(""), 3000); }, 3000); }
  };

  const saveCfg = (mamePath: string, romsDir: string) => {
    try { localStorage.setItem(CFG_KEY, JSON.stringify({ mamePath, romsDir })); } catch {}
    // Sincroniza com servidor para sobreviver a outro navegador/PC
    fetch(`${BACKEND}/api/config`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mamePath, romsDir }),
    }).catch(() => {});
  };

  const handleApplyMamePath = async () => {
    if (!configMamePath.trim()) { setConfigMsg("✗ Informe o caminho do mame.exe"); return; }
    setConfigMsg("⏳ Verificando...");
    const alive = await checkBackend();
    if (!alive) { setConfigMsg("✗ Backend offline! Rode: node mame-server.js"); return; }
    const r = await fetch(`${BACKEND}/api/check-mame?path=${encodeURIComponent(configMamePath.trim())}`);
    const data = await r.json();
    if (data.exists) {
      setMameExePath(configMamePath.trim());
      setMameStatus("found");
      // Se o mame.ini já tem rompath configurado, carrega automaticamente
      if (data.currentRompath) {
        setConfigRomsPath(data.currentRompath);
        setRomsPath(data.currentRompath);
        saveCfg(configMamePath.trim(), data.currentRompath);
        setConfigMsg(`✓ MAME encontrado! rompath do mame.ini: ${data.currentRompath}`);
        await scanRoms(data.currentRompath);
      } else {
        saveCfg(configMamePath.trim(), romsPath);
        setConfigMsg("✓ MAME encontrado! Agora configure a pasta de ROMs.");
      }
    } else {
      setMameStatus("not_found");
      setConfigMsg(`✗ Arquivo não encontrado: ${data.path}`);
    }
  };

  const handleScanRoms = async () => {
    if (!configRomsPath.trim()) { setConfigMsg("✗ Informe a pasta de ROMs"); return; }
    if (!mameExePath) { setConfigMsg("✗ Configure o MAME primeiro antes de escanear"); return; }
    setConfigMsg("⏳ Escaneando e salvando no mame.ini...");
    const alive = await checkBackend();
    if (!alive) { setConfigMsg("✗ Backend offline! Rode: node mame-server.js"); return; }

    // Escreve o rompath no mame.ini — técnica usada por Negatron e AML
    // Evita problemas com -rompath via CLI em caminhos externos (bug mamedev/mame#7621)
    try {
      const iniRes = await fetch(`${BACKEND}/api/set-rompath`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mamePath: mameExePath, romsPath: configRomsPath.trim() }),
      });
      const iniData = await iniRes.json();
      if (!iniData.ok) {
        setConfigMsg(`✗ Erro ao salvar mame.ini: ${iniData.error}`);
        return;
      }
    } catch {
      setConfigMsg("✗ Falha ao salvar no mame.ini");
      return;
    }

    setRomsPath(configRomsPath.trim());
    saveCfg(mameExePath, configRomsPath.trim());
    await scanRoms(configRomsPath.trim());
  };

  const filteredRoms = getFilteredRoms();
  const historyRoms = history.slice(0, 5).map((h) => h.rom);
  const selectedRom = filteredRoms[selectedIndex];
  const isFavorite = selectedRom && favorites.includes(selectedRom);
  const mameStatusLabel = mameStatus === "checking" ? "⏳ VERIFICANDO" : mameStatus === "found" ? "✓ OK" : "✗ NÃO ENCONTRADO";
  const mameStatusColor = mameStatus === "found" ? "text-neon-green" : mameStatus === "not_found" ? "text-red-400" : "text-neon-yellow";
  const glass = "bg-black/40 backdrop-blur-md border border-neon-cyan/20";
  const glassDark = "bg-black/55 backdrop-blur-xl border border-neon-cyan/15";

  return (
    <main className="min-h-screen overflow-hidden relative">
      {/* TELA DE LOADING */}
      {isLaunching && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center"
          style={{ backgroundImage: "url('/assets/background.png')", backgroundSize: "cover", backgroundPosition: "center", backgroundColor: "#000" }}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative z-10 flex flex-col items-center gap-6">
            <div className="font-display text-neon-cyan text-[11px] tracking-widest animate-pulse" style={{ textShadow: "0 0 20px cyan" }}>
              MASTER GAMES ARCADE
            </div>
            <div className="font-display text-neon-magenta text-[22px] tracking-widest" style={{ textShadow: "0 0 30px magenta" }}>
              INSERINDO FICHA...
            </div>
            <div className="flex gap-2 mt-2">
              {[0,1,2,3,4,5,6,7].map(i => (
                <div key={i} className="w-3 h-3 rounded-full bg-neon-cyan animate-bounce"
                  style={{ animationDelay: `${i * 0.12}s`, boxShadow: "0 0 8px cyan" }} />
              ))}
            </div>
            <div className="font-display text-neon-yellow text-[9px] mt-4 tracking-widest animate-pulse">
              {launchMsg.replace("⏳ ", "").toUpperCase()}
            </div>
          </div>
        </div>
      )}
      <div className="fixed inset-0 bg-no-repeat" style={{ backgroundImage: "url('/assets/background.png')", backgroundSize: "contain", backgroundPosition: "left center", backgroundAttachment: "fixed", backgroundColor: "#000" }} />
      <div className="fixed inset-0 scanlines pointer-events-none z-0" />
      <div className="scanline-sweep fixed" />
      <div className="marquee-bar h-[2px] w-full fixed top-0 left-0 z-50" />

      <nav className={`fixed top-[2px] left-3 right-3 z-40 rounded-md px-4 py-2.5 ${glass}`} style={{ boxShadow: "0 4px 32px rgba(0,229,255,0.06)" }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-8 w-8 place-items-center rounded font-display text-[9px] text-neon-magenta border border-neon-magenta/40 bg-neon-magenta/10">MG</div>
            <div>
              <div className="font-display text-[10px] text-neon-cyan">MASTER GAMES ARCADE</div>
              <div className="font-body text-xs text-foreground/40 -mt-0.5">
                Iniciador MAME
                {backendStatus === "ok" && <span className="text-neon-green ml-2">● backend ok</span>}
                {backendStatus === "offline" && <span className="text-red-400 ml-2">● backend offline</span>}
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowHistory(!showHistory)} className="font-display text-[8px] border border-neon-green/35 text-neon-green px-2.5 py-1 rounded bg-neon-green/5 hover:bg-neon-green/15 transition">⏱ RECENTE</button>
            <button onClick={() => { setShowConfig(!showConfig); setConfigMsg(""); }} className="font-display text-[8px] border border-neon-magenta/35 text-neon-magenta px-2.5 py-1 rounded bg-neon-magenta/5 hover:bg-neon-magenta/15 transition">
              <Settings2 size={9} className="inline mr-1" />CONFIG
            </button>
          </div>
        </div>
      </nav>

      {showConfig && (
        <div className={`fixed top-[46px] left-3 right-3 z-[39] rounded-b-md px-5 py-4 ${glassDark}`} style={{ boxShadow: "0 8px 40px rgba(224,64,251,0.08)" }}>
          <div className="font-display text-[8px] text-neon-magenta mb-2">// CONFIGURAÇÃO DE CAMINHOS</div>
          {backendStatus === "offline" && (
            <div className="mb-3 px-3 py-2 bg-red-900/30 border border-red-500/30 rounded font-display text-[7px] text-red-300">
              ⚠ Backend offline! Abra um terminal na pasta do projeto e execute:<br />
              <span className="text-neon-yellow font-bold">node mame-server.js</span>
            </div>
          )}
          <div className="space-y-3 max-w-2xl">
            <div className="space-y-1">
              <label className="font-display text-[7px] text-neon-cyan block">CAMINHO DO MAME (.exe)</label>
              <div className="flex gap-2">
                <input type="text" placeholder="ex: C:\mame\mame.exe" value={configMamePath} onChange={(e) => setConfigMamePath(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleApplyMamePath()} className="flex-1 px-3 py-1.5 bg-black/40 border border-white/10 text-foreground font-body text-sm rounded focus:outline-none focus:border-neon-cyan/40" />
                <button onClick={handleApplyMamePath} className="font-display text-[7px] border border-neon-cyan/35 text-neon-cyan px-3 py-1.5 rounded bg-neon-cyan/5 hover:bg-neon-cyan/15 transition">VERIFICAR</button>
              </div>
              {mameExePath && <div className="font-body text-[10px] text-neon-green flex items-center gap-1"><CheckCircle size={9} /> {mameExePath}</div>}
            </div>
            <div className="space-y-1">
              <label className="font-display text-[7px] text-neon-cyan block">PASTA DE ROMs</label>
              <div className="flex gap-2">
                <input type="text" placeholder="ex: C:\ROMs" value={configRomsPath} onChange={(e) => setConfigRomsPath(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleScanRoms()} className="flex-1 px-3 py-1.5 bg-black/40 border border-white/10 text-foreground font-body text-sm rounded focus:outline-none focus:border-neon-cyan/40" />
                <button onClick={handleScanRoms} className="font-display text-[7px] border border-neon-cyan/35 text-neon-cyan px-3 py-1.5 rounded bg-neon-cyan/5 hover:bg-neon-cyan/15 transition"><FolderOpen size={9} className="inline mr-1" />ESCANEAR</button>
              </div>
            </div>
            {configMsg && <div className={`font-display text-[7px] ${configMsg.startsWith("✓") ? "text-neon-green" : configMsg.startsWith("⏳") ? "text-neon-yellow" : "text-red-400"}`}>{configMsg}</div>}

            {/* MAME OFICIAL OPEN-SOURCE + DICA DE COMPATIBILIDADE DE ROMS */}
            <div className="mt-3 pt-3 border-t border-white/[0.06] space-y-1.5">
              <div className="font-display text-[7px] text-neon-magenta">// MAME OFICIAL (OPEN SOURCE)</div>
              <div className="flex flex-wrap gap-2">
                <a href="https://www.mamedev.org/release.html" target="_blank" rel="noopener noreferrer"
                   className="font-display text-[7px] border border-neon-cyan/35 text-neon-cyan px-3 py-1.5 rounded bg-neon-cyan/5 hover:bg-neon-cyan/15 transition">
                  ⬇ BAIXAR MAME OFICIAL
                </a>
                <a href="https://www.mamedev.org/roms/" target="_blank" rel="noopener noreferrer"
                   className="font-display text-[7px] border border-neon-green/35 text-neon-green px-3 py-1.5 rounded bg-neon-green/5 hover:bg-neon-green/15 transition">
                  ⬇ ROMS LEGAIS (MAMEDEV)
                </a>
              </div>
              <div className="font-body text-[10px] text-foreground/45 leading-snug">
                ⚠ Se alguns <span className="text-neon-yellow">.zip</span> não abrem é porque o romset é de outra versão do MAME (ex.: 0.139 / 0.245).
                Use o <span className="text-neon-cyan">MAME oficial</span> e ROMs do <span className="text-neon-cyan">mesmo set</span>, ou rode <span className="text-neon-yellow">mame -verifyroms nomedorom</span> para conferir.
              </div>
            </div>
          </div>
        </div>
      )}

      {backendStatus === "offline" && !showConfig && (
        <div className="fixed top-[46px] left-3 right-3 z-[38] rounded-b-md px-4 py-2 bg-red-900/25 border border-red-500/25 backdrop-blur-md flex items-center gap-2">
          <AlertTriangle size={11} className="text-red-400 flex-shrink-0" />
          <span className="font-display text-[7px] text-red-300">Backend offline! Abra um terminal e rode: <span className="text-neon-yellow">node mame-server.js</span></span>
        </div>
      )}
      {backendStatus === "ok" && mameStatus === "not_found" && !showConfig && (
        <div className="fixed top-[46px] left-3 right-3 z-[38] rounded-b-md px-4 py-2 bg-yellow-900/25 border border-yellow-500/25 backdrop-blur-md flex items-center gap-2">
          <AlertTriangle size={11} className="text-yellow-400 flex-shrink-0" />
          <span className="font-display text-[7px] text-yellow-300">MAME não configurado. Clique em CONFIG (ESC) para definir os caminhos.</span>
        </div>
      )}

      <aside className={`fixed top-[46px] right-3 bottom-[22px] z-30 rounded-md flex flex-col overflow-hidden ${glassDark}`} style={{ width: "240px", boxShadow: "0 8px 48px rgba(0,229,255,0.06)" }}>
        <div className="px-3 pt-3 pb-2.5 border-b border-white/[0.06] flex-shrink-0">
          <div className="font-display text-[7px] text-neon-cyan mb-1">// Lançador MAME</div>
          <h1 className="font-display text-[13px] leading-tight text-neon-magenta mb-1">SELECIONE<br />SEU JOGO</h1>
          <p className="font-body text-[11px] text-foreground/35 mb-2">
            {mameStatus === "found" ? `✓ MAME · ${romsList.length} jogos · ${favorites.length} favoritos` : mameStatus === "checking" ? "⏳ Verificando MAME..." : "⚠ MAME não configurado"}
          </p>
          <div className="bg-black/30 border border-white/[0.05] rounded px-2 py-1.5">
            <div className="flex flex-wrap gap-x-2 gap-y-0.5 mb-1">
              <span className="font-display text-[6px]">MAME: <span className={mameStatusColor}>{mameStatusLabel}</span></span>
              <span className="font-display text-[6px]">JOGOS: <span className="text-neon-yellow">{romsList.length}</span></span>
              <span className="font-display text-[6px]">FAVORITOS: <span className="text-neon-yellow">{favorites.length}</span></span>
            </div>
            <div className="font-display text-[5px] text-foreground/25">↑↓ MOVER · ENTER NO MODO DE JOGO · * ESTRELA · ESC CONFIGURAÇÃO</div>
          </div>
        </div>

        <div className="px-3 py-2 border-b border-white/[0.06] flex-shrink-0">
          <div className="font-display text-[7px] text-neon-magenta mb-1">// INFORMAÇÕES DO JOGO</div>
          {selectedRom ? (
            <div>
              <div className="flex items-start justify-between gap-1 mb-0.5">
                <div className="font-display text-[9px] text-neon-cyan break-all line-clamp-2 flex-1 leading-tight">{selectedRom}</div>
                <button onClick={() => toggleFavorite(selectedRom)} className="flex-shrink-0 transition">
                  <Star size={13} className={isFavorite ? "fill-neon-yellow text-neon-yellow" : "text-foreground/25"} />
                </button>
              </div>
            </div>
          ) : (
            <div className="font-body text-xs text-foreground/25">Selecione um jogo</div>
          )}
        </div>

        <div className="h-28 border-b border-white/[0.06] overflow-hidden bg-black/50 flex items-center justify-center flex-shrink-0">
          <div className="text-center"><div className="font-display text-[7px] text-foreground/20 mb-1">SEM IMAGEM</div><div className="font-body text-[9px] text-neon-cyan/25">~/Snapshots/</div></div>
        </div>

        <div className="flex items-center justify-between px-3 py-1 border-b border-white/[0.06] bg-white/[0.02] flex-shrink-0">
          <span className="font-display text-[7px] text-neon-magenta">▶ JOGOS</span>
          <span className="font-display text-[7px] text-neon-green">{filteredRoms.length}</span>
        </div>

        <div className="px-2 py-1.5 border-b border-white/[0.06] flex-shrink-0">
          <input ref={inputRef} type="text" placeholder="Buscar..." value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setSelectedIndex(0); }} className="w-full px-2 py-1 bg-black/30 border border-white/[0.07] text-foreground font-body text-[11px] rounded focus:outline-none focus:border-neon-cyan/35" />
        </div>

        <div ref={listRef} className="flex-1 overflow-y-auto divide-y divide-white/[0.03]">
          {showHistory && historyRoms.length > 0 ? (
            <>
              <div className="px-3 py-1 bg-neon-green/5 border-b border-neon-green/15 font-display text-[6px] text-neon-green sticky top-0">⏱ ÚLTIMOS</div>
              {historyRoms.map((rom, idx) => (
                <button key={`h${idx}`} onClick={() => handleLaunchGame(rom)} disabled={isLaunching} className="w-full text-left px-3 py-1.5 font-display text-[8px] text-neon-green hover:text-neon-cyan hover:bg-neon-cyan/5 transition disabled:opacity-50">
                  {favorites.includes(rom) && "★ "}{rom}
                </button>
              ))}
            </>
          ) : romsList.length === 0 ? (
            <div className="px-3 py-6 font-body text-[10px] text-foreground/25 text-center">
              {backendStatus === "offline" ? "Backend offline.\nRode: node mame-server.js" : "Configure a pasta de ROMs em ⚙ CONFIG"}
            </div>
          ) : filteredRoms.length > 0 ? (
            filteredRoms.map((rom, idx) => {
              const isFav = favorites.includes(rom);
              const isSelected = selectedIndex === idx;
              return (
                <button key={rom} onClick={() => { setSelectedIndex(idx); handleLaunchGame(rom); }} disabled={isLaunching} onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full text-left px-3 py-1.5 font-display text-[8px] transition whitespace-nowrap overflow-hidden text-ellipsis disabled:opacity-50 ${isSelected ? "bg-neon-cyan/10 border-l-2 border-neon-cyan text-neon-cyan" : "text-foreground/45 hover:text-neon-cyan hover:bg-neon-cyan/5"}`}>
                  {isFav && "★ "}▶ {rom}
                </button>
              );
            })
          ) : (
            <div className="px-3 py-6 font-body text-[10px] text-foreground/25 text-center">Sem resultados</div>
          )}
        </div>

        <div className="flex items-center justify-between px-3 py-1 border-t border-white/[0.06] bg-white/[0.02] font-display text-[6px] flex-shrink-0">
          <span className="text-foreground/25">↑↓ MOVER</span>
          {isLaunching && <span className="text-neon-yellow animate-pulse">⏳ CARREGANDO...</span>}
          <span className="text-neon-yellow">DIGITAR</span>
        </div>
      </aside>

      {launchMsg && (
        <div className={`fixed bottom-[30px] left-3 right-[256px] z-50 px-4 py-2 rounded font-display text-[8px] backdrop-blur-md border ${launchMsg.startsWith("✓") ? "bg-neon-green/10 border-neon-green/30 text-neon-green" : launchMsg.startsWith("✗") ? "bg-red-900/30 border-red-500/30 text-red-300" : "bg-black/50 border-neon-cyan/20 text-neon-yellow"}`}>
          {launchMsg}
        </div>
      )}

      <footer className="fixed bottom-0 left-0 right-0 z-40">
        <div className={`px-4 py-1 flex items-center justify-between ${glass}`}>
          <div className="font-display text-[7px] text-foreground/25">© 2026 MASTER GAMES ARCADE · MAME LAUNCHER ULTIMATE</div>
          <span className={`font-display text-[7px] ${mameStatus === "found" ? "text-neon-green animate-blink" : "text-red-400"}`}>{mameStatus === "found" ? "● ONLINE" : "● MAME OFFLINE"}</span>
        </div>
        <div className="marquee-bar h-[2px] w-full" />
      </footer>
    </main>
  );
}
