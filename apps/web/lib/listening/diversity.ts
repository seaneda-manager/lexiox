/**
 * Listening "말-응답(choose_response)" 문항 소재 다양화.
 *
 * 저장된 TOEFL 듣기 테스트 9개를 분석했더니 Task 1 발화가 매번 같은 소재로 수렴했다
 * ("교수님이 중간고사를 옮겼다" 7회, "룸메이트가 음악을 크게 튼다" 8회, "밤샘" 7회, 학생증/셔틀/식당 폐점 등).
 * 프롬프트에 예시 소재 목록이 있고 기존 "주제"만 회피 목록에 들어가 발화 단위 중복은 안 걸러졌기 때문.
 * → 서버가 무작위로 서로 다른 상황 씨앗을 문항마다 하나씩 강제 배정하고, 최근 발화 목록을 기피시킨다.
 */
import { conversationScenarioSeeds } from "@/lib/topicPool";

export const CR_SCENARIO_SEEDS = [
  "asking a barista or cafeteria worker about a menu item or allergen",
  "returning a defective item to a store",
  "a classmate inviting you to a weekend hiking or sports trip",
  "asking a librarian how to find a journal article",
  "a neighbor complaining about a package delivered to the wrong door",
  "a coworker asking to swap shifts at a part-time job",
  "asking a lab partner what went wrong with an experiment",
  "someone asking for restaurant recommendations for a visiting parent",
  "a friend nervous about a job interview tomorrow",
  "asking a bus driver or station agent about a transfer",
  "a roommate asking to split the cost of a shared appliance",
  "a classmate asking to borrow your charger or notes",
  "someone offering to help carry boxes while moving into a dorm",
  "asking a bank teller or campus office about opening an account",
  "a friend who just got an internship offer",
  "asking a tutor to explain a concept in a different way",
  "a student club leader asking for volunteers for an event",
  "complaining politely that a seat or table is taken",
  "a friend hesitant to give a class presentation",
  "someone asking whether a gym class is suitable for beginners",
  "a doctor's office receptionist rescheduling an appointment",
  "a friend recommending a podcast, film or book",
  "a stranger asking for directions to a building on campus",
  "asking an IT desk why the Wi-Fi keeps disconnecting",
  "a friend feeling homesick after the first month abroad",
  "someone asking about the rules for using a lab or studio after hours",
  "a classmate who disagrees with your idea in a group discussion",
  "someone thanking you for a favor and offering to repay it",
  "a friend asking whether to buy or rent textbooks",
  "a visitor asking about a museum or campus tour ticket",
  "a teammate who missed practice and wants an update",
  "someone apologizing for being late to a meeting",
  "asking a landlord or dorm manager to fix a leaking tap",
  "a friend considering a study-abroad program",
  "someone asking you to proofread their essay or cover letter",
  "a coworker proposing a new way to organize a task",
  "asking about a refund or exchange policy for a ticket",
  "a friend who lost a wallet or phone and is asking for ideas",
  "a classmate asking if the reading is worth doing before the quiz",
  "someone suggesting a change of plans because of bad weather",
];

export function pickRandom<T>(arr: T[], n: number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

/** 저장된 테스트 payload들에서 choose_response 발화(transcript)를 모은다(최신순 입력 가정). */
export function collectChooseResponseUtterances(payloads: any[], max = 40): string[] {
  const out: string[] = [];
  for (const p of payloads) {
    const groups = [
      ...(p?.modules ?? []).flatMap((m: any) => m?.items ?? []),
      ...(p?.stage2Pool?.hard?.items ?? []),
      ...(p?.stage2Pool?.easy?.items ?? []),
    ];
    for (const item of groups) {
      if (item?.taskKind !== "choose_response") continue;
      for (const q of item.questions ?? []) {
        const t = String(q?.transcript ?? "").trim();
        if (t) out.push(t.length > 90 ? t.slice(0, 90) + "…" : t);
      }
    }
    if (out.length >= max) break;
  }
  return out.slice(0, max);
}

/** Task 1 소재 배정 + 기존 발화 기피 블록(프롬프트 끝에 붙인다). */
export function buildChooseResponseDiversityBlock(seedCount: number, avoidUtterances: string[]): string {
  // 직접 만든 40개 + 실제 기출 대화 상황(lib/topicPool) 합쳐서 뽑는다.
  const seeds = pickRandom([...CR_SCENARIO_SEEDS, ...conversationScenarioSeeds()], seedCount);
  return `

## TASK 1 SCENARIO ASSIGNMENT (mandatory — overrides the example scenario list above)
Write each Task 1 item about the scenario assigned to it, in this order:
${seeds.map((sd, i) => `- Item ${i + 1}: ${sd}`).join("\n")}
(If the module needs more items than listed, invent additional scenarios clearly different from every one listed.)
Vary the speaker's speech act across items (question, complaint, request, invitation, apology, good news, hesitation/worry).
Do NOT write about: professors moving midterms, roommates playing loud music, all-nighters, forgotten student IDs, shuttle delays, cafeteria closures.
${avoidUtterances.length > 0 ? `Utterances already used in earlier tests — do NOT reuse or closely paraphrase any of them:\n${avoidUtterances.map((u) => `- ${u}`).join("\n")}` : ""}
`;
}
