// 학원 홍보센터 공용 상수 (클라이언트·서버 공용)

export type ChannelKind =
  | "blog"
  | "insta"
  | "facebook"
  | "youtube"
  | "gbp"
  | "kakao"
  | "sms"
  | "place"
  | "flyer"
  | "shorts";

export type Provider = "meta" | "google";

type KindInfo = {
  label: string;
  guide: string;
  /** 연결하면 승인 후 자동 업로드되는 채널 */
  provider?: Provider;
  /** 업로드에 반드시 필요한 첨부 */
  needs?: "image" | "video";
};

export const CHANNEL_KINDS: Record<ChannelKind, KindInfo> = {
  blog: {
    label: "네이버 블로그",
    guide:
      "네이버 블로그 포스팅. 학부모가 검색해서 읽는 글. 제목에 지역명+과목+학년 키워드를 넣고, 본문은 1,200~1,800자, 소제목 3~4개, 마지막에 상담 안내와 연락처.",
  },
  insta: {
    label: "인스타그램",
    provider: "meta",
    needs: "image",
    guide:
      "인스타그램 게시물 캡션. 첫 줄은 시선을 끄는 한 문장, 본문 5~8줄, 이모지는 2~4개만, 마지막에 해시태그 10~15개(지역·학년·과목 위주).",
  },
  facebook: {
    label: "페이스북 페이지",
    provider: "meta",
    guide: "페이스북 페이지 게시물. 학부모 대상, 첫 문장에 핵심, 본문 4~8줄, 해시태그 3~5개, 마지막에 상담 안내.",
  },
  youtube: {
    label: "유튜브",
    provider: "google",
    needs: "video",
    guide:
      "유튜브 영상(쇼츠 포함)의 제목과 설명. title은 60자 이내로 지역·학년·과목 키워드 포함, body는 영상 설명란(첫 2줄 요약, 타임라인 자리, 상담 안내), hashtags 3~5개.",
  },
  gbp: {
    label: "구글 비즈니스 프로필",
    provider: "google",
    guide: "구글 지도 비즈니스 프로필 소식. 1,000자 이내, 일정·대상·혜택을 짧게 정리하고 전화·방문 상담 유도. 해시태그 없음.",
  },
  kakao: {
    label: "카카오톡 채널",
    guide: "카카오톡 채널 메시지. 300자 이내, 맨 앞에 '(광고)' 표기, 버튼 문구 하나 제안, 맨 끝에 수신거부 안내 한 줄.",
  },
  sms: {
    label: "문자(학부모)",
    guide:
      "학부모 대상 문자. 맨 앞에 '(광고)'와 학원명, 본문 200자 이내 장문, 끝에 '무료수신거부 080-000-0000' 형식의 안내 자리.",
  },
  place: {
    label: "네이버 플레이스 소식",
    guide: "네이버 플레이스(지도) 소식 게시. 400자 이내, 일정·대상·혜택을 짧게 정리하고 방문·전화 상담 유도.",
  },
  flyer: {
    label: "전단·현수막",
    guide: "전단지 또는 현수막 문구. 메인 카피 1줄(15자 이내), 서브 카피 2줄, 핵심 혜택 3개 불릿, 연락처 자리.",
  },
  shorts: {
    label: "쇼츠·릴스 대본",
    guide: "30초 세로 영상 대본. [장면] 표시와 함께 5컷 이내, 첫 3초 훅, 자막 문구 포함.",
  },
};

export const CHANNEL_KIND_LIST = Object.keys(CHANNEL_KINDS) as ChannelKind[];

// 채널 색 (Tailwind 클래스, 캘린더·목록 점에 사용)
export const CHANNEL_COLORS = [
  "bg-sky-600",
  "bg-rose-500",
  "bg-amber-500",
  "bg-emerald-600",
  "bg-violet-600",
  "bg-slate-500",
] as const;

export type LeadStage = "inquiry" | "booked" | "consulted" | "enrolled" | "on_hold";

export const LEAD_STAGES: { key: LeadStage; label: string; tone: string }[] = [
  { key: "inquiry", label: "문의", tone: "bg-sky-100 text-sky-800" },
  { key: "booked", label: "상담예약", tone: "bg-amber-100 text-amber-800" },
  { key: "consulted", label: "상담완료", tone: "bg-amber-100 text-amber-800" },
  { key: "enrolled", label: "등록", tone: "bg-emerald-100 text-emerald-800" },
  { key: "on_hold", label: "보류", tone: "bg-slate-100 text-slate-600" },
];

export const stageLabel = (s: string) => LEAD_STAGES.find((x) => x.key === s)?.label ?? s;
export const stageTone = (s: string) => LEAD_STAGES.find((x) => x.key === s)?.tone ?? "bg-slate-100 text-slate-600";

export const GRADES = ["초1", "초2", "초3", "초4", "초5", "초6", "중1", "중2", "중3", "고1", "고2", "고3", "N수"];

export const LEAD_SOURCE_EXTRAS = ["지인 소개", "간판·현수막", "전단지", "재원생 형제", "기타"];

export const PURPOSES = [
  "신규 원생 모집",
  "방학 특강 모집",
  "시험 대비반 안내",
  "학부모 설명회",
  "학습 성과 공유",
  "학원 일상·수업 소개",
  "이벤트·친구추천",
  "합격·수상 소식",
];

export const TONES = ["신뢰감 있게", "친근하고 따뜻하게", "간결하고 힘있게", "학부모 공감형"];

export const TARGET_GRADES = ["초등 저학년", "초등 고학년", "예비 중1", "중등", "예비 고1", "고등", "고3·N수"];

export const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

// 학교 학사일정 기준 월별 홍보 시즌
export const SEASONS: Record<number, string> = {
  1: "겨울방학 특강 진행 중 · 신학기 선행반 모집 시작",
  2: "신학기 반편성 · 개강 이벤트 · 예비 중1/고1 집중 모집",
  3: "새학기 진단평가 · 학부모 설명회 · 첫 상담 시즌",
  4: "1학기 중간고사 내신 대비반 · 시험 일정 안내",
  5: "중간고사 결과 상담 · 가정의 달 친구추천 이벤트",
  6: "기말고사 대비 · 여름방학 특강 사전 모집",
  7: "여름방학 특강 개강 · 선행/복습 집중반",
  8: "2학기 개강 · 2학기 중간고사 선행",
  9: "2학기 중간고사 대비 · 고3 수시 원서 시즌",
  10: "중간고사 대비·결과 상담 · 겨울방학 특강 기획",
  11: "수능 응원 · 기말고사 대비 · 겨울방학 특강 사전예약",
  12: "겨울방학 특강 모집 · 한 해 학습 성과 후기",
};

export const POST_STATUS: Record<string, { label: string; tone: string }> = {
  pending: { label: "컨펌 대기", tone: "bg-violet-100 text-violet-800" },
  scheduled: { label: "예약됨", tone: "bg-slate-100 text-slate-700" },
  publishing: { label: "업로드 중", tone: "bg-sky-100 text-sky-800" },
  posted: { label: "게시 완료", tone: "bg-emerald-100 text-emerald-800" },
  failed: { label: "업로드 실패", tone: "bg-rose-100 text-rose-700" },
  skipped: { label: "건너뜀", tone: "bg-slate-100 text-slate-500" },
};

// 가맹점 1곳당 하루 AI 생성 한도 (비용 관리)
export const DAILY_AI_LIMIT = 40;
