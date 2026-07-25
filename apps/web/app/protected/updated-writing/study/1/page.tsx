'use client';

import { useState } from 'react';
import Task1WordPuzzle from '@/components/writing/Task1WordPuzzle';
import SecureWritingEditor from '@/components/writing/SecureWritingEditor';

type WritingTask = 'TASK_1' | 'TASK_2' | 'TASK_3';

export default function WritingStudyPage() {
  const [currentTask, setCurrentTask] = useState<WritingTask>('TASK_1');
  const [tasks, setTasks] = useState({
    TASK_1: { content: '', completed: false },
    TASK_2: { content: '', completed: false },
    TASK_3: { content: '', completed: false },
  });

  const DEMO_DATA = {
    TASK_1: {
      prompt: 'Did you hear that the chemistry professor cancelled the exam?',
      correctAnswer: 'He decided to postpone the test due to unforeseen circumstances.',
      wordTokens: ['He', 'decided', 'to', 'postpone', 'the', 'test', 'due', 'to', 'unforeseen', 'circumstances.'],
    },
    TASK_2: {
      prompt: 'Reading: Professor Anderson postponed the midterm from next Wednesday to the following week due to exam hall construction. Listening: A student expresses relief. Task: Summarize (150+ words) why the exam was postponed and how the student feels.',
      minWords: 150,
    },
    TASK_3: {
      prompt: 'Should universities require all students to take public speaking? Many educators argue communication skills are essential.',
      minWords: 100,
    },
  };

  // Study 모드에서는 점수를 매기지 않음 (정답 확인만)

  const renderTaskContent = () => {
    const data = DEMO_DATA[currentTask];
    if (currentTask === 'TASK_1') {
      return (
        <Task1WordPuzzle
          prompt={data.prompt}
          correctAnswer={data.correctAnswer.replace(/[.,!?;:—-]+$/g, "")}
          wordTokens={data.wordTokens}
          onAnswerChange={(answer) => setTasks({...tasks, TASK_1: {...tasks.TASK_1, content: answer}})}
          onCorrect={(isCorrect) => isCorrect && setTasks({...tasks, TASK_1: {...tasks.TASK_1, completed: true}})}
          mode="study"
        />
      );
    }
    return (
      <div className="space-y-4">
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
          <p className="text-xs font-semibold text-blue-700 uppercase mb-2">Task {currentTask === 'TASK_2' ? '2' : '3'}</p>
          <p className="text-sm text-gray-900 whitespace-pre-wrap">{data.prompt}</p>
        </div>
        <SecureWritingEditor
          value={tasks[currentTask].content}
          onChange={(text) => setTasks({...tasks, [currentTask]: {...tasks[currentTask], content: text}})}
          onAutoSave={() => null}
          placeholder="Write your response..."
          minWords={data.minWords}
          maxWords={currentTask === 'TASK_2' ? 225 : 200}
        />
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Writing Study Mode</h1>
        <p className="text-sm text-gray-600">
          Practice at your own pace. Take as much time as you need.
        </p>
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
        📚 Study Mode: No time limit. Click "Check Answer" to see feedback. Feel free to review and retry.
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        {renderTaskContent()}
      </div>

      <div className="flex justify-between gap-3">
        <button onClick={() => history.back()} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-gray-50">Back</button>
        <button
          onClick={() => setCurrentTask(currentTask === 'TASK_1' ? 'TASK_2' : currentTask === 'TASK_2' ? 'TASK_3' : 'TASK_1')}
          className="px-6 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700"
        >
          {currentTask === 'TASK_3' ? 'Done' : 'Next Task'}
        </button>
      </div>
    </div>
  );
}
