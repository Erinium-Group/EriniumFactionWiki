'use strict';

const express = require('express');
const path    = require('path');
const fs      = require('fs');
const app     = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Disable caching in dev
app.use(function(req, res, next) {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.set('Pragma', 'no-cache');
  next();
});

// Static assets
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js',  express.static(path.join(__dirname, 'js')));
app.use('/img', express.static(path.join(__dirname, 'img')));

// Page definitions
const pages = [
  { route: '/',               template: 'index',          title: 'Accueil — EriniumFaction Wiki' },
  { route: '/getting-started',template: 'getting-started',title: 'Premiers Pas — EriniumFaction Wiki' },
  { route: '/materials',      template: 'materials',      title: 'Matériaux — EriniumFaction Wiki' },
  { route: '/weapons',        template: 'weapons',        title: 'Armes — EriniumFaction Wiki' },
  { route: '/armor',          template: 'armor',          title: 'Armures — EriniumFaction Wiki' },
  { route: '/gems',           template: 'gems',           title: 'Gemmes — EriniumFaction Wiki' },
  { route: '/accessories',    template: 'accessories',    title: 'Accessoires — EriniumFaction Wiki' },
  { route: '/builds',         template: 'builds',         title: 'Builds — EriniumFaction Wiki' },
  { route: '/artifacts',      template: 'artifacts',      title: 'Artefacts — EriniumFaction Wiki' },
  { route: '/rpg',            template: 'rpg',            title: 'RPG — EriniumFaction Wiki' },
  { route: '/perks',          template: 'perks',          title: 'Perks — EriniumFaction Wiki' },
  { route: '/magic',          template: 'magic',          title: 'Magie — EriniumFaction Wiki' },
  { route: '/spells',         template: 'spells',         title: 'Sorts — EriniumFaction Wiki' },
  { route: '/enchantments',   template: 'enchantments',   title: 'Enchantements — EriniumFaction Wiki' },
  { route: '/factions',       template: 'factions',       title: 'Factions — EriniumFaction Wiki' },
  { route: '/economy',        template: 'economy',        title: 'Économie — EriniumFaction Wiki' },
  { route: '/mining',         template: 'mining',         title: 'Minage — EriniumFaction Wiki' },
  { route: '/biomes',         template: 'biomes',         title: 'Biomes — EriniumFaction Wiki' },
  { route: '/chat',           template: 'chat',           title: 'Chat — EriniumFaction Wiki' },
  { route: '/teleportation',  template: 'teleportation',  title: 'Téléportation — EriniumFaction Wiki' },
  { route: '/commands',       template: 'commands',       title: 'Commandes — EriniumFaction Wiki' },
  { route: '/combat',         template: 'combat',         title: 'Combat — EriniumFaction Wiki' },
  { route: '/items',          template: 'items',          title: 'Items — EriniumFaction Wiki' },
  { route: '/anvils',         template: 'anvils',         title: 'Enclumes Moddees — EriniumFaction Wiki' },
  { route: '/electricity',    template: 'electricity',    title: 'Electricite RF — EriniumFaction Wiki' },
  { route: '/machines',        template: 'machines',        title: 'Machines — EriniumFaction Wiki' },
];

pages.forEach(function(p) {
  app.get(p.route, function(req, res) {
    res.render(p.template, { currentPage: p.template, pageTitle: p.title });
  });
});

/* ── Search Index ───────────────────────────────────────────── */

var searchIndexCache = null;

function buildSearchIndex() {
  var index = [];

  // Strip EJS tags, script/style blocks, then HTML tags
  function toPlainText(raw) {
    return raw
      .replace(/<%[\s\S]*?%>/g, ' ')
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  // Extract sections: split raw EJS by h1/h2/h3 tags
  function extractSections(raw) {
    // Remove EJS blocks first for clean parsing
    var cleaned = raw.replace(/<%[\s\S]*?%>/g, '');
    // Split on heading opening tags
    var parts = cleaned.split(/(?=<h[1-3][\s>])/i);
    var sections = [];
    parts.forEach(function(part) {
      var headingMatch = part.match(/^<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i);
      var headingText = headingMatch
        ? headingMatch[1].replace(/<[^>]+>/g, '').trim()
        : null;
      // Extract id from heading tag if present
      var idMatch = headingMatch && part.match(/^<h[1-3][^>]*id="([^"]+)"/i);
      var sectionId = idMatch ? idMatch[1] : null;
      // Body text after the heading (or before first heading)
      var bodyRaw = headingMatch ? part.slice(headingMatch[0].length) : part;
      var bodyText = toPlainText(bodyRaw).slice(0, 400);
      sections.push({ heading: headingText, id: sectionId, text: bodyText });
    });
    return sections;
  }

  pages.forEach(function(p) {
    if (p.template === 'index') return; // skip homepage
    var filePath = path.join(__dirname, 'views', p.template + '.ejs');
    if (!fs.existsSync(filePath)) return;
    try {
      var raw = fs.readFileSync(filePath, 'utf8');
      var sections = extractSections(raw);
      // Clean page title (strip " — EriniumFaction Wiki" suffix)
      var pageTitle = p.title.replace(/\s*—\s*EriniumFaction Wiki$/, '').trim();
      sections.forEach(function(sec) {
        if (!sec.heading && sec.text.length < 30) return;
        index.push({
          page:      p.template,
          pageTitle: pageTitle,
          route:     p.route,
          section:   sec.heading || pageTitle,
          sectionId: sec.id,
          text:      sec.text
        });
      });
    } catch (e) {
      console.warn('Search index: could not parse', p.template, e.message);
    }
  });

  return index;
}

app.get('/api/search-index', function(req, res) {
  if (!searchIndexCache) {
    searchIndexCache = buildSearchIndex();
  }
  res.json(searchIndexCache);
});

// Redirect .html URLs for backwards compatibility
app.get('/:page.html', function(req, res, next) {
  var found = pages.find(function(p) { return p.template === req.params.page; });
  if (found) return res.redirect(301, found.route);
  next();
});

// 404
app.use(function(req, res) {
  res.status(404).send('<h1>404 — Page introuvable</h1><a href="/">Retour à l\'accueil</a>');
});

var PORT = process.env.PORT || 8080;
app.listen(PORT, function() {
  console.log('Wiki EriniumFaction: http://localhost:' + PORT);
});
