// apps/web/components/ui/Button.tsx
'use client';

import * as React from 'react';

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  asChild?: boolean; // ?섏쨷???꾩슂?섎㈃ ?곕젮怨??④꺼???듭뀡
};

export default function Button({ className = '', ...props }: Props) {
  return (
    <button
      {...props}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-md border',
        'px-3 py-1.5 text-sm font-medium shadow-sm',
        'bg-white hover:bg-neutral-50',
        'disabled:cursor-not-allowed disabled:opacity-50',
        className,
      ].join(' ')}
    />
  );
}




