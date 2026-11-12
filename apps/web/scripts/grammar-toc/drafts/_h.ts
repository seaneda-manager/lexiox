// 초안 레슨 작성용 도우미 (압축 표기 → GrammarLesson 모양)
type Lv = 'basic' | 'intermediate' | 'advanced';
export const ch = (en: string, ko: string) => ({ en, ko });
export const CNT = [ch('None', '0개'), ch('One', '1개'), ch('Two', '2개'), ch('Three', '3개')];
export const pc = (stem: string, stemKo: string, level: Lv, c: [string, string][], answerIndex: number, explanationKo: string, kind = 'pick_correct') => ({
  kind, stem, level, stemKo, choices: c.map(([en, ko]) => ch(en, ko)), answerIndex, explanationKo,
});
export const cw = (stem: string, level: Lv, answerIndex: number, explanationKo: string) => ({ kind: 'count_wrong', stem, level, stemKo: '틀린 문장의 개수를 고르세요.', choices: CNT, answerIndex, explanationKo });

type Ex = [string, string, string, string]; // en, ko, tag, note
export type Draft = {
  conceptKey: string; topic: string; titleKo: string; summaryEn: string; summaryKo: string;
  rules: [string, string][]; examples: [string, string][];
  groups: [string, string, Ex[]][]; wrong: [string, string, string][]; // 틀린 예: en, 고친 설명 ko, (미사용)
  wrongNote: string;
  cram: string; blanks: [string, string, string][];
  fill: [Lv, string, string, string[], string, string, string][];
  fix: [Lv, string, string, string[], string[], number, string][];
  questions: any[]; popup: [string, string, string[], string][];
  written: any[]; top: [string, string, string]; lecture: any[];
};

export function mk(d: Draft) {
  return {
    conceptKey: d.conceptKey, level: 1,
    lesson: {
      version: 1, status: 'draft', topic: d.topic,
      explanation: {
        titleKo: d.titleKo, summaryEn: d.summaryEn, summaryKo: d.summaryKo,
        rules: d.rules.map(([en, ko]) => ({ en, ko })),
        examples: d.examples.map(([en, ko]) => ({ en, ko })),
      },
      exampleGroups: [
        ...d.groups.map(([title, note, exs]) => ({ title, note, examples: exs.map(([en, ko, tag, n]) => ({ en, ko, tag, note: n, wrong: false })) })),
        { title: '틀린 예', note: d.wrongNote, examples: d.wrong.map(([en, ko]) => ({ en, ko, tag: '', note: '', wrong: true })) },
      ],
      cramText: d.cram,
      blanks: d.blanks.map(([text, answer, hint]) => ({ text, answer, hint })),
      drillFill: d.fill.map(([level, sentence, answer, choices, ko, noteKo, hint]) => ({ level, sentence, answer, choices, ko, noteKo, hint })),
      drillFix: d.fix.map(([level, sentence, wrong, correct, reasonChoices, reasonIndex, ko]) => ({ level, sentence, wrong, correct, reasonChoices, reasonIndex, ko })),
      questions: d.questions,
      popupQuiz: d.popup.map(([prompt, answer, options, hint_ko]) => ({ prompt, answer, options, hint_ko })),
      writtenTasks: d.written,
      topPoints: [{ text: d.top[0], example: { en: d.top[1], ko: d.top[2] } }],
      examPoints: [], deepDive: [], lecture: d.lecture,
    },
  };
}
