import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sky Claims — MSP Billing',
  description: 'BC MSP Teleplan billing, AI claim scrubbing, and remittance reconciliation.',
  manifest: '/manifest.json',
  themeColor: '#7c5cbf',
  icons: {
    icon: '/icon-192.png',
    apple: '/icon-192.png',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
