/* ═══════════════════════════════════════════════
   HD Arcade — Controller Manager
   Handles real Gamepad API polling, spatial menu navigation,
   and simulated Gamepad input injection for TV Mode.
   ═══════════════════════════════════════════════ */

import { pairing } from '../services/pairing.js';

let gamepadRAF = null;
let lastButtons = {};
let simulatedGamepad = null;
let currentHostRoomCode = '';

// Default Gamepad Structure for simulation
function createEmptyGamepadState() {
  return {
    id: 'Xbox Wireless Controller (Simulated)',
    index: 0,
    connected: true,
    timestamp: Date.now(),
    mapping: 'standard',
    axes: [0, 0, 0, 0],
    buttons: Array.from({ length: 17 }, () => ({ pressed: false, value: 0 }))
  };
}

export const ControllerManager = {
  isTVMode: false,
  onCategoryChange: null, // callback(direction: 'prev' | 'next')
  onStartPressed: null,    // callback()

  init(isTVMode, hostRoomCode = '') {
    this.isTVMode = isTVMode;
    currentHostRoomCode = hostRoomCode;

    // Remove any existing listeners first
    window.removeEventListener('gamepadconnected', this.handleConnected);
    window.removeEventListener('gamepaddisconnected', this.handleDisconnected);

    if (isTVMode) {
      // Overwrite navigator.getGamepads to support simulated controller inputs
      simulatedGamepad = createEmptyGamepadState();
      navigator.getGamepads = function() {
        return [simulatedGamepad, null, null, null];
      };
      
      // Periodically update the iframe getGamepads dynamically
      this.startIframeGamepadSync();
    } else {
      // Normal / Host Mode: Listen to physical controller
      window.addEventListener('gamepadconnected', this.handleConnected.bind(this));
      window.addEventListener('gamepaddisconnected', this.handleDisconnected.bind(this));

      // Auto-start if a controller is already connected
      const gps = navigator.getGamepads ? navigator.getGamepads() : [];
      if (gps[0]) {
        this.startPolling();
      }
    }
  },

  handleConnected(e) {
    this.showToast(`🎮 Controller connected: ${e.gamepad.id}`);
    this.startPolling();
  },

  handleDisconnected() {
    this.showToast('❌ Controller disconnected');
    this.stopPolling();
  },

  startPolling() {
    this.stopPolling();
    const poll = () => {
      const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
      const gp = gamepads[0];
      
      if (gp) {
        // Read axes and buttons
        const axes = [gp.axes[0], gp.axes[1], gp.axes[2], gp.axes[3]];
        const buttons = {
          up: gp.buttons[12]?.pressed || gp.axes[1] < -0.5,
          down: gp.buttons[13]?.pressed || gp.axes[1] > 0.5,
          left: gp.buttons[14]?.pressed || gp.axes[0] < -0.5,
          right: gp.buttons[15]?.pressed || gp.axes[0] > 0.5,
          a: gp.buttons[0]?.pressed,
          b: gp.buttons[1]?.pressed,
          lb: gp.buttons[4]?.pressed,
          rb: gp.buttons[5]?.pressed,
          start: gp.buttons[9]?.pressed
        };

        // Edge detection triggers (single press action)
        if (buttons.left && !lastButtons.left) this.navigateSpatial('left');
        if (buttons.right && !lastButtons.right) this.navigateSpatial('right');
        if (buttons.up && !lastButtons.up) this.navigateSpatial('up');
        if (buttons.down && !lastButtons.down) this.navigateSpatial('down');

        if (buttons.a && !lastButtons.a) {
          const active = document.activeElement;
          if (active && (active.tagName === 'A' || active.tagName === 'BUTTON' || active.classList.contains('focus-target'))) {
            active.click();
          }
        }
        if (buttons.b && !lastButtons.b) {
          const closeBtn = document.getElementById('btn-close-viewer');
          if (closeBtn && closeBtn.offsetParent !== null) {
            closeBtn.click();
          } else {
            // go back in settings or other back triggers
            const backBtn = document.getElementById('btn-settings-back');
            if (backBtn) backBtn.click();
          }
        }

        // LB/RB to swap categories
        if (buttons.lb && !lastButtons.lb) this.onCategoryChange?.('prev');
        if (buttons.rb && !lastButtons.rb) this.onCategoryChange?.('next');

        // Start to toggle menu / settings
        if (buttons.start && !lastButtons.start) this.onStartPressed?.();

        lastButtons = buttons;

        // If we are hosting, stream gamepad inputs to Google TV
        if (currentHostRoomCode) {
          pairing.send({
            type: 'gamepad-sync',
            axes: gp.axes,
            buttons: gp.buttons.map(b => ({ pressed: b.pressed, value: b.value }))
          }, true);
        }
      }
      gamepadRAF = requestAnimationFrame(poll);
    };
    poll();
  },

  stopPolling() {
    if (gamepadRAF) {
      cancelAnimationFrame(gamepadRAF);
      gamepadRAF = null;
    }
  },

  // Spatial geometric focus navigator
  navigateSpatial(direction) {
    const active = document.activeElement;
    if (!active || (!active.classList.contains('card-focused') && !active.classList.contains('focus-element-active') && active.tagName !== 'A' && active.tagName !== 'BUTTON')) {
      const firstCard = document.querySelector('a[data-item-id]');
      if (firstCard) firstCard.focus();
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
        alignmentScore = Math.abs(dy) * 2.5; // Penalize off-axis moves
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
      bestCandidate.focus();
    }
  },

  // Simulates input state based on synced messages from Host iPad
  injectSimulatedInput(gamepadData) {
    if (!this.isTVMode || !simulatedGamepad) return;
    simulatedGamepad.timestamp = Date.now();
    simulatedGamepad.axes = gamepadData.axes;
    simulatedGamepad.buttons = gamepadData.buttons;

    // Trigger local TV UI actions with simulated inputs too
    const buttons = {
      up: gamepadData.buttons[12]?.pressed || gamepadData.axes[1] < -0.5,
      down: gamepadData.buttons[13]?.pressed || gamepadData.axes[1] > 0.5,
      left: gamepadData.buttons[14]?.pressed || gamepadData.axes[0] < -0.5,
      right: gamepadData.buttons[15]?.pressed || gamepadData.axes[0] > 0.5,
      a: gamepadData.buttons[0]?.pressed,
      b: gamepadData.buttons[1]?.pressed,
      lb: gamepadData.buttons[4]?.pressed,
      rb: gamepadData.buttons[5]?.pressed,
      start: gamepadData.buttons[9]?.pressed
    };

    if (buttons.left && !lastButtons.left) this.navigateSpatial('left');
    if (buttons.right && !lastButtons.right) this.navigateSpatial('right');
    if (buttons.up && !lastButtons.up) this.navigateSpatial('up');
    if (buttons.down && !lastButtons.down) this.navigateSpatial('down');

    if (buttons.a && !lastButtons.a) {
      const active = document.activeElement;
      if (active && (active.tagName === 'A' || active.tagName === 'BUTTON' || active.classList.contains('focus-target'))) {
        active.click();
      }
    }
    if (buttons.b && !lastButtons.b) {
      const closeBtn = document.getElementById('tv-btn-disconnect');
      if (closeBtn && closeBtn.offsetParent !== null) closeBtn.click();
    }

    lastButtons = buttons;
  },

  startIframeGamepadSync() {
    setInterval(() => {
      const iframe = document.getElementById('viewer-iframe') || document.querySelector('iframe');
      if (iframe && iframe.contentWindow) {
        try {
          iframe.contentWindow.navigator.getGamepads = function() {
            return [simulatedGamepad, null, null, null];
          };
        } catch (_) {}
      }
    }, 1000);
  },

  setHostRoom(roomCode) {
    currentHostRoomCode = roomCode;
    if (roomCode) {
      this.startPolling();
    }
  },

  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-6 right-6 z-[10000] px-4 py-3 rounded-xl bg-black/80 backdrop-blur-md border border-[var(--color-border)] text-white text-xs font-semibold shadow-2xl flex items-center gap-2 animate-fade-in-up';
    toast.innerHTML = message;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('opacity-0', 'transition-opacity', 'duration-500');
      setTimeout(() => toast.remove(), 500);
    }, 3500);
  }
};
