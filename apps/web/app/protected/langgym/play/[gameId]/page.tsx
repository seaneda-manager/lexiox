import { Suspense } from 'react';
import SentenceSprintsPlay from '../../_components/games/SentenceSprintsPlay';
import ArcheryPlay from '../../_components/games/ArcheryPlay';
import InferencePlay from '../../_components/games/InferencePlay';

async function GamePlayContent({
  gameId,
}: {
  gameId: string;
}) {
  const renderGame = () => {
    switch (gameId) {
      case 'sentence_sprints':
        return <SentenceSprintsPlay />;
      case 'archery':
        return <ArcheryPlay />;
      case 'inference':
        return <InferencePlay />;
      default:
        return <div>Unknown game</div>;
    }
  };

  return renderGame();
}

export default async function GamePlayPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;

  return (
    <Suspense fallback={<div>Loading...</div>}>
      <GamePlayContent gameId={gameId} />
    </Suspense>
  );
}
