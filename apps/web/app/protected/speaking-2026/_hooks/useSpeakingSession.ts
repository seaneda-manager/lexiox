'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { SpeakingSession, SpeakingSectionState, RecordingBlob } from './types';

interface SpeakingSessionStore {
  session: SpeakingSession | null;
  currentState: SpeakingSectionState;
  currentItemIndex: number;

  // Actions
  initSession: () => void;
  setState: (state: SpeakingSectionState) => void;
  nextItem: () => void;
  previousItem: () => void;
  saveRecording: (itemId: string, blob: Blob, duration: number) => void;
  saveTranscript: (itemId: string, transcript: string) => void;
  saveScore: (itemId: string, score: number) => void;
  endSession: () => void;
  resetSession: () => void;

  // Getters
  getRecording: (itemId: string) => Blob | undefined;
  getTranscript: (itemId: string) => string | undefined;
  getScore: (itemId: string) => number | undefined;
}

const INITIAL_SESSION: SpeakingSession = {
  sessionId: `speaking_${Date.now()}`,
  startTime: new Date(),
  currentState: 'AUDIO_CHECK',
  currentItemIndex: 0,
  recordings: new Map(),
  transcripts: new Map(),
  scores: new Map(),
};

export const useSpeakingSession = create<SpeakingSessionStore>()(
  persist(
    (set, get) => ({
      session: null,
      currentState: 'AUDIO_CHECK',
      currentItemIndex: 0,

      initSession: () => {
        set({
          session: { ...INITIAL_SESSION, sessionId: `speaking_${Date.now()}` },
          currentState: 'AUDIO_CHECK',
          currentItemIndex: 0,
        });
      },

      setState: (state: SpeakingSectionState) => {
        set({ currentState: state });
      },

      nextItem: () => {
        set((state) => ({
          currentItemIndex: state.currentItemIndex + 1,
        }));
      },

      previousItem: () => {
        set((state) => ({
          currentItemIndex: Math.max(0, state.currentItemIndex - 1),
        }));
      },

      saveRecording: (itemId: string, blob: Blob, duration: number) => {
        set((state) => {
          if (state.session) {
            state.session.recordings.set(itemId, blob);
          }
          return state;
        });
      },

      saveTranscript: (itemId: string, transcript: string) => {
        set((state) => {
          if (state.session) {
            state.session.transcripts.set(itemId, transcript);
          }
          return state;
        });
      },

      saveScore: (itemId: string, score: number) => {
        set((state) => {
          if (state.session) {
            state.session.scores.set(itemId, score);
          }
          return state;
        });
      },

      endSession: () => {
        set((state) => {
          if (state.session) {
            state.session.currentState = 'SECTION_COMPLETE';
          }
          return state;
        });
      },

      resetSession: () => {
        set({
          session: null,
          currentState: 'AUDIO_CHECK',
          currentItemIndex: 0,
        });
      },

      getRecording: (itemId: string) => {
        const session = get().session;
        return session?.recordings.get(itemId);
      },

      getTranscript: (itemId: string) => {
        const session = get().session;
        return session?.transcripts.get(itemId);
      },

      getScore: (itemId: string) => {
        const session = get().session;
        return session?.scores.get(itemId);
      },
    }),
    {
      name: 'speaking-session',
      version: 1,
      serialize: (state) => {
        // Map을 JSON으로 변환
        const session = state.state.session;
        if (!session) return JSON.stringify(state);

        return JSON.stringify({
          ...state,
          state: {
            ...state.state,
            session: {
              ...session,
              recordings: Object.fromEntries(session.recordings),
              transcripts: Object.fromEntries(session.transcripts),
              scores: Object.fromEntries(session.scores),
            },
          },
        });
      },
      deserialize: (str) => {
        const parsed = JSON.parse(str);
        const session = parsed.state?.session;
        if (session) {
          return {
            ...parsed,
            state: {
              ...parsed.state,
              session: {
                ...session,
                startTime: new Date(session.startTime),
                recordings: new Map(Object.entries(session.recordings || {})),
                transcripts: new Map(Object.entries(session.transcripts || {})),
                scores: new Map(Object.entries(session.scores || {})),
              },
            },
          };
        }
        return parsed;
      },
    }
  )
);
