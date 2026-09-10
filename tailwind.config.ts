import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: { display: ['Inter', 'system-ui', 'sans-serif'], sans: ['Inter', 'system-ui', 'sans-serif'] },
      colors: {
        sky: { 400: '#3acafe', 500: '#10adee', 600: '#048bcc', 700: '#076fa5', 800: '#0c5d87', 900: '#104e70', 950: '#0a304a' },
        ink: { 50: 'rgb(3,7,18)', 100: 'rgb(15,23,42)', 200: 'rgb(30,41,59)', 300: 'rgb(51,65,85)', 400: 'rgb(71,85,105)', 500: 'rgb(100,116,139)', 600: 'rgb(148,163,184)', 700: 'rgb(203,213,225)', 800: 'rgb(241,245,249)', 900: 'rgb(255,255,255)', 950: 'rgb(234,239,246)' },
        accent: { DEFAULT: '#7cf0d2', dark: '#1ed3a4' },
        purple: { 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9' },
      },
    },
  },
  plugins: [],
};
export default config;
