"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { LListeningTest2026Linear, LListeningTrack2026 } from "@/models/listening";
import { validateAndShuffleIfNeeded } from "@/lib/utils/validateAnswerDistribution";

type Phase = "input" | "generating" | "edit" | "saving" | "locked";

const KIND_LABEL: Record<string, string> = {
  choose_response: "Choose a Response",
  conversation: "Conversation",
  academic_talk: "Academic Talk",
  academic_lecture: "Academic Lecture",
  announcement: "Announcement",
};

const KIND_COLOR: Record<string, string> = {
  choose_response: "bg-rose-100 text-rose-700",
  conversation: "bg-sky-100 text-sky-700",
  academic_talk: "bg-indigo-100 text-indigo-700",
  academic_lecture: "bg-indigo-100 text-indigo-700",
  announcement: "bg-amber-100 text-amber-700",
};

type TopicColor = "sky" | "amber" | "indigo";

const COLOR_CLASSES: Record<TopicColor, { label: string; border: string; ring: string; suggestBorder: string; suggestText: string; suggestHover: string; chipBorder: string; chipBg: string; chipText: string; chipHover: string }> = {
  sky: {
    label: "text-sky-700",
    border: "border-sky-200",
    ring: "focus:ring-sky-400",
    suggestBorder: "border-sky-300",
    suggestText: "text-sky-600",
    suggestHover: "hover:bg-sky-50",
    chipBorder: "border-sky-300",
    chipBg: "bg-sky-50",
    chipText: "text-sky-700",
    chipHover: "hover:bg-sky-100",
  },
  amber: {
    label: "text-amber-700",
    border: "border-amber-200",
    ring: "focus:ring-amber-400",
    suggestBorder: "border-amber-300",
    suggestText: "text-amber-600",
    suggestHover: "hover:bg-amber-50",
    chipBorder: "border-amber-300",
    chipBg: "bg-amber-50",
    chipText: "text-amber-700",
    chipHover: "hover:bg-amber-100",
  },
  indigo: {
    label: "text-indigo-700",
    border: "border-indigo-200",
    ring: "focus:ring-indigo-400",
    suggestBorder: "border-indigo-300",
    suggestText: "text-indigo-600",
    suggestHover: "hover:bg-indigo-50",
    chipBorder: "border-indigo-300",
    chipBg: "bg-indigo-50",
    chipText: "text-indigo-700",
    chipHover: "hover:bg-indigo-100",
  },
};

type TopicFieldConfig = {
  key: string;
  label: string;
  placeholder: string;
  color: TopicColor;
  suggestKind: "conversation" | "announcement" | "lecture1" | "lecture2";
};

// Module 1: 공통 baseline (모든 학생, 약 10-12문항)
const MODULE1_FIELDS: TopicFieldConfig[] = [
  { key: "m1_conversation", label: "📘 Module 1 - Conversation (1개)", placeholder: "예: Campus library hours", color: "sky", suggestKind: "conversation" },
  { key: "m1_announcement", label: "📘 Module 1 - Announcement (1개)", placeholder: "예: Career fair announcement", color: "amber", suggestKind: "announcement" },
  { key: "m1_lecture1", label: "📘 Module 1 - Academic Lecture (1개)", placeholder: "예: Marine biology", color: "indigo", suggestKind: "lecture1" },
];

// Module 2: Easy(Conversation x3 + Announcement x2) / Hard(Announcement x2 + Lecture x2)
const MODULE2_FIELDS: TopicFieldConfig[] = [
  { key: "m2_conversation1", label: "🟢 Module 2 Easy - Conversation #1", placeholder: "예: Campus library hours", color: "sky", suggestKind: "conversation" },
  { key: "m2_conversation2", label: "🟢 Module 2 Easy - Conversation #2", placeholder: "예: Dorm roommate conflict", color: "sky", suggestKind: "conversation" },
  { key: "m2_conversation3", label: "🟢 Module 2 Easy - Conversation #3", placeholder: "예: Course registration issue", color: "sky", suggestKind: "conversation" },
  { key: "m2_announcement1", label: "🟢🔴 Module 2 Easy/Hard - Announcement #1 (공유)", placeholder: "예: Career fair announcement", color: "amber", suggestKind: "announcement" },
  { key: "m2_announcement2", label: "🟢🔴 Module 2 Easy/Hard - Announcement #2 (공유)", placeholder: "예: Campus recycling program", color: "amber", suggestKind: "announcement" },
  { key: "m2_lecture1", label: "🔴 Module 2 Hard - Academic Lecture #1", placeholder: "예: Marine biology", color: "indigo", suggestKind: "lecture1" },
  { key: "m2_lecture2", label: "🔴 Module 2 Hard - Academic Lecture #2", placeholder: "예: Photosynthesis", color: "indigo", suggestKind: "lecture2" },
];

const ALL_FIELDS = [...MODULE1_FIELDS, ...MODULE2_FIELDS];

function AudioStatusBadge({ track }: { track: LListeningTrack2026 }) {
  if (track.taskKind === 'choose_response') {
    const questions = track.questions ?? [];
    const doneCount = questions.filter((q: any) => q.audioUrl).length;
    if (doneCount === 0) {
      return <span className="text-[11px] text-rose-500">질문별 음성 없음</span>;
    }
    if (doneCount === questions.length) {
      return <span className="text-[11px] text-emerald-600">🎧 전체 완료 ({doneCount}/{questions.length})</span>;
    }
    return <span className="text-[11px] text-amber-600">🎧 {doneCount}/{questions.length} 완료</span>;
  }
  return track.audioUrl ? (
    <span className="text-[11px] text-emerald-600">🎧 음성 완료</span>
  ) : (
    <span className="text-[11px] text-rose-500">음성 없음</span>
  );
}

function TopicInput({
  field,
  value,
  onChange,
  disabled,
  loadingSuggestion,
  onSuggest,
  suggestionList,
  onSelectSuggestion,
}: {
  field: TopicFieldConfig;
  value: string;
  onChange: (val: string) => void;
  disabled: boolean;
  loadingSuggestion: boolean;
  onSuggest: () => void;
  suggestionList: string[];
  onSelectSuggestion: (topic: string) => void;
}) {
  const c = COLOR_CLASSES[field.color];
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className={`text-xs font-semibold ${c.label}`}>{field.label}</label>
        <button
          onClick={onSuggest}
          disabled={loadingSuggestion || disabled}
          className={`text-[10px] px-2 py-1 rounded border ${c.suggestBorder} ${c.suggestText} ${c.suggestHover} disabled:opacity-50`}
        >
          {loadingSuggestion ? '추천 중…' : '💡 추천'}
        </button>
      </div>
      <input
        className={`w-full rounded-lg border ${c.border} px-3 py-2 text-sm focus:outline-none focus:ring-2 ${c.ring} disabled:bg-gray-50`}
        placeholder={field.placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
      {suggestionList.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-1">
          {suggestionList.map((topic, i) => (
            <button
              key={i}
              onClick={() => onSelectSuggestion(topic)}
              className={`text-[11px] px-2.5 py-1 rounded-full border ${c.chipBorder} ${c.chipBg} ${c.chipText} ${c.chipHover} transition cursor-pointer`}
            >
              {topic}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ListeningTestGeneratorClient() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("input");

  const [topics, setTopics] = useState<Record<string, string>>(
    Object.fromEntries(ALL_FIELDS.map(f => [f.key, ""]))
  );

  const [error, setError] = useState<string | null>(null);
  const [test, setTest] = useState<LListeningTest2026Linear | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);

  // 주제 추천 상태
  const [suggestions, setSuggestions] = useState<Record<string, string[]>>({});
  const [loadingSuggestions, setLoadingSuggestions] = useState<Record<string, boolean>>({});

  const canGenerate = ALL_FIELDS.every(f => topics[f.key]?.trim());

  const setTopic = (key: string, value: string) => setTopics(prev => ({ ...prev, [key]: value }));

  const handleSuggestTopics = useCallback(
    async (field: TopicFieldConfig) => {
      setLoadingSuggestions(prev => ({ ...prev, [field.key]: true }));
      setError(null);
      try {
        // 이 화면에서 이미 골라놓은 주제는 다른 필드 추천에서도 제외
        const avoid = Object.values(topics).filter(v => v.trim().length > 0);

        const res = await fetch('/api/admin/updated-listening/suggest-topics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ kind: field.suggestKind, avoid }),
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error ?? 'Failed to suggest topics');

        setSuggestions(prev => ({ ...prev, [field.key]: data.suggestions }));
      } catch (e: any) {
        setError(`주제 추천 실패: ${e.message}`);
      } finally {
        setLoadingSuggestions(prev => ({ ...prev, [field.key]: false }));
      }
    },
    [topics]
  );

  const handleSelectSuggestion = (key: string, topic: string) => {
    setTopic(key, topic);
    setSuggestions(prev => ({ ...prev, [key]: [] }));
  };

  const [autoFilling, setAutoFilling] = useState(false);

  // 실제 문제 생성(module1/hard/easy)과 동일하게, 주제 추천도 3그룹 단위로
  // 한 번에 받아온다 (필드 10개를 하나씩 순차 호출하던 방식 대신 3회 호출).
  const handleAutoFillAll = useCallback(async () => {
    setAutoFilling(true);
    setError(null);
    try {
      const filled: Record<string, string> = { ...topics };
      const avoid = () => Object.values(filled).filter(v => v.trim().length > 0);

      const fetchTier = async (tier: 'module1' | 'hard' | 'easy') => {
        const res = await fetch('/api/admin/updated-listening/suggest-topics', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tier, avoid: avoid() }),
        });
        const data = await res.json();
        if (!data.ok) throw new Error(data.error ?? 'Failed to suggest topics');
        return data.topics as { conversation?: string[]; announcement?: string[]; lecture?: string[] };
      };

      // Module 1: conversation / announcement / lecture 각 1개
      if (!filled.m1_conversation?.trim() || !filled.m1_announcement?.trim() || !filled.m1_lecture1?.trim()) {
        const t = await fetchTier('module1');
        if (!filled.m1_conversation?.trim() && t.conversation?.[0]) filled.m1_conversation = t.conversation[0];
        if (!filled.m1_announcement?.trim() && t.announcement?.[0]) filled.m1_announcement = t.announcement[0];
        if (!filled.m1_lecture1?.trim() && t.lecture?.[0]) filled.m1_lecture1 = t.lecture[0];
      }

      // Module 2 - Hard: lecture 2개 + announcement 2개 (announcement는 easy와 공유)
      if (
        !filled.m2_lecture1?.trim() ||
        !filled.m2_lecture2?.trim() ||
        !filled.m2_announcement1?.trim() ||
        !filled.m2_announcement2?.trim()
      ) {
        const t = await fetchTier('hard');
        if (!filled.m2_lecture1?.trim() && t.lecture?.[0]) filled.m2_lecture1 = t.lecture[0];
        if (!filled.m2_lecture2?.trim() && t.lecture?.[1]) filled.m2_lecture2 = t.lecture[1];
        if (!filled.m2_announcement1?.trim() && t.announcement?.[0]) filled.m2_announcement1 = t.announcement[0];
        if (!filled.m2_announcement2?.trim() && t.announcement?.[1]) filled.m2_announcement2 = t.announcement[1];
      }

      // Module 2 - Easy: conversation 3개
      if (
        !filled.m2_conversation1?.trim() ||
        !filled.m2_conversation2?.trim() ||
        !filled.m2_conversation3?.trim()
      ) {
        const t = await fetchTier('easy');
        if (!filled.m2_conversation1?.trim() && t.conversation?.[0]) filled.m2_conversation1 = t.conversation[0];
        if (!filled.m2_conversation2?.trim() && t.conversation?.[1]) filled.m2_conversation2 = t.conversation[1];
        if (!filled.m2_conversation3?.trim() && t.conversation?.[2]) filled.m2_conversation3 = t.conversation[2];
      }

      setTopics(filled);
    } catch (e: any) {
      setError(`전체 주제 자동채우기 실패: ${e.message}`);
    } finally {
      setAutoFilling(false);
    }
  }, [topics]);

  const handleGenerate = useCallback(async () => {
    if (!canGenerate) return;
    setError(null);
    setPhase("generating");
    try {
      const res = await fetch("/api/admin/updated-listening/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          module1: {
            conversationTopic: topics.m1_conversation,
            announcementTopic: topics.m1_announcement,
            lectureTopic1: topics.m1_lecture1,
          },
          module2: {
            conversationTopic: topics.m2_conversation1,
            conversationTopic2: topics.m2_conversation2,
            conversationTopic3: topics.m2_conversation3,
            announcementTopic: topics.m2_announcement1,
            announcementTopic2: topics.m2_announcement2,
            lectureTopic1: topics.m2_lecture1,
            lectureTopic2: topics.m2_lecture2,
          },
        }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "Generation failed");
      setTest(data.payload as LListeningTest2026Linear);
      setPhase("edit");
    } catch (e: any) {
      setError(e.message);
      setPhase("input");
    }
  }, [topics, canGenerate]);

  const setLabel = (label: string) =>
    setTest((prev) => prev ? { ...prev, meta: { ...prev.meta, label } } : prev);

  const [generatingExplanations, setGeneratingExplanations] = useState<Set<string>>(new Set());

  const generateExplanations = useCallback(
    async (trackId: string, questionId: string) => {
      if (!test) return;

      let track: any = null;
      for (const group of getGroups(test)) {
        const found = group.tracks.find((t) => t.id === trackId);
        if (found) {
          track = found;
          break;
        }
      }

      if (!track) {
        setError("트랙을 찾을 수 없습니다");
        return;
      }

      const q = track.questions?.find((qq: any) => qq.id === questionId);
      if (!q || !track.transcript) {
        setError("문제 또는 스크립트를 찾을 수 없습니다");
        return;
      }

      const key = `${trackId}-${questionId}`;
      setGeneratingExplanations((prev) => new Set([...prev, key]));
      setError(null);

      try {
        const res = await fetch("/api/admin/updated-listening/generate-explanations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript: track.transcript,
            question: q.stem,
            choices: q.choices,
          }),
        });

        const data = await res.json();
        if (!data.ok) throw new Error(data.error ?? "Failed to generate explanations");

        // 각 선택지에 해석 할당
        for (let ci = 0; ci < data.explanations.length; ci++) {
          setChoiceExplanation(trackId, questionId, ci, data.explanations[ci]);
        }
      } catch (e: any) {
        setError(`해석 생성 실패: ${e.message}`);
      } finally {
        setGeneratingExplanations((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [test]
  );

  function getGroups(testObj: LListeningTest2026Linear) {
    const groups: any[] = [];
    if (testObj.modules?.[0]?.items?.length) {
      groups.push({ label: '📘 Module 1 (공통)', tracks: testObj.modules[0].items });
    }
    if (testObj.stage2Pool?.hard?.items?.length) {
      groups.push({ label: '🔴 Module 2 - Hard', tracks: testObj.stage2Pool.hard.items });
    }
    if (testObj.stage2Pool?.easy?.items?.length) {
      groups.push({ label: '🟢 Module 2 - Easy', tracks: testObj.stage2Pool.easy.items });
    }
    return groups;
  }

  const setTrackTranscript = (trackId: string, transcript: string) =>
    setTest((prev) => {
      if (!prev) return prev;
      const updateTrack = (t: LListeningTrack2026) =>
        t.id === trackId ? { ...t, transcript } : t;
      return {
        ...prev,
        modules: prev.modules?.map(m => ({
          ...m,
          items: m.items.map(updateTrack),
        })),
        stage2Pool: prev.stage2Pool ? {
          ...prev.stage2Pool,
          hard: { items: prev.stage2Pool.hard.items.map(updateTrack) },
          easy: { items: prev.stage2Pool.easy.items.map(updateTrack) },
        } : undefined,
      };
    });

  const setChoiceText = (trackId: string, questionId: string, choiceIndex: number, text: string) =>
    setTest((prev) => {
      if (!prev) return prev;
      const updateTrack = (t: LListeningTrack2026) => {
        if (t.id !== trackId) return t;
        return {
          ...t,
          questions: t.questions?.map(q =>
            q.id === questionId
              ? {
                  ...q,
                  choices: q.choices?.map((c, i) => i === choiceIndex ? { ...c, text } : c),
                }
              : q
          ),
        };
      };
      return {
        ...prev,
        modules: prev.modules?.map(m => ({
          ...m,
          items: m.items.map(updateTrack),
        })),
        stage2Pool: prev.stage2Pool ? {
          ...prev.stage2Pool,
          hard: { items: prev.stage2Pool.hard.items.map(updateTrack) },
          easy: { items: prev.stage2Pool.easy.items.map(updateTrack) },
        } : undefined,
      };
    });

  const setChoiceExplanation = (trackId: string, questionId: string, choiceIndex: number, explanation: string) =>
    setTest((prev) => {
      if (!prev) return prev;
      const updateTrack = (t: LListeningTrack2026) => {
        if (t.id !== trackId) return t;
        return {
          ...t,
          questions: t.questions?.map(q =>
            q.id === questionId
              ? {
                  ...q,
                  choices: q.choices?.map((c, i) => i === choiceIndex ? { ...c, explanation } : c),
                }
              : q
          ),
        };
      };
      return {
        ...prev,
        modules: prev.modules?.map(m => ({
          ...m,
          items: m.items.map(updateTrack),
        })),
        stage2Pool: prev.stage2Pool ? {
          ...prev.stage2Pool,
          hard: { items: prev.stage2Pool.hard.items.map(updateTrack) },
          easy: { items: prev.stage2Pool.easy.items.map(updateTrack) },
        } : undefined,
      };
    });

  const extractListeningAnswers = (data: any): string[] => {
    const answers: string[] = [];
    const traverse = (obj: any): void => {
      if (!obj) return;
      if (obj.questions && Array.isArray(obj.questions)) {
        obj.questions.forEach((q: any) => {
          if (q.choices && Array.isArray(q.choices)) {
            const correct = q.choices.find((c: any) => c.correct);
            if (correct?.id) {
              const letter = extractChoiceLetter(correct.id);
              answers.push(letter);
            }
          }
        });
      }
      if (obj.items && Array.isArray(obj.items)) {
        obj.items.forEach((item: any) => traverse(item));
      }
      if (obj.modules && Array.isArray(obj.modules)) {
        obj.modules.forEach((mod: any) => traverse(mod));
      }
    };
    traverse(data);
    return answers;
  };

  const extractChoiceLetter = (choiceId: string): string => {
    const match = choiceId.match(/(\d+)/);
    if (!match) return 'A';
    const num = parseInt(match[1], 10);
    return String.fromCharCode(64 + num); // 1→A, 2→B, 3→C, 4→D
  };

  const applyShuffledListeningAnswers = (data: any, shuffledAnswers: string[]): void => {
    let answerIndex = 0;
    const traverse = (obj: any): void => {
      if (!obj) return;
      if (obj.questions && Array.isArray(obj.questions)) {
        obj.questions.forEach((q: any) => {
          if (q.choices && Array.isArray(q.choices)) {
            if (answerIndex < shuffledAnswers.length) {
              const newCorrectAnswer = shuffledAnswers[answerIndex++];
              q.choices.forEach((c: any) => {
                const choiceLetter = extractChoiceLetter(c.id);
                c.correct = choiceLetter === newCorrectAnswer;
              });
            }
          }
        });
      }
      if (obj.items && Array.isArray(obj.items)) {
        obj.items.forEach((item: any) => traverse(item));
      }
      if (obj.modules && Array.isArray(obj.modules)) {
        obj.modules.forEach((mod: any) => traverse(mod));
      }
    };
    traverse(data);
  };

  const handleShuffle = useCallback(() => {
    if (!test) return;
    setError(null);
    try {
      const answers = extractListeningAnswers(test);
      const { answers: shuffledAnswers, wasShuffled, validation } = validateAndShuffleIfNeeded(answers);

      if (wasShuffled) {
        setTest((prev) => {
          if (!prev) return prev;
          const next = structuredClone(prev) as typeof test;
          if (next) applyShuffledListeningAnswers(next, shuffledAnswers);
          return next;
        });
        setError(`✅ Shuffled: ${validation.distribution.A}A/${validation.distribution.B}B/${validation.distribution.C}C/${validation.distribution.D}D`);
      } else {
        setError(`✅ Already random: ${validation.distribution.A}A/${validation.distribution.B}B/${validation.distribution.C}C/${validation.distribution.D}D`);
      }
    } catch (e: any) {
      setError(`❌ Error: ${e?.message ?? 'Unknown error'}`);
    }
  }, [test]);

  const handleSave = useCallback(async () => {
    if (!test) return;
    setError(null);
    setPhase("saving");
    try {
      const res = await fetch("/api/admin/updated-listening/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ test }),
      });
      const data = await res.json();
      if (!data.ok) throw new Error(data.error ?? "Save failed");
      setSavedId(test.meta.id);
      setPhase("edit");
    } catch (e: any) {
      setError(e.message);
      setPhase("edit");
    }
  }, [test]);

  const handleStartTest = useCallback(async () => {
    const id = savedId ?? test?.meta.id;
    if (!id) { setError("먼저 저장하세요."); return; }

    // 저장되지 않은 변경사항이 있으면 저장
    if (!savedId && test) {
      setError(null);
      setPhase("saving");
      try {
        await fetch("/api/admin/updated-listening/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ test }),
        });
      } catch (e: any) {
        setError(e.message);
        setPhase("edit");
        return;
      }
    }

    // 테스트 시작
    window.location.href = `/listening/session/${id}`;
  }, [savedId, test]);

  const module1Tracks = test?.modules?.[0]?.items ?? [];
  const hardTracks = test?.stage2Pool?.hard?.items ?? [];
  const easyTracks = test?.stage2Pool?.easy?.items ?? [];

  return (
    <div className="space-y-6">
      {/* Topic Inputs */}
      <section className="rounded-xl border bg-white p-4 shadow-sm space-y-6">
        <div className="flex items-center justify-between rounded-lg bg-violet-50 border border-violet-200 px-4 py-3">
          <p className="text-xs text-violet-700">
            10개 필드를 하나씩 채우기 번거로우면, 아래 버튼으로 빈 필드를 한 번에 자동 채울 수 있습니다.
          </p>
          <button
            onClick={handleAutoFillAll}
            disabled={autoFilling || phase === "generating"}
            className="shrink-0 rounded-lg border border-violet-500 bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100 disabled:opacity-50"
          >
            {autoFilling ? "채우는 중…" : "🎲 빈 주제 전체 자동채우기"}
          </button>
        </div>

        <div>
          <h2 className="text-sm font-semibold mb-4">
            📘 Module 1 (공통, 약 10-12문항) 주제 3가지
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {MODULE1_FIELDS.map(field => (
              <TopicInput
                key={field.key}
                field={field}
                value={topics[field.key]}
                onChange={(val) => setTopic(field.key, val)}
                disabled={phase === "generating" || autoFilling}
                loadingSuggestion={!!loadingSuggestions[field.key]}
                onSuggest={() => handleSuggestTopics(field)}
                suggestionList={suggestions[field.key] ?? []}
                onSelectSuggestion={(topic) => handleSelectSuggestion(field.key, topic)}
              />
            ))}
          </div>
        </div>

        <div>
          <h2 className="text-sm font-semibold mb-4">
            🟢 Module 2 Easy (약 10-12문항) + 🔴 Module 2 Hard (약 10-12문항) 주제 7가지{" "}
            <span className="text-[11px] text-gray-500 font-normal">
              (Easy: Conversation×3 + Announcement×2 · Hard: Announcement×2 + Lecture×2)
            </span>
          </h2>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            {MODULE2_FIELDS.map(field => (
              <TopicInput
                key={field.key}
                field={field}
                value={topics[field.key]}
                onChange={(val) => setTopic(field.key, val)}
                disabled={phase === "generating" || autoFilling}
                loadingSuggestion={!!loadingSuggestions[field.key]}
                onSuggest={() => handleSuggestTopics(field)}
                suggestionList={suggestions[field.key] ?? []}
                onSelectSuggestion={(topic) => handleSelectSuggestion(field.key, topic)}
              />
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleGenerate}
            disabled={!canGenerate || phase === "generating"}
            className="rounded-lg border border-violet-500 bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700 disabled:opacity-50"
          >
            {phase === "generating" ? "생성 중…" : test ? "재생성" : "AI 생성"}
          </button>
        </div>
        {phase === "generating" && (
          <p className="text-xs text-gray-500 animate-pulse">
            Claude가 Module 1과 Module 2 (Hard/Easy) 스크립트·문제를 생성 중입니다 (약 20–40초)…
            음성은 생성되지 않으니, 저장 후 수정 페이지에서 트랙별로 음성생성 버튼을 눌러주세요.
          </p>
        )}
        {error && <p className="text-xs text-rose-600">{error}</p>}
      </section>

      {test && phase !== "generating" && (
        <>
          {/* Label */}
          <section className="rounded-xl border bg-white p-4 shadow-sm space-y-2">
            <label className="text-xs font-semibold text-gray-700">시험 제목</label>
            <input
              className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              value={test.meta.label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </section>

          {/* Module 1 Summary */}
          <div className="rounded-xl border bg-violet-50 p-4 shadow-sm">
            <h3 className="text-sm font-bold text-violet-900 mb-3">📘 Module 1 (공통 — {module1Tracks.length}개 트랙)</h3>
            <div className="space-y-2">
              {module1Tracks.map((track: LListeningTrack2026) => (
                <div key={track.id} className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${KIND_COLOR[track.taskKind] ?? "bg-gray-100 text-gray-600"}`}>
                    {KIND_LABEL[track.taskKind] ?? track.taskKind}
                  </span>
                  <span className="text-xs font-medium text-gray-900 flex-1 truncate">{track.title}</span>
                  <span className="text-[11px] text-gray-400">{track.questions?.length ?? 0}Q</span>
                  <AudioStatusBadge track={track} />
                </div>
              ))}
            </div>
          </div>

          {/* Module 2 Hard Summary */}
          <div className="rounded-xl border bg-amber-50 p-4 shadow-sm">
            <h3 className="text-sm font-bold text-amber-900 mb-3">🔴 Module 2 - Hard ({hardTracks.length}개 트랙)</h3>
            <div className="space-y-2">
              {hardTracks.map((track: LListeningTrack2026) => (
                <div key={track.id} className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${KIND_COLOR[track.taskKind] ?? "bg-gray-100 text-gray-600"}`}>
                    {KIND_LABEL[track.taskKind] ?? track.taskKind}
                  </span>
                  <span className="text-xs font-medium text-gray-900 flex-1 truncate">{track.title}</span>
                  <span className="text-[11px] text-gray-400">{track.questions?.length ?? 0}Q</span>
                  <AudioStatusBadge track={track} />
                </div>
              ))}
            </div>
          </div>

          {/* Module 2 Easy Summary */}
          <div className="rounded-xl border bg-blue-50 p-4 shadow-sm">
            <h3 className="text-sm font-bold text-blue-900 mb-3">🟢 Module 2 - Easy ({easyTracks.length}개 트랙)</h3>
            <div className="space-y-2">
              {easyTracks.map((track: LListeningTrack2026) => (
                <div key={track.id} className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${KIND_COLOR[track.taskKind] ?? "bg-gray-100 text-gray-600"}`}>
                    {KIND_LABEL[track.taskKind] ?? track.taskKind}
                  </span>
                  <span className="text-xs font-medium text-gray-900 flex-1 truncate">{track.title}</span>
                  <span className="text-[11px] text-gray-400">{track.questions?.length ?? 0}Q</span>
                  <AudioStatusBadge track={track} />
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-gray-500">
            ⚠️ 아직 음성이 생성되지 않았습니다. 저장 후{" "}
            <span className="font-semibold text-violet-600">수정 페이지</span>에서 스크립트를 검토하고
            트랙별로 🎧 음성생성 버튼을 눌러주세요.
          </p>

          {/* Actions */}
          <div className="flex items-center justify-between rounded-xl border bg-white p-4 shadow-sm">
            <div className="text-xs text-gray-400">
              {savedId ? `저장됨 (ID: ${savedId.slice(0, 8)}…)` : "아직 저장되지 않았습니다."}
            </div>
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={phase === "saving"} className="rounded-lg border px-4 py-2 text-xs font-medium hover:bg-gray-50 disabled:opacity-50">
                {phase === "saving" ? "저장 중…" : "임시 저장"}
              </button>
              <button onClick={handleShuffle} disabled={phase === "saving"} className="rounded-lg border border-blue-600 bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50">
                🔀 셔플 답변
              </button>
              <button onClick={handleStartTest} disabled={phase === "saving"} className="rounded-lg border border-green-600 bg-green-600 px-4 py-2 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50">
                🎧 테스트 시작
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
