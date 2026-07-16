/* ═══════════════════════════════════════════════
   HD Arcade — Settings Screen Component
   Manages application mode toggle, button controller test registers,
   and local storage reset utilities.
   ═══════════════════════════════════════════════ */

import { storage } from '../services/storage.js';
import { ControllerManager } from './ControllerManager.js';

let buttonTestInterval = null;

export const Settings = {
  render(container, onBack) {
    const settings = storage.getSettings();
    
    container.innerHTML = `
      <div class="min-h-screen bg-[var(--color-surface)] py-12 px-6 relative overflow-hidden">
        <!-- Dashboard Background Ambient Glow -->
        <div class="absolute top-0 left-1/4 right-1/4 h-[300px] bg-[radial-gradient(circle_at_center,rgba(108,92,231,0.08)_0%,transparent_80%)] pointer-events-none"></div>

        <div class="max-w-3xl mx-auto z-10 relative">
          <!-- Header -->
          <header class="flex items-center justify-between pb-8 border-b border-[var(--color-border)] mb-8">
            <div class="flex items-center gap-3">
              <span class="text-3xl">⚙️</span>
              <div>
                <h1 class="text-2xl font-bold text-white tracking-tight">HD Arcade Settings</h1>
                <p class="text-xs text-[var(--color-text-secondary)]">Manage your console interface options and connected controllers.</p>
              </div>
            </div>
            <button id="btn-settings-back" class="focus-target px-4 py-2 rounded-xl bg-[var(--color-surface-card)] border border-[var(--color-border)] text-xs font-semibold text-white hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-accent)]/50 active:scale-95 transition-all cursor-pointer">
              Go Back
            </button>
          </header>

          <!-- Settings Groups Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            <!-- Group 1: Interface & Library -->
            <div class="flex flex-col gap-6">
              <!-- Mode Selection -->
              <div class="bg-[var(--color-surface-card)] border border-[var(--color-border)] p-6 rounded-2xl">
                <h2 class="text-sm font-bold text-white mb-4 uppercase tracking-wider text-indigo-400">Display Settings</h2>
                <div class="flex flex-col gap-3">
                  <div class="text-xs text-[var(--color-text-secondary)] mb-1">Active Interface Mode:</div>
                  <div class="grid grid-cols-3 gap-2">
                    ${['normal', 'console', 'tv'].map(m => `
                      <button id="mode-btn-${m}" class="focus-target py-2 rounded-xl border text-xs font-semibold uppercase transition-all cursor-pointer ${
                        settings.mode === m 
                          ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white shadow-lg shadow-indigo-500/20' 
                          : 'bg-black/20 border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-white hover:border-[var(--color-accent)]/40'
                      }" data-mode="${m}">${m}</button>
                    `).join('')}
                  </div>
                </div>
              </div>

              <!-- Reset Utilities -->
              <div class="bg-[var(--color-surface-card)] border border-[var(--color-border)] p-6 rounded-2xl">
                <h2 class="text-sm font-bold text-white mb-4 uppercase tracking-wider text-red-400">Library Tools</h2>
                <div class="flex flex-col gap-3">
                  <button id="btn-clear-history" class="focus-target w-full py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-bold text-red-400 hover:bg-red-500/20 active:scale-95 transition-all cursor-pointer">
                    Clear Play History
                  </button>
                  <button id="btn-clear-favorites" class="focus-target w-full py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-bold text-red-400 hover:bg-red-500/20 active:scale-95 transition-all cursor-pointer">
                    Clear Favorites List
                  </button>
                </div>
              </div>
            </div>

            <!-- Group 2: Controller & System -->
            <div class="flex flex-col gap-6">
              <!-- Controller Hardware Test -->
              <div class="bg-[var(--color-surface-card)] border border-[var(--color-border)] p-6 rounded-2xl">
                <h2 class="text-sm font-bold text-white mb-4 uppercase tracking-wider text-emerald-400">Controller Diagnostics</h2>
                
                <div class="flex flex-col gap-3">
                  <div class="text-xs text-[var(--color-text-secondary)]">Detected Controller:</div>
                  <div id="settings-controller-name" class="text-xs font-semibold text-white bg-black/40 border border-[var(--color-border)] p-3 rounded-xl">
                    No physical controller detected. Press any button to pair.
                  </div>

                  <!-- Quick buttons mapping debug visual -->
                  <div class="grid grid-cols-4 gap-2 mt-2">
                    ${['A', 'B', 'LB', 'RB', 'UP', 'DOWN', 'LEFT', 'RIGHT'].map(k => `
                      <span id="btn-debug-${k.toLowerCase()}" class="py-1.5 rounded-lg bg-black/30 border border-[var(--color-border)] text-[10px] font-bold text-center text-white/40 uppercase transition-all select-none">
                        ${k}
                      </span>
                    `).join('')}
                  </div>
                </div>
              </div>

              <!-- System Metadata -->
              <div class="bg-[var(--color-surface-card)] border border-[var(--color-border)] p-6 rounded-2xl">
                <h2 class="text-sm font-bold text-white mb-4 uppercase tracking-wider text-yellow-500">System Info</h2>
                <div class="flex flex-col gap-2 text-xs">
                  <div class="flex justify-between py-1.5 border-b border-[var(--color-border)]/50">
                    <span class="text-[var(--color-text-secondary)]">Arcade Version</span>
                    <span class="text-white font-mono font-semibold">${settings.version}</span>
                  </div>
                  <div class="flex justify-between py-1.5 border-b border-[var(--color-border)]/50">
                    <span class="text-[var(--color-text-secondary)]">PWA Caching</span>
                    <span class="text-emerald-400 font-semibold">Enabled (Offline support)</span>
                  </div>
                  <div class="flex justify-between py-1.5">
                    <span class="text-[var(--color-text-secondary)]">Deployment Target</span>
                    <span class="text-white font-semibold">Vercel Edge</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    `;

    this.attachEvents(onBack);
    this.startDiagnosticsLoop();

    // Auto focus back button
    setTimeout(() => {
      const backBtn = document.getElementById('btn-settings-back');
      if (backBtn) focusCard(backBtn);
    }, 100);
  },

  attachEvents(onBack) {
    const settings = storage.getSettings();

    // Back Button
    document.getElementById('btn-settings-back').onclick = () => {
      this.stopDiagnosticsLoop();
      onBack();
    };

    // Mode toggles
    ['normal', 'console', 'tv'].forEach(mode => {
      const btn = document.getElementById(`mode-btn-${mode}`);
      if (btn) {
        btn.onclick = () => {
          settings.mode = mode;
          storage.saveSettings(settings);
          ControllerManager.showToast(`Display set to: ${mode.toUpperCase()} Mode`);
          
          // Redirect immediately if hashing modes
          if (mode === 'tv') {
            window.location.hash = '#tv';
          } else {
            window.location.hash = '';
          }
        };
      }
    });

    // Clear utils
    document.getElementById('btn-clear-history').onclick = () => {
      storage.clearHistory();
      ControllerManager.showToast('🧹 History wiped clean!');
    };

    document.getElementById('btn-clear-favorites').onclick = () => {
      storage.clearFavorites();
      ControllerManager.showToast('🧹 Favorites list wiped clean!');
    };
  },

  startDiagnosticsLoop() {
    this.stopDiagnosticsLoop();
    const ctrlName = document.getElementById('settings-controller-name');

    buttonTestInterval = setInterval(() => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = gamepads[0];

      if (gp && ctrlName) {
        ctrlName.textContent = gp.id;
        ctrlName.className = 'text-xs font-semibold text-emerald-400 bg-black/40 border border-emerald-500/20 p-3 rounded-xl';

        // Read active buttons mapping
        const keys = {
          a: gp.buttons[0]?.pressed,
          b: gp.buttons[1]?.pressed,
          lb: gp.buttons[4]?.pressed,
          rb: gp.buttons[5]?.pressed,
          up: gp.buttons[12]?.pressed || gp.axes[1] < -0.5,
          down: gp.buttons[13]?.pressed || gp.axes[1] > 0.5,
          left: gp.buttons[14]?.pressed || gp.axes[0] < -0.5,
          right: gp.buttons[15]?.pressed || gp.axes[0] > 0.5
        };

        Object.keys(keys).forEach(k => {
          const el = document.getElementById(`btn-debug-${k}`);
          if (el) {
            if (keys[k]) {
              el.className = 'py-1.5 rounded-lg bg-emerald-500 text-[10px] font-bold text-center text-white uppercase shadow-lg shadow-emerald-500/20';
            } else {
              el.className = 'py-1.5 rounded-lg bg-black/30 border border-[var(--color-border)] text-[10px] font-bold text-center text-white/40 uppercase';
            }
          }
        });
      } else if (ctrlName) {
        ctrlName.textContent = 'No physical controller detected. Press any button to pair.';
        ctrlName.className = 'text-xs font-semibold text-white/50 bg-black/40 border border-[var(--color-border)] p-3 rounded-xl';
      }
    }, 100); // 10Hz poll rate for diagnostics screen
  },

  stopDiagnosticsLoop() {
    if (buttonTestInterval) {
      clearInterval(buttonTestInterval);
      buttonTestInterval = null;
    }
  }
};
