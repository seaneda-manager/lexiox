'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

type Lang = 'ko' | 'en';

const LangContext = createContext<{ lang: Lang; toggle: () => void }>({
  lang: 'ko',
  toggle: () => {},
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>('ko');
  const toggle = () => setLang((l) => (l === 'ko' ? 'en' : 'ko'));
  return (
    <LangContext.Provider value={{ lang, toggle }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  return useContext(LangContext);
}
