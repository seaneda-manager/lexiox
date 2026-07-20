// normalized utf8
'use client';

import ListeningTestRunner from './ListeningTestRunner';
import type { Passage } from '@/types/test';

export default function ListeningRunnerAdapter({
  passage,
  audioUrl,            // 占쏙옙占쏙옙 Runner占쏙옙占쏙옙占쏙옙 占쏙옙占쏙옙占쏙옙占?占쏙옙占쏙옙占쏙옙, 占쏙옙占쏙옙 AudioPanel 占쏘에 占쏙옙 占쏙옙 占쌍억옙 占쏙옙占쌤듸옙
  onFinish,            // Runner 占시그댐옙처占쏙옙 占쏙옙占쏘서 占쏙옙占쏙옙占쏙옙占쏙옙 占쏙옙占쏙옙 (占십울옙占?Runner 占쏙옙占쏙옙 prop 占쌩곤옙)
}: {
  passage: Passage;
  audioUrl: string;
  onFinish?: (sessionId: string) => void;
}) {
  // Passage -> initialSetId 占쏙옙占쏙옙 (setId占쏙옙 占쏙옙占쏙옙占쏙옙 占쎌선, 占쏙옙占쏙옙占쏙옙 id 占쏙옙占?
  const initialSetId = (passage as any).setId ?? passage.id;

  return (
    <ListeningTestRunner
      initialSetId={initialSetId}
      autoStart
      debug={false}
    />
  );
}




