export type GrammarUnitTaxonomyRow = {
  id: string;
  unit_id: string;
  point_id: string;
  grammar_category: string;
  grammar_point: string;
  structure_pattern: string;
  decision_point: string;
  explanation_short: string;
  explanation_full: string | null;
  example_pattern_type: string;
  authoring_mode: "auto_lite" | "manual_deep";
  selection_patterns: string[];
  example_base: string;
  example_transforms: string[];
  common_traps: string[];
  tags: string[];
  is_active: boolean;
};

export const UNIT01_FLAT_ROWS: GrammarUnitTaxonomyRow[] = [
  {
    id: "gu_sva_modifier_prep_001",
    unit_id: "unit01",
    point_id: "unit01_point01",
    grammar_category: "수일치",
    grammar_point: "주어 뒤 전명구 수식어와 주어 구별",
    structure_pattern: "주어 + (전치사 + 명사) + 동사",
    decision_point: "전명구 안 명사를 버리고 진짜 주어를 찾는다",
    explanation_short: "주어 뒤 전명구는 수식어구이므로 그 안의 명사와 동사를 일치시키지 않는다.",
    explanation_full: "전치사구는 주어를 꾸미는 정보일 뿐이다. 동사는 전치사 뒤 명사가 아니라 문장의 핵심 주어와 수일치해야 한다.",
    example_pattern_type: "two_choice",
    authoring_mode: "auto_lite",
    selection_patterns: ["is/are", "has/have", "was/were", "does/do"],
    example_base: "The cost of living in urban areas is comparatively high.",
    example_transforms: ["주어에 밑줄 긋기", "동사 선택형", "밑줄 O/X"],
    common_traps: ["전치사 뒤 복수명사를 주어로 착각", "가까운 명사에 끌려 복수동사를 선택"],
    tags: ["수일치", "전명구", "주어 찾기", "가까운 명사 함정"],
    is_active: true,
  },
  {
    id: "gu_sva_modifier_ving_tov_002",
    unit_id: "unit01",
    point_id: "unit01_point01",
    grammar_category: "수일치",
    grammar_point: "주어 뒤 v-ing / to-v 수식어구와 주어 구별",
    structure_pattern: "주어 + (v-ing ~ / to-v ~) + 동사",
    decision_point: "준동사구 전체를 수식어로 보고 주어만 남긴다",
    explanation_short: "주어 뒤의 현재분사구나 to부정사구는 주어를 수식할 뿐, 동사의 수를 결정하지 않는다.",
    explanation_full: "showing, crashing, to show 같은 준동사구는 명사를 뒤에서 꾸미는 형용사 역할이다. 준동사구 내부의 명사나 동사를 주어로 보면 안 된다.",
    example_pattern_type: "two_choice",
    authoring_mode: "auto_lite",
    selection_patterns: ["is/are", "make/makes", "was/were"],
    example_base: "The museum showing many priceless paintings is a major tourist attraction.",
    example_transforms: ["선택형", "주어 찾기", "밑줄 오류 수정"],
    common_traps: ["showing/crashing을 문장 동사로 착각", "준동사구 안의 복수명사에 끌림"],
    tags: ["수일치", "현재분사구", "to부정사구", "주어 찾기"],
    is_active: true,
  },
  {
    id: "gu_sva_relsubj_basic_001",
    unit_id: "unit01",
    point_id: "unit01_point02",
    grammar_category: "수일치",
    grammar_point: "주격 관계대명사절의 동사 수일치",
    structure_pattern: "선행사 + 관계대명사 + 동사",
    decision_point: "관계대명사가 주어인 절에서는 동사를 선행사와 수일치시킨다",
    explanation_short: "주격 관계대명사절의 동사는 관계대명사의 선행사와 수일치한다.",
    explanation_full: "who, which, that이 관계사절 안에서 주어 역할을 할 때, 그 뒤 동사는 관계대명사 자체가 아니라 앞의 선행사를 기준으로 단수/복수를 정한다.",
    example_pattern_type: "two_choice",
    authoring_mode: "auto_lite",
    selection_patterns: ["is/are", "lives/live", "becomes/become"],
    example_base: "We usually get along best with people who are like us.",
    example_transforms: ["선행사에 밑줄 긋기", "동사 선택형", "밑줄 O/X"],
    common_traps: ["관계대명사 바로 뒤 동사를 독립적으로 판단", "뒤쪽 명사나 보어에 끌려 수일치 판단"],
    tags: ["수일치", "관계대명사", "선행사", "주격 관계대명사절"],
    is_active: true,
  }
];
