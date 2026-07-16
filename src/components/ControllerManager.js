/* ═══════════════════════════════════════════════
   HD Arcade — Controller Manager v2
   Handles Gamepad API inputs, spatial UI navigation with debouncing,
   analog sticks dead-zones, and simulated gamepad syncing for TV.
   ═══════════════════════════════════════════════ */

import { pairing } from '../services/pairing.js';

let gamepadRAF = null;
let lastButtons = {};
let simulatedGamepad = null;
let currentHostRoomCode = '';

const DEADZONE = 0.15;
const REPEAT_THROTTLE = 220; // ms repeat rate for held directions
let lastNavTime = 0;

function applyDeadzone(value) {
  if (Math.abs(value) < DEADZONE) return 0;
  return (value - (value > 0 ? DEADZONE : -DEADZONE)) / (1 - DEADZONE);
}

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
  onCategoryChange: null,
  onStartPressed: null,

  init(isTVMode, hostRoomCode = '') {
    this.isTVMode = isTVMode;
    currentHostRoomCode = hostRoomCode;

    window.removeEventListener('gamepadconnected', this.handleConnected);
    window.removeEventListener('gamepaddisconnected', this.handleDisconnected);

    if (isTVMode) {
      simulatedGamepad = createEmptyGamepadState();
      navigator.getGamepads = function() {
        return [simulatedGamepad, null, null, null];
      };
      this.startIframeGamepadSync();
    } else {
      window.addEventListener('gamepadconnected', this.handleConnected.bind(this));
      window.addEventListener('gamepaddisconnected', this.handleDisconnected.bind(this));

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
        // Apply analog stick dead-zones
        const axes = [
          applyDeadzone(gp.axes[0]),
          applyDeadzone(gp.axes[1]),
          applyDeadzone(gp.axes[2]),
          applyDeadzone(gp.axes[3])
        ];

        const buttons = {
          up: gp.buttons[12]?.pressed || axes[1] < -0.5,
          down: gp.buttons[13]?.pressed || axes[1] > 0.5,
          left: gp.buttons[14]?.pressed || axes[0] < -0.5,
          right: gp.buttons[15]?.pressed || axes[0] > 0.5,
          a: gp.buttons[0]?.pressed,
          b: gp.buttons[1]?.pressed,
          x: gp.buttons[2]?.pressed,
          y: gp.buttons[3]?.pressed,
          lb: gp.buttons[4]?.pressed,
          rb: gp.buttons[5]?.pressed,
          lt: gp.buttons[6]?.value || 0,
          rt: gp.buttons[7]?.value || 0,
          start: gp.buttons[9]?.pressed
        };

        const now = Date.now();
        const canNavigate = now - lastNavTime > REPEAT_THROTTLE;

        // Debounced spatial navigation triggers
        if (canNavigate) {
          if (buttons.left && (!lastButtons.left || axes[0] < -0.6)) {
            this.navigateSpatial('left');
            lastNavTime = now;
          }
          if (buttons.right && (!lastButtons.right || axes[0] > 0.6)) {
            this.navigateSpatial('right');
            lastNavTime = now;
          }
          if (buttons.up && (!lastButtons.up || axes[1] < -0.6)) {
            this.navigateSpatial('up');
            lastNavTime = now;
          }
          if (buttons.down && (!lastButtons.down || axes[1] > 0.6)) {
            this.navigateSpatial('down');
            lastNavTime = now;
          }
        }

        // Action Triggers
        if (buttons.a && !lastButtons.a) {
          const active = document.activeElement;
          if (active && (active.tagName === 'A' || active.tagName === 'BUTTON' || active.classList.contains('focus-target') || active.classList.contains('numpad-key'))) {
            active.click();
          }
        }

        if (buttons.b && !lastButtons.b) {
          const closeBtn = document.getElementById('btn-close-viewer');
          if (closeBtn && closeBtn.offsetParent !== null) {
            closeBtn.click();
          } else {
            const backBtn = document.getElementById('btn-settings-back');
            if (backBtn) backBtn.click();
          }
        }

        // LB/RB category swap triggers
        if (buttons.lb && !lastButtons.lb) this.onCategoryChange?.('prev');
        if (buttons.rb && !lastButtons.rb) this.onCategoryChange?.('next');

        // Start settings toggle trigger
        if (buttons.start && !lastButtons.start) this.onStartPressed?.();

        lastButtons = buttons;

        // Broadcast synced gamepad state to Google TV
        if (currentHostRoomCode) {
          pairing.send({
            type: 'gamepad-sync',
            axes,
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
      bestCandidate.focus();
    }
  },

  injectSimulatedInput(gamepadData) {
    if (!this.isTVMode || !simulatedGamepad) return;
    simulatedGamepad.timestamp = Date.now();
    simulatedGamepad.axes = gamepadData.axes;
    simulatedGamepad.buttons = gamepadData.buttons;

    // Map simulated buttons to spatial TV navigation
    const axes = gamepadData.axes;
    const buttons = {
      up: gamepadData.buttons[12]?.pressed || axes[1] < -0.5,
      down: gamepadData.buttons[13]?.pressed || axes[1] > 0.5,
      left: gamepadData.buttons[14]?.pressed || axes[0] < -0.5,
      right: gamepadData.buttons[15]?.pressed || axes[0] > 0.5,
      a: gamepadData.buttons[0]?.pressed,
      b: gamepadData.buttons[1]?.pressed,
      start: gamepadData.buttons[9]?.pressed
    };

    const now = Date.now();
    if (now - lastNavTime > REPEAT_THROTTLE) {
      if (buttons.left && !lastButtons.left) { this.navigateSpatial('left'); lastNavTime = now; }
      if (buttons.right && !lastButtons.right) { this.navigateSpatial('right'); lastNavTime = now; }
      if (buttons.up && !lastButtons.up) { this.navigateSpatial('up'); lastNavTime = now; }
      if (buttons.down && !lastButtons.down) { this.navigateSpatial('down'); lastNavTime = now; }
    }

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
