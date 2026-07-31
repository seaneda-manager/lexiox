import { GameMetadata } from '../_types';

export const GAMES: Record<string, GameMetadata> = {
  sentence_sprints: {
    id: 'sentence_sprints',
    title: 'Sentence Sprints',
    description: '화면을 지나가는 문장의 핵심을 빠르게 파악하는 게임',
    emoji: '🏃',
    phase: 1,
    difficulty: 'easy',
    estimatedDuration: 5,
    featured: true,
  },
  archery: {
    id: 'archery',
    title: 'Vocabulary Archery',
    description: '활을 쏘아 올바른 단어의 의미를 맞추세요',
    emoji: '🎯',
    phase: 1,
    difficulty: 'medium',
    estimatedDuration: 5,
    featured: true,
  },
  inference: {
    id: 'inference',
    title: 'Inference Detectives',
    description: '텍스트에서 명시되지 않은 사실을 추론해내세요',
    emoji: '🔍',
    phase: 1,
    difficulty: 'hard',
    estimatedDuration: 8,
    featured: true,
  },
  // Phase 2 게임들 (향후 구현)
  bubble_pop: {
    id: 'bubble_pop',
    title: 'Bubble Pop',
    description: '떠다니는 단어 버블을 터치하여 문장을 완성하세요',
    emoji: '🫧',
    phase: 2,
    difficulty: 'medium',
    estimatedDuration: 6,
    featured: false,
  },
  read_recall: {
    id: 'read_recall',
    title: 'Read & Recall',
    description: '글을 읽고 기억해낸 내용으로 퀴즈를 푸세요',
    emoji: '🧠',
    phase: 2,
    difficulty: 'medium',
    estimatedDuration: 7,
    featured: false,
  },
  mad_libs: {
    id: 'mad_libs',
    title: 'Mad Libs',
    description: '문맥에 맞는 단어를 선택해 이야기를 완성하세요',
    emoji: '📖',
    phase: 2,
    difficulty: 'hard',
    estimatedDuration: 6,
    featured: false,
  },
  // Phase 3 게임들 (향후 구현)
  storytelling: {
    id: 'storytelling',
    title: 'Interactive Storytelling & Quiz',
    description: '이야기를 읽고 주인공의 행동을 선택하세요',
    emoji: '📚',
    phase: 3,
    difficulty: 'hard',
    estimatedDuration: 10,
    featured: false,
  },
  scavenger_hunt: {
    id: 'scavenger_hunt',
    title: 'Scavenger Hunt',
    description: '텍스트에서 특정 단어와 문장을 찾아보세요',
    emoji: '🔎',
    phase: 3,
    difficulty: 'medium',
    estimatedDuration: 7,
    featured: false,
  },
  picture_word: {
    id: 'picture_word',
    title: 'Picture-to-Word',
    description: '그림을 보고 올바른 단어를 선택하세요',
    emoji: '🖼️',
    phase: 3,
    difficulty: 'easy',
    estimatedDuration: 8,
    featured: false,
  },
  story_creator: {
    id: 'story_creator',
    title: 'Story Creator',
    description: '캐릭터와 배경을 선택해 자신의 이야기를 만들어보세요',
    emoji: '✨',
    phase: 3,
    difficulty: 'hard',
    estimatedDuration: 15,
    featured: false,
  },
};

export const PHASE_1_GAMES = ['sentence_sprints', 'archery', 'inference'];
export const PHASE_2_GAMES = ['bubble_pop', 'read_recall', 'mad_libs'];
export const PHASE_3_GAMES = ['storytelling', 'scavenger_hunt', 'picture_word', 'story_creator'];

export function getGamesByPhase(phase: 1 | 2 | 3) {
  if (phase === 1) return PHASE_1_GAMES;
  if (phase === 2) return PHASE_2_GAMES;
  if (phase === 3) return PHASE_3_GAMES;
  return [];
}
