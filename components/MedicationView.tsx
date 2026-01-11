
import React, { useState, useRef, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Pill, Plus, Clock, Check, Trash2, Upload, Loader2, X, Eye, Edit2, Search, Calendar, Image as ImageIcon, ExternalLink, Info, ClipboardList, ChevronLeft, Users, ChevronDown, CheckCircle2, RotateCcw, BrainCircuit, Activity, ChevronRight, Maximize2, Filter, ChartColumnBig, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, Brush } from 'recharts';
import { FamilyMember, Medication, Language } from '../types';
import { spreadsheetService } from '../services/spreadsheetService';
import { useTranslation } from '../translations';
import ConfirmationModal from './ConfirmationModal';
import { getMedicationAdvice } from '../services/geminiService';

interface MedicationViewProps {
  member: FamilyMember;
  allMembers: FamilyMember[];
  onSwitchMember: (id: string) => void;
  meds: Medication[];
  language: Language;
  onAddMed: (med: Medication) => void;
  onUpdateMed: (med: Medication) => void;
  onDeleteMed: (id: string) => void;
  initialOpenId?: string | null;
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
  return `${datePart} • ${timePart}`;
};

const MedicationView: React.FC<MedicationViewProps> = ({ member, allMembers, onSwitchMember, meds, language, onAddMed, onUpdateMed, onDeleteMed, initialOpenId }) => {
  const [viewMode, setViewMode] = useState<'list' | 'form' | 'detail'>('list');
  const [editingMed, setEditingMed] = useState<Medication | null>(null);
  const [viewingMed, setViewingMed] = useState<Medication | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [showMemberSelector, setShowMemberSelector] = useState(false);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [chartRange, setChartRange] = useState<number>(30); 
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [schedulingId, setSchedulingId] = useState<string | null>(null);
  const [nextTimeBuffer, setNextTimeBuffer] = useState<string>('');
  const [showConsumptionModal, setShowConsumptionModal] = useState(false);
  const [consumptionTime, setConsumptionTime] = useState<string>('');
  const [medForConsumption, setMedForConsumption] = useState<Medication | null>(null);
  
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [finishTargetId, setFinishTargetId] = useState<string | null>(null);

  // New States for AI Modal & History Table
  const [showAiDetailModal, setShowAiDetailModal] = useState(false);
  const [historyDateRange, setHistoryDateRange] = useState({ start: '', end: '' });

  const t = useTranslation(language);

  const getCurrentLocalDateTime = () => {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000; 
    return new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  useEffect(() => {
    if (initialOpenId) {
      const target = meds.find(m => m.id === initialOpenId);
      if (target) {
        setViewingMed(target);
        setViewMode('detail');
      }
    }
  }, [initialOpenId, meds]);

  const handleOpenForm = (med?: Medication) => {
    setEditingMed(med || null);
    setSelectedFile(null);
    setViewMode('form');
  };

  const handleOpenDetail = (med: Medication) => {
    setViewingMed(med);
    setViewMode('detail');
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    let fileUrl = editingMed?.fileUrl || '';
    let fileName = editingMed?.fileName || '';
    if (selectedFile) {
      try {
        const result = await spreadsheetService.uploadFile(selectedFile);
        if (result?.url) { fileUrl = result.url; fileName = selectedFile.name; }
      } catch (err) { console.error("Upload failed", err); }
    }
    const medData: Medication = {
      id: editingMed?.id || Math.random().toString(36).substr(2, 9),
      memberId: member.id,
      name: formData.get('name') as string,
      dosage: formData.get('dosage') as string,
      frequency: formData.get('frequency') as string,
      instructions: formData.get('instructions') as string,
      nextTime: formData.get('time') as string,
      active: true,
      fileUrl,
      fileName,
      aiAnalysis: editingMed?.aiAnalysis,
      consumptionHistory: editingMed?.consumptionHistory || []
    };
    if (editingMed) onUpdateMed(medData);
    else onAddMed(medData);
    setIsSaving(false);
    setViewMode('list');
  };

  const initConsumption = (med: Medication) => {
    const nowStr = getCurrentLocalDateTime();
    setMedForConsumption(med);
    setConsumptionTime(nowStr);
    setNextTimeBuffer(nowStr);
    setShowConsumptionModal(true);
  };

  const confirmConsumption = () => {
    if (medForConsumption) {
      const newHistory = [...(medForConsumption.consumptionHistory || []), consumptionTime];
      const updatedMed = { ...medForConsumption, consumptionHistory: newHistory, nextTime: nextTimeBuffer };
      onUpdateMed(updatedMed);
      if (viewingMed?.id === medForConsumption.id) setViewingMed(updatedMed);
      setShowConsumptionModal(false);
      setMedForConsumption(null);
    }
  };

  const startManualSchedule = () => {
    if(viewingMed) {
       setSchedulingId(viewingMed.id);
       setNextTimeBuffer(viewingMed.nextTime || getCurrentLocalDateTime());
    }
  };

  const saveManualSchedule = () => {
    if(viewingMed && nextTimeBuffer) {
       const updated = { ...viewingMed, nextTime: nextTimeBuffer };
       onUpdateMed(updated);
       setViewingMed(updated);
       setSchedulingId(null);
    }
  };

  const handleGenerateAI = async (med: Medication, forceRegenerate = false) => {
    if (med.aiAnalysis && !forceRegenerate) return;
    setAnalyzingId(med.id);
    try {
        const details = `Dosage: ${med.dosage}, Frequency: ${med.frequency}, Instructions: ${med.instructions}`;
        const analysis = await getMedicationAdvice(med.name, details, language);
        const updatedMed = { ...med, aiAnalysis: analysis };
        onUpdateMed(updatedMed);
        setViewingMed(updatedMed);
    } catch (error) { alert("Error AI"); } finally { setAnalyzingId(null); }
  };

  const handleFinishTherapy = () => { if (viewingMed) { setFinishTargetId(viewingMed.id); setShowFinishConfirm(true); } };

  const confirmFinishTherapy = () => {
    if (finishTargetId) {
        const target = meds.find(m => m.id === finishTargetId);
        if (target) {
            onUpdateMed({ ...target, active: false });
            if (viewingMed?.id === finishTargetId) setViewingMed({ ...target, active: false });
        }
        setFinishTargetId(null);
    }
  };

  const chartData = useMemo(() => {
    if (!viewingMed?.consumptionHistory) return [];
    const daysCount = chartRange;
    const days = [];
    const now = new Date();
    now.setHours(0, 0, 0, 0);

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      days.push(d);
    }

    return days.map(day => {
      const count = viewingMed.consumptionHistory!.filter(h => {
          const hDate = new Date(h);
          return hDate.getFullYear() === day.getFullYear() &&
                 hDate.getMonth() === day.getMonth() &&
                 hDate.getDate() === day.getDate();
      }).length;

      return {
        name: day.toLocaleString('id-ID', { day: 'numeric', month: 'short' }),
        count: count,
        fullDate: day.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
      };
    });
  }, [viewingMed, chartRange]);

  const filteredConsumptionHistory = useMemo(() => {
    if (!viewingMed?.consumptionHistory) return [];
    
    let history = viewingMed.consumptionHistory
        .map(h => new Date(h))
        .sort((a, b) => b.getTime() - a.getTime());

    if (historyDateRange.start) {
        history = history.filter(d => d >= new Date(historyDateRange.start));
    }
    if (historyDateRange.end) {
        const end = new Date(historyDateRange.end);
        end.setHours(23, 59, 59);
        history = history.filter(d => d <= end);
    }
    return history;
  }, [viewingMed, historyDateRange]);

  const filteredMeds = useMemo(() => {
    return meds.filter(med => {
      const matchesSearch = med.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            med.instructions.toLowerCase().includes(searchTerm.toLowerCase());
      let matchesDate = true;
      if (dateRange.start && dateRange.end) {
         const medDate = new Date(med.nextTime);
         const start = new Date(dateRange.start);
         const end = new Date(dateRange.end);
         end.setHours(23, 59, 59);
         matchesDate = medDate >= start && medDate <= end;
      }
      return matchesSearch && matchesDate;
    });
  }, [meds, searchTerm, dateRange]);

  const formatDisplayTime = (isoString: string) => {
    if (!isoString) return '--';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return formatDateTimeUpper(isoString);
    } catch (e) { return isoString; }
  };

  if (viewMode === 'form') {
    return (
      <div className="animate-fadeIn w-full">
        <div className="flex items-center gap-4 mb-8">
           <button onClick={() => setViewMode('list')} className="p-3 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors">
              <ChevronLeft size={24} className="text-slate-600" />
           </button>
           <h2 className="text-2xl font-black text-slate-800 tracking-tight">{editingMed ? 'Ubah Data Obat' : 'Tambah Obat Baru'}</h2>
        </div>
        <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100">
            <form onSubmit={handleSave} className="space-y-6">
              <div className="flex justify-center mb-8">
                 <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                   <div className="w-32 h-32 rounded-[2rem] overflow-hidden bg-slate-50 border-4 border-slate-100 shadow-xl group-hover:border-amber-400 transition-all flex items-center justify-center">
                     {selectedFile ? (
                       <img src={URL.createObjectURL(selectedFile)} className="w-full h-full object-cover" />
                     ) : editingMed?.fileUrl ? (
                       <img src={editingMed.fileUrl} className="w-full h-full object-cover" />
                     ) : (
                       <div className="flex flex-col items-center text-slate-300">
                         <ImageIcon size={24} />
                         <span className="text-[8px] font-black uppercase mt-2">Foto Kemasan</span>
                       </div>
                     )}
                   </div>
                   <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={(e) => setSelectedFile(e.target.files?.[0] || null)} />
                 </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nama Obat</label>
                <input name="name" defaultValue={editingMed?.name} required className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-lg" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Dosis</label>
                  <input name="dosage" defaultValue={editingMed?.dosage} required className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm" placeholder="1 Tablet" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Frekuensi</label>
                  <input name="frequency" defaultValue={editingMed?.frequency} required className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm" placeholder="3x1 Hari" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Waktu Jadwal Pertama</label>
                <input name="time" type="datetime-local" defaultValue={editingMed?.nextTime || getCurrentLocalDateTime()} required className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Instruksi Penggunaan</label>
                <input name="instructions" defaultValue={editingMed?.instructions} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm" placeholder="Mis: Sesudah makan" />
              </div>
              <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setViewMode('list')} className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">Batal</button>
                  <button type="submit" disabled={isSaving} className="flex-1 py-5 bg-amber-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl flex items-center justify-center gap-2 tracking-widest hover:bg-amber-700 transition-all">
                    {isSaving ? <Loader2 className="animate-spin" size={18} /> : 'SIMPAN DATA'}
                  </button>
              </div>
            </form>
        </div>
      </div>
    );
  }

  if (viewMode === 'detail' && viewingMed) {
    return (
      <div className="animate-fadeIn w-full space-y-8 pb-24">
        {showConsumptionModal && createPortal(
           <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
              <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl animate-scaleIn border-4 border-white">
                 <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-green-100 text-green-600 rounded-full"><Pill size={24}/></div>
                    <h3 className="text-lg font-black text-slate-800">Catat Penggunaan Obat</h3>
                 </div>
                 <div className="space-y-4">
                    <div>
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Waktu Penggunaan</label>
                       <input type="datetime-local" value={consumptionTime} onChange={(e) => setConsumptionTime(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none" />
                    </div>
                    <div>
                       <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Jadwal Penggunaan Berikutnya</label>
                       <input type="datetime-local" value={nextTimeBuffer} onChange={(e) => setNextTimeBuffer(e.target.value)} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none" />
                    </div>
                 </div>
                 <div className="flex gap-3 mt-8">
                    <button onClick={() => setShowConsumptionModal(false)} className="flex-1 py-4 bg-slate-100 rounded-2xl font-black text-xs uppercase tracking-widest">Batal</button>
                    <button onClick={confirmConsumption} className="flex-1 py-4 bg-green-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">Simpan</button>
                 </div>
              </div>
           </div>, document.body
        )}

        {showAiDetailModal && createPortal(
           <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fadeIn">
              <div className="bg-white rounded-[2.5rem] w-full max-w-2xl max-h-[85vh] flex flex-col border-4 border-white shadow-2xl overflow-hidden relative">
                 <div className="p-6 bg-gradient-to-r from-teal-600 to-emerald-600 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3 text-white">
                        <BrainCircuit size={24} />
                        <h3 className="text-lg font-black">INFORMASI OBAT</h3>
                    </div>
                    <button onClick={() => setShowAiDetailModal(false)} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"><X size={24} /></button>
                 </div>
                 <div className="flex-1 p-8 overflow-y-auto bg-slate-50/50">
                    <div className="prose prose-sm prose-teal max-w-none font-medium leading-relaxed text-slate-700" dangerouslySetInnerHTML={{ __html: viewingMed.aiAnalysis || '' }} />
                 </div>
              </div>
           </div>, document.body
        )}

        <ConfirmationModal 
            isOpen={showFinishConfirm} 
            onClose={() => setShowFinishConfirm(false)}
            onConfirm={confirmFinishTherapy}
            title="Selesaikan Terapi?"
            message="Status obat akan diubah menjadi non-aktif. Anda masih bisa melihat riwayatnya nanti."
            confirmText="Ya, Selesaikan"
            isDanger={false}
        />

        <div className="flex items-center gap-4">
           <button onClick={() => setViewMode('list')} className="p-3 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors">
              <ChevronLeft size={24} className="text-slate-600" />
           </button>
           <h2 className="text-2xl font-black text-slate-800 tracking-tight">Detail & Analisa Obat</h2>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-3">
               <div className="relative w-full aspect-square lg:aspect-[3/4] rounded-[2.5rem] overflow-hidden border-8 border-white shadow-xl bg-slate-100 group cursor-zoom-in" onClick={() => viewingMed.fileUrl && window.open(viewingMed.fileUrl, '_blank')}>
                  {viewingMed.fileUrl ? (
                    <>
                      <img src={viewingMed.fileUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                         <p className="text-white font-black uppercase text-xs tracking-widest flex items-center gap-2"><Eye size={16}/> Klik Memperbesar</p>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-amber-200">
                      <Pill size={80} />
                      <p className="mt-4 text-slate-400 font-bold text-xs uppercase">No Image</p>
                    </div>
                  )}
               </div>
               <div className="mt-6 flex flex-col gap-3">
                  <button onClick={() => handleOpenForm(viewingMed)} className="w-full py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2">
                      <Edit2 size={14} /> Ubah Data
                  </button>
                  {viewingMed.active && (
                      <button onClick={handleFinishTherapy} className="w-full py-4 bg-green-50 text-green-600 border border-green-100 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-green-100 transition-all flex items-center justify-center gap-2">
                          <CheckCircle2 size={14} /> Selesaikan Terapi
                      </button>
                  )}
               </div>
            </div>

            <div className="lg:col-span-5 space-y-6">
               <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 h-full">
                  <h3 className="text-3xl font-black text-slate-800 leading-tight mb-2">{viewingMed.name}</h3>
                  <div className="flex gap-2 mb-6">
                      <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest bg-amber-50 px-4 py-1.5 rounded-full">{viewingMed.frequency}</span>
                      {!viewingMed.active && <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-slate-100 px-4 py-1.5 rounded-full">Selesai</span>}
                  </div>
                  <div className="space-y-4">
                      {/* Using the DetailBox defined at the bottom */}
                      <DetailBox icon={Info} label="Dosis" value={viewingMed.dosage} />
                      <DetailBox icon={ClipboardList} label="Instruksi" value={viewingMed.instructions || '-'} />
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-4 relative">
                          <div className="flex items-start gap-4 flex-1">
                             <div className="p-3 bg-white rounded-xl shadow-sm text-amber-500 border border-amber-50"><Clock size={18} /></div>
                             <div className="flex-1">
                                <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Jadwal Penggunaan Berikutnya</p>
                                {schedulingId === viewingMed.id ? (
                                   <div className="flex items-center gap-2 mt-1">
                                      <input type="datetime-local" value={nextTimeBuffer} onChange={(e) => setNextTimeBuffer(e.target.value)} className="bg-white border border-blue-200 rounded-lg px-2 py-1 text-xs font-bold outline-none w-full" />
                                      <button onClick={saveManualSchedule} className="p-1.5 bg-blue-600 text-white rounded-lg"><Check size={12}/></button>
                                      <button onClick={() => setSchedulingId(null)} className="p-1.5 bg-slate-200 text-slate-500 rounded-lg"><X size={12}/></button>
                                   </div>
                                 ) : (
                                   <p className="text-sm font-black text-slate-800">{viewingMed.active ? formatDisplayTime(viewingMed.nextTime) : 'Program Selesai'}</p>
                                 )}
                             </div>
                          </div>
                          {viewingMed.active && !schedulingId && (
                             <button onClick={startManualSchedule} className="p-3 bg-blue-50 text-blue-600 rounded-xl transition-all shadow-sm border border-blue-100 shrink-0">
                                <Edit2 size={16}/>
                             </button>
                          )}
                      </div>
                  </div>
                  {viewingMed.active && (
                    <button onClick={() => initConsumption(viewingMed)} className="w-full mt-6 py-5 bg-amber-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-amber-100 active:scale-95 transition-all flex items-center justify-center gap-3">
                        <CheckCircle2 size={18} /> Catat & Update Jadwal
                    </button>
                  )}
               </div>
            </div>

            <div className="lg:col-span-4 h-full">
               <div className="bg-gradient-to-br from-teal-50 to-emerald-50 border border-teal-100 rounded-[2.5rem] p-8 h-full flex flex-col relative overflow-hidden shadow-sm">
                  <div className="absolute top-0 right-0 p-10 opacity-5"><BrainCircuit size={150} /></div>
                  <div className="relative z-10 flex flex-col h-full">
                     <button onClick={() => handleGenerateAI(viewingMed, true)} disabled={!!analyzingId} className="w-full mb-6 py-4 bg-teal-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg flex items-center justify-center gap-2 hover:bg-teal-700 transition-all">
                        {analyzingId === viewingMed.id ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                        ANALISA INFORMASI OBAT
                     </button>

                     <div className="flex-1 flex flex-col">
                        {viewingMed.aiAnalysis ? (
                           <>
                             <div className="prose prose-sm prose-teal max-w-none font-medium leading-relaxed text-slate-700 line-clamp-[15]" dangerouslySetInnerHTML={{ __html: viewingMed.aiAnalysis }} />
                             <button onClick={() => setShowAiDetailModal(true)} className="mt-4 flex items-center gap-2 text-teal-700 font-black text-xs uppercase tracking-widest hover:underline pt-4 border-t border-teal-100/50">
                                BACA SELENGKAPNYA <Maximize2 size={12} />
                             </button>
                           </>
                        ) : (
                           <div className="h-full flex flex-col items-center justify-center text-center p-6 text-teal-400">
                              <BrainCircuit size={48} className="mb-4 opacity-20" />
                              <p className="text-xs font-bold italic">Dapatkan informasi detail farmakologi & peringatan obat ini menggunakan AI.</p>
                           </div>
                        )}
                     </div>
                  </div>
               </div>
            </div>
        </div>

        {/* Consumption History Chart */}
        <div className="bg-white p-8 rounded-[3.5rem] shadow-sm border border-slate-100">
           <div className="flex justify-between items-center mb-8">
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-3">
                 <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><ChartColumnBig size={20} /></div>
                 Riwayat Penggunaan
              </h3>
              <select value={chartRange} onChange={(e) => setChartRange(Number(e.target.value))} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer">
                 <option value={7}>7 Hari</option>
                 <option value={14}>14 Hari</option>
                 <option value={30}>30 Hari</option>
                 <option value={90}>3 Bulan</option>
                 <option value={180}>6 Bulan</option>
              </select>
           </div>
           
           <div className="h-[300px] w-full mb-10">
              <ResponsiveContainer width="100%" height="100%">
                 <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis dataKey="name" fontSize={9} tickMargin={10} axisLine={false} tickLine={false} fontWeight={700} stroke="#94a3b8" />
                    <YAxis fontSize={9} stroke="#cbd5e1" axisLine={false} tickLine={false} fontWeight={700} allowDecimals={false} />
                    <Tooltip 
                       contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)' }}
                       labelStyle={{ fontWeight: 'black', marginBottom: '4px', fontSize: '10px' }}
                    />
                    <Bar dataKey="count" radius={[10, 10, 0, 0]} name="Kali" fill="#3b82f6" />
                    <Brush 
                       dataKey="name" 
                       height={20} 
                       stroke="#cbd5e1" 
                       tickFormatter={() => ""} 
                       travellerWidth={10}
                    />
                 </BarChart>
              </ResponsiveContainer>
           </div>

           {/* Consumption History Table */}
           <div className="border-t border-slate-50 pt-8">
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                 <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-2xl border border-slate-100 text-sm font-bold text-slate-600 relative">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dari</span>
                    <input type="date" value={historyDateRange.start} onChange={(e) => setHistoryDateRange({...historyDateRange, start: e.target.value})} className="outline-none bg-transparent text-slate-700 pr-6" />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-600 pointer-events-none" size={16} />
                 </div>
                 <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-2xl border border-slate-100 text-sm font-bold text-slate-600 relative">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sampai</span>
                    <input type="date" value={historyDateRange.end} onChange={(e) => setHistoryDateRange({...historyDateRange, end: e.target.value})} className="outline-none bg-transparent text-slate-700 pr-6" />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-600 pointer-events-none" size={16} />
                 </div>
                 {(historyDateRange.start || historyDateRange.end) && (
                    <button onClick={() => setHistoryDateRange({start: '', end: ''})} className="p-3 bg-slate-200 hover:bg-slate-300 rounded-xl text-slate-600 transition-colors"><X size={14}/></button>
                 )}
              </div>

              <div className="bg-white rounded-[3rem] border border-slate-100 overflow-hidden shadow-sm">
                 <div className="overflow-x-auto">
                    <table className="w-full text-left">
                       <thead>
                          <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 border-b border-slate-100">
                             <th className="px-6 py-4">Waktu Konsumsi</th>
                             <th className="px-6 py-4">Hari</th>
                             <th className="px-6 py-4">Jam</th>
                          </tr>
                       </thead>
                       <tbody className="divide-y divide-slate-100 text-sm font-bold text-slate-700">
                          {filteredConsumptionHistory.length > 0 ? filteredConsumptionHistory.map((date, idx) => (
                             <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="px-6 py-4">
                                   <div className="flex items-center gap-2">
                                      <CheckCircle2 size={16} className="text-green-500" />
                                      {formatDateTimeUpper(date.toISOString())}
                                   </div>
                                </td>
                                <td className="px-6 py-4 capitalize">{date.toLocaleDateString('id-ID', {weekday: 'long'})}</td>
                                <td className="px-6 py-4">{date.toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'})}</td>
                             </tr>
                          )) : <tr><td colSpan={3} className="px-6 py-10 text-center text-slate-400 italic">Belum ada riwayat tercatat pada periode ini.</td></tr>}
                       </tbody>
                    </table>
                 </div>
              </div>
           </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-24">
      <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 md:p-8 rounded-[3rem] shadow-sm border border-slate-50 gap-4">
        <div className="flex items-center gap-4 w-full md:w-auto">
           <button onClick={() => setShowMemberSelector(true)} className="w-16 h-16 rounded-[1.5rem] overflow-hidden border-4 border-blue-500 shadow-xl shrink-0 hover:scale-105 transition-transform relative group cursor-pointer">
              <img src={member.photoUrl} className="w-full h-full object-cover" alt={member.name} />
              <div className="absolute inset-0 bg-black/20 hidden group-hover:flex items-center justify-center"><Users size={20} className="text-white" /></div>
           </button>
           <div>
              <h2 className="text-xl md:text-2xl font-black text-slate-800 leading-tight">Pengingat Obat</h2>
              <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setShowMemberSelector(true)}>
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">{member.name}</p>
                <ChevronDown size={14} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
              </div>
           </div>
        </div>
        <button onClick={() => handleOpenForm()} className="w-full md:w-auto bg-amber-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-amber-700 transition-all shadow-xl shadow-amber-100 flex items-center justify-center gap-2">
          <Plus size={18} /> Tambah Obat
        </button>
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
          placeholder="Cari nama obat atau petunjuk..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-14 pr-6 py-4 bg-white border border-slate-100 rounded-[2rem] shadow-sm outline-none font-medium focus:ring-4 focus:ring-blue-50 transition-all text-sm" 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMeds.length > 0 ? filteredMeds.map(med => (
          <div key={med.id} onClick={() => handleOpenDetail(med)} className={`group bg-white p-6 rounded-[2.5rem] border transition-all cursor-pointer relative overflow-hidden flex flex-col ${!med.active ? 'opacity-60 border-slate-100' : 'border-slate-100 hover:shadow-xl hover:border-amber-100'}`}>
             {!med.active && <div className="absolute top-0 right-0 p-4 bg-slate-100 text-slate-400 font-black text-[8px] rounded-bl-2xl uppercase tracking-widest">Selesai</div>}
             <div className="flex gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 shrink-0">
                   {med.fileUrl ? <img src={med.fileUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center text-amber-200"><Pill size={24}/></div>}
                </div>
                <div className="flex-1 min-w-0">
                   <h3 className="text-lg font-black text-slate-800 leading-tight truncate group-hover:text-amber-600 transition-colors">{med.name}</h3>
                   <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg">{med.frequency}</span>
                </div>
             </div>
             <div className="space-y-3 mb-6 flex-1">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                   <Info size={14} className="text-slate-300" />
                   <span>Dosis: {med.dosage}</span>
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                   <Clock size={14} className="text-slate-300" />
                   <span className="truncate">{med.active ? `Jadwal: ${formatDisplayTime(med.nextTime)}` : 'Terapi Selesai'}</span>
                </div>
             </div>
             <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                <div className="flex gap-1">
                   <button onClick={(e) => { e.stopPropagation(); handleOpenForm(med); }} className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Edit2 size={16} /></button>
                   <button onClick={(e) => { e.stopPropagation(); if(confirm('Hapus obat ini?')) onDeleteMed(med.id); }} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                </div>
                <div className="text-[10px] font-black uppercase text-amber-600 flex items-center gap-1 group-hover:translate-x-1 transition-transform">Detail <ChevronRight size={14} /></div>
             </div>
          </div>
        )) : (
          <div className="col-span-full py-24 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
             <Pill size={48} className="mx-auto text-slate-100 mb-4" />
             <p className="font-black text-slate-400 uppercase tracking-widest text-xs">Belum ada daftar obat.</p>
          </div>
        )}
      </div>
    </div>
  );
};

// Define the missing DetailBox component
const DetailBox = ({ icon: Icon, label, value }: any) => (
  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-4 shadow-inner">
    <div className="p-3 bg-white rounded-xl shadow-sm text-slate-400 border border-slate-50"><Icon size={18} /></div>
    <div>
       <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5">{label}</p>
       <p className="text-sm font-black text-slate-800 leading-relaxed">{value}</p>
    </div>
  </div>
);

export default MedicationView;
