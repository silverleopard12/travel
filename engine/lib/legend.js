/* engine/lib/legend.js — 범례 행 생성. label 있는 것만·선언 순서·같은 색 수렴. */
(function (root) {
  'use strict';
  function legendRows(CATEGORIES) {
    const rows = [];
    const seen = new Set();
    for (const key of Object.keys(CATEGORIES)) {
      const cat = CATEGORIES[key];
      if (!cat || !cat.label) continue;
      if (seen.has(cat.c)) continue;
      seen.add(cat.c);
      rows.push({ c: cat.c, label: cat.label });
    }
    return rows;
  }
  const api = { legendRows };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (root.TE = root.TE || {}).legend = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
