import { GameBase } from './GameBase';
import { SentenceSprintsGame } from './games/SentenceSprintsGame';
import { ArcheryGame } from './games/ArcheryGame';
import { InferenceGame } from './games/InferenceGame';
import { ReadingBlankFillGame } from './games/ReadingBlankFillGame';
import type { GameType } from '../_types';

export class GameFactory {
  static createGame(gameType: GameType, userId: string, gameId: string): GameBase {
    switch (gameType) {
      case 'sentence_sprints':
        return new SentenceSprintsGame(userId, gameId);
      case 'archery':
        return new ArcheryGame(userId, gameId);
      case 'inference':
        return new InferenceGame(userId, gameId);
      case 'reading_blank_fill':
        return new ReadingBlankFillGame(userId, gameId);
      default:
        throw new Error(`Unknown game type: ${gameType}`);
    }
  }
}
