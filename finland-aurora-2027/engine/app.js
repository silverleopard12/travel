/* engine/app.js — trip-template 렌더 엔진. data.js(META, CATEGORIES, DAYS)를 읽어 렌더. */
(function () {
  'use strict';

  // ---- 데이터 가드(백지화 방지) ----
  function fail(msg) {
    document.body.insertAdjacentHTML('afterbegin',
      '<div style="background:#fee;color:#900;padding:14px 16px;font:14px/1.5 system-ui">'
      + '⚠️ data.js 오류: ' + msg + ' — 브라우저 콘솔(F12)을 확인하세요.</div>');
    throw new Error(msg);
  }
  if (typeof META === 'undefined' || !META) fail('META가 없습니다');
  if (typeof CATEGORIES === 'undefined' || !CATEGORIES) fail('CATEGORIES가 없습니다');
  if (typeof DAYS === 'undefined' || !Array.isArray(DAYS) || !DAYS.length) fail('DAYS가 비었습니다');

  var D = TE.dates, LG = TE.legend, C = TE.categories;

  // ---- 문서 제목 ----
  document.title = META.docTitle || META.title || '여행 일정';

  // ---- 헤더 ----
  (function () {
    var chips = (META.chips || []).map(function (c) {
      return '<div><span class="k">' + c.k + '</span> ' + c.v + '</div>';
    }).join('');
    document.querySelector('header').innerHTML =
      '<h1>' + (META.title || '') + '</h1>'
      + (META.subtitle ? '<div class="sub">' + META.subtitle + '</div>' : '')
      + '<div class="chips">' + chips + '</div>';
  })();

  // ---- 범례 ----
  (function () {
    document.querySelector('.legend').innerHTML = LG.legendRows(CATEGORIES).map(function (r) {
      return '<span><i style="background:' + r.c + '"></i>' + r.label + '</span>';
    }).join('');
  })();

  // ---- footer ----
  document.querySelector('footer').innerHTML =
    META.footer || '방문 전 영업시간 재확인 권장 · 길찾기는 현재 위치 기준 🧭';

  // ---- 참고자료 영역이 비면 숨김 ----
  (function () {
    var refs = document.querySelector('.refs');
    if (refs && !refs.querySelector('*')) refs.style.display = 'none';
  })();

  // ---- 각 날 표시 라벨: day.date 우선, 없으면 tripStart+index 유도 ----
  function dayDateLabel(day, i) {
    if (day.date) return day.date;
    if (META.tripStart) return D.weekdayLabelKo(D.isoForDayIndex(META.tripStart, i));
    return '';
  }

  // ---- 지도 초기화 ----
  var map = null, layer = null, markers = [];
  try {
    if (!window.L) throw new Error('leaflet 미로딩');
    map = window.L.map('map', {
      zoomControl: true,
      gestureHandling: true,
      gestureHandlingOptions: { text: {
        touch: '두 손가락으로 지도를 이동하세요',
        scroll: 'Ctrl + 스크롤로 확대',
        scrollMac: '⌘ + 스크롤로 확대'
      }, duration: 1500 }
    });
    var center = (META.map && META.map.center) || [37.5665, 126.9780];
    var zoom = (META.map && META.map.zoom) || 12;
    map.setView(center, zoom);
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(map);
    layer = window.L.layerGroup().addTo(map);
  } catch (e) {
    var md = document.getElementById('map');
    if (md) {
      md.style.cssText = 'height:auto;min-height:0;padding:14px 16px;color:#6b7280;font-size:12.5px;line-height:1.5';
      md.textContent = '⚠️ 오프라인 상태예요 — 지도는 인터넷 연결 시 표시됩니다. 아래 일정과 길찾기 버튼은 그대로 쓸 수 있어요.';
    }
  }

  function pin(num, color) {
    return window.L.divIcon({ className: '',
      html: '<div class="pin-in" style="background:' + color + '"><span>' + num + '</span></div>',
      iconSize: [26, 26], iconAnchor: [13, 24], popupAnchor: [0, -22] });
  }
  function gmap(q) { return 'https://www.google.com/maps/dir/?api=1&destination=' + encodeURIComponent(q); }

  function render(di) {
    var day = DAYS[di];
    var btns = document.querySelectorAll('#days button');
    btns.forEach(function (b, i) { b.classList.toggle('on', i === di); });
    document.getElementById('dayhead').innerHTML =
      '<h2>' + day.tab + ' · ' + dayDateLabel(day, di) + '</h2>'
      + '<p>' + (day.title || '') + (day.note ? ' — ' + day.note : '') + '</p>';

    if (layer) layer.clearLayers();
    markers = [];
    var pts = [], list = document.getElementById('list'); list.innerHTML = '';
    var n = 0;

    (day.items || []).forEach(function (it, idx) {
      var cat = C.catFor(CATEGORIES, it.cat);
      var mapped = (it.lat != null && it.lng != null);
      var badge;
      if (mapped) {
        n++; it._n = n;
        badge = '<div class="num" style="background:' + cat.c + '">' + n + '</div>';
        pts.push([it.lat, it.lng]);
        if (map) {
          var mk = window.L.marker([it.lat, it.lng], { icon: pin(n, cat.c) })
            .bindPopup('<b>' + cat.e + ' ' + it.n + '</b><br>' + it.t + ' · ' + it.m
              + '<br><a href="' + gmap(it.q || it.n) + '" target="_blank" rel="noopener">🧭 구글맵 길찾기</a>');
          mk.addTo(layer); markers[idx] = mk;
        }
      } else {
        badge = '<div class="emo">' + cat.e + '</div>';
      }
      var trLine = it.tr ? '<div class="tr">' + it.tr + '</div>' : '';
      var btnsHtml = mapped
        ? '<div class="btns">' + (map ? '<button data-focus="' + idx + '">📍 지도</button>' : '')
          + '<a class="nav" href="' + gmap(it.q || it.n) + '" target="_blank" rel="noopener">🧭 길찾기</a></div>'
        : '';
      list.insertAdjacentHTML('beforeend',
        '<div class="row ' + (mapped ? '' : 'flat') + '" style="border-left-color:' + cat.c
        + ';animation:fadeUp .22s ease ' + (idx * 0.04) + 's both">'
        + badge
        + '<div class="body">'
        + '<div class="time">' + (it.t || '') + '</div>'
        + '<div class="name">' + (it.n || '') + '</div>'
        + trLine
        + '<div class="memo">' + (it.m || '') + '</div>'
        + btnsHtml
        + '</div></div>');
    });

    if (pts.length && map) {
      window.L.polyline(pts, { color: '#2c3a4f', weight: 3, opacity: 0.55, dashArray: '1,7', lineCap: 'round' }).addTo(layer);
      // 스펙 §4.3: META.map.center/zoom 이 명시돼 있으면 그 view를 존중, 없을 때만 핀에 맞춤.
      var hasExplicitView = !!(META.map && META.map.center && META.map.zoom != null);
      if (!hasExplicitView) map.fitBounds(pts, { padding: [36, 36], maxZoom: 15 });
    }
  }

  // 지도 포커스 버튼(이벤트 위임 — IIFE라 전역 onclick 못 씀)
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-focus]'); if (!b) return;
    var idx = +b.getAttribute('data-focus');
    var mk = markers[idx]; if (!mk || !map) return;
    map.flyTo(mk.getLatLng(), 16, { duration: 0.6 });
    setTimeout(function () { mk.openPopup(); }, 300);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ---- 날짜 탭 ----
  var dn = document.getElementById('days');
  DAYS.forEach(function (d, i) {
    var b = document.createElement('button');
    b.innerHTML = d.tab + '<small>' + dayDateLabel(d, i) + '</small>';
    b.onclick = function () { render(i); };
    dn.appendChild(b);
  });
  render(0);
  if (map) setTimeout(function () { map.invalidateSize(); }, 200);

  // ---- D-day ----
  (function () {
    if (!META.tripStart) return;
    var diff = D.dday(META.tripStart, META.tz || '', Date.now());
    if (diff > 0) {
      var chips = document.querySelector('.chips');
      if (chips) {
        var d = document.createElement('div');
        d.innerHTML = '<span class="k">🗓️ D-day</span> <b style="color:#fff">D-' + diff + '</b> · ' + diff + '일 뒤 출발!';
        chips.insertBefore(d, chips.firstChild);
      }
    }
  })();

  // ---- 날씨 위젯(Open-Meteo) ----
  var WMO = { 0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 45: '🌫️', 48: '🌫️', 51: '🌦️', 53: '🌦️', 55: '🌦️',
    61: '🌧️', 63: '🌧️', 65: '🌧️', 71: '🌨️', 73: '🌨️', 75: '🌨️', 77: '🌨️', 80: '🌦️', 81: '🌦️',
    82: '⛈️', 85: '🌨️', 86: '🌨️', 95: '⛈️', 96: '⛈️', 99: '⛈️' };
  (function () {
    var el = document.getElementById('weather');
    if (!el) return;
    var w = META.weather;
    if (!w || !META.tripStart) { el.style.display = 'none'; return; }
    var dates = DAYS.map(function (_, i) { return D.isoForDayIndex(META.tripStart, i); });
    var labels = dates.map(function (iso) { return D.weekdayLabelKo(iso).replace(/[()]/g, '').trim(); });
    fetch('https://api.open-meteo.com/v1/forecast?latitude=' + w.lat + '&longitude=' + w.lng
      + '&daily=weathercode,temperature_2m_max,temperature_2m_min&timezone='
      + encodeURIComponent(w.tz || 'auto') + '&forecast_days=16')
      .then(function (r) { if (!r.ok) throw 0; return r.json(); })
      .then(function (d) {
        var found = dates.map(function (td, i) {
          var ix = (d.daily.time || []).indexOf(td);
          if (ix < 0) return null;
          return { lb: labels[i], co: d.daily.weathercode[ix],
            hi: Math.round(d.daily.temperature_2m_max[ix]), lo: Math.round(d.daily.temperature_2m_min[ix]) };
        }).filter(Boolean);
        if (!found.length) throw 0;
        el.innerHTML = '<span class="wlabel">' + (w.cityLabel || '날씨') + '</span>'
          + found.map(function (f) {
            return '<div class="wchip"><div class="wd">' + f.lb + '</div><div class="wi">'
              + (WMO[f.co] || '🌡️') + '</div><div class="wt">' + f.hi + '°<small>/' + f.lo + '°</small></div></div>';
          }).join('');
      })
      .catch(function () {
        var diff = D.dday(META.tripStart, META.tz || '', Date.now());
        var q = encodeURIComponent((w.cityLabel || '').replace(/[^가-힣A-Za-z ]/g, '').trim() + ' 날씨 오늘');
        el.innerHTML = diff > 0
          ? '<span class="wlabel">🗓️ 여행까지 <b style="color:var(--navy)">' + diff + '일</b> · 날씨는 2주 전부터 예보돼요</span>'
          : '<span class="wlabel">🌤️ 날씨 확인: <a href="https://www.google.com/search?q=' + q
            + '" target="_blank" rel="noopener" style="color:var(--accent)">구글 날씨</a></span>';
      });
  })();
})();
