import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="sticky top-0 z-50 bg-emerald-700 border-b border-emerald-500">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center">
          <h1 className="text-xl font-bold text-white tracking-tight">Cikgu Lens</h1>
        </div>
        <div className="hidden sm:block">
          <span className="text-xs font-semibold text-emerald-100 uppercase tracking-[0.2em]">Teman Menulis & Berfikir Anda</span>
        </div>
      </div>
    </header>
  );
};

export default Header;
