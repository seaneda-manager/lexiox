-- reading_tests_2026: Updated TOEFL Reading 어댑티브 시험 패킷 저장
-- payload 는 RReadingTest2026 JSON 구조 (Stage1/Stage2 모듈)

create table if not exists public.reading_tests_2026 (
  id          uuid primary key default gen_random_uuid(),
  label       text not null,
  exam_era    text not null default 'ibt_2026',
  payload     jsonb not null,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_reading_tests_2026_updated_at
  on public.reading_tests_2026 (updated_at desc);

-- updated_at 자동 갱신
create or replace function public.set_reading_tests_2026_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_reading_tests_2026_updated_at on public.reading_tests_2026;
create trigger trg_reading_tests_2026_updated_at
  before update on public.reading_tests_2026
  for each row execute function public.set_reading_tests_2026_updated_at();

-- RLS
alter table public.reading_tests_2026 enable row level security;

-- 학생: 읽기만 허용
create policy "Authenticated users can read reading tests"
  on public.reading_tests_2026 for select
  to authenticated using (true);

-- 서비스 롤(admin): 전체 허용 (server-side service key 사용)
create policy "Service role full access to reading tests"
  on public.reading_tests_2026 for all
  to service_role using (true) with check (true);

-- ── 데모 시드 데이터 ──────────────────────────────────────────
insert into public.reading_tests_2026 (id, label, exam_era, payload)
values (
  '00000000-0000-0000-0000-000000002601',
  'Updated TOEFL Reading – Demo Test 1',
  'ibt_2026',
  '{
    "meta": {
      "id": "00000000-0000-0000-0000-000000002601",
      "label": "Updated TOEFL Reading – Demo Test 1",
      "examEra": "ibt_2026"
    },
    "modules": [
      {
        "id": "stage1-mod1",
        "stage": 1,
        "items": [
          {
            "id": "s1-passage1",
            "taskKind": "academic_passage",
            "stage": 1,
            "difficulty": "core",
            "passageHtml": "<h3>The Role of Mycorrhizal Networks in Forest Ecosystems</h3><p>Beneath the forest floor lies an invisible network that connects trees across vast distances. Mycorrhizal fungi form symbiotic relationships with the roots of most terrestrial plants, including the dominant trees of temperate and boreal forests. Through these fungal threads, known as hyphae, trees exchange nutrients, water, and even chemical signals.</p><p>Ecologist Suzanne Simard demonstrated that carbon flows from mature \"mother trees\" to younger seedlings through this underground network, helping establish new growth in shaded areas where photosynthesis alone would be insufficient. The network also transmits distress signals: when one tree is attacked by insects, neighboring trees may increase their own chemical defenses in response.</p><p>However, mycorrhizal relationships are not uniformly beneficial. Some plant species, particularly invasive ones, can exploit these networks without contributing resources in return—a strategy ecologists call \"mycorrhizal cheating.\" This can reduce the overall health of the network and, by extension, the resilience of the broader forest ecosystem.</p>",
            "questions": [
              {
                "id": "s1-q1",
                "number": 1,
                "type": "detail",
                "stem": "According to paragraph 2, what did Suzanne Simard discover about carbon in forest networks?",
                "choices": [
                  { "id": "s1-q1-a", "text": "Carbon is produced exclusively by young seedlings in shaded areas.", "isCorrect": false },
                  { "id": "s1-q1-b", "text": "Carbon travels from older trees to younger seedlings through fungal networks.", "isCorrect": true },
                  { "id": "s1-q1-c", "text": "Carbon can only be transferred between trees of the same species.", "isCorrect": false },
                  { "id": "s1-q1-d", "text": "Carbon flows are blocked when one tree is under insect attack.", "isCorrect": false }
                ]
              },
              {
                "id": "s1-q2",
                "number": 2,
                "type": "vocab",
                "stem": "The word \"symbiotic\" in paragraph 1 is closest in meaning to",
                "choices": [
                  { "id": "s1-q2-a", "text": "competitive", "isCorrect": false },
                  { "id": "s1-q2-b", "text": "mutually beneficial", "isCorrect": true },
                  { "id": "s1-q2-c", "text": "parasitic", "isCorrect": false },
                  { "id": "s1-q2-d", "text": "temporary", "isCorrect": false }
                ]
              },
              {
                "id": "s1-q3",
                "number": 3,
                "type": "inference",
                "stem": "What can be inferred from paragraph 3 about invasive plant species?",
                "choices": [
                  { "id": "s1-q3-a", "text": "They actively destroy fungal hyphae to eliminate competition.", "isCorrect": false },
                  { "id": "s1-q3-b", "text": "They are more resilient than native species in all environments.", "isCorrect": false },
                  { "id": "s1-q3-c", "text": "They may reduce the overall stability of forest ecosystems over time.", "isCorrect": true },
                  { "id": "s1-q3-d", "text": "They always form stronger mycorrhizal connections than native trees.", "isCorrect": false }
                ]
              }
            ]
          }
        ]
      },
      {
        "id": "stage2-mod1",
        "stage": 2,
        "items": [
          {
            "id": "s2-passage1",
            "taskKind": "academic_passage",
            "stage": 2,
            "difficulty": "core",
            "passageHtml": "<h3>The Columbian Exchange and Its Long-Term Consequences</h3><p>When Christopher Columbus arrived in the Americas in 1492, he set in motion one of the most consequential biological events in human history. The transfer of plants, animals, and diseases between the Eastern and Western Hemispheres—known as the Columbian Exchange—permanently transformed diets, economies, and populations on both sides of the Atlantic.</p><p>Crops native to the Americas, such as the potato, tomato, maize, and cacao, eventually became staples in European, African, and Asian cuisines. The potato, in particular, fueled population growth in Northern Europe during the 18th and 19th centuries because it produced more calories per acre than most existing crops and thrived in climates unsuitable for grain cultivation.</p><p>The exchange was not without devastating consequences. European diseases—smallpox, measles, and influenza—swept through Indigenous American populations that had no prior exposure or immunity. Historians estimate that in some regions, up to 90 percent of the Indigenous population perished within a century of contact. This demographic collapse had lasting political and economic repercussions, reshaping land use and labor systems across the Americas.</p>",
            "questions": [
              {
                "id": "s2-q1",
                "number": 1,
                "type": "detail",
                "stem": "According to paragraph 2, why was the potato especially important to Northern Europe?",
                "choices": [
                  { "id": "s2-q1-a", "text": "It replaced maize as the primary export crop to the Americas.", "isCorrect": false },
                  { "id": "s2-q1-b", "text": "It grew in climates unsuitable for grain and provided high caloric yield per acre.", "isCorrect": true },
                  { "id": "s2-q1-c", "text": "It required less water than any other crop then known in Europe.", "isCorrect": false },
                  { "id": "s2-q1-d", "text": "It was the only American crop capable of surviving European winters.", "isCorrect": false }
                ]
              },
              {
                "id": "s2-q2",
                "number": 2,
                "type": "purpose",
                "stem": "Why does the author mention the demographic collapse of Indigenous populations in paragraph 3?",
                "choices": [
                  { "id": "s2-q2-a", "text": "To argue that Columbus should be held personally responsible for the spread of disease.", "isCorrect": false },
                  { "id": "s2-q2-b", "text": "To illustrate that the Columbian Exchange had destructive as well as beneficial effects.", "isCorrect": true },
                  { "id": "s2-q2-c", "text": "To show that European settlers were more resistant to disease than historians previously believed.", "isCorrect": false },
                  { "id": "s2-q2-d", "text": "To compare death rates across different continents during the 15th century.", "isCorrect": false }
                ]
              },
              {
                "id": "s2-q3",
                "number": 3,
                "type": "inference",
                "stem": "What can be inferred from the passage about the concept of the \"Columbian Exchange\"?",
                "choices": [
                  { "id": "s2-q3-a", "text": "It refers only to the trade of luxury goods between Europe and the Americas.", "isCorrect": false },
                  { "id": "s2-q3-b", "text": "Its effects were largely confined to the Atlantic world and did not reach Asia or Africa.", "isCorrect": false },
                  { "id": "s2-q3-c", "text": "It involved transfers that benefited some populations while severely harming others.", "isCorrect": true },
                  { "id": "s2-q3-d", "text": "It was a planned exchange agreed upon by leaders in both hemispheres.", "isCorrect": false }
                ]
              }
            ]
          }
        ]
      }
    ]
  }'::jsonb
)
on conflict (id) do nothing;
