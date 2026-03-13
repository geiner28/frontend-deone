'use client';

import { ReactNode } from 'react';
import { NotificationProvider } from '@/contexts/NotificationContext';
import Sidebar from './Sidebar';
import Header from './Header';

export default function ClientShell({ children }: { children: ReactNode }) {
  return (
    <NotificationProvider>
      <Sidebar />
      <div className="pl-[260px] flex flex-col min-h-screen bg-[#f9f9f9]">
        <Header />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </NotificationProvider>
  );
}
