/* engine/lib/redact.js — 배포 가림 로직(Node 전용). build-public.js가 사용. */
(function (root) {
  'use strict';

  // <span ... class="... secret ...">평문</span> 의 내용을 코드포인트 수만큼 •로 치환.
  // 스팬 안에 '<'(태그 중첩)가 있으면 저작 오류 → throw.
  function maskSecrets(text) {
    let count = 0;
    const out = text.replace(/<span\b([^>]*)>([\s\S]*?)<\/span>/gi, function (m, attrs, inner) {
      const clsMatch = attrs.match(/\bclass\s*=\s*("([^"]*)"|'([^']*)')/i);
      if (!clsMatch) return m;
      const clsVal = clsMatch[2] != null ? clsMatch[2] : clsMatch[3];
      if (!clsVal.split(/\s+/).includes('secret')) return m;
      if (inner.indexOf('<') !== -1) {
        throw new Error('nested tag inside .secret (평문만 허용): ' + inner);
      }
      count++;
      return '<span' + attrs + '>' + '•'.repeat([...inner].length) + '</span>';
    });
    return { text: out, count };
  }

  // robots noindex meta 주입(멱등). viewport 뒤 우선, 없으면 <head> 뒤.
  function injectNoindex(html) {
    if (/name=["']robots["']/i.test(html)) return html;
    const meta = '\n<meta name="robots" content="noindex,nofollow">';
    if (/<meta\s+name=["']viewport["'][^>]*>/i.test(html)) {
      return html.replace(/(<meta\s+name=["']viewport["'][^>]*>)/i, '$1' + meta);
    }
    return html.replace(/(<head[^>]*>)/i, '$1' + meta);
  }

  // 공개본 검증: class에 'secret' 토큰이 있는 span의 내용이 전부 •가 아니면 throw.
  // maskSecrets와 동일한 토큰 판정을 써서 grep의 오탐(secret-note)/미탐(한글)을 없앤다.
  function assertAllMasked(text) {
    text.replace(/<span\b([^>]*)>([\s\S]*?)<\/span>/gi, function (m, attrs, inner) {
      const clsMatch = attrs.match(/\bclass\s*=\s*("([^"]*)"|'([^']*)')/i);
      if (clsMatch) {
        const clsVal = clsMatch[2] != null ? clsMatch[2] : clsMatch[3];
        if (clsVal.split(/\s+/).includes('secret')) {
          for (const ch of inner) {
            if (ch !== '•') throw new Error('unmasked .secret content in public output: ' + inner);
          }
        }
      }
      return m;
    });
    return true;
  }

  const api = { maskSecrets, injectNoindex, assertAllMasked };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else (root.TE = root.TE || {}).redact = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
