-- TOEFL 챕터 시드 데이터
-- Reading, Listening, Speaking, Writing 기본 챕터 구성

-- ── Reading ────────────────────────────────────────────────────
insert into toefl_chapters (skill, order_num, title, focus_type, description) values
  ('reading', 1,  'Main Idea',           'main_idea',         '지문 전체의 주제와 목적을 파악하는 유형'),
  ('reading', 2,  'Detail / Fact',       'detail',            '지문에 명시된 사실을 정확히 찾는 유형'),
  ('reading', 3,  'Negative Fact',       'negative_detail',   'NOT / EXCEPT — 언급되지 않은 내용 고르기'),
  ('reading', 4,  'Vocabulary',          'vocab',             '문맥 속 단어/표현의 의미 파악'),
  ('reading', 5,  'Inference',           'inference',         '명시되지 않은 내용을 추론하는 유형'),
  ('reading', 6,  'Rhetorical Purpose',  'rhetorical_purpose','특정 문단/문장의 수사적 기능 파악'),
  ('reading', 7,  'Sentence Insertion',  'insertion',         '주어진 문장이 들어갈 위치 찾기'),
  ('reading', 8,  'Paraphrasing',        'paraphrasing',      '지문 속 문장과 같은 의미의 선택지 고르기'),
  ('reading', 9,  'Summary',             'summary',           '지문 요약 / Prose Table 완성');

-- ── Listening ──────────────────────────────────────────────────
insert into toefl_chapters (skill, order_num, title, focus_type, description) values
  ('listening', 1,  'Main Idea',          'main_idea',          '강의/대화의 전체 주제 파악'),
  ('listening', 2,  'Detail',             'detail',             '구체적 사실 정보 파악'),
  ('listening', 3,  'Function',           'function',           '화자가 특정 발언을 한 이유/기능'),
  ('listening', 4,  'Attitude',           'attitude',           '화자의 태도·감정·확신도 파악'),
  ('listening', 5,  'Inference',          'inference',          '명시되지 않은 내용 추론'),
  ('listening', 6,  'Organization',       'organization',       '강의 구조·전개 방식 파악'),
  ('listening', 7,  'Connecting Content', 'connecting_content', '정보 연결 / 분류 / 순서 맞추기');

-- ── Speaking ───────────────────────────────────────────────────
insert into toefl_chapters (skill, order_num, title, focus_type, description) values
  ('speaking', 1,  'Independent (Q1)',           'independent',            '개인 경험·의견을 45초 안에 말하기'),
  ('speaking', 2,  'Integrated: Read+Listen (Q2)', 'integrated_read_listen', '읽기+듣기 후 60초 요약 말하기'),
  ('speaking', 3,  'Integrated: Listen (Q3)',    'integrated_listen',      '강의 듣고 60초 요약 말하기'),
  ('speaking', 4,  'Integrated: Listen (Q4)',    'integrated_listen',      '학술 강의 듣고 60초 요약 말하기');

-- ── Writing ────────────────────────────────────────────────────
insert into toefl_chapters (skill, order_num, title, focus_type, description) values
  ('writing', 1,  'Integrated Writing',      'integrated',          '읽기+듣기 내용 통합 작문 (150-225 words)'),
  ('writing', 2,  'Academic Discussion',     'academic_discussion', '온라인 토론 참여 작문 (100+ words)'),
  ('writing', 3,  'Argument & Evidence',     'independent',         '주장과 근거를 논리적으로 구성하는 훈련'),
  ('writing', 4,  'Cohesion & Transitions',  'independent',         '단락 연결·전환어 활용 훈련');
