/* apps/web/tailwind.config.ts */
import type { Config } from 'tailwindcss';
import typography from '@tailwindcss/typography';

export default {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f2f7ff',
          100: '#e6efff',
          200: '#cfe1ff',
          300: '#a9c8ff',
          400: '#7aa8ff',
          500: '#4a87ff',
          600: '#2f6df2',
          700: '#2357c6',
          800: '#1d479f',
          900: '#1a3d83'
        },
        skill: {
          reading:   { DEFAULT: '#3b82f6', light: '#eff6ff', border: '#93c5fd', text: '#1d4ed8' },
          listening: { DEFAULT: '#8b5cf6', light: '#f5f3ff', border: '#c4b5fd', text: '#6d28d9' },
          speaking:  { DEFAULT: '#f97316', light: '#fff7ed', border: '#fdba74', text: '#c2410c' },
          writing:   { DEFAULT: '#14b8a6', light: '#f0fdfa', border: '#5eead4', text: '#0f766e' },
        },
      },
      fontFamily: {
        ui: ['Inter', 'Pretendard', 'system-ui', 'Apple SD Gothic Neo', 'Segoe UI', 'Roboto', 'sans-serif']
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem'
      },
      boxShadow: {
        soft: '0 6px 20px rgba(0,0,0,0.08)'
      }
    }
  },
  plugins: [typography]
} satisfies Config;
