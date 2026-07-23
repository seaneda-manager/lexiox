'use client';

interface Props {
  course: string;
  wordPosition: string;
  day: number;
  totalDays: number;
}

export default function ProgressHeader({ course, wordPosition, day, totalDays }: Props) {
  return (
    <div className="bg-teal-500 text-white rounded-2xl p-6 flex justify-between items-center">
      <div>
        <h1 className="text-4xl font-bold">{wordPosition}</h1>
        <p className="text-sm opacity-90 mt-2">{course} - Day {day} / {totalDays}</p>
      </div>
      <button className="bg-white/20 hover:bg-white/30 p-3 rounded-lg transition">
        🔔
      </button>
    </div>
  );
}
