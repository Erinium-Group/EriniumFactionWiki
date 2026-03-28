/**
 * EriniumFaction Wiki — includes.js
 * Injects the shared sidebar and header into every page.
 * Must be loaded BEFORE main.js.
 */
(function () {
  'use strict';

  /* ── Shared sidebar HTML ─────────────────────────────────── */
  var SIDEBAR_HTML =
    '<a href="index.html" class="sidebar-header">' +
      '<span class="sidebar-logo-text">EriniumFaction</span>' +
    '</a>' +
    '<div class="sidebar-section">' +
      '<div class="sidebar-section-label">D\u00e9couverte</div>' +
      '<a href="index.html" class="nav-link"><span class="nav-icon">\ud83c\udfe0</span><span class="nav-label">Accueil</span></a>' +
      '<a href="getting-started.html" class="nav-link"><span class="nav-icon">\ud83c\udf1f</span><span class="nav-label">Premiers Pas</span></a>' +
    '</div>' +
    '<div class="sidebar-section">' +
      '<div class="sidebar-section-label">Combat</div>' +
      '<a href="materials.html" class="nav-link"><span class="nav-icon">\ud83e\udea8</span><span class="nav-label">Mat\u00e9riaux</span></a>' +
      '<a href="weapons.html" class="nav-link"><span class="nav-icon">\u2694\ufe0f</span><span class="nav-label">Armes</span></a>' +
      '<a href="armor.html" class="nav-link"><span class="nav-icon">\ud83d\udee1\ufe0f</span><span class="nav-label">Armures</span></a>' +
      '<a href="gems.html" class="nav-link"><span class="nav-icon">\ud83d\udc8e</span><span class="nav-label">Gemmes</span></a>' +
      '<a href="accessories.html" class="nav-link"><span class="nav-icon">\ud83d\udc8d</span><span class="nav-label">Accessoires</span></a>' +
      '<a href="builds.html" class="nav-link"><span class="nav-icon">\ud83c\udfc6</span><span class="nav-label">Builds</span></a>' +
    '</div>' +
    '<div class="sidebar-section">' +
      '<div class="sidebar-section-label">Progression</div>' +
      '<a href="rpg.html" class="nav-link"><span class="nav-icon">\ud83d\udcca</span><span class="nav-label">RPG</span></a>' +
      '<a href="perks.html" class="nav-link"><span class="nav-icon">\u2728</span><span class="nav-label">Perks</span></a>' +
      '<a href="magic.html" class="nav-link"><span class="nav-icon">\ud83d\udd2e</span><span class="nav-label">Magie</span></a>' +
      '<a href="spells.html" class="nav-link"><span class="nav-icon">\ud83d\udcab</span><span class="nav-label">Sorts</span></a>' +
    '</div>' +
    '<div class="sidebar-section">' +
      '<div class="sidebar-section-label">Monde</div>' +
      '<a href="factions.html" class="nav-link"><span class="nav-icon">\ud83c\udff0</span><span class="nav-label">Factions</span></a>' +
      '<a href="machines.html" class="nav-link"><span class="nav-icon">\ud83d\udd27</span><span class="nav-label">Machines</span></a>' +
      '<a href="economy.html" class="nav-link"><span class="nav-icon">\ud83d\udcb0</span><span class="nav-label">\u00c9conomie</span></a>' +
      '<a href="mining.html" class="nav-link"><span class="nav-icon">\u26cf\ufe0f</span><span class="nav-label">Minage</span></a>' +
      '<a href="biomes.html" class="nav-link"><span class="nav-icon">\ud83c\udf3f</span><span class="nav-label">Biomes</span></a>' +
    '</div>' +
    '<div class="sidebar-section">' +
      '<div class="sidebar-section-label">Utilitaire</div>' +
      '<a href="chat.html" class="nav-link"><span class="nav-icon">\ud83d\udcac</span><span class="nav-label">Chat</span></a>' +
      '<a href="teleportation.html" class="nav-link"><span class="nav-icon">\ud83c\udf00</span><span class="nav-label">T\u00e9l\u00e9portation</span></a>' +
      '<a href="commands.html" class="nav-link"><span class="nav-icon">\ud83d\udccb</span><span class="nav-label">Commandes</span></a>' +
    '</div>' +
    '<div class="sidebar-footer">\u00a9 2026 EriniumGroup</div>';

  /* ── Shared header HTML ──────────────────────────────────── */
  var HEADER_HTML =
    '<button class="header-hamburger" data-hamburger aria-label="Menu" aria-expanded="false">\u2630</button>' +
    '<div class="header-search-wrap" data-search-wrapper>' +
      '<input class="header-search" type="search" placeholder="Rechercher\u2026 (Ctrl+K)" autocomplete="off" data-search-input aria-label="Rechercher dans le wiki">' +
      '<div class="search-results" data-search-results></div>' +
    '</div>' +
    '<button class="header-theme-btn" data-theme-toggle aria-label="Changer le th\u00e8me"><span class="theme-icon">\ud83c\udf19</span></button>' +
    '<button class="header-theme-btn" data-translate-toggle aria-label="Traduire" style="margin-left:4px;">\ud83c\udf10</button>';

  /* ── Inject ─────────────────────────────────────────────── */
  function inject() {
    var sidebarEl = document.getElementById('wiki-sidebar');
    if (sidebarEl) {
      sidebarEl.innerHTML = SIDEBAR_HTML;

      /* Set active link based on current filename */
      var currentPage = window.location.pathname.split('/').pop() || 'index.html';
      if (!currentPage || currentPage === '') currentPage = 'index.html';
      var links = sidebarEl.querySelectorAll('a.nav-link[href]');
      for (var i = 0; i < links.length; i++) {
        var href = links[i].getAttribute('href').split('/').pop().split('#')[0];
        if (href === currentPage) {
          links[i].classList.add('is-active');
        }
      }
    }

    var headerEl = document.getElementById('wiki-header');
    if (headerEl) {
      headerEl.innerHTML = HEADER_HTML;
    }
  }

  /* Run immediately if DOM is already loaded, otherwise wait */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inject);
  } else {
    inject();
  }

})();
