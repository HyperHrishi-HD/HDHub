import './style.css';

/* ═══════════════════════════════════════════════
   HD Arcade — Remote Gaming Platform v4
   PWA offline caching, spatial controller navigations,
   WebRTC low-latency stream broadcasting (iPad to TV).
   ═══════════════════════════════════════════════ */

/* ── DOM Bindings ────────────────────────────── */
const APP_CONTAINER = document.getElementById('app');
const VIEWER = document.getElementById('app-viewer');
const VIEWER_TITLE = document.getElementById('viewer-title');
const VIEWER_IFRAME = document.getElementById('viewer-iframe');
const VIEWER_LOADER = document.getElementById('viewer-loader');
const BTN_FULLSCREEN = document.getElementById('btn-fullscreen');
const BTN_NEWTAB = document.getElementById('btn-newtab');
const BTN_CLOSE = document.getElementById('btn-close-viewer');
const BTN_STREAM = document.getElementById('btn-stream');
const ICON_EXPAND = document.getElementById('icon-expand');
const ICON_COMPRESS = document.getElementById('icon-compress');

/* ── App State Variables ──────────────────────── */
let currentViewerUrl = '';
let isCloaked = false;
let gamesIndex = [];
let peer = null;
let currentCall = null;
let hostStream = null;
let activeConnection = null;
let activeRoomCode = '';

const ORIGINAL_TITLE = document.title;
const ORIGINAL_FAVICON = document.getElementById('dynamic-favicon').href;
const CLOAK_TITLE = 'Classes';
const CLOAK_FAVICON =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">' +
    '<rect width="48" height="48" rx="8" fill="#1a73e8"/>' +
    '<path d="M24 14c-3.3 0-6 2.7-6 6s2.7 6 6 6 6-2.7 6-6-2.7-6-6-6zm0 10c-2.2 0-4-1.8-4-4s1.8-4 4-4 4 1.8 4 4-1.8 4-4 4z" fill="#fff"/>' +
    '<path d="M14 34v-2c0-3.3 4.5-6 10-6s10 2.7 10 6v2H14z" fill="#fff" opacity=".7"/>' +
    '</svg>'
  );

/* ── PWA Service Worker Registration ──────────── */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.warn('SW registration failed:', err);
    });
  });
}

/* ═══════════════════════════════════════════════
   about:blank Tab Cloaking Framework
   ═══════════════════════════════════════════════ */

function openCloakedTab(url, title) {
  const newTab = window.open('about:blank', '_blank');
  if (!newTab) {
    window.open(url, '_blank');
    return;
  }
  const doc = newTab.document;
  doc.open();
  doc.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${CLOAK_TITLE}</title>
  <link rel="icon" href="${CLOAK_FAVICON}">
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; background: #0a0a0f; }
    iframe { position: fixed; inset: 0; width: 100vw; height: 100vh; border: 0; outline: 0; }
  </style>
</head>
<body>
  <iframe
    src="${url}"
    sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-pointer-lock allow-modals"
    allow="fullscreen; autoplay; clipboard-write"
    referrerpolicy="no-referrer"
  ></iframe>
</body>
</html>`);
  doc.close();
}

/* ═══════════════════════════════════════════════
   Branded Gradient Thumbnails (CARD_THEMES)
   ═══════════════════════════════════════════════ */

const CARD_THEMES = {
  'subway-surfers': {
    gradient: 'linear-gradient(135deg, #FFD93D 0%, #FF6B00 100%)',
    glyph: 'S',
    glyphColor: '#fff',
    shadow: 'rgba(255,107,0,0.35)',
  },
  '8-ball-billiards': {
    gradient: 'linear-gradient(135deg, #1a1a2e 0%, #0d7a3e 100%)',
    glyph: '8',
    glyphColor: '#fff',
    shadow: 'rgba(13,122,62,0.35)',
  },
  'geometry-dash': {
    gradient: 'linear-gradient(135deg, #39FF14 0%, #00BCD4 100%)',
    glyph: 'G',
    glyphColor: '#fff',
    shadow: 'rgba(57,255,20,0.3)',
  },
  'eaglercraft': {
    gradient: 'linear-gradient(135deg, #4a7c3f 0%, #2d1b0e 100%)',
    glyph: 'E',
    glyphColor: '#8BC34A',
    shadow: 'rgba(74,124,63,0.3)',
  },
  'gta-vice-city': {
    gradient: 'linear-gradient(135deg, #E040FB 0%, #00BFA5 60%, #1A237E 100%)',
    glyph: 'V',
    glyphColor: '#fff',
    shadow: 'rgba(224,64,251,0.3)',
  },
  'drift-hunters': {
    gradient: 'linear-gradient(135deg, #1f1c2c 0%, #928dab 100%)',
    glyph: 'D',
    glyphColor: '#e040fb',
    shadow: 'rgba(146,141,171,0.35)',
  },
  'youtube': {
    gradient: 'linear-gradient(135deg, #FF0000 0%, #CC0000 100%)',
    glyph: '▶',
    glyphColor: '#fff',
    shadow: 'rgba(255,0,0,0.3)',
    glassmorphism: true,
  },
  'instagram': {
    gradient: 'linear-gradient(135deg, #833AB4 0%, #FD1D1D 50%, #FCB045 100%)',
    glyph: 'IG',
    glyphColor: '#fff',
    shadow: 'rgba(131,58,180,0.3)',
    glassmorphism: true,
  },
  'hdsfd-dashboard': {
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    glyph: 'HD',
    glyphColor: '#fff',
    shadow: 'rgba(102,126,234,0.3)',
    glassmorphism: true,
  },
  'hyperhrishihd': {
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    glyph: 'HH',
    glyphColor: '#fff',
    shadow: 'rgba(245,87,108,0.3)',
    glassmorphism: true,
  },
};

const DEFAULT_THEME = {
  gradient: 'linear-gradient(135deg, var(--color-surface-hover) 0%, var(--color-surface-card) 100%)',
  glyph: '?',
  glyphColor: 'var(--color-text-secondary)',
  shadow: 'transparent',
};

/* ═══════════════════════════════════════════════
   Gamepad spatial navigation controller
   ═══════════════════════════════════════════════ */

let isControllerConnected = false;
let gamepadRAF = null;
let lastButtonState = {};

function focusCard(el) {
  if (!el) return;
  document.querySelectorAll('.card-focused, .focus-element-active').forEach(item => {
    item.classList.remove('card-focused', 'focus-element-active');
  });

  el.classList.add(el.tagName === 'A' ? 'card-focused' : 'focus-element-active');
  el.focus();
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });

  // Update Hero Section context dynamically if focusing a game card on the dashboard
  if (el.tagName === 'A' && el.dataset.itemId) {
    const item = gamesIndex.find(g => g.id === el.dataset.itemId);
    if (item) {
      const heroTitle = document.getElementById('hero-title');
      const heroDesc = document.getElementById('hero-desc');
      const heroBadge = document.getElementById('hero-badge');
      const heroPlayBtn = document.getElementById('hero-play-btn');
      
      if (heroTitle) heroTitle.textContent = item.title;
      if (heroDesc) heroDesc.textContent = item.description || 'Remote Arcade Experience';
      if (heroBadge) {
        heroBadge.textContent = `${item.controls} • ${item.aspect}`;
      }
      if (heroPlayBtn) {
        heroPlayBtn.onclick = () => {
          if (item.iframeBlocked) {
            openCloakedTab(item.url, item.title);
          } else {
            openViewer(item.url, item.title);
          }
        };
      }
    }
  }
}

function navigateSpatial(direction) {
  const active = document.activeElement;
  if (!active || (!active.classList.contains('card-focused') && !active.classList.contains('focus-target') && active.tagName !== 'A' && active.tagName !== 'BUTTON')) {
    const firstCard = document.querySelector('a[data-item-id]');
    if (firstCard) focusCard(firstCard);
    return;
  }

  const activeRect = active.getBoundingClientRect();
  const candidates = Array.from(document.querySelectorAll('a[data-item-id], button.focus-target, .numpad-key')).filter(
    c => c !== active && c.offsetParent !== null
  );

  let bestCandidate = null;
  let bestScore = Infinity;

  candidates.forEach(c => {
    const rect = c.getBoundingClientRect();
    let dx = rect.left + rect.width / 2 - (activeRect.left + activeRect.width / 2);
    let dy = rect.top + rect.height / 2 - (activeRect.top + activeRect.height / 2);

    if (direction === 'left' && dx >= 0) return;
    if (direction === 'right' && dx <= 0) return;
    if (direction === 'up' && dy >= 0) return;
    if (direction === 'down' && dy <= 0) return;

    let distance = Math.sqrt(dx * dx + dy * dy);
    let alignmentScore = 0;
    if (direction === 'left' || direction === 'right') {
      alignmentScore = Math.abs(dy) * 2.5;
    } else {
      alignmentScore = Math.abs(dx) * 2.5;
    }

    let score = distance + alignmentScore;
    if (score < bestScore) {
      bestScore = score;
      bestCandidate = c;
    }
  });

  if (bestCandidate) {
    focusCard(bestCandidate);
  }
}

function startGamepadLoop() {
  function updateGamepad() {
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const gp = gamepads[0];
    if (gp) {
      const buttons = {
        up: gp.buttons[12]?.pressed,
        down: gp.buttons[13]?.pressed,
        left: gp.buttons[14]?.pressed,
        right: gp.buttons[15]?.pressed,
        a: gp.buttons[0]?.pressed,
        b: gp.buttons[1]?.pressed,
        start: gp.buttons[9]?.pressed
      };

      if (buttons.left && !lastButtonState.left) navigateSpatial('left');
      if (buttons.right && !lastButtonState.right) navigateSpatial('right');
      if (buttons.up && !lastButtonState.up) navigateSpatial('up');
      if (buttons.down && !lastButtonState.down) navigateSpatial('down');

      if (buttons.a && !lastButtonState.a) {
        const active = document.activeElement;
        if (active && (active.classList.contains('card-focused') || active.classList.contains('focus-target') || active.classList.contains('numpad-key'))) {
          active.click();
        }
      }
      if (buttons.b && !lastButtonState.b) {
        closeViewer();
      }

      lastButtonState = buttons;
    }
    gamepadRAF = requestAnimationFrame(updateGamepad);
  }
  updateGamepad();
}

window.addEventListener('gamepadconnected', (e) => {
  isControllerConnected = true;
  showToast(`🎮 Controller connected: ${e.gamepad.id}`);
  startGamepadLoop();
});

window.addEventListener('gamepaddisconnected', () => {
  isControllerConnected = false;
  showToast('❌ Controller disconnected');
  if (gamepadRAF) cancelAnimationFrame(gamepadRAF);
});

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'fixed bottom-6 right-6 z-[10000] px-4 py-3 rounded-xl bg-black/80 backdrop-blur-md border border-[var(--color-border)] text-white text-xs font-semibold shadow-2xl flex items-center gap-2 animate-fade-in-up';
  toast.innerHTML = message;
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('opacity-0', 'transition-opacity', 'duration-500');
    setTimeout(() => toast.remove(), 500);
  }, 3500);
}

/* ═══════════════════════════════════════════════
   WebRTC Peer Room Connection System (PeerJS)
   ═══════════════════════════════════════════════ */

function generateRoomCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

async function startHostMode() {
  try {
    // 1. Request Screen Capture stream
    showToast('📺 Requesting iPad screen mirror capture...');
    hostStream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 60 }
      },
      audio: true
    });

    activeRoomCode = generateRoomCode();
    
    // 2. Initialize PeerJS host
    peer = new Peer(`hda-host-${activeRoomCode}`, {
      debug: 1
    });

    peer.on('open', (id) => {
      showHostModal(activeRoomCode);
    });

    peer.on('connection', (conn) => {
      activeConnection = conn;
      conn.on('data', (data) => {
        if (data.type === 'ready') {
          showToast('🔗 TV Connected! Streaming gameplay...');
          const call = peer.call(data.tvId, hostStream);
          currentCall = call;
          updateHostModalStatus('Connected & Streaming in 1080p');
        }
      });
    });

    peer.on('error', (err) => {
      console.error('Peer error:', err);
      showToast('❌ Signaling Server Error. Retrying...');
    });

    // Handle track stop event
    hostStream.getVideoTracks()[0].onended = () => {
      stopHostMode();
    };

  } catch (err) {
    console.error('Screen capture failed:', err);
    showToast('❌ Screen capture permission denied');
  }
}

function stopHostMode() {
  if (hostStream) {
    hostStream.getTracks().forEach(track => track.stop());
    hostStream = null;
  }
  if (currentCall) {
    currentCall.close();
    currentCall = null;
  }
  if (peer) {
    peer.destroy();
    peer = null;
  }
  hideHostModal();
  showToast('🔌 Stream stopped');
}

function showHostModal(code) {
  let modal = document.getElementById('host-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'host-modal';
    modal.className = 'fixed inset-0 z-[10000] flex items-center justify-center bg-black/85 backdrop-blur-md';
    document.body.appendChild(modal);
  }

  const url = `${window.location.origin}/#tv`;

  modal.innerHTML = `
    <div class="bg-[var(--color-surface-card)] border border-[var(--color-border)] p-8 rounded-3xl max-w-md w-full mx-4 shadow-2xl text-center">
      <div class="text-indigo-400 text-4xl mb-4">📺</div>
      <h2 class="text-xl font-bold text-white mb-2">Host Mode Streaming</h2>
      <p class="text-xs text-[var(--color-text-secondary)] mb-6 leading-relaxed">
        Open this dashboard link on your Google TV:
        <br><span class="text-indigo-300 font-mono select-all text-sm font-semibold">${url}</span>
      </p>
      
      <div class="text-[var(--color-text-secondary)] text-xs mb-2">Enter this Pairing Code:</div>
      <div class="flex justify-center gap-2 mb-6">
        ${code.split('').map(digit => `<span class="w-12 h-16 rounded-xl bg-black/60 border border-[var(--color-border)] flex items-center justify-center text-white text-3xl font-extrabold">${digit}</span>`).join('')}
      </div>

      <div class="text-xs text-emerald-400 font-semibold mb-6 flex items-center justify-center gap-2">
        <span class="relative flex h-2 w-2">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
        <span id="host-status-text">Waiting for Google TV to pair...</span>
      </div>

      <button id="btn-stop-host" class="w-full py-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-all text-xs font-semibold cursor-pointer">
        Stop Stream & Disconnect
      </button>
    </div>
  `;

  document.getElementById('btn-stop-host').onclick = stopHostMode;
}

function updateHostModalStatus(status) {
  const el = document.getElementById('host-status-text');
  if (el) el.textContent = status;
}

function hideHostModal() {
  const modal = document.getElementById('host-modal');
  if (modal) modal.remove();
}

/* ═══════════════════════════════════════════════
   TV Mode (Display Client Page)
   ═══════════════════════════════════════════════ */

let tvCodeBuffer = '';

function renderTVMode() {
  document.title = 'HD Arcade TV Mode';
  APP_CONTAINER.innerHTML = `
    <div class="min-h-screen flex flex-col items-center justify-center bg-[var(--color-surface)] px-6 relative">
      <!-- TV mode background grid visual -->
      <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(108,92,231,0.08)_0%,transparent_70%)] pointer-events-none"></div>

      <div class="w-full max-w-lg z-10 flex flex-col items-center">
        <div class="text-4xl mb-4">👾</div>
        <h1 class="text-2xl font-bold tracking-tight text-white mb-2">HD Arcade TV Mode</h1>
        <p class="text-xs text-[var(--color-text-secondary)] mb-8 text-center">Enter the 4-digit pairing code shown on your host iPad screen.</p>

        <!-- Code inputs display -->
        <div class="flex gap-3 mb-8 justify-center">
          <input type="text" readonly id="tv-code-0" class="w-12 h-16 rounded-xl bg-[var(--color-surface-card)] border border-[var(--color-border)] text-center text-3xl font-extrabold text-white select-none pointer-events-none" />
          <input type="text" readonly id="tv-code-1" class="w-12 h-16 rounded-xl bg-[var(--color-surface-card)] border border-[var(--color-border)] text-center text-3xl font-extrabold text-white select-none pointer-events-none" />
          <input type="text" readonly id="tv-code-2" class="w-12 h-16 rounded-xl bg-[var(--color-surface-card)] border border-[var(--color-border)] text-center text-3xl font-extrabold text-white select-none pointer-events-none" />
          <input type="text" readonly id="tv-code-3" class="w-12 h-16 rounded-xl bg-[var(--color-surface-card)] border border-[var(--color-border)] text-center text-3xl font-extrabold text-white select-none pointer-events-none" />
        </div>

        <!-- Numeric keypad grid -->
        <div class="grid grid-cols-3 gap-3 w-72 mb-6">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => `
            <button class="numpad-key focus-target h-12 rounded-xl bg-[var(--color-surface-card)] border border-[var(--color-border)] text-lg font-bold text-white hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-accent)]/50 active:scale-95 transition-all cursor-pointer" data-val="${num}">${num}</button>
          `).join('')}
          <button class="numpad-key focus-target h-12 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-bold text-red-400 hover:bg-red-500/20 active:scale-95 transition-all cursor-pointer" data-val="clear">CLEAR</button>
          <button class="numpad-key focus-target h-12 rounded-xl bg-[var(--color-surface-card)] border border-[var(--color-border)] text-lg font-bold text-white hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-accent)]/50 active:scale-95 transition-all cursor-pointer" data-val="0">0</button>
          <button class="numpad-key focus-target h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 active:scale-95 transition-all cursor-pointer" data-val="connect">CONNECT</button>
        </div>

        <div id="tv-status" class="text-xs text-[var(--color-text-secondary)] font-semibold mt-4">Status: Idle</div>
      </div>

      <!-- TV Video Stream Layer (Hidden) -->
      <div id="tv-video-wrap" class="fixed inset-0 bg-black z-[10000] hidden items-center justify-center">
        <video id="tv-video-stream" class="w-full h-full object-contain" autoplay playsinline muted></video>
        <!-- Stream controls -->
        <button id="tv-btn-disconnect" class="absolute top-4 right-4 z-[10001] px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all text-xs font-semibold cursor-pointer">
          Disconnect
        </button>
      </div>
    </div>
  `;

  // Attach numpad clicks
  document.querySelectorAll('.numpad-key').forEach(btn => {
    btn.onclick = () => {
      const val = btn.dataset.val;
      if (val === 'clear') {
        tvCodeBuffer = '';
      } else if (val === 'connect') {
        if (tvCodeBuffer.length === 4) {
          connectToHost(tvCodeBuffer);
        } else {
          showToast('❌ Please enter a 4-digit code first');
        }
      } else {
        if (tvCodeBuffer.length < 4) {
          tvCodeBuffer += val;
        }
      }
      updateTVCodeDisplay();
    };
  });

  // Automatically focus the first numeric key
  const firstKey = document.querySelector('.numpad-key');
  if (firstKey) focusCard(firstKey);
}

function updateTVCodeDisplay() {
  for (let i = 0; i < 4; i++) {
    const el = document.getElementById(`tv-code-${i}`);
    if (el) {
      el.value = tvCodeBuffer[i] || '';
    }
  }
}

function connectToHost(code) {
  const statusEl = document.getElementById('tv-status');
  statusEl.textContent = `Connecting to Host Mode [${code}]...`;
  statusEl.className = 'text-xs text-indigo-400 font-semibold mt-4';

  const tvPeerId = `hda-tv-${Math.floor(1000 + Math.random() * 9000)}`;
  peer = new Peer(tvPeerId, {
    debug: 1
  });

  peer.on('open', () => {
    // Open control data connection
    const conn = peer.connect(`hda-host-${code}`);
    activeConnection = conn;

    conn.on('open', () => {
      // Notify host that TV is open and ready to receive media stream call
      conn.send({ type: 'ready', tvId: tvPeerId });
    });

    conn.on('close', () => {
      handleTVDisconnect();
      showToast('🔌 Connection closed by host');
    });

    conn.on('error', (err) => {
      statusEl.textContent = 'Connection Error';
      statusEl.className = 'text-xs text-red-400 font-semibold mt-4';
    });
  });

  peer.on('call', (call) => {
    currentCall = call;
    call.answer(); // Answer the media call

    call.on('stream', (remoteStream) => {
      showToast('📺 Mirror Stream Connected!');
      const videoWrap = document.getElementById('tv-video-wrap');
      const video = document.getElementById('tv-video-stream');
      
      videoWrap.classList.remove('hidden');
      videoWrap.classList.add('flex');
      video.srcObject = remoteStream;

      video.play().catch(e => {
        showToast('🔊 Click stream to enable audio');
      });

      document.getElementById('tv-btn-disconnect').onclick = () => {
        handleTVDisconnect();
      };
    });
  });

  peer.on('error', (err) => {
    console.error(err);
    statusEl.textContent = 'Signaling Failed';
    statusEl.className = 'text-xs text-red-400 font-semibold mt-4';
  });
}

function handleTVDisconnect() {
  if (currentCall) {
    currentCall.close();
    currentCall = null;
  }
  if (peer) {
    peer.destroy();
    peer = null;
  }
  const videoWrap = document.getElementById('tv-video-wrap');
  if (videoWrap) {
    videoWrap.classList.remove('flex');
    videoWrap.classList.add('hidden');
  }
  const statusEl = document.getElementById('tv-status');
  if (statusEl) {
    statusEl.textContent = 'Disconnected';
    statusEl.className = 'text-xs text-red-400 font-semibold mt-4';
  }
  tvCodeBuffer = '';
  updateTVCodeDisplay();
}

/* ═══════════════════════════════════════════════
   Card Builder & Dashboard Redesign (Console UI)
   ═══════════════════════════════════════════════ */

function buildGradientFallback(item) {
  const theme = CARD_THEMES[item.id] || DEFAULT_THEME;
  const isGlass = theme.glassmorphism === true;

  const wrapper = document.createElement('div');
  wrapper.className = 'w-full h-full flex items-center justify-center select-none relative';
  wrapper.style.background = theme.gradient;

  if (isGlass) {
    const glass = document.createElement('div');
    glass.className = 'flex items-center justify-center rounded-xl';
    glass.style.cssText =
      'width:64px;height:64px;background:rgba(255,255,255,0.12);' +
      'backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);' +
      'border:1px solid rgba(255,255,255,0.18);border-radius:1rem;';

    const glyph = document.createElement('span');
    glyph.style.cssText = `font-size:1.5rem;font-weight:800;color:${theme.glyphColor};letter-spacing:-0.02em;`;
    glyph.textContent = theme.glyph;
    glass.appendChild(glyph);
    wrapper.appendChild(glass);
  } else {
    const glyph = document.createElement('span');
    glyph.style.cssText =
      `font-size:3rem;font-weight:900;color:${theme.glyphColor};` +
      'text-shadow:0 2px 12px rgba(0,0,0,0.3);letter-spacing:-0.03em;';
    glyph.textContent = theme.glyph;
    wrapper.appendChild(glyph);
  }

  return wrapper;
}

function createCard(item, index) {
  const card = document.createElement('a');
  card.href = item.url;
  card.id = `card-${item.id}`;
  card.dataset.itemId = item.id;
  card.rel = 'noopener noreferrer';

  const theme = CARD_THEMES[item.id] || DEFAULT_THEME;

  card.className =
    'group card-element card-enter glow-border block rounded-2xl overflow-hidden ' +
    'bg-[var(--color-surface-card)] border border-[var(--color-border)] ' +
    'transition-all duration-300 hover:bg-[var(--color-surface-hover)] ' +
    'hover:-translate-y-1 hover:shadow-xl ' +
    'focus:outline-none';
  card.style.animationDelay = `${index * 60}ms`;
  card.style.setProperty('--card-shadow', theme.shadow);

  // Keyboard focus listener for visual focus class matching gamepad navigation
  card.onfocus = () => {
    focusCard(card);
  };

  /* ── Thumbnail Area ────────────────────────── */
  const imgWrap = document.createElement('div');
  imgWrap.className = 'relative aspect-video overflow-hidden';

  const img = document.createElement('img');
  img.src = item.thumbnail;
  img.alt = item.title;
  img.loading = 'lazy';
  img.className =
    'w-full h-full object-cover transition-transform duration-500 group-hover:scale-105';

  img.onerror = function () {
    this.remove();
    const fallback = buildGradientFallback(item);
    imgWrap.appendChild(fallback);
  };

  img.onload = function () {
    imgWrap.classList.remove('shimmer');
  };

  imgWrap.classList.add('shimmer');
  imgWrap.appendChild(img);

  /* ── External Icon Overlay ─────────────────── */
  if (item.external) {
    const ext = document.createElement('div');
    ext.className =
      'absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 backdrop-blur-sm text-white/70 z-10';
    ext.innerHTML =
      '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>' +
      '<polyline points="15 3 21 3 21 9"/>' +
      '<line x1="10" y1="14" x2="21" y2="3"/></svg>';
    imgWrap.appendChild(ext);
  }

  /* ── Info Row ──────────────────────────────── */
  const info = document.createElement('div');
  info.className = 'flex items-center justify-between gap-2 px-4 py-3';

  const title = document.createElement('h3');
  title.className = 'text-sm font-medium text-[var(--color-text-primary)] truncate';
  title.textContent = item.title;

  info.appendChild(title);
  info.appendChild(createCategoryBadge(item.category));

  card.appendChild(imgWrap);
  card.appendChild(info);
  return card;
}

/* ═══════════════════════════════════════════════
   Viewer — Open / Close / Fullscreen
   ═══════════════════════════════════════════════ */

function openViewer(url, title) {
  currentViewerUrl = url;
  VIEWER_TITLE.textContent = title;

  VIEWER_LOADER.classList.remove('opacity-0', 'pointer-events-none');
  VIEWER_LOADER.classList.add('opacity-100');

  VIEWER_IFRAME.src = url;
  VIEWER_IFRAME.onload = function () {
    VIEWER_LOADER.classList.add('opacity-0', 'pointer-events-none');
    VIEWER_LOADER.classList.remove('opacity-100');
    // Ensure the iframe receives focus so local gamepad controls connect natively
    try {
      VIEWER_IFRAME.focus();
    } catch (_) {}
  };

  VIEWER.classList.remove('opacity-0', 'pointer-events-none');
  VIEWER.classList.add('opacity-100', 'pointer-events-auto');
  VIEWER.setAttribute('aria-hidden', 'false');

  document.body.style.overflow = 'hidden';
}

function closeViewer() {
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  }

  VIEWER.classList.remove('opacity-100', 'pointer-events-auto');
  VIEWER.classList.add('opacity-0', 'pointer-events-none');
  VIEWER.setAttribute('aria-hidden', 'true');

  setTimeout(() => {
    VIEWER_IFRAME.src = 'about:blank';
    VIEWER_IFRAME.onload = null;
    currentViewerUrl = '';
  }, 320);

  document.body.style.overflow = '';
}

function toggleFullscreen() {
  const container = VIEWER;
  if (!document.fullscreenElement && !document.webkitFullscreenElement) {
    if (container.requestFullscreen) {
      container.requestFullscreen().catch((err) => {
        console.warn('Fullscreen denied:', err.message);
      });
    } else if (container.webkitRequestFullscreen) {
      container.webkitRequestFullscreen();
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
  }
}

function onFullscreenChange() {
  const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
  ICON_EXPAND.classList.toggle('hidden', isFs);
  ICON_COMPRESS.classList.toggle('hidden', !isFs);
}
document.addEventListener('fullscreenchange', onFullscreenChange);
document.addEventListener('webkitfullscreenchange', onFullscreenChange);

BTN_CLOSE.addEventListener('click', closeViewer);
BTN_FULLSCREEN.addEventListener('click', toggleFullscreen);

BTN_NEWTAB.addEventListener('click', (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (currentViewerUrl) {
    openCloakedTab(currentViewerUrl, VIEWER_TITLE.textContent);
  }
});

// Host mode trigger click
BTN_STREAM.onclick = (e) => {
  e.preventDefault();
  e.stopPropagation();
  startHostMode();
};

/* ═══════════════════════════════════════════════
   Stealth Mode — Tab Cloaking
   ═══════════════════════════════════════════════ */

function initCloak() {
  if (isCloaked) {
    document.title = ORIGINAL_TITLE;
    document.getElementById('dynamic-favicon').href = ORIGINAL_FAVICON;
    isCloaked = false;
  } else {
    document.title = CLOAK_TITLE;
    document.getElementById('dynamic-favicon').href = CLOAK_FAVICON;
    isCloaked = true;
  }
}

window.initCloak = initCloak;

document.addEventListener('keydown', (e) => {
  if (e.key === '`') {
    e.preventDefault();
    initCloak();
    return;
  }
  if (e.key === 'Escape') {
    const viewerOpen = !VIEWER.classList.contains('pointer-events-none');
    if (viewerOpen) {
      closeViewer();
    } else {
      initCloak();
    }
    return;
  }
});

/* ═══════════════════════════════════════════════
   Smart Card Clicks Interceptor
   ═══════════════════════════════════════════════ */

function handleCardClick(e) {
  const card = e.target.closest('a[data-item-id]');
  if (!card) return;
  e.preventDefault();
  e.stopPropagation();

  const itemId = card.dataset.itemId;
  const item = gamesIndex.find((g) => g.id === itemId);
  if (!item) return;

  if (item.iframeBlocked) {
    openCloakedTab(item.url, item.title);
    return;
  }

  openViewer(item.url, item.title);
}

function attachCardClickHandlers() {
  const grid = document.getElementById('card-grid');
  if (!grid) return;
  grid.removeEventListener('click', handleCardClick);
  grid.addEventListener('click', handleCardClick);
}

/* ═══════════════════════════════════════════════
   Dashboard Render — Netflix / Console Dashboard Redesign
   ═══════════════════════════════════════════════ */

function filterCards(filter, games) {
  const grid = document.getElementById('card-grid');
  const buttons = document.querySelectorAll('#filter-bar button');
  buttons.forEach((btn) => {
    const isActive = btn.id === `filter-${filter}`;
    btn.className = `px-4 py-1.5 text-xs font-medium rounded-full border transition-colors duration-200 cursor-pointer ${
      isActive
        ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white'
        : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]/50 hover:text-[var(--color-text-primary)]'
    }`;
  });
  grid.innerHTML = '';
  const filtered =
    filter === 'all'
      ? games
      : games.filter((g) =>
          filter === 'games' ? g.category === 'game' : g.category === 'app'
        );
  filtered.forEach((item, i) => grid.appendChild(createCard(item, i)));
  attachCardClickHandlers();
}

async function renderDashboard() {
  // Check Mode dispatcher based on hash route
  if (window.location.hash === '#tv') {
    renderTVMode();
    return;
  }

  try {
    const res = await fetch('/games.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    gamesIndex = data.games;

    const featuredGame = gamesIndex.find(g => g.id === 'drift-hunters') || gamesIndex[0];

    /* ── Render Console Dashboard layout ── */
    APP_CONTAINER.innerHTML = `
      <div class="min-h-screen pb-16 relative">
        <!-- Dashboard Background Ambient Glow -->
        <div class="absolute top-0 left-1/4 right-1/4 h-[300px] bg-[radial-gradient(circle_at_center,rgba(108,92,231,0.15)_0%,transparent_80%)] pointer-events-none"></div>

        <!-- ── Premium Console Navigation Header ── -->
        <header class="flex items-center justify-between px-6 py-4 bg-[var(--color-surface-card)]/40 backdrop-blur-md border-b border-[var(--color-border)] sticky top-0 z-50">
          <div class="flex items-center gap-3">
            <span class="text-xl">🕹️</span>
            <span class="text-base font-bold tracking-tight text-white">HD Arcade</span>
          </div>
          
          <div class="flex items-center gap-3">
            <!-- TV Mode quick launcher -->
            <a href="#tv" class="focus-target px-4 py-1.5 text-xs font-semibold rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20 transition-all flex items-center gap-1.5">
              <span>📺</span> Connect TV
            </a>
          </div>
        </header>

        <!-- ── Hero Cinematic Featured Banner (Xbox Style) ── -->
        <section id="hero-banner" class="max-w-7xl mx-auto px-6 pt-8 pb-4">
          <div class="relative w-full aspect-[21/9] sm:aspect-[2.4/1] rounded-3xl overflow-hidden bg-gradient-to-r from-black/85 via-black/40 to-transparent border border-[var(--color-border)] shadow-2xl flex items-center">
            
            <!-- Hero Background Ambient Wallpaper -->
            <div class="absolute inset-0 bg-cover bg-center mix-blend-overlay opacity-40 transition-all duration-700" style="background-image: url('${featuredGame.thumbnail}');"></div>
            
            <!-- Hero Description Overlay Content -->
            <div class="relative z-10 pl-8 pr-6 max-w-lg">
              <span id="hero-badge" class="inline-block px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/30 text-indigo-300 mb-4">
                ${featuredGame.controls} • ${featuredGame.aspect}
              </span>
              <h1 id="hero-title" class="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
                ${featuredGame.title}
              </h1>
              <p id="hero-desc" class="text-xs text-[var(--color-text-secondary)] leading-relaxed mb-6 line-clamp-2">
                ${featuredGame.description || 'Experience high-fidelity browser gaming.'}
              </p>
              
              <div class="flex gap-3">
                <button id="hero-play-btn" class="focus-target px-6 py-2.5 rounded-xl bg-white text-black font-bold text-xs hover:scale-105 transition-all shadow-lg shadow-white/10 cursor-pointer">
                  ▶ Play Now
                </button>
                <button id="hero-stream-btn" class="focus-target px-5 py-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-bold text-xs hover:bg-indigo-500/30 transition-all cursor-pointer">
                  📺 Host Stream
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- ── Games Filter Navigation ── -->
        <nav id="filter-bar" class="flex items-center justify-start max-w-7xl mx-auto px-6 py-4 gap-2">
          <div class="text-[var(--color-text-secondary)] text-xs font-semibold uppercase tracking-wider mr-4">Filter:</div>
          ['All', 'Games', 'Apps'].forEach(label => ... handled dynamically ...
        </nav>

        <!-- ── Large Grid Cards Row ── -->
        <main id="card-grid" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 px-6 max-w-7xl mx-auto"></main>
      </div>
    `;

    // Redraw filter bar dynamically
    const filterBar = document.getElementById('filter-bar');
    filterBar.innerHTML = '<div class="text-[var(--color-text-secondary)] text-xs font-bold uppercase tracking-wider mr-4">Filter:</div>';
    ['All', 'Games', 'Apps'].forEach((label) => {
      const btn = document.createElement('button');
      btn.id = `filter-${label.toLowerCase()}`;
      btn.className = 'focus-target px-4 py-1.5 text-xs font-medium rounded-full border transition-colors duration-200 cursor-pointer';
      btn.textContent = label;
      btn.addEventListener('click', () => filterCards(label.toLowerCase(), gamesIndex));
      filterBar.appendChild(btn);
    });

    // Populate grid
    const grid = document.getElementById('card-grid');
    gamesIndex.forEach((item, i) => grid.appendChild(createCard(item, i)));

    // Bind Hero Host Stream Button
    document.getElementById('hero-stream-btn').onclick = () => {
      startHostMode();
    };

    // Bind Hero Play Button
    document.getElementById('hero-play-btn').onclick = () => {
      if (featuredGame.iframeBlocked) {
        openCloakedTab(featuredGame.url, featuredGame.title);
      } else {
        openViewer(featuredGame.url, featuredGame.title);
      }
    };

    filterCards('all', gamesIndex);
    attachCardClickHandlers();

    // Auto-focus first card on load if controller is already connected
    setTimeout(() => {
      const firstCard = document.querySelector('a[data-item-id]');
      if (firstCard) focusCard(firstCard);
    }, 300);

  } catch (err) {
    console.error('Failed to load dashboard:', err);
    APP_CONTAINER.innerHTML =
      '<div class="flex items-center justify-center h-screen text-[var(--color-text-secondary)]">' +
      '<p>Failed to load dashboard. Check console.</p></div>';
  }
}

/* ── Hash Route Listener Mode Dispatcher ─────── */
window.addEventListener('hashchange', () => {
  // Clear any active PeerJS connections to release network resources on navigation
  handleTVDisconnect();
  stopHostMode();
  renderDashboard();
});

/* ═══════════════════════════════════════════════
   Init
   ═══════════════════════════════════════════════ */

renderDashboard();
