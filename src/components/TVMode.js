/* ═══════════════════════════════════════════════
   HD Arcade — TV Mode Component v2
   Renders pairing entry numpad, coordinates secure sessions,
   handles heartbeats, drops, and launches games with loading overlays.
   ═══════════════════════════════════════════════ */

import { pairing } from '../services/pairing.js';
import { ControllerManager } from './ControllerManager.js';

let codeBuffer = '';
let activeRoomCode = '';

export const TVMode = {
  render(container) {
    const params = new URLSearchParams(window.location.search);
    const queryCode = params.get('code') || '';
    if (queryCode.length === 4) {
      codeBuffer = queryCode;
    }

    container.innerHTML = `
      <div class="min-h-screen flex flex-col items-center justify-center bg-[var(--color-surface)] px-6 relative overflow-hidden">
        <!-- Interactive background glow -->
        <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(108,92,231,0.08)_0%,transparent_70%)] pointer-events-none"></div>

        <div class="w-full max-w-lg z-10 flex flex-col items-center">
          <div class="text-4xl mb-4">📺</div>
          <h1 class="text-2xl font-bold tracking-tight text-white mb-2">HD Arcade TV Mode</h1>
          <p class="text-xs text-[var(--color-text-secondary)] mb-8 text-center">Enter the 4-digit pairing code shown on your host iPad screen.</p>

          <!-- Code Display -->
          <div class="flex gap-3 mb-8 justify-center">
            <input type="text" readonly id="tv-code-0" class="w-12 h-16 rounded-xl bg-[var(--color-surface-card)] border border-[var(--color-border)] text-center text-3xl font-extrabold text-white select-none pointer-events-none" />
            <input type="text" readonly id="tv-code-1" class="w-12 h-16 rounded-xl bg-[var(--color-surface-card)] border border-[var(--color-border)] text-center text-3xl font-extrabold text-white select-none pointer-events-none" />
            <input type="text" readonly id="tv-code-2" class="w-12 h-16 rounded-xl bg-[var(--color-surface-card)] border border-[var(--color-border)] text-center text-3xl font-extrabold text-white select-none pointer-events-none" />
            <input type="text" readonly id="tv-code-3" class="w-12 h-16 rounded-xl bg-[var(--color-surface-card)] border border-[var(--color-border)] text-center text-3xl font-extrabold text-white select-none pointer-events-none" />
          </div>

          <!-- Numpad keys -->
          <div class="grid grid-cols-3 gap-3 w-72 mb-6">
            ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => `
              <button class="numpad-key focus-target h-12 rounded-xl bg-[var(--color-surface-card)] border border-[var(--color-border)] text-lg font-bold text-white hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-accent)]/50 active:scale-95 transition-all cursor-pointer" data-val="${num}">${num}</button>
            `).join('')}
            <button class="numpad-key focus-target h-12 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-bold text-red-400 hover:bg-red-500/20 active:scale-95 transition-all cursor-pointer" data-val="clear">CLEAR</button>
            <button class="numpad-key focus-target h-12 rounded-xl bg-[var(--color-surface-card)] border border-[var(--color-border)] text-lg font-bold text-white hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-accent)]/50 active:scale-95 transition-all cursor-pointer" data-val="0">0</button>
            <button class="numpad-key focus-target h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs font-bold text-emerald-400 hover:bg-emerald-500/20 active:scale-95 transition-all cursor-pointer" data-val="connect">CONNECT</button>
          </div>

          <!-- Pairing Status details -->
          <div id="tv-pairing-indicator" class="text-xs font-semibold mt-4 text-[var(--color-text-secondary)] flex items-center gap-2">
            <span class="relative flex h-2 w-2">
              <span class="relative inline-flex rounded-full h-2 w-2 bg-gray-500"></span>
            </span>
            <span id="tv-status">Status: Idle</span>
          </div>
        </div>

        <!-- TV Fullscreen Game Player Wrapper -->
        <div id="tv-player-wrap" class="fixed inset-0 bg-black z-[10000] hidden flex-col">
          <!-- Small stealth disconnect header -->
          <div class="absolute top-4 right-4 z-[10001] flex gap-2">
            <button id="tv-btn-disconnect" class="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all text-xs font-semibold cursor-pointer">
              Disconnect TV
            </button>
          </div>

          <!-- TV Loader Sequence Overlay -->
          <div id="tv-loader-seq" class="absolute inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[10002] transition-opacity duration-300">
            <div class="flex flex-col items-center gap-4 text-center max-w-xs animate-fade-in-up">
              <div class="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
              <div>
                <h3 id="tv-loader-title" class="text-white text-base font-bold mb-1">Starting Game...</h3>
                <p id="tv-loader-step" class="text-xs text-[var(--color-text-secondary)] font-mono">Loading assets...</p>
              </div>
            </div>
          </div>

          <!-- Sandbox Game IFrame container -->
          <div class="flex-1 relative overflow-hidden flex items-center justify-center">
            <iframe id="tv-game-iframe" class="absolute border-0 w-full h-full opacity-0 transition-opacity duration-500" sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-pointer-lock" allow="fullscreen; autoplay; clipboard-write"></iframe>
          </div>
        </div>
      </div>
    `;

    this.attachEvents();
    this.updateDisplay();

    ControllerManager.init(true, '');
    
    if (codeBuffer.length === 4) {
      setTimeout(() => this.connect(codeBuffer), 500);
    }
  },

  attachEvents() {
    document.querySelectorAll('.numpad-key').forEach(btn => {
      btn.onclick = () => {
        const val = btn.dataset.val;
        if (val === 'clear') {
          codeBuffer = '';
        } else if (val === 'connect') {
          if (codeBuffer.length === 4) {
            this.connect(codeBuffer);
          } else {
            ControllerManager.showToast('Please enter 4 digits.');
          }
        } else {
          if (codeBuffer.length < 4) {
            codeBuffer += val;
          }
        }
        this.updateDisplay();
      };
    });
  },

  updateDisplay() {
    for (let i = 0; i < 4; i++) {
      const el = document.getElementById(`tv-code-${i}`);
      if (el) el.value = codeBuffer[i] || '';
    }
  },

  connect(code) {
    activeRoomCode = code;
    this.updateConnectionUI('CONNECTING', 0);

    pairing.init(
      code,
      false, // isHost = false
      (message) => {
        if (message.type === 'launch-game') {
          this.launchGame(message);
        } else if (message.type === 'close-game') {
          this.closeGame();
        } else if (message.type === 'gamepad-sync') {
          ControllerManager.injectSimulatedInput(message);
        } else if (message.type === 'host-disconnect') {
          this.disconnect();
          ControllerManager.showToast('🔌 iPad Console disconnected');
        }
      },
      (status, latency) => {
        this.updateConnectionUI(status, latency);
      }
    );
  },

  updateConnectionUI(status, latency) {
    const indicator = document.getElementById('tv-pairing-indicator');
    const statusText = document.getElementById('tv-status');
    if (!indicator || !statusText) return;

    if (status === 'CONNECTING') {
      statusText.textContent = 'CONNECTING TO BROKER...';
      indicator.className = 'text-xs font-semibold mt-4 text-indigo-400 flex items-center gap-2';
    } else if (status === 'WAITING') {
      statusText.textContent = 'WAITING FOR CONSOLE...';
      indicator.className = 'text-xs font-semibold mt-4 text-yellow-400 flex items-center gap-2';
    } else if (status === 'CONNECTED') {
      let latRating = 'Excellent';
      let latColor = 'text-emerald-400';
      if (latency > 120) {
        latRating = 'Poor';
        latColor = 'text-red-400';
      } else if (latency > 50) {
        latRating = 'Good';
        latColor = 'text-yellow-400';
      }
      const latText = latency > 0 ? ` | Latency: ${latency}ms (${latRating})` : ' | Status: Ready';
      statusText.textContent = `CONNECTED TO IPAD${latText}`;
      indicator.className = `text-xs font-semibold mt-4 ${latColor} flex items-center gap-2`;
    } else if (status === 'DISCONNECTED') {
      statusText.textContent = 'DISCONNECTED';
      indicator.className = 'text-xs font-semibold mt-4 text-red-400 flex items-center gap-2';
    } else if (status === 'RECONNECTING') {
      statusText.textContent = 'CONSOLE DISCONNECTED. ATTEMPTING RECONNECT...';
      indicator.className = 'text-xs font-semibold mt-4 text-yellow-500 flex items-center gap-2 animate-pulse';
    }
  },

  launchGame(gameMessage) {
    const playerWrap = document.getElementById('tv-player-wrap');
    const iframe = document.getElementById('tv-game-iframe');
    const loader = document.getElementById('tv-loader-seq');
    const loaderTitle = document.getElementById('tv-loader-title');
    const loaderStep = document.getElementById('tv-loader-step');

    if (!playerWrap || !iframe || !loader) return;

    if (gameMessage.aspect === '16:9') {
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.aspectRatio = '16 / 9';
      iframe.style.objectFit = 'contain';
    } else {
      iframe.style.width = '100%';
      iframe.style.height = '100%';
    }

    loaderTitle.textContent = gameMessage.title;
    loader.classList.remove('opacity-0', 'pointer-events-none');
    loader.classList.add('opacity-100');

    // Run loading sequence stages
    const steps = [
      { text: 'Syncing Session...', delay: 0 },
      { text: 'Allocating Memory buffers...', delay: 600 },
      { text: 'Simulating Gamepads...', delay: 1300 },
      { text: 'Launching Visuals...', delay: 2000 }
    ];

    steps.forEach(s => {
      setTimeout(() => {
        if (loaderStep) loaderStep.textContent = s.text;
      }, s.delay);
    });

    iframe.src = gameMessage.url;
    playerWrap.classList.remove('hidden');
    playerWrap.classList.add('flex');

    iframe.onload = () => {
      setTimeout(() => {
        loader.classList.add('opacity-0', 'pointer-events-none');
        loader.classList.remove('opacity-100');
        iframe.classList.remove('opacity-0');
        iframe.classList.add('opacity-100');
        try {
          iframe.focus();
        } catch (_) {}
      }, 2500);
    };

    document.getElementById('tv-btn-disconnect').onclick = () => {
      this.disconnect();
    };
  },

  closeGame() {
    const playerWrap = document.getElementById('tv-player-wrap');
    const iframe = document.getElementById('tv-game-iframe');
    if (playerWrap) {
      playerWrap.classList.remove('flex');
      playerWrap.classList.add('hidden');
    }
    if (iframe) {
      iframe.src = '';
      iframe.classList.add('opacity-0');
      iframe.classList.remove('opacity-100');
    }
  },

  disconnect() {
    this.closeGame();
    pairing.send({ type: 'tv-disconnect' }, false);
    pairing.disconnect();
    this.updateConnectionUI('DISCONNECTED', 0);
    codeBuffer = '';
    this.updateDisplay();
  }
};
