'use client';

import type { ReactNode } from 'react';

/** 서버 컴포넌트의 <form action> 안에서 쓰는 제출 버튼. message가 있으면 제출 전에 확인창을 띄운다. */
export default function ConfirmSubmitButton({
  message,
  className,
  children,
}: {
  message?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (message && !window.confirm(message)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
