"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import type { SessionWord } from "@/models/vocab/SessionWord";
import type { Asteroid, Bullet, GameState, GameConfig, Task, Weapon } from "./asteroid.types";
import { generateTask, getNextTaskTypeIndex } from "./taskGenerator";

type Props = {
  words: SessionWord[];
  onFinish: (score: number) => void;
};

const GAME_CONFIG: GameConfig = {
  initialShield: 100,
  initialBaseVelocity: 0.08, // ~5px/초 (매우 느린 속도, 충분한 여유)
  asteroidSpawnInterval: 1200,
  regularAsteroidRatio: 0.3,
  maxAsteroids: 10,
  pointsPerCorrectAnswer: 10,
  upgradeThreshold: 50,
};

const UPGRADE_SEQUENCE = [
  { name: "발사 속도", stat: "fireRate", value: -100 }, // 100ms 단축
  { name: "탄환 크기", stat: "bulletSize", value: 0.3 }, // 1.3배
  { name: "범위", stat: "range", value: 0.2 }, // 1.2배
  { name: "연쇄 폭발", stat: "chainExplosion", value: true },
  { name: "보호막 재생", stat: "shieldRegen", value: true },
  { name: "특수탄 자동", stat: "autoSpecial", value: true },
];

export default function AsteroidGame({ words, onFinish }: Props) {
  const gameRef = useRef<HTMLDivElement>(null);
  const keysRef = useRef<{ left: boolean; right: boolean; space: boolean }>({
    left: false,
    right: false,
    space: false,
  });

  const [gameState, setGameState] = useState<GameState>({
    level: 1,
    score: 0,
    shield: GAME_CONFIG.initialShield,
    ammunition: 0,
    points: 0,
    asteroids: [],
    bullets: [],
    currentTask: null,
    baseVelocity: GAME_CONFIG.initialBaseVelocity,
    speedMultiplier: 1,
    weapon: {
      fireRate: 400, // 2.5발/초
      bulletSize: 1,
      range: 1,
      chainExplosion: false,
      shieldRegen: false,
      autoSpecial: false,
    },
    gameOver: false,
    playerX: 50,
  });

  const taskTypeIndexRef = useRef(0);
  const wordQueueRef = useRef(words);
  const spawnTimerRef = useRef<NodeJS.Timeout | null>(null);
  const fireTimerRef = useRef<NodeJS.Timeout | null>(null);
  const upgradeCountRef = useRef(0);

  // 초기 Task 생성
  useEffect(() => {
    if (wordQueueRef.current.length === 0) return;
    const randomWord = wordQueueRef.current[Math.floor(Math.random() * wordQueueRef.current.length)];
    const task = generateTask(randomWord, taskTypeIndexRef.current);
    if (task) {
      setGameState((prev) => ({ ...prev, currentTask: task }));
      taskTypeIndexRef.current = getNextTaskTypeIndex(taskTypeIndexRef.current);
    }
  }, []);

  // 키보드 이벤트
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") keysRef.current.left = true;
      if (e.key === "ArrowRight") keysRef.current.right = true;
      if (e.key === " ") {
        keysRef.current.space = true;
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") keysRef.current.left = false;
      if (e.key === "ArrowRight") keysRef.current.right = false;
      if (e.key === " ") keysRef.current.space = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // 플레이어 이동 (240px/초 - 정밀한 조작)
  useEffect(() => {
    const moveInterval = setInterval(() => {
      setGameState((prev) => {
        let newX = prev.playerX;
        if (keysRef.current.left) newX = Math.max(0, prev.playerX - 4);
        if (keysRef.current.right) newX = Math.min(100, prev.playerX + 4);
        return { ...prev, playerX: newX };
      });
    }, 1000 / 60);

    return () => clearInterval(moveInterval);
  }, []);

  // 발사
  useEffect(() => {
    if (gameState.gameOver) return;

    fireTimerRef.current = setInterval(() => {
      if (!keysRef.current.space) return;

      setGameState((prev) => {
        const isSpecial = prev.ammunition > 0;

        const newBullet: Bullet = {
          id: `bullet-${Date.now()}-${Math.random()}`,
          x: prev.playerX,
          y: 90,
          velocityX: 0,
          velocityY: -2.5, // 화면 0.67초 통과 (맞추기 쉽게)
          isSpecial,
          size: prev.weapon.bulletSize,
        };

        return {
          ...prev,
          bullets: [...prev.bullets, newBullet],
          ammunition: isSpecial ? prev.ammunition - 1 : prev.ammunition,
        };
      });
    }, gameState.weapon.fireRate);

    return () => {
      if (fireTimerRef.current) clearInterval(fireTimerRef.current);
    };
  }, [gameState.weapon.fireRate, gameState.gameOver]);

  // Asteroid 생성
  useEffect(() => {
    if (gameState.gameOver) return;

    spawnTimerRef.current = setInterval(() => {
      setGameState((prev) => {
        if (prev.asteroids.length >= GAME_CONFIG.maxAsteroids) return prev;

        const isRegular = Math.random() < GAME_CONFIG.regularAsteroidRatio;
        let asteroid: Asteroid;

        if (isRegular) {
          asteroid = {
            id: `regular-${Date.now()}-${Math.random()}`,
            type: "regular",
            x: Math.random() * 100,
            y: -5,
            velocityY: prev.baseVelocity * prev.speedMultiplier,
          };
        } else {
          const randomWord = wordQueueRef.current[Math.floor(Math.random() * wordQueueRef.current.length)];
          asteroid = {
            id: `word-${Date.now()}-${Math.random()}`,
            type: "word",
            text: randomWord.text || randomWord.lemma,
            x: Math.random() * 100,
            y: -5,
            velocityY: prev.baseVelocity * prev.speedMultiplier,
            linkedWordId: randomWord.id,
            isCorrectAnswer: prev.currentTask?.word.id === randomWord.id,
          };
        }

        return {
          ...prev,
          asteroids: [...prev.asteroids, asteroid],
        };
      });
    }, GAME_CONFIG.asteroidSpawnInterval);

    return () => {
      if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
    };
  }, [gameState.baseVelocity, gameState.speedMultiplier, gameState.asteroids.length, gameState.gameOver]);

  // 게임 루프 (충돌 감지 & 업데이트)
  useEffect(() => {
    if (gameState.gameOver) return;

    const gameLoop = setInterval(() => {
      setGameState((prev) => {
        // 탄환 이동
        let bullets = prev.bullets
          .map((b) => ({ ...b, y: b.y + b.velocityY }))
          .filter((b) => b.y > -10);

        // 운석 이동
        let asteroids = prev.asteroids
          .map((a) => ({ ...a, y: a.y + a.velocityY }))
          .filter((a) => a.y < 100);

        let newScore = prev.score;
        let newPoints = prev.points;
        let newAmmunition = prev.ammunition;
        let newShield = prev.shield;
        let newWeapon = { ...prev.weapon };
        let upgradedCount = upgradeCountRef.current;

        // 충돌 감지: 탄환 vs 운석
        bullets = bullets.filter((bullet) => {
          let hit = false;

          asteroids = asteroids.filter((ast) => {
            const dist = Math.hypot(bullet.x - ast.x, bullet.y - ast.y);
            if (dist < 5) {
              hit = true;

              if (ast.type === "word" && ast.isCorrectAnswer) {
                // ✅ 정답
                newScore += 10;
                newPoints += GAME_CONFIG.pointsPerCorrectAnswer;
              }

              return false; // 운석 제거
            }
            return true;
          });

          return !hit;
        });

        // 자동 업그레이드
        while (newPoints >= GAME_CONFIG.upgradeThreshold) {
          const upgrade = UPGRADE_SEQUENCE[upgradedCount % UPGRADE_SEQUENCE.length];
          newPoints -= GAME_CONFIG.upgradeThreshold;
          upgradedCount++;

          if (upgrade.stat === "fireRate") {
            newWeapon.fireRate = Math.max(100, newWeapon.fireRate + (upgrade.value as number));
          } else if (upgrade.stat === "bulletSize") {
            newWeapon.bulletSize += (upgrade.value as number);
          } else if (upgrade.stat === "range") {
            newWeapon.range += (upgrade.value as number);
          } else if (upgrade.stat === "chainExplosion") {
            newWeapon.chainExplosion = true;
          } else if (upgrade.stat === "shieldRegen") {
            newWeapon.shieldRegen = true;
          } else if (upgrade.stat === "autoSpecial") {
            newWeapon.autoSpecial = true;
          }
        }

        upgradeCountRef.current = upgradedCount;

        // 충돌 감지: 운석 vs 플레이어
        asteroids = asteroids.filter((ast) => {
          if (ast.y > 85 && Math.abs(ast.x - prev.playerX) < 8) {
            // 운석이 플레이어에 닿음
            if (ast.isCorrectAnswer) {
              newShield = Math.max(0, newShield - 20);
            } else {
              newShield = Math.max(0, newShield - 10);
            }
            return false; // 운석 제거
          }
          return true;
        });

        // 게임 오버 체크
        const gameOver = newShield <= 0;

        return {
          ...prev,
          bullets,
          asteroids,
          score: newScore,
          points: newPoints,
          ammunition: newAmmunition,
          shield: newShield,
          weapon: newWeapon,
          gameOver,
        };
      });
    }, 1000 / 60); // 60 FPS

    return () => clearInterval(gameLoop);
  }, [gameState.gameOver]);

  // 게임 오버
  useEffect(() => {
    if (gameState.gameOver) {
      onFinish(gameState.score);
    }
  }, [gameState.gameOver, gameState.score, onFinish]);

  return (
    <div
      ref={gameRef}
      className="fixed inset-0 w-screen h-screen bg-gradient-to-b from-blue-400 to-purple-500 flex flex-col overflow-hidden"
    >
      {/* 헤더 */}
      <div className="bg-black/30 px-6 py-4 text-white flex justify-between items-center text-sm">
        <div>Level {gameState.level}</div>
        <div>{gameState.score} pts</div>
        <div>보호막: {gameState.shield}</div>
        <div>특수탄: {gameState.ammunition}</div>
        <div>업그레이드: {upgradeCountRef.current}</div>
      </div>

      {/* 게임 영역 */}
      <div className="flex-1 relative overflow-hidden">
        {/* 운석 */}
        {gameState.asteroids.map((ast) => (
          <div
            key={ast.id}
            className={`absolute w-8 h-8 rounded font-bold text-xs flex items-center justify-center cursor-pointer ${
              ast.type === "regular"
                ? "bg-gray-400"
                : ast.isCorrectAnswer
                  ? "bg-green-400 border-2 border-green-600"
                  : "bg-red-400 border-2 border-red-600"
            }`}
            style={{
              left: `${ast.x}%`,
              top: `${ast.y}%`,
              transform: "translate(-50%, -50%)",
              fontSize: "10px",
            }}
          >
            {ast.text && ast.text.length < 6 && <span>{ast.text}</span>}
          </div>
        ))}

        {/* 탄환 */}
        {gameState.bullets.map((bullet) => (
          <div
            key={bullet.id}
            className={`absolute w-2 h-2 rounded-full ${bullet.isSpecial ? "bg-yellow-300" : "bg-white"}`}
            style={{
              left: `${bullet.x}%`,
              top: `${bullet.y}%`,
              transform: "translate(-50%, -50%)",
            }}
          />
        ))}

        {/* 플레이어 */}
        <div
          className="absolute text-4xl"
          style={{
            left: `${gameState.playerX}%`,
            bottom: "30px",
            transform: "translateX(-50%)",
          }}
        >
          🔫
        </div>
      </div>

      {/* 하단 Task */}
      <div className="bg-black/80 text-white p-4 border-t border-white/20 text-center text-sm">
        <div className="font-bold">{gameState.currentTask?.question || "Task..."}</div>
      </div>

      {/* 게임 오버 */}
      {gameState.gameOver && (
        <div className="absolute inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 text-center">
            <div className="text-5xl font-bold mb-4">Game Over!</div>
            <div className="text-3xl font-bold text-blue-600 mb-6">{gameState.score} Points</div>
            <button
              className="px-8 py-4 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600"
              onClick={() => onFinish(gameState.score)}
            >
              Return to Vocab
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
