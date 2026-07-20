/*
 * Page Inventory Scanner
 * Usage: node apps/web/scripts/scan-pages.js > /tmp/pages.txt
 * Output: JSON + CSV to console
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(process.cwd(), 'apps/web/app');
const MATCH_FILES = new Set(['page.tsx','page.ts','layout.tsx','route.ts']);

function walk(dir, acc=[]) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) walk(p, acc);
    else if (MATCH_FILES.has(name)) acc.push(p);
  }
  return acc;
}
function toRoute(file) {
  let rel = file.replace(ROOT, '').replace(/\\/g,'/');
  rel = rel.replace(/\/(page|layout|route)\.tsx?$/, '/');
  rel = rel.replace(/\([^\)]+\)\/?/g, '');   // (route groups) 제거
  rel = rel.replace(/\/+/g,'/');
  if (!rel.startsWith('/')) rel = '/' + rel;
  rel = rel.replace(/\/$/, '');
  return rel || '/';
}
function detectRole(file, code) {
  const rel = file.replace(/.*apps\/web\//,'');
  if (rel.includes('/app/api/')) return 'api';
  if (/\/_archive\//.test(rel)) return 'archive';
  if (/\/(dev|sample|sandbox)\//.test(rel)) return 'dev-sample';
  if (/\/(admin|cms|manage)\//.test(rel)) return 'admin-cms';
  if (/\/(teacher|staff)\//.test(rel)) return 'teacher';
  if (/\/(auth|login|register|signup)\//.test(rel)) return 'auth';
  if (/TestRunner|Reading.*Runner|Listening.*Runner|Runner/i.test(code)) return 'runner';
  if (/Dashboard|MyTasks|Assignments|study|review/i.test(code)) return 'student';
  return 'unknown';
}
function hints(code) {
  const keys = []; const push=(k,re)=>{ if (re.test(code)) keys.push(k); };
  push('TestRunnerV2', /TestRunnerV2/);
  push('TestRunnerV3', /TestRunnerV3/);
  push('useReadingRunner', /useReadingRunner/);
  push('types-reading (deprecated)', /@\/types\/types-reading/);
  push('models-reading (SSOT)', /@\/models\/reading/);
  push('ListeningRunner', /Listening.*Runner/);
  push('SupabaseServer', /getSupabaseServer/);
  push('ServerAction', /'use server'|export\s+async\s+function\s+action/i);
  return keys.join(', ');
}
function scan() {
  const files = walk(ROOT, []);
  const rows = files.map(f => {
    const code = fs.readFileSync(f, 'utf8');
    return {
      file: f.replace(process.cwd()+path.sep, ''),
      route: toRoute(f),
      kind: path.basename(f).startsWith('route') ? 'api' : path.basename(f).replace(/\.tsx?$/,''),
      protected: /\(protected\)/.test(f),
      dynamic: /\[[^\]]+\]/.test(f),
      role: detectRole(f, code),
      hints: hints(code),
    };
  });
  console.log('\n=== PAGE-INVENTORY:JSON ===');
  console.log(JSON.stringify(rows, null, 2));
  const cols = ['route','role','kind','protected','dynamic','file','hints'];
  const csv = [cols.join(',')].concat(rows.map(r => cols.map(c => {
    const v = r[c]; const s = (v===true?'true':v===false?'false':String(v??''));
    return '"'+s.replace(/"/g,'""')+'"';
  }).join(','))).join('\n');
  console.log('\n=== PAGE-INVENTORY:CSV ==='); console.log(csv);
}
scan();
