// ==UserScript==
// @name         X Photo Viewer - Show Tagged Accounts
// @namespace    rhone.x.tagged-accounts
// @version      1.0
// @description  Shows the accounts tagged in a photo when viewing it full-screen on x.com (they normally only show in the timeline).
// @match        https://x.com/*
// @match        https://twitter.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  // Map of "tweetId/photoNumber" -> array of tagged users ({name, screen_name})
  const tagCache = new Map();

  // ---------- Capture layer ----------
  // X's own background responses already contain the tagged accounts for every
  // photo (media.features.all.tags); the site just doesn't display them in the
  // full-screen viewer. We read those responses as they arrive - no extra
  // requests are ever sent.

  function harvest(text) {
    if (typeof text !== 'string' || text.indexOf('"tags":[{') === -1) return;
    let json;
    try { json = JSON.parse(text); } catch (e) { return; }
    walk(json);
  }

  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { for (const item of node) walk(item); return; }
    const tags = node.features && node.features.all && node.features.all.tags;
    if (Array.isArray(tags) && tags.length && typeof node.expanded_url === 'string') {
      const m = node.expanded_url.match(/\/status\/(\d+)\/photo\/(\d+)$/);
      if (m) {
        if (tagCache.size > 2000) tagCache.clear();
        tagCache.set(m[1] + '/' + m[2], tags);
      }
    }
    for (const key in node) walk(node[key]);
  }

  const origOpen = XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open = function (method, url) {
    this.__xpt_url = String(url);
    return origOpen.apply(this, arguments);
  };

  const origSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function () {
    if (this.__xpt_url && this.__xpt_url.indexOf('/graphql/') !== -1) {
      const xhr = this;
      xhr.addEventListener('load', function () {
        try { harvest(xhr.responseText); } catch (e) { /* never break the page */ }
      });
    }
    return origSend.apply(this, arguments);
  };

  const origFetch = window.fetch;
  window.fetch = function (input) {
    const url = typeof input === 'string' ? input : (input && input.url) || '';
    const promise = origFetch.apply(this, arguments);
    if (url.indexOf('/graphql/') !== -1) {
      promise.then(function (resp) {
        resp.clone().text().then(harvest).catch(function () {});
      }).catch(function () {});
    }
    return promise;
  };

  // ---------- Display layer ----------

  let pill = null;

  function getPill() {
    if (pill && document.body && document.body.contains(pill)) return pill;
    pill = document.createElement('div');
    pill.id = 'xpt-tagged-pill';
    pill.style.cssText = [
      'position:fixed',
      'z-index:2147483647',
      'background:rgba(0,0,0,0.77)',
      'color:#fff',
      'padding:6px 13px',
      'border-radius:9999px',
      'font:13px/1.4 "Segoe UI",system-ui,sans-serif',
      'max-width:60vw',
      'white-space:nowrap',
      'overflow:hidden',
      'text-overflow:ellipsis',
      'display:none',
      'align-items:center',
      'gap:6px'
    ].join(';');
    // Keep clicks on the pill from also triggering the photo viewer underneath
    pill.addEventListener('click', function (e) { e.stopPropagation(); });
    document.body.appendChild(pill);
    return pill;
  }

  function personIcon() {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', '14');
    svg.setAttribute('height', '14');
    svg.setAttribute('fill', '#fff');
    svg.style.flex = 'none';
    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', 'M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2c-3.33 0-10 1.67-10 5v3h20v-3c0-3.33-6.67-5-10-5z');
    svg.appendChild(path);
    return svg;
  }

  // The full-screen viewer image: the large centered image inside X's overlay
  // layer. With multi-photo posts several images are preloaded off to the
  // sides, so pick the one closest to the horizontal center of the screen.
  function findViewerImage() {
    const scope = document.getElementById('layers') || document;
    const imgs = scope.querySelectorAll('img[src*="pbs.twimg.com/media"]');
    let best = null;
    let bestDist = Infinity;
    const cx = window.innerWidth / 2;
    for (const img of imgs) {
      const r = img.getBoundingClientRect();
      if (r.width < 100 || r.height < 100) continue;
      const dist = Math.abs((r.left + r.right) / 2 - cx);
      if (dist < bestDist) { bestDist = dist; best = img; }
    }
    return best;
  }

  function refresh() {
    if (!document.body) return;
    const m = location.pathname.match(/\/status\/(\d+)\/photo\/(\d+)/);
    const el = getPill();
    if (!m) { el.style.display = 'none'; return; }

    const key = m[1] + '/' + m[2];
    const tags = tagCache.get(key);
    const img = tags ? findViewerImage() : null;
    if (!tags || !img) { el.style.display = 'none'; return; }

    if (el.dataset.key !== key) {
      el.dataset.key = key;
      el.textContent = '';
      el.appendChild(personIcon());
      tags.forEach(function (t, i) {
        if (i) el.appendChild(document.createTextNode('、'));
        const a = document.createElement('a');
        a.href = 'https://x.com/' + t.screen_name;
        a.textContent = t.name;
        a.title = '@' + t.screen_name;
        a.style.cssText = 'color:#fff;text-decoration:none;font-weight:600';
        el.appendChild(a);
      });
    }

    const r = img.getBoundingClientRect();
    el.style.left = Math.max(4, r.left + 12) + 'px';
    el.style.top = (r.bottom - 12) + 'px';
    el.style.transform = 'translateY(-100%)';
    el.style.display = 'flex';
  }

  setInterval(refresh, 400);
})();
