/**
 * MAME Local Backend Server - v3
 * Correção: spawn com shell:true para garantir execução no Windows
 */

import http from "http";
import { spawn, execFile } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const PORT = 7777;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CONFIG_FILE = path.join(__dirname, "config.json");
const LOG_FILE = path.join(__dirname, "launches.log");

function readConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8")); } catch { return {}; }
}
function writeConfig(data) {
  try { fs.writeFileSync(CONFIG_FILE, JSON.stringify(data, null, 2), "utf8"); return true; } catch { return false; }
}
function appendLog(entry) {
  try { fs.appendFileSync(LOG_FILE, JSON.stringify({ ts: Date.now(), ...entry }) + "\n", "utf8"); } catch {}
}

function json(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch { reject(new Error("JSON inválido")); }
    });
  });
}

function readMameIni(mameDir) {
  const iniPath = path.join(mameDir, "mame.ini");
  if (!fs.existsSync(iniPath)) return {};
  const lines = fs.readFileSync(iniPath, "utf8").split(/\r?\n/);
  const cfg = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const spaceIdx = trimmed.search(/\s/);
    if (spaceIdx === -1) continue;
    cfg[trimmed.slice(0, spaceIdx).trim()] = trimmed.slice(spaceIdx).trim();
  }
  return cfg;
}

function writeMameIniKey(mameDir, key, value) {
  const iniPath = path.join(mameDir, "mame.ini");
  let content = fs.existsSync(iniPath) ? fs.readFileSync(iniPath, "utf8") : "";
  const lines = content.split(/\r?\n/);
  let found = false;
  const newLines = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return line;
    const spaceIdx = trimmed.search(/\s/);
    if (spaceIdx === -1) return line;
    if (trimmed.slice(0, spaceIdx).trim() === key) {
      found = true;
      return `${key}                     ${value}`;
    }
    return line;
  });
  if (!found) newLines.push(`${key}                     ${value}`);
  fs.writeFileSync(iniPath, newLines.join("\r\n"), "utf8");
}

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (req.method === "OPTIONS") { json(res, 204, {}); return; }

  // GET /api/health
  if (req.method === "GET" && url.pathname === "/api/health") {
    json(res, 200, { ok: true, port: PORT, version: "v3.1" });
    return;
  }

  // GET /api/config — carrega config persistida no servidor
  if (req.method === "GET" && url.pathname === "/api/config") {
    json(res, 200, readConfig());
    return;
  }

  // POST /api/config — salva config no servidor (sobrevive a outro navegador/PC)
  if (req.method === "POST" && url.pathname === "/api/config") {
    let body;
    try { body = await parseBody(req); } catch { json(res, 400, { error: "JSON inválido" }); return; }
    const ok = writeConfig({ ...readConfig(), ...body, updatedAt: Date.now() });
    json(res, ok ? 200 : 500, ok ? { ok: true } : { error: "Falha ao salvar config.json" });
    return;
  }

  // GET /api/launches — últimas 50 execuções
  if (req.method === "GET" && url.pathname === "/api/launches") {
    try {
      const content = fs.existsSync(LOG_FILE) ? fs.readFileSync(LOG_FILE, "utf8") : "";
      const lines = content.trim().split("\n").filter(Boolean).slice(-50).reverse();
      json(res, 200, { launches: lines.map((l) => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean) });
    } catch (err) { json(res, 500, { error: err.message }); }
    return;
  }

  // GET /api/roms?path=...
  if (req.method === "GET" && url.pathname === "/api/roms") {
    const romsPath = url.searchParams.get("path") || "";
    if (!romsPath) { json(res, 400, { error: "Parâmetro 'path' obrigatório" }); return; }
    const normalizedPath = path.resolve(romsPath.trim());
    if (!fs.existsSync(normalizedPath)) {
      json(res, 404, { error: `Pasta não encontrada: ${normalizedPath}` }); return;
    }
    try {
      const roms = fs.readdirSync(normalizedPath)
        .filter((f) => /\.(zip|7z|chd)$/i.test(f))
        .sort((a, b) => a.localeCompare(b));
      json(res, 200, { roms, path: normalizedPath, total: roms.length });
    } catch (err) {
      json(res, 500, { error: `Erro ao ler pasta: ${err.message}` });
    }
    return;
  }

  // GET /api/check-mame?path=...
  if (req.method === "GET" && url.pathname === "/api/check-mame") {
    const mamePath = url.searchParams.get("path") || "";
    if (!mamePath) { json(res, 400, { error: "Parâmetro 'path' obrigatório" }); return; }
    const normalizedPath = path.resolve(mamePath.trim());
    const exists = fs.existsSync(normalizedPath);
    let currentRompath = "";
    if (exists) {
      const ini = readMameIni(path.dirname(normalizedPath));
      currentRompath = ini["rompath"] || "";
    }
    json(res, 200, { exists, path: normalizedPath, currentRompath });
    return;
  }

  // POST /api/set-rompath
  if (req.method === "POST" && url.pathname === "/api/set-rompath") {
    let body;
    try { body = await parseBody(req); } catch { json(res, 400, { error: "JSON inválido" }); return; }
    const { mamePath, romsPath } = body;
    if (!mamePath || !romsPath) { json(res, 400, { error: "mamePath e romsPath obrigatórios" }); return; }
    const mameExe = path.resolve(mamePath.trim());
    if (!fs.existsSync(mameExe)) { json(res, 404, { error: `MAME não encontrado: ${mameExe}` }); return; }
    const mameDir = path.dirname(mameExe);
    const romsDir = path.resolve(romsPath.trim());
    const iniPath = path.join(mameDir, "mame.ini");
    if (!fs.existsSync(iniPath)) {
      console.log("[MAME] Criando mame.ini com -createconfig...");
      await new Promise((resolve) => {
        execFile(mameExe, ["-createconfig"], { cwd: mameDir }, () => resolve());
      });
    }
    try {
      writeMameIniKey(mameDir, "rompath", romsDir);
      console.log(`[MAME] rompath salvo no mame.ini: ${romsDir}`);
      json(res, 200, { ok: true, iniPath, rompath: romsDir });
    } catch (err) {
      json(res, 500, { error: `Falha ao escrever mame.ini: ${err.message}` });
    }
    return;
  }

  // POST /api/launch  { mamePath, romName }
  if (req.method === "POST" && url.pathname === "/api/launch") {
    let body;
    try { body = await parseBody(req); } catch { json(res, 400, { error: "JSON inválido" }); return; }
    const { mamePath, romName } = body;
    if (!mamePath || !romName) { json(res, 400, { error: "mamePath e romName obrigatórios" }); return; }

    const mameExe = path.resolve(mamePath.trim());
    if (!fs.existsSync(mameExe)) {
      json(res, 404, { error: `MAME não encontrado: ${mameExe}` }); return;
    }

    const mameDir = path.dirname(mameExe);
    const rom = romName.replace(/\.(zip|7z|chd)$/i, "");

    console.log(`[MAME] Iniciando: "${mameExe}" ${rom}  (cwd: ${mameDir})`);

    try {
      /**
       * CORREÇÃO WINDOWS:
       * - Usa spawn com shell:true para garantir que o .exe abre com janela visível
       * - O rompath já está no mame.ini, então não precisa de -rompath
       * - windowsHide: false garante que a janela aparece
       */
      const mameExeQuoted = mameExe.includes(" ") ? `"${mameExe}"` : mameExe;
      // -skip_gameinfo pula a tela de info, -nowindow garante fullscreen direto
      const cmd = `${mameExeQuoted} ${rom} -skip_gameinfo`;

      console.log(`[MAME] Executando via shell: ${cmd}`);

      const child = spawn(cmd, [], {
        cwd: mameDir,
        shell: true,
        detached: true,
        stdio: "ignore",
        windowsHide: false,
      });

      child.on("error", (err) => {
        console.error(`[MAME] Erro ao lançar ${rom}:`, err.message);
      });

      child.on("exit", (code) => {
        if (code !== 0 && code !== null) {
          console.warn(`[MAME] "${rom}" encerrou com código ${code}`);
        }
      });

      child.unref();

      json(res, 200, { ok: true, rom, pid: child.pid, cmd });
    } catch (err) {
      console.error(`[MAME] Falha:`, err);
      json(res, 500, { error: `Falha ao iniciar MAME: ${err.message}` });
    }
    return;
  }

  json(res, 404, { error: "Rota não encontrada" });
}

const server = http.createServer(handleRequest);
server.listen(PORT, "127.0.0.1", () => {
  console.log(`\n✅ MAME Backend v3 rodando em http://localhost:${PORT}\n`);
});
server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(`❌ Porta ${PORT} já em uso. Feche o processo anterior.`);
  } else {
    console.error("Erro:", err);
  }
  process.exit(1);
});
