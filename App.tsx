import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { GraduationCap, BookOpenCheck, FileText, Bookmark, Sparkles, AlertCircle, Lightbulb, Loader2 } from 'lucide-react';
import Header from './components/Header';
import LensCard from './components/LensCard';
import RepositoryButton from './components/RepositoryButton';
import Repository from './components/Repository';
import repositoryEntries from './components/repositoryEntries';
import { generateLensAnalysis } from './openaiService';
import {
  deleteRepositoryEntry as deleteRepositoryEntryApi,
  fetchRepositoryEntries,
  saveRepositoryEntry as saveRepositoryEntryApi
} from './repositoryService';
import { verifyTeacherPassword } from './teacherAuthService';
import { GenerationResult, RepositoryEntry } from './types';

const REPOSITORY_STORAGE_KEY = 'cikgu_lens_repository_v1';

type ConsoleMode = 'student' | 'teacher';

const App: React.FC = () => {
  const [text, setText] = useState(repositoryEntries[0]?.text ?? '');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [repoOpen, setRepoOpen] = useState(false);
  const [repositoryData, setRepositoryData] = useState<RepositoryEntry[]>(repositoryEntries);
  const [consoleMode, setConsoleMode] = useState<ConsoleMode>('student');
  const [repoTitle, setRepoTitle] = useState('');
  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  const [teacherAuthenticated, setTeacherAuthenticated] = useState(false);
  const [showTeacherAuthModal, setShowTeacherAuthModal] = useState(false);
  const [teacherPasswordInput, setTeacherPasswordInput] = useState('');
  const [teacherAuthError, setTeacherAuthError] = useState<string | null>(null);
  const [teacherAuthLoading, setTeacherAuthLoading] = useState(false);

  const isTeacherMode = useMemo(() => consoleMode === 'teacher', [consoleMode]);

  useEffect(() => {
    const raw = window.localStorage.getItem(REPOSITORY_STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setRepositoryData(parsed as RepositoryEntry[]);
      }
    } catch {
      // Ignore malformed local storage and fall back to bundled repository entries.
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(REPOSITORY_STORAGE_KEY, JSON.stringify(repositoryData));
  }, [repositoryData]);

  useEffect(() => {
    let cancelled = false;

    const loadRepositoryFromApi = async () => {
      try {
        const remoteEntries = await fetchRepositoryEntries();
        if (!cancelled && Array.isArray(remoteEntries) && remoteEntries.length > 0) {
          setRepositoryData(remoteEntries);
        }
      } catch {
        // Keep local fallback if API repository is unavailable.
      }
    };

    loadRepositoryFromApi();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleOpenRepo = () => setRepoOpen(true);
  const handleCloseRepo = () => setRepoOpen(false);

  const handleSelectRepoEntry = (entry: RepositoryEntry) => {
    setText(entry.text);
    setResult(entry.result);
    setRepoOpen(false);
    setError(null);
    setSaveNotice(null);
  };

  const handleGenerate = useCallback(async () => {
    if (!text.trim()) return;

    setLoading(true);
    setError(null);
    setSaveNotice(null);

    try {
      const data = await generateLensAnalysis(text);
      setResult(data);
    } catch (err: any) {
      setError(err.message || 'Ralat semasa menjana idea.');
    } finally {
      setLoading(false);
    }
  }, [text]);

  const handleSaveToRepository = useCallback(async () => {
    if (!result) return;

    const baseTitle = repoTitle.trim();
    if (!baseTitle) {
      setError('Sila isi medan title sebelum simpan ke repository.');
      return;
    }

    let finalTitle = baseTitle;
    let index = 2;
    while (repositoryData.some((entry) => entry.id === finalTitle)) {
      finalTitle = `${baseTitle} (${index})`;
      index += 1;
    }

    const newEntry: RepositoryEntry = {
      id: finalTitle,
      text: text.trim(),
      result
    };

    try {
      await saveRepositoryEntryApi(newEntry);
      setRepositoryData((prev) => [newEntry, ...prev]);
      setRepoTitle('');
      setError(null);
      setSaveNotice(`Disimpan ke repository sebagai: ${finalTitle}`);
    } catch (err: any) {
      setError(err?.message || 'Gagal menyimpan ke repository.');
    }
  }, [repoTitle, repositoryData, result, text]);

  const handleDeleteRepositoryEntry = useCallback(async (entryId: string) => {
    if (!isTeacherMode) return;

    try {
      await deleteRepositoryEntryApi(entryId);
      setRepositoryData((prev) => prev.filter((entry) => entry.id !== entryId));
      setSaveNotice(`Rekod dipadam: ${entryId}`);
      setError(null);
    } catch (err: any) {
      setError(err?.message || 'Gagal memadam rekod repository.');
    }
  }, [isTeacherMode]);

  const handleUpdateLens = useCallback((lensIndex: number, updatedLens: GenerationResult['lenses'][number]) => {
    setResult((current) => {
      if (!current) return current;
      return {
        ...current,
        lenses: current.lenses.map((lens, index) => (index === lensIndex ? updatedLens : lens))
      };
    });
    setSaveNotice(null);
  }, []);

  const closeTeacherAuthModal = useCallback(() => {
    setShowTeacherAuthModal(false);
    setTeacherAuthError(null);
    setTeacherPasswordInput('');
  }, []);

  const handleStudentConsoleClick = useCallback(() => {
    setConsoleMode('student');
    closeTeacherAuthModal();
  }, [closeTeacherAuthModal]);

  const handleTeacherConsoleClick = useCallback(() => {
    if (teacherAuthenticated) {
      setConsoleMode('teacher');
      return;
    }
    setShowTeacherAuthModal(true);
    setTeacherAuthError(null);
    setTeacherPasswordInput('');
  }, [teacherAuthenticated]);

  const handleTeacherAuthSubmit = useCallback(async () => {
    setTeacherAuthLoading(true);
    setTeacherAuthError(null);

    try {
      await verifyTeacherPassword(teacherPasswordInput);
      setTeacherAuthenticated(true);
      setConsoleMode('teacher');
      closeTeacherAuthModal();
    } catch (err: any) {
      setTeacherAuthError(err?.message || 'Pengesahan Teacher Console gagal.');
    } finally {
      setTeacherAuthLoading(false);
    }
  }, [closeTeacherAuthModal, teacherPasswordInput]);

  return (
    <div className="min-h-screen app-shell pb-20">
      <Header />
      <div className="max-w-6xl mx-auto px-4 pt-4 flex items-center justify-between gap-4">
        <div className="console-switch grid grid-cols-2 w-full max-w-md">
          <button
            type="button"
            onClick={handleStudentConsoleClick}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2 ${
              consoleMode === 'student' ? 'bg-amber-300 border border-amber-400 text-black shadow' : 'text-black hover:text-black'
            }`}
          >
            <GraduationCap className="w-4 h-4" strokeWidth={2} />
            Student Console
          </button>
          <button
            type="button"
            onClick={handleTeacherConsoleClick}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center justify-center gap-2 ${
              consoleMode === 'teacher' ? 'bg-amber-300 border border-amber-400 text-black shadow' : 'text-black hover:text-black'
            }`}
          >
            <BookOpenCheck className="w-4 h-4" strokeWidth={2} />
            Teacher Console
          </button>
        </div>
        <RepositoryButton onClick={handleOpenRepo} />
      </div>

      {repoOpen && (
        <Repository
          entries={repositoryData}
          onSelect={handleSelectRepoEntry}
          onClose={handleCloseRepo}
          isTeacherMode={isTeacherMode}
          onDelete={handleDeleteRepositoryEntry}
        />
      )}

      {showTeacherAuthModal && (
        <div className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center px-4">
          <div className="w-full max-w-md surface-card p-6">
            <h3 className="text-xl font-bold text-black mb-2">Teacher Authentication</h3>
            <p className="text-sm text-black mb-4">Masukkan kata laluan untuk akses Teacher Console.</p>
            <input
              type="password"
              value={teacherPasswordInput}
              onChange={(event) => setTeacherPasswordInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  handleTeacherAuthSubmit();
                }
              }}
              placeholder="Kata laluan"
              className="w-full px-3 py-2 text-sm input-surface text-black placeholder-slate-500 rounded-lg outline-none"
            />
            {teacherAuthError && <p className="mt-2 text-sm text-red-600">{teacherAuthError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeTeacherAuthModal}
                className="px-4 py-2 rounded-lg border border-slate-400 text-black hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleTeacherAuthSubmit}
                disabled={teacherAuthLoading}
                className="px-4 py-2 rounded-lg bg-amber-300 border border-amber-400 text-black font-semibold hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {teacherAuthLoading ? 'Mengesahkan...' : 'Masuk'}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 pt-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="surface-card p-6">
              <label className="flex items-center gap-1.5 text-sm font-bold text-slate-700 uppercase tracking-wide mb-3">
                <FileText className="w-4 h-4" strokeWidth={2} />
                Bacaan Anda
              </label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Tampal teks (Bahasa Melayu atau Inggeris) yang ingin anda teroka di sini..."
                className="w-full h-[500px] p-4 text-sm input-surface rounded-xl transition-all resize-none outline-none leading-relaxed"
              />
              <button
                onClick={handleGenerate}
                disabled={loading}
                className={`mt-4 w-full py-4 rounded-xl font-bold transition-all shadow-lg ${
                  loading
                    ? 'bg-brand-500/60 text-white cursor-not-allowed flex items-center justify-center gap-2'
                    : 'btn-primary active:scale-[0.98] grid grid-cols-[auto,1fr] items-center gap-4 px-8'
                }`}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5 text-white" />
                    Sedang Meneroka...
                  </>
                ) : (
                  <>
                    <Lightbulb className="w-5 h-5 flex-shrink-0 ml-2" strokeWidth={2} />
                    <span className="text-center pr-7">Teroka Idea Baharu Dengan Menggunakan EMPAT Lensa</span>
                  </>
                )}
              </button>

              {result && (
                <div className="mt-4 p-4 surface-soft space-y-3">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wide">
                    <Bookmark className="w-3.5 h-3.5" strokeWidth={2} />
                    title
                  </label>
                  <input
                    type="text"
                    value={repoTitle}
                    onChange={(event) => setRepoTitle(event.target.value)}
                    placeholder="Masukkan title untuk repository"
                    className="w-full px-3 py-2 text-sm input-surface rounded-lg outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleSaveToRepository}
                    className="w-full py-2.5 rounded-lg font-semibold text-white bg-emerald-600 hover:bg-emerald-700 shadow-md shadow-emerald-100 transition"
                  >
                    save to Repository
                  </button>
                  {saveNotice && <p className="text-xs text-emerald-700 font-medium">{saveNotice}</p>}
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-sm flex items-center gap-2">
                <AlertCircle className="w-5 h-5 flex-shrink-0" strokeWidth={2} />
                {error}
              </div>
            )}
          </div>

          <div className="lg:col-span-2 space-y-6">
            {!result && !loading && (
              <div className="h-[600px] empty-state rounded-3xl flex flex-col items-center justify-center text-slate-400 p-12 text-center">
                <div className="bg-slate-100 p-5 rounded-full mb-5">
                  <Sparkles className="w-12 h-12 text-emerald-400" strokeWidth={1.5} />
                </div>
                <h2 className="text-xl font-semibold text-slate-600">Sedia Untuk Menjana Idea</h2>
                <p className="mt-2 max-w-sm">Tampal teks anda (Bahasa Melayu atau Inggeris) di kiri dan klik butang untuk melihat bagaimana lensa berbeza boleh membantu anda menulis perenggan yang lebih mantap!</p>
              </div>
            )}

            {loading && (
              <div className="space-y-6 animate-pulse">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="surface-card h-64 p-6">
                    <div className="h-4 bg-slate-200 rounded w-1/4 mb-4"></div>
                    <div className="h-8 bg-slate-100 rounded w-3/4 mb-6"></div>
                    <div className="space-y-3">
                      <div className="h-4 bg-slate-50 rounded w-full"></div>
                      <div className="h-4 bg-slate-50 rounded w-5/6"></div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {result && (
              <div className="space-y-8 result-stack-enter">
                <div className="hero-gradient text-white rounded-3xl p-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Sparkles className="w-48 h-48" strokeWidth={0.75} />
                  </div>
                  <div className="relative z-10">
                    <h2 className="text-2xl font-extrabold mb-3">Teroka Perspektif Menulis</h2>
                    <p className="text-emerald-100 leading-relaxed mb-4">{result.advice}</p>
                    <div className="flex items-center gap-2 text-sm font-medium bg-white/10 w-fit px-3 py-1.5 rounded-full border border-white/20">
                      <Lightbulb className="w-4 h-4" strokeWidth={2} />
                      Tip: Gunakan "Ayat Topik" di bawah untuk memulakan perenggan anda sendiri.
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6">
                  {result.lenses.map((lensData, index) => (
                    <LensCard
                      key={index}
                      data={lensData}
                      editable={isTeacherMode}
                      onChange={(updatedLens) => handleUpdateLens(index, updatedLens)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

    </div>
  );
};

export default App;
