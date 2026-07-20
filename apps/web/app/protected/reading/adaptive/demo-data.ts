// apps/web/app/(protected)/reading/adaptive/demo-data.ts

import type { RReadingTest2026 } from "@/models/reading";

export const demoAdaptiveReadingTest: RReadingTest2026 = {
  meta: {
    id: "updated-reading-demo-1",
    label: "2026 Adaptive Reading Demo",
    examEra: "ibt_2026",
    source: "demo",
  },
  modules: [
    // -------- Stage 1 --------
    {
      id: "module-1",
      stage: 1,
      items: [
        // Item 1: Complete the Words
        {
          id: "item-cw-1",
          taskKind: "complete_words",
          stage: 1,
          difficulty: "core",
          paragraphHtml: `
            <p>
              Many students find it <strong>challeng__g</strong> to focus on their studies
              when they are constantly <strong>surrou__ed</strong> by digital devices.
              However, taking short breaks and setting clear goals can make learning
              much more <strong>effe__ive</strong>.
            </p>
          `,
          blanks: [
            {
              id: "cw-1",
              order: 1,
              correctToken: "in", // challeng__g → challenging
              distractors: ["er", "ly", "ed"],
            },
            {
              id: "cw-2",
              order: 2,
              correctToken: "nd", // surrou__ed → surrounded
              distractors: ["nt", "rn", "ss"],
            },
            {
              id: "cw-3",
              order: 3,
              correctToken: "ct", // effe__ive → effective
              distractors: ["ss", "nt", "st"],
            },
          ],
        },

        // Item 2: Read in Daily Life (공지/notice)
        {
          id: "item-dl-1",
          taskKind: "daily_life",
          stage: 1,
          difficulty: "core",
          contextType: "notice",
          contentHtml: `
            <div>
              <h2 style="margin:0 0 4px;font-size:14px;">Library Study Room Notice</h2>
              <p style="margin:0 0 4px;">
                Starting next Monday, students must <strong>reserve</strong> a study room
                through the campus app before using it.
              </p>
              <p style="margin:0 0 4px;">
                Each reservation is limited to <strong>two hours</strong>, and food is not allowed
                in the rooms. Drinks with lids are permitted.
              </p>
              <p style="margin:0;">
                If you arrive more than <strong>10 minutes late</strong>, your reservation may be
                cancelled and given to another student.
              </p>
            </div>
          `,
          questions: [
            {
              id: "dl1-q1",
              number: 1,
              type: "detail",
              stem: "What must students do before using a study room?",
              choices: [
                {
                  id: "dl1-q1-a",
                  text: "Check in at the library front desk.",
                  isCorrect: false,
                },
                {
                  id: "dl1-q1-b",
                  text: "Call the library to ask for permission.",
                  isCorrect: false,
                },
                {
                  id: "dl1-q1-c",
                  text: "Reserve a room through the campus app.",
                  isCorrect: true,
                },
                {
                  id: "dl1-q1-d",
                  text: "Send an email to the librarian.",
                  isCorrect: false,
                },
              ],
              meta: {
                explanation:
                  "The notice says students must reserve a study room through the campus app.",
                clueQuote:
                  "students must reserve a study room through the campus app before using it.",
              },
            },
            {
              id: "dl1-q2",
              number: 2,
              type: "negative_detail",
              stem: "Which of the following is NOT allowed in the study rooms?",
              choices: [
                {
                  id: "dl1-q2-a",
                  text: "Food.",
                  isCorrect: true,
                },
                {
                  id: "dl1-q2-b",
                  text: "Drinks with lids.",
                  isCorrect: false,
                },
                {
                  id: "dl1-q2-c",
                  text: "A two-hour reservation.",
                  isCorrect: false,
                },
                {
                  id: "dl1-q2-d",
                  text: "Arriving on time.",
                  isCorrect: false,
                },
              ],
              meta: {
                explanation: "The notice clearly says food is not allowed.",
                clueQuote:
                  "food is not allowed in the rooms. Drinks with lids are permitted.",
              },
            },
          ],
        },
      ],
    },

    // -------- Stage 2 --------
    {
      id: "module-2",
      stage: 2,
      items: [
        // Item 3: Academic Passage
        {
          id: "item-ap-1",
          taskKind: "academic_passage",
          stage: 2,
          difficulty: "core",
          passageHtml: `
            <h2 style="margin:0 0 8px;font-size:16px;">The Benefits of Short Naps</h2>
            <p>
              Many university students do not get enough sleep during the week.
              As a result, they often feel tired in afternoon classes.
              Recent studies suggest that taking a short nap, usually between
              10 and 20 minutes, can improve attention and memory.
            </p>
            <p>
              Unlike long naps, which may cause sleepiness and make it harder
              to fall asleep at night, short naps help the brain feel refreshed
              without greatly affecting nighttime sleep.
              Some campuses now provide quiet "nap rooms" so that students can
              rest between classes.
            </p>
          `,
          questions: [
            {
              id: "ap1-q1",
              number: 1,
              type: "summary",
              stem: "What is the main idea of the passage?",
              choices: [
                {
                  id: "ap1-q1-a",
                  text: "University students should avoid sleeping during the day.",
                  isCorrect: false,
                },
                {
                  id: "ap1-q1-b",
                  text:
                    "Short naps can help tired students improve their performance.",
                  isCorrect: true,
                },
                {
                  id: "ap1-q1-c",
                  text: "Long naps are better than short naps for memory.",
                  isCorrect: false,
                },
                {
                  id: "ap1-q1-d",
                  text: "Nap rooms are more popular than libraries on campus.",
                  isCorrect: false,
                },
              ],
              meta: {
                explanation:
                  "The passage mainly explains that short naps help improve attention and memory for tired students.",
                clueQuote:
                  "short nap, usually between 10 and 20 minutes, can improve attention and memory.",
              },
            },
            {
              id: "ap1-q2",
              number: 2,
              type: "detail",
              stem: "According to the passage, why can long naps be a problem?",
              choices: [
                {
                  id: "ap1-q2-a",
                  text: "They may make it harder to sleep at night.",
                  isCorrect: true,
                },
                {
                  id: "ap1-q2-b",
                  text:
                    "They completely stop students from feeling refreshed.",
                  isCorrect: false,
                },
                {
                  id: "ap1-q2-c",
                  text: "They always cause students to miss their classes.",
                  isCorrect: false,
                },
                {
                  id: "ap1-q2-d",
                  text: "They are not allowed on most campuses.",
                  isCorrect: false,
                },
              ],
              meta: {
                explanation:
                  "The passage says long naps may cause sleepiness and make it harder to fall asleep at night.",
                clueQuote:
                  "long naps, which may cause sleepiness and make it harder to fall asleep at night",
              },
            },
          ],
        },
      ],
    },
  ],
};
