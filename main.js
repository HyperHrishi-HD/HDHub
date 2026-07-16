import './style.css';

/* ═══════════════════════════════════════════════
   HD Arcade — Main Orchestration v4
   Pairs Host (iPad) and TV (Google TV) over MQTT,
   syncs controller inputs, and coordinates game players.
   ═══════════════════════════════════════════════ */

import { storage } from './src/services/storage.js';
import { pairing } from './src/services/pairing.js';
import { ControllerManager } from './src/components/ControllerManager.js';
import { GameCard } from './src/components/GameCard.js';
import { GamePlayer } from './src/components/GamePlayer.js';
import { PairingSystem } from './src/components/PairingSystem.js';
import { TVMode } from './src/components/TVMode.js';
import { Settings } from './src/components/Settings.js';

const APP_CONTAINER = document.getElementById('app');
const VIEWER_CLOSE_BTN = document.getElementById('btn-close-viewer');

let gamesIndex = [];
let currentCategoryIndex = 0;
const categories = ['all', 'games', 'apps', 'favorites'];

/* ═══════════════════════════════════════════════
   Dashboard Rendering Modes
   ═══════════════════════════════════════════════ */

function checkRoutingMode() {
  const path = window.location.pathname;
  const hash = window.location.hash;

  // TV Mode
  if (path === '/tv' || hash === '#tv') {
    TVMode.render(APP_CONTAINER);
    return;
  }

  // Settings Mode
  if (path === '/settings' || hash === '#settings') {
    Settings.render(APP_CONTAINER, () => {
      window.location.hash = '';
    });
    return;
  }

  // Otherwise: Dashboard Mode
  renderDashboard();
}

function handleCardClick(item) {
  if (item.iframeBlocked) {
    openCloakedTab(item.url, item.title);
  } else {
    // Open in Host View
    GamePlayer.open(item);

    // If hosting, broadcast launch instruction to TV Mode
    pairing.send({
      type: 'launch-game',
      id: item.id,
      title: item.title,
      url: item.url,
      aspect: item.aspect
    }, true);
  }
}

function filterCards(filter, games) {
  const grid = document.getElementById('card-grid');
  if (!grid) return;

  const buttons = document.querySelectorAll('#filter-bar button');
  buttons.forEach((btn) => {
    const isActive = btn.id === `filter-${filter}`;
    btn.className = `px-4 py-1.5 text-xs font-semibold rounded-full border transition-all cursor-pointer focus:outline-none ${
      isActive
        ? 'bg-[var(--color-accent)] border-[var(--color-accent)] text-white shadow-lg shadow-indigo-500/20'
        : 'border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-accent)]/50 hover:text-[var(--color-text-primary)]'
    }`;
  });

  grid.innerHTML = '';
  let filtered = [];

  if (filter === 'all') {
    filtered = games;
  } else if (filter === 'games') {
    filtered = games.filter(g => g.category === 'game');
  } else if (filter === 'apps') {
    filtered = games.filter(g => g.category === 'app');
  } else if (filter === 'favorites') {
    const favs = storage.getFavorites();
    filtered = games.filter(g => favs.includes(g.id));
  }

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="col-span-full py-12 text-center text-xs text-[var(--color-text-secondary)]">No games or apps found in this section.</div>`;
  } else {
    filtered.forEach((item, i) => {
      const card = GameCard.createCard(item, i, () => {
        // Redraw favorites category if active
        if (filter === 'favorites') {
          filterCards('favorites', gamesIndex);
        }
      });

      // Override raw link actions to feed custom player runtime
      card.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        handleCardClick(item);
      };

      grid.appendChild(card);
    });
  }
}

async function renderDashboard() {
  try {
    const res = await fetch('/games.json');
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    gamesIndex = data.games;

    // Get last opened game or default to Drift Hunters
    const lastOpenedId = storage.getLastOpened();
    const featuredGame = gamesIndex.find(g => g.id === lastOpenedId) || gamesIndex.find(g => g.id === 'drift-hunters') || gamesIndex[0];

    // Build categories layout rows
    APP_CONTAINER.innerHTML = `
      <div class="min-h-screen pb-16 relative">
        <!-- Ambient decorative overlay -->
        <div class="absolute top-0 left-1/4 right-1/4 h-[320px] bg-[radial-gradient(circle_at_center,rgba(108,92,231,0.12)_0%,transparent_80%)] pointer-events-none"></div>

        <!-- ── Navigation Console Header ── -->
        <header class="flex items-center justify-between px-6 py-4 bg-[var(--color-surface-card)]/50 backdrop-blur-md border-b border-[var(--color-border)] sticky top-0 z-50">
          <div class="flex items-center gap-3">
            <span class="text-xl">🕹️</span>
            <span class="text-base font-bold tracking-tight text-white">HD Arcade</span>
          </div>

          <!-- Search Input -->
          <div class="hidden sm:block flex-1 max-w-xs mx-8">
            <input type="text" id="search-input" placeholder="Search games and apps..." class="focus-target px-4 py-1.5 rounded-xl bg-black/40 border border-[var(--color-border)] text-xs text-white w-full hover:border-[var(--color-accent)]/50 focus:border-[var(--color-accent)] focus:outline-none transition-all" />
          </div>
          
          <div class="flex items-center gap-2">
            <button id="btn-header-tv" class="focus-target px-4 py-1.5 text-xs font-semibold rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 hover:bg-indigo-500/20 transition-all flex items-center gap-1.5 cursor-pointer">
              <span>📺</span> Connect TV
            </button>
            <button id="btn-header-settings" class="focus-target p-1.5 rounded-xl bg-black/30 border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-white transition-all cursor-pointer" title="Settings">
              ⚙️
            </button>
          </div>
        </header>

        <!-- ── Hero Featured Banner (Netflix / Xbox style) ── -->
        <section class="max-w-7xl mx-auto px-6 pt-8 pb-4">
          <div class="relative w-full aspect-[2.4/1] rounded-3xl overflow-hidden bg-gradient-to-r from-black/90 via-black/40 to-transparent border border-[var(--color-border)] shadow-2xl flex items-center">
            <!-- Background wallpaper image -->
            <div id="hero-bg" class="absolute inset-0 bg-cover bg-center mix-blend-overlay opacity-45 transition-all duration-700" style="background-image: url('${featuredGame.thumbnail}');"></div>
            
            <div class="relative z-10 pl-8 pr-6 max-w-lg">
              <span id="hero-badge" class="inline-block px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-lg bg-[var(--color-accent)]/20 border border-[var(--color-accent)]/30 text-indigo-300 mb-4">
                ${featuredGame.controls} • ${featuredGame.aspect}
              </span>
              <h1 id="hero-title" class="text-2xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
                ${featuredGame.title}
              </h1>
              <p id="hero-desc" class="text-xs text-[var(--color-text-secondary)] leading-relaxed mb-6 line-clamp-2">
                ${featuredGame.description}
              </p>
              
              <div class="flex gap-3">
                <button id="hero-play-btn" class="focus-target px-6 py-2.5 rounded-xl bg-white text-black font-bold text-xs hover:scale-105 active:scale-95 transition-all shadow-lg shadow-white/10 cursor-pointer">
                  ▶ Play Now
                </button>
                <button id="hero-stream-btn" class="focus-target px-5 py-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-bold text-xs hover:bg-indigo-500/30 transition-all cursor-pointer">
                  📺 Connect TV
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- ── Continue Playing Row (Only if history exists) ── -->
        <section id="continue-playing-section" class="max-w-7xl mx-auto px-6 py-4 hidden">
          <h2 class="text-xs font-extrabold tracking-wider uppercase text-[var(--color-text-secondary)] mb-3">Continue Playing</h2>
          <div id="continue-playing-row" class="flex gap-4 overflow-x-auto pb-2 scrollbar-thin"></div>
        </section>

        <!-- ── Category Filter Navigation Bar ── -->
        <nav id="filter-bar" class="flex items-center justify-start max-w-7xl mx-auto px-6 py-4 gap-2 border-t border-[var(--color-border)]/40 mt-4">
          <div class="text-[var(--color-text-secondary)] text-xs font-bold uppercase tracking-wider mr-4">Library:</div>
          <!-- Filled dynamically -->
        </nav>

        <!-- ── Main Cards Grid ── -->
        <main class="max-w-7xl mx-auto px-6">
          <div id="card-grid" class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"></div>
        </main>
      </div>
    `;

    // Render filter buttons dynamically
    const filterBar = document.getElementById('filter-bar');
    ['All', 'Games', 'Apps', 'Favorites'].forEach(label => {
      const btn = document.createElement('button');
      btn.id = `filter-${label.toLowerCase()}`;
      btn.className = 'focus-target px-4 py-1.5 text-xs font-medium rounded-full border transition-all cursor-pointer';
      btn.textContent = label;
      btn.onclick = () => filterCards(label.toLowerCase(), gamesIndex);
      filterBar.appendChild(btn);
    });

    // Populate All Grid
    filterCards('all', gamesIndex);

    // Populate Continue Playing Row if history exists
    const recentIds = storage.getRecentlyPlayed();
    if (recentIds.length > 0) {
      const continueSection = document.getElementById('continue-playing-section');
      const continueRow = document.getElementById('continue-playing-row');
      
      if (continueSection && continueRow) {
        continueSection.classList.remove('hidden');
        recentIds.forEach(id => {
          const game = gamesIndex.find(g => g.id === id);
          if (game) {
            const playtimeSeconds = storage.getPlaytime(id);
            const playtimeText = playtimeSeconds > 60 
              ? `${Math.round(playtimeSeconds / 60)}m played` 
              : `${playtimeSeconds}s played`;

            const card = document.createElement('a');
            card.className = 'focus-target block min-w-[200px] max-w-[200px] bg-[var(--color-surface-card)] border border-[var(--color-border)] rounded-2xl overflow-hidden hover:border-[var(--color-accent)]/50 hover:bg-[var(--color-surface-hover)] transition-all cursor-pointer';
            card.onclick = () => handleCardClick(game);
            card.innerHTML = `
              <div class="aspect-video relative overflow-hidden bg-black/20">
                <img src="${game.thumbnail}" alt="" class="w-full h-full object-cover" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22%3E%3Crect width=%22100%22 height=%22100%22 fill=%22%2312121a%22/%3E%3C/svg%3E'" />
              </div>
              <div class="p-3">
                <h4 class="text-xs font-bold text-white truncate">${game.title}</h4>
                <p class="text-[10px] text-[var(--color-text-secondary)] mt-1 font-mono">${playtimeText}</p>
              </div>
            `;
            continueRow.appendChild(card);
          }
        });
      }
    }

    // Attach Event Handlers
    document.getElementById('btn-header-tv').onclick = () => {
      window.location.hash = 'tv';
    };

    document.getElementById('btn-header-settings').onclick = () => {
      window.location.hash = 'settings';
    };

    document.getElementById('hero-play-btn').onclick = () => {
      handleCardClick(featuredGame);
    };

    document.getElementById('hero-stream-btn').onclick = () => {
      PairingSystem.startHost();
    };

    // Bind Search Input Filter
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.oninput = (e) => {
        const query = e.target.value.toLowerCase();
        const grid = document.getElementById('card-grid');
        if (!grid) return;
        
        const cards = grid.querySelectorAll('a[data-item-id]');
        cards.forEach(card => {
          const game = gamesIndex.find(g => g.id === card.dataset.itemId);
          if (game) {
            const matches = game.title.toLowerCase().includes(query) || game.description.toLowerCase().includes(query);
            card.style.display = matches ? 'block' : 'none';
          }
        });
      };
    }

    // Initialize physical controller manager for Host / Normal Mode
    ControllerManager.init(false, '');

    // Connect bumpers category change handler
    ControllerManager.onCategoryChange = (direction) => {
      if (direction === 'next') {
        currentCategoryIndex = (currentCategoryIndex + 1) % categories.length;
      } else {
        currentCategoryIndex = (currentCategoryIndex - 1 + categories.length) % categories.length;
      }
      const cat = categories[currentCategoryIndex];
      filterCards(cat, gamesIndex);
      
      const btn = document.getElementById(`filter-${cat}`);
      if (btn) btn.focus();
    };

    // Connect Start button to toggle settings menu
    ControllerManager.onStartPressed = () => {
      window.location.hash = 'settings';
    };

    // Focus the first candidate card in grid for gamepad compatibility
    setTimeout(() => {
      const firstCard = document.querySelector('a[data-item-id]');
      if (firstCard) firstCard.focus();
    }, 200);

  } catch (err) {
    console.error('Failed to load dashboard:', err);
    APP_CONTAINER.innerHTML =
      '<div class="flex items-center justify-center h-screen text-[var(--color-text-secondary)]">' +
      `<p>Failed to load dashboard: ${err.message}</p></div>`;
  }
}

/* ── IFrame Viewer header control hooks ───────── */
if (VIEWER_CLOSE_BTN) {
  VIEWER_CLOSE_BTN.onclick = () => {
    GamePlayer.close();
    pairing.send({ type: 'close-game' }, true);
  };
}

/* ═══════════════════════════════════════════════
   Routing Event Listeners
   ═══════════════════════════════════════════════ */

window.addEventListener('hashchange', () => {
  // Gracefully clean up active connections when hashing pages
  pairing.disconnect();
  ControllerManager.setHostRoom('');
  checkRoutingMode();
});

window.addEventListener('popstate', () => {
  checkRoutingMode();
});

// Run Mode dispatcher initially
checkRoutingMode();
