import React from 'react';
import type { ReactNode } from 'react';
import Header from '@/components/header';
import MainClient from './main-client';

const Layout = async ({ children }: { children: ReactNode }) => {
  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <Header />
      <MainClient>{children}</MainClient>
    </div>
  );
};

export default Layout;
