
import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { Baby, Plus, Info, CheckCircle, Shield, X, Cpu, Search, Calendar, RefreshCw, Clock, ChevronRight, Zap, Sparkles, FileText, CheckCircle2, ChevronLeft, Users, ChevronDown, Maximize2, Loader2, Folder, Edit2, Trash2, BrainCircuit, Activity, ChartColumnBig, PersonStanding } from 'lucide-react';
import { FamilyMember, GrowthLog, Language } from '../types';
import { VACCINATION_SCHEDULE_IDAI, MILESTONES_SCHEDULE_IDAI } from '../constants';
import { getGrowthAnalysis, getImmunizationAdvice, getDevelopmentAnalysis } from '../services/geminiService';
import { useTranslation } from '../translations';
import ConfirmationModal from './ConfirmationModal';

interface KidsViewProps {
  member: FamilyMember;
  allMembers: FamilyMember[];
  onSwitchMember: (id: string) => void;
  onUpdateMember: (member: FamilyMember) => void;
  growthLogs: GrowthLog[];
  language: Language;
  onAddGrowthLog: (log: GrowthLog) => void;
  onUpdateGrowthLog?: (log: GrowthLog) => void;
  onDeleteGrowthLog?: (id: string) => void;
}

const formatDateUpper = (dateString: string) => {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase();
};

const formatDateTimeUpper = (dateString: string) => {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  const datePart = d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase();
  const timePart = d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${datePart} ${timePart}`;
};

const KidsView: React.FC<KidsViewProps> = ({ member, allMembers, onSwitchMember, onUpdateMember, growthLogs, language, onAddGrowthLog, onUpdateGrowthLog, onDeleteGrowthLog }) => {
  const [viewMode, setViewMode] = useState<'dashboard' | 'form' | 'logList'>('dashboard');
  const [showMemberSelector, setShowMemberSelector] = useState(false);
  
  // Log List State
  const [editingLog, setEditingLog] = useState<GrowthLog | null>(null);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [deleteLogId, setDeleteLogId] = useState<string | null>(null);

  // AI States
  const [analyzingGrowth, setAnalyzingGrowth] = useState(false);
  const [analyzingImmune, setAnalyzingImmune] = useState(false);
  const [analyzingDev, setAnalyzingDev] = useState(false);
  
  // Modals for AI Read More
  const [showGrowthModal, setShowGrowthModal] = useState(false);
  const [showImmuneModal, setShowImmuneModal] = useState(false);
  const [showDevModal, setShowDevModal] = useState(false);

  // Development & Immunization Checklist State
  const [checklist, setChecklist] = useState<Record<string, boolean>>({});
  const [immuneChecklist, setImmuneChecklist] = useState<Record<string, boolean>>({});

  const t = useTranslation(language);

  // Helper to get local ISO string for now
  const getCurrentLocalDateTime = () => {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000; 
    return new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const calculateAgeMonths = useMemo(() => {
    const today = new Date();
    const bday = new Date(member.birthDate);
    return (today.getFullYear() - bday.getFullYear()) * 12 + (today.getMonth() - bday.getMonth());
  }, [member.birthDate]);

  useEffect(() => {
    // Load Development Checklist
    if (member.developmentChecklist) {
      try {
        setChecklist(JSON.parse(member.developmentChecklist));
      } catch (e) { setChecklist({}); }
    } else {
      setChecklist({});
    }

    // Load Immunization Checklist
    if (member.immunizationChecklist) {
        try {
            setImmuneChecklist(JSON.parse(member.immunizationChecklist));
        } catch (e) { setImmuneChecklist({}); }
    } else {
        setImmuneChecklist({});
    }
  }, [member.id, member.developmentChecklist, member.immunizationChecklist]);

  const handleGenerateGrowthAI = async () => {
    setAnalyzingGrowth(true);
    const logsStr = [...growthLogs]
      .sort((a,b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime())
      .slice(0, 5) 
      .map(l => `[${l.dateTime}] W:${l.weight}kg, H:${l.height}cm, HC:${l.headCircumference||'-'}cm`)
      .join('; ');
      
    const analysis = await getGrowthAnalysis(calculateAgeMonths, logsStr, language);
    onUpdateMember({ ...member, aiGrowthAnalysis: analysis });
    setAnalyzingGrowth(false);
  };

  const handleGenerateImmuneAI = async () => {
    setAnalyzingImmune(true);
    const analysis = await getImmunizationAdvice(calculateAgeMonths, language);
    onUpdateMember({ ...member, aiImmunizationAnalysis: analysis });
    setAnalyzingImmune(false);
  };

  const handleGenerateDevAI = async () => {
    setAnalyzingDev(true);
    // Find milestones for current age group for the prompt
    const currentGroup = MILESTONES_SCHEDULE_IDAI.find(group => {
       const [min, max] = group.age.match(/\d+/g)?.map(Number) || [0, 999];
       return calculateAgeMonths >= min && calculateAgeMonths <= max;
    });
    const checkedItems = currentGroup?.milestones.filter(m => checklist[m]) || [];
    
    const analysis = await getDevelopmentAnalysis(calculateAgeMonths, checkedItems, language);
    
    // Append Disclaimer and Timestamp explicitly to be saved in DB
    const timestamp = new Date().toLocaleString('id-ID', { dateStyle: 'full', timeStyle: 'short' });
    const finalContent = `
        ${analysis}
        <br/><br/>
        <div class="p-3 bg-slate-50 border-t border-slate-200 rounded-xl">
            <p class="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Dibuat: ${timestamp}</p>
            <p class="text-[10px] font-bold text-slate-500 italic">Informasi mungkin tidak akurat, konsultasikan ke dokter/nakes profesional.</p>
        </div>
    `;

    onUpdateMember({ ...member, aiDevelopmentAnalysis: finalContent });
    setAnalyzingDev(false);
  };

  const handleToggleChecklist = (item: string) => {
    const newChecklist = { ...checklist, [item]: !checklist[item] };
    setChecklist(newChecklist);
    onUpdateMember({ ...member, developmentChecklist: JSON.stringify(newChecklist) });
  };

  const handleToggleImmune = (vaccine: string) => {
    const newChecklist = { ...immuneChecklist, [vaccine]: !immuneChecklist[vaccine] };
    setImmuneChecklist(newChecklist);
    onUpdateMember({ ...member, immunizationChecklist: JSON.stringify(newChecklist) });
  };

  const handleAddLog = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newLog: GrowthLog = {
      id: editingLog?.id || Math.random().toString(36).substr(2, 9),
      memberId: member.id,
      dateTime: formData.get('dateTime') as string,
      weight: parseFloat(formData.get('weight') as string),
      height: parseFloat(formData.get('height') as string),
      headCircumference: parseFloat(formData.get('head') as string) || undefined
    };
    
    if (editingLog && onUpdateGrowthLog) {
        onUpdateGrowthLog(newLog);
    } else {
        onAddGrowthLog(newLog);
    }
    setEditingLog(null);
    setViewMode('dashboard');
  };

  const filteredLogs = useMemo(() => {
    let logs = [...growthLogs].sort((a,b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
    
    if (dateRange.start) {
        logs = logs.filter(l => new Date(l.dateTime) >= new Date(dateRange.start));
    }
    if (dateRange.end) {
        const end = new Date(dateRange.end);
        end.setHours(23,59,59);
        logs = logs.filter(l => new Date(l.dateTime) <= end);
    }
    return logs;
  }, [growthLogs, dateRange]);

  const confirmDeleteLog = () => {
      if(deleteLogId && onDeleteGrowthLog) {
          onDeleteGrowthLog(deleteLogId);
          setDeleteLogId(null);
      }
  };

  if (viewMode === 'form') {
    return (
      <div className="animate-fadeIn max-w-lg mx-auto">
        <div className="flex items-center gap-4 mb-8">
           <button onClick={() => setViewMode('dashboard')} className="p-3 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors">
              <ChevronLeft size={24} className="text-slate-600" />
           </button>
           <h2 className="text-2xl font-black text-slate-800 tracking-tight">{editingLog ? 'Ubah Pengukuran' : 'Input Pengukuran Baru'}</h2>
        </div>

        <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100">
            <form onSubmit={handleAddLog} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Waktu Catat</label>
                <input name="dateTime" type="datetime-local" defaultValue={editingLog?.dateTime || getCurrentLocalDateTime()} required className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-lg" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                 <div><label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-tighter">Berat (kg)</label><input name="weight" type="number" step="0.01" defaultValue={editingLog?.weight} required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-xl text-center" placeholder="0.0" /></div>
                 <div><label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-tighter">Tinggi (cm)</label><input name="height" type="number" step="0.1" defaultValue={editingLog?.height} required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-xl text-center" placeholder="0.0" /></div>
              </div>
              <div><label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-widest">Lingkar Kepala (cm)</label><input name="head" type="number" step="0.1" defaultValue={editingLog?.headCircumference} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-lg" placeholder="Opsional" /></div>
              <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-100 mt-4">SIMPAN DATA UKUR</button>
            </form>
        </div>
      </div>
    );
  }

  if (viewMode === 'logList') {
      return (
        <div className="animate-fadeIn pb-24">
            <ConfirmationModal 
                isOpen={!!deleteLogId} 
                onClose={() => setDeleteLogId(null)}
                onConfirm={confirmDeleteLog}
                title="Hapus Data?"
                message="Data pengukuran ini akan dihapus permanen."
            />
            <div className="flex items-center gap-4 mb-8">
               <button onClick={() => setViewMode('dashboard')} className="p-3 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors">
                  <ChevronLeft size={24} className="text-slate-600" />
               </button>
               <h2 className="text-2xl font-black text-slate-800 tracking-tight">Riwayat Pengukuran</h2>
            </div>

            <div className="mb-6 flex flex-col md:flex-row gap-4">
                 <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-2xl border border-slate-100 text-sm font-bold text-slate-600 relative">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dari</span>
                    <input type="date" value={dateRange.start} onChange={(e) => setDateRange({...dateRange, start: e.target.value})} className="outline-none bg-transparent text-slate-700 pr-6" />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-600 pointer-events-none" size={16} />
                 </div>
                 <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-2xl border border-slate-100 text-sm font-bold text-slate-600 relative">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sampai</span>
                    <input type="date" value={dateRange.end} onChange={(e) => setDateRange({...dateRange, end: e.target.value})} className="outline-none bg-transparent text-slate-700 pr-6" />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-600 pointer-events-none" size={16} />
                 </div>
                 {(dateRange.start || dateRange.end) && (
                    <button onClick={() => setDateRange({start: '', end: ''})} className="p-3 bg-slate-200 hover:bg-slate-300 rounded-xl text-slate-600 transition-colors"><X size={14}/></button>
                 )}
            </div>

            <div className="bg-white rounded-[3rem] border border-slate-100 overflow-hidden shadow-sm">
               <div className="overflow-x-auto">
                  <table className="w-full text-left">
                     <thead>
                        <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 border-b border-slate-100">
                           <th className="px-6 py-4">Waktu</th>
                           <th className="px-6 py-4 text-center">Berat (kg)</th>
                           <th className="px-6 py-4 text-center">Tinggi (cm)</th>
                           <th className="px-6 py-4 text-center">L.Kepala (cm)</th>
                           <th className="px-6 py-4 text-right">Aksi</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 text-sm font-bold text-slate-700">
                        {filteredLogs.length > 0 ? filteredLogs.map(log => (
                           <tr key={log.id} className="hover:bg-slate-50/50">
                              <td className="px-6 py-4">
                                 <p>{formatDateTimeUpper(log.dateTime)}</p>
                              </td>
                              <td className="px-6 py-4 text-center text-blue-600">{log.weight}</td>
                              <td className="px-6 py-4 text-center text-emerald-600">{log.height}</td>
                              <td className="px-6 py-4 text-center text-indigo-600">{log.headCircumference || '-'}</td>
                              <td className="px-6 py-4 text-right">
                                 <div className="flex justify-end gap-2">
                                    <button onClick={() => { setEditingLog(log); setViewMode('form'); }} className="text-blue-600 p-2 bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                                    <button onClick={() => setDeleteLogId(log.id)} className="text-red-500 p-2 bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                                 </div>
                              </td>
                           </tr>
                        )) : <tr><td colSpan={5} className="px-6 py-10 text-center text-slate-400 italic">Belum ada data.</td></tr>}
                     </tbody>
                  </table>
               </div>
            </div>
        </div>
      );
  }

  return (
    <div className="space-y-8 animate-fadeIn pb-24">
      
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 md:p-8 rounded-[3rem] shadow-sm border border-slate-50 gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
           <button 
             onClick={() => setShowMemberSelector(true)}
             className="w-16 h-16 rounded-[1.5rem] overflow-hidden border-4 border-blue-500 shadow-xl shrink-0 hover:scale-105 transition-transform relative group cursor-pointer"
             title="Ganti Anggota Keluarga"
           >
              <img src={member.photoUrl} className="w-full h-full object-cover" alt={member.name} />
              <div className="absolute inset-0 bg-black/20 hidden group-hover:flex items-center justify-center">
                 <Users size={20} className="text-white" />
              </div>
           </button>
           
           <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-800 leading-tight">Tumbuh Kembang Anak</h2>
              <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setShowMemberSelector(true)}>
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">{member.name} • {calculateAgeMonths} {t.months}</p>
                <ChevronDown size={14} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
              </div>
           </div>
        </div>
        <div className="flex gap-2 w-full md:w-auto">
            <button onClick={() => setViewMode('form')} className="flex-1 md:flex-initial bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2">
              <Plus size={18} /> {t.newMeasurement}
            </button>
            <button onClick={() => setViewMode('logList')} className="bg-slate-100 text-slate-600 px-6 py-4 rounded-2xl hover:bg-slate-200 transition-all shadow-sm flex items-center justify-center">
               <Folder size={20} />
            </button>
        </div>
      </div>

      {showMemberSelector && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl flex flex-col border-2 border-white relative">
            <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-black text-slate-800">Pilih Anggota Keluarga</h3><button onClick={() => setShowMemberSelector(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20}/></button></div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto scrollbar-hide">
              {allMembers.map(m => (
                <button key={m.id} onClick={() => { onSwitchMember(m.id); setShowMemberSelector(false); }} className={`p-4 rounded-[2rem] border transition-all flex flex-col items-center gap-3 ${m.id === member.id ? 'bg-blue-50 border-blue-200' : 'bg-white hover:border-blue-200'}`}>
                  <div className="w-16 h-16 rounded-2xl overflow-hidden shadow-sm"><img src={m.photoUrl} className="w-full h-full object-cover" /></div>
                  <div className="text-center"><p className="text-xs font-black line-clamp-1">{m.name}</p><p className="text-[9px] font-bold text-slate-400 uppercase">{m.relation}</p></div>
                </button>
              ))}
            </div>
          </div>
        </div>, document.body
      )}

      {/* READ MORE MODALS (AI ANALYSES) */}
      {showGrowthModal && member.aiGrowthAnalysis && createPortal(
         <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[85vh] flex flex-col border-4 border-white shadow-2xl overflow-hidden relative">
               <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-3 text-white"><Cpu size={24} /><h3 className="text-lg font-black">Analisa Tumbuh Kembang</h3></div>
                  <button onClick={() => setShowGrowthModal(false)} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full"><X size={24} /></button>
               </div>
               <div className="flex-1 p-8 overflow-y-auto bg-slate-50/50">
                  <div className="prose prose-sm prose-blue max-w-none font-medium text-slate-700" dangerouslySetInnerHTML={{ __html: member.aiGrowthAnalysis }} />
               </div>
            </div>
         </div>, document.body
      )}

      {showImmuneModal && member.aiImmunizationAnalysis && createPortal(
         <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[85vh] flex flex-col border-4 border-white shadow-2xl overflow-hidden relative">
               <div className="p-6 bg-gradient-to-r from-emerald-600 to-teal-600 flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-3 text-white"><Shield size={24} /><h3 className="text-lg font-black">Info Imunisasi Terkini</h3></div>
                  <button onClick={() => setShowImmuneModal(false)} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full"><X size={24} /></button>
               </div>
               <div className="flex-1 p-8 overflow-y-auto bg-slate-50/50">
                  <div className="prose prose-sm prose-emerald max-w-none font-medium text-slate-700" dangerouslySetInnerHTML={{ __html: member.aiImmunizationAnalysis }} />
               </div>
            </div>
         </div>, document.body
      )}

      {showDevModal && member.aiDevelopmentAnalysis && createPortal(
         <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[85vh] flex flex-col border-4 border-white shadow-2xl overflow-hidden relative">
               <div className="p-6 bg-gradient-to-r from-orange-500 to-amber-500 flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-3 text-white"><BrainCircuit size={24} /><h3 className="text-lg font-black">Analisa Perkembangan Anak</h3></div>
                  <button onClick={() => setShowDevModal(false)} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full"><X size={24} /></button>
               </div>
               <div className="flex-1 p-8 overflow-y-auto bg-slate-50/50">
                  <div className="prose prose-sm prose-orange max-w-none font-medium text-slate-700" dangerouslySetInnerHTML={{ __html: member.aiDevelopmentAnalysis }} />
               </div>
            </div>
         </div>, document.body
      )}

      <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
        <h3 className="text-lg font-black mb-8 text-slate-800 flex items-center gap-3">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><ChartColumnBig size={20} /></div>
          Chart Pertumbuhan
        </h3>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={[...growthLogs].sort((a,b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="dateTime" fontSize={9} tickMargin={10} stroke="#cbd5e1" tickFormatter={(v) => new Date(v).toLocaleDateString()} />
              <YAxis fontSize={9} stroke="#cbd5e1" />
              <Tooltip 
                contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', padding: '15px' }}
                labelStyle={{ fontWeight: 'black', marginBottom: '5px' }}
                labelFormatter={(value) => formatDateTimeUpper(value as string)}
              />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
              <Line type="monotone" dataKey="weight" stroke="#3b82f6" strokeWidth={4} dot={{ r: 4 }} name="Berat (kg)" />
              <Line type="monotone" dataKey="height" stroke="#10b981" strokeWidth={4} dot={{ r: 4 }} name="Tinggi (cm)" />
              <Line type="monotone" dataKey="headCircumference" stroke="#8b5cf6" strokeWidth={4} dot={{ r: 4 }} name="Lingkar Kepala (cm)" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-[3rem] p-8 md:p-10 relative overflow-hidden shadow-sm">
         <div className="absolute top-0 right-0 p-10 opacity-5"><Cpu size={200} /></div>
         <div className="relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
               <h3 className="font-black text-xl text-indigo-900 flex items-center gap-3">
                  <div className="p-2 bg-white rounded-xl shadow-sm text-indigo-600"><Info size={20} /></div>
                  Analisa Tumbuh Kembang
               </h3>
               <button 
                  onClick={handleGenerateGrowthAI}
                  disabled={analyzingGrowth} 
                  className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2"
               >
                  {analyzingGrowth ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />} 
                  {member.aiGrowthAnalysis ? 'ANALISA ULANG' : 'MULAI ANALISA'}
               </button>
            </div>

            {member.aiGrowthAnalysis ? (
               <div className="bg-white/60 backdrop-blur-sm rounded-[2rem] p-6 border border-white/50">
                  <div className="prose prose-sm prose-indigo max-w-none font-medium leading-relaxed text-slate-700 line-clamp-[8]" dangerouslySetInnerHTML={{ __html: member.aiGrowthAnalysis }} />
                  <button onClick={() => setShowGrowthModal(true)} className="mt-4 flex items-center gap-2 text-indigo-600 font-black text-xs uppercase tracking-widest hover:underline">
                     Baca Selengkapnya <Maximize2 size={12} />
                  </button>
               </div>
            ) : (
               <div className="text-center py-10 text-indigo-400 font-medium italic">
                  Belum ada analisa. Klik tombol di atas untuk mendapatkan insight tumbuh kembang.
               </div>
            )}
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-[3rem] p-8 md:p-10 relative overflow-hidden shadow-sm flex flex-col h-full">
            <div className="absolute top-0 right-0 p-10 opacity-5"><Shield size={200} /></div>
            <div className="relative z-10 flex flex-col h-full">
               <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                  <h3 className="font-black text-xl text-emerald-900 flex items-center gap-3">
                     <div className="p-2 bg-white rounded-xl shadow-sm text-emerald-600"><Shield size={20} /></div>
                     Info Imunisasi Terkini
                  </h3>
                  <button 
                     onClick={handleGenerateImmuneAI}
                     disabled={analyzingImmune} 
                     className="px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-emerald-700 transition-all flex items-center gap-2 shrink-0"
                  >
                     {analyzingImmune ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />} 
                     {member.aiImmunizationAnalysis ? 'Update Info' : 'Cek Jadwal'}
                  </button>
               </div>

               <div className="flex-1">
                  {member.aiImmunizationAnalysis ? (
                     <div className="bg-white/60 backdrop-blur-sm rounded-[2rem] p-6 border border-white/50 h-full">
                        <div className="prose prose-sm prose-emerald max-w-none font-medium leading-relaxed text-slate-700 line-clamp-[12]" dangerouslySetInnerHTML={{ __html: member.aiImmunizationAnalysis }} />
                        <button onClick={() => setShowImmuneModal(true)} className="mt-4 flex items-center gap-2 text-emerald-600 font-black text-xs uppercase tracking-widest hover:underline">
                           Baca Selengkapnya <Maximize2 size={12} />
                        </button>
                     </div>
                  ) : (
                     <div className="text-center py-10 text-emerald-400 font-medium italic">
                        Dapatkan rekomendasi imunisasi terkini sesuai usia anak.
                     </div>
                  )}
               </div>
            </div>
         </div>

         <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100 flex flex-col h-full max-h-[600px]">
            <div className="flex justify-between items-center mb-6 shrink-0">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Calendar size={20} /></div>
                Daftar Imunisasi
              </h3>
            </div>
            <div className="overflow-y-auto pr-2 scrollbar-hide space-y-4 flex-1">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {VACCINATION_SCHEDULE_IDAI.map((item, idx) => (
                   <div key={idx} className="flex gap-4 p-5 rounded-3xl border border-slate-50 bg-white hover:bg-slate-50 transition-all group">
                     <div className="w-14 h-14 bg-slate-50 text-slate-400 border border-slate-100 rounded-2xl flex flex-col items-center justify-center shrink-0 group-hover:bg-blue-600 group-hover:text-white group-hover:border-blue-600 transition-colors">
                       <span className="text-[7px] font-black uppercase tracking-tighter opacity-60">Usia</span>
                       <span className="text-xs font-black">{item.age}</span>
                     </div>
                     <div className="flex-1 space-y-2 py-1">
                       {item.vaccines.map((v, vIdx) => (
                         <label key={vIdx} className="flex items-center gap-2 cursor-pointer">
                           <input 
                              type="checkbox" 
                              className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-0 checked:bg-blue-600"
                              checked={!!immuneChecklist[v]}
                              onChange={() => handleToggleImmune(v)}
                           />
                           <span className={`text-xs font-bold leading-tight ${immuneChecklist[v] ? 'text-blue-600 line-through opacity-70' : 'text-slate-700'}`}>{v}</span>
                         </label>
                       ))}
                     </div>
                   </div>
                 ))}
               </div>
            </div>
         </div>
      </div>

      <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
         <h3 className="text-lg font-black mb-6 text-slate-800 flex items-center gap-3">
            <div className="p-2 bg-orange-50 text-orange-600 rounded-xl"><PersonStanding size={18} /></div>
            Daftar Perkembangan
         </h3>
         <div className="overflow-y-auto max-h-[600px] pr-2 scrollbar-hide">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {MILESTONES_SCHEDULE_IDAI.map((group, gIdx) => (
                  <div key={gIdx} className="bg-slate-50/50 p-6 rounded-[2.5rem] border border-slate-100 h-full">
                     <div className="flex items-center gap-3 mb-4">
                        <div className="min-w-[4.5rem] px-3 h-12 bg-white rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-orange-600 shadow-sm shrink-0">
                           <span className="text-[6px] font-black uppercase tracking-tighter opacity-60">Usia</span>
                           <span className="text-[10px] font-black whitespace-nowrap">{group.age}</span>
                        </div>
                        <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Target Kemampuan</h4>
                     </div>
                     <div className="space-y-3">
                        {group.milestones.map((ms, idx) => (
                           <label key={idx} className="flex items-start gap-3 p-4 bg-white rounded-2xl border border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors group">
                              <input 
                                 type="checkbox" 
                                 className="w-5 h-5 rounded-md border-2 border-slate-300 text-orange-600 focus:ring-0 checked:bg-orange-600 checked:border-orange-600 mt-0.5" 
                                 checked={!!checklist[ms]}
                                 onChange={() => handleToggleChecklist(ms)}
                              />
                              <span className={`text-xs font-bold leading-snug group-hover:text-orange-600 ${checklist[ms] ? 'text-slate-800 line-through opacity-50' : 'text-slate-600'}`}>{ms}</span>
                           </label>
                        ))}
                     </div>
                  </div>
               ))}
            </div>
         </div>
      </div>

      <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 rounded-[3rem] p-8 md:p-10 relative overflow-hidden shadow-sm">
         <div className="absolute top-0 right-0 p-10 opacity-5"><BrainCircuit size={200} /></div>
         <div className="relative z-10">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
               <h3 className="font-black text-xl text-orange-900 flex items-center gap-3">
                  <div className="p-2 bg-white rounded-xl shadow-sm text-orange-600"><Info size={20} /></div>
                  Analisa Perkembangan Anak
               </h3>
               <button 
                  onClick={handleGenerateDevAI}
                  disabled={analyzingDev} 
                  className="px-6 py-3 bg-orange-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg hover:bg-orange-700 transition-all flex items-center gap-2"
               >
                  {analyzingDev ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />} 
                  {member.aiDevelopmentAnalysis ? 'ANALISA ULANG' : 'MULAI ANALISA'}
               </button>
            </div>

            {member.aiDevelopmentAnalysis ? (
               <div className="bg-white/60 backdrop-blur-sm rounded-[2rem] p-6 border border-white/50">
                  <div className="prose prose-sm prose-orange max-w-none font-medium leading-relaxed text-slate-700 line-clamp-[8]" dangerouslySetInnerHTML={{ __html: member.aiDevelopmentAnalysis }} />
                  <button onClick={() => setShowDevModal(true)} className="mt-4 flex items-center gap-2 text-orange-600 font-black text-xs uppercase tracking-widest hover:underline">
                     Baca Selengkapnya <Maximize2 size={12} />
                  </button>
               </div>
            ) : (
               <div className="text-center py-10 text-orange-400 font-medium italic">
                  Centang perkembangan di atas lalu klik tombol analisa untuk mendapatkan insight.
               </div>
            )}
         </div>
      </div>

    </div>
  );
};

export default KidsView;
