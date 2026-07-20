"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import type { SessionWord } from "@/models/vocab/SessionWord";
import type { FallingWord } from "./dodgematch.types";
import { generateComboQuestions } from "./generateQuestions";

type Props = {
  words: SessionWord[];
  onFinish: (score: number) => void;
};

const GAME_CONFIG = {
  initialLives: 3,
  characterSpeed: 8,
  characterWidth: 48,
  characterHeight: 48,
  characterBottom: 32,
  spawnInterval: 1500,
  gameLoopFPS: 60,
};

const CHARACTER_HIT_BOX = { width: 50, height: 40 };
const WORD_HIT_BOX = { width: 80, height: 40 };

export default function DodgeMatchRunner({ words, onFinish }: Props) {
  const gameRef = useRef<HTMLDivElement>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(GAME_CONFIG.initialLives);
  const [gameOver, setGameOver] = useState(false);
  const [level, setLevel] = useState(1);

  const [characterX, setCharacterX] = useState(50);
  const [fallingWords, setFallingWords] = useState<FallingWord[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<any>(null);

  const wordQueueRef = useRef(words);
  const spawnTimerRef = useRef<NodeJS.Timeout>();
  const keysRef = useRef<{ left: boolean; right: boolean }>({ left: false, right: false });

  // 키보드 입력
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") keysRef.current.left = true;
      if (e.key === "ArrowRight") keysRef.current.right = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") keysRef.current.left = false;
      if (e.key === "ArrowRight") keysRef.current.right = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // 캐릭터 이동
  useEffect(() => {
    const moveInterval = setInterval(() => {
      setCharacterX((prev) => {
        let next = prev;
        if (keysRef.current.left) next = Math.max(0, prev - GAME_CONFIG.characterSpeed);
        if (keysRef.current.right) next = Math.min(100, prev + GAME_CONFIG.characterSpeed);
        return next;
      });
    }, 1000 / GAME_CONFIG.gameLoopFPS);

    return () => clearInterval(moveInterval);
  }, []);

  // 단어 생성
  useEffect(() => {
    if (gameOver) return;

    spawnTimerRef.current = setInterval(() => {
      if (wordQueueRef.current.length === 0) return;

      const randomWord = wordQueueRef.current[
        Math.floor(Math.random() * wordQueueRef.current.length)
      ];

      const newWord: FallingWord = {
        id: `${randomWord.id}-${Date.now()}`,
        text: randomWord.text,
        x: Math.random() * 100,
        y: 0,
        velocityY: 0.5 + level * 0.1,
        type: "CORRECT",
      };

      setFallingWords((prev) => [...prev, newWord]);
    }, GAME_CONFIG.spawnInterval);

    return () => {
      if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
    };
  }, [gameOver, level]);

  // 게임 물리 루프
  useEffect(() => {
    if (gameOver) return;

    const gameLoop = setInterval(() => {
      setFallingWords((prev) => {
        const updated = prev
          .map((w) => ({
            ...w,
            y: w.y + w.velocityY,
            velocityY: w.velocityY + 0.15,
          }))
          .filter((w) => {
            if (w.y > 100) {
              setLives((l) => {
                const newLives = Math.max(0, l - 1);
                return newLives;
              });
              return false;
            }
            return true;
          });

        return updated;
      });
    }, 1000 / GAME_CONFIG.gameLoopFPS);

    return () => clearInterval(gameLoop);
  }, [gameOver]);

  // 게임 종료 체크
  useEffect(() => {
    if (lives <= 0) {
      setGameOver(true);
      onFinish(score);
    }
  }, [lives, score, onFinish]);

  return (
    <div
      ref={gameRef}
      className="fixed inset-0 w-screen h-screen bg-gradient-to-b from-blue-400 to-purple-500 flex flex-col overflow-hidden"
    >
      {/* 헤더 */}
      <div className="bg-black/30 px-6 py-4 text-white flex justify-between items-center">
        <div className="text-2xl font-bold">Level {level}</div>
        <div className="text-3xl font-bold">{score} pts</div>
        <div className="text-2xl font-bold">
          {Array(lives).fill("❤️").join("")}
          {Array(Math.max(0, GAME_CONFIG.initialLives - lives)).fill("🩶").join("")}
        </div>
      </div>

      {/* 게임 영역 */}
      <div className="flex-1 relative overflow-hidden">
        {/* 떨어지는 단어들 */}
        {fallingWords.map((word) => (
          <div
            key={word.id}
            className="absolute px-3 py-2 bg-white/90 rounded-lg font-bold text-sm shadow-lg"
            style={{
              left: `${word.x}%`,
              top: `${word.y}%`,
              transform: "translate(-50%, -50%)",
              transition: "none",
            }}
          >
            {word.text}
          </div>
        ))}

        {/* 캐릭터 */}
        <div
          className="absolute text-4xl transition-all"
          style={{
            left: `${characterX}%`,
            bottom: `${GAME_CONFIG.characterBottom}px`,
            transform: "translateX(-50%)",
          }}
        >
          🧑
        </div>
      </div>

      {/* 게임 오버 */}
      {gameOver && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 text-center">
            <div className="text-5xl font-bold mb-4">🎮 Game Over!</div>
            <div className="text-3xl font-bold text-blue-600 mb-6">{score} Points</div>
            <button
              className="px-8 py-4 bg-blue-500 text-white rounded-xl font-bold text-lg hover:bg-blue-600 transition"
              onClick={() => onFinish(score)}
            >
              Return to Vocab
            </button>
          </div>
        </div>
      )}

      {/* 튜토리얼 */}
      <div className="absolute bottom-4 left-4 right-4 bg-black/50 text-white rounded-lg p-4 text-sm text-center">
        ⬅️ ➡️ to move | Catch words = +10 pts
      </div>
    </div>
  );
}
