#!/usr/bin/env node
// apps/web/scripts/redirects-from-inventory.js
// Usage: node apps/web/scripts/redirects-from-inventory.js /tmp/pages.json > /tmp/redirects.json

const fs = require('fs');
const path = require('path');

const input = process.argv[2];
if (!input) {
  console.error('Usage: node redirects-from-inventory.js <pages.json>');
  process.exit(1);
}

const raw = fs.readFileSync(input, 'utf8');
let data;
try {
  data = JSON.parse(raw);
} catch (e) {
  console.error('Invalid JSON:', e.message);
  process.exit(1);
}

// pages.json 형태 자동 감지: ["\/a", "\/b"] 또는 [{path:"/a"}, {route:"/b"}]
let paths = [];
if (Array.isArray(data)) {
  if (typeof data[0] === 'string') {
    paths = data;
  } else if (typeof data[0] === 'object' && data[0] !== null) {
    paths = data.map(it => it.path || it.route || it.url).filter(Boolean);
  }
}
if (!paths.length) {
  console.error('No paths found in pages.json (expected array of strings or objects with path/route/url).');
  process.exit(1);
}

// 정규화 유틸
const norm = (p) => {
  if (!p.startsWith('/')) p = '/' + p;
  // 확장자/인덱스 제거 케이스 대비 (필요시 추가 규칙 커스터마이즈)
  p = p.replace(/\/index$/i, '/');
  p = p.replace(/\.html?$/i, '');
  // 중복 슬래시 정리
  p = p.replace(/\/{2,}/g, '/');
  // 끝 슬래시 제거(루트 제외)
  if (p.length > 1) p = p.replace(/\/+$/,'');
  return p;
};

const set = new Set();
paths.forEach(p => set.add(norm(String(p))));

const redirects = [];
for (const p of set) {
  // 1) 슬래시 정규화: /foo/  -> /foo
  if (p !== '/' && !p.endsWith('/')) {
    redirects.push({ source: p + '/', destination: p, permanent: true });
  }

  // 2) index.html, .html 정리: /foo/index.html, /foo.html -> /foo
  const htmlCandidates = [p + '.html', p + '/index.html'];
  for (const src of htmlCandidates) {
    redirects.push({ source: src, destination: p, permanent: true });
  }

  // 3) 대문자 경로를 소문자로 정규화 (원하면 끄세요)
  if (/[A-Z]/.test(p)) {
    const lower = p.toLowerCase();
    if (lower !== p) {
      redirects.push({ source: p, destination: lower, permanent: true });
    }
  }
}

// 중복 제거
const key = r => `${r.source}->${r.destination}:${r.permanent?'1':'0'}`;
const uniq = [];
const seen = new Set();
for (const r of redirects) {
  const k = key(r);
  if (!seen.has(k)) {
    seen.add(k);
    uniq.push(r);
  }
}

process.stdout.write(JSON.stringify(uniq, null, 2));
