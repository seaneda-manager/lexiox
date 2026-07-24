import { useReducer, useCallback, useRef, useEffect } from 'react';

export type TestPhase =
  | 'idle'
  | 'task1_direction'      // Task 1 방향 안내 재생
  | 'task1_item'           // Task 1: 1~7번 문항 루프
  | 'task2_direction'      // Task 2 방향 안내 재생
  | 'task2_item'           // Task 2: 8~11번 문항 루프
  | 'end';

export interface RecordedAudio {
  itemNumber: number;
  audioBlob: Blob;
  duration: number;
}

export interface SpeakingTestState {
  phase: TestPhase;
  currentItemNumber: number;        // 1~11
  recordedAudios: RecordedAudio[];
  isRecording: boolean;
  recordingStartTime: number | null;
  audioLevelPercent: number;        // 0~100 (마이크 레벨)
}

type Action =
  | { type: 'START_TEST' }
  | { type: 'TASK1_DIRECTION_END' }
  | { type: 'MOVE_TO_ITEM'; payload: number }
  | { type: 'START_RECORDING' }
  | { type: 'STOP_RECORDING'; payload: { itemNumber: number; audioBlob: Blob; duration: number } }
  | { type: 'SET_AUDIO_LEVEL'; payload: number }
  | { type: 'TASK2_DIRECTION_END' }
  | { type: 'END_TEST' }
  | { type: 'RESET' };

const initialState: SpeakingTestState = {
  phase: 'idle',
  currentItemNumber: 0,
  recordedAudios: [],
  isRecording: false,
  recordingStartTime: null,
  audioLevelPercent: 0,
};

function reducer(state: SpeakingTestState, action: Action): SpeakingTestState {
  switch (action.type) {
    case 'START_TEST':
      return { ...state, phase: 'task1_direction' };

    case 'TASK1_DIRECTION_END':
      return { ...state, phase: 'task1_item', currentItemNumber: 1 };

    case 'MOVE_TO_ITEM':
      if (action.payload <= 7) {
        return { ...state, currentItemNumber: action.payload, phase: 'task1_item' };
      } else if (action.payload === 8) {
        return { ...state, phase: 'task2_direction' };
      } else if (action.payload <= 11) {
        return { ...state, currentItemNumber: action.payload, phase: 'task2_item' };
      } else {
        return { ...state, phase: 'end' };
      }

    case 'START_RECORDING':
      return {
        ...state,
        isRecording: true,
        recordingStartTime: Date.now(),
        audioLevelPercent: 0,
      };

    case 'STOP_RECORDING':
      return {
        ...state,
        isRecording: false,
        recordingStartTime: null,
        recordedAudios: [...state.recordedAudios, action.payload],
      };

    case 'SET_AUDIO_LEVEL':
      return { ...state, audioLevelPercent: action.payload };

    case 'TASK2_DIRECTION_END':
      return { ...state, phase: 'task2_item', currentItemNumber: 8 };

    case 'END_TEST':
      return { ...state, phase: 'end' };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

export function useSpeakingTestRunner() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  /**
   * 마이크 레벨 모니터링 시작
   */
  const startAudioLevelMonitoring = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const ctx = audioContextRef.current;
      const analyser = ctx.createAnalyser();
      analyserRef.current = analyser;

      const source = ctx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        dispatch({ type: 'SET_AUDIO_LEVEL', payload: Math.min(100, average / 2.55) });
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();

      return stream;
    } catch (err) {
      console.error('Failed to access microphone:', err);
      throw err;
    }
  }, []);

  /**
   * 레코딩 중지 및 정리
   */
  const stopAudioLevelMonitoring = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
      analyserRef.current = null;
    }
  }, []);

  /**
   * MediaRecorder 시작 (스트림이 주어질 때)
   */
  const startRecording = useCallback((stream: MediaStream) => {
    mediaRecorderRef.current = new MediaRecorder(stream);
    const chunks: BlobPart[] = [];

    mediaRecorderRef.current.ondataavailable = (e) => {
      chunks.push(e.data);
    };

    mediaRecorderRef.current.onstop = () => {
      const audioBlob = new Blob(chunks, { type: 'audio/webm' });
      const duration = Date.now() - (state.recordingStartTime || 0);
      dispatch({
        type: 'STOP_RECORDING',
        payload: {
          itemNumber: state.currentItemNumber,
          audioBlob,
          duration,
        },
      });
    };

    mediaRecorderRef.current.start();
    dispatch({ type: 'START_RECORDING' });
  }, [state.currentItemNumber, state.recordingStartTime]);

  /**
   * 레코딩 중지
   */
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
  }, []);

  /**
   * 다음 문항으로 이동
   */
  const moveToNextItem = useCallback(() => {
    const nextItemNumber = state.currentItemNumber + 1;
    if (nextItemNumber > 11) {
      dispatch({ type: 'END_TEST' });
    } else {
      dispatch({ type: 'MOVE_TO_ITEM', payload: nextItemNumber });
    }
  }, [state.currentItemNumber]);

  /**
   * 테스트 시작
   */
  const startTest = useCallback(() => {
    dispatch({ type: 'START_TEST' });
  }, []);

  /**
   * Task 1 방향 종료
   */
  const onTask1DirectionEnd = useCallback(() => {
    dispatch({ type: 'TASK1_DIRECTION_END' });
  }, []);

  /**
   * Task 2 방향 종료
   */
  const onTask2DirectionEnd = useCallback(() => {
    dispatch({ type: 'TASK2_DIRECTION_END' });
  }, []);

  /**
   * 테스트 리셋
   */
  const reset = useCallback(() => {
    stopAudioLevelMonitoring();
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
    }
    dispatch({ type: 'RESET' });
  }, [stopAudioLevelMonitoring]);

  // 클린업
  useEffect(() => {
    return () => {
      stopAudioLevelMonitoring();
    };
  }, [stopAudioLevelMonitoring]);

  return {
    state,
    startTest,
    onTask1DirectionEnd,
    onTask2DirectionEnd,
    moveToNextItem,
    startAudioLevelMonitoring,
    stopAudioLevelMonitoring,
    startRecording,
    stopRecording,
    reset,
  };
}
