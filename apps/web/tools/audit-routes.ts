// tools/audit-routes.ts
// Usage: pnpm tsx tools/audit-routes.ts
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(process.cwd(), 'apps/web/app');
const OUT = path.resolve(process.cwd(), 'audit');
fs.mkdirSync(OUT, { recursive: true });

type RouteItem = {
  kind: 'page' | 'layout' | 'route' | 'metadata';
  file: string;
  routePath: string;
};

const exts = ['page.tsx','page.ts','layout.tsx','layout.ts','route.ts','route.tsx','generateMetadata.ts','generateMetadata.tsx'];
const items: RouteItem[] = [];

function toRoute(p: string) {
  const rel = path.relative(ROOT, path.dirname(p)).replace(/\\/g,'/');
  // Next.js route groups () ?쒓굅
  return '/' + rel
    .replace(/\(.*?\)\//g, '')
    .replace(/^\/?$/, '')
    .replace(/\/index$/,'');
}

function walk(dir: string) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walk(full);
    } else if (exts.some(e => f.endsWith(e))) {
      let kind: RouteItem['kind'] = f.startsWith('layout') ? 'layout'
        : f.startsWith('route') ? 'route'
        : f.startsWith('generateMetadata') ? 'metadata'
        : 'page';
      items.push({ kind, file: full, routePath: toRoute(full) || '/' });
    }
  }
}
walk(ROOT);

// 洹몃９??
const byRoute = items.reduce<Record<string, RouteItem[]>>((acc, it) => {
  (acc[it.routePath] ||= []).push(it);
  return acc;
}, {});

// ?좎궗/以묐났 ?쇱슦???꾨낫 媛먯?
// 洹쒖튃: routePath ??segment媛 ?숈씪?섍굅?? study/test/review 紐⑤뱶留??ㅻⅨ 寃쎌슦
function lastSeg(p: string) {
  const segs = p.split('/').filter(Boolean);
  return segs[segs.length - 1] || '';
}
const routes = Object.keys(byRoute).sort();
const dupes: Record<string, string[]> = {};
for (const r of routes) {
  const key = lastSeg(r).replace(/(study|test|review|dev|sample)/g,'_mode_');
  dupes[key] ||= [];
  dupes[key].push(r);
}
const dupesFiltered = Object.fromEntries(
  Object.entries(dupes).filter(([, arr]) => arr.length > 1)
);

// 而댄룷?뚰듃/????ъ슜泥???깋??(reading/listening 以묒슂 ?뚯씪)
const componentHints = [
  'TestRunner', 'TestRunnerV2', 'PassagePane', 'SkimGate',
  'LAudioScreen', 'LQuestionScreen'
];
const typeHints = [
  'RPassage','RQuestion','readingSetSchema',
  'ListeningTrack','LQuestion'
];
const compIndex: Record<string, string[]> = {};
const srcRoot = path.resolve(process.cwd(), 'apps/web');
function walkSrc(dir: string) {
  for (const f of fs.readdirSync(dir)) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walkSrc(full);
    else if (/\.(tsx?|mjs|cjs|jsx)$/.test(f)) {
      const text = fs.readFileSync(full, 'utf8');
      [...componentHints, ...typeHints].forEach(h => {
        if (text.includes(h)) {
          (compIndex[h] ||= []).push(path.relative(srcRoot, full).replace(/\\/g,'/'));
        }
      });
    }
  }
}
walkSrc(srcRoot);

// 異쒕젰
fs.writeFileSync(path.join(OUT, 'routes.json'), JSON.stringify(byRoute, null, 2));
fs.writeFileSync(path.join(OUT, 'dupes.json'), JSON.stringify(dupesFiltered, null, 2));
fs.writeFileSync(path.join(OUT, 'components.json'), JSON.stringify(compIndex, null, 2));

console.log('??Wrote audit/routes.json, audit/dupes.json, audit/components.json');




