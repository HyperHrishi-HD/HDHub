/* ═══════════════════════════════════════════════
   HD Arcade — Pairing System Component v2
   Coordinates randomly generated 4-digit codes with secure long-lived
   session IDs, tracking connection heartbeat states.
   ═══════════════════════════════════════════════ */

import { pairing } from '../services/pairing.js';
import { ControllerManager } from './ControllerManager.js';

let activeRoomCode = '';

export const PairingSystem = {
  generateCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
  },

  async startHost(onPeerConnected) {
    activeRoomCode = this.generateCode();
    
    pairing.init(
      activeRoomCode,
      true, // isHost = true
      (message) => {
        if (message.type === 'peer-online') {
          this.updateStatus('CONNECTED', 0);
          ControllerManager.setHostRoom(activeRoomCode);
          onPeerConnected?.();
        } else if (message.type === 'tv-disconnect') {
          this.updateStatus('DISCONNECTED', 0);
          ControllerManager.setHostRoom('');
        }
      },
      (status, latency) => {
        this.updateStatus(status, latency);
        if (status === 'CONNECTED') {
          ControllerManager.setHostRoom(activeRoomCode);
        } else if (status === 'DISCONNECTED' || status === 'RECONNECTING') {
          ControllerManager.setHostRoom('');
        }
      }
    );

    this.showHostModal(activeRoomCode);
  },

  stopHost() {
    pairing.send({ type: 'host-disconnect' }, true);
    pairing.disconnect();
    ControllerManager.setHostRoom('');
    this.hideHostModal();
  },

  showHostModal(code) {
    let modal = document.getElementById('host-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'host-modal';
      modal.className = 'fixed inset-0 z-[10000] flex items-center justify-center bg-black/85 backdrop-blur-md';
      document.body.appendChild(modal);
    }

    const tvUrl = `${window.location.origin}/tv`;
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(tvUrl + '?code=' + code)}&color=6c5ce7&bgcolor=12121a`;

    modal.innerHTML = `
      <div class="bg-[var(--color-surface-card)] border border-[var(--color-border)] p-8 rounded-3xl max-w-sm w-full mx-4 shadow-2xl text-center relative animate-fade-in-up">
        <div class="text-indigo-400 text-3xl mb-2">🎮</div>
        <h2 class="text-lg font-bold text-white mb-1">HD Arcade Host Mode</h2>
        <p class="text-[11px] text-[var(--color-text-secondary)] mb-5">
          Scan the QR or open this link on your TV:<br>
          <span class="text-indigo-300 font-mono text-xs select-all">${tvUrl}</span>
        </p>

        <!-- QR Code -->
        <div class="flex justify-center mb-5">
          <div class="p-2.5 bg-[#12121a] border border-[var(--color-border)] rounded-2xl">
            <img src="${qrUrl}" alt="Scan QR Code" class="w-36 h-36 object-contain rounded-xl" />
          </div>
        </div>

        <div class="text-[var(--color-text-secondary)] text-[10px] uppercase tracking-wider mb-2">Pairing Code:</div>
        <div class="flex justify-center gap-1.5 mb-5">
          ${code.split('').map(digit => `<span class="w-10 h-14 rounded-xl bg-black/60 border border-[var(--color-border)] flex items-center justify-center text-white text-2xl font-extrabold">${digit}</span>`).join('')}
        </div>

        <!-- Connection indicators -->
        <div id="host-pairing-indicator" class="text-xs font-semibold mb-6 flex items-center justify-center gap-2 text-indigo-400">
          <span class="relative flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-indigo-500"></span>
          </span>
          <span id="host-status-text">CONNECTING...</span>
        </div>

        <button id="btn-stop-host" class="focus-target w-full py-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all text-xs font-bold cursor-pointer">
          Disconnect Host
        </button>
      </div>
    `;

    document.getElementById('btn-stop-host').onclick = () => this.stopHost();
  },

  updateStatus(status, latency) {
    const statusText = document.getElementById('host-status-text');
    const indicator = document.getElementById('host-pairing-indicator');
    if (!statusText || !indicator) return;

    statusText.textContent = status;

    if (status === 'WAITING') {
      statusText.textContent = 'Waiting for Google TV...';
      indicator.className = 'text-xs font-semibold mb-6 flex items-center justify-center gap-2 text-yellow-400';
    } else if (status === 'CONNECTED') {
      const latText = latency > 0 ? ` (${latency}ms)` : '';
      statusText.textContent = `Connected${latText}`;
      indicator.className = 'text-xs font-semibold mb-6 flex items-center justify-center gap-2 text-emerald-400';
    } else if (status === 'CONNECTING') {
      statusText.textContent = 'Connecting to broker...';
      indicator.className = 'text-xs font-semibold mb-6 flex items-center justify-center gap-2 text-indigo-400';
    } else if (status === 'DISCONNECTED') {
      statusText.textContent = 'Disconnected';
      indicator.className = 'text-xs font-semibold mb-6 flex items-center justify-center gap-2 text-red-400';
    } else if (status === 'RECONNECTING') {
      statusText.textContent = 'Reconnecting...';
      indicator.className = 'text-xs font-semibold mb-6 flex items-center justify-center gap-2 text-yellow-500 animate-pulse';
    }
  },

  hideHostModal() {
    const modal = document.getElementById('host-modal');
    if (modal) modal.remove();
  }
};
