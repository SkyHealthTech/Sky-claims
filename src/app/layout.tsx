import type { Metadata } from 'next';
import './globals.css';

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
