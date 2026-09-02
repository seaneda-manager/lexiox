// 문법 요소 카탈로그 — grammar_elements 테이블 시드 소스 + 자유텍스트 레이블 매칭
//
// POST /api/admin/grammar-quiz/elements/seed 가 GRAMMAR_ELEMENT_SEED 를 upsert.
// 드릴 임포트 시 grammar_labels 의 한국어 레이블을 matchElementCode() 로 코드에 매핑.

export type GrammarElementSeed = {
  code: string;
  label_ko: string;
  label_en: string;
  category: string;
  /** 자유텍스트 레이블 매칭용 키워드(부분일치, 공백·문장부호 무시) */
  aliases: string[];
};

export const GRAMMAR_ELEMENT_SEED: GrammarElementSeed[] = [
  // ── 수일치 ──────────────────────────────────────────────
  { code: "sva_basic", label_ko: "주어-동사 수일치", label_en: "Subject-Verb Agreement", category: "수일치", aliases: ["주어동사수일치", "주어와동사", "수일치기본"] },
  { code: "sva_prep_modifier", label_ko: "수식어구 뒤 주어-동사 수일치", label_en: "Agreement with Modifier", category: "수일치", aliases: ["전명구", "수식어구", "전치사구주어"] },
  { code: "sva_relative", label_ko: "관계절 안 동사 수일치", label_en: "Agreement in Relative Clause", category: "수일치", aliases: ["관계절수일치", "선행사수일치"] },
  { code: "noun_pronoun_agreement", label_ko: "명사-대명사 수일치", label_en: "Noun-Pronoun Agreement", category: "수일치", aliases: ["명사대명사수일치", "대명사수일치", "명사대명사"] },
  { code: "sva_correlative", label_ko: "상관접속사 주어 수일치", label_en: "Agreement with Correlatives", category: "수일치", aliases: ["either", "neither", "not only", "상관접속사수일치"] },
  { code: "sva_quantifier", label_ko: "수량표현 주어 수일치", label_en: "Agreement with Quantifiers", category: "수일치", aliases: ["most of", "some of", "부분표현", "수량표현"] },

  // ── 관계사 ──────────────────────────────────────────────
  { code: "rel_pron_subject", label_ko: "주격 관계대명사", label_en: "Subject Relative Pronoun", category: "관계사", aliases: ["주격관계대명사", "who주격", "which주격"] },
  { code: "rel_pron_object", label_ko: "목적격 관계대명사", label_en: "Object Relative Pronoun", category: "관계사", aliases: ["목적격관계대명사", "whom", "목적격관계"] },
  { code: "rel_pron_omission", label_ko: "목적격 관계대명사 생략", label_en: "Omitted Object Relative Pronoun", category: "관계사", aliases: ["관계대명사생략", "목적격생략", "that생략"] },
  { code: "rel_pron_possessive", label_ko: "소유격 관계대명사 (whose)", label_en: "Possessive Relative (whose)", category: "관계사", aliases: ["whose", "소유격관계대명사"] },
  { code: "rel_adverb", label_ko: "관계부사 (where/when/why/how)", label_en: "Relative Adverb", category: "관계사", aliases: ["관계부사", "where", "when관계", "why관계"] },
  { code: "rel_what", label_ko: "관계대명사 what", label_en: "Relative Pronoun 'what'", category: "관계사", aliases: ["관계대명사what", "what명사절"] },
  { code: "rel_prep_relative", label_ko: "전치사 + 관계대명사", label_en: "Preposition + Relative Pronoun", category: "관계사", aliases: ["전치사관계대명사", "in which", "for whom"] },
  { code: "rel_nonrestrictive", label_ko: "계속적 용법 (콤마 + 관계사)", label_en: "Non-restrictive Relative Clause", category: "관계사", aliases: ["계속적용법", "콤마관계대명사", "비제한적"] },
  { code: "rel_that_only", label_ko: "that만 쓰는 관계대명사", label_en: "Relative 'that' Only", category: "관계사", aliases: ["that만", "the only that", "최상급that"] },

  // ── 시제 ────────────────────────────────────────────────
  { code: "tense_present_simple", label_ko: "현재시제", label_en: "Present Simple", category: "시제", aliases: ["현재시제", "현재형"] },
  { code: "tense_past_simple", label_ko: "과거시제", label_en: "Past Simple", category: "시제", aliases: ["과거시제", "과거형"] },
  { code: "tense_present_perfect", label_ko: "현재완료", label_en: "Present Perfect", category: "시제", aliases: ["현재완료", "have p.p.", "havepp"] },
  { code: "tense_past_perfect", label_ko: "과거완료", label_en: "Past Perfect", category: "시제", aliases: ["과거완료", "had p.p.", "hadpp", "대과거"] },
  { code: "tense_future", label_ko: "미래 표현", label_en: "Future", category: "시제", aliases: ["미래시제", "will", "be going to"] },
  { code: "tense_progressive", label_ko: "진행형", label_en: "Progressive", category: "시제", aliases: ["진행형", "be ving", "현재진행", "과거진행"] },
  { code: "tense_agreement", label_ko: "시제 일치", label_en: "Sequence of Tenses", category: "시제", aliases: ["시제일치", "주절종속절시제"] },

  // ── 조동사 ──────────────────────────────────────────────
  { code: "modal_basic", label_ko: "조동사 기본 (can/may/must/should)", label_en: "Basic Modals", category: "조동사", aliases: ["조동사기본", "can", "must", "should조동사"] },
  { code: "modal_perfect", label_ko: "조동사 + have p.p.", label_en: "Modal + have p.p.", category: "조동사", aliases: ["조동사완료", "should have", "must have pp", "과거추측"] },
  { code: "modal_advice", label_ko: "충고·의무 조동사", label_en: "Modals of Advice/Obligation", category: "조동사", aliases: ["had better", "ought to", "충고조동사"] },
  { code: "modal_deduction", label_ko: "추측 조동사", label_en: "Modals of Deduction", category: "조동사", aliases: ["추측조동사", "must확신", "cannot부정추측"] },

  // ── 부정사 ──────────────────────────────────────────────
  { code: "to_inf_noun", label_ko: "to부정사의 명사적 용법", label_en: "To-infinitive as Noun", category: "부정사", aliases: ["명사적용법", "to부정사명사"] },
  { code: "to_inf_adj", label_ko: "to부정사의 형용사적 용법", label_en: "To-infinitive as Adjective", category: "부정사", aliases: ["형용사적용법", "to부정사형용사"] },
  { code: "to_inf_adv", label_ko: "to부정사의 부사적 용법", label_en: "To-infinitive as Adverb", category: "부정사", aliases: ["부사적용법", "목적to", "결과to", "감정원인to"] },
  { code: "to_inf_too_enough", label_ko: "too ~ to / enough to", label_en: "too ~ to / enough to", category: "부정사", aliases: ["too to", "enough to", "너무해서"] },
  { code: "to_inf_it_for", label_ko: "가주어 it + to부정사 (의미상 주어 for)", label_en: "It ~ (for) to-infinitive", category: "부정사", aliases: ["가주어진주어", "it to", "의미상주어for", "of사람"] },

  // ── 동명사 ──────────────────────────────────────────────
  { code: "gerund_subject_object", label_ko: "동명사 주어·목적어", label_en: "Gerund as Subject/Object", category: "동명사", aliases: ["동명사주어", "동명사목적어"] },
  { code: "gerund_vs_infinitive", label_ko: "동명사 vs to부정사 목적어", label_en: "Gerund vs Infinitive", category: "동명사", aliases: ["동명사부정사", "enjoy동명사", "want부정사", "remember to ving"] },
  { code: "gerund_prep", label_ko: "전치사 + 동명사", label_en: "Preposition + Gerund", category: "동명사", aliases: ["전치사동명사", "관용동명사", "look forward to ving"] },

  // ── 분사 ────────────────────────────────────────────────
  { code: "participle_adjective", label_ko: "분사의 형용사 역할 (현재/과거분사)", label_en: "Participle as Adjective", category: "분사", aliases: ["현재분사", "과거분사수식", "분사형용사"] },
  { code: "participle_emotion", label_ko: "감정분사 (-ing / -ed)", label_en: "Participles of Emotion", category: "분사", aliases: ["감정분사", "interesting interested", "excited exciting"] },
  { code: "participle_clause", label_ko: "분사구문", label_en: "Participial Construction", category: "분사", aliases: ["분사구문", "부대상황", "동시동작분사"] },

  // ── 수동태 ──────────────────────────────────────────────
  { code: "passive_basic", label_ko: "수동태 기본 (be + p.p.)", label_en: "Basic Passive", category: "수동태", aliases: ["수동태기본", "be pp", "수동태"] },
  { code: "passive_tense", label_ko: "시제별 수동태", label_en: "Passive in Various Tenses", category: "수동태", aliases: ["완료수동태", "진행수동태", "조동사수동태"] },
  { code: "passive_special", label_ko: "4·5형식 수동태 / by 이외 전치사", label_en: "Special Passive", category: "수동태", aliases: ["4형식수동태", "5형식수동태", "by이외전치사", "be known as"] },

  // ── 접속사·절 ──────────────────────────────────────────
  { code: "conj_coordinating", label_ko: "등위접속사 (and/but/or/so)", label_en: "Coordinating Conjunctions", category: "접속사", aliases: ["등위접속사", "and but or"] },
  { code: "conj_correlative", label_ko: "상관접속사 (both~and 등)", label_en: "Correlative Conjunctions", category: "접속사", aliases: ["상관접속사", "both and", "not only but also", "either or"] },
  { code: "conj_time_reason", label_ko: "시간·이유 부사절 접속사", label_en: "Adverbial Clauses (Time/Reason)", category: "접속사", aliases: ["시간부사절", "이유부사절", "when절", "because", "since접속사"] },
  { code: "conj_concession", label_ko: "양보 부사절 (although/though/even if)", label_en: "Concessive Clauses", category: "접속사", aliases: ["양보부사절", "although", "though", "even though"] },
  { code: "conj_condition", label_ko: "조건 부사절 (if/unless)", label_en: "Conditional Clauses", category: "접속사", aliases: ["조건부사절", "if조건", "unless"] },
  { code: "conj_so_that", label_ko: "so ~ that / such ~ that", label_en: "so/such ~ that", category: "접속사", aliases: ["so that", "such that", "so형용사that"] },
  { code: "conj_noun_that", label_ko: "명사절 접속사 that", label_en: "Noun Clause 'that'", category: "접속사", aliases: ["명사절that", "that명사절", "동격that"] },
  { code: "conj_whether_if", label_ko: "명사절 whether / if", label_en: "Noun Clause whether/if", category: "접속사", aliases: ["whether", "if명사절", "인지아닌지"] },
  { code: "conj_indirect_question", label_ko: "간접의문문", label_en: "Indirect Questions", category: "접속사", aliases: ["간접의문문", "의문사절어순"] },

  // ── 비교 ────────────────────────────────────────────────
  { code: "comp_comparative", label_ko: "비교급", label_en: "Comparative", category: "비교", aliases: ["비교급", "more than", "er than"] },
  { code: "comp_superlative", label_ko: "최상급", label_en: "Superlative", category: "비교", aliases: ["최상급", "the most", "est"] },
  { code: "comp_as_as", label_ko: "원급 비교 (as ~ as)", label_en: "as ~ as", category: "비교", aliases: ["원급비교", "as as", "동등비교"] },
  { code: "comp_the_more", label_ko: "the 비교급, the 비교급", label_en: "the more ~ the more", category: "비교", aliases: ["the비교급the비교급", "the more the more"] },
  { code: "comp_emphasis", label_ko: "비교급 강조 (much/even/far)", label_en: "Comparative Emphasis", category: "비교", aliases: ["비교급강조", "much비교급", "even비교급"] },

  // ── 가정법 ──────────────────────────────────────────────
  { code: "subj_past", label_ko: "가정법 과거", label_en: "Subjunctive Past", category: "가정법", aliases: ["가정법과거", "if과거동사", "현재사실반대"] },
  { code: "subj_past_perfect", label_ko: "가정법 과거완료", label_en: "Subjunctive Past Perfect", category: "가정법", aliases: ["가정법과거완료", "if had pp", "과거사실반대"] },
  { code: "subj_wish", label_ko: "I wish 가정법", label_en: "I wish + Subjunctive", category: "가정법", aliases: ["i wish", "wish가정법"] },
  { code: "subj_as_if", label_ko: "as if / as though 가정법", label_en: "as if + Subjunctive", category: "가정법", aliases: ["as if", "as though", "마치처럼"] },

  // ── 도치·강조·구조 ────────────────────────────────────
  { code: "inversion_negative", label_ko: "부정어 도치", label_en: "Negative Inversion", category: "도치·강조", aliases: ["부정어도치", "never도치", "hardly도치", "not only도치"] },
  { code: "inversion_so_neither", label_ko: "so/neither + 동사 + 주어", label_en: "so/neither Inversion", category: "도치·강조", aliases: ["so do i", "neither do i", "동조도치"] },
  { code: "emphasis_it_that", label_ko: "It ~ that 강조구문", label_en: "It ~ that Cleft", category: "도치·강조", aliases: ["it that강조", "강조구문", "분열문"] },
  { code: "emphasis_do", label_ko: "조동사 do 강조", label_en: "Emphatic 'do'", category: "도치·강조", aliases: ["do강조", "동사강조"] },
  { code: "structure_svoc", label_ko: "5형식 (목적격보어)", label_en: "SVOC", category: "문장구조", aliases: ["5형식", "목적격보어", "사역동사", "지각동사"] },
  { code: "structure_svoo", label_ko: "4형식 (수여동사)", label_en: "SVOO", category: "문장구조", aliases: ["4형식", "수여동사", "간접목적어"] },
  { code: "structure_there_be", label_ko: "There + be동사", label_en: "There + be", category: "문장구조", aliases: ["there is", "there are", "유도부사there"] },
  { code: "structure_parallel", label_ko: "병렬 구조", label_en: "Parallel Structure", category: "문장구조", aliases: ["병렬구조", "병렬", "parallelism"] },

  // ── 대명사·한정사 ────────────────────────────────────
  { code: "pronoun_reflexive", label_ko: "재귀대명사", label_en: "Reflexive Pronouns", category: "대명사·한정사", aliases: ["재귀대명사", "myself", "재귀"] },
  { code: "pronoun_it_one_that", label_ko: "부정대명사 it / one / that", label_en: "it / one / that", category: "대명사·한정사", aliases: ["부정대명사", "one that", "it one 차이"] },
  { code: "determiner_quantifier", label_ko: "수량 한정사 (many/much/few/little)", label_en: "Quantifiers", category: "대명사·한정사", aliases: ["수량한정사", "many much", "few little", "가산불가산"] },
];

const norm = (s: string) => (s || "").toLowerCase().replace(/[\s ().,'"~\-\/]/g, "");

/** 자유텍스트(한국어) 문법 레이블 → 가장 가까운 element code. 못 찾으면 null. */
export function matchElementCode(labelKo: string): string | null {
  const n = norm(labelKo);
  if (!n) return null;
  // 1) label_ko 정확/부분 일치
  for (const e of GRAMMAR_ELEMENT_SEED) {
    if (norm(e.label_ko) === n) return e.code;
  }
  // 2) alias 부분 일치 (긴 alias 우선)
  let best: { code: string; len: number } | null = null;
  for (const e of GRAMMAR_ELEMENT_SEED) {
    for (const a of [e.label_ko, ...e.aliases]) {
      const na = norm(a);
      if (na.length >= 2 && (n.includes(na) || na.includes(n))) {
        if (!best || na.length > best.len) best = { code: e.code, len: na.length };
      }
    }
  }
  return best?.code ?? null;
}
