/* ═══════════════════════════════════════════════
   HD Arcade — Pairing & Synchronization Service
   Uses HiveMQ public MQTT broker over WebSockets for lightweight,
   completely free, serverless room pairing and data sync.
   ═══════════════════════════════════════════════ */

let client = null;
let currentRoomCode = '';
let onMessageCallback = null;
let onStatusChangeCallback = null;

// Dynamically load MQTT.js from CDN if not already loaded
function loadMQTTLibrary() {
  return new Promise((resolve, reject) => {
    if (window.mqtt) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/mqtt/dist/mqtt.min.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load MQTT library'));
    document.head.appendChild(script);
  });
}

export const pairing = {
  async init(roomCode, isHost, onMessage, onStatusChange) {
    currentRoomCode = roomCode;
    onMessageCallback = onMessage;
    onStatusChangeCallback = onStatusChange;

    onStatusChangeCallback?.('connecting');

    try {
      await loadMQTTLibrary();
      
      // Connect to HiveMQ Public Secure WebSocket broker
      // wss://broker.hivemq.com:8884/mqtt is a free public broker
      const clientId = (isHost ? 'host_' : 'tv_') + Math.random().toString(16).substr(2, 8);
      client = window.mqtt.connect('wss://broker.hivemq.com:8884/mqtt', {
        clientId,
        clean: true,
        connectTimeout: 5000,
        reconnectPeriod: 1000
      });

      client.on('connect', () => {
        onStatusChangeCallback?.('connected');
        
        // Host listens to host topic, TV listens to tv topic
        const subTopic = isHost ? `hd-arcade/host/${roomCode}` : `hd-arcade/tv/${roomCode}`;
        client.subscribe(subTopic, (err) => {
          if (err) {
            console.error('Subscription error:', err);
          }
        });

        // Notify that peer is online
        const pubTopic = isHost ? `hd-arcade/tv/${roomCode}` : `hd-arcade/host/${roomCode}`;
        client.publish(pubTopic, JSON.stringify({ type: 'peer-online' }));
      });

      client.on('message', (topic, payload) => {
        try {
          const data = JSON.parse(payload.toString());
          onMessageCallback?.(data);
        } catch (e) {
          console.warn('Failed to parse MQTT message:', e);
        }
      });

      client.on('offline', () => {
        onStatusChangeCallback?.('offline');
      });

      client.on('error', (err) => {
        console.error('MQTT error:', err);
        onStatusChangeCallback?.('error');
      });

    } catch (e) {
      console.error(e);
      onStatusChangeCallback?.('error');
    }
  },

  send(data, isHost) {
    if (!client || !client.connected || !currentRoomCode) return;
    // Host publishes to tv topic, TV publishes to host topic
    const pubTopic = isHost ? `hd-arcade/tv/${currentRoomCode}` : `hd-arcade/host/${currentRoomCode}`;
    client.publish(pubTopic, JSON.stringify(data));
  },

  disconnect() {
    if (client) {
      try {
        client.end();
      } catch (e) {}
      client = null;
    }
    currentRoomCode = '';
    onStatusChangeCallback?.('disconnected');
  }
};
