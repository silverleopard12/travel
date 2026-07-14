/* engine/lib/categories.js — 카테고리 조회 + 중립 폴백. */
(function (root) {
  'use strict';
  function catFor(CATEGORIES, key) {
    return (key && CATEGORIES && CATEGORIES[key]) || { c: '#64748b', e: '•' };
  }
  const api = { catFor };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (root.TE = root.TE || {}).categories = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
