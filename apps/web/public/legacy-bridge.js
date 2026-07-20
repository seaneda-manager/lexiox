(function () {
  // ✅ 폴백: __legacyBridge 가 없다면 최소 callInit만 만들어줌
  if (!window.__legacyBridge) {
    window.__legacyBridge = {
      callInit(fnName, payload) {
        try {
          console.log('[legacy-bridge] calling', fnName);
          if (typeof window[fnName] === 'function') {
            window[fnName](payload);
            console.log('[legacy-bridge] called OK:', fnName);
          } else {
            console.warn('[legacy-bridge] missing init function:', fnName);
          }
        } catch (e) {
          console.error('[legacy-bridge] error in', fnName, e);
        }
      }
    };
  }

  function pickModeByDom() {
    return {
      readingStudy:   !!document.getElementById('rsm'),
      listeningStudy: !!document.getElementById('lsm'),
      readingTest:    !!document.getElementById('studentReadingView'),
      listeningTest:  !!document.getElementById('studentListeningView'),
    };
  }

  // ✅ 자동탐색도 반드시 callInit을 통해 호출
  function findAndCall(regexes, payload) {
    const keys = Object.keys(window);
    for (const k of keys) {
      try {
        if (typeof window[k] === 'function' && regexes.every(r => r.test(k))) {
          window.__legacyBridge.callInit(k, payload);
          return true;
        }
      } catch {}
    }
    return false;
  }

  function apply(detail) {
    const section = detail?.section;                   // 'reading' | 'listening' (없어도 DOM으로 추론)
    const payload = detail?.payload ?? detail?.payload_json ?? detail;
    const mode = pickModeByDom();

    // 1) 명시 매핑 (있으면 우선) — ✅ callInit 경유
    try {
      if (section === 'reading' || mode.readingStudy || mode.readingTest) {
        if (mode.readingStudy   && typeof window.initReadingStudy   === 'function')
          return window.__legacyBridge.callInit('initReadingStudy', payload);
        if (mode.readingTest    && typeof window.initReadingTest    === 'function')
          return window.__legacyBridge.callInit('initReadingTest', payload);
      }
      if (section === 'listening' || mode.listeningStudy || mode.listeningTest) {
        if (mode.listeningStudy && typeof window.initListeningStudy === 'function')
          return window.__legacyBridge.callInit('initListeningStudy', payload);
        if (mode.listeningTest  && typeof window.initListeningTest  === 'function')
          return window.__legacyBridge.callInit('initListeningTest', payload);
      }
    } catch (e) { console.warn('[legacy-bridge] named mapping failed', e); }

    // 2) 자동 탐색 (함수명이 달라도 추론) — ✅ callInit 경유
    if ((section === 'reading'  || mode.readingStudy)   && mode.readingStudy)   { if (findAndCall([/^init/i, /read/i, /study|learn/i], payload)) return; }
    if ((section === 'reading'  || mode.readingTest)    && mode.readingTest)    { if (findAndCall([/^init/i, /read/i, /test|exam|student/i], payload)) return; }
    if ((section === 'listening'|| mode.listeningStudy) && mode.listeningStudy) { if (findAndCall([/^init/i, /listen/i, /study|learn/i], payload)) return; }
    if ((section === 'listening'|| mode.listeningTest)  && mode.listeningTest)  { if (findAndCall([/^init/i, /listen/i, /test|exam|student/i], payload)) return; }

    // 3) 마지막 수단: 보관하고 경고
    window.__LEGACY_LAST_PAYLOAD__ = detail;
    console.warn('[legacy-bridge] No init function matched. Stored to window.__LEGACY_LAST_PAYLOAD__');
  }

  // 이벤트로 payload 받기
  window.addEventListener('toefl:payload', function (e) {
    try { apply(e.detail); } catch (err) { console.error('[legacy-bridge] handle error', err); }
  });

  // 초기 페이로드가 미리 있다면 즉시 적용
  if (window.__LEGACY_SET__) {
    try { apply(window.__LEGACY_SET__); } catch (err) { console.error('[legacy-bridge] early apply error', err); }
  }
})();
