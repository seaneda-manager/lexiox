"use client";

import ListeningSessionContainer from "../_components/ListeningSessionContainer";
import type { LListeningTest2026Linear } from "@/models/listening";

// Dummy test data for development
const DUMMY_TEST = {
  meta: {
    id: "test_2026_sample_001",
    label: "2026 TOEFL Listening Sample Test",
  },
  hard: {
    tracks: [
      {
        id: "h-t1-choose-response",
        taskKind: "choose_response",
        title: "Task 1: Listen and Choose a Response",
        audioUrl:
          "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
        audioSeconds: 10,
        testingSeconds: 8,
        transcript:
          "Can you believe how much tuition went up this year? I was hoping it would stay the same.",
        questions: [
          {
            id: "q1",
            number: 1,
            type: "pragmatic_choice",
            stem: "What does the speaker imply about the tuition increase?",
            choices: [
              {
                id: "c1",
                text: "She is disappointed that the tuition increased more than expected.",
                isCorrect: true,
              },
              {
                id: "c2",
                text: "She is relieved that the tuition increase was smaller than last year.",
                isCorrect: false,
              },
              {
                id: "c3",
                text: "She always knew the tuition would increase dramatically every year.",
                isCorrect: false,
              },
              {
                id: "c4",
                text: "She mentioned the tuition to her friends at the registration office.",
                isCorrect: false,
              },
            ],
          },
          {
            id: "q2",
            number: 2,
            type: "pragmatic_choice",
            stem: "Why did the woman mention the tuition going up?",
            choices: [
              {
                id: "c1",
                text: "To express her concern about rising costs.",
                isCorrect: true,
              },
              {
                id: "c2",
                text: "To inform the man about next year's increase.",
                isCorrect: false,
              },
              {
                id: "c3",
                text: "To argue that all universities should lower tuition fees.",
                isCorrect: false,
              },
              {
                id: "c4",
                text: "To compare the tuition with her previous school.",
                isCorrect: false,
              },
            ],
          },
        ],
      },
      {
        id: "h-t2-conversation",
        taskKind: "conversation",
        title: "Task 2: Conversation",
        audioUrl:
          "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
        audioSeconds: 80,
        testingSeconds: 40,
        transcript:
          "Student: I'm looking for the reference section. Is it still on the third floor?\nLibrarian: Yes, it is, but we reorganized it last month.",
        questions: [
          {
            id: "q3",
            number: 1,
            type: "main_idea",
            stem: "What is the conversation mainly about?",
            choices: [
              {
                id: "c1",
                text: "The librarian explains how the library reorganized its materials.",
                isCorrect: true,
              },
              {
                id: "c2",
                text: "The student complains about the library's organization.",
                isCorrect: false,
              },
              {
                id: "c3",
                text: "The library moved to a different building.",
                isCorrect: false,
              },
              {
                id: "c4",
                text: "The student is looking for a job at the library.",
                isCorrect: false,
              },
            ],
          },
          {
            id: "q4",
            number: 2,
            type: "inference",
            stem: "What can be inferred about the library reorganization?",
            choices: [
              {
                id: "c1",
                text: "It happened recently to improve organization.",
                isCorrect: true,
              },
              {
                id: "c2",
                text: "The student has not visited the library in a long time.",
                isCorrect: false,
              },
              {
                id: "c3",
                text: "The reference section was moved to the basement.",
                isCorrect: false,
              },
              {
                id: "c4",
                text: "The library closes during reorganization.",
                isCorrect: false,
              },
            ],
          },
        ],
      },
      {
        id: "h-t3-academic-talk",
        taskKind: "academic_talk",
        title: "Task 3: Academic Talk",
        audioUrl:
          "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
        audioSeconds: 105,
        testingSeconds: 50,
        transcript:
          "Today we'll discuss marine ecosystems and their role in carbon cycles...",
        questions: [
          {
            id: "q5",
            number: 1,
            type: "main_idea",
            stem: "What is the main topic of this lecture?",
            choices: [
              {
                id: "c1",
                text: "Marine ecosystems and carbon cycles.",
                isCorrect: true,
              },
              {
                id: "c2",
                text: "Ocean pollution and conservation.",
                isCorrect: false,
              },
              {
                id: "c3",
                text: "The history of oceanography.",
                isCorrect: false,
              },
              {
                id: "c4",
                text: "How to become a marine biologist.",
                isCorrect: false,
              },
            ],
          },
          {
            id: "q6",
            number: 2,
            type: "detail",
            stem: "According to the professor, what role do phytoplankton play?",
            choices: [
              {
                id: "c1",
                text: "They produce oxygen and absorb carbon dioxide.",
                isCorrect: true,
              },
              {
                id: "c2",
                text: "They eat other marine organisms.",
                isCorrect: false,
              },
              {
                id: "c3",
                text: "They control ocean temperature.",
                isCorrect: false,
              },
              {
                id: "c4",
                text: "They prevent ocean acidification.",
                isCorrect: false,
              },
            ],
          },
          {
            id: "q7",
            number: 3,
            type: "function",
            stem: "Why does the professor mention phytoplankton?",
            choices: [
              {
                id: "c1",
                text: "To emphasize the importance of marine organisms in ecosystems.",
                isCorrect: true,
              },
              {
                id: "c2",
                text: "To explain why ocean life is endangered.",
                isCorrect: false,
              },
              {
                id: "c3",
                text: "To introduce a new research method.",
                isCorrect: false,
              },
              {
                id: "c4",
                text: "To compare different types of plants.",
                isCorrect: false,
              },
            ],
          },
          {
            id: "q8",
            number: 4,
            type: "inference",
            stem: "What can be inferred from this lecture?",
            choices: [
              {
                id: "c1",
                text: "Marine ecosystems are crucial for maintaining Earth's balance.",
                isCorrect: true,
              },
              {
                id: "c2",
                text: "Humans should stop fishing to protect marine life.",
                isCorrect: false,
              },
              {
                id: "c3",
                text: "Ocean temperatures are rising because of marine organisms.",
                isCorrect: false,
              },
              {
                id: "c4",
                text: "Phytoplankton are the most important organisms on Earth.",
                isCorrect: false,
              },
            ],
          },
        ],
      },
      {
        id: "h-t4-academic-talk",
        taskKind: "academic_talk",
        title: "Task 4: Academic Talk",
        audioUrl:
          "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
        audioSeconds: 105,
        testingSeconds: 50,
        transcript:
          "Photosynthesis is the process by which plants convert light energy into chemical energy...",
        questions: [
          {
            id: "q9",
            number: 1,
            type: "main_idea",
            stem: "What is the main focus of this lecture?",
            choices: [
              {
                id: "c1",
                text: "The process and stages of photosynthesis.",
                isCorrect: true,
              },
              {
                id: "c2",
                text: "How plants differ from animals.",
                isCorrect: false,
              },
              {
                id: "c3",
                text: "The history of agricultural development.",
                isCorrect: false,
              },
              {
                id: "c4",
                text: "Why plants need sunlight to survive.",
                isCorrect: false,
              },
            ],
          },
          {
            id: "q10",
            number: 2,
            type: "detail",
            stem: "What happens during the light-dependent reactions?",
            choices: [
              {
                id: "c1",
                text: "Water molecules are split and oxygen is released.",
                isCorrect: true,
              },
              {
                id: "c2",
                text: "Glucose is produced from carbon dioxide.",
                isCorrect: false,
              },
              {
                id: "c3",
                text: "Plants absorb nitrogen from the soil.",
                isCorrect: false,
              },
              {
                id: "c4",
                text: "Energy is released as heat.",
                isCorrect: false,
              },
            ],
          },
          {
            id: "q11",
            number: 3,
            type: "function",
            stem: "Why does the professor explain the Calvin cycle?",
            choices: [
              {
                id: "c1",
                text: "To show how the energy from light reactions is used.",
                isCorrect: true,
              },
              {
                id: "c2",
                text: "To prove that photosynthesis is more complex than respiration.",
                isCorrect: false,
              },
              {
                id: "c3",
                text: "To explain why plants grow faster in summer.",
                isCorrect: false,
              },
              {
                id: "c4",
                text: "To discuss genetic engineering in plants.",
                isCorrect: false,
              },
            ],
          },
          {
            id: "q12",
            number: 4,
            type: "inference",
            stem: "What can be inferred about photosynthetic efficiency?",
            choices: [
              {
                id: "c1",
                text: "It depends on multiple environmental factors.",
                isCorrect: true,
              },
              {
                id: "c2",
                text: "It is the same in all plants regardless of conditions.",
                isCorrect: false,
              },
              {
                id: "c3",
                text: "Plants lose energy during photosynthesis.",
                isCorrect: false,
              },
              {
                id: "c4",
                text: "Light intensity is the only factor that matters.",
                isCorrect: false,
              },
            ],
          },
        ],
      },
    ],
  },
  easy: {
    tracks: [
      {
        id: "e-t1-choose-response",
        taskKind: "choose_response",
        title: "Task 1: Listen and Choose a Response",
        audioUrl:
          "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
        audioSeconds: 10,
        testingSeconds: 8,
        transcript: "Would you like to grab coffee after class?",
        questions: [
          {
            id: "eq1",
            number: 1,
            type: "pragmatic_choice",
            stem: "What does the speaker ask?",
            choices: [
              {
                id: "c1",
                text: "If the person wants to have coffee.",
                isCorrect: true,
              },
              {
                id: "c2",
                text: "What time the class ends.",
                isCorrect: false,
              },
              {
                id: "c3",
                text: "If the person likes coffee.",
                isCorrect: false,
              },
              {
                id: "c4",
                text: "Where to buy coffee.",
                isCorrect: false,
              },
            ],
          },
        ],
      },
      {
        id: "e-t2-conversation",
        taskKind: "conversation",
        title: "Task 2: Conversation",
        audioUrl:
          "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
        audioSeconds: 70,
        testingSeconds: 35,
        transcript:
          "Student: Hi, do you have the textbook for biology class? Staff: Sure! What is the book title?",
        questions: [
          {
            id: "eq2",
            number: 1,
            type: "main_idea",
            stem: "What is the conversation about?",
            choices: [
              {
                id: "c1",
                text: "A student buying a textbook.",
                isCorrect: true,
              },
              {
                id: "c2",
                text: "A student asking about biology class.",
                isCorrect: false,
              },
              {
                id: "c3",
                text: "A student returning a book.",
                isCorrect: false,
              },
              {
                id: "c4",
                text: "A student looking for a job.",
                isCorrect: false,
              },
            ],
          },
          {
            id: "eq3",
            number: 2,
            type: "detail",
            stem: "What does the student want?",
            choices: [
              {
                id: "c1",
                text: "A biology textbook.",
                isCorrect: true,
              },
              {
                id: "c2",
                text: "Help with homework.",
                isCorrect: false,
              },
              {
                id: "c3",
                text: "Information about the class.",
                isCorrect: false,
              },
              {
                id: "c4",
                text: "A job in the bookstore.",
                isCorrect: false,
              },
            ],
          },
        ],
      },
      {
        id: "e-t3-announcement",
        taskKind: "announcement",
        title: "Task 3: Announcement",
        audioUrl:
          "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
        audioSeconds: 45,
        testingSeconds: 25,
        transcript:
          "Attention students. The university library will be closed next Monday for maintenance. The library will reopen on Tuesday at 8 in the morning.",
        questions: [
          {
            id: "eq4",
            number: 1,
            type: "main_idea",
            stem: "What is the announcement about?",
            choices: [
              {
                id: "c1",
                text: "The library will be closed for maintenance.",
                isCorrect: true,
              },
              {
                id: "c2",
                text: "New books are arriving at the library.",
                isCorrect: false,
              },
              {
                id: "c3",
                text: "The library is moving.",
                isCorrect: false,
              },
              {
                id: "c4",
                text: "Students can only borrow books on Tuesday.",
                isCorrect: false,
              },
            ],
          },
          {
            id: "eq5",
            number: 2,
            type: "detail",
            stem: "When will the library reopen?",
            choices: [
              {
                id: "c1",
                text: "Tuesday at 8 in the morning.",
                isCorrect: true,
              },
              {
                id: "c2",
                text: "Monday at 8 in the morning.",
                isCorrect: false,
              },
              {
                id: "c3",
                text: "Tuesday at 8 in the evening.",
                isCorrect: false,
              },
              {
                id: "c4",
                text: "Wednesday.",
                isCorrect: false,
              },
            ],
          },
        ],
      },
      {
        id: "e-t4-announcement",
        taskKind: "announcement",
        title: "Task 4: Announcement",
        audioUrl:
          "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
        audioSeconds: 45,
        testingSeconds: 25,
        transcript:
          "Hello everyone. We are organizing a movie night in the student center this Friday at 7 PM. Popcorn and drinks will be free. Please bring your student ID.",
        questions: [
          {
            id: "eq6",
            number: 1,
            type: "main_idea",
            stem: "What event is being announced?",
            choices: [
              {
                id: "c1",
                text: "A movie night at the student center.",
                isCorrect: true,
              },
              {
                id: "c2",
                text: "A sports game at the stadium.",
                isCorrect: false,
              },
              {
                id: "c3",
                text: "A class about movies.",
                isCorrect: false,
              },
              {
                id: "c4",
                text: "A free popcorn giveaway.",
                isCorrect: false,
              },
            ],
          },
          {
            id: "eq7",
            number: 2,
            type: "detail",
            stem: "What do you need to bring to the event?",
            choices: [
              {
                id: "c1",
                text: "Your student ID.",
                isCorrect: true,
              },
              {
                id: "c2",
                text: "Money to buy popcorn.",
                isCorrect: false,
              },
              {
                id: "c3",
                text: "Your passport.",
                isCorrect: false,
              },
              {
                id: "c4",
                text: "A drink from home.",
                isCorrect: false,
              },
            ],
          },
        ],
      },
    ],
  },
};

export default function ListeningSessionPage() {
  return (
    <ListeningSessionContainer
      testData={DUMMY_TEST as unknown as LListeningTest2026Linear}
      testId={DUMMY_TEST.meta.id}
    />
  );
}
