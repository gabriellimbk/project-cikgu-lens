import React from 'react';
import { ScanText, PenLine } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 bg-emerald-700 border-b border-emerald-500">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <ScanText className="w-6 h-6 text-emerald-200" strokeWidth={2} />
          <h1 className="text-xl font-bold text-white tracking-tight">Cikgu Lensa</h1>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-emerald-100">
          <PenLine className="w-3.5 h-3.5" />
          <span className="text-xs font-semibold uppercase tracking-[0.2em]">Teman Menulis & Berfikir Anda</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
