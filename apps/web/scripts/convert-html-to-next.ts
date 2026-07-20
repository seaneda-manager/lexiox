import fs from 'fs-extra';
import path from 'path';
import * as cheerio from 'cheerio';

type Mapping = { id: string; route: string };

const mappings: Mapping[] = [
  { id: '#rsm', route: '/reading/study' },
  { id: '#lsm', route: '/listening/study' },
  { id: '#studentReadingView', route: '/reading/test' },
  { id: '#studentListeningView', route: '/listening/test' },
  { id: '#teacherReadingView', route: '/teacher/reading' },
  { id: '#teacherListeningView', route: '/teacher/listening' },
];

function getArg(name: string, fallback: string) {
  const idx = process.argv.indexOf(name);
  return (idx >= 0 && process.argv[idx + 1]) ? process.argv[idx + 1] : fallback;
}

(async () => {
  const inFile = getArg('--in', '');
  const outDir = getArg('--out', '.'); // 기본�?보장

  if (!inFile) {
    console.error('Usage: ts-node scripts/convert-html-to-next.ts --in ./raw/Layout-?�전?�본.html --out .');
    process.exit(1);
  }

  const inputPath = path.resolve(inFile);
  const projectRoot = path.resolve(outDir);
  const appDir = path.join(projectRoot, 'app');

  if (!fs.existsSync(inputPath)) {
    console.error('Input file not found:', inputPath);
    process.exit(1);
  }
  await fs.ensureDir(appDir);

  const html = await fs.readFile(inputPath, 'utf8');
  // cheerio ?�션 ?�??문제 ?�피: 기본 로드 ?�용
  const $ = cheerio.load(html);

  // Collect inline styles
  const styles: string[] = [];
  $('style').each((_, el) => {
    const txt = $(el).html() || '';
    if (txt.trim()) styles.push(txt.trim());
  });
  const legacyCssPath = path.join(appDir, 'legacy.css');
  await fs.writeFile(legacyCssPath, styles.join('\n\n'), 'utf8');
  console.log('Wrote', legacyCssPath);

  // Collect inline scripts (ignore external src)
  const inlineScripts: string[] = [];
  $('script').each((_, el) => {
    const src = $(el).attr('src');
    if (!src) {
      const txt = $(el).html() || '';
      if (txt.trim()) inlineScripts.push(txt);
    }
  });
  const scriptsBundle = inlineScripts.join('\n\n');

  async function writePage(route: string, htmlStr: string) {
    const routeParts = route.split('/').filter(Boolean);
    const dir = path.join(appDir, ...routeParts, '');
    await fs.ensureDir(dir);
    const pagePath = path.join(dir, 'page.tsx');
    const htmlJSON = JSON.stringify(htmlStr);
    const scriptJSON = JSON.stringify(scriptsBundle);
    const tsx = `\
'use client';
import { useEffect } from 'react';
const __LEGACY_HTML = ${htmlJSON};
const __LEGACY_SCRIPT = ${scriptJSON};
export default function Page(){
  useEffect(()=>{ try{ new Function(__LEGACY_SCRIPT)(); }catch(e){ console.error('[legacy-script]', e); } },[]);
  return <div dangerouslySetInnerHTML={{__html: __LEGACY_HTML}} />;
}`;
    await fs.writeFile(pagePath, tsx, 'utf8');
    console.log('Wrote', pagePath);
  }

  let foundAny = false;
  for (const m of mappings) {
    const el = $(m.id).first();
    if (el.length) {
      foundAny = true;
      const outer = $.html(el);
      await writePage(m.route, outer);
    } else {
      console.warn('[warn] Not found:', m.id, '->', m.route);
      await writePage(m.route, `<div style="padding:20px"><h2>Placeholder</h2><p>Element ${m.id} not found.</p></div>`);
    }
  }
  if (!foundAny) console.warn('No target IDs were found in the source HTML.');
})().catch(e => { console.error(e); process.exit(1); });





