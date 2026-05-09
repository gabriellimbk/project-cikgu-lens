
import React, { useEffect, useState } from 'react';
import { RefreshCw, Users, Scale, Globe, Quote, ListChecks } from 'lucide-react';
import { AnalysisLanguage, LensOutput } from '../types';

interface LensCardProps {
  data: LensOutput;
  editable?: boolean;
  onChange?: (data: LensOutput) => void;
  language?: AnalysisLanguage;
}

const LensCard: React.FC<LensCardProps> = ({ data, editable = false, onChange, language = 'bm' }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<LensOutput>(data);

  useEffect(() => {
    setDraft(data);
    setIsEditing(false);
  }, [data]);

  useEffect(() => {
    if (!editable) {
      setIsEditing(false);
    }
  }, [editable]);

  const getLensInfo = (lens: string) => {
    switch (lens) {
      case 'Change':
      case 'Perubahan':
        return {
          color: 'border-amber-300 bg-amber-50 text-amber-900',
          badge: 'bg-amber-100 text-amber-900',
          icon: <RefreshCw className="w-4 h-4" strokeWidth={2.5} />,
          descBm: 'Melihat perkembangan, punca perubahan, dan kesan jangka masa terhadap persekitaran atau individu.',
          descEn: 'Examining developments, causes of change, and the impact on timescales for individuals or the environment.'
        };
      case 'Relationship':
      case 'Hubungan':
        return {
          color: 'border-violet-300 bg-violet-50 text-violet-900',
          badge: 'bg-violet-100 text-violet-900',
          icon: <Users className="w-4 h-4" strokeWidth={2.5} />,
          descBm: 'Meneroka interaksi, emosi, dan rangkaian antara manusia, masyarakat, dan persekitaran.',
          descEn: 'Exploring interactions, emotions, and connections between people, society, and the environment.'
        };
      case 'Choices':
      case 'Pilihan':
        return {
          color: 'border-emerald-300 bg-emerald-50 text-emerald-900',
          badge: 'bg-emerald-100 text-emerald-900',
          icon: <Scale className="w-4 h-4" strokeWidth={2.5} />,
          descBm: 'Menganalisis keputusan, dilema, tanggungjawab moral, serta implikasi jangka pendek dan panjang.',
          descEn: 'Analysing decisions, dilemmas, moral responsibility, and short- and long-term implications.'
        };
      case 'Culture':
      case 'Budaya':
        return {
          color: 'border-sky-300 bg-sky-50 text-sky-900',
          badge: 'bg-sky-100 text-sky-900',
          icon: <Globe className="w-4 h-4" strokeWidth={2.5} />,
          descBm: 'Meneliti cara budaya, nilai, bahasa, adat, dan latar masyarakat membentuk identiti serta sikap.',
          descEn: 'Examining how culture, values, language, customs, and social background shape identity and attitudes.'
        };
      default:
        return {
          color: 'border-slate-500 bg-slate-50 text-slate-700',
          badge: 'bg-slate-100 text-slate-800',
          icon: null,
          descBm: 'Perspektif analisis teks.',
          descEn: 'Text analysis perspective.'
        };
    }
  };

  const info = getLensInfo(data.lens);
  const shownData = isEditing ? draft : data;
  const desc = language === 'en' ? info.descEn : info.descBm;

  const lensLabel = language === 'en' ? 'Lens' : 'Lensa';
  const topicSentenceLabel = language === 'en' ? 'Topic Sentence' : 'Ayat Topik';
  const supportsLabel = language === 'en' ? 'Supporting Points & Evidence' : 'Sokongan & Bukti Konkrit';
  const evidenceLabel = language === 'en' ? 'Evidence' : 'Bukti';
  const saveLabel = language === 'en' ? 'Save' : 'Simpan';
  const cancelLabel = language === 'en' ? 'Cancel' : 'Batal';

  const updateDraft = (patch: Partial<LensOutput>) => {
    setDraft((current) => ({ ...current, ...patch }));
  };

  const updateSupport = (index: number, key: 'point' | 'source', value: string) => {
    setDraft((current) => ({
      ...current,
      supports: current.supports.map((support, supportIndex) =>
        supportIndex === index ? { ...support, [key]: value } : support
      )
    }));
  };

  const handleSave = () => {
    onChange?.(draft);
    setIsEditing(false);
  };

  return (
    <div className={`rounded-xl border-l-4 p-6 shadow-sm transition-all hover:shadow-md ${info.color}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 ${info.badge}`}>
            {info.icon}
            {lensLabel}: {shownData.lens}
          </span>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            {isEditing ? (
              <input
                type="text"
                value={draft.paragraphSource}
                onChange={(event) => updateDraft({ paragraphSource: event.target.value })}
                className="min-w-32 px-2 py-1 text-[11px] input-surface rounded outline-none normal-case tracking-normal"
              />
            ) : (
              shownData.paragraphSource
            )}
          </span>
        </div>
        <div className="flex items-start gap-2">
          <p className="text-[11px] italic text-slate-700 max-w-xs">{desc}</p>
          {editable && (
            <div className="flex gap-2">
              {isEditing ? (
                <>
                  <button
                    type="button"
                    onClick={handleSave}
                    className="px-2 py-1 rounded-md bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700"
                  >
                    {saveLabel}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDraft(data);
                      setIsEditing(false);
                    }}
                    className="px-2 py-1 rounded-md bg-white/80 text-slate-700 text-xs font-semibold border border-slate-200 hover:bg-white"
                  >
                    {cancelLabel}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="px-2 py-1 rounded-md bg-white/80 text-slate-700 text-xs font-semibold border border-slate-200 hover:bg-white"
                >
                  Edit
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mb-6">
        <h3 className="text-sm font-semibold text-slate-700 uppercase mb-2 flex items-center gap-1.5">
          <Quote className="w-3.5 h-3.5" />
          {topicSentenceLabel}
        </h3>
        {isEditing ? (
          <textarea
            value={draft.topicSentence}
            onChange={(event) => updateDraft({ topicSentence: event.target.value })}
            className="w-full min-h-24 p-3 text-base input-surface rounded-lg outline-none leading-relaxed"
          />
        ) : (
          <p className="text-lg font-medium text-slate-900 leading-relaxed italic">
            "{shownData.topicSentence}"
          </p>
        )}
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-700 uppercase mb-3 flex items-center gap-1.5">
          <ListChecks className="w-3.5 h-3.5" />
          {supportsLabel}
        </h3>
        <ul className="space-y-4">
          {shownData.supports.map((item, idx) => (
            <li key={idx} className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white text-slate-700 border border-slate-200 flex items-center justify-center text-xs font-bold">
                {idx + 1}
              </span>
              <div className="flex-1">
                {isEditing ? (
                  <div className="space-y-2">
                    <textarea
                      value={item.point}
                      onChange={(event) => updateSupport(idx, 'point', event.target.value)}
                      className="w-full min-h-20 p-3 text-sm input-surface rounded-lg outline-none"
                    />
                    <textarea
                      value={item.source}
                      onChange={(event) => updateSupport(idx, 'source', event.target.value)}
                      className="w-full min-h-20 p-3 text-sm input-surface rounded-lg outline-none"
                    />
                  </div>
                ) : (
                  <>
                    <p className="text-slate-800 font-medium">{item.point}</p>
                    <p className="text-sm text-slate-600 mt-1 pl-2 border-l-2 border-slate-300">
                      <span className="font-semibold italic">{evidenceLabel}:</span> {item.source}
                    </p>
                  </>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default LensCard;
