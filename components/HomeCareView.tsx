
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Home, Plus, Activity, Thermometer, X, Trash2, Edit2, ChevronLeft, ArrowRight, AlertTriangle, RotateCcw, Calendar, Users, ChevronDown, Stethoscope, Sparkles, Download, CheckCircle2, BrainCircuit, Loader2, Heart, Droplet, FileText, Search, Info } from 'lucide-react';
import { FamilyMember, HomeCareLog, Language, FileAttachment, HomeCareEntry } from '../types';
import { useTranslation } from '../translations';
import { spreadsheetService } from '../services/spreadsheetService';
import { getHomeCareAdvice } from '../services/geminiService';
import ConfirmationModal from './ConfirmationModal';

interface HomeCareViewProps {
  member: FamilyMember;
  allMembers: FamilyMember[];
  onSwitchMember: (id: string) => void;
  homeCareLogs: HomeCareLog[];
  language: Language;
  onAddLog: (log: HomeCareLog) => void;
  onUpdateLog: (log: HomeCareLog) => void;
  onDeleteLog: (id: string) => void;
  initialOpenId?: string | null;
  initialSubId?: string | null;
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

const HomeCareView: React.FC<HomeCareViewProps> = ({ member, allMembers, onSwitchMember, homeCareLogs, language, onAddLog, onUpdateLog, onDeleteLog, initialOpenId, initialSubId }) => {
  const [viewMode, setViewMode] = useState<'list' | 'logDetail' | 'logForm' | 'entryForm' | 'entryDetail'>('list');
  const [activeLogId, setActiveLogId] = useState<string | null>(null);
  const [confirmAction, setConfirmAction] = useState<'finish' | 'reactivate' | null>(null);
  const [showMemberSelector, setShowMemberSelector] = useState(false);
  
  const [editingLog, setEditingLog] = useState<HomeCareLog | null>(null);
  const [editingEntry, setEditingEntry] = useState<HomeCareEntry | null>(null);
  const [viewEntry, setViewEntry] = useState<HomeCareEntry | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isSaving, setIsSaving] = useState(false);
  const [existingFiles, setExistingFiles] = useState<FileAttachment[]>([]);
  const [newFiles, setNewFiles] = useState<{file: File, preview: string}[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // AI State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiContent, setAiContent] = useState<string>('');

  // Delete Confirmation State
  const [deleteLogId, setDeleteLogId] = useState<string | null>(null);
  const [deleteEntryId, setDeleteEntryId] = useState<string | null>(null);

  const t = useTranslation(language);

  // Deep linking handling
  useEffect(() => {
    if (initialOpenId) {
      const targetLog = homeCareLogs.find(l => l.id === initialOpenId);
      if (targetLog) {
        setActiveLogId(targetLog.id);
        
        if (initialSubId) {
           const targetEntry = targetLog.entries.find(e => e.id === initialSubId);
           if (targetEntry) {
             setViewEntry(targetEntry);
             setViewMode('entryDetail');
           } else {
             setViewMode('logDetail');
           }
        } else {
           setViewMode('logDetail');
        }
      }
    }
  }, [initialOpenId, initialSubId, homeCareLogs]);

  const activeLog = useMemo(() => homeCareLogs.find(l => l.id === activeLogId) || null, [homeCareLogs, activeLogId]);

  const sortedLogs = useMemo(() => {
    const sorted = [...homeCareLogs].sort((a, b) => {
      if (a.active && !b.active) return -1;
      if (!a.active && b.active) return 1;
      const timeA = a.createdTime ? new Date(a.createdTime).getTime() : 0;
      const timeB = b.createdTime ? new Date(b.createdTime).getTime() : 0;
      return timeB - timeA;
    });
    
    if (!searchTerm) return sorted;
    
    return sorted.filter(log => 
      log.title.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [homeCareLogs, searchTerm]);

  const getCurrentLocalDateTime = () => {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000; 
    return new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const handleOpenLogForm = (log?: HomeCareLog) => {
    setEditingLog(log || null);
    setViewMode('logForm');
  };

  const handleSaveLog = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    if (editingLog) {
      const updatedLog: HomeCareLog = {
        ...editingLog,
        title: formData.get('title') as string,
        createdTime: formData.get('createdTime') as string,
      };
      onUpdateLog(updatedLog);
    } else {
      const newLog: HomeCareLog = {
        id: Math.random().toString(36).substr(2, 9),
        memberId: member.id,
        title: formData.get('title') as string,
        createdTime: formData.get('createdTime') as string,
        entries: [],
        active: true
      };
      onAddLog(newLog);
    }
    setEditingLog(null);
    setViewMode('list');
  };

  const confirmDeleteLog = () => {
    if (deleteLogId) {
      onDeleteLog(deleteLogId);
      setDeleteLogId(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
       const files = Array.from(e.target.files).map((f: File) => ({ file: f, preview: URL.createObjectURL(f) }));
       setNewFiles(p => [...p, ...files]);
    }
    if (e.target) e.target.value = '';
  };

  const handleSaveEntry = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeLog) return;
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    try {
      const uploaded: FileAttachment[] = [];
      for (const item of newFiles) {
        const result = await spreadsheetService.uploadFile(item.file);
        if (result?.url) uploaded.push({ url: result.url, name: item.file.name });
      }
      const finalFiles = [...existingFiles, ...uploaded];
      
      const bp = formData.get('bp') as string;
      let sys, dia;
      if (bp) {
        const parts = bp.split('/');
        sys = parseFloat(parts[0]);
        if(parts.length > 1) dia = parseFloat(parts[1]);
      }

      const entryData: HomeCareEntry = {
        id: editingEntry?.id || Math.random().toString(36).substr(2, 5),
        dateTime: formData.get('dateTime') as string,
        symptom: formData.get('symptom') as string,
        temperature: parseFloat(formData.get('temp') as string) || undefined,
        systolic: sys,
        diastolic: dia,
        heartRate: parseFloat(formData.get('hr') as string) || undefined,
        oxygen: parseFloat(formData.get('spo2') as string) || undefined,
        note: formData.get('note') as string,
        files: finalFiles
      };
      const updatedEntries = editingEntry 
        ? activeLog.entries.map(en => en.id === editingEntry.id ? entryData : en)
        : [...activeLog.entries, entryData];
      onUpdateLog({ ...activeLog, entries: updatedEntries });
      setViewMode('logDetail');
    } catch (err) { alert("Error saving"); } finally { setIsSaving(false); }
  };

  const confirmDeleteEntry = () => {
    if (activeLog && deleteEntryId) {
      onUpdateLog({ ...activeLog, entries: activeLog.entries.filter(en => en.id !== deleteEntryId) });
      setDeleteEntryId(null);
    }
  };

  const handleOpenLogDetail = (log: HomeCareLog) => {
    setActiveLogId(log.id);
    setViewMode('logDetail');
  };

  const handleOpenEntryDetail = (entry: HomeCareEntry) => {
    setViewEntry(entry);
    setViewMode('entryDetail');
  };

  const handleOpenEntryForm = (entry?: HomeCareEntry) => {
    setEditingEntry(entry || null);
    setExistingFiles(entry?.files || []);
    setNewFiles([]);
    setViewMode('entryForm');
  };

  const executeAction = () => {
    if (activeLog && confirmAction) {
      onUpdateLog({ ...activeLog, active: confirmAction === 'reactivate' });
    }
    setConfirmAction(null);
  };

  const triggerConfirmation = (action: 'finish' | 'reactivate') => setConfirmAction(action);

  // AI FUNCTIONS
  const generateAiAdvice = async (forceRegenerate = false) => {
    if (!activeLog) return;
    setAiLoading(true);
    setShowAiModal(true);
    
    if (activeLog.aiAnalysis && !forceRegenerate) {
        setAiContent(activeLog.aiAnalysis);
        setAiLoading(false);
        return;
    }

    const context = `
      Title: ${activeLog.title}. 
      Created: ${activeLog.createdTime}. 
      Entries: ${activeLog.entries.map(e => `[${e.dateTime}] Symptom: ${e.symptom}, Vitals: Temp ${e.temperature||'-'}, BP ${e.systolic||'-'}/${e.diastolic||'-'}, Note: ${e.note}`).join('; ')}
    `;
    
    const advice = await getHomeCareAdvice(context, language);
    const result = advice || "Gagal memuat analisa.";
    setAiContent(result);
    onUpdateLog({ ...activeLog, aiAnalysis: result }); 
    setAiLoading(false);
  };

  const openAiAnalysisModal = () => {
    if (activeLog?.aiAnalysis) {
      setAiContent(activeLog.aiAnalysis);
      setShowAiModal(true);
    }
  };

  if (viewMode === 'logForm') { 
      return (
          <div className="animate-fadeIn w-full pb-24">
            <div className="flex items-center gap-4 mb-8">
               <button onClick={() => setViewMode('list')} className="p-3 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors">
                  <ChevronLeft size={24} className="text-slate-600" />
               </button>
               <h2 className="text-2xl font-black text-slate-800 tracking-tight">{editingLog ? 'Ubah Sesi Perawatan' : 'Sesi Perawatan Baru'}</h2>
            </div>
            <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-100">
                <form onSubmit={handleSaveLog} className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Judul / Keluhan Utama</label>
                    <input name="title" defaultValue={editingLog?.title} required placeholder="Mis: Demam Anak Jan 2025" className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold shadow-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Waktu Mulai</label>
                    <input name="createdTime" type="datetime-local" defaultValue={editingLog?.createdTime || getCurrentLocalDateTime()} required className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold shadow-sm" />
                  </div>
                  <button type="submit" className="w-full py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl tracking-widest transition-all active:scale-95">{editingLog ? 'Simpan Perubahan' : 'Mulai Pemantauan'}</button>
                </form>
            </div>
          </div>
      );
  }
  
  if (viewMode === 'entryForm') {
      return (
          <div className="animate-fadeIn w-full pb-24">
            <div className="flex items-center gap-4 mb-8">
               <button onClick={() => setViewMode('logDetail')} className="p-3 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors">
                  <ChevronLeft size={24} className="text-slate-600" />
               </button>
               <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">{editingEntry ? 'Ubah Entri' : 'Entri Log Baru'}</h2>
            </div>
            <div className="bg-white rounded-[2.5rem] p-10 shadow-sm border border-slate-100">
                <form onSubmit={handleSaveEntry} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{t.recordedTime}</label>
                      <input name="dateTime" type="datetime-local" defaultValue={editingEntry?.dateTime || getCurrentLocalDateTime()} required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold shadow-sm text-sm" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Gejala Utama / Keluhan</label>
                      <input name="symptom" defaultValue={editingEntry?.symptom} required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold shadow-sm text-sm" placeholder="Mis: Demam Tinggi" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div><label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-tighter">Suhu (°C)</label><input name="temp" type="number" step="0.1" defaultValue={editingEntry?.temperature} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold shadow-sm text-sm" placeholder="37.5" /></div>
                     <div><label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-tighter">SpO2 (%)</label><input name="spo2" type="number" defaultValue={editingEntry?.oxygen} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold shadow-sm text-sm" placeholder="98" /></div>
                     <div><label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-tighter">HR (bpm)</label><input name="hr" type="number" defaultValue={editingEntry?.heartRate} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold shadow-sm text-sm" placeholder="80" /></div>
                     <div><label className="block text-[10px] font-black text-slate-400 mb-1.5 uppercase tracking-tighter">Tekanan Darah</label><input name="bp" type="text" defaultValue={editingEntry?.systolic ? `${editingEntry.systolic}/${editingEntry.diastolic||''}` : ''} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold shadow-sm text-sm" placeholder="120/80" /></div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Catatan & Tindakan</label>
                    <textarea name="note" defaultValue={editingEntry?.note} required rows={3} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium shadow-sm text-sm" placeholder="Tindakan yang diambil..."></textarea>
                  </div>
                  
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Dokumentasi (Foto)</label>
                    <div className="flex flex-wrap gap-3">
                      {existingFiles.map((f, i) => (
                        <div key={`ex-${i}`} className="relative w-20 h-20 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 group">
                          {f.name.match(/\.(jpg|jpeg|png|webp)$/i) ? <img src={f.url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><FileText size={20} className="text-slate-300" /></div>}
                          <button type="button" onClick={() => setExistingFiles(p => p.filter((_, x) => x !== i))} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><X size={10} /></button>
                        </div>
                      ))}
                      {newFiles.map((f, i) => (
                        <div key={`new-${i}`} className="relative w-20 h-20 rounded-2xl overflow-hidden border-2 border-blue-400 bg-blue-50 group">
                          <img src={f.preview} className="w-full h-full object-cover" />
                          <button type="button" onClick={() => setNewFiles(p => p.filter((_, x) => x !== i))} className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"><X size={10} /></button>
                        </div>
                      ))}
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300 hover:border-blue-400 hover:text-blue-400 transition-all">
                        <Plus size={20} />
                      </button>
                      <input type="file" ref={fileInputRef} multiple className="hidden" onChange={handleFileSelect} accept="image/*" />
                    </div>
                  </div>

                  <div className="pt-4 flex gap-4">
                    <button type="button" onClick={() => setViewMode('logDetail')} className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">Batal</button>
                    <button type="submit" disabled={isSaving} className="flex-1 py-5 bg-slate-900 text-white rounded-2xl font-black uppercase text-xs shadow-xl flex items-center justify-center gap-2 tracking-widest hover:bg-slate-800">
                      {isSaving ? <Loader2 className="animate-spin" size={20} /> : 'Simpan Entri'}
                    </button>
                  </div>
                </form>
            </div>
          </div>
      );
  }

  if (viewMode === 'entryDetail' && viewEntry) {
    return (
      <div className="animate-fadeIn w-full space-y-8 pb-24">
        <div className="flex items-center gap-4">
           <button onClick={() => setViewMode('logDetail')} className="p-3 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors">
              <ChevronLeft size={24} className="text-slate-600" />
           </button>
           <h2 className="text-2xl font-black text-slate-800 tracking-tight">Detail Entri</h2>
        </div>
        <div className="bg-white rounded-[2.5rem] md:rounded-[3.5rem] p-8 md:p-10 shadow-sm border border-slate-100">
            <div className="flex justify-between items-start mb-6">
              <div>
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{formatDateTimeUpper(viewEntry.dateTime)}</span>
                  <h3 className="text-3xl font-black text-slate-800 leading-tight mt-1">{viewEntry.symptom}</h3>
              </div>
            </div>
            <div className="space-y-8">
                <div className="grid grid-cols-2 gap-4">
                  <DetailItem label="Suhu" value={viewEntry.temperature ? `${viewEntry.temperature}°C` : '-'} icon={Thermometer} />
                  <DetailItem label="Detak Jantung" value={viewEntry.heartRate ? `${viewEntry.heartRate} bpm` : '-'} icon={Heart} />
                  <DetailItem label="Oksigen (SpO2)" value={viewEntry.oxygen ? `${viewEntry.oxygen}%` : '-'} icon={Droplet} />
                  <DetailItem label="Tekanan Darah" value={viewEntry.systolic ? `${viewEntry.systolic}/${viewEntry.diastolic || '-'}` : '-'} icon={Activity} />
                </div>
                <div>
                  <h5 className="text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Observasi & Tindakan</h5>
                  <p className="text-sm text-slate-700 bg-slate-50 p-6 rounded-[2rem] border border-slate-100 italic leading-relaxed shadow-inner">"{viewEntry.note}"</p>
                </div>
                
                {viewEntry.files && viewEntry.files.length > 0 && (
                  <div>
                    <h5 className="text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">Dokumentasi</h5>
                    <div className="flex flex-wrap gap-3">
                      {viewEntry.files.map((f, i) => (
                        <div key={i} className="w-24 h-24 rounded-2xl overflow-hidden border border-slate-200 cursor-pointer" onClick={() => window.open(f.url, '_blank')}>
                           {f.name.match(/\.(jpg|jpeg|png|webp)$/i) ? <img src={f.url} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-slate-50 flex items-center justify-center"><FileText size={24} className="text-slate-300"/></div>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
            </div>
        </div>
      </div>
    );
  }

  if (viewMode === 'logDetail' && activeLog) {
    return (
      <div className="animate-fadeIn w-full space-y-8 pb-24 relative">
         <ConfirmationModal 
            isOpen={!!deleteEntryId} 
            onClose={() => setDeleteEntryId(null)}
            onConfirm={confirmDeleteEntry}
            title="Hapus Entri Log?"
            message="Data entri ini akan dihapus secara permanen."
         />

         <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="flex items-center gap-4">
                <button onClick={() => {setActiveLogId(null); setViewMode('list');}} className="p-3 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors"><ChevronLeft size={24} className="text-slate-600" /></button>
                <div>
                   <h2 className="text-xl font-black text-slate-800 leading-tight">{activeLog.title}</h2>
                   <span className={`text-[10px] font-black uppercase tracking-widest ${activeLog.active ? 'text-green-600' : 'text-slate-400'}`}>{activeLog.active ? 'Sesi Aktif' : 'Sesi Selesai'}</span>
                </div>
            </div>
            <div className="flex gap-2 items-center">
               <button onClick={() => generateAiAdvice(false)} className="px-5 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-200 hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                 <BrainCircuit size={16} className="text-blue-100" /> ANALISA
               </button>
               {activeLog.active ? (
                 <button onClick={() => setConfirmAction('finish')} className="px-4 py-2 bg-white text-rose-600 border border-rose-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 transition-all">Selesaikan</button>
               ) : (
                 <button onClick={() => setConfirmAction('reactivate')} className="px-4 py-2 bg-white text-emerald-600 border border-emerald-100 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-50 transition-all flex items-center gap-2"><RotateCcw size={12} /> Aktifkan</button>
               )}
            </div>
         </div>

         {activeLog.aiAnalysis && (
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-[2.5rem] p-8 border border-blue-100 shadow-sm relative overflow-hidden">
               <div className="flex items-center gap-3 mb-4 relative z-10">
                  <div className="p-2 bg-white rounded-xl shadow-sm text-indigo-600"><Info size={18} /></div>
                  <h3 className="font-black text-indigo-900 text-sm uppercase tracking-widest">Analisa Perawatan</h3>
               </div>
               
               <div className="relative z-10">
                  <div className="prose prose-sm prose-indigo max-w-none line-clamp-3 text-slate-600 font-medium mb-4"
                       dangerouslySetInnerHTML={{ __html: activeLog.aiAnalysis }}
                  />
                  <button 
                    onClick={openAiAnalysisModal}
                    className="text-[10px] font-black uppercase tracking-widest text-blue-600 flex items-center gap-2 hover:underline"
                  >
                    Baca Selengkapnya <ArrowRight size={12} />
                  </button>
               </div>
               
               <div className="absolute -top-10 -right-10 text-indigo-100 opacity-50"><BrainCircuit size={180} /></div>
            </div>
         )}

         <div className="bg-white rounded-[2.5rem] p-6 md:p-10 border border-slate-100 shadow-sm relative min-h-[400px]">
            <div className="flex justify-between items-center mb-8">
               <h3 className="font-black text-slate-800 text-lg">Riwayat Entri</h3>
               {activeLog.active && <button onClick={() => handleOpenEntryForm()} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest flex items-center gap-2 shadow-lg hover:bg-slate-800 transition-all"><Plus size={16} /> Entri Baru</button>}
            </div>
            <div className="space-y-4">
               {activeLog.entries.length > 0 ? (
                 [...activeLog.entries].sort((a,b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime()).map((entry) => (
                   <div key={entry.id} onClick={() => handleOpenEntryDetail(entry)} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 hover:bg-white hover:shadow-md cursor-pointer group transition-all flex flex-col md:flex-row justify-between gap-4">
                      <div>
                         <div className="flex items-center gap-3 mb-2">
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-2 py-1 rounded-lg">{formatDateTimeUpper(entry.dateTime)}</span>
                            {entry.temperature && <span className="text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg flex items-center gap-1"><Thermometer size={10}/> {entry.temperature}°C</span>}
                         </div>
                         <h4 className="font-black text-slate-800 text-base">{entry.symptom}</h4>
                         <p className="text-xs text-slate-500 line-clamp-1 mt-1">{entry.note}</p>
                      </div>
                      <div className="flex items-center gap-2 self-end md:self-center">
                         {activeLog.active && (
                           <>
                             <button onClick={(e) => { e.stopPropagation(); handleOpenEntryForm(entry); }} className="p-2 text-blue-600 bg-blue-50 rounded-xl transition-all"><Edit2 size={18} /></button>
                             <button onClick={(e) => { e.stopPropagation(); setDeleteEntryId(entry.id); }} className="p-2 text-red-500 bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                           </>
                         )}
                         <ChevronLeft size={20} className="rotate-180 text-slate-300" />
                      </div>
                   </div>
                 ))
               ) : (
                 <div className="text-center py-20 text-slate-300 font-black uppercase text-xs">Belum ada data</div>
               )}
            </div>
         </div>

         {showAiModal && createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
               <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[85vh] flex flex-col border-4 border-white shadow-2xl overflow-hidden relative">
                  <div className="p-6 bg-gradient-to-r from-blue-600 to-indigo-600 flex justify-between items-center shrink-0">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 text-white rounded-xl backdrop-blur-md"><Stethoscope size={24} /></div>
                        <div className="text-white"><h3 className="text-lg font-black">Analisa Perawatan</h3></div>
                     </div>
                     <button onClick={() => setShowAiModal(false)} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"><X size={24} /></button>
                  </div>
                  <div className="flex-1 p-8 overflow-y-auto bg-slate-50/50">
                     {aiLoading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-indigo-400 gap-4">
                           <Activity className="animate-spin" size={48} />
                           <p className="text-xs font-black uppercase tracking-widest animate-pulse">Sedang Menganalisa Data Klinis...</p>
                        </div>
                     ) : (
                        <div className="prose prose-sm prose-indigo max-w-none font-medium leading-relaxed text-slate-700">
                           <div dangerouslySetInnerHTML={{ __html: aiContent }} />
                        </div>
                     )}
                  </div>
                  <div className="p-6 border-t border-slate-100 bg-white flex gap-4 shrink-0">
                     <button onClick={() => generateAiAdvice(true)} disabled={aiLoading} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"><RotateCcw size={16} /> Regenerate Analisa</button>
                  </div>
               </div>
            </div>, document.body
         )}

         {confirmAction && createPortal(
           <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
             <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl animate-scaleIn flex flex-col items-center text-center border-2 border-white relative overflow-hidden">
               {confirmAction === 'finish' ? (
                 <>
                   <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-rose-400 to-rose-600"></div>
                   <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-6 shadow-sm border border-rose-100"><AlertTriangle size={36} strokeWidth={2.5} /></div>
                   <h3 className="text-xl font-black text-slate-800 mb-2">Selesaikan Perawatan?</h3>
                   <div className="flex gap-3 w-full mt-6"><button onClick={() => setConfirmAction(null)} className="flex-1 py-4 bg-slate-100 rounded-2xl font-bold text-xs uppercase">Batal</button><button onClick={executeAction} className="flex-1 py-4 bg-rose-600 text-white rounded-2xl font-bold text-xs uppercase shadow-lg shadow-rose-200">Ya, Selesaikan</button></div>
                 </>
               ) : (
                 <>
                   <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-emerald-400 to-emerald-600"></div>
                   <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-sm border border-emerald-100"><RotateCcw size={36} strokeWidth={2.5} /></div>
                   <h3 className="text-xl font-black text-slate-800 mb-2">Aktifkan Kembali?</h3>
                   <div className="flex gap-3 w-full mt-6"><button onClick={() => setConfirmAction(null)} className="flex-1 py-4 bg-slate-100 rounded-2xl font-bold text-xs uppercase">Batal</button><button onClick={executeAction} className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-bold text-xs uppercase shadow-lg shadow-emerald-200">Ya, Aktifkan</button></div>
                 </>
               )}
             </div>
           </div>, document.body
         )}
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn relative pb-24">
      <ConfirmationModal 
        isOpen={!!deleteLogId} 
        onClose={() => setDeleteLogId(null)}
        onConfirm={confirmDeleteLog}
        title="Hapus Sesi Perawatan?"
        message="Seluruh log dan entri di dalam sesi ini akan dihapus permanen."
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
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
              <h2 className="text-xl md:text-2xl font-black text-slate-800 leading-tight">{t.homeCare}</h2>
              <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setShowMemberSelector(true)}>
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">{member.name}</p>
                <ChevronDown size={14} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
              </div>
           </div>
        </div>
        <button onClick={() => handleOpenLogForm()} className="bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl flex items-center gap-2 active:scale-95 transition-all"><Plus size={18} /> {t.newHomeCare}</button>
      </div>

      {showMemberSelector && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl flex flex-col border-2 border-white relative">
            <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-black text-slate-800">Pilih Profil</h3><button onClick={() => setShowMemberSelector(false)} className="p-2 hover:bg-slate-100 rounded-full"><X size={20}/></button></div>
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

      <div className="relative">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
        <input 
          type="text" 
          placeholder="Cari sesi perawatan..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-14 pr-6 py-4 bg-white border border-slate-100 rounded-[2rem] shadow-sm outline-none font-medium focus:ring-4 focus:ring-blue-50 transition-all text-sm" 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedLogs.map((log) => (
          <div key={log.id} onClick={() => handleOpenLogDetail(log)} className="group bg-white p-6 md:p-8 rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer relative overflow-hidden flex flex-col h-full">
             <div className="absolute top-0 left-0 w-2 h-full bg-slate-100 group-hover:bg-blue-500 transition-colors"></div>
             <div className="flex justify-between items-start mb-6 pl-4">
                <div><span className={`text-[9px] font-black uppercase tracking-widest block mb-0.5 ${log.active ? 'text-green-500' : 'text-slate-400'}`}>{log.active ? '• Aktif' : '• Selesai'}</span><p className="text-xs font-bold text-slate-400">{log.entries.length} Entri</p></div>
                {log.createdTime && <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 rounded-lg"><Calendar size={12} className="text-slate-400" /><span className="text-[9px] font-bold text-slate-500">{formatDateUpper(log.createdTime)}</span></div>}
             </div>
             <div className="pl-4 flex-1">
               <h3 className="text-xl font-black text-slate-800 leading-tight mb-2 group-hover:text-blue-600 transition-colors">{log.title}</h3>
               {log.entries.length > 0 && <p className="text-xs text-slate-500 font-medium">Update: {formatDateUpper(log.entries[log.entries.length-1].dateTime)}</p>}
             </div>
             <div className="pl-4 mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <button onClick={(e) => { e.stopPropagation(); handleOpenLogForm(log); }} className="p-2 text-blue-600 bg-blue-50 rounded-xl transition-all hover:bg-blue-100"><Edit2 size={16} /></button>
                   <button onClick={(e) => { e.stopPropagation(); setDeleteLogId(log.id); }} className="p-2 text-red-500 bg-red-50 rounded-xl transition-all hover:bg-red-100"><Trash2 size={16} /></button>
                </div>
                <div className="flex items-center text-blue-600 font-bold text-xs uppercase tracking-widest"><span>Detail</span><ArrowRight size={16} /></div>
             </div>
          </div>
        ))}
        {sortedLogs.length === 0 && <div className="col-span-full py-24 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200"><Home size={48} className="mx-auto text-slate-300 mb-4" /><p className="font-black text-slate-400 uppercase tracking-widest text-xs">Belum ada log perawatan yang cocok.</p></div>}
      </div>
    </div>
  );
};

const DetailItem = ({ label, value, icon: Icon }: any) => (
  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
    <div className="flex items-center gap-2 mb-1">
      <Icon size={12} className="text-slate-400" />
      <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">{label}</span>
    </div>
    <span className="text-sm font-black text-slate-800">{value}</span>
  </div>
);

export default HomeCareView;
