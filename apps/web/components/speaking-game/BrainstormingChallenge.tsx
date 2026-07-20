'use client';

import { useState, useRef, useEffect } from 'react';
import { analyzeSpeech, extractAudioBuffer, scoreMetrics } from '@/lib/speaking-game/audio-analysis';

interface Question {
  id: string;
  text: string;
  type: 'preference' | 'experience' | 'hypothetical';
}

interface BrainstormingChallengeProps {
  questions: Question[];
  onComplete: (result: { success: boolean; initiationDelay: number; score: number }) => void;
}

const INITIATION_DEADLINE_MS = 3000; // 3 seconds
const RECORDING_DURATION_MS = 10000; // 10 seconds

type Phase = 'idle' | 'playing' | 'recording' | 'analyzing' | 'result';

export default function BrainstormingChallenge({
  questions,
  onComplete,
}: BrainstormingChallengeProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [timer, setTimer] = useState(0);
  const [result, setResult] = useState<{
    success: boolean;
    initiationDelay: number;
    score: number;
    feedback: string;
  } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartTimeRef = useRef<number | null>(null);
  const initiationDetectedRef = useRef<boolean>(false);
  const initiationTimeRef = useRef<number | null>(null);

  const currentQuestion = questions[currentQuestionIndex];

  // Initialize audio
  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
  }, []);

  // Timer effect for recording
  useEffect(() => {
    if (phase !== 'recording') return;

    const interval = setInterval(() => {
      setTimer((prev) => {
        const newTime = prev + 100;
        if (newTime >= RECORDING_DURATION_MS) {
          finishRecording();
        }
        return newTime;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [phase]);

  const startChallenge = async () => {
    setPhase('playing');
    setTimer(0);
    recordingStartTimeRef.current = Date.now();
    initiationDetectedRef.current = false;
    initiationTimeRef.current = null;

    // Get microphone access
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      // Start recording immediately (before audio plays)
      mediaRecorder.start();

      // Play question audio (for now, just use text-to-speech)
      await playQuestionAudio(currentQuestion.text);

      // Start recording phase
      setPhase('recording');
    } catch (error) {
      console.error('Microphone access denied:', error);
      alert('Microphone access is required for this drill.');
    }
  };

  const playQuestionAudio = async (text: string) => {
    // Use Web Speech API with US English accent
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  const finishRecording = async () => {
    if (!mediaRecorderRef.current) return;

    setPhase('analyzing');
    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());

    // Wait for data to be collected
    setTimeout(async () => {
      const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const arrayBuffer = await audioBlob.arrayBuffer();

      try {
        // Analyze speech
        const audioBuffer = await extractAudioBuffer(audioContextRef.current!, arrayBuffer);
        const metrics = await analyzeSpeech(audioContextRef.current!, audioBuffer);

        // Calculate result
        const success = metrics.immediateInitiation;
        const initiationDelay = metrics.initiationDelay;

        // Score calculation
        let score = 10; // base score
        if (success) {
          score += 5; // bonus for immediate initiation
        } else {
          const delayPenalty = Math.min(5, Math.floor(initiationDelay / 1000));
          score -= delayPenalty;
        }

        const feedback = success
          ? `🎉 Perfect! Started in ${(initiationDelay / 1000).toFixed(1)}s`
          : `⏱️ Delayed start (${(initiationDelay / 1000).toFixed(1)}s). Aim for ≤3s.`;

        const resultData = {
          success,
          initiationDelay,
          score: Math.max(0, score),
          feedback,
        };

        setResult(resultData);
        onComplete(resultData);
        setPhase('result');
      } catch (error) {
        console.error('Analysis error:', error);
        setResult({
          success: false,
          initiationDelay: RECORDING_DURATION_MS,
          score: 0,
          feedback: 'Error analyzing audio. Please try again.',
        });
        setPhase('result');
      }
    }, 1000);
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setPhase('idle');
      setResult(null);
      setTimer(0);
    } else {
      // All questions done
      alert('🎉 Drill completed! Great work on your brainstorming practice.');
      setCurrentQuestionIndex(0);
      setPhase('idle');
      setResult(null);
    }
  };

  const timerColor = (() => {
    if (timer < 3000) return 'text-red-600'; // Red zone: must initiate
    if (timer < 10000) return 'text-green-600'; // Speaking zone
    return 'text-gray-600';
  })();

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      {/* Question Counter */}
      <div className="mb-6 text-center">
        <p className="text-sm text-gray-500">
          Question {currentQuestionIndex + 1} of {questions.length}
        </p>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
          ></div>
        </div>
      </div>

      {/* Question Display */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">
          {currentQuestion.text}
        </h2>

        {/* Type hint */}
        <div className="flex justify-center gap-2">
          {currentQuestion.type === 'preference' && (
            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
              Choose & Explain
            </span>
          )}
          {currentQuestion.type === 'experience' && (
            <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm">
              Share a Story
            </span>
          )}
          {currentQuestion.type === 'hypothetical' && (
            <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm">
              Imagine & Describe
            </span>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {phase === 'idle' && (
        <div className="text-center">
          <button
            onClick={startChallenge}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg text-lg transition-all duration-200 transform hover:scale-105"
          >
            🎤 Start Challenge
          </button>
        </div>
      )}

      {(phase === 'playing' || phase === 'recording') && (
        <div className="text-center">
          {/* Timer Circle */}
          <div className="flex justify-center mb-8">
            <div className="relative w-40 h-40">
              <svg className="transform -rotate-90 w-40 h-40">
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                />
                <circle
                  cx="80"
                  cy="80"
                  r="70"
                  fill="none"
                  stroke={timer < 3000 ? '#dc2626' : timer < 10000 ? '#16a34a' : '#9ca3af'}
                  strokeWidth="8"
                  strokeDasharray={2 * Math.PI * 70}
                  strokeDashoffset={
                    2 * Math.PI * 70 * (1 - (timer / RECORDING_DURATION_MS))
                  }
                  className="transition-all duration-100"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div>
                  <div className={`text-4xl font-bold ${timerColor}`}>
                    {(timer / 1000).toFixed(1)}s
                  </div>
                  {timer < 3000 && (
                    <div className="text-sm text-red-600 font-semibold mt-2">START NOW!</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="mb-6">
            {phase === 'playing' && (
              <p className="text-lg text-gray-600">🎵 Listening to question...</p>
            )}
            {phase === 'recording' && (
              <p className="text-lg text-green-600 font-semibold">
                🎤 Recording... Speak now!
              </p>
            )}
          </div>

          {/* Info */}
          {timer < 3000 && phase === 'recording' && (
            <div className="bg-red-50 border border-red-300 rounded-lg p-4 mb-6">
              <p className="text-red-800 font-semibold">⏰ Critical Window!</p>
              <p className="text-sm text-red-700">You must start speaking within 3 seconds.</p>
            </div>
          )}
        </div>
      )}

      {phase === 'analyzing' && (
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
          <p className="text-gray-600">Analyzing your speech...</p>
        </div>
      )}

      {phase === 'result' && result && (
        <div className="text-center">
          {/* Result Card */}
          <div
            className={`rounded-lg p-8 mb-8 ${
              result.success
                ? 'bg-green-50 border-2 border-green-400'
                : 'bg-orange-50 border-2 border-orange-400'
            }`}
          >
            <div className="text-5xl mb-4">{result.success ? '✅' : '⏱️'}</div>
            <h3
              className={`text-2xl font-bold mb-2 ${
                result.success ? 'text-green-800' : 'text-orange-800'
              }`}
            >
              {result.feedback}
            </h3>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="bg-white rounded p-3">
                <div className="text-sm text-gray-600">Initiation Time</div>
                <div className="text-2xl font-bold text-blue-600">
                  {(result.initiationDelay / 1000).toFixed(2)}s
                </div>
                <div
                  className={`text-xs mt-1 ${
                    result.success ? 'text-green-600' : 'text-orange-600'
                  }`}
                >
                  {result.success ? '≤ 3s target ✅' : '> 3s (goal: ≤3s)'}
                </div>
              </div>
              <div className="bg-white rounded p-3">
                <div className="text-sm text-gray-600">Score</div>
                <div className="text-2xl font-bold text-purple-600">{result.score}</div>
                <div className="text-xs text-gray-600 mt-1">/ 15 points</div>
              </div>
            </div>
          </div>

          {/* Next Button */}
          <button
            onClick={nextQuestion}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-all duration-200"
          >
            {currentQuestionIndex < questions.length - 1 ? 'Next Question →' : 'Complete Drill ✓'}
          </button>
        </div>
      )}
    </div>
  );
}
