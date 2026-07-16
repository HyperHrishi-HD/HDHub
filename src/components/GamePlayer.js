/* ═══════════════════════════════════════════════
   HD Arcade — GamePlayer Component
   Handles fullscreen iframe embeds, loading states, 16:9 ratio,
   and automatic history & playtime tracking.
   ═══════════════════════════════════════════════ */

import { storage } from '../services/storage.js';

let activePlaytimeTimer = null;
let activeGameId = '';

export const GamePlayer = {
  open(item, isHost = false) {
    activeGameId = item.id;

    const viewer = document.getElementById('app-viewer');
    const titleEl = document.getElementById('viewer-title');
    const iframe = document.getElementById('viewer-iframe');
    const loader = document.getElementById('viewer-loader');
    const btnNewTab = document.getElementById('btn-newtab');

    if (!viewer || !iframe || !loader) return;

    titleEl.textContent = item.title;
    if (btnNewTab) btnNewTab.dataset.url = item.url;

    // Scale options
    const wrap = document.getElementById('viewer-iframe-wrap');
    if (wrap) {
      wrap.className = 'flex-1 relative overflow-hidden flex items-center justify-center bg-black';
      iframe.className = 'absolute border-0 max-w-full max-h-full opacity-0 transition-opacity duration-500';
      
      if (item.aspect === '16:9') {
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.aspectRatio = '16 / 9';
        iframe.style.objectFit = 'contain';
      } else {
        iframe.style.width = '100%';
        iframe.style.height = '100%';
      }
    }

    // Dynamic Loader Progress States
    loader.classList.remove('opacity-0', 'pointer-events-none');
    loader.classList.add('opacity-100');

    // Create steps layout inside loader
    loader.innerHTML = `
      <div class="flex flex-col items-center gap-4 text-center animate-fade-in-up">
        <div class="w-12 h-12 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
        <div>
          <h3 class="text-white text-base font-bold mb-1">${item.title}</h3>
          <p id="viewer-load-step" class="text-xs text-[var(--color-text-secondary)] font-mono">Starting Game...</p>
        </div>
      </div>
    `;

    const steps = [
      { text: 'Starting Game...', delay: 0 },
      { text: 'Loading Assets...', delay: 600 },
      { text: 'Configuring Controller...', delay: 1300 },
      { text: 'Launching Core Runtime...', delay: 2000 }
    ];

    steps.forEach(s => {
      setTimeout(() => {
        const stepEl = document.getElementById('viewer-load-step');
        if (stepEl && activeGameId === item.id) {
          stepEl.textContent = s.text;
        }
      }, s.delay);
    });

    storage.addRecentlyPlayed(item.id);

    // Set source URL
    iframe.src = item.url;
    iframe.onload = () => {
      // Delay iframe display until minimum launch sequence completes (2.4s)
      setTimeout(() => {
        if (activeGameId !== item.id) return;
        loader.classList.add('opacity-0', 'pointer-events-none');
        loader.classList.remove('opacity-100');
        iframe.classList.remove('opacity-0');
        iframe.classList.add('opacity-100');
        try {
          iframe.focus();
        } catch (_) {}
      }, 2500);
    };

    this.startPlaytimeTracking(item.id);

    viewer.classList.remove('opacity-0', 'pointer-events-none');
    viewer.classList.add('opacity-100', 'pointer-events-auto');
    viewer.setAttribute('aria-hidden', 'false');

    document.body.style.overflow = 'hidden';
  },

  close() {
    this.stopPlaytimeTracking();

    const viewer = document.getElementById('app-viewer');
    if (!viewer) return;

    if (document.fullscreenElement || document.webkitFullscreenElement) {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      }
    }

    viewer.classList.remove('opacity-100', 'pointer-events-auto');
    viewer.classList.add('opacity-0', 'pointer-events-none');
    viewer.setAttribute('aria-hidden', 'true');

    // Release memory and destroy active iframe context
    setTimeout(() => {
      const iframe = document.getElementById('viewer-iframe');
      if (iframe) {
        iframe.src = 'about:blank';
        iframe.onload = null;
      }
      activeGameId = '';
    }, 320);

    document.body.style.overflow = '';
  },

  startPlaytimeTracking(gameId) {
    this.stopPlaytimeTracking();
    activePlaytimeTimer = setInterval(() => {
      if (gameId) {
        storage.incrementPlaytime(gameId, 1);
      }
    }, 1000); // Increments every 1 second
  },

  stopPlaytimeTracking() {
    if (activePlaytimeTimer) {
      clearInterval(activePlaytimeTimer);
      activePlaytimeTimer = null;
    }
  }
};
