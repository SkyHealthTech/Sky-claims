'use client';
import { useState } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div id="app">
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="main">
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <div className="page">
          <div className="page-in">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
