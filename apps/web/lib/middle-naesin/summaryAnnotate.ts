// 요약본용 문장 주석: 본문 연결어(+ 왜 그 연결어인지)와 대화문 주요 표현 형광펜.
// 연결어는 정규식 기반의 자동 분석이므로, 관리자 화면에서는 확인용 안내를 함께 보여준다.

export type Segment = { text: string; kind: 'plain' | 'expr' | 'conn'; no?: number };
export type ConnNote = { no: number; word: string; role: string; why: string };
export type AnnotatedSentence = { en: string; segments: Segment[]; notes: ConnNote[] };

// ── 문맥 조각 도우미 ────────────────────────────────────────────────
const words = (s: string) => s.trim().split(/\s+/).filter(Boolean);
const head = (s: string, n: number) => {
  const w = words(s);
  return w.slice(0, n).join(' ') + (w.length > n ? '…' : '');
};
const tail = (s: string, n: number) => {
  const w = words(s.replace(/[,;]\s*$/, ''));
  return (w.length > n ? '…' : '') + w.slice(-n).join(' ');
};
const clause = (s: string) => s.split(/[,.;!?]/)[0].trim();

type Ctx = { w: string; before: string; after: string; prev: string | null; start: boolean };

// 앞 내용을 가리키는 말: 문장 맨 앞이면 앞 문장, 문장 중간이면 연결어 앞부분
const ref = (c: Ctx) =>
  c.start ? (c.prev ? `앞 문장 「${head(c.prev, 6)}」` : '앞 내용') : c.before.trim() ? `「${tail(c.before, 6)}」` : '앞 내용';

type Def = { re: RegExp; role: string; why: (c: Ctx) => string };

// 접속사로만 쓰이는 시간·조건 연결어 뒤에 올 수 있는 주어
const SUBJ_ANY = '(?=\\s+(?:i|you|he|she|it|we|they|there|this|that|the|a|an|my|your|his|her|our|their|[a-z]+)\\b)';
const SUBJ_PRON = '(?=\\s+(?:i|you|he|she|it|we|they|there)\\b)'; // after/before/until/since 는 전치사 용법이 흔해 대명사 주어일 때만

const DEFS: Def[] = [
  {
    re: /\b(?:however|nevertheless|nonetheless)\b/gi,
    role: '역접',
    why: (c) => `${ref(c)}과(와) 반대되는 내용을 이어 말하므로 연결어는 ‘${c.w}’.`,
  },
  {
    re: /\bbut\b/gi,
    role: '역접',
    why: (c) => `${ref(c)}과(와) 뒤의 「${head(c.after, 6)}」가 서로 반대·대조되므로 연결어는 ‘but’.`,
  },
  {
    re: /\b(?:even though|although|though)\b/gi,
    role: '양보',
    why: (c) => `「${c.w} ${head(clause(c.after), 6)}」는 '비록 ~이지만'이라는 양보 내용이고, 주절은 그와 반대되는 결과이므로 연결어는 ‘${c.w}’.`,
  },
  {
    re: /\b(?:because of|thanks to|due to)\b/gi,
    role: '원인(+명사)',
    why: (c) => `이유가 절이 아니라 명사(구) 「${head(clause(c.after), 3)}」로 오므로 because가 아니라 연결어는 ‘${c.w}’(+명사).`,
  },
  {
    re: /\bbecause\b(?!\s+of\b)/gi,
    role: '원인',
    why: (c) =>
      `「because ${head(clause(c.after), 6)}」가 ${c.before.trim() ? `「${tail(c.before, 6)}」의` : '앞뒤 내용의'} 이유이므로 연결어는 ‘because’.`,
  },
  {
    re: /(?:(?<=,\s)so\b(?!\s+that\b)|^so\b(?=,))/gi,
    role: '결과',
    why: (c) =>
      c.start
        ? '앞 문장의 결과를 이어서 말하므로 연결어는 ‘So’.'
        : `「${tail(c.before, 6)}」가 원인이고 「${head(c.after, 6)}」가 그 결과이므로 연결어는 ‘so’.`,
  },
  {
    re: /\bso that\b/gi,
    role: '목적',
    why: (c) => `「so that ${head(clause(c.after), 5)}」는 '~하기 위해서(목적)'이므로 연결어는 ‘so that’. (so ~ that 결과 구문과 구별)`,
  },
  {
    re: /\b(?:therefore|thus|as a result|consequently|for this reason)\b/gi,
    role: '결과',
    why: (c) => `${ref(c)}의 결과·결론이 이어지므로 연결어는 ‘${c.w}’.`,
  },
  {
    re: /\b(?:for example|for instance|such as)\b/gi,
    role: '예시',
    why: (c) => `${ref(c)}을(를) 구체적인 예로 설명하므로 연결어는 ‘${c.w}’.`,
  },
  {
    re: /\b(?:in addition|moreover|furthermore|besides|also)\b/gi,
    role: '추가',
    why: (c) => `${ref(c)}에 정보를 덧붙이므로 연결어는 ‘${c.w}’.`,
  },
  {
    re: /\b(?:in fact|actually)\b/gi,
    role: '강조·사실 보충',
    why: (c) => `${ref(c)}을(를) 뒷받침하거나 실제 사실을 강조하므로 연결어는 ‘${c.w}’.`,
  },
  {
    re: /\b(?:on the other hand|in contrast)\b/gi,
    role: '대조',
    why: (c) => `${ref(c)}과(와) 대비되는 측면을 말하므로 연결어는 ‘${c.w}’.`,
  },
  {
    re: /\binstead\b/gi,
    role: '대신',
    why: (c) => `${ref(c)} 대신 다른 것을 말하므로 연결어는 ‘instead’.`,
  },
  {
    re: /\botherwise\b/gi,
    role: '그렇지 않으면',
    why: (c) => `${ref(c)}이(가) 지켜지지 않을 때의 결과를 말하므로 연결어는 ‘otherwise’.`,
  },
  {
    re: /(?:^(?:first|second|third|finally|lastly|next)\b(?=,)|\bthen\b|\bafter that\b|\bat last\b)/gi,
    role: '순서·나열',
    why: (c) => `일이나 설명의 순서를 나타내므로 연결어는 ‘${c.w}’.`,
  },
  {
    re: new RegExp(`\\b(?:when(?!\\s+(?:do|does|did|is|are|was|were|will|can|should)\\b)|while|as soon as|whenever)\\b${SUBJ_ANY}`, 'gi'),
    role: '시간',
    why: (c) => `「${c.w} ${head(clause(c.after), 6)}」가 일이 일어나는 때(시점)를 나타내므로 연결어는 ‘${c.w}’.`,
  },
  {
    re: new RegExp(`\\b(?:after|before|until|since)\\b${SUBJ_PRON}`, 'gi'),
    role: '시간',
    why: (c) => `「${c.w} ${head(clause(c.after), 6)}」가 일이 일어나는 때(시점·기준)를 나타내므로 연결어는 ‘${c.w}’.`,
  },
  {
    re: new RegExp(`\\b(?:if|unless)\\b${SUBJ_ANY}`, 'gi'),
    role: '조건',
    why: (c) => `「${c.w} ${head(clause(c.after), 6)}」가 조건이므로 연결어는 ‘${c.w}’.${/^unless$/i.test(c.w) ? ' (unless = if ~ not)' : ''}`,
  },
];

type Hit = { start: number; end: number; text: string; def: Def };

function findConnectives(sentence: string): Hit[] {
  const hits: Hit[] = [];
  for (const def of DEFS) {
    const re = new RegExp(def.re.source, def.re.flags);
    for (const m of sentence.matchAll(re)) {
      if (m.index === undefined) continue;
      // 지정한 연결어 부분만 하이라이트(미리보기 lookahead 제외)
      hits.push({ start: m.index, end: m.index + m[0].length, text: m[0], def });
    }
  }
  // 겹치면 더 긴 것을 우선
  hits.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));
  const kept: Hit[] = [];
  for (const h of hits) if (!kept.length || h.start >= kept[kept.length - 1].end) kept.push(h);
  return kept;
}

// ── 주요 표현 ────────────────────────────────────────────────────
// 관리자가 대화문 extra_data.keyExpressions 를 넣지 않았을 때 쓰는 기본 목록
export const DEFAULT_KEY_EXPRESSIONS = [
  'How about', 'What about', "Why don't we", "Why don't you", 'Shall we', "Let's", 'Would you like', "I'd like", 'I would like',
  'Do you want', 'Can I', 'Can you', 'Could you', 'May I', 'Would you', 'Do you mind', "I'm sorry", "I'm afraid", 'Excuse me',
  'Thank you', 'Thanks for', "You're welcome", 'No problem', "Don't worry", 'Of course', 'Sure', 'I think', "I don't think",
  'In my opinion', 'I agree', 'I disagree', 'That sounds', "What's wrong", 'What happened', "I'm worried", 'I hope', 'Congratulations',
  'Good luck', "I'm looking forward to", "I can't wait", "I'm glad", 'Go straight', 'Turn left', 'Turn right', 'Can you tell me',
  'Could you tell me', "I'm interested in", "I'm good at", "I'm not sure",
];

// "How about ~ing?" 같은 표현에서 ~·sth 등을 떼고 고정 부분만 형광펜 대상으로 쓴다.
export function expressionParts(list: string[]): string[] {
  const out = new Set<string>();
  for (const raw of list) {
    for (const part of raw.split(/~|…|\.{3}|\b(?:sth|sb|someone|something|one's)\b|\?|\.|,/i)) {
      const t = part.replace(/^["'“”‘’\s]+|["'“”‘’\s]+$/g, '').trim();
      if (t.length >= 3 && /[A-Za-z]/.test(t) && !/^(?:ing|ed|en|ly)$/i.test(t)) out.add(t);
    }
  }
  return [...out].sort((a, b) => b.length - a.length);
}

function expressionRegex(parts: string[]): RegExp | null {
  if (parts.length === 0) return null;
  const esc = (s: string) =>
    s
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      .replace(/['’]/g, "['’]")
      .replace(/\s+/g, '\\s+');
  return new RegExp(`(?<![A-Za-z'’])(?:${parts.map(esc).join('|')})(?![A-Za-z])`, 'gi');
}

// ── 문장 주석 ────────────────────────────────────────────────────
export function annotateSentences(
  sentences: string[],
  opts: { connectives?: boolean; expressions?: string[] },
): AnnotatedSentence[] {
  const exprRe = expressionRegex(expressionParts(opts.expressions ?? []));
  let no = 0;

  return sentences.map((en, i) => {
    type Span = { start: number; end: number; kind: 'expr' | 'conn'; note?: ConnNote };
    const spans: Span[] = [];
    const notes: ConnNote[] = [];

    if (opts.connectives) {
      let beforeFrom = 0; // 문장 맨 앞 연결어(However, 등)는 뒤따르는 연결어의 '앞 내용'에서 뺀다
      for (const h of findConnectives(en)) {
        const start = h.start === 0 || /^\s*$/.test(en.slice(0, h.start));
        const note: ConnNote = {
          no: ++no,
          word: h.text,
          role: h.def.role,
          why: h.def.why({
            w: h.text,
            before: en.slice(beforeFrom, h.start).replace(/^[\s,]+/, ''),
            after: en.slice(h.end),
            prev: i > 0 ? sentences[i - 1] : null,
            start,
          }),
        };
        notes.push(note);
        spans.push({ start: h.start, end: h.end, kind: 'conn', note });
        if (start) beforeFrom = h.end;
      }
    }
    if (exprRe) {
      for (const m of en.matchAll(exprRe)) {
        if (m.index === undefined) continue;
        spans.push({ start: m.index, end: m.index + m[0].length, kind: 'expr' });
      }
    }

    spans.sort((a, b) => a.start - b.start || b.end - b.start - (a.end - a.start));
    const kept: Span[] = [];
    for (const s of spans) if (!kept.length || s.start >= kept[kept.length - 1].end) kept.push(s);

    const segments: Segment[] = [];
    let pos = 0;
    for (const s of kept) {
      if (s.start > pos) segments.push({ text: en.slice(pos, s.start), kind: 'plain' });
      segments.push({ text: en.slice(s.start, s.end), kind: s.kind, no: s.note?.no });
      pos = s.end;
    }
    if (pos < en.length) segments.push({ text: en.slice(pos), kind: 'plain' });
    return { en, segments, notes: kept.filter((s) => s.note).map((s) => s.note!) };
  });
}
