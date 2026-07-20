// apps/web/lib/naesin/drillConfig.ts

export type DrillStageId =
  | 'word_analysis'
  | 'structure_analysis'
  | 'translation'
  | 'composition'
  | 'sentence_function'
  | 'sentence_order'
  | 'grammar_blank'
  | 'read_aloud';

export type DrillStage = {
  id: DrillStageId;
  label: string;
  description?: string;
  required: boolean;
  order: number;
};

export const DRILL_STAGE_CONFIG: DrillStage[] = [
  {
    id: 'word_analysis',
    label: '단어 분석',
    required: true,
    order: 1,
  },
  {
    id: 'structure_analysis',
    label: '구조 분석',
    required: true,
    order: 2,
  },
  {
    id: 'translation',
    label: '해석',
    required: true,
    order: 3,
  },
  {
    id: 'composition',
    label: '작문',
    required: true,
    order: 4,
  },
  {
    id: 'sentence_function',
    label: '문장 기능',
    required: true,
    order: 5,
  },
  {
    id: 'sentence_order',
    label: '문장 순서',
    required: true,
    order: 6,
  },
  {
    id: 'grammar_blank',
    label: '문법 빈칸',
    required: true,
    order: 7,
  },
  {
    id: 'read_aloud',
    label: '소리 내어 읽기',
    required: false,
    order: 8,
  },
];

// 👉 순서 보장
export const DRILL_STAGE_ORDER = DRILL_STAGE_CONFIG.sort(
  (a, b) => a.order - b.order
);

// 👉 빠른 접근용 map
export const DRILL_STAGE_MAP = Object.fromEntries(
  DRILL_STAGE_CONFIG.map((s) => [s.id, s])
) as Record<DrillStageId, DrillStage>;
