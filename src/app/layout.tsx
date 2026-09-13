import type { Metadata } from 'next';
import { Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const jakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  weight: ['300', '400', '500', '600', '700', '800'],
  style: ['normal', 'italic'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Sky Claims — Canadian Health Billing',
  description: 'Canadian health billing — MSP, OHIP, AHCIP and all provincial plans. AI claim scrubbing, ERA matching, remittance reconciliation.',
  manifest: '/manifest.json',
  themeColor: '#7c3aed',
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={jakartaSans.variable}>
      <body>{children}</body>
    </html>
  );
}
