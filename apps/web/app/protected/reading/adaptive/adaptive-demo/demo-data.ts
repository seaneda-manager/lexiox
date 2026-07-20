// apps/web/app/(protected)/reading/adaptive/adaptive-demo/demo-data.ts
import type {
  RReadingTest2026,
  RReadingModule,
  RCompleteWordsItem,
  RDailyLifeItem,
  RAcademicPassageItem,
} from "@/models/reading";

/**
 * Reading 2026 – Adaptive Placement Test (40문항)
 * Stage1: 20문항 (easy / core)
 * Stage2: 20문항 (core / hard)
 */

export const adaptiveReadingTest2026: RReadingTest2026 = {
  meta: {
    id: "updated-reading-placement-v1",
    label: "Reading 2026 – Adaptive Placement Test",
    examEra: "ibt_2026", // ✅ 실제 ExamEra union 확인해서 값만 맞추면 됨
  } as any, // ✅ 타입 우회 (나중에 ExamEra 값 확정되면 as any 지워도 됨)
  modules: [
    // =========================
    // STAGE 1 (Module 1)
    // =========================
    {
      id: "stage1",
      label: "Stage 1 – Foundation Check",
      stage: 1,
      items: [
        // ---------- Item 1: Complete Words (4 blanks) ----------
        {
          id: "s1-cw-1",
          taskKind: "complete_words",
          difficulty: "easy",
          paragraphHtml:
            "<p>Many students feel nervous on the day of an important exam. " +
            "However, a small amount of stress can actually be <strong>b___</strong> " +
            "because it helps you stay alert and focused. The key is to find a " +
            "<strong>b___</strong> between pressure and calm. Some learners make a " +
            "simple <strong>s___</strong> that includes short breaks, while others " +
            "listen to <strong>r___</strong> music before the test.</p>",
          blanks: [
            { id: "s1-cw-1-b1", correctToken: "beneficial" },
            { id: "s1-cw-1-b2", correctToken: "balance" },
            { id: "s1-cw-1-b3", correctToken: "schedule" },
            { id: "s1-cw-1-b4", correctToken: "relaxing" },
          ],
        } as RCompleteWordsItem,

        // ---------- Item 2: Complete Words (3 blanks) ----------
        {
          id: "s1-cw-2",
          taskKind: "complete_words",
          difficulty: "easy",
          paragraphHtml:
            "<p>Reading regularly can gradually <strong>i___</strong> your " +
            "vocabulary. When you see new words in context, you do not simply " +
            "memorize a <strong>l___</strong> of definitions. Instead, you learn " +
            "how each word <strong>f___</strong> into the sentence and overall idea.</p>",
          blanks: [
            { id: "s1-cw-2-b1", correctToken: "increase" },
            { id: "s1-cw-2-b2", correctToken: "list" },
            { id: "s1-cw-2-b3", correctToken: "fits" },
          ],
        } as RCompleteWordsItem,

        // ---------- Item 3: Daily Life Reading (5 Q) ----------
        {
          id: "s1-dl-1",
          taskKind: "daily_life",
          difficulty: "core",
          contentHtml:
            "<p><strong>Notice to Library Users</strong></p>" +
            "<p>From next Monday, the campus library will extend its opening hours " +
            "during the exam period. On weekdays, the library will open at 8 a.m. " +
            "and close at midnight. On Saturdays, it will open at 9 a.m. and " +
            "close at 10 p.m. On Sundays, the library will be closed.</p>" +
            "<p>Group-study rooms can be reserved online up to three days in " +
            "advance. Each group may reserve a room for a maximum of two hours " +
            "per day. Food is not allowed, but drinks with lids are permitted. " +
            "Please keep your voice low in all study areas.</p>",
          questions: [
            {
              id: "s1-dl-1-q1",
              number: 1,
              type: "detail",
              stem: "When will the library close on weekdays during the exam period?",
              choices: [
                { id: "s1-dl-1-q1-a", text: "At 8 p.m.", isCorrect: false },
                { id: "s1-dl-1-q1-b", text: "At 10 p.m.", isCorrect: false },
                { id: "s1-dl-1-q1-c", text: "At midnight.", isCorrect: true },
                { id: "s1-dl-1-q1-d", text: "At 2 a.m.", isCorrect: false },
              ],
            },
            {
              id: "s1-dl-1-q2",
              number: 2,
              type: "detail",
              stem: "What is true about Sundays?",
              choices: [
                {
                  id: "s1-dl-1-q2-a",
                  text: "The library opens later than usual.",
                  isCorrect: false,
                },
                {
                  id: "s1-dl-1-q2-b",
                  text: "Group rooms are available only on Sunday.",
                  isCorrect: false,
                },
                {
                  id: "s1-dl-1-q2-c",
                  text: "The library is not open on Sunday.",
                  isCorrect: true,
                },
                {
                  id: "s1-dl-1-q2-d",
                  text: "Only the first floor is open on Sunday.",
                  isCorrect: false,
                },
              ],
            },
            {
              id: "s1-dl-1-q3",
              number: 3,
              type: "detail",
              stem: "How far in advance can students reserve a group-study room?",
              choices: [
                { id: "s1-dl-1-q3-a", text: "One day", isCorrect: false },
                { id: "s1-dl-1-q3-b", text: "Two days", isCorrect: false },
                { id: "s1-dl-1-q3-c", text: "Three days", isCorrect: true },
                { id: "s1-dl-1-q3-d", text: "Seven days", isCorrect: false },
              ],
            },
            {
              id: "s1-dl-1-q4",
              number: 4,
              type: "negative_detail",
              stem: "According to the notice, which of the following is NOT allowed?",
              choices: [
                {
                  id: "s1-dl-1-q4-a",
                  text: "Drinks with lids",
                  isCorrect: false,
                },
                {
                  id: "s1-dl-1-q4-b",
                  text: "Speaking quietly with a friend",
                  isCorrect: false,
                },
                {
                  id: "s1-dl-1-q4-c",
                  text: "Eating snacks in the study area",
                  isCorrect: true,
                },
                {
                  id: "s1-dl-1-q4-d",
                  text: "Reserving a room online",
                  isCorrect: false,
                },
              ],
            },
            {
              id: "s1-dl-1-q5",
              number: 5,
              type: "purpose",
              stem: "What is the main purpose of this notice?",
              choices: [
                {
                  id: "s1-dl-1-q5-a",
                  text: "To explain how to apply for a library job",
                  isCorrect: false,
                },
                {
                  id: "s1-dl-1-q5-b",
                  text: "To announce changes to library hours and rules",
                  isCorrect: true,
                },
                {
                  id: "s1-dl-1-q5-c",
                  text: "To describe the history of the campus library",
                  isCorrect: false,
                },
                {
                  id: "s1-dl-1-q5-d",
                  text: "To advertise a new group-study course",
                  isCorrect: false,
                },
              ],
            },
          ],
        } as RDailyLifeItem,

        // ---------- Item 4: Daily Life Reading (4 Q) ----------
        {
          id: "s1-dl-2",
          taskKind: "daily_life",
          difficulty: "core",
          contentHtml:
            "<p><strong>Campus Bike-Sharing Program</strong></p>" +
            "<p>The student council has launched a bike-sharing program to help " +
            "students move between different parts of the campus more easily. " +
            "Bicycles can be borrowed from three main stations: the library, " +
            "the science building, and the dormitory area.</p>" +
            "<p>To borrow a bike, students must scan their ID card at the station " +
            "kiosk and agree to the safety rules. Helmets are strongly recommended. " +
            "The first thirty minutes are free, and after that, a small fee is " +
            "charged for each additional fifteen-minute period.</p>",
          questions: [
            {
              id: "s1-dl-2-q1",
              number: 6,
              type: "detail",
              stem: "Where can students borrow bicycles?",
              choices: [
                {
                  id: "s1-dl-2-q1-a",
                  text: "Only at the main gate",
                  isCorrect: false,
                },
                {
                  id: "s1-dl-2-q1-b",
                  text: "At three stations around campus",
                  isCorrect: true,
                },
                {
                  id: "s1-dl-2-q1-c",
                  text: "Only inside the dormitory",
                  isCorrect: false,
                },
                {
                  id: "s1-dl-2-q1-d",
                  text: "At the sports center only",
                  isCorrect: false,
                },
              ],
            },
            {
              id: "s1-dl-2-q2",
              number: 7,
              type: "detail",
              stem: "What must students do before borrowing a bike?",
              choices: [
                {
                  id: "s1-dl-2-q2-a",
                  text: "Pay a fee in advance",
                  isCorrect: false,
                },
                {
                  id: "s1-dl-2-q2-b",
                  text: "Scan their ID card and accept the rules",
                  isCorrect: true,
                },
                {
                  id: "s1-dl-2-q2-c",
                  text: "Show a driver’s license",
                  isCorrect: false,
                },
                {
                  id: "s1-dl-2-q2-d",
                  text: "Return a helmet",
                  isCorrect: false,
                },
              ],
            },
            {
              id: "s1-dl-2-q3",
              number: 8,
              type: "inference",
              stem: "What can be inferred about the bike-sharing program?",
              choices: [
                {
                  id: "s1-dl-2-q3-a",
                  text: "It is designed to make campus travel more convenient.",
                  isCorrect: true,
                },
                {
                  id: "s1-dl-2-q3-b",
                  text: "It is only for faculty members.",
                  isCorrect: false,
                },
                {
                  id: "s1-dl-2-q3-c",
                  text: "It will replace all campus buses.",
                  isCorrect: false,
                },
                {
                  id: "s1-dl-2-q3-d",
                  text: "It is available twenty-four hours a day.",
                  isCorrect: false,
                },
              ],
            },
            {
              id: "s1-dl-2-q4",
              number: 9,
              type: "negative_detail",
              stem: "According to the passage, which of the following is NOT mentioned?",
              choices: [
                {
                  id: "s1-dl-2-q4-a",
                  text: "How many stations provide bikes",
                  isCorrect: false,
                },
                {
                  id: "s1-dl-2-q4-b",
                  text: "How long the first free period lasts",
                  isCorrect: false,
                },
                {
                  id: "s1-dl-2-q4-c",
                  text: "Whether helmets are recommended",
                  isCorrect: false,
                },
                {
                  id: "s1-dl-2-q4-d",
                  text: "The exact price of the late fee",
                  isCorrect: true,
                },
              ],
            },
          ],
        } as RDailyLifeItem,

        // ---------- Item 5: Short Academic Passage (4 Q) ----------
        {
          id: "s1-ac-1",
          taskKind: "academic_passage",
          difficulty: "core",
          passageHtml:
            "<p><strong>The Role of Background Noise in Creativity</strong></p>" +
            "<p>Many people believe that a completely quiet environment is ideal " +
            "for concentration. However, several recent studies suggest that a " +
            "moderate level of background noise can actually improve creative " +
            "thinking. When the environment is slightly noisy, the brain receives " +
            "a small amount of extra stimulation. This makes it harder to focus " +
            "only on one simple idea and can encourage more abstract thinking.</p>" +
            "<p>Of course, very loud noise usually has the opposite effect. " +
            "It becomes difficult to process information, and performance on " +
            "complex tasks decreases. For this reason, some researchers argue " +
            "that coffee shops with gentle background sound may offer a more " +
            "productive setting than completely silent rooms for certain activities.</p>",
          questions: [
            {
              id: "s1-ac-1-q1",
              number: 10,
              type: "detail",
              stem: "According to the passage, what can moderate background noise do?",
              choices: [
                {
                  id: "s1-ac-1-q1-a",
                  text: "Prevent people from forming abstract ideas",
                  isCorrect: false,
                },
                {
                  id: "s1-ac-1-q1-b",
                  text: "Encourage more creative thinking",
                  isCorrect: true,
                },
                {
                  id: "s1-ac-1-q1-c",
                  text: "Destroy people’s ability to concentrate",
                  isCorrect: false,
                },
                {
                  id: "s1-ac-1-q1-d",
                  text: "Increase performance on any task",
                  isCorrect: false,
                },
              ],
            },
            {
              id: "s1-ac-1-q2",
              number: 11,
              type: "negative_detail",
              stem: "Which of the following is NOT mentioned as an effect of very loud noise?",
              choices: [
                {
                  id: "s1-ac-1-q2-a",
                  text: "It makes it hard to process information.",
                  isCorrect: false,
                },
                {
                  id: "s1-ac-1-q2-b",
                  text: "It can reduce performance on complex tasks.",
                  isCorrect: false,
                },
                {
                  id: "s1-ac-1-q2-c",
                  text: "It improves concentration on simple tasks.",
                  isCorrect: true,
                },
                {
                  id: "s1-ac-1-q2-d",
                  text: "It may have the opposite effect of moderate noise.",
                  isCorrect: false,
                },
              ],
            },
            {
              id: "s1-ac-1-q3",
              number: 12,
              type: "inference",
              stem: "What can be inferred about coffee shops from the passage?",
              choices: [
                {
                  id: "s1-ac-1-q3-a",
                  text: "They may be useful places for creative work.",
                  isCorrect: true,
                },
                {
                  id: "s1-ac-1-q3-b",
                  text: "They are always better than silent rooms.",
                  isCorrect: false,
                },
                {
                  id: "s1-ac-1-q3-c",
                  text: "They reduce people’s motivation to study.",
                  isCorrect: false,
                },
                {
                  id: "s1-ac-1-q3-d",
                  text: "They eliminate all distractions.",
                  isCorrect: false,
                },
              ],
            },
            {
              id: "s1-ac-1-q4",
              number: 13,
              type: "purpose",
              stem: "What is the main purpose of the passage?",
              choices: [
                {
                  id: "s1-ac-1-q4-a",
                  text: "To argue that total silence is best for learning",
                  isCorrect: false,
                },
                {
                  id: "s1-ac-1-q4-b",
                  text: "To show that moderate noise can support creativity",
                  isCorrect: true,
                },
                {
                  id: "s1-ac-1-q4-c",
                  text: "To compare different kinds of coffee shops",
                  isCorrect: false,
                },
                {
                  id: "s1-ac-1-q4-d",
                  text: "To explain how to remove noise from study spaces",
                  isCorrect: false,
                },
              ],
            },
          ],
        } as RAcademicPassageItem,
      ],
    } as RReadingModule,

    // =========================
    // STAGE 2 (Module 2)
    // =========================
    {
      id: "stage2",
      label: "Stage 2 – Academic Challenge",
      stage: 2,
      items: [
        // ---------- Item 6: Academic Passage (8 Q) ----------
        {
          id: "s2-ac-1",
          taskKind: "academic_passage",
          difficulty: "core",
          passageHtml:
            "<p><strong>Urban Heat Islands</strong></p>" +
            "<p>In many large cities, temperatures are noticeably higher than in " +
            "the surrounding countryside. This phenomenon is known as the urban " +
            "heat island effect. It occurs for several reasons. First, concrete " +
            "and asphalt surfaces absorb more solar energy than fields or forests. " +
            "These materials also release the stored heat slowly at night, keeping " +
            "urban temperatures elevated.</p>" +
            "<p>Second, tall buildings can block wind that would normally carry " +
            "heat away, allowing warm air to accumulate between structures. In " +
            "addition, human activities—such as driving cars and operating air " +
            "conditioners—release heat directly into the environment.</p>" +
            "<p>Researchers have suggested various solutions, including planting " +
            "more trees, using reflective materials on rooftops, and designing " +
            "cities with more open spaces for air to circulate. These strategies " +
            "can reduce the negative impact of heat islands on human health and " +
            "energy consumption.</p>",
          questions: [
            {
              id: "s2-ac-1-q1",
              number: 14,
              type: "detail",
              stem: "What is one reason urban areas become heat islands?",
              choices: [
                {
                  id: "s2-ac-1-q1-a",
                  text: "They receive more sunlight than rural areas.",
                  isCorrect: false,
                },
                {
                  id: "s2-ac-1-q1-b",
                  text: "Concrete and asphalt surfaces absorb and release heat slowly.",
                  isCorrect: true,
                },
                {
                  id: "s2-ac-1-q1-c",
                  text: "They are closer to the sea.",
                  isCorrect: false,
                },
                {
                  id: "s2-ac-1-q1-d",
                  text: "They are usually built in valleys.",
                  isCorrect: false,
                },
              ],
            },
            {
              id: "s2-ac-1-q2",
              number: 15,
              type: "detail",
              stem: "How do tall buildings contribute to the heat island effect?",
              choices: [
                {
                  id: "s2-ac-1-q2-a",
                  text: "By blocking wind that could carry away heat",
                  isCorrect: true,
                },
                {
                  id: "s2-ac-1-q2-b",
                  text: "By reflecting all sunlight back into space",
                  isCorrect: false,
                },
                {
                  id: "s2-ac-1-q2-c",
                  text: "By producing cool air at night",
                  isCorrect: false,
                },
                {
                  id: "s2-ac-1-q2-d",
                  text: "By increasing the number of trees",
                  isCorrect: false,
                },
              ],
            },
            {
              id: "s2-ac-1-q3",
              number: 16,
              type: "negative_detail",
              stem: "Which of the following is NOT mentioned as a human activity that releases heat?",
              choices: [
                {
                  id: "s2-ac-1-q3-a",
                  text: "Driving cars",
                  isCorrect: false,
                },
                {
                  id: "s2-ac-1-q3-b",
                  text: "Operating air conditioners",
                  isCorrect: false,
                },
                {
                  id: "s2-ac-1-q3-c",
                  text: "Running factories",
                  isCorrect: true,
                },
                {
                  id: "s2-ac-1-q3-d",
                  text: "Using energy in cities",
                  isCorrect: false,
                },
              ],
            },
            {
              id: "s2-ac-1-q4",
              number: 17,
              type: "vocab",
              stem: "The word “elevated” in paragraph 1 is closest in meaning to:",
              choices: [
                {
                  id: "s2-ac-1-q4-a",
                  text: "unusual",
                  isCorrect: false,
                },
                {
                  id: "s2-ac-1-q4-b",
                  text: "higher",
                  isCorrect: true,
                },
                {
                  id: "s2-ac-1-q4-c",
                  text: "safer",
                  isCorrect: false,
                },
                {
                  id: "s2-ac-1-q4-d",
                  text: "dangerous",
                  isCorrect: false,
                },
              ],
            },
            {
              id: "s2-ac-1-q5",
              number: 18,
              type: "purpose",
              stem: "Why does the author mention planting trees and using reflective materials?",
              choices: [
                {
                  id: "s2-ac-1-q5-a",
                  text: "To show how cities can become more colorful",
                  isCorrect: false,
                },
                {
                  id: "s2-ac-1-q5-b",
                  text: "To provide solutions for reducing heat islands",
                  isCorrect: true,
                },
                {
                  id: "s2-ac-1-q5-c",
                  text: "To compare natural and artificial materials",
                  isCorrect: false,
                },
                {
                  id: "s2-ac-1-q5-d",
                  text: "To explain why cities use so much energy",
                  isCorrect: false,
                },
              ],
            },
            {
              id: "s2-ac-1-q6",
              number: 19,
              type: "inference",
              stem: "What can be inferred about urban heat islands?",
              choices: [
                {
                  id: "s2-ac-1-q6-a",
                  text: "They cannot be reduced once they appear.",
                  isCorrect: false,
                },
                {
                  id: "s2-ac-1-q6-b",
                  text: "They are influenced by both natural and human factors.",
                  isCorrect: true,
                },
                {
                  id: "s2-ac-1-q6-c",
                  text: "They only occur in tropical regions.",
                  isCorrect: false,
                },
                {
                  id: "s2-ac-1-q6-d",
                  text: "They are more serious in small towns.",
                  isCorrect: false,
                },
              ],
            },
            {
              id: "s2-ac-1-q7",
              number: 20,
              type: "organization",
              stem: "How is the passage organized?",
              choices: [
                {
                  id: "s2-ac-1-q7-a",
                  text: "By describing problems and then suggesting solutions",
                  isCorrect: true,
                },
                {
                  id: "s2-ac-1-q7-b",
                  text: "By comparing two different cities",
                  isCorrect: false,
                },
                {
                  id: "s2-ac-1-q7-c",
                  text: "By listing historical events in order",
                  isCorrect: false,
                },
                {
                  id: "s2-ac-1-q7-d",
                  text: "By explaining a process step by step",
                  isCorrect: false,
                },
              ],
            },
            {
              id: "s2-ac-1-q8",
              number: 21,
              type: "summary",
              stem: "Which sentence best expresses the essential information in the passage?",
              choices: [
                {
                  id: "s2-ac-1-q8-a",
                  text: "Urban heat islands are caused only by tall buildings and cannot be reduced.",
                  isCorrect: false,
                },
                {
                  id: "s2-ac-1-q8-b",
                  text: "Urban heat islands result from city materials and human activities, but design changes can reduce their impact.",
                  isCorrect: true,
                },
                {
                  id: "s2-ac-1-q8-c",
                  text: "Rural areas are always cooler than cities and do not need any environmental planning.",
                  isCorrect: false,
                },
                {
                  id: "s2-ac-1-q8-d",
                  text: "Urban heat islands occur when cities plant too many trees in a small area.",
                  isCorrect: false,
                },
              ],
            },
          ],
        } as RAcademicPassageItem,

        // ---------- Item 7: Academic Passage (6 Q) ----------
        {
          id: "s2-ac-2",
          taskKind: "academic_passage",
          difficulty: "hard",
          passageHtml:
            "<p><strong>Social Learning in Animals</strong></p>" +
            "<p>Social learning occurs when individuals acquire new behavior by " +
            "observing others. This type of learning is not limited to humans. " +
            "For example, young chimpanzees watch older group members use tools " +
            "to obtain food and then imitate those actions.</p>" +
            "<p>Biologists distinguish between simple imitation and more complex " +
            "forms of cultural transmission. In cultural transmission, behaviors " +
            "are passed down over many generations, producing traditions that " +
            "are unique to particular groups. Some bird populations, for instance, " +
            "develop characteristic songs that are maintained through learning " +
            "rather than genetics.</p>",
          questions: [
            {
              id: "s2-ac-2-q1",
              number: 22,
              type: "detail",
              stem: "According to the passage, what is one example of social learning?",
              choices: [
                {
                  id: "s2-ac-2-q1-a",
                  text: "Chimps discovering tools by accident",
                  isCorrect: false,
                },
                {
                  id: "s2-ac-2-q1-b",
                  text: "Young chimpanzees imitating tool use by older members",
                  isCorrect: true,
                },
                {
                  id: "s2-ac-2-q1-c",
                  text: "Birds inheriting songs through their genes",
                  isCorrect: false,
                },
                {
                  id: "s2-ac-2-q1-d",
                  text: "Humans teaching animals directly",
                  isCorrect: false,
                },
              ],
            },
            {
              id: "s2-ac-2-q2",
              number: 23,
              type: "vocab",
              stem: "The word “acquire” in paragraph 1 is closest in meaning to:",
              choices: [
                {
                  id: "s2-ac-2-q2-a",
                  text: "avoid",
                  isCorrect: false,
                },
                {
                  id: "s2-ac-2-q2-b",
                  text: "obtain",
                  isCorrect: true,
                },
                {
                  id: "s2-ac-2-q2-c",
                  text: "destroy",
                  isCorrect: false,
                },
                {
                  id: "s2-ac-2-q2-d",
                  text: "remember",
                  isCorrect: false,
                },
              ],
            },
            {
              id: "s2-ac-2-q3",
              number: 24,
              type: "paraphrasing",
              stem: "Which sentence best expresses the essential information about cultural transmission?",
              choices: [
                {
                  id: "s2-ac-2-q3-a",
                  text: "It involves random changes in animal behavior.",
                  isCorrect: false,
                },
                {
                  id: "s2-ac-2-q3-b",
                  text: "It refers to behaviors that spread genetically between species.",
                  isCorrect: false,
                },
                {
                  id: "s2-ac-2-q3-c",
                  text: "It is the passing down of learned behaviors across generations.",
                  isCorrect: true,
                },
                {
                  id: "s2-ac-2-q3-d",
                  text: "It describes how animals forget behaviors that are not useful.",
                  isCorrect: false,
                },
              ],
            },
            {
              id: "s2-ac-2-q4",
              number: 25,
              type: "inference",
              stem: "What can be inferred about bird songs mentioned in the passage?",
              choices: [
                {
                  id: "s2-ac-2-q4-a",
                  text: "They are entirely determined by DNA.",
                  isCorrect: false,
                },
                {
                  id: "s2-ac-2-q4-b",
                  text: "They may represent cultural traditions within a bird group.",
                  isCorrect: true,
                },
                {
                  id: "s2-ac-2-q4-c",
                  text: "They never change over time.",
                  isCorrect: false,
                },
                {
                  id: "s2-ac-2-q4-d",
                  text: "They are produced only by young birds.",
                  isCorrect: false,
                },
              ],
            },
            {
              id: "s2-ac-2-q5",
              number: 26,
              type: "purpose",
              stem: "Why does the author mention chimpanzees and birds?",
              choices: [
                {
                  id: "s2-ac-2-q5-a",
                  text: "To show that social learning occurs in several animal species",
                  isCorrect: true,
                },
                {
                  id: "s2-ac-2-q5-b",
                  text: "To compare human and animal intelligence",
                  isCorrect: false,
                },
                {
                  id: "s2-ac-2-q5-c",
                  text: "To argue that animals cannot form traditions",
                  isCorrect: false,
                },
                {
                  id: "s2-ac-2-q5-d",
                  text: "To explain why animals avoid learning from each other",
                  isCorrect: false,
                },
              ],
            },
            {
              id: "s2-ac-2-q6",
              number: 27,
              type: "organization",
              stem: "How is the passage mainly organized?",
              choices: [
                {
                  id: "s2-ac-2-q6-a",
                  text: "By introducing a concept and then giving examples",
                  isCorrect: true,
                },
                {
                  id: "s2-ac-2-q6-b",
                  text: "By describing an experiment step by step",
                  isCorrect: false,
                },
                {
                  id: "s2-ac-2-q6-c",
                  text: "By listing problems and their solutions",
                  isCorrect: false,
                },
                {
                  id: "s2-ac-2-q6-d",
                  text: "By comparing different research methods",
                  isCorrect: false,
                },
              ],
            },
          ],
        } as RAcademicPassageItem,

        // ---------- Item 8: Daily Life (4 Q) ----------
        {
          id: "s2-dl-1",
          taskKind: "daily_life",
          difficulty: "core",
          contentHtml:
            "<p><strong>Professor’s Email to Students</strong></p>" +
            "<p>Dear all,</p>" +
            "<p>Several of you have asked about the reading assignment for next " +
            "week. Please note that we will discuss Chapters 4 and 5 instead of " +
            "Chapter 6. I have uploaded a short article to the course website " +
            "that provides additional background. Make sure to read it before " +
            "our next class.</p>" +
            "<p>Also, the quiz originally scheduled for Monday has been moved " +
            "to Wednesday to give everyone more time to prepare. If you have " +
            "any questions, feel free to contact me.</p>" +
            "<p>Best,</p><p>Professor Kim</p>",
          questions: [
            {
              id: "s2-dl-1-q1",
              number: 28,
              type: "detail",
              stem: "Which chapters will be discussed next week?",
              choices: [
                {
                  id: "s2-dl-1-q1-a",
                  text: "Chapters 3 and 4",
                  isCorrect: false,
                },
                {
                  id: "s2-dl-1-q1-b",
                  text: "Chapters 4 and 5",
                  isCorrect: true,
                },
                {
                  id: "s2-dl-1-q1-c",
                  text: "Chapter 6 only",
                  isCorrect: false,
                },
                {
                  id: "s2-dl-1-q1-d",
                  text: "Chapters 5 and 6",
                  isCorrect: false,
                },
              ],
            },
            {
              id: "s2-dl-1-q2",
              number: 29,
              type: "detail",
              stem: "What has been uploaded to the course website?",
              choices: [
                {
                  id: "s2-dl-1-q2-a",
                  text: "A recording of the last lecture",
                  isCorrect: false,
                },
                {
                  id: "s2-dl-1-q2-b",
                  text: "A short article that offers background information",
                  isCorrect: true,
                },
                {
                  id: "s2-dl-1-q2-c",
                  text: "The answers to the next quiz",
                  isCorrect: false,
                },
                {
                  id: "s2-dl-1-q2-d",
                  text: "A video about study skills",
                  isCorrect: false,
                },
              ],
            },
            {
              id: "s2-dl-1-q3",
              number: 30,
              type: "detail",
              stem: "When will the quiz take place?",
              choices: [
                {
                  id: "s2-dl-1-q3-a",
                  text: "On Monday",
                  isCorrect: false,
                },
                {
                  id: "s2-dl-1-q3-b",
                  text: "On Tuesday",
                  isCorrect: false,
                },
                {
                  id: "s2-dl-1-q3-c",
                  text: "On Wednesday",
                  isCorrect: true,
                },
                {
                  id: "s2-dl-1-q3-d",
                  text: "On Friday",
                  isCorrect: false,
                },
              ],
            },
            {
              id: "s2-dl-1-q4",
              number: 31,
              type: "inference",
              stem: "Why was the quiz moved to Wednesday?",
              choices: [
                {
                  id: "s2-dl-1-q4-a",
                  text: "Because the professor will be absent on Monday",
                  isCorrect: false,
                },
                {
                  id: "s2-dl-1-q4-b",
                  text: "To give students extra time to study",
                  isCorrect: true,
                },
                {
                  id: "s2-dl-1-q4-c",
                  text: "To match the schedule of another course",
                  isCorrect: false,
                },
                {
                  id: "s2-dl-1-q4-d",
                  text: "Because the reading assignment was cancelled",
                  isCorrect: false,
                },
              ],
            },
          ],
        } as RDailyLifeItem,

        // ---------- Item 9: Complete Words (2 blanks, hard 단어) ----------
        {
          id: "s2-cw-1",
          taskKind: "complete_words",
          difficulty: "hard",
          paragraphHtml:
            "<p>Some researchers argue that standardized tests provide only a " +
            "<strong>n___</strong> view of a student’s ability. These exams " +
            "often fail to capture creativity, <strong>c___</strong> thinking, " +
            "and collaboration skills, which are essential for success in " +
            "modern societies.</p>",
          blanks: [
            { id: "s2-cw-1-b1", correctToken: "narrow" },
            { id: "s2-cw-1-b2", correctToken: "critical" },
          ],
        } as RCompleteWordsItem,
      ],
    } as RReadingModule,
  ],
};

export default adaptiveReadingTest2026;
