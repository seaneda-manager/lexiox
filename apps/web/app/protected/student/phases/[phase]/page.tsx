'use client';

import { useParams } from "next/navigation";
import Link from "next/link";
import { PhaseVocabTest } from "@/components/student/phases/PhaseVocabTest";
import { PhaseDailyTests } from "@/components/student/phases/PhaseDailyTests";
import { PhaseReview } from "@/components/student/phases/PhaseReview";
import { PhaseHavruta } from "@/components/student/phases/PhaseHavruta";
import { PhasePostCheckup } from "@/components/student/phases/PhasePostCheckup";
import type { LearningPhase } from "@/lib/types/learning-phase";
import type { VocabWord } from "@/lib/types/vocab-test";
import type { PostCheckupQuestion } from "@/components/student/phases/PhasePostCheckup";

export default function PhasePage() {
  const params = useParams();
  const phase = params.phase as string;

  const validPhases: LearningPhase[] = [
    'postcheckup',
    'homework',
    'lectures',
    'vocab_test',
    'correction',
    'skills',
    'daily_tests',
    'review',
    'havruta',
  ];

  const isValidPhase = validPhases.includes(phase as LearningPhase);

  if (!isValidPhase) {
    return (
      <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
        <div className="rounded-lg border border-slate-200 bg-white p-6">
          <h1 className="text-2xl font-bold text-slate-900">페이지를 찾을 수 없습니다</h1>
          <p className="mt-2 text-slate-600">유효하지 않은 phase입니다.</p>
          <Link href="/student/home" className="mt-4 inline-block text-indigo-600 hover:text-indigo-700">
            대시보드로 돌아가기 →
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 px-6 py-8">
      {/* Back Button */}
      <Link
        href="/student/home"
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
      >
        ← 돌아가기
      </Link>

      {/* Phase Content */}
      {phase === 'postcheckup' && <PhasePostCheckupPage />}
      {phase === 'vocab_test' && <PhaseVocabTestPage />}
      {phase === 'daily_tests' && <PhaseDailyTestsPage />}
      {phase === 'review' && <PhaseReviewPage />}
      {phase === 'havruta' && <PhaseHavrutaPage />}

      {!['postcheckup', 'vocab_test', 'daily_tests', 'review', 'havruta'].includes(phase) && (
        <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
          <p className="text-slate-500">{phase} 페이지 개발 중...</p>
        </div>
      )}
    </main>
  );
}

// postcheckup Phase
function PhasePostCheckupPage() {
  const mockQuestions: PostCheckupQuestion[] = [
    {
      id: 'vocab-1',
      category: 'vocab',
      question: '"The speaker\'s tone is _____ throughout the passage."',
      type: 'multiple_choice',
      choices: ['aggressive', 'sarcastic', 'neutral', 'enthusiastic'],
      correctAnswer: 'neutral',
      explanation: 'The speaker uses objective language without showing personal emotions or opinions.',
    },
    {
      id: 'grammar-1',
      category: 'grammar',
      question: '"If she _____ studied harder, she would have passed the exam."',
      type: 'multiple_choice',
      choices: ['had', 'has', 'would have', 'have'],
      correctAnswer: 'had',
      explanation: 'In past conditional sentences, we use "had" in the if-clause without "would".',
    },
    {
      id: 'grammar-2',
      category: 'grammar',
      question: '"The book _____ by millions of readers worldwide."',
      type: 'multiple_choice',
      choices: ['is read', 'was read', 'reads', 'has been read'],
      correctAnswer: 'has been read',
      explanation: 'This describes a past action with present relevance, requiring the present perfect passive voice.',
    },
    {
      id: 'translation-1',
      category: 'translation',
      question: '"What is the main idea of the first paragraph?"',
      type: 'multiple_choice',
      choices: [
        'The author disagrees with the new policy',
        'The new technology will revolutionize the industry',
        'Traditional methods are outdated',
        'Environmental concerns are not important',
      ],
      correctAnswer: 'The new technology will revolutionize the industry',
      explanation: 'The first paragraph introduces how emerging technologies are changing business practices.',
    },
    {
      id: 'writing-1',
      category: 'writing',
      question: '아래 문장을 완성하세요: "Although the weather was bad, _______________"',
      type: 'short_answer',
      correctAnswer: 'they decided to go camping',
      explanation: 'The completing clause should provide a contrast to the "bad weather" in the first clause.',
    },
    {
      id: 'listening-1',
      category: 'listening',
      question: 'What is the main topic of the conversation?',
      audioUrl: 'https://example.com/audio/conversation-1.mp3',
      type: 'multiple_choice',
      choices: [
        'Planning a business trip',
        'Discussing a book club meeting',
        'Reviewing a restaurant experience',
        'Scheduling a medical appointment',
      ],
      correctAnswer: 'Planning a business trip',
      explanation: 'The speakers discuss dates, flights, and hotel accommodations.',
    },
  ];

  return (
    <>
      <div className="rounded-lg border border-slate-200 bg-white p-6 mb-6">
        <h1 className="text-3xl font-bold text-slate-900">📋 지난 수업 복습</h1>
        <p className="mt-2 text-slate-600">지난 수업에서 배운 내용을 5개 분야별로 복습합니다.</p>
      </div>

      <PhasePostCheckup
        studentId="mock-student"
        questions={mockQuestions}
        onComplete={async (score, results) => {
          console.log('PostCheckup completed:', { score, results });
        }}
      />
    </>
  );
}

// vocab_test Phase
function PhaseVocabTestPage() {
  const mockWords: VocabWord[] = [
    {
      id: '1',
      word: 'serendipity',
      pos: 'noun',
      meaning: '행운의 우연',
      exampleSentence: 'Finding that book was pure serendipity.',
    },
    {
      id: '2',
      word: 'ephemeral',
      pos: 'adjective',
      meaning: '일시적인, 덧없는',
      exampleSentence: 'The beauty of cherry blossoms is ephemeral.',
    },
    {
      id: '3',
      word: 'ubiquitous',
      pos: 'adjective',
      meaning: '어디에나 있는',
      exampleSentence: 'Smartphones are ubiquitous in modern society.',
    },
    {
      id: '4',
      word: 'mellifluous',
      pos: 'adjective',
      meaning: '달콤한 목소리의',
      exampleSentence: 'Her mellifluous voice enchanted the audience.',
    },
    {
      id: '5',
      word: 'obfuscate',
      pos: 'verb',
      meaning: '모호하게 하다',
      exampleSentence: 'The document was designed to obfuscate the truth.',
    },
  ];

  return (
    <>
      <div className="rounded-lg border border-slate-200 bg-white p-6 mb-6">
        <h1 className="text-3xl font-bold text-slate-900">🔤 단어 테스트</h1>
        <p className="mt-2 text-slate-600">암기한 단어를 테스트합니다.</p>
      </div>

      <PhaseVocabTest
        studentId="mock-student"
        words={mockWords}
        onComplete={async (score, resultData) => {
          console.log('Vocab test completed:', { score, resultData });
        }}
      />
    </>
  );
}

// daily_tests Phase
function PhaseDailyTestsPage() {
  const mockTests = [
    {
      id: '1',
      date: '2026-08-13',
      title: 'Day 1: Reading & Listening',
      sections: [
        { name: 'Reading', questionCount: 39 },
        { name: 'Listening', questionCount: 34 },
      ],
      status: 'completed' as const,
      score: 85,
    },
    {
      id: '2',
      date: '2026-08-14',
      title: 'Day 2: Writing & Speaking',
      sections: [
        { name: 'Writing', questionCount: 2 },
        { name: 'Speaking', questionCount: 6 },
      ],
      status: 'in_progress' as const,
    },
    {
      id: '3',
      date: '2026-08-15',
      title: 'Day 3: Full Test',
      sections: [
        { name: 'Reading', questionCount: 39 },
        { name: 'Listening', questionCount: 34 },
        { name: 'Writing', questionCount: 2 },
        { name: 'Speaking', questionCount: 6 },
      ],
      status: 'not_started' as const,
    },
  ];

  return (
    <>
      <div className="rounded-lg border border-slate-200 bg-white p-6 mb-6">
        <h1 className="text-3xl font-bold text-slate-900">📝 Daily Tests</h1>
        <p className="mt-2 text-slate-600">매일의 TOEFL 테스트를 풀어봅니다.</p>
      </div>

      <PhaseDailyTests
        studentId="mock-student"
        tests={mockTests}
        onTestClick={(testId) => {
          console.log('Test clicked:', testId);
        }}
      />
    </>
  );
}

// review Phase
function PhaseReviewPage() {
  const mockSections = [
    { name: 'Reading', totalQuestions: 39, correctCount: 32, icon: '📖' },
    { name: 'Listening', totalQuestions: 34, correctCount: 29, icon: '🎧' },
    { name: 'Writing', totalQuestions: 2, correctCount: 1, icon: '✍️' },
    { name: 'Speaking', totalQuestions: 6, correctCount: 4, icon: '🗣️' },
  ];

  const mockIncorrectAnswers = [
    {
      id: '1',
      testId: '1',
      question: 'The author suggests that the primary purpose of the passage is to...',
      yourAnswer: 'A',
      correctAnswer: 'C',
      section: 'Reading',
      explanation: 'The passage clearly states the author\'s main point in the second paragraph.',
    },
  ];

  return (
    <>
      <div className="rounded-lg border border-slate-200 bg-white p-6 mb-6">
        <h1 className="text-3xl font-bold text-slate-900">🔍 복습</h1>
        <p className="mt-2 text-slate-600">풀이한 테스트의 오답을 검토합니다.</p>
      </div>

      <PhaseReview
        studentId="mock-student"
        sections={mockSections}
        incorrectAnswers={mockIncorrectAnswers}
        onComplete={() => {
          console.log('Review completed');
        }}
      />
    </>
  );
}

// havruta Phase
function PhaseHavrutaPage() {
  const mockTopics = [
    {
      id: '1',
      title: 'ETS Reading Strategy',
      description: 'How to approach TOEFL reading questions efficiently',
      category: 'discussion' as const,
      icon: '📖',
      difficulty: 'medium' as const,
      estimatedTimeMinutes: 30,
    },
    {
      id: '2',
      title: 'Pronunciation Tips',
      description: 'Common pronunciation mistakes and how to correct them',
      category: 'debate' as const,
      icon: '🎤',
      difficulty: 'easy' as const,
      estimatedTimeMinutes: 20,
    },
  ];

  const mockPeers = [
    { id: '1', name: '김철수', level: 5 },
    { id: '2', name: '이영희', level: 4 },
    { id: '3', name: '박민준', level: 6 },
  ];

  return (
    <>
      <div className="rounded-lg border border-slate-200 bg-white p-6 mb-6">
        <h1 className="text-3xl font-bold text-slate-900">💬 하브루타</h1>
        <p className="mt-2 text-slate-600">학습 내용을 동료와 함께 토론합니다.</p>
      </div>

      <PhaseHavruta
        studentId="mock-student"
        topics={mockTopics}
        peers={mockPeers}
        onTopicSelect={(topicId) => {
          console.log('Topic selected:', topicId);
        }}
        onPeerSelect={(peerId) => {
          console.log('Peer selected:', peerId);
        }}
      />
    </>
  );
}
