/** Workout 게임 카탈로그: 같은 엔진·세계관의 모드들을 하나의 게임(그룹)으로 묶는다. */
export type GameStyle = "hang" | "fly" | "rain" | "spell" | "trial" | "race" | "drift" | "driftcockpit" | "cockpit" | "omok" | "clay" | "sprint" | "rescue" | "rescuepick" | "memory" | "tetris";
export type ThumbKey = "archery" | "rain" | "race" | "drift" | "cockpit" | "omok" | "sports" | "rescue" | "memory" | "tetris";
export type Orientation = "landscape" | "portrait" | "any";

export type GameMode = { style: GameStyle; label: string; desc: string };

export type GameGroup = {
  id: string;
  name: string; // 영문 타이틀
  subtitle: string; // 한글 이름
  tagline: string;
  thumb: ThumbKey;
  controls: string; // 조작 요약
  platforms: string[]; // 지원 기기 태그
  modes: GameMode[];
};

export const GAME_GROUPS: GameGroup[] = [
  {
    id: "archery",
    name: "WORD ARCHERY",
    subtitle: "단어 활쏘기",
    tagline: "뜻에 맞는 단어 과녁을 쏘세요",
    thumb: "archery",
    controls: "마우스/터치로 조준 · 누르고 있다가 놓으면 발사",
    platforms: ["PC", "모바일 (가로)"],
    modes: [
      { style: "hang", label: "매달린 과녁", desc: "로프에 매달려 흔들리는 과녁" },
      { style: "fly", label: "날아가는 과녁", desc: "날개 달린 과녁이 지나간다" },
    ],
  },
  {
    id: "rain",
    name: "WORD RAIN",
    subtitle: "단어 레인",
    tagline: "하늘에서 쏟아지는 단어와 철자를 격추하세요",
    thumb: "rain",
    controls: "마우스/터치로 조준 · 길게 눌러 힘 조절, 짧게 탭하면 바로 발사",
    platforms: ["PC", "모바일"],
    modes: [
      { style: "rain", label: "단어 낙하 서바이벌", desc: "정답 단어만 쏜다. 아이템 과녁도 등장" },
      { style: "spell", label: "철자 조립", desc: "떨어지는 글자를 순서대로 쏴 단어 완성" },
    ],
  },
  {
    id: "race",
    name: "WORD RACE",
    subtitle: "단어 레이스",
    tagline: "정답 단어가 있는 차선으로 달리세요",
    thumb: "race",
    controls: "← → 차선 이동 · ↑ 가속 / 폰은 ◀ ▶ GAS 버튼",
    platforms: ["PC", "모바일 (세로)"],
    modes: [
      { style: "trial", label: "타임 트라이얼", desc: "오답 +3초, 최고 기록에 도전" },
      { style: "race", label: "경쟁 모드", desc: "다른 차들이 장애물, 순위 경쟁" },
    ],
  },
  {
    id: "drift",
    name: "WORD DRIFT",
    subtitle: "단어 드리프트",
    tagline: "미끄러지며 단어 게이트를 통과하세요",
    thumb: "drift",
    controls: "← → 핸들 · ↑ 가속 · Space 드리프트 / 폰은 버튼",
    platforms: ["PC", "모바일 (가로)"],
    modes: [
      { style: "drift", label: "탑뷰", desc: "위에서 내려다보는 서킷 2바퀴" },
      { style: "driftcockpit", label: "콕핏뷰 (의사 3D)", desc: "차 안 1인칭 시점, 앞유리 너머 도로와 단어 게이트" },
    ],
  },
  {
    id: "cockpit",
    name: "COCKPIT",
    subtitle: "콕핏",
    tagline: "조종석에서 정답 함선을 격추하세요",
    thumb: "cockpit",
    controls: "방향키/WASD 이동 · Space 사격 · Shift 충격파 / 폰은 드래그 + 버튼",
    platforms: ["PC 키보드", "모바일 (세로)"],
    modes: [{ style: "cockpit", label: "격추 미션", desc: "오답 함선과 드론을 피해 정답을 격추" }],
  },
  {
    id: "omok",
    name: "WORD OMOK",
    subtitle: "단어 오목",
    tagline: "공격을 만들 때마다 철자를 모아 단어를 완성하세요",
    thumb: "omok",
    controls: "칸을 눌러 돌 놓기 · 철자 문제는 1~4 키 또는 터치",
    platforms: ["PC", "모바일 (세로)"],
    modes: [{ style: "omok", label: "AI 대전", desc: "열린 3목·막힌 4목·열린 4목마다 철자 획득, 5목은 즉시 승리, 20수까지 없으면 점수로 승부" }],
  },
  {
    id: "memory",
    name: "WORD MEMORY",
    subtitle: "단어 위치 기억",
    tagline: "카드 속 단어의 위치를 외우고 찾아내세요",
    thumb: "memory",
    controls: "카드를 눌러 선택 · 외우는 시간이 끝나면 카드가 뒤집혀요",
    platforms: ["PC", "모바일 (가로)"],
    modes: [{ style: "memory", label: "위치 기억", desc: "스테이지가 올라갈수록 카드가 늘어난다" }],
  },
  {
    id: "tetris",
    name: "WORD TETRIS",
    subtitle: "단어 테트리스",
    tagline: "줄을 지워 단어 카드를 모으고, 스테이지 끝 퀴즈로 별을 모으세요",
    thumb: "tetris",
    controls: "← → 이동 · ↑ 회전 · ↓ 빠르게 · Space 떨구기 / 폰은 하단 버튼",
    platforms: ["PC", "모바일 (세로)"],
    modes: [{ style: "tetris", label: "스테이지 모드", desc: "N줄을 지우면 모인 단어로 퀴즈. 목숨 있음, 단어 때문에 죽지 않아요" }],
  },
  {
    id: "rescue",
    name: "WORD RESCUE",
    subtitle: "레스큐 레이더스",
    tagline: "헬기로 철자 인원을 구출해 단어를 완성하세요",
    thumb: "rescue",
    controls: "방향키/WASD 이동 · 아래로 내려 착륙 · Space 기관총 · Shift/X 로켓 / 폰은 조이패드 + 버튼",
    platforms: ["PC", "모바일 (가로)"],
    modes: [
      { style: "rescue", label: "구출 작전", desc: "글자를 순서대로 태워 기지로 귀환. 대공 미사일·대공포 회피/격추" },
      { style: "rescuepick", label: "단어 구조", desc: "뜻에 맞는 단어 태그를 단 인원 한 명을 골라 구출. 잘못 태우면 ♥-1" },
    ],
  },
  {
    id: "sports",
    name: "WORD SPORTS",
    subtitle: "단어 스포츠",
    tagline: "종목마다 다른 방식으로 단어를 겨루세요",
    thumb: "sports",
    controls: "클레이: 마우스/터치로 조준 · 클릭으로 발사 / 100m: 1~4 키 또는 터치로 정답 선택",
    platforms: ["PC", "모바일 (가로)"],
    modes: [
      { style: "clay", label: "클레이 사격", desc: "날아가는 접시 중 정답 단어만 쏜다 (장전 2발)" },
      { style: "sprint", label: "100m 달리기", desc: "정답을 맞힐수록 빨라진다. 상대 선수 3명과 경쟁" },
    ],
  },
];

export const ALL_STYLES: GameStyle[] = GAME_GROUPS.flatMap((g) => g.modes.map((m) => m.style));

export function isGameStyle(s: string | null): s is GameStyle {
  return !!s && (ALL_STYLES as string[]).includes(s);
}

export function groupOfStyle(style: GameStyle): GameGroup {
  return GAME_GROUPS.find((g) => g.modes.some((m) => m.style === style)) ?? GAME_GROUPS[0];
}

export function orientationOf(style: GameStyle): Orientation {
  if (style === "hang" || style === "fly" || style === "drift" || style === "driftcockpit" || style === "clay" || style === "sprint" || style === "rescue" || style === "rescuepick" || style === "memory") return "landscape";
  if (style === "trial" || style === "race" || style === "cockpit" || style === "omok" || style === "tetris") return "portrait";
  return "any";
}

export function playHref(style: GameStyle): string {
  return `/workout/play?style=${style}`;
}
