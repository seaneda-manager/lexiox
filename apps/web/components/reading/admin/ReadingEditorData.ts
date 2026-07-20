// apps/web/components/reading/admin/ReadingEditorData.ts

// 6지선다까지 지원하는 보기 타입
export type RChoice = {
  id?: string;
  text: string;
  is_correct: boolean;
  order_no: number; // 1..6
};

// 기본 문제 타입(유형은 선택)
export type RQuestion = {
  id?: string;
  number: number; // 1..N
  type?: string; // 'detail' | 'summary' | ... (자유)
  stem: string;
  choices: RChoice[];
};

// 단일 지문 편집용 모델
export type RPassage = {
  id?: string;
  set_id?: string;
  title: string;
  content: string; // 텍스트(또는 HTML)
  questions: RQuestion[];
};

// 에디터에서 주입받을 데이터소스 계약(로드/저장)
export interface ReadingEditorDataSource {
  load(passageId: string): Promise<RPassage>;
  save(model: RPassage): Promise<{ passage_id: string }>;
}
