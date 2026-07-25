'use client';

import { useState, useCallback, useEffect } from 'react';
import WritingTimer from '@/components/writing/WritingTimer';
import Task1WordPuzzle from '@/components/writing/Task1WordPuzzle';
import SecureWritingEditor from '@/components/writing/SecureWritingEditor';

type WritingTask = 'TASK_1' | 'TASK_2' | 'TASK_3';

export default function WritingTestPage() {
  const [currentTask, setCurrentTask] = useState<WritingTask>('TASK_1');
  const [currentQuestion, setCurrentQuestion] = useState(0);

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

  const TASK_1_QUESTIONS = [
    {
      prompt: 'Did you hear that the chemistry professor cancelled the exam?',
      correctAnswer: 'He decided to postpone the test due to unforeseen circumstances.',
      wordTokens: ['He', 'decided', 'to', 'postpone', 'the', 'test', 'due', 'to', 'unforeseen', 'circumstances.'],
    },
    {
      prompt: 'The library is closing early today because of the staff meeting.',
      correctAnswer: 'We need to finish our research before five o\'clock.',
      wordTokens: ['We', 'need', 'to', 'finish', 'our', 'research', 'before', 'five', 'o\'clock.'],
    },
    {
      prompt: 'The company announced layoffs due to economic downturns.',
      correctAnswer: 'Many employees are worried about their job security.',
      wordTokens: ['Many', 'employees', 'are', 'worried', 'about', 'their', 'job', 'security.'],
    },
    {
      prompt: 'Climate change is affecting global agriculture.',
      correctAnswer: 'Farmers must adapt to changing weather patterns.',
      wordTokens: ['Farmers', 'must', 'adapt', 'to', 'changing', 'weather', 'patterns.'],
    },
    {
      prompt: 'The new smartphone has revolutionary camera technology.',
      correctAnswer: 'Photographers are excited about the improved features.',
      wordTokens: ['Photographers', 'are', 'excited', 'about', 'the', 'improved', 'features.'],
    },
    {
      prompt: 'Remote work has become increasingly popular.',
      correctAnswer: 'Companies are investing in digital collaboration tools.',
      wordTokens: ['Companies', 'are', 'investing', 'in', 'digital', 'collaboration', 'tools.'],
    },
    {
      prompt: 'The university is expanding its science facilities.',
      correctAnswer: 'Students will benefit from state-of-the-art laboratories.',
      wordTokens: ['Students', 'will', 'benefit', 'from', 'state-of-the-art', 'laboratories.'],
    },
    {
      prompt: 'Electric vehicles are becoming more affordable.',
      correctAnswer: 'Consumers are gradually shifting away from gasoline cars.',
      wordTokens: ['Consumers', 'are', 'gradually', 'shifting', 'away', 'from', 'gasoline', 'cars.'],
    },
    {
      prompt: 'The conference was postponed due to technical issues.',
      correctAnswer: 'Attendees will receive updated information about the new date.',
      wordTokens: ['Attendees', 'will', 'receive', 'updated', 'information', 'about', 'the', 'new', 'date.'],
    },
    {
      prompt: 'The restaurant opened a second location downtown.',
      correctAnswer: 'The menu features authentic dishes from various cuisines.',
      wordTokens: ['The', 'menu', 'features', 'authentic', 'dishes', 'from', 'various', 'cuisines.'],
    },
  ];

  const DEMO_DATA = {
    TASK_1: TASK_1_QUESTIONS[currentQuestion],
    TASK_2: {
      prompt: 'Reading: Professor Anderson postponed the midterm from next Wednesday to the following week due to exam hall construction. Listening: A student expresses relief. Task: Summarize (150+ words) why the exam was postponed and how the student feels.',
      minWords: 150,
    },
    TASK_3: {
      prompt: 'Should universities require all students to take public speaking? Many educators argue communication skills are essential.',
      minWords: 100,
    },
  };

  const handleSubmitTask = () => {
    // Test 모드: 다음 문제로 진행 (점수 매기지 않음)
    if (currentTask === 'TASK_1') {
      // Task 1 내에서 다음 문제로 진행
      if (currentQuestion < TASK_1_QUESTIONS.length - 1) {
        setCurrentQuestion((prev) => prev + 1);
      } else {
        // Task 1 완료, Task 2로 이동
        setCurrentTask('TASK_2');
        setCurrentQuestion(0);
      }
    } else if (currentTask === 'TASK_2') {
      setCurrentTask('TASK_3');
    } else {
      // 마지막 Task - 완료
      alert('Test completed!');
    }
  };

  const renderTaskContent = () => {
    const data = DEMO_DATA[currentTask];
    if (currentTask === 'TASK_1') {
      return (
        <Task1WordPuzzle
          key={currentQuestion}
          prompt={data.prompt}
          correctAnswer={data.correctAnswer}
          wordTokens={data.wordTokens}
          onAnswerChange={(answer) => setTasks({...tasks, TASK_1: {...tasks.TASK_1, content: answer}})}
          onCorrect={(isCorrect) => isCorrect && setTasks({...tasks, TASK_1: {...tasks.TASK_1, completed: true}})}
          mode="test"
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
          {currentTask === 'TASK_1' && `Task 1: Build a Sentence (45s) — Question ${currentQuestion + 1}/10`}
          {currentTask === 'TASK_2' && 'Task 2: Integrated Writing (7min)'}
          {currentTask === 'TASK_3' && 'Task 3: Academic Discussion (10min)'}
        </p>
      </div>

      <WritingTimer taskId={currentTask} onTimeout={() => handleSubmitTask()} autoStart={true} />

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        {renderTaskContent()}
      </div>

      <div className="flex justify-between gap-3">
        <button onClick={() => history.back()} className="px-4 py-2 rounded-lg border text-sm font-medium hover:bg-gray-50">Back</button>
        <button onClick={handleSubmitTask} className="px-6 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700">
          {currentTask === 'TASK_3' ? 'Finish' : 'Next'}
        </button>
      </div>
    </div>
  );
}
