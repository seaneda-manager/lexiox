// scripts/detect-duplicate-routes.mjs
import { readdirSync, statSync } from 'fs'
import { join, sep, relative } from 'path'

const APP_DIR = join(process.cwd(), 'apps', 'web', 'app') // 루트에서 실행 기준

const PAGE_FILES = new Set(['page.tsx','page.ts','page.jsx','page.js','page.mdx'])
const files = []
function walk(dir){ for(const n of readdirSync(dir)){ const p=join(dir,n); const s=statSync(p); s.isDirectory()?walk(p):PAGE_FILES.has(n)&&files.push(p) } }
function normalizeRoute(fp){
  const rel = relative(APP_DIR, fp).split(sep); rel.pop()
  const parts = rel.filter(seg => seg && !seg.startsWith('(') && !seg.startsWith('@'))
  const url = '/'+parts.join('/')
  return url === '/' ? '/' : url.replace(/\/+/g,'/')
}
walk(APP_DIR)
const map = new Map()
for (const f of files){ const url=normalizeRoute(f); (map.get(url)||map.set(url,[]).get(url)).push(f) }
let dup=false
for(const [url,list] of map){ if(list.length>1){ dup=true; console.log(`\n[충돌] ${url}`); list.forEach(f=>console.log('  - '+f)) } }
console.log(dup ? '\n위 파일들 중 하나만 남기세요. (route group은 URL에 안 붙습니다)' : '중복 라우트 없음 ✅')
if (dup) process.exitCode = 1
