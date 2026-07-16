/* ═══════════════════════════════════════════════
   HD Arcade — GameCard Component
   Renders large game cards with branded thumbnail gradients
   and details.
   ═══════════════════════════════════════════════ */

import { storage } from '../services/storage.js';

function createCategoryBadge(category) {
  const isGame = category === 'game';
  const badge = document.createElement('span');
  badge.className = `inline-block px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider rounded-full ${
    isGame
      ? 'bg-[var(--color-game)]/15 text-[var(--color-game)]'
      : 'bg-[var(--color-app)]/15 text-[var(--color-app)]'
  }`;
  badge.textContent = isGame ? 'Game' : 'App';
  return badge;
}

const CARD_THEMES = {
  'subway-surfers': {
    gradient: 'linear-gradient(135deg, #FFD93D 0%, #FF6B00 100%)',
    glyph: 'S',
    glyphColor: '#fff',
    shadow: 'rgba(255,107,0,0.35)',
  },
  '8-ball-billiards': {
    gradient: 'linear-gradient(135deg, #1a1a2e 0%, #0d7a3e 100%)',
    glyph: '8',
    glyphColor: '#fff',
    shadow: 'rgba(13,122,62,0.35)',
  },
  'geometry-dash': {
    gradient: 'linear-gradient(135deg, #39FF14 0%, #00BCD4 100%)',
    glyph: 'G',
    glyphColor: '#fff',
    shadow: 'rgba(57,255,20,0.3)',
  },
  'eaglercraft': {
    gradient: 'linear-gradient(135deg, #4a7c3f 0%, #2d1b0e 100%)',
    glyph: 'E',
    glyphColor: '#8BC34A',
    shadow: 'rgba(74,124,63,0.3)',
  },
  'gta-vice-city': {
    gradient: 'linear-gradient(135deg, #E040FB 0%, #00BFA5 60%, #1A237E 100%)',
    glyph: 'V',
    glyphColor: '#fff',
    shadow: 'rgba(224,64,251,0.3)',
  },
  'drift-hunters': {
    gradient: 'linear-gradient(135deg, #1f1c2c 0%, #928dab 100%)',
    glyph: 'D',
    glyphColor: '#e040fb',
    shadow: 'rgba(146,141,171,0.35)',
  },
  'youtube': {
    gradient: 'linear-gradient(135deg, #FF0000 0%, #CC0000 100%)',
    glyph: '▶',
    glyphColor: '#fff',
    shadow: 'rgba(255,0,0,0.3)',
    glassmorphism: true,
  },
  'instagram': {
    gradient: 'linear-gradient(135deg, #833AB4 0%, #FD1D1D 50%, #FCB045 100%)',
    glyph: 'IG',
    glyphColor: '#fff',
    shadow: 'rgba(131,58,180,0.3)',
    glassmorphism: true,
  },
  'hdsfd-dashboard': {
    gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    glyph: 'HD',
    glyphColor: '#fff',
    shadow: 'rgba(102,126,234,0.3)',
    glassmorphism: true,
  },
  'hyperhrishihd': {
    gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    glyph: 'HH',
    glyphColor: '#fff',
    shadow: 'rgba(245,87,108,0.3)',
    glassmorphism: true,
  },
};

const DEFAULT_THEME = {
  gradient: 'linear-gradient(135deg, var(--color-surface-hover) 0%, var(--color-surface-card) 100%)',
  glyph: '?',
  glyphColor: 'var(--color-text-secondary)',
  shadow: 'transparent',
};

export const GameCard = {
  getTheme(gameId) {
    return CARD_THEMES[gameId] || DEFAULT_THEME;
  },

  buildGradientFallback(item) {
    const theme = this.getTheme(item.id);
    const isGlass = theme.glassmorphism === true;

    const wrapper = document.createElement('div');
    wrapper.className = 'w-full h-full flex items-center justify-center select-none relative';
    wrapper.style.background = theme.gradient;

    if (isGlass) {
      const glass = document.createElement('div');
      glass.className = 'flex items-center justify-center rounded-xl';
      glass.style.cssText =
        'width:64px;height:64px;background:rgba(255,255,255,0.12);' +
        'backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);' +
        'border:1px solid rgba(255,255,255,0.18);border-radius:1rem;';

      const glyph = document.createElement('span');
      glyph.style.cssText = `font-size:1.5rem;font-weight:800;color:${theme.glyphColor};letter-spacing:-0.02em;`;
      glyph.textContent = theme.glyph;
      glass.appendChild(glyph);
      wrapper.appendChild(glass);
    } else {
      const glyph = document.createElement('span');
      glyph.style.cssText =
        `font-size:3rem;font-weight:900;color:${theme.glyphColor};` +
        'text-shadow:0 2px 12px rgba(0,0,0,0.3);letter-spacing:-0.03em;';
      glyph.textContent = theme.glyph;
      wrapper.appendChild(glyph);
    }

    return wrapper;
  },

  createCard(item, index, onFavoriteToggle) {
    const card = document.createElement('a');
    card.href = item.url;
    card.id = `card-${item.id}`;
    card.dataset.itemId = item.id;
    card.rel = 'noopener noreferrer';

    const theme = this.getTheme(item.id);

    // Grid item styled with standard focus triggers
    card.className =
      'group card-element glow-border block rounded-2xl overflow-hidden ' +
      'bg-[var(--color-surface-card)] border border-[var(--color-border)] ' +
      'transition-all duration-300 hover:bg-[var(--color-surface-hover)] ' +
      'hover:-translate-y-1 hover:shadow-xl ' +
      'focus:outline-none';
    card.style.animationDelay = `${index * 60}ms`;
    card.style.setProperty('--card-shadow', theme.shadow);

    /* ── Thumbnail Area ────────────────────────── */
    const imgWrap = document.createElement('div');
    imgWrap.className = 'relative aspect-video overflow-hidden';

    const img = document.createElement('img');
    img.src = item.thumbnail;
    img.alt = item.title;
    img.loading = 'lazy';
    img.className =
      'w-full h-full object-cover transition-transform duration-500 group-hover:scale-105';

    img.onerror = () => {
      img.remove();
      const fallback = this.buildGradientFallback(item);
      imgWrap.appendChild(fallback);
    };

    img.onload = () => {
      imgWrap.classList.remove('shimmer');
    };

    imgWrap.classList.add('shimmer');
    imgWrap.appendChild(img);

    /* ── Favorite Star Button ─────────────────── */
    const isFav = storage.isFavorite(item.id);
    const favBtn = document.createElement('button');
    favBtn.className = `absolute top-2 left-2 p-1.5 rounded-lg backdrop-blur-sm z-10 transition-all cursor-pointer ${
      isFav ? 'bg-indigo-500/80 text-yellow-300' : 'bg-black/50 text-white/50 hover:text-white/90'
    }`;
    favBtn.title = isFav ? 'Remove from Favorites' : 'Add to Favorites';
    favBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    `;
    favBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      storage.toggleFavorite(item.id);
      onFavoriteToggle?.();
    };
    imgWrap.appendChild(favBtn);

    /* ── External Icon Overlay ─────────────────── */
    if (item.external) {
      const ext = document.createElement('div');
      ext.className =
        'absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 backdrop-blur-sm text-white/70 z-10';
      ext.innerHTML =
        '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" ' +
        'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
        '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>' +
        '<polyline points="15 3 21 3 21 9"/>' +
        '<line x1="10" y1="14" x2="21" y2="3"/></svg>';
      imgWrap.appendChild(ext);
    }

    /* ── Info Row ──────────────────────────────── */
    const info = document.createElement('div');
    info.className = 'px-4 py-3 flex flex-col gap-1.5';

    const topRow = document.createElement('div');
    topRow.className = 'flex items-center justify-between gap-2';

    const title = document.createElement('h3');
    title.className = 'text-sm font-bold text-[var(--color-text-primary)] truncate';
    title.textContent = item.title;

    topRow.appendChild(title);
    topRow.appendChild(createCategoryBadge(item.category));

    // Compatibility badges row
    const badgesRow = document.createElement('div');
    badgesRow.className = 'flex flex-wrap gap-1 mt-0.5';

    if (item.controllerSupport) {
      const b = document.createElement('span');
      b.className = 'px-1.5 py-0.5 rounded text-[8px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      b.textContent = '🎮 CONTROLLER';
      badgesRow.appendChild(b);
    }
    if (item.iframeAllowed) {
      const b = document.createElement('span');
      b.className = 'px-1.5 py-0.5 rounded text-[8px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
      b.textContent = '📺 TV READY';
      badgesRow.appendChild(b);
    }
    if (item.keyboardRequired) {
      const b = document.createElement('span');
      b.className = 'px-1.5 py-0.5 rounded text-[8px] font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/20';
      b.textContent = '⌨️ KEYBOARD';
      badgesRow.appendChild(b);
    }

    info.appendChild(topRow);
    info.appendChild(badgesRow);

    card.appendChild(imgWrap);
    card.appendChild(info);
    return card;
  }
};
