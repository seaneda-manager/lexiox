'use client';

import { useState, useRef, useEffect } from 'react';
import { analyzeSpeech, extractAudioBuffer, scoreMetrics } from '@/lib/speaking-game/audio-analysis';

interface Challenge {
  id: string;
  text: string;
  difficulty: 'easy' | 'medium' | 'hard';
}

interface FluencyMarathonProps {
  challenges: Challenge[];
  onComplete: (result: {
    duration: number;
    wpm: number;
    pauseCount: number;
    longPauses: number;
    score: number;
  }) => void;
}

type Phase = 'idle' | 'recording' | 'analyzing' | 'result';

const TARGET_WPM_MIN = 130;
const TARGET_WPM_MAX = 150;
const LONG_PAUSE_THRESHOLD = 3000; // 3 seconds

export default function FluencyMarathon({
  challenges,
  onComplete,
}: FluencyMarathonProps) {
  const [currentChallengeIndex, setCurrentChallengeIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>('idle');
  const [timer, setTimer] = useState(0);
  const [result, setResult] = useState<{
    duration: number;
    wpm: number;
    pauseCount: number;
    longPauses: number;
    averageRunLength: number;
    score: number;
    feedback: string[];
    assessment: 'excellent' | 'good' | 'fair' | 'poor';
  } | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const currentChallenge = challenges[currentChallengeIndex];

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
  }, []);

  useEffect(() => {
    if (phase !== 'recording') return;

    const interval = setInterval(() => {
      setTimer((prev) => prev + 100);
    }, 100);

    return () => clearInterval(interval);
  }, [phase]);

  const startChallenge = async () => {
    setPhase('recording');
    setTimer(0);

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

      mediaRecorder.start();

      // Play challenge text with US English accent
      const utterance = new SpeechSynthesisUtterance(currentChallenge.text);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Microphone access denied:', error);
      alert('Microphone access is required.');
    }
  };

  const stopRecording = async () => {
    if (!mediaRecorderRef.current) return;

    setPhase('analyzing');
    mediaRecorderRef.current.stop();
    mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());

    // Wait for data
    setTimeout(async () => {
      const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const arrayBuffer = await audioBlob.arrayBuffer();

      try {
        const audioBuffer = await extractAudioBuffer(audioContextRef.current!, arrayBuffer);
        const metrics = await analyzeSpeech(audioContextRef.current!, audioBuffer);

        // Analyze metrics
        const duration = Math.round(metrics.speakingDuration / 1000);
        const wpm = metrics.estimatedWPM;
        const pauseCount = metrics.pauseCount;
        const longPauseCount = metrics.longPauses.length;
        const averageRunLength = metrics.averageRunLength;

        // Score calculation
        let score = 0;
        const feedback: string[] = [];
        let assessment: 'excellent' | 'good' | 'fair' | 'poor' = 'fair';

        // Duration score (1 point per second)
        score += Math.min(45, duration);

        // WPM scoring
        if (wpm >= TARGET_WPM_MIN && wpm <= TARGET_WPM_MAX) {
          score += 25;
          feedback.push(`✅ Perfect WPM: ${wpm} (target: 130-150)`);
          assessment = 'excellent';
        } else if (wpm >= 120 && wpm < TARGET_WPM_MIN) {
          score += 15;
          feedback.push(`⚠️ Slightly slow: ${wpm} WPM (optimal: 130-150)`);
          assessment = 'good';
        } else if (wpm > TARGET_WPM_MAX && wpm <= 160) {
          score += 15;
          feedback.push(`⚠️ Slightly fast: ${wpm} WPM (optimal: 130-150)`);
          assessment = 'good';
        } else if (wpm < 120) {
          score += 5;
          feedback.push(`❌ Too slow: ${wpm} WPM - work on pace`);
          assessment = 'poor';
        } else {
          score += 5;
          feedback.push(`❌ Too fast: ${wpm} WPM - articulation may suffer`);
          assessment = 'poor';
        }

        // Pause scoring
        if (longPauseCount === 0) {
          score += 20;
          feedback.push('✅ No long pauses - excellent fluency!');
        } else if (longPauseCount === 1) {
          score += 10;
          feedback.push(
            `⚠️ One ${(metrics.longPauses[0]?.duration / 1000).toFixed(1)}s pause detected`
          );
          if (assessment === 'excellent') assessment = 'good';
        } else {
          score -= Math.min(20, longPauseCount * 5);
          feedback.push(
            `❌ ${longPauseCount} long pauses detected - critical issue`
          );
          assessment = 'poor';
        }

        // Run length bonus
        if (averageRunLength >= 4 && averageRunLength <= 7) {
          score += 10;
          feedback.push(`✅ Good run length: ${averageRunLength.toFixed(1)} words`);
        } else if (averageRunLength > 7) {
          score += 5;
          feedback.push(`Good continuity: ${averageRunLength.toFixed(1)} words per phrase`);
        }

        // Ensure we're giving proper assessment
        if (assessment === 'excellent' && score < 70) assessment = 'good';
        if (assessment === 'fair' && score < 40) assessment = 'poor';

        const resultData = {
          duration,
          wpm,
          pauseCount,
          longPauses: longPauseCount,
          averageRunLength,
          score: Math.max(0, Math.min(100, score)),
          feedback,
          assessment,
        };

        setResult(resultData);
        onComplete({
          duration,
          wpm,
          pauseCount,
          longPauses: longPauseCount,
          score: resultData.score,
        });
        setPhase('result');
      } catch (error) {
        console.error('Analysis error:', error);
        setResult({
          duration: timer / 1000,
          wpm: 0,
          pauseCount: 0,
          longPauses: 0,
          averageRunLength: 0,
          score: 0,
          feedback: ['Error analyzing audio. Please try again.'],
          assessment: 'poor',
        });
        setPhase('result');
      }
    }, 1000);
  };

  const nextChallenge = () => {
    if (currentChallengeIndex < challenges.length - 1) {
      setCurrentChallengeIndex(currentChallengeIndex + 1);
      setPhase('idle');
      setResult(null);
      setTimer(0);
    } else {
      alert(
        '🎉 Marathon complete! Work on maintaining 130-150 WPM with zero pauses.'
      );
      setCurrentChallengeIndex(0);
      setPhase('idle');
      setResult(null);
    }
  };

  const assessmentColor = {
    excellent: 'border-green-400 bg-green-50',
    good: 'border-blue-400 bg-blue-50',
    fair: 'border-yellow-400 bg-yellow-50',
    poor: 'border-red-400 bg-red-50',
  };

  const assessmentEmoji = {
    excellent: '🌟',
    good: '👍',
    fair: '📈',
    poor: '⚠️',
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-8">
      {/* Challenge Counter */}
      <div className="mb-6">
        <p className="text-sm text-gray-500">
          Challenge {currentChallengeIndex + 1} of {challenges.length}
        </p>
        <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
          <div
            className="bg-green-600 h-2 rounded-full transition-all duration-300"
            style={{
              width: `${((currentChallengeIndex + 1) / challenges.length) * 100}%`,
            }}
          ></div>
        </div>
      </div>

      {/* Challenge Display */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 text-center mb-4">
          {currentChallenge.text}
        </h2>
        <div className="flex justify-center">
          <span
            className={`px-4 py-2 rounded-full text-sm font-semibold ${
              currentChallenge.difficulty === 'easy'
                ? 'bg-green-100 text-green-800'
                : currentChallenge.difficulty === 'medium'
                  ? 'bg-yellow-100 text-yellow-800'
                  : 'bg-red-100 text-red-800'
            }`}
          >
            {currentChallenge.difficulty.toUpperCase()}
          </span>
        </div>
      </div>

      {/* Main Content */}
      {phase === 'idle' && (
        <div className="text-center">
          <p className="text-gray-600 mb-6">
            Speak continuously for as long as possible without long pauses.
          </p>
          <button
            onClick={startChallenge}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-8 rounded-lg text-lg transition-all duration-200 transform hover:scale-105"
          >
            🎤 Start Speaking
          </button>
        </div>
      )}

      {phase === 'recording' && (
        <div className="text-center">
          {/* Timer Display */}
          <div className="flex justify-center mb-8">
            <div className="relative w-48 h-48">
              <svg className="transform -rotate-90 w-48 h-48">
                <circle
                  cx="96"
                  cy="96"
                  r="85"
                  fill="none"
                  stroke="#e5e7eb"
                  strokeWidth="8"
                />
                <circle
                  cx="96"
                  cy="96"
                  r="85"
                  fill="none"
                  stroke="#16a34a"
                  strokeWidth="8"
                  strokeDasharray={2 * Math.PI * 85}
                  strokeDashoffset={2 * Math.PI * 85 * (1 - (timer / 45000))}
                  className="transition-all duration-100"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <div>
                  <div className="text-5xl font-bold text-green-600">
                    {(timer / 1000).toFixed(1)}s
                  </div>
                  <div className="text-sm text-gray-600 mt-2">Keep talking!</div>
                </div>
              </div>
            </div>
          </div>

          {/* Recording Status */}
          <p className="text-lg text-green-600 font-semibold mb-6">
            🎤 Recording... Speak naturally!
          </p>

          {/* Stop Button */}
          <button
            onClick={stopRecording}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg transition-all duration-200"
          >
            ⏹️ Stop Recording
          </button>
        </div>
      )}

      {phase === 'analyzing' && (
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
          </div>
          <p className="text-gray-600">Analyzing fluency metrics...</p>
        </div>
      )}

      {phase === 'result' && result && (
        <div className="text-center">
          {/* Assessment Card */}
          <div
            className={`rounded-lg border-4 p-8 mb-8 ${assessmentColor[result.assessment]}`}
          >
            <div className="text-5xl mb-4">
              {assessmentEmoji[result.assessment]}
            </div>
            <h3 className="text-2xl font-bold mb-2 capitalize">
              {result.assessment === 'excellent'
                ? 'Excellent Fluency!'
                : result.assessment === 'good'
                  ? 'Good Performance'
                  : result.assessment === 'fair'
                    ? 'Room to Improve'
                    : 'Needs Work'}
            </h3>
            <p className="text-gray-700 mb-6">
              Score: {result.score} / 100
            </p>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-white rounded p-3">
                <div className="text-sm text-gray-600">Duration</div>
                <div className="text-2xl font-bold text-blue-600">
                  {result.duration}s
                </div>
              </div>
              <div className="bg-white rounded p-3">
                <div className="text-sm text-gray-600">WPM</div>
                <div
                  className={`text-2xl font-bold ${
                    result.wpm >= 130 && result.wpm <= 150
                      ? 'text-green-600'
                      : 'text-orange-600'
                  }`}
                >
                  {result.wpm}
                </div>
              </div>
              <div className="bg-white rounded p-3">
                <div className="text-sm text-gray-600">Run Length</div>
                <div className="text-2xl font-bold text-purple-600">
                  {result.averageRunLength.toFixed(1)}
                </div>
              </div>
              <div className="bg-white rounded p-3">
                <div className="text-sm text-gray-600">Long Pauses</div>
                <div
                  className={`text-2xl font-bold ${
                    result.longPauses === 0 ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {result.longPauses}
                </div>
              </div>
            </div>

            {/* Feedback */}
            <div className="space-y-2 mb-6">
              {result.feedback.map((item, idx) => (
                <p key={idx} className="text-gray-700">
                  {item}
                </p>
              ))}
            </div>
          </div>

          {/* Next Button */}
          <button
            onClick={nextChallenge}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg transition-all duration-200"
          >
            {currentChallengeIndex < challenges.length - 1
              ? 'Next Challenge →'
              : 'Complete Marathon ✓'}
          </button>
        </div>
      )}
    </div>
  );
}
