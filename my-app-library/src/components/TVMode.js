/* ═══════════════════════════════════════════════
   HD Arcade — TV Mode Component
   Displays numerical pairing pad, handles MQTT connection,
   auto-reconnect, and launches games with simulated gamepad inputs.
   ═══════════════════════════════════════════════ */

import { pairing } from '../services/pairing.js';
import { ControllerManager } from './ControllerManager.js';
import { storage } from '../services/storage.js';

let codeBuffer = '';
let activeRoomCode = '';

export const TVMode = {
  render(container) {
    // If QR code scanned with a URL parameter ?code=XXXX, auto-fill it!
    const params = new URLSearchParams(window.location.search);
    const queryCode = params.get('code') || '';
    if (queryCode.length === 4) {
      codeBuffer = queryCode;
    }

    container.innerHTML = `
      <div class="min-h-screen flex flex-col items-center justify-center bg-[var(--color-surface)] px-6 relative overflow-hidden">
        <!-- Interactive ambient glow -->
        <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(108,92,231,0.08)_0%,transparent_70%)] pointer-events-none"></div>

        <div class="w-full max-w-lg z-10 flex flex-col items-center">
          <div class="text-4xl mb-4">📺</div>
          <h1 class="text-2xl font-bold tracking-tight text-white mb-2">HD Arcade TV Mode</h1>
          <p class="text-xs text-[var(--color-text-secondary)] mb-8 text-center">Enter the 4-digit pairing code shown on your host iPad screen.</p>

          <!-- Pairing code output display -->
          <div class="flex gap-3 mb-8 justify-center">
            <input type="text" readonly id="tv-code-0" class="w-12 h-16 rounded-xl bg-[var(--color-surface-card)] border border-[var(--color-border)] text-center text-3xl font-extrabold text-white select-none pointer-events-none" />
            <input type="text" readonly id="tv-code-1" class="w-12 h-16 rounded-xl bg-[var(--color-surface-card)] border border-[var(--color-border)] text-center text-3xl font-extrabold text-white select-none pointer-events-none" />
            <input type="text" readonly id="tv-code-2" class="w-12 h-16 rounded-xl bg-[var(--color-surface-card)] border border-[var(--color-border)] text-center text-3xl font-extrabold text-white select-none pointer-events-none" />
            <input type="text" readonly id="tv-code-3" class="w-12 h-16 rounded-xl bg-[var(--color-surface-card)] border border-[var(--color-border)] text-center text-3xl font-extrabold text-white select-none pointer-events-none" />
          </div>

          <!-- Numeric Numpad -->
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

        <!-- TV Fullscreen Game Player Wrapper -->
        <div id="tv-player-wrap" class="fixed inset-0 bg-black z-[10000] hidden flex-col">
          <!-- Small stealth disconnect header -->
          <div class="absolute top-4 right-4 z-[10001] flex gap-2">
            <button id="tv-btn-disconnect" class="px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/30 text-red-400 hover:bg-red-500/30 transition-all text-xs font-semibold cursor-pointer">
              Disconnect TV Mode
            </button>
          </div>

          <!-- Sandbox Game IFrame container -->
          <div class="flex-1 relative overflow-hidden flex items-center justify-center">
            <iframe id="tv-game-iframe" class="absolute border-0 w-full h-full" sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-pointer-lock" allow="fullscreen; autoplay; clipboard-write"></iframe>
          </div>
        </div>
      </div>
    `;

    this.attachEvents();
    this.updateDisplay();

    // Initialize controller support for TV Page numpad navigation
    ControllerManager.init(true, '');
    
    // Auto-fill query code if present
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
    const statusEl = document.getElementById('tv-status');
    if (statusEl) {
      statusEl.textContent = 'Connecting...';
      statusEl.className = 'text-xs text-indigo-400 font-semibold mt-4';
    }

    pairing.init(
      code,
      false, // isHost = false
      (message) => {
        // Handle incoming sync events from Host iPad
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
      (status) => {
        if (status === 'connected') {
          if (statusEl) {
            statusEl.textContent = 'CONNECTED | Device: iPad Console | Status: Ready';
            statusEl.className = 'text-xs text-emerald-400 font-semibold mt-4';
          }
          ControllerManager.showToast('🔗 TV Connected to iPad Host!');
        } else if (status === 'offline' || status === 'error') {
          if (statusEl) {
            statusEl.textContent = 'Signaling lost - Reconnecting...';
            statusEl.className = 'text-xs text-red-400 font-semibold mt-4';
          }
        }
      }
    );
  },

  launchGame(gameMessage) {
    const playerWrap = document.getElementById('tv-player-wrap');
    const iframe = document.getElementById('tv-game-iframe');
    if (!playerWrap || !iframe) return;

    // Apply aspect ratios scaling object-fit: contain without stretching
    if (gameMessage.aspect === '16:9') {
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.aspectRatio = '16 / 9';
      iframe.style.objectFit = 'contain';
    } else {
      iframe.style.width = '100%';
      iframe.style.height = '100%';
    }

    iframe.src = gameMessage.url;
    playerWrap.classList.remove('hidden');
    playerWrap.classList.add('flex');

    // Force periodic iframe focus for native controller polling inside the iframe
    iframe.onload = () => {
      try {
        iframe.focus();
      } catch (_) {}
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
    }
  },

  disconnect() {
    this.closeGame();
    pairing.send({ type: 'tv-disconnect' }, false);
    pairing.disconnect();
    
    const statusEl = document.getElementById('tv-status');
    if (statusEl) {
      statusEl.textContent = 'Disconnected';
      statusEl.className = 'text-xs text-red-500 font-semibold mt-4';
    }
    codeBuffer = '';
    this.updateDisplay();
  }
};
