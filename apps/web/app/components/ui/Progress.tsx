/* apps/web/app/components/ui/Progress.tsx */
type Props = { value: number };
export default function Progress({ value }: Props) {
  return (
    <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
      <div className="h-full bg-brand-500 transition-[width] duration-300" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}





