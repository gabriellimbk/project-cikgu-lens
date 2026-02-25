
import React from 'react';
import { LensOutput } from '../types';

interface LensCardProps {
  data: LensOutput;
}

const LensCard: React.FC<LensCardProps> = ({ data }) => {
  const getLensInfo = (lens: string) => {
    switch (lens) {
      case 'Change':
      case 'Perubahan': 
        return {
          color: 'border-amber-300 bg-amber-50 text-amber-900',
          badge: 'bg-amber-100 text-amber-900',
          desc: 'Melihat perkembangan, punca perubahan, dan kesan jangka masa terhadap persekitaran atau individu.'
        };
      case 'Relationship':
      case 'Hubungan':
        return {
          color: 'border-violet-300 bg-violet-50 text-violet-900',
          badge: 'bg-violet-100 text-violet-900',
          desc: 'Meneroka interaksi, emosi, dan rangkaian antara manusia, masyarakat, dan persekitaran.'
        };
      case 'Choices':
      case 'Pilihan':
        return {
          color: 'border-emerald-300 bg-emerald-50 text-emerald-900',
          badge: 'bg-emerald-100 text-emerald-900',
          desc: 'Menganalisis keputusan, dilema, tanggungjawab moral, serta implikasi jangka pendek dan panjang.'
        };
      default: 
        return {
          color: 'border-slate-500 bg-slate-50 text-slate-700',
          badge: 'bg-slate-100 text-slate-800',
          desc: 'Perspektif analisis teks.'
        };
    }
  };

  const info = getLensInfo(data.lens);

  return (
    <div className={`rounded-xl border-l-4 p-6 shadow-sm transition-all hover:shadow-md ${info.color}`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${info.badge}`}>
            Lensa: {data.lens}
          </span>
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            {data.paragraphSource}
          </span>
        </div>
        <p className="text-[11px] italic text-slate-700 max-w-xs">{info.desc}</p>
      </div>

      <div className="mb-6">
        <h3 className="text-sm font-semibold text-slate-700 uppercase mb-2">Ayat Topik</h3>
        <p className="text-lg font-medium text-slate-900 leading-relaxed italic">
          "{data.topicSentence}"
        </p>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-slate-700 uppercase mb-3">Sokongan & Bukti Konkrit</h3>
        <ul className="space-y-4">
          {data.supports.map((item, idx) => (
            <li key={idx} className="flex gap-3 items-start">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-white text-slate-700 border border-slate-200 flex items-center justify-center text-xs font-bold">
                {idx + 1}
              </span>
              <div className="flex-1">
                <p className="text-slate-800 font-medium">{item.point}</p>
                <p className="text-sm text-slate-600 mt-1 pl-2 border-l-2 border-slate-300">
                  <span className="font-semibold italic">Bukti:</span> {item.source}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default LensCard;
