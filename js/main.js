/**
 * EriniumFaction Wiki — main.js
 * Handles all interactive features for the wiki.
 *
 * Features:
 *  1.  Theme Toggle (Dark / Light)
 *  2.  Translation Overlay (Google Translate wrapper)
 *  3.  Sidebar Navigation (active highlight, mobile hamburger, tablet collapse)
 *  4.  Search Functionality (client-side, Ctrl+K shortcut)
 *  5.  Table of Contents (auto-generated, sticky, scroll-spy)
 *  6.  Scroll Animations (Intersection Observer, staggered)
 *  7.  Accordion Components
 *  8.  Background Particles (CSS-animated stars)
 *  9.  Progress Bar Animation (scroll-into-view)
 * 10.  Copy Command buttons
 * 11.  Image Lightbox
 * 12.  Smooth Page Navigation (anchor links)
 */

'use strict';

/* ============================================================
   UTILITIES
   ============================================================ */

/**
 * Cookie helpers.
 */
/**
 * Storage helpers — uses localStorage (works on file:// protocol).
 * Falls back to in-memory storage if localStorage is unavailable.
 */
const Cookie = {
  _mem: {},

  /**
   * Set a value.
   * @param {string} name
   * @param {string} value
   * @param {number} days  (ignored — localStorage has no expiry, kept for API compat)
   */
  set(name, value, days) {
    try {
      localStorage.setItem(name, value);
    } catch (e) {
      Cookie._mem[name] = value;
    }
  },

  /**
   * Get a value or null.
   * @param {string} name
   * @returns {string|null}
   */
  get(name) {
    try {
      return localStorage.getItem(name);
    } catch (e) {
      return Cookie._mem[name] || null;
    }
  },

  /**
   * Remove a value.
   * @param {string} name
   */
  remove(name) {
    try {
      localStorage.removeItem(name);
    } catch (e) {
      delete Cookie._mem[name];
    }
  }
};

/**
 * Escape a string for use in a regex.
 * @param {string} str
 * @returns {string}
 */
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Clamp a number between min and max.
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

/* ============================================================
   1. THEME TOGGLE
   ============================================================ */

(function initTheme() {
  const COOKIE_NAME = 'erinium-theme';
  const TRANSITION_CLASS = 'theme-transitioning';
  const TRANSITION_DURATION = 500; // ms

  /** Apply a theme without transition (used on initial load). */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  /** Update all toggle button icons. */
  function updateToggleIcons(theme) {
    const buttons = document.querySelectorAll('[data-theme-toggle]');
    buttons.forEach(function(btn) {
      // Expect icon element inside the button
      const icon = btn.querySelector('.theme-icon');
      if (!icon) return;
      if (theme === 'dark') {
        // Show moon icon — indicates that clicking will switch to dark (currently light)
        // Convention: the button shows what you *will get* on click
        // We show the current state icon so the user knows the active mode.
        icon.textContent = '🌙';
        btn.setAttribute('aria-label', 'Activer le thème clair');
        btn.setAttribute('title', 'Thème clair');
      } else {
        icon.textContent = '☀️';
        btn.setAttribute('aria-label', 'Activer le thème sombre');
        btn.setAttribute('title', 'Thème sombre');
      }
    });
  }

  /** Toggle theme with smooth transition. */
  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';

    // Add transition class to body
    document.body.classList.add(TRANSITION_CLASS);

    applyTheme(next);
    updateToggleIcons(next);
    Cookie.set(COOKIE_NAME, next, 365);

    setTimeout(function() {
      document.body.classList.remove(TRANSITION_CLASS);
    }, TRANSITION_DURATION);
  }

  // Read saved theme or default to dark
  const savedTheme = Cookie.get(COOKIE_NAME) || 'dark';
  applyTheme(savedTheme);

  // Attach listeners once DOM is ready (called after DOMContentLoaded)
  window._initThemeListeners = function() {
    updateToggleIcons(savedTheme);
    document.querySelectorAll('[data-theme-toggle]').forEach(function(btn) {
      btn.addEventListener('click', toggleTheme);
    });
  };
})();

/* ============================================================
   2. TRANSLATION OVERLAY
   ============================================================ */

(function initTranslation() {
  var LANGUAGES = [
    { code: 'fr', label: 'Français (original)',  flag: '🇫🇷' },
    { code: 'en', label: 'English',              flag: '🇬🇧' },
    { code: 'es', label: 'Español',              flag: '🇪🇸' },
    { code: 'de', label: 'Deutsch',              flag: '🇩🇪' },
    { code: 'pt', label: 'Português',            flag: '🇵🇹' },
    { code: 'it', label: 'Italiano',             flag: '🇮🇹' },
    { code: 'ru', label: 'Русский',              flag: '🇷🇺' },
    { code: 'zh-CN', label: '中文',              flag: '🇨🇳' },
    { code: 'ja', label: '日本語',               flag: '🇯🇵' },
    { code: 'ko', label: '한국어',               flag: '🇰🇷' },
    { code: 'ar', label: 'العربية',             flag: '🇸🇦' }
  ];

  var overlayEl = null;
  var isOpen = false;
  var isTranslating = false;
  var originalTexts = null; // Map<Node, string> — originals for restore

  // ── Cache helpers ──────────────────────────────────────────
  // Cache key = page path + lang code. Stores {texts: string[], translated: string[], ts: number}
  var CACHE_PREFIX = 'erinium-tl-v3-';
  var CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

  function cacheKey(langCode) {
    var page = location.pathname.split('/').pop() || 'index.html';
    return CACHE_PREFIX + page + '-' + langCode;
  }

  function getCached(langCode) {
    try {
      var raw = localStorage.getItem(cacheKey(langCode));
      if (!raw) return null;
      var entry = JSON.parse(raw);
      // Expired?
      if (Date.now() - entry.ts > CACHE_TTL) {
        localStorage.removeItem(cacheKey(langCode));
        return null;
      }
      return entry;
    } catch (e) { return null; }
  }

  function setCache(langCode, originals, translated) {
    try {
      localStorage.setItem(cacheKey(langCode), JSON.stringify({
        texts: originals,
        translated: translated,
        ts: Date.now()
      }));
    } catch (e) { /* quota exceeded — ignore */ }
  }

  // ── Text node collection ───────────────────────────────────
  function collectTextNodes() {
    // Translate EVERYTHING visible — sidebar, header, content, footer
    // Only skip: scripts, styles, code blocks, translate overlay, search dropdown
    var scope = document.body;
    if (!scope) return [];

    var walker = document.createTreeWalker(
      scope,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: function(node) {
          var parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          var tag = parent.tagName;
          // Skip non-visible elements
          if (/^(SCRIPT|STYLE|CODE|PRE|NOSCRIPT|SVG|MATH)$/.test(tag)) return NodeFilter.FILTER_REJECT;
          // Skip only the translate overlay itself and live search results
          if (parent.closest('.translate-overlay, [data-search-results]')) return NodeFilter.FILTER_REJECT;
          // Skip empty text
          var trimmed = node.textContent.trim();
          if (!trimmed) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );
    var nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    return nodes;
  }

  // ── Google Translate internal API (CORS open, no key needed) ─
  // Endpoint: https://translate.googleapis.com/translate_a/single?client=gtx&sl=FR&tl=EN&dt=t&q=TEXT
  // Response: array where [0] contains [[translated, original, ...], ...]

  var GT_BASE = 'https://translate.googleapis.com/translate_a/single';

  /**
   * Translate a batch of texts via Google's internal API.
   * Joins texts with ||| separator, sends one request per ~4000 char chunk.
   */
  // Exposed globally so the search module can translate results
  window._wikiTranslateBatch = translateBatch;
  function translateBatch(texts, fromLang, toLang) {
    var SEP = ' ||| ';
    var chunks = [];   // joined text strings
    var chunkMap = [];  // chunkMap[i] = array of text indices in that chunk

    var current = '';
    var currentIndices = [];

    for (var i = 0; i < texts.length; i++) {
      var t = texts[i].trim();
      if (!t) continue;
      if ((current + SEP + t).length > 4000 && current) {
        chunks.push(current);
        chunkMap.push(currentIndices.slice());
        current = t;
        currentIndices = [i];
      } else {
        current = current ? (current + SEP + t) : t;
        currentIndices.push(i);
      }
    }
    if (current) {
      chunks.push(current);
      chunkMap.push(currentIndices.slice());
    }

    var promises = chunks.map(function(chunk, ci) {
      var url = GT_BASE + '?client=gtx&sl=' + fromLang + '&tl=' + toLang + '&dt=t&q=' + encodeURIComponent(chunk);
      return fetch(url)
        .then(function(r) { return r.json(); })
        .then(function(data) {
          // data[0] = array of [translatedPart, originalPart, ...]
          // Join all translated parts back into one string
          var full = '';
          if (data && data[0]) {
            for (var s = 0; s < data[0].length; s++) {
              if (data[0][s] && data[0][s][0]) full += data[0][s][0];
            }
          }
          // Split by separator
          var parts = full.split('|||').map(function(p) { return p.trim(); });
          return { parts: parts, indices: chunkMap[ci] };
        })
        .catch(function() {
          // On error, return originals
          return { parts: chunk.split(SEP).map(function(p) { return p.trim(); }), indices: chunkMap[ci] };
        });
    });

    return Promise.all(promises).then(function(results) {
      var flat = new Array(texts.length);
      for (var r = 0; r < results.length; r++) {
        var parts = results[r].parts;
        var indices = results[r].indices;
        for (var p = 0; p < indices.length; p++) {
          flat[indices[p]] = (p < parts.length && parts[p]) ? parts[p] : texts[indices[p]];
        }
      }
      // Fill gaps with originals
      for (var f = 0; f < flat.length; f++) {
        if (!flat[f]) flat[f] = texts[f];
      }
      return flat;
    });
  }

  // ── Apply translated texts to DOM ──────────────────────────
  function applyTranslations(textNodes, translated) {
    var idx = 0;
    textNodes.forEach(function(node) {
      if (idx < translated.length && translated[idx]) {
        var orig = node.textContent;
        var leadingSpace = orig.match(/^\s*/)[0];
        var trailingSpace = orig.match(/\s*$/)[0];
        node.textContent = leadingSpace + translated[idx] + trailingSpace;
      }
      idx++;
    });
  }

  // ── Main translate function ────────────────────────────────
  function translatePage(langCode) { try {
    if (langCode === 'fr') {
      if (originalTexts) {
        originalTexts.forEach(function(val, node) {
          node.textContent = val;
        });
        originalTexts = null;
      }
      Cookie.set('erinium-lang', 'fr', 365);
      updateActiveBtn('fr');
      showToast('Langue restaurée', '#2ECC71');
      return;
    }

    // Reset stale lock (if previous translation crashed after 10s, force unlock)
    if (isTranslating) {
      if (window._translateStartTime && (Date.now() - window._translateStartTime > 10000)) {
        console.warn('[EriniumWiki] Translation lock stale, forcing reset');
        isTranslating = false;
      } else {
        console.warn('[EriniumWiki] Translation already in progress, skipping');
        return;
      }
    }

    var textNodes = collectTextNodes();
    console.log('[EriniumWiki] Found', textNodes.length, 'text nodes to translate');
    if (textNodes.length === 0) {
      console.warn('[EriniumWiki] No text nodes found! Body children:', document.body.children.length);
      return;
    }
    var texts = textNodes.map(function(n) { return n.textContent.trim(); });

    // Save originals for restore (only once per session)
    if (!originalTexts) {
      originalTexts = new Map();
      textNodes.forEach(function(n) {
        originalTexts.set(n, n.textContent);
      });
    }

    // Try cache first
    var cached = getCached(langCode);
    if (cached && cached.texts.length === texts.length) {
      // Verify cache matches current content (first + last text)
      var match = cached.texts[0] === texts[0] &&
                  cached.texts[cached.texts.length - 1] === texts[texts.length - 1];
      if (match) {
        console.log('[EriniumWiki] Using cached translation');
        applyTranslations(textNodes, cached.translated);
        Cookie.set('erinium-lang', langCode, 365);
        updateActiveBtn(langCode);
        showToast('Page traduite (cache)', '#2ECC71');
        return;
      } else {
        console.log('[EriniumWiki] Cache mismatch, fetching fresh translation');
      }
    }

    // No cache — fetch from API
    isTranslating = true;
    window._translateStartTime = Date.now();
    showToast('Traduction en cours…', '#6B2FA0');

    translateBatch(texts, 'fr', langCode)
      .then(function(translated) {
        applyTranslations(textNodes, translated);
        setCache(langCode, texts, translated);
        Cookie.set('erinium-lang', langCode, 365);
        updateActiveBtn(langCode);
        isTranslating = false;
        showToast('Page traduite !', '#2ECC71');
      })
      .catch(function(err) {
        console.error('[EriniumWiki] Translation error:', err);
        isTranslating = false;
        showToast('Erreur de traduction', '#E74C3C');
      });
  } catch(ex) {
    console.error('[EriniumWiki] translatePage crashed:', ex);
    isTranslating = false;
  } }

  // ── Auto-translate on page load if lang is saved ───────────
  function autoTranslateOnLoad() {
    var savedLang = Cookie.get('erinium-lang');
    if (!savedLang || savedLang === 'fr') return;
    // Translate as soon as the page is ready
    if (document.readyState === 'complete') {
      translatePage(savedLang);
    } else {
      window.addEventListener('load', function() {
        translatePage(savedLang);
      });
    }
  }

  function showToast(message, color) {
    var toast = document.createElement('div');
    toast.style.cssText = 'position:fixed;bottom:20px;right:20px;background:' + (color || '#6B2FA0') + ';color:#fff;padding:12px 20px;border-radius:8px;font-size:0.85rem;z-index:99999;font-family:Inter,sans-serif;box-shadow:0 8px 24px rgba(0,0,0,0.3);transition:opacity 0.3s ease;';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(function() {
      toast.style.opacity = '0';
      setTimeout(function() { toast.remove(); }, 300);
    }, 3000);
  }

  function updateActiveBtn(langCode) {
    if (!overlayEl) return;
    overlayEl.querySelectorAll('.translate-lang-btn').forEach(function(btn) {
      var code = btn.getAttribute('data-lang');
      var check = btn.querySelector('.translate-check');
      if (code === langCode) {
        btn.classList.add('is-active');
        if (!check) {
          var span = document.createElement('span');
          span.className = 'translate-check';
          span.style.cssText = 'margin-left:auto;font-size:0.75rem;color:var(--accent-secondary);';
          span.textContent = '✓';
          btn.appendChild(span);
        }
      } else {
        btn.classList.remove('is-active');
        if (check) check.remove();
      }
    });
  }

  function buildOverlay() {
    overlayEl = document.createElement('div');
    overlayEl.className = 'translate-overlay';
    overlayEl.setAttribute('role', 'dialog');
    overlayEl.setAttribute('aria-modal', 'true');
    overlayEl.setAttribute('aria-label', 'Sélection de langue');

    var savedLang = Cookie.get('erinium-lang') || 'fr';

    var bodyContent = LANGUAGES.map(function(lang) {
      var isActive = lang.code === savedLang;
      return (
        '<button class="translate-lang-btn' + (isActive ? ' is-active' : '') + '" data-lang="' + lang.code + '">' +
          '<span class="translate-lang-btn__flag">' + lang.flag + '</span>' +
          '<span class="translate-lang-btn__label">' + lang.label + '</span>' +
          (isActive ? '<span class="translate-check" style="margin-left:auto;font-size:0.75rem;color:var(--accent-secondary);">✓</span>' : '') +
        '</button>'
      );
    }).join('');

    overlayEl.innerHTML = [
      '<div class="translate-modal glass-card">',
        '<div class="translate-modal__header">',
          '<span class="translate-modal__title">🌐 Traduire cette page</span>',
          '<button class="translate-modal__close" aria-label="Fermer" data-translate-close>✕</button>',
        '</div>',
        '<div class="translate-modal__body" style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;">',
          bodyContent,
        '</div>',
        '<div class="translate-modal__footer">',
          '<p style="color:var(--text-faint);font-size:0.72rem;margin:0;text-align:center;">',
            'Traduction automatique. Sélectionnez Français pour restaurer.',
          '</p>',
        '</div>',
      '</div>'
    ].join('');

    document.body.appendChild(overlayEl);

    // Close on backdrop
    overlayEl.addEventListener('click', function(e) {
      if (e.target === overlayEl) closeOverlay();
    });

    // Close button
    overlayEl.querySelector('[data-translate-close]').addEventListener('click', closeOverlay);

    // Language buttons
    overlayEl.querySelectorAll('[data-lang]').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var lang = btn.getAttribute('data-lang');
        closeOverlay();
        translatePage(lang);
      });
    });
  }

  function openOverlay() {
    if (overlayEl) overlayEl.remove();
    overlayEl = null;
    buildOverlay();
    overlayEl.classList.add('is-visible');
    isOpen = true;
  }

  function closeOverlay() {
    if (!overlayEl) return;
    overlayEl.classList.remove('is-visible');
    isOpen = false;
  }

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && isOpen) closeOverlay();
  });

  window._initTranslationListeners = function() {
    document.querySelectorAll('[data-translate-toggle]').forEach(function(btn) {
      btn.addEventListener('click', openOverlay);
    });
    // Auto-translate every page if a language was previously selected
    autoTranslateOnLoad();
  };

})();

/* ============================================================
   3. SIDEBAR NAVIGATION
   ============================================================ */

(function initSidebar() {
  window._initSidebar = function() {
    const sidebar    = document.querySelector('.wiki-sidebar');
    const hamburger  = document.querySelector('[data-hamburger]');
    const overlay    = document.querySelector('.sidebar-overlay');
    const collapseBtn = document.querySelector('[data-sidebar-collapse]');

    if (!sidebar) return;

    // --- Active page highlight ---
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    const navLinks = sidebar.querySelectorAll('a[href]');
    navLinks.forEach(function(link) {
      const href = link.getAttribute('href').split('/').pop().split('#')[0];
      if (href === currentPath) {
        link.classList.add('is-active');
        // Expand parent group if nested
        let parent = link.closest('.nav-group');
        if (parent) parent.classList.add('is-open');
      }
    });

    // --- Mobile hamburger ---
    function openSidebar() {
      sidebar.classList.add('is-open');
      if (overlay) overlay.classList.add('is-visible');
      if (hamburger) hamburger.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
      sidebar.classList.remove('is-open');
      if (overlay) overlay.classList.remove('is-visible');
      if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }

    if (hamburger) {
      hamburger.addEventListener('click', function() {
        const expanded = hamburger.getAttribute('aria-expanded') === 'true';
        if (expanded) closeSidebar(); else openSidebar();
      });
    }

    if (overlay) {
      overlay.addEventListener('click', closeSidebar);
    }

    // Close sidebar when a link is clicked on mobile
    navLinks.forEach(function(link) {
      link.addEventListener('click', function() {
        if (window.innerWidth < 768) closeSidebar();
      });
    });

    // --- Tablet collapse ---
    if (collapseBtn) {
      collapseBtn.addEventListener('click', function() {
        const isCollapsed = sidebar.classList.toggle('is-collapsed');
        collapseBtn.setAttribute('aria-expanded', String(!isCollapsed));
        Cookie.set('erinium-sidebar-collapsed', isCollapsed ? '1' : '0', 30);
      });

      // Restore collapse state
      if (Cookie.get('erinium-sidebar-collapsed') === '1') {
        sidebar.classList.add('is-collapsed');
        collapseBtn.setAttribute('aria-expanded', 'false');
      }
    }

    // Close on Escape
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') closeSidebar();
    });
  };
})();

/* ============================================================
   4. SEARCH FUNCTIONALITY (global, all pages)
   ============================================================ */

(function initSearch() {
  var MIN_QUERY_LEN = 2;
  var MAX_RESULTS   = 10;

  /** Page icon mapping. */
  var PAGE_ICONS = {
    'getting-started': '🌟',
    'materials':       '🪨',
    'weapons':         '⚔️',
    'armor':           '🛡️',
    'gems':            '💎',
    'accessories':     '💍',
    'builds':          '🏆',
    'rpg':             '📊',
    'perks':           '✨',
    'magic':           '🔮',
    'spells':          '💫',
    'factions':        '🏰',
    'economy':         '💰',
    'mining':          '⛏️',
    'biomes':          '🌿',
    'chat':            '💬',
    'teleportation':   '🌀',
    'commands':        '📋',
    'combat':          '🗡️',
    'items':           '🎒'
  };

  /** Loaded once from the server. */
  var globalIndex = null;
  var indexLoading = false;

  /** Fetch and cache the search index. */
  function loadIndex(callback) {
    if (globalIndex) { callback(globalIndex); return; }
    if (indexLoading) return;
    indexLoading = true;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', '/api/search-index', true);
    xhr.onload = function() {
      if (xhr.status === 200) {
        try { globalIndex = JSON.parse(xhr.responseText); }
        catch (e) { globalIndex = []; }
      } else {
        globalIndex = [];
      }
      indexLoading = false;
      callback(globalIndex);
    };
    xhr.onerror = function() { globalIndex = []; indexLoading = false; callback(globalIndex); };
    xhr.send();
  }

  /** Highlight all words of query within text. */
  function highlight(text, words) {
    var result = text;
    words.forEach(function(w) {
      if (!w) return;
      result = result.replace(new RegExp('(' + escapeRegex(w) + ')', 'gi'), '<mark>$1</mark>');
    });
    return result;
  }

  /**
   * Build an excerpt around the first match.
   * Returns up to 160 chars, centred on the first occurrence.
   */
  function excerpt(text, words) {
    var WINDOW = 80;
    var idx = -1;
    for (var i = 0; i < words.length; i++) {
      var m = text.search(new RegExp(escapeRegex(words[i]), 'i'));
      if (m !== -1 && (idx === -1 || m < idx)) idx = m;
    }
    if (idx === -1) return text.slice(0, 160);
    var start = Math.max(0, idx - WINDOW);
    var end   = Math.min(text.length, idx + WINDOW);
    var snip  = (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
    return snip;
  }

  /** Filter index by query. All words must match. */
  function search(index, query) {
    var words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return [];
    return index.filter(function(entry) {
      var haystack = ((entry.section || '') + ' ' + (entry.text || '')).toLowerCase();
      return words.every(function(w) { return haystack.indexOf(w) !== -1; });
    }).slice(0, MAX_RESULTS);
  }

  window._initSearch = function() {
    var input    = document.querySelector('[data-search-input]');
    var dropdown = document.querySelector('[data-search-results]');
    var wrapper  = document.querySelector('[data-search-wrapper]');

    if (!input || !dropdown) return;

    var activeIndex = -1;
    var debounceTimer = null;

    function showDropdown() {
      dropdown.classList.add('is-visible');
      wrapper && wrapper.classList.add('is-open');
    }

    function hideDropdown() {
      dropdown.classList.remove('is-visible');
      wrapper && wrapper.classList.remove('is-open');
      activeIndex = -1;
    }

    function setActive(i) {
      var items = dropdown.querySelectorAll('.search-result');
      items.forEach(function(el) { el.classList.remove('is-active'); });
      activeIndex = clamp(i, -1, items.length - 1);
      if (activeIndex >= 0) {
        items[activeIndex].classList.add('is-active');
        items[activeIndex].scrollIntoView({ block: 'nearest' });
      }
    }

    function renderResults(items, words) {
      if (items.length === 0) {
        dropdown.innerHTML =
          '<div class="search-no-results">Aucun résultat pour « ' + escapeRegex(words.join(' ')) + ' »</div>';
        return;
      }

      dropdown.innerHTML = items.map(function(item, i) {
        var icon = PAGE_ICONS[item.page] || '📄';
        var href = item.route + (item.sectionId ? '#' + item.sectionId : '');
        var snip = excerpt(item.text || '', words);
        return (
          '<a class="search-result" href="' + href + '" data-result-index="' + i + '">' +
            '<div class="search-result__page">' + icon + ' ' + item.pageTitle + '</div>' +
            '<div class="search-result__section">' + highlight(item.section || '', words) + '</div>' +
            (snip ? '<div class="search-result__excerpt">' + highlight(snip, words) + '</div>' : '') +
          '</a>'
        );
      }).join('');

      dropdown.querySelectorAll('.search-result').forEach(function(el) {
        el.addEventListener('click', function() {
          hideDropdown();
          input.value = '';
        });
      });

      // Translate search results if a language is selected
      var savedLang = Cookie.get('erinium-lang');
      if (savedLang && savedLang !== 'fr' && typeof window._wikiTranslateBatch === 'function') {
        var textEls = dropdown.querySelectorAll('.search-result__page, .search-result__section, .search-result__excerpt');
        var origTexts = [];
        for (var t = 0; t < textEls.length; t++) {
          origTexts.push(textEls[t].textContent);
        }
        if (origTexts.length > 0) {
          window._wikiTranslateBatch(origTexts, 'fr', savedLang).then(function(translated) {
            for (var t = 0; t < textEls.length && t < translated.length; t++) {
              textEls[t].textContent = translated[t];
            }
          }).catch(function() { /* keep french on error */ });
        }
      }
    }

    function runSearch() {
      var query = input.value.trim();
      if (query.length < MIN_QUERY_LEN) { hideDropdown(); return; }
      var words = query.toLowerCase().split(/\s+/).filter(Boolean);

      function doSearch(index) {
        var results = search(index, query);
        renderResults(results, words);
        showDropdown();
        activeIndex = -1;
      }

      if (globalIndex) {
        doSearch(globalIndex);
      } else {
        loadIndex(doSearch);
      }
    }

    // Pre-load index on first focus so it's ready when the user types
    input.addEventListener('focus', function() {
      if (!globalIndex && !indexLoading) loadIndex(function() {});
    }, { once: true });

    input.addEventListener('input', function() {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(runSearch, 150);
    });

    input.addEventListener('keydown', function(e) {
      var items = dropdown.querySelectorAll('.search-result');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActive(activeIndex + 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActive(activeIndex - 1);
      } else if (e.key === 'Enter') {
        if (activeIndex >= 0 && items[activeIndex]) {
          items[activeIndex].click();
        }
      } else if (e.key === 'Escape') {
        hideDropdown();
        input.blur();
      }
    });

    // Hide when clicking outside
    document.addEventListener('click', function(e) {
      if (!input.contains(e.target) && !dropdown.contains(e.target)) {
        hideDropdown();
      }
    });

    // Ctrl+K shortcut
    document.addEventListener('keydown', function(e) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        input.focus();
        input.select();
      }
    });
  };
})();

/* ============================================================
   5. TABLE OF CONTENTS
   ============================================================ */

(function initTOC() {
  window._initTOC = function() {
    const tocContainer = document.querySelector('[data-toc]');
    if (!tocContainer) return;

    // Look for headings in main, or fall back to .content-body, or the whole document
    var scope = document.querySelector('main') || document.querySelector('.content-body') || document;
    const headings = Array.from(scope.querySelectorAll('h2, h3'));
    if (headings.length < 2) {
      tocContainer.style.display = 'none';
      return;
    }

    // Ensure each heading has an id
    headings.forEach(function(h, i) {
      if (!h.id) {
        h.id = 'toc-heading-' + i + '-' + h.textContent.trim()
          .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
      }
    });

    // Build TOC list
    const list = document.createElement('ul');
    list.className = 'toc-list';

    headings.forEach(function(h) {
      const li   = document.createElement('li');
      li.className = 'toc-item toc-item--' + h.tagName.toLowerCase();
      const link = document.createElement('a');
      link.href = '#' + h.id;
      link.textContent = h.textContent.trim();
      link.className = 'toc-link';
      link.setAttribute('data-toc-link', h.id);
      li.appendChild(link);
      list.appendChild(li);

      link.addEventListener('click', function(e) {
        e.preventDefault();
        const target = document.getElementById(h.id);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
          history.pushState(null, '', '#' + h.id);
        }
      });
    });

    tocContainer.appendChild(list);

    // Scroll-spy via Intersection Observer
    let activeId = null;

    const observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          activeId = entry.target.id;
          updateActive(activeId);
        }
      });
    }, {
      rootMargin: '0px 0px -60% 0px',
      threshold: 0
    });

    headings.forEach(function(h) { observer.observe(h); });

    function updateActive(id) {
      tocContainer.querySelectorAll('.toc-link').forEach(function(link) {
        link.classList.toggle('is-active', link.getAttribute('data-toc-link') === id);
      });
    }
  };
})();

/* ============================================================
   6. SCROLL ANIMATIONS
   ============================================================ */

(function initScrollAnimations() {
  window._initScrollAnimations = function() {
    const ANIMATED_SELECTORS = [
      '.glass-card',
      '.spell-card',
      '.perk-card',
      '.feature-card',
      '.stat-block',
      '.command-block',
      '.info-block',
      '[data-animate]'
    ].join(', ');

    const elements = Array.from(document.querySelectorAll(ANIMATED_SELECTORS));

    if (!elements.length) return;

    // Group elements that are visually close together for staggered effect
    elements.forEach(function(el, i) {
      el.classList.add('anim-ready');
      // Stagger based on position within parent
      const siblings = Array.from(el.parentNode.children).filter(function(child) {
        return child.classList.contains('anim-ready');
      });
      const staggerIndex = siblings.indexOf(el);
      el.style.transitionDelay = (staggerIndex * 60) + 'ms';
    });

    const observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('anim-visible');
          // Animate only once
          observer.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -40px 0px'
    });

    elements.forEach(function(el) { observer.observe(el); });
  };
})();

/* ============================================================
   7. ACCORDION COMPONENTS
   ============================================================ */

(function initAccordion() {
  window._initAccordion = function() {
    const accordionItems = document.querySelectorAll('.accordion-item');

    accordionItems.forEach(function(item) {
      const trigger = item.querySelector('.accordion-trigger');
      const body    = item.querySelector('.accordion-body');
      const chevron = item.querySelector('.accordion-chevron');

      if (!trigger || !body) return;

      // Set initial max-height for animation
      body.style.maxHeight = item.classList.contains('is-open')
        ? body.scrollHeight + 'px'
        : '0';
      body.style.overflow = 'hidden';
      body.style.transition = 'max-height 0.35s ease, opacity 0.35s ease';

      trigger.addEventListener('click', function() {
        const isOpen = item.classList.toggle('is-open');

        body.style.maxHeight = isOpen ? body.scrollHeight + 'px' : '0';
        body.style.opacity   = isOpen ? '1' : '0';

        if (chevron) {
          chevron.style.transform = isOpen ? 'rotate(180deg)' : 'rotate(0deg)';
        }

        trigger.setAttribute('aria-expanded', String(isOpen));
      });
    });
  };
})();

/* ============================================================
   8. BACKGROUND PARTICLES
   ============================================================ */

(function initParticles() {
  const PARTICLE_COUNT = 30;

  window._initParticles = function() {
    const container = document.querySelector('.floating-particles');
    if (!container) return;

    // Clear existing content
    container.innerHTML = '';

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const particle = document.createElement('span');
      particle.className = 'particle';

      // Random position
      const x = Math.random() * 100; // %
      const y = Math.random() * 100; // %

      // Random size (1–3px)
      const size = (Math.random() * 2 + 1).toFixed(1);

      // Random base opacity
      const opacity = (Math.random() * 0.5 + 0.2).toFixed(2);

      // Random animation duration (3–8s) and delay (0–5s)
      const duration = (Math.random() * 5 + 3).toFixed(1);
      const delay    = (Math.random() * 5).toFixed(1);

      particle.style.cssText = [
        'position: absolute;',
        'left: ' + x + '%;',
        'top: ' + y + '%;',
        'width: ' + size + 'px;',
        'height: ' + size + 'px;',
        'border-radius: 50%;',
        'background: currentColor;',
        'opacity: ' + opacity + ';',
        'animation: particleTwinkle ' + duration + 's ' + delay + 's infinite ease-in-out alternate;',
        'pointer-events: none;',
        'will-change: opacity, transform;'
      ].join(' ');

      container.appendChild(particle);
    }

    // Inject keyframes once if not already present
    if (!document.getElementById('particle-keyframes')) {
      const style = document.createElement('style');
      style.id = 'particle-keyframes';
      style.textContent = [
        '@keyframes particleTwinkle {',
        '  from { opacity: var(--p-op, 0.2); transform: scale(1); }',
        '  to   { opacity: 1; transform: scale(1.6); }',
        '}'
      ].join('\n');
      document.head.appendChild(style);
    }
  };
})();

/* ============================================================
   9. PROGRESS BAR ANIMATION
   ============================================================ */

(function initProgressBars() {
  window._initProgressBars = function() {
    const bars = document.querySelectorAll('.progress-bar[data-value]');
    if (!bars.length) return;

    // Reset to 0 initially
    bars.forEach(function(bar) {
      bar.style.width = '0%';
      bar.style.transition = 'width 1s ease-out';
    });

    const observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          const bar   = entry.target;
          const value = clamp(parseFloat(bar.getAttribute('data-value')) || 0, 0, 100);
          // Small delay so the transition is visible
          setTimeout(function() {
            bar.style.width = value + '%';
          }, 150);
          observer.unobserve(bar);
        }
      });
    }, { threshold: 0.2 });

    bars.forEach(function(bar) { observer.observe(bar); });
  };
})();

/* ============================================================
   10. COPY COMMAND BUTTON
   ============================================================ */

(function initCopyCommand() {
  window._initCopyCommand = function() {
    const blocks = document.querySelectorAll('.command-block');

    blocks.forEach(function(block) {
      // Don't add twice
      if (block.querySelector('.copy-btn')) return;

      const btn = document.createElement('button');
      btn.className = 'copy-btn';
      btn.setAttribute('aria-label', 'Copier la commande');
      btn.textContent = '📋';

      // Position the block relatively if needed
      const pos = window.getComputedStyle(block).position;
      if (pos === 'static') block.style.position = 'relative';

      block.appendChild(btn);

      btn.addEventListener('click', function(e) {
        e.stopPropagation();
        // Get text content of the block minus the button itself
        const text = Array.from(block.childNodes)
          .filter(function(n) { return n !== btn; })
          .map(function(n) { return n.textContent; })
          .join('')
          .trim();

        if (!navigator.clipboard) {
          // Fallback for older browsers
          const ta = document.createElement('textarea');
          ta.value = text;
          ta.style.cssText = 'position:fixed;opacity:0;';
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          showCopied(btn);
          return;
        }

        navigator.clipboard.writeText(text).then(function() {
          showCopied(btn);
        }).catch(function() {
          btn.textContent = '❌';
          setTimeout(function() { btn.textContent = '📋'; }, 1500);
        });
      });
    });

    function showCopied(btn) {
      btn.textContent = '✅';
      btn.classList.add('is-copied');
      // Show tooltip
      const tooltip = document.createElement('span');
      tooltip.className = 'copy-tooltip';
      tooltip.textContent = 'Copié !';
      btn.appendChild(tooltip);

      setTimeout(function() {
        btn.textContent = '📋';
        btn.classList.remove('is-copied');
      }, 2000);
    }
  };
})();

/* ============================================================
   11. IMAGE LIGHTBOX
   ============================================================ */

(function initLightbox() {
  let lightboxEl = null;
  let imgEl      = null;
  let isOpen     = false;

  function buildLightbox() {
    lightboxEl = document.createElement('div');
    lightboxEl.className = 'lightbox';
    lightboxEl.setAttribute('role', 'dialog');
    lightboxEl.setAttribute('aria-modal', 'true');
    lightboxEl.setAttribute('aria-label', 'Image agrandie');

    imgEl = document.createElement('img');
    imgEl.className = 'lightbox__img';
    imgEl.alt = '';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'lightbox__close';
    closeBtn.setAttribute('aria-label', 'Fermer');
    closeBtn.textContent = '✕';

    lightboxEl.appendChild(closeBtn);
    lightboxEl.appendChild(imgEl);
    document.body.appendChild(lightboxEl);

    // Close on backdrop click
    lightboxEl.addEventListener('click', function(e) {
      if (e.target === lightboxEl) closeLightbox();
    });
    closeBtn.addEventListener('click', closeLightbox);
  }

  function openLightbox(src, alt) {
    if (!lightboxEl) buildLightbox();
    imgEl.src = src;
    imgEl.alt = alt || '';
    lightboxEl.classList.add('is-visible');
    isOpen = true;
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    if (!lightboxEl) return;
    lightboxEl.classList.remove('is-visible');
    isOpen = false;
    document.body.style.overflow = '';
    // Delay src clear to avoid flash during close animation
    setTimeout(function() { imgEl.src = ''; }, 300);
  }

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && isOpen) closeLightbox();
  });

  window._initLightbox = function() {
    const images = document.querySelectorAll('.item-icon, .spell-icon, .perk-icon, [data-lightbox]');

    images.forEach(function(el) {
      const img = el.tagName === 'IMG' ? el : el.querySelector('img');
      if (!img) return;

      img.style.cursor = 'zoom-in';
      img.addEventListener('click', function() {
        openLightbox(img.src, img.alt);
      });
    });
  };
})();

/* ============================================================
   12. SMOOTH PAGE NAVIGATION
   ============================================================ */

(function initSmoothNav() {
  window._initSmoothNav = function() {
    // Handle all internal anchor links
    document.querySelectorAll('a[href^="#"]').forEach(function(link) {
      link.addEventListener('click', function(e) {
        const hash = link.getAttribute('href');
        if (!hash || hash === '#') return;

        const target = document.querySelector(hash);
        if (!target) return;

        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.pushState(null, '', hash);
      });
    });

    // On initial load, if there's a hash, scroll smoothly after a short delay
    if (window.location.hash) {
      const target = document.querySelector(window.location.hash);
      if (target) {
        setTimeout(function() {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 200);
      }
    }
  };
})();

/* ============================================================
   BOOTSTRAP — DOMContentLoaded
   ============================================================ */

document.addEventListener('DOMContentLoaded', function() {
  // Theme listeners (theme itself applied synchronously above, before DOM)
  if (typeof window._initThemeListeners === 'function') {
    window._initThemeListeners();
  }

  // Translation
  if (typeof window._initTranslationListeners === 'function') {
    window._initTranslationListeners();
  }

  // Sidebar
  if (typeof window._initSidebar === 'function') {
    window._initSidebar();
  }

  // Search
  if (typeof window._initSearch === 'function') {
    window._initSearch();
  }

  // TOC
  if (typeof window._initTOC === 'function') {
    window._initTOC();
  }

  // Scroll animations
  if (typeof window._initScrollAnimations === 'function') {
    window._initScrollAnimations();
  }

  // Accordion
  if (typeof window._initAccordion === 'function') {
    window._initAccordion();
  }

  // Particles
  if (typeof window._initParticles === 'function') {
    window._initParticles();
  }

  // Progress bars
  if (typeof window._initProgressBars === 'function') {
    window._initProgressBars();
  }

  // Copy buttons
  if (typeof window._initCopyCommand === 'function') {
    window._initCopyCommand();
  }

  // Lightbox
  if (typeof window._initLightbox === 'function') {
    window._initLightbox();
  }

  // Smooth navigation
  if (typeof window._initSmoothNav === 'function') {
    window._initSmoothNav();
  }
});
