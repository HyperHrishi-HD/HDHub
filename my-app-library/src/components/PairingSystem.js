/* ═══════════════════════════════════════════════
   HD Arcade — Pairing System Component
   Handles pairing code generation, UI overlays, QR codes,
   and coordination.
   ═══════════════════════════════════════════════ */

import { pairing } from '../services/pairing.js';
import { ControllerManager } from './ControllerManager.js';

let activeRoomCode = '';

export const PairingSystem = {
  // Generate random 4-digit code
  generateCode() {
    return Math.floor(1000 + Math.random() * 9000).toString();
  },

  async startHost(onPeerConnected, onGameClosed) {
    activeRoomCode = this.generateCode();
    
    // Initialize connection
    pairing.init(
      activeRoomCode,
      true, // isHost = true
      (message) => {
        // Handle incoming messages from TV
        if (message.type === 'peer-online') {
          this.updateStatus('Connected & Active');
          ControllerManager.setHostRoom(activeRoomCode);
          onPeerConnected?.();
        } else if (message.type === 'tv-disconnect') {
          this.updateStatus('Disconnected');
          ControllerManager.setHostRoom('');
        }
      },
      (status) => {
        // Handle connection status changes
        if (status === 'connected') {
          this.updateStatus('Waiting for Google TV...');
        } else if (status === 'offline' || status === 'error') {
          this.updateStatus('Signaling reconnecting...');
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
    
    // We can also create a QR code API URL to allow scanning!
    // A free public QR Code API: https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=URL
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(tvUrl + '?code=' + code)}&color=6c5ce7&bgcolor=12121a`;

    modal.innerHTML = `
      <div class="bg-[var(--color-surface-card)] border border-[var(--color-border)] p-8 rounded-3xl max-w-md w-full mx-4 shadow-2xl text-center relative animate-fade-in-up">
        <div class="text-indigo-400 text-4xl mb-3">🎮</div>
        <h2 class="text-xl font-bold text-white mb-2">HD Arcade Host Mode</h2>
        <p class="text-xs text-[var(--color-text-secondary)] mb-6 leading-relaxed">
          Open this link on your Google TV:
          <br><span class="text-indigo-300 font-mono select-all text-sm font-semibold">${tvUrl}</span>
        </p>

        <!-- QR Code Pairing option -->
        <div class="flex justify-center mb-6">
          <div class="p-3 bg-[#12121a] border border-[var(--color-border)] rounded-2xl">
            <img src="${qrUrl}" alt="Scan QR Code to Pair" class="w-40 h-40 object-contain rounded-xl" onerror="this.parentElement.style.display='none'" />
          </div>
        </div>

        <div class="text-[var(--color-text-secondary)] text-xs mb-2">Or enter this Pairing Code:</div>
        <div class="flex justify-center gap-2 mb-6">
          ${code.split('').map(digit => `<span class="w-12 h-16 rounded-xl bg-black/60 border border-[var(--color-border)] flex items-center justify-center text-white text-3xl font-extrabold">${digit}</span>`).join('')}
        </div>

        <div class="text-xs text-emerald-400 font-semibold mb-6 flex items-center justify-center gap-2">
          <span class="relative flex h-2 w-2">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span id="host-status-text">Waiting for Google TV...</span>
        </div>

        <button id="btn-stop-host" class="focus-target w-full py-3 rounded-xl bg-red-500/15 border border-red-500/30 text-red-400 hover:bg-red-500/25 transition-all text-xs font-semibold cursor-pointer">
          Disconnect Host Mode
        </button>
      </div>
    `;

    document.getElementById('btn-stop-host').onclick = () => this.stopHost();
  },

  updateStatus(status) {
    const statusText = document.getElementById('host-status-text');
    if (statusText) statusText.textContent = status;
  },

  hideHostModal() {
    const modal = document.getElementById('host-modal');
    if (modal) modal.remove();
  }
};
