import { ReactNode } from 'react';

export const revalidate = 0;

export default function FullscreenLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{ width: '100vw', height: '100vh', margin: 0, padding: 0, overflow: 'hidden' }}>
      {children}
    </div>
  );
}
