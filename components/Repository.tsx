import React from 'react';
import { RepositoryEntry } from '../types';

interface RepositoryProps {
  entries: RepositoryEntry[];
  onSelect: (entry: RepositoryEntry) => void;
  onClose: () => void;
  isTeacherMode?: boolean;
  onDelete?: (entryId: string) => void;
}

const Repository: React.FC<RepositoryProps> = ({ entries, onSelect, onClose, isTeacherMode = false, onDelete }) => (
  <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center px-4">
    <div className="surface-card max-w-2xl w-full p-8 relative">
      <button
        className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 text-xl font-bold"
        onClick={onClose}
        aria-label="Tutup"
      >
        &times;
      </button>
      <h2 className="text-2xl font-bold mb-6 text-slate-800">Repositori Teks & Analisis</h2>
      <ul className="space-y-4 max-h-[60vh] overflow-y-auto">
        {entries.map((entry) => (
          <li key={entry.id} className="border border-emerald-200 rounded-xl p-4 hover:bg-emerald-50/60 transition cursor-pointer" onClick={() => onSelect(entry)}>
            <div className="flex items-start justify-between gap-3 mb-1">
              <div className="font-semibold text-emerald-700">{entry.id}</div>
              {isTeacherMode && onDelete && (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDelete(entry.id);
                  }}
                  className="text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-md border border-red-100"
                >
                  Padam
                </button>
              )}
            </div>
            <div className="text-slate-700 text-sm line-clamp-2">
              {entry.text.slice(0, 200)}
              {entry.text.length > 200 ? '...' : ''}
            </div>
          </li>
        ))}
      </ul>
    </div>
  </div>
);

export default Repository;
