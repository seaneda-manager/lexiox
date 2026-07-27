// Fullscreen test mode: hide sidebar, remove padding, maximize reading area
import { ReactNode } from 'react';

export default function ReadingTestLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 min-h-0">
      <main className="min-h-0 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
