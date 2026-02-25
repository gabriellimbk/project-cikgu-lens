import React from 'react';

interface RepositoryButtonProps {
  onClick: () => void;
}

const RepositoryButton: React.FC<RepositoryButtonProps> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="ml-4 px-4 py-2 rounded-lg bg-amber-300 hover:bg-amber-400 text-slate-900 font-semibold shadow-lg shadow-black/20 transition-all"
    aria-label="Buka Repositori"
  >
    <svg className="w-5 h-5 inline-block mr-2 text-slate-900" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 20l9-5-9-5-9 5 9 5zm0-5V4m0 0L3 9m9-5l9 5" />
    </svg>
    Repositori
  </button>
);

export default RepositoryButton;
