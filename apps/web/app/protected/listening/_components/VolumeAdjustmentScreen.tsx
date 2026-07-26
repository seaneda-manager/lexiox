"use client";

import { useState, useRef } from "react";

interface VolumeAdjustmentScreenProps {
  onNext: () => void;
  sampleAudioUrl?: string;
}

export default function VolumeAdjustmentScreen({
  onNext,
  sampleAudioUrl = "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
}: VolumeAdjustmentScreenProps) {
  const [volume, setVolume] = useState(70);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  const handlePlaySample = () => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100;
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch((err) => {
          console.error("Audio playback error:", err);
          setIsPlaying(false);
        });
        setIsPlaying(true);
      }
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = Number(e.target.value);
    setVolume(newVolume);
    if (audioRef.current && isPlaying) {
      audioRef.current.volume = newVolume / 100;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-8 py-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">TOEFL iBT 2026</h1>
          <div className="text-sm text-gray-500">Listening Section</div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center px-8 py-12">
        <div className="w-full max-w-2xl">
          <div className="bg-white rounded-2xl shadow-lg p-12 space-y-8">
            {/* Title */}
            <div className="text-center">
              <h2 className="text-4xl font-bold text-gray-900 mb-2">
                Adjusting the Volume
              </h2>
              <p className="text-gray-500">📢 Test your audio settings</p>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded">
              <p className="text-gray-700 leading-relaxed">
                To adjust the volume, use the slider below. Click the play button to hear a sample audio clip.
                You can change the volume at any time during the test if needed.
              </p>
            </div>

            {/* Audio Player Section */}
            <div className="space-y-6">
              {/* Play Button */}
              <div className="flex justify-center">
                <button
                  onClick={handlePlaySample}
                  className={`flex items-center gap-3 px-8 py-4 rounded-lg font-semibold text-white transition-all ${
                    isPlaying
                      ? "bg-red-500 hover:bg-red-600 shadow-lg"
                      : "bg-blue-600 hover:bg-blue-700 shadow-lg"
                  }`}
                >
                  <span className="text-2xl">
                    {isPlaying ? "⏸" : "▶"}
                  </span>
                  <span>{isPlaying ? "Pause Sample" : "Play Sample Audio"}</span>
                </button>
              </div>

              {/* Volume Control */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label htmlFor="volume" className="text-sm font-semibold text-gray-700">
                    Volume Level
                  </label>
                  <div className="text-2xl font-bold text-blue-600">
                    {volume}%
                  </div>
                </div>

                {/* Slider */}
                <div className="relative">
                  <input
                    id="volume"
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-full h-3 bg-gradient-to-r from-gray-200 to-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    style={{
                      backgroundImage: `linear-gradient(to right, rgb(59, 130, 246) 0%, rgb(59, 130, 246) ${volume}%, rgb(229, 231, 235) ${volume}%, rgb(229, 231, 235) 100%)`,
                    }}
                  />
                  <div className="flex justify-between mt-2 text-xs text-gray-500">
                    <span>Mute</span>
                    <span>Max</span>
                  </div>
                </div>
              </div>

              {/* Volume Labels */}
              <div className="grid grid-cols-5 gap-2 text-center text-xs text-gray-600">
                <div>0%</div>
                <div>25%</div>
                <div>50%</div>
                <div>75%</div>
                <div>100%</div>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800">
                <span className="font-semibold">💡 Tip:</span> Adjust the volume to a comfortable level now.
                You can still adjust it later during the test by clicking the volume button at the top.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 px-8 py-6 flex justify-end gap-4">
        <button
          onClick={onNext}
          className="px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-md"
        >
          Next
        </button>
      </footer>

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        src={sampleAudioUrl}
        onEnded={() => setIsPlaying(false)}
        onError={() => setIsPlaying(false)}
      />
    </div>
  );
}
