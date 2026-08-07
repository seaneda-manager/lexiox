"use client";

// MockTestPlayer 전체 플로우(안내 → Complete the Words → Module 1 → Stage Break → Module 2 → Review → Result)
// 검증용 데모 (DB 불필요, 로그인 불필요 — app/protected/layout.tsx의 인증 체크가 비활성화되어 있음).
import MockTestPlayer from "@/components/reading/MockTestPlayer";
import type { RReadingTest2026 } from "@/models/reading";

const sampleTest = {
  meta: { id: "dev-reading-full-sample", label: "Reading Full Flow Sample", examEra: "ibt_2026" },
  modules: [
    {
      id: "mod-1",
      stage: 1,
      items: [
        {
          id: "cw-1",
          taskKind: "complete_words",
          stage: 1,
          paragraphHtml:
            "We know from drawings that have been preserved in caves for over 10,000 ye__ that early hum__ performed dances as a group activity.",
          blanks: [
            { id: "b1", order: 1, correctToken: "ars" },
            { id: "b2", order: 2, correctToken: "ans" },
          ],
        },
        {
          id: "dl-1",
          taskKind: "daily_life",
          stage: 1,
          contextType: "email",
          contentHtml:
            "<p>Subject: You're Invited - Grand Opening<br/>To: Ms. Nguyen<br/>From: John Parker</p><p>Dear Ms. Nguyen,</p><p>We're excited to invite you to the grand opening of our new branch at 25 Orchid Street, happening next Monday. This event is a great opportunity to explore our state-of-the-art facility.</p><p>Bring your friends and family! We're offering a special one-day-only discount on memberships for all attendees.</p><p>Warm regards,<br/>John Parker</p>",
          questions: [
            {
              id: "q1",
              number: 1,
              stem: "What is the main purpose of the email?",
              type: "detail",
              choices: [
                { id: "a", text: "To attract customers to a new fitness center", isCorrect: true },
                { id: "b", text: "To provide personal training", isCorrect: false },
                { id: "c", text: "To celebrate an achievement", isCorrect: false },
                { id: "d", text: "To announce a discount", isCorrect: false },
              ],
            },
          ],
        },
        {
          id: "dl-2",
          taskKind: "daily_life",
          stage: 1,
          contextType: "notice",
          contentHtml:
            "<p>Municipal Charter</p><p>Sign up for paperless billing statements today. Safe, convenient, easy. Enroll in paperless billing to receive monthly savings account statements in an electronic PDF document. Access your Municipal Charter account through the mobile app and select account preferences in the upper right-hand corner to enroll.</p>",
          questions: [
            {
              id: "q1b",
              number: 2,
              stem: "How can customers enroll in paperless billing?",
              type: "detail",
              choices: [
                { id: "a", text: "By visiting a Municipal Charter office", isCorrect: false },
                { id: "b", text: "By accessing the Municipal Charter website", isCorrect: false },
                { id: "c", text: "By using the Municipal Charter app", isCorrect: true },
                { id: "d", text: "By calling a customer service representative", isCorrect: false },
              ],
            },
          ],
        },
        {
          id: "dl-3",
          taskKind: "daily_life",
          stage: 1,
          contextType: "social_post",
          contentHtml:
            "<p>Sofia Baker</p><p>Every Saturday, our local farmer's market is the place to be! Fresh fruits, veggies, homemade goodies, and unique crafts await you.</p><p>Don't miss the bakery stall - get there early for the best bread and pastries, including gluten-free and vegan options.</p>",
          questions: [
            {
              id: "q1c",
              number: 3,
              stem: "What is the main purpose of the post?",
              type: "detail",
              choices: [
                { id: "a", text: "To explain the benefits of organic farming", isCorrect: false },
                { id: "b", text: "To describe the variety of products available at the farmer's market", isCorrect: true },
                { id: "c", text: "To compare different farmer's markets in the area", isCorrect: false },
                { id: "d", text: "To offer advice on starting a stall", isCorrect: false },
              ],
            },
          ],
        },
        {
          id: "dl-4",
          taskKind: "daily_life",
          stage: 1,
          contextType: "text_message",
          contentHtml:
            "<p>Maria [9:02 AM] Hey! Are we still on for the study group at the library today?<br/>James [9:05 AM] Yes! I'll be there around 3pm. Did you finish the reading?<br/>Maria [9:06 AM] Almost done, just have a few pages left.<br/>James [9:07 AM] No worries, see you there!</p>",
          questions: [
            {
              id: "q1d",
              number: 4,
              stem: "What are Maria and James planning to do?",
              type: "detail",
              choices: [
                { id: "a", text: "Meet at the library to study", isCorrect: true },
                { id: "b", text: "Finish a reading assignment together", isCorrect: false },
                { id: "c", text: "Reschedule their study group", isCorrect: false },
                { id: "d", text: "Go to the library at 9am", isCorrect: false },
              ],
            },
          ],
        },
        {
          id: "dl-5",
          taskKind: "daily_life",
          stage: 1,
          contextType: "advertisement",
          contentHtml:
            "<p>Riverside Summer Camp</p><p>Join us for two unforgettable weeks of hiking, canoeing, and campfire nights on the river. Ages 10-15 welcome. Early registration ends June 1st - sign up now and save 20%!</p>",
          questions: [
            {
              id: "q1e",
              number: 5,
              stem: "What discount is offered in the advertisement?",
              type: "detail",
              choices: [
                { id: "a", text: "10% for group registration", isCorrect: false },
                { id: "b", text: "20% for early registration", isCorrect: true },
                { id: "c", text: "Free registration for returning campers", isCorrect: false },
                { id: "d", text: "50% off camp merchandise", isCorrect: false },
              ],
            },
          ],
        },
        {
          id: "ap-1",
          taskKind: "academic_passage",
          stage: 1,
          passageHtml:
            "<p>The paradox of choice, a concept popularized by psychologist Barry Schwartz, suggests that more options can lead to less satisfaction.</p><p>Research supports this notion. In an experiment, psychologist Sheena Iyengar found that shoppers were more likely to purchase jam when offered 6 varieties instead of 24.</p>",
          questions: [
            {
              id: "q2",
              number: 2,
              stem: "Which of the following best states a main idea of the passage?",
              type: "vocab",
              choices: [
                { id: "a", text: "Effective marketing strategies focus on increasing product options.", isCorrect: false },
                { id: "b", text: "Limiting consumer choices can lead to higher satisfaction.", isCorrect: true },
                { id: "c", text: "Individualism enhances consumer contentment.", isCorrect: false },
                { id: "d", text: "Modern consumer culture is driven by fewer products.", isCorrect: false },
              ],
            },
          ],
        },
      ],
    },
    {
      id: "mod-2",
      stage: 2,
      items: [
        {
          id: "ap-2",
          taskKind: "academic_passage",
          stage: 2,
          passageHtml:
            "<p>Very young children cannot recognize themselves in a mirror; they usually achieve this milestone around 18 months of age.</p>",
          questions: [
            {
              id: "q3",
              number: 3,
              stem: "What is the passage mainly about?",
              type: "vocab",
              choices: [
                { id: "a", text: "Stages of early childhood development", isCorrect: false },
                { id: "b", text: "Research on animal cognition", isCorrect: true },
                { id: "c", text: "Differences between apes, elephants, and dolphins", isCorrect: false },
                { id: "d", text: "Recent experiments on fish", isCorrect: false },
              ],
            },
          ],
        },
      ],
    },
  ],
} as unknown as RReadingTest2026;

export default function ReadingFullSamplePage() {
  return (
    <MockTestPlayer
      testId="dev-reading-full-sample"
      label="Reading Full Flow Sample"
      test={sampleTest}
      onFinish={async (payload) => console.log("onFinish", payload)}
    />
  );
}
