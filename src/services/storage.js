/* ═══════════════════════════════════════════════
   HD Arcade — Storage Service
   Handles favorites, play history, playtime, and settings
   using localStorage.
   ═══════════════════════════════════════════════ */

const KEYS = {
  FAVORITES: 'hda_favorites',
  RECENTLY_PLAYED: 'hda_recently_played',
  PLAYTIME: 'hda_playtime',
  LAST_OPENED: 'hda_last_opened',
  SETTINGS: 'hda_settings'
};

export const storage = {
  // Favorites
  getFavorites() {
    return JSON.parse(localStorage.getItem(KEYS.FAVORITES)) || [];
  },
  toggleFavorite(gameId) {
    const favs = this.getFavorites();
    const idx = favs.indexOf(gameId);
    if (idx === -1) {
      favs.push(gameId);
    } else {
      favs.splice(idx, 1);
    }
    localStorage.setItem(KEYS.FAVORITES, JSON.stringify(favs));
    return favs;
  },
  isFavorite(gameId) {
    return this.getFavorites().includes(gameId);
  },
  clearFavorites() {
    localStorage.removeItem(KEYS.FAVORITES);
  },

  // Recently Played & Continue Playing
  getRecentlyPlayed() {
    return JSON.parse(localStorage.getItem(KEYS.RECENTLY_PLAYED)) || [];
  },
  addRecentlyPlayed(gameId) {
    let recent = this.getRecentlyPlayed();
    // Remove if already exists to put it at the front
    recent = recent.filter(id => id !== gameId);
    recent.unshift(gameId);
    // Keep max 10 games
    if (recent.length > 10) {
      recent.pop();
    }
    localStorage.setItem(KEYS.RECENTLY_PLAYED, JSON.stringify(recent));
    localStorage.setItem(KEYS.LAST_OPENED, gameId);
  },
  getLastOpened() {
    return localStorage.getItem(KEYS.LAST_OPENED) || '';
  },
  clearHistory() {
    localStorage.removeItem(KEYS.RECENTLY_PLAYED);
    localStorage.removeItem(KEYS.LAST_OPENED);
    localStorage.removeItem(KEYS.PLAYTIME);
  },

  // Playtime Tracking
  getPlaytimes() {
    return JSON.parse(localStorage.getItem(KEYS.PLAYTIME)) || {};
  },
  getPlaytime(gameId) {
    const playtimes = this.getPlaytimes();
    return playtimes[gameId] || 0; // returns seconds
  },
  incrementPlaytime(gameId, seconds) {
    const playtimes = this.getPlaytimes();
    playtimes[gameId] = (playtimes[gameId] || 0) + seconds;
    localStorage.setItem(KEYS.PLAYTIME, JSON.stringify(playtimes));
  },

  // Settings
  getSettings() {
    const defaults = {
      mode: 'normal',
      version: '4.0.0',
      skipBootAnimation: false,
      lastSession: Date.now(),
      lastDevice: navigator.userAgent
    };
    const saved = JSON.parse(localStorage.getItem(KEYS.SETTINGS)) || {};
    return { ...defaults, ...saved };
  },
  saveSettings(settings) {
    settings.lastSession = Date.now();
    settings.lastDevice = navigator.userAgent;
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings));
  }
};
