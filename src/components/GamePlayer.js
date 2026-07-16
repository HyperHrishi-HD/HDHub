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

    // 1. DOM Elements bindings
    const viewer = document.getElementById('app-viewer');
    const titleEl = document.getElementById('viewer-title');
    const iframe = document.getElementById('viewer-iframe');
    const loader = document.getElementById('viewer-loader');
    const btnNewTab = document.getElementById('btn-newtab');

    if (!viewer || !iframe || !loader) return;

    // Update headers
    titleEl.textContent = item.title;
    if (btnNewTab) btnNewTab.dataset.url = item.url;

    // Reset aspect ratio scaling options
    const wrap = document.getElementById('viewer-iframe-wrap');
    if (wrap) {
      // Clear specific classes
      wrap.className = 'flex-1 relative overflow-hidden flex items-center justify-center bg-black';
      iframe.className = 'absolute border-0 max-w-full max-h-full';
      
      // Enforce aspect ratio mapping (e.g. 16:9 contain)
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

    // Show loader
    loader.classList.remove('opacity-0', 'pointer-events-none');
    loader.classList.add('opacity-100');

    // Update history storage
    storage.addRecentlyPlayed(item.id);

    // Set source URL
    iframe.src = item.url;
    iframe.onload = () => {
      loader.classList.add('opacity-0', 'pointer-events-none');
      loader.classList.remove('opacity-100');

      // Autofocus iframe for native gamepad support
      try {
        iframe.focus();
      } catch (_) {}
    };

    // Keep memory tracker interval for active playtimes
    this.startPlaytimeTracking(item.id);

    // Show viewer modal
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
