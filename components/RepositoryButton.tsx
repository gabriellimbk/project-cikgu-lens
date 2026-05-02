import React from 'react';
import { Archive } from 'lucide-react';

interface RepositoryButtonProps {
  onClick: () => void;
}

const RepositoryButton: React.FC<RepositoryButtonProps> = ({ onClick }) => (
  <button
    onClick={onClick}
    className="ml-4 px-4 py-2 rounded-lg bg-amber-300 hover:bg-amber-400 text-slate-900 font-semibold shadow-lg shadow-black/20 transition-all flex items-center gap-2"
    aria-label="Buka Repositori"
  >
    <Archive className="w-4 h-4" strokeWidth={2} />
    Repositori
  </button>
);

export default RepositoryButton;
