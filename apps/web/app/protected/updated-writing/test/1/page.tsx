'use client';

import { useState, useCallback, useEffect } from 'react';
import WritingTimer from '@/components/writing/WritingTimer';
import Task1WordPuzzle from '@/components/writing/Task1WordPuzzle';
import SecureWritingEditor from '@/components/writing/SecureWritingEditor';
import { useWritingScore } from '@/hooks/useWritingScore';

type WritingTask = 'TASK_1' | 'TASK_2' | 'TASK_3';

export default function WritingTestPage() {
  const [currentTask, setCurrentTask] = useState<WritingTask>('TASK_1');

  // Fullscreen on mount (optional - won't break if not available)
  useEffect(() => {
    const enterFullscreen = () => {
      try {
        const elem = document.documentElement as any;
        if (elem.requestFullscreen) {
          elem.requestFullscreen().catch(() => {});
        } else if (elem.webkitRequestFullscreen) {
          elem.webkitRequestFullscreen();
        } else if (elem.mozRequestFullScreen) {
          elem.mozRequestFullScreen();
        }
      } catch (err) {
        // Silently ignore fullscreen errors
      }
    };

    // Delay fullscreen request to avoid blocking
    const timer = setTimeout(enterFullscreen, 500);

    return () => {
      clearTimeout(timer);
      try {
        if (document.fullscreenElement) {
          document.exitFullscreen().catch(() => {});
        }
      } catch (err) {
        // Ignore errors
      }
    };
  }, []);
  const [tasks, setTasks] = useState({
    TASK_1: { content: '', completed: false },
    TASK_2: { content: '', completed: false },
    TASK_3: { content: '', completed: false },
  });
  const { score, loading, error, scoreEssay } = useWritingScore();

  const DEMO_DATA = {
    TASK_1: {
      prompt: 'Did you hear that the chemistry professor cancelled the exam?',
      correctAnswer: 'He decided to postpone the test due to unforeseen circumstances.',
      wordTokens: ['He', 'decided', 'to', 'postpone', 'the', 'test', 'due', 'to', 'unforeseen', 'circumstances'],
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

  const handleSubmitTask = async () => {
    const data = DEMO_DATA[currentTask];
    if ('correctAnswer' in data) {
      await scoreEssay(currentTask, tasks[currentTask].content, data.prompt, data.correctAnswer);
    } else {
      await scoreEssay(currentTask, tasks[currentTask].content, data.prompt);
    }
  };

  const renderTaskContent = () => {
    const data = DEMO_DATA[currentTask];
    if (currentTask === 'TASK_1') {
      return (
        <Task1WordPuzzle
          prompt={data.prompt}
          correctAnswer={data.correctAnswer}
          wordTokens={data.wordTokens}
          onAnswerChange={(answer) => setTasks({...tasks, TASK_1: {...tasks.TASK_1, content: answer}})}
          onCorrect={(isCorrect) => isCorrect && setTasks({...tasks, TASK_1: {...tasks.TASK_1, completed: true}})}
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
        <h1 className="text-2xl font-bold">Writing Test 2026</h1>
        <p className="text-sm text-gray-600">
          {currentTask === 'TASK_1' && 'Task 1: Build a Sentence (45s)'}
          {currentTask === 'TASK_2' && 'Task 2: Integrated Writing (7min)'}
          {currentTask === 'TASK_3' && 'Task 3: Academic Discussion (10min)'}
        </p>
      </div>

      <WritingTimer taskId={currentTask} onTimeout={() => handleSubmitTask()} autoStart={true} />

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        {renderTaskContent()}
      </div>

      {score && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-6 space-y-3">
          <div className="text-lg font-semibold">Score: {score.score}/100</div>
          <p className="text-sm">{score.feedback}</p>
        </div>
      )}

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">Error: {error}</div>}
      {loading && <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-700">Scoring...</div>}

      <div className="flex justify-between gap-3">
        <button onClick={() => history.back()} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-gray-50">Back</button>
        <button onClick={handleSubmitTask} disabled={score || loading} className="px-6 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
          {score && currentTask === 'TASK_3' ? 'Finish' : score ? 'Next' : 'Submit'}
        </button>
      </div>
    </div>
  );
}
