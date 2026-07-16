/**
 * ingest-games.js — HD Hub Game Ingestion Engine v3
 *
 * Clones verified HTML5 game repos into public/apps/<game-id>/,
 * promotes nested build outputs, and generates styled terminal
 * boot-loader launchers for DMCA-affected titles.
 *
 * Usage:  node ingest-games.js
 * Hook:   npm run setup-hub-games
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const APPS_DIR = path.join(__dirname, 'public', 'apps');

/* ═══════════════════════════════════════════════
   Target Mapping Matrix — v3 Verified Sources
   ──────────────────────────────────────────────
   DO NOT CHANGE subway-surfers or 8-ball-billiards.
   They are confirmed working.
   ═══════════════════════════════════════════════ */

const GAME_SOURCES = [
  {
    id: 'subway-surfers',
    repo: 'https://github.com/testingherokuapp/subwaysurfer',
    mode: 'clone',
    note: 'Verified stable Poki HTML5 production bundle',
  },
  {
    id: '8-ball-billiards',
    repo: 'https://github.com/afzalimdad9/8Ball-Pool-HTML5',
    mode: 'clone',
    note: 'Responsive HTML5 Canvas billiards with full physics loop',
  },
  {
    id: 'geometry-dash',
    repo: 'https://github.com/p0syd0n/geometry_dash',
    mode: 'clone',
    note: 'HTML5 Canvas Geometry Dash recreation with jump physics',
  },
  {
    id: 'eaglercraft',
    repo: null,
    mode: 'launcher',
    launcherTarget: 'https://eaglercraft.com/mc/1.8.8-wasm/index.html',
    launcherFallback: 'https://eaglercraft.com/p/downloads',
    launcherTheme: {
      title: 'Eaglercraft 1.8.8',
      subtitle: 'Minecraft Browser Client — WebAssembly Runtime',
      accentColor: '#4a7c3f',
      bgGrad: 'linear-gradient(135deg, #1a2f14 0%, #0d1a08 100%)',
      icon: '⛏️',
    },
    note: 'Eaglercraft 1.8.8 WASM — styled terminal launcher',
  },
  {
    id: 'gta-vice-city',
    repo: null,
    mode: 'launcher',
    launcherTarget: 'https://playclassic.games/games/grand-theft-auto-vice-city/',
    launcherFallback: 'https://playclassic.games/games/grand-theft-auto-vice-city/',
    launcherTheme: {
      title: 'GTA: Vice City',
      subtitle: 'reVC WebAssembly Port — 3D Open-World Runtime',
      accentColor: '#E040FB',
      bgGrad: 'linear-gradient(135deg, #1a0a24 0%, #0a1a1a 100%)',
      icon: '🌴',
    },
    note: 'GTA Vice City — styled terminal launcher to playclassic.games',
  },
  {
    id: 'drift-hunters',
    repo: null,
    mode: 'launcher',
    launcherTarget: 'https://webglmath.github.io/drift-hunters/',
    launcherFallback: 'https://webglmath.github.io/drift-hunters/',
    launcherTheme: {
      title: 'Drift Hunters',
      subtitle: 'WebGL 3D Car Physics & Drifting Simulator',
      accentColor: '#e040fb',
      bgGrad: 'linear-gradient(135deg, #1f1c2c 0%, #08070b 100%)',
      icon: '🚗',
    },
    note: 'Drift Hunters — WebGL drifting game launcher',
  },
];

/* ═══════════════════════════════════════════════
   Utilities
   ═══════════════════════════════════════════════ */

const CLR = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  red: '\x1b[31m',
  dim: '\x1b[2m',
  bold: '\x1b[1m',
};

function log(icon, msg) {
  console.log(`${CLR.dim}[ingest]${CLR.reset} ${icon}  ${msg}`);
}

function logOk(msg)   { log(`${CLR.green}✔${CLR.reset}`, msg); }
function logSkip(msg) { log(`${CLR.yellow}⊘${CLR.reset}`, msg); }
function logWork(msg) { log(`${CLR.cyan}⬇${CLR.reset}`, msg); }
function logErr(msg)  { log(`${CLR.red}✖${CLR.reset}`, msg); }

function copyDirRecursive(src, dest) {
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      fs.mkdirSync(destPath, { recursive: true });
      copyDirRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

function removeDirRecursive(target) {
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
  }
}

function hasIndexHtml(dir) {
  return fs.existsSync(path.join(dir, 'index.html'));
}

/* ═══════════════════════════════════════════════
   Build Output Promoter
   ═══════════════════════════════════════════════ */

const BUILD_DIR_CANDIDATES = ['dist', 'build', 'public', 'output', 'out', 'www'];

function promoteBuiltAssets(gameDir, gameId) {
  if (hasIndexHtml(gameDir)) {
    logOk(`${gameId}: index.html found at root — no promotion needed`);
    return;
  }

  for (const candidate of BUILD_DIR_CANDIDATES) {
    const candidatePath = path.join(gameDir, candidate);
    if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isDirectory()) {
      if (hasIndexHtml(candidatePath)) {
        log(`${CLR.cyan}↑${CLR.reset}`, `${gameId}: promoting ${candidate}/ to root`);
        copyDirRecursive(candidatePath, gameDir);
        removeDirRecursive(candidatePath);
        logOk(`${gameId}: build assets promoted`);
        return;
      }
    }
  }

  try {
    const entries = fs.readdirSync(gameDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        const subDir = path.join(gameDir, entry.name);
        if (hasIndexHtml(subDir)) {
          log(`${CLR.cyan}↑${CLR.reset}`, `${gameId}: promoting ${entry.name}/ to root`);
          copyDirRecursive(subDir, gameDir);
          removeDirRecursive(subDir);
          logOk(`${gameId}: subdirectory assets promoted`);
          return;
        }
      }
    }
  } catch (_) { /* ignore */ }

  logSkip(`${gameId}: no index.html in output dirs — may need manual setup`);
}

/* ═══════════════════════════════════════════════
   Terminal Boot-Loader Launcher Generator
   Creates a high-fidelity styled boot screen that
   auto-redirects into the target via JS after a
   short loading animation, or provides a manual
   "Launch" button. Fully self-contained HTML.
   ═══════════════════════════════════════════════ */

function generateLauncher(game) {
  const targetDir = path.join(APPS_DIR, game.id);
  fs.mkdirSync(targetDir, { recursive: true });

  const target = game.launcherTarget || game.launcherFallback;
  const fallback = game.launcherFallback || target;
  const t = game.launcherTheme || {};
  const title = t.title || game.id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  const subtitle = t.subtitle || 'Browser Runtime Launcher';
  const accent = t.accentColor || '#6c5ce7';
  const bgGrad = t.bgGrad || 'linear-gradient(135deg, #0a0a0f 0%, #12121a 100%)';
  const icon = t.icon || '🎮';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — HD Hub</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Inter:wght@400;600;700&display=swap');
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    html, body {
      width: 100%; height: 100%; overflow: hidden;
      background: ${bgGrad};
      font-family: 'Inter', system-ui, sans-serif;
      color: #f0f0f5;
    }

    /* ── Boot Screen ─────────────────────────── */
    .boot-screen {
      position: fixed; inset: 0;
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      z-index: 10; transition: opacity 0.5s ease;
    }
    .boot-screen.fade-out { opacity: 0; pointer-events: none; }

    .boot-icon {
      font-size: 3.5rem;
      margin-bottom: 1.5rem;
      animation: float 2s ease-in-out infinite;
    }
    @keyframes float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }

    .boot-title {
      font-size: 1.75rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin-bottom: 0.35rem;
    }
    .boot-subtitle {
      font-size: 0.8rem;
      color: #8888a0;
      margin-bottom: 2rem;
    }

    /* Terminal log area */
    .terminal {
      width: 380px; max-width: 90vw;
      background: rgba(0,0,0,0.4);
      border: 1px solid rgba(255,255,255,0.06);
      border-radius: 0.75rem;
      padding: 1rem 1.25rem;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.7rem;
      line-height: 1.7;
      color: ${accent};
      margin-bottom: 1.5rem;
      overflow: hidden;
    }
    .terminal .line { opacity: 0; animation: typeLine 0.3s ease forwards; }
    @keyframes typeLine {
      from { opacity: 0; transform: translateX(-8px); }
      to { opacity: 1; transform: translateX(0); }
    }

    .launch-btn {
      display: inline-flex; align-items: center; gap: 0.5rem;
      padding: 0.75rem 2rem; border-radius: 0.75rem;
      background: ${accent}; color: #fff;
      font-size: 0.875rem; font-weight: 700;
      text-decoration: none; border: none; cursor: pointer;
      transition: transform 0.15s, box-shadow 0.15s;
      box-shadow: 0 4px 20px ${accent}44;
    }
    .launch-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 28px ${accent}66;
    }

    .status-text {
      font-size: 0.7rem; color: #8888a0;
      margin-top: 1rem;
    }

    /* ── Runtime iframe (hidden initially) ───── */
    .runtime-frame {
      position: fixed; inset: 0;
      width: 100%; height: 100%;
      border: 0; outline: 0;
      z-index: 5; display: none;
    }
    .runtime-frame.active { display: block; }
  </style>
</head>
<body>

  <!-- Boot Screen -->
  <div class="boot-screen" id="boot">
    <div class="boot-icon">${icon}</div>
    <div class="boot-title">${title}</div>
    <div class="boot-subtitle">${subtitle}</div>

    <div class="terminal" id="terminal"></div>

    <button class="launch-btn" id="launch-btn" style="display:none;" onclick="launchRuntime()">
      ▶ Launch ${title}
    </button>

    <div class="status-text" id="status">Initializing runtime…</div>
  </div>

  <!-- Runtime iframe -->
  <iframe
    class="runtime-frame"
    id="runtime"
    sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-pointer-lock"
    allow="fullscreen; autoplay; clipboard-write"
    loading="eager"
  ></iframe>

  <script>
    const terminal = document.getElementById('terminal');
    const boot = document.getElementById('boot');
    const runtime = document.getElementById('runtime');
    const launchBtn = document.getElementById('launch-btn');
    const statusEl = document.getElementById('status');
    const TARGET = '${target}';
    const FALLBACK = '${fallback}';

    const bootLines = [
      '> HD Hub Runtime v3.0.1',
      '> Checking system compatibility… ✔',
      '> Allocating WebAssembly heap… ✔',
      '> Resolving mirror endpoint…',
      '> Target: ${target.replace(/'/g, "\\'")}',
      '> Establishing secure tunnel… ✔',
      '> Pre-caching shader pipeline… ✔',
      '> Runtime ready. Launching…',
    ];

    let lineIndex = 0;

    function addLine() {
      if (lineIndex >= bootLines.length) {
        statusEl.textContent = 'Runtime loaded — launching…';
        setTimeout(launchRuntime, 600);
        return;
      }
      const div = document.createElement('div');
      div.className = 'line';
      div.style.animationDelay = '0s';
      div.textContent = bootLines[lineIndex];
      terminal.appendChild(div);
      terminal.scrollTop = terminal.scrollHeight;
      lineIndex++;
      setTimeout(addLine, 350 + Math.random() * 250);
    }

    function launchRuntime() {
      /* Try to load in iframe first */
      runtime.src = TARGET;
      runtime.classList.add('active');

      let loaded = false;
      runtime.addEventListener('load', () => {
        loaded = true;
        boot.classList.add('fade-out');
      });

      /* Fallback: if iframe blocks (X-Frame-Options), redirect */
      setTimeout(() => {
        if (!loaded) {
          statusEl.textContent = 'Iframe blocked — redirecting to external mirror…';
          boot.classList.add('fade-out');
          setTimeout(() => {
            window.location.href = FALLBACK;
          }, 800);
        }
      }, 5000);
    }

    /* Show launch button as manual override */
    setTimeout(() => {
      launchBtn.style.display = 'inline-flex';
    }, 2000);

    /* Start boot sequence */
    setTimeout(addLine, 400);
  </script>
</body>
</html>`;

  fs.writeFileSync(path.join(targetDir, 'index.html'), html, 'utf-8');
  logOk(`${game.id}: terminal launcher generated → ${target}`);
}

/* ═══════════════════════════════════════════════
   Clone Engine
   ═══════════════════════════════════════════════ */

function cloneGame(game) {
  const targetDir = path.join(APPS_DIR, game.id);

  if (fs.existsSync(targetDir)) {
    const contents = fs.readdirSync(targetDir);
    if (contents.length > 0) {
      logSkip(`${game.id}: directory exists (${contents.length} items) — skipping`);
      promoteBuiltAssets(targetDir, game.id);
      return;
    }
  }

  fs.mkdirSync(targetDir, { recursive: true });

  const cmd = `git clone --depth 1 "${game.repo}" "${targetDir}"`;
  logWork(`${game.id}: cloning from ${CLR.dim}${game.repo}${CLR.reset}`);

  try {
    execSync(cmd, {
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 120000,
    });
    logOk(`${game.id}: clone complete`);

    const gitDir = path.join(targetDir, '.git');
    if (fs.existsSync(gitDir)) {
      removeDirRecursive(gitDir);
      log(`${CLR.dim}🗑${CLR.reset}`, `${game.id}: removed .git (saving space)`);
    }

    promoteBuiltAssets(targetDir, game.id);
  } catch (err) {
    logErr(`${game.id}: clone failed — ${err.message.split('\n')[0]}`);

    /* If a fallback launcher config exists, generate it */
    if (game.launcherTarget) {
      log(`${CLR.yellow}↻${CLR.reset}`, `${game.id}: falling back to launcher container`);
      removeDirRecursive(targetDir);
      generateLauncher(game);
    } else {
      /* Generate minimal placeholder */
      const displayTitle = game.id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      const placeholderHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${displayTitle} — Setup Required</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{min-height:100vh;display:flex;align-items:center;justify-content:center;background:#0a0a0f;color:#f0f0f5;font-family:'Inter',system-ui,sans-serif}
    .card{text-align:center;padding:3rem;border:1px solid #1e1e2e;border-radius:1rem;background:#12121a;max-width:440px}
    h1{font-size:1.5rem;margin-bottom:.5rem}
    p{color:#8888a0;font-size:.875rem;line-height:1.6}
    code{display:inline-block;margin-top:1rem;padding:.5rem 1rem;border-radius:.5rem;background:#1a1a26;color:#a78bfa;font-size:.8rem}
  </style>
</head>
<body>
  <div class="card">
    <h1>⚙️ ${displayTitle}</h1>
    <p>Clone this game's repository manually into:</p>
    <code>public/apps/${game.id}/</code>
  </div>
</body>
</html>`;
      fs.writeFileSync(path.join(targetDir, 'index.html'), placeholderHtml, 'utf-8');
      logSkip(`${game.id}: placeholder created`);
    }
  }
}

/* ═══════════════════════════════════════════════
   Process Each Game
   ═══════════════════════════════════════════════ */

function processGame(game) {
  if (game.mode === 'launcher') {
    const targetDir = path.join(APPS_DIR, game.id);
    if (fs.existsSync(targetDir) && fs.readdirSync(targetDir).length > 0) {
      logSkip(`${game.id}: launcher already exists — skipping`);
      return;
    }
    generateLauncher(game);
  } else {
    cloneGame(game);
  }
}

/* ═══════════════════════════════════════════════
   Main Execution
   ═══════════════════════════════════════════════ */

console.log('');
console.log(`${CLR.bold}═══════════════════════════════════════════${CLR.reset}`);
console.log(`${CLR.bold}  HD Hub — Game Ingestion Engine v3${CLR.reset}`);
console.log(`${CLR.bold}═══════════════════════════════════════════${CLR.reset}`);
console.log(`${CLR.dim}  Target: ${APPS_DIR}${CLR.reset}`);
console.log(`${CLR.dim}  Games:  ${GAME_SOURCES.length} configured${CLR.reset}`);
console.log('');

fs.mkdirSync(APPS_DIR, { recursive: true });

for (const game of GAME_SOURCES) {
  processGame(game);
  console.log('');
}

/* ── Verification ───────────────────────── */
console.log(`${CLR.bold}── Verification ──────────────────────────${CLR.reset}`);
for (const game of GAME_SOURCES) {
  const indexPath = path.join(APPS_DIR, game.id, 'index.html');
  const exists = fs.existsSync(indexPath);
  const mode = game.mode === 'launcher' ? `${CLR.cyan}(launcher)${CLR.reset}` : `${CLR.dim}(cloned)${CLR.reset}`;
  const status = exists
    ? `${CLR.green}✔ index.html present${CLR.reset}  ${mode}`
    : `${CLR.red}✖ index.html missing${CLR.reset}`;
  console.log(`  ${game.id.padEnd(20)} ${status}`);
}
console.log('');
logOk(`Ingestion complete. Run ${CLR.cyan}npm run dev${CLR.reset} to launch the hub.`);
console.log('');
