import React, { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { AnalysisLanguage, RepositoryEntry, RepositoryTheme } from '../types';

interface ThemeConfig {
  value: RepositoryTheme | 'all';
  labelBm: string;
  labelEn: string;
  activeClass: string;
}

const THEMES: ThemeConfig[] = [
  { value: 'all', labelBm: 'Semua', labelEn: 'All', activeClass: 'bg-slate-700 text-white border-slate-700' },
  { value: 'society-culture', labelBm: 'Masyarakat & Budaya', labelEn: 'Society & Culture', activeClass: 'bg-violet-600 text-white border-violet-600' },
  { value: 'economics', labelBm: 'Ekonomi', labelEn: 'Economics', activeClass: 'bg-amber-500 text-white border-amber-500' },
  { value: 'politics', labelBm: 'Politik', labelEn: 'Politics', activeClass: 'bg-red-600 text-white border-red-600' },
  { value: 'arts', labelBm: 'Seni', labelEn: 'Arts', activeClass: 'bg-pink-500 text-white border-pink-500' },
  { value: 'science-technology', labelBm: 'Sains/Teknologi', labelEn: 'Science/Technology', activeClass: 'bg-sky-600 text-white border-sky-600' },
  { value: 'environment', labelBm: 'Alam Sekitar', labelEn: 'Environment', activeClass: 'bg-emerald-600 text-white border-emerald-600' },
  { value: 'others', labelBm: 'Lain-lain', labelEn: 'Others', activeClass: 'bg-slate-500 text-white border-slate-500' },
];

const THEME_BADGE: Record<RepositoryTheme, { bgClass: string; label: string; labelEn: string }> = {
  'society-culture': { bgClass: 'bg-violet-100 text-violet-800', label: 'Masyarakat & Budaya', labelEn: 'Society & Culture' },
  'economics': { bgClass: 'bg-amber-100 text-amber-800', label: 'Ekonomi', labelEn: 'Economics' },
  'politics': { bgClass: 'bg-red-100 text-red-800', label: 'Politik', labelEn: 'Politics' },
  'arts': { bgClass: 'bg-pink-100 text-pink-800', label: 'Seni', labelEn: 'Arts' },
  'science-technology': { bgClass: 'bg-sky-100 text-sky-800', label: 'Sains/Teknologi', labelEn: 'Science/Technology' },
  'environment': { bgClass: 'bg-emerald-100 text-emerald-800', label: 'Alam Sekitar', labelEn: 'Environment' },
  'others': { bgClass: 'bg-slate-100 text-slate-600', label: 'Lain-lain', labelEn: 'Others' },
};

interface RepositoryProps {
  entries: RepositoryEntry[];
  onSelect: (entry: RepositoryEntry) => void;
  onClose: () => void;
  isTeacherMode?: boolean;
  onDelete?: (entryId: string) => void;
  language?: AnalysisLanguage;
}

const Repository: React.FC<RepositoryProps> = ({
  entries,
  onSelect,
  onClose,
  isTeacherMode = false,
  onDelete,
  language = 'bm'
}) => {
  const [selectedTheme, setSelectedTheme] = useState<RepositoryTheme | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredEntries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return entries.filter((entry) => {
      const themeMatch = selectedTheme === 'all' || entry.result?.theme === selectedTheme;
      const searchMatch = !query || entry.id.toLowerCase().includes(query);
      return themeMatch && searchMatch;
    });
  }, [entries, selectedTheme, searchQuery]);

  const themeLabel = (t: ThemeConfig) => language === 'en' ? t.labelEn : t.labelBm;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="surface-card max-w-2xl w-full p-6 relative flex flex-col max-h-[90vh]">
        <button
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 text-xl font-bold"
          onClick={onClose}
          aria-label="Tutup"
        >
          &times;
        </button>

        <h2 className="text-2xl font-bold mb-4 text-slate-800 pr-8">
          {language === 'en' ? 'Text & Analysis Repository' : 'Repositori Teks & Analisis'}
        </h2>

        {/* Theme filter buttons */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {THEMES.map((theme) => (
            <button
              key={theme.value}
              type="button"
              onClick={() => setSelectedTheme(theme.value)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition ${
                selectedTheme === theme.value
                  ? theme.activeClass
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              {themeLabel(theme)}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={language === 'en' ? 'Search by title...' : 'Cari mengikut tajuk...'}
            className="w-full pl-9 pr-3 py-2 text-sm input-surface rounded-lg outline-none"
          />
        </div>

        {/* Entry list */}
        <ul className="space-y-3 overflow-y-auto flex-1 min-h-0">
          {filteredEntries.length === 0 ? (
            <li className="text-center text-slate-500 py-10 text-sm">
              {language === 'en' ? 'No entries found.' : 'Tiada rekod ditemui.'}
            </li>
          ) : (
            filteredEntries.map((entry) => {
              const themeBadge = entry.result?.theme ? THEME_BADGE[entry.result.theme] : null;
              return (
                <li
                  key={entry.id}
                  className="border border-emerald-200 rounded-xl p-4 hover:bg-emerald-50/60 transition cursor-pointer"
                  onClick={() => onSelect(entry)}
                >
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-emerald-700">{entry.id}</span>
                      {themeBadge && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${themeBadge.bgClass}`}>
                          {language === 'en' ? themeBadge.labelEn : themeBadge.label}
                        </span>
                      )}
                    </div>
                    {isTeacherMode && onDelete && (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onDelete(entry.id);
                        }}
                        className="flex-shrink-0 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1 rounded-md border border-red-100"
                      >
                        {language === 'en' ? 'Delete' : 'Padam'}
                      </button>
                    )}
                  </div>
                  <div className="text-slate-600 text-sm">
                    {entry.text.slice(0, 160)}
                    {entry.text.length > 160 ? '...' : ''}
                  </div>
                </li>
              );
            })
          )}
        </ul>
      </div>
    </div>
  );
};

export default Repository;
