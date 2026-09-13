import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-jakarta)', 'Plus Jakarta Sans', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['var(--font-jakarta)', 'Plus Jakarta Sans', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['ui-monospace', 'Cascadia Code', 'Source Code Pro', 'Menlo', 'Consolas', 'monospace'],
      },
      colors: {
        sky: {
          DEFAULT: '#2563eb',
          lt: '#eff5ff',
          dk: '#1d4ed8',
          b: '#bfd7ff',
        },
        lilac: {
          DEFAULT: '#8b5cf6',
          dk: '#6d28d9',
          lt: '#f5eef9',
        },
        ok: { DEFAULT: '#059669', lt: '#ecfdf5', b: '#a7f3d0' },
        warn: { DEFAULT: '#d97706', lt: '#fffbeb', b: '#fde68a' },
        bad: { DEFAULT: '#e11d48', lt: '#fff1f3', b: '#fecdd3' },
      },
    },
  },
  plugins: [],
};

export default config;
