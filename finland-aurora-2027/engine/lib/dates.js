/* engine/lib/dates.js — 순수 날짜 로직. 브라우저 전역 TE.dates + Node require 양쪽. */
(function (root) {
  'use strict';
  const WK = ['일', '월', '화', '수', '목', '금', '토'];
  const p2 = (n) => String(n).padStart(2, '0');

  // tripStartISO('YYYY-MM-DD')에 i일 더한 'YYYY-MM-DD'. UTC 산술로 DST/로컬 영향 제거.
  function isoForDayIndex(tripStartISO, i) {
    const [y, m, d] = tripStartISO.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + i));
    return `${dt.getUTCFullYear()}-${p2(dt.getUTCMonth() + 1)}-${p2(dt.getUTCDate())}`;
  }

  // 'YYYY-MM-DD' -> 'M/D (요일)'
  function weekdayLabelKo(iso) {
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d));
    return `${m}/${d} (${WK[dt.getUTCDay()]})`;
  }

  // 목적지 자정 기준 남은 일수. tzOffset 없으면 뷰어 로컬(±1일 오차).
  function dday(tripStartISO, tzOffset, nowMs) {
    const anchor = tzOffset
      ? new Date(`${tripStartISO}T00:00:00${tzOffset}`).getTime()
      : new Date(`${tripStartISO}T00:00:00`).getTime();
    return Math.ceil((anchor - nowMs) / 86400000);
  }

  const api = { isoForDayIndex, weekdayLabelKo, dday };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (root.TE = root.TE || {}).dates = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
