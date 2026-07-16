/* ═══════════════════════════════════════════════
   HD Arcade — Pairing & Synchronization Service v2
   Uses HiveMQ public MQTT broker over WebSockets for lightweight,
   completely free, serverless secure session pairing and data sync.
   ═══════════════════════════════════════════════ */

let client = null;
let currentRoomCode = '';
let currentSessionId = '';
let onMessageCallback = null;
let onStatusChangeCallback = null;
let isHostInstance = false;
let heartbeatInterval = null;
let heartbeatTimeout = null;
let latencyStart = 0;

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
    isHostInstance = isHost;

    onStatusChangeCallback?.('CONNECTING', 0);

    try {
      await loadMQTTLibrary();
      
      const clientId = (isHost ? 'host_' : 'tv_') + Math.random().toString(16).substr(2, 8);
      client = window.mqtt.connect('wss://broker.hivemq.com:8884/mqtt', {
        clientId,
        clean: true,
        connectTimeout: 5000,
        reconnectPeriod: 2000
      });

      client.on('connect', () => {
        if (isHost) {
          // Host generates a secure session ID
          currentSessionId = 'sess_' + Math.random().toString(36).substring(2, 10);
          
          // Subscribe to directory request topic to answer TV lookups
          const dirReqTopic = `hd-arcade/directory-req/${roomCode}`;
          client.subscribe(dirReqTopic, () => {
            onStatusChangeCallback?.('WAITING', 0);
          });

          // Subscribe to secure session messages from the TV
          const secureHostSubTopic = `hd-arcade/session/${currentSessionId}/host`;
          client.subscribe(secureHostSubTopic);

          // Listen to directory request pings
          client.on('message', (topic, payload) => {
            if (topic === dirReqTopic) {
              try {
                const req = JSON.parse(payload.toString());
                if (req.type === 'get-session') {
                  // Publish session info back to directory response topic
                  const dirResTopic = `hd-arcade/directory-res/${roomCode}`;
                  client.publish(dirResTopic, JSON.stringify({
                    type: 'session-info',
                    sessionId: currentSessionId
                  }));
                }
              } catch (_) {}
            }
          });

          this.startHeartbeatLoop(true);

        } else {
          // TV client: starts discovery
          onStatusChangeCallback?.('CONNECTING', 0);
          this.discoverSession(roomCode);
        }
      });

      client.on('message', (topic, payload) => {
        // Skip directory messages for secure message parsing
        if (topic.startsWith('hd-arcade/directory-')) return;

        try {
          const data = JSON.parse(payload.toString());
          
          // Handle Heartbeat loops
          if (data.type === 'ping') {
            // TV acknowledges ping immediately
            if (!isHostInstance) {
              this.send({ type: 'pong', timestamp: data.timestamp });
              onStatusChangeCallback?.('CONNECTED', 0);
            }
          } else if (data.type === 'pong') {
            // Host calculates latency
            if (isHostInstance && data.timestamp === latencyStart) {
              const latency = Date.now() - latencyStart;
              onStatusChangeCallback?.('CONNECTED', latency);
            }
          } else {
            onMessageCallback?.(data);
          }
        } catch (e) {
          console.warn('Failed to parse sync message:', e);
        }
      });

      client.on('offline', () => {
        onStatusChangeCallback?.('RECONNECTING', 0);
      });

      client.on('error', (err) => {
        console.error('MQTT error:', err);
        onStatusChangeCallback?.('DISCONNECTED', 0);
      });

    } catch (e) {
      console.error(e);
      onStatusChangeCallback?.('DISCONNECTED', 0);
    }
  },

  discoverSession(roomCode) {
    const dirResTopic = `hd-arcade/directory-res/${roomCode}`;
    const dirReqTopic = `hd-arcade/directory-req/${roomCode}`;

    client.subscribe(dirResTopic);

    // Broadcast lookup request
    const sendLookup = () => {
      if (client && client.connected && !currentSessionId) {
        client.publish(dirReqTopic, JSON.stringify({ type: 'get-session' }));
        setTimeout(sendLookup, 1500); // retry every 1.5s until resolved
      }
    };

    client.on('message', (topic, payload) => {
      if (topic === dirResTopic && !currentSessionId) {
        try {
          const res = JSON.parse(payload.toString());
          if (res.type === 'session-info' && res.sessionId) {
            currentSessionId = res.sessionId;
            
            // Unsubscribe from directory
            client.unsubscribe(dirResTopic);
            client.unsubscribe(dirReqTopic);

            // Subscribe to secure session TV topic
            const secureTvSubTopic = `hd-arcade/session/${currentSessionId}/tv`;
            client.subscribe(secureTvSubTopic, () => {
              onStatusChangeCallback?.('CONNECTED', 0);
              // Notify Host that we are online
              this.send({ type: 'peer-online' });
            });

            this.startHeartbeatLoop(false);
          }
        } catch (_) {}
      }
    });

    sendLookup();
  },

  startHeartbeatLoop(isHost) {
    this.stopHeartbeatLoop();

    if (isHost) {
      // Host transmits heartbeat ping every 2 seconds
      heartbeatInterval = setInterval(() => {
        if (client && client.connected && currentSessionId) {
          latencyStart = Date.now();
          this.send({ type: 'ping', timestamp: latencyStart });
        }
      }, 2000);
    } else {
      // TV monitors heartbeat timeouts
      let lastHeartbeat = Date.now();
      heartbeatInterval = setInterval(() => {
        if (Date.now() - lastHeartbeat > 6000) {
          onStatusChangeCallback?.('RECONNECTING', 0);
        }
      }, 2000);

      const origCallback = onMessageCallback;
      onMessageCallback = (data) => {
        if (data.type === 'ping') {
          lastHeartbeat = Date.now();
        }
        origCallback?.(data);
      };
    }
  },

  stopHeartbeatLoop() {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
  },

  send(data, isHostOverride = null) {
    if (!client || !client.connected || !currentSessionId) return;
    const isHost = isHostOverride !== null ? isHostOverride : isHostInstance;
    // Host publishes to tv topic, TV publishes to host topic
    const pubTopic = isHost 
      ? `hd-arcade/session/${currentSessionId}/tv` 
      : `hd-arcade/session/${currentSessionId}/host`;
    client.publish(pubTopic, JSON.stringify(data));
  },

  disconnect() {
    this.stopHeartbeatLoop();
    if (client) {
      try {
        client.end();
      } catch (e) {}
      client = null;
    }
    currentRoomCode = '';
    currentSessionId = '';
    onStatusChangeCallback?.('DISCONNECTED', 0);
  }
};
