import type { MiddleNaesinContent } from '@/models/middle-naesin';
import type { MiddleNaesinDrillSections, MiddleNaesinDrillSection } from '@/components/middle-naesin/drill/types';
import {
  makeRng,
  buildWordQuiz,
  buildPhraseQuiz,
  buildOrderQuizzes,
  buildQaMatch,
  buildExpressionClassify,
  buildGrammarLabelQuiz,
  parseKeyExpressions,
} from '@/lib/middle-naesin/summaryQuiz';
import type {
  WordQuiz,
  PhraseQuiz,
  OrderQuiz,
  QaMatchQuiz,
  ExpressionClassifyQuiz,
  LabelItem,
} from '@/lib/middle-naesin/summaryQuiz';

export type LessonQuizData = {
  words: WordQuiz | null;
  phrases: PhraseQuiz | null;
  expressions: ExpressionClassifyQuiz | null;
  qaMatch: QaMatchQuiz | null;
  dialogueOrder: OrderQuiz[];
  mainOrder: OrderQuiz[];
  mainLabel: LabelItem[];
  moreOrder: OrderQuiz[];
  moreLabel: LabelItem[];
};

const partsOf = (sec: MiddleNaesinDrillSection | null) =>
  (sec?.parts ?? []).map((p) => ({ title: p.title, sentences: p.sentences }));

export function buildLessonQuiz(
  d: MiddleNaesinDrillSections,
  contents: MiddleNaesinContent[],
  seed: string,
): LessonQuizData {
  const rng = (name: string) => makeRng(`${seed}:${name}`);
  const keyGroups = contents.filter((c) => c.content_type === 'dialogue').flatMap((c) => parseKeyExpressions(c.extra_data));
  const dialogueParts = partsOf(d.dialogue);

  return {
    words: buildWordQuiz(d.vocab, rng('words')),
    phrases: buildPhraseQuiz(d.vocab, rng('phrases')),
    expressions: buildExpressionClassify(keyGroups, rng('expr')),
    qaMatch: keyGroups.length === 0 ? buildQaMatch(dialogueParts, rng('qa')) : null,
    dialogueOrder: buildOrderQuizzes(dialogueParts, rng('dorder')),
    mainOrder: buildOrderQuizzes(partsOf(d.mainText), rng('morder')),
    mainLabel: d.mainText ? buildGrammarLabelQuiz(d.mainText.sentences, rng('mlabel')) : [],
    moreOrder: buildOrderQuizzes(partsOf(d.moreReading), rng('rorder')),
    moreLabel: d.moreReading ? buildGrammarLabelQuiz(d.moreReading.sentences, rng('rlabel'), 6) : [],
  };
}
