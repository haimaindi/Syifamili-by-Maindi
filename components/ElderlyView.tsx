
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Heart, Activity, Thermometer, Droplet, Pill, Plus, CheckCircle, MessageSquare, X, Activity as Pulse, Clock, Stethoscope, Loader2, ChevronLeft, Wind, Edit2, Trash2, Calendar, ChevronDown, Users, FileText, ArrowRight } from 'lucide-react';
import { FamilyMember, MedicalRecord, CaregiverNote, Language, VitalLog } from '../types';
import { useTranslation } from '../translations';
import ConfirmationModal from './ConfirmationModal';

interface ElderlyViewProps {
  member: FamilyMember;
  allMembers: FamilyMember[];
  onSwitchMember: (id: string) => void;
  records: MedicalRecord[];
  vitalLogs: VitalLog[];
  notes: CaregiverNote[];
  language: Language;
  onAddVital: (vital: VitalLog) => void;
  onUpdateVital: (vital: VitalLog) => void;
  onDeleteVital: (id: string) => void;
  onAddNote: (note: CaregiverNote) => void;
  onUpdateNote: (note: CaregiverNote) => void;
  onDeleteNote: (id: string) => void;
  onAddRecord: (record: MedicalRecord) => void;
  onUpdateRecord: (record: MedicalRecord) => void;
  onDeleteRecord: (id: string) => void;
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

const ElderlyView: React.FC<ElderlyViewProps> = ({ 
  member, allMembers, onSwitchMember, records, vitalLogs, notes, language, 
  onAddVital, onUpdateVital, onDeleteVital,
  onAddNote, onUpdateNote, onDeleteNote,
  onAddRecord, onUpdateRecord, onDeleteRecord
}) => {
  const [viewMode, setViewMode] = useState<'dashboard' | 'vitalList' | 'medList' | 'journalList' | 'vitalForm' | 'noteForm' | 'presForm'>('dashboard');
  const [showMemberSelector, setShowMemberSelector] = useState(false);
  const [filterRange, setFilterRange] = useState(30); // Days for chart filter
  
  // List Filter Ranges
  const [vitalDateRange, setVitalDateRange] = useState({ start: '', end: '' });
  const [journalDateRange, setJournalDateRange] = useState({ start: '', end: '' });

  // Edit States
  const [editingVital, setEditingVital] = useState<VitalLog | null>(null);
  const [editingNote, setEditingNote] = useState<CaregiverNote | null>(null);
  const [editingRecord, setEditingRecord] = useState<MedicalRecord | null>(null);

  // Delete States
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleteType, setDeleteType] = useState<'vital' | 'med' | 'note' | null>(null);

  const t = useTranslation(language);

  const checkWHOStatus = (type: 'sys' | 'dia' | 'hr' | 'temp' | 'spo2' | 'rr', value?: number) => {
    if (value === undefined) return { status: 'Unknown', color: 'bg-slate-100 text-slate-400' };
    switch(type) {
        case 'sys': if (value < 90) return { status: 'Low', color: 'bg-blue-100 text-blue-700' }; if (value <= 120) return { status: 'Normal', color: 'bg-green-100 text-green-700' }; if (value <= 140) return { status: 'Elevated', color: 'bg-amber-100 text-amber-700' }; return { status: 'High', color: 'bg-red-100 text-red-700' };
        case 'dia': if (value < 60) return { status: 'Low', color: 'bg-blue-100 text-blue-700' }; if (value <= 80) return { status: 'Normal', color: 'bg-green-100 text-green-700' }; if (value <= 90) return { status: 'Elevated', color: 'bg-amber-100 text-amber-700' }; return { status: 'High', color: 'bg-red-100 text-red-700' };
        case 'hr': if (value < 60) return { status: 'Low', color: 'bg-blue-100 text-blue-700' }; if (value <= 100) return { status: 'Normal', color: 'bg-green-100 text-green-700' }; return { status: 'High', color: 'bg-red-100 text-red-700' };
        case 'temp': if (value < 36.1) return { status: 'Low', color: 'bg-blue-100 text-blue-700' }; if (value <= 37.2) return { status: 'Normal', color: 'bg-green-100 text-green-700' }; return { status: 'Fever', color: 'bg-red-100 text-red-700' };
        case 'spo2': if (value >= 95) return { status: 'Normal', color: 'bg-green-100 text-green-700' }; if (value >= 90) return { status: 'Low', color: 'bg-amber-100 text-amber-700' }; return { status: 'Critical', color: 'bg-red-100 text-red-700' };
        case 'rr': if (value < 12) return { status: 'Low', color: 'bg-blue-100 text-blue-700' }; if (value <= 20) return { status: 'Normal', color: 'bg-green-100 text-green-700' }; return { status: 'High', color: 'bg-red-100 text-red-700' };
        default: return { status: '-', color: 'bg-slate-100' };
    }
  };

  const chartData = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - filterRange);
    
    return [...vitalLogs]
        .filter(v => new Date(v.dateTime) >= cutoff)
        .sort((a,b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
        .map(v => ({
            date: new Date(v.dateTime).toLocaleDateString(language==='ID'?'id-ID':'en-US', {day:'numeric', month:'short'}),
            fullDateTime: v.dateTime,
            hr: v.heartRate,
            sys: v.systolic,
            dia: v.diastolic,
            temp: v.temperature,
            spo2: v.oxygen,
            rr: v.respiratoryRate
        }));
  }, [vitalLogs, filterRange, language]);

  const filteredVitalLogs = useMemo(() => {
    let logs = [...vitalLogs].sort((a,b)=>new Date(b.dateTime).getTime()-new Date(a.dateTime).getTime());
    if (vitalDateRange.start) logs = logs.filter(l => new Date(l.dateTime) >= new Date(vitalDateRange.start));
    if (vitalDateRange.end) {
        const end = new Date(vitalDateRange.end);
        end.setHours(23,59,59);
        logs = logs.filter(l => new Date(l.dateTime) <= end);
    }
    return logs;
  }, [vitalLogs, vitalDateRange]);

  const filteredNotes = useMemo(() => {
    let list = [...notes].sort((a,b)=>new Date(b.dateTime).getTime()-new Date(a.dateTime).getTime());
    if (journalDateRange.start) list = list.filter(l => new Date(l.dateTime) >= new Date(journalDateRange.start));
    if (journalDateRange.end) {
        const end = new Date(journalDateRange.end);
        end.setHours(23,59,59);
        list = list.filter(l => new Date(l.dateTime) <= end);
    }
    return list;
  }, [notes, journalDateRange]);

  const confirmDelete = () => {
      if (deleteId && deleteType) {
          if (deleteType === 'vital') onDeleteVital(deleteId);
          if (deleteType === 'med') onDeleteRecord(deleteId);
          if (deleteType === 'note') onDeleteNote(deleteId);
          setDeleteId(null);
          setDeleteType(null);
      }
  };

  const handleSaveVital = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const vitalData: VitalLog = {
      id: editingVital?.id || Math.random().toString(36).substr(2, 9),
      memberId: member.id,
      dateTime: formData.get('dateTime') as string,
      heartRate: parseFloat(formData.get('hr') as string) || undefined,
      systolic: parseFloat(formData.get('sys') as string) || undefined,
      diastolic: parseFloat(formData.get('dia') as string) || undefined,
      temperature: parseFloat(formData.get('temp') as string) || undefined,
      oxygen: parseFloat(formData.get('spo2') as string) || undefined,
      respiratoryRate: parseFloat(formData.get('rr') as string) || undefined,
    };
    if (editingVital) onUpdateVital(vitalData);
    else onAddVital(vitalData);
    setViewMode(editingVital ? 'vitalList' : 'dashboard');
  };

  const handleSavePrescription = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const recData: MedicalRecord = {
      id: editingRecord?.id || Math.random().toString(36).substr(2, 9),
      memberId: member.id,
      title: formData.get('title') as string,
      dateTime: new Date().toISOString(),
      type: 'Prescription',
      description: formData.get('notes') as string,
      obat: formData.get('obat') as string,
      doctorName: formData.get('doctor') as string,
      facility: formData.get('facility') as string,
      files: editingRecord?.files || []
    };
    if (editingRecord) onUpdateRecord(recData);
    else onAddRecord(recData);
    setViewMode('medList');
  };

  const handleSaveNote = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const now = new Date();
    const noteData: CaregiverNote = {
      id: editingNote?.id || Math.random().toString(36).substr(2, 9),
      memberId: member.id,
      date: now.toLocaleDateString(language === 'ID' ? 'id-ID' : 'en-US'),
      dateTime: now.toISOString(),
      text: formData.get('text') as string,
      type: formData.get('type') as any,
      mood: formData.get('mood') as string,
      activity: formData.get('activity') as string,
      meals: formData.get('meals') as string,
      fluids: formData.get('fluids') as string,
      hygiene: formData.get('hygiene') === 'on',
      bab: formData.get('bab') as string,
      bak: formData.get('bak') as string
    };
    if (editingNote) onUpdateNote(noteData);
    else onAddNote(noteData);
    setViewMode('journalList');
  };

  const renderMemberSelector = () => (
    showMemberSelector && createPortal(
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
    )
  );

  const renderConfirmation = () => (
      <ConfirmationModal 
        isOpen={!!deleteId} 
        onClose={() => { setDeleteId(null); setDeleteType(null); }}
        onConfirm={confirmDelete}
        title="Hapus Data?"
        message="Data yang dihapus tidak dapat dikembalikan."
      />
  );

  if (viewMode === 'dashboard') {
      return (
        <div className="space-y-8 animate-fadeIn pb-24">
          {renderMemberSelector()}
          
          <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 md:p-8 rounded-[3rem] shadow-sm border border-slate-50 gap-4">
            <div className="flex items-center gap-4 w-full md:w-auto">
               <button onClick={() => setShowMemberSelector(true)} className="w-16 h-16 rounded-[1.5rem] overflow-hidden border-4 border-blue-500 shadow-xl shrink-0 hover:scale-105 transition-transform relative group cursor-pointer">
                  <img src={member.photoUrl} className="w-full h-full object-cover" alt={member.name} />
                  <div className="absolute inset-0 bg-black/20 hidden group-hover:flex items-center justify-center"><Users size={20} className="text-white" /></div>
               </button>
               <div>
                  <h2 className="text-xl md:text-2xl font-black text-slate-800 leading-tight">{t.elderly}</h2>
                  <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setShowMemberSelector(true)}>
                    <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">{member.name} • {new Date().getFullYear() - new Date(member.birthDate).getFullYear()} Thn</p>
                    <ChevronDown size={14} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                  </div>
               </div>
            </div>
            <button onClick={() => { setEditingVital(null); setViewMode('vitalForm'); }} className="w-full md:w-auto bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2">
              <Plus size={18} /> {t.addVital}
            </button>
          </div>

          <div className="bg-white p-8 rounded-[3rem] shadow-sm border border-slate-100">
             <div className="flex justify-between items-center mb-8">
                <h3 className="text-lg font-black text-slate-800 flex items-center gap-3">
                   <div className="p-2 bg-rose-50 text-rose-600 rounded-xl"><Activity size={20} /></div>
                   Monitoring Tanda Vital
                </h3>
                <select value={filterRange} onChange={(e) => setFilterRange(Number(e.target.value))} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer">
                   <option value={7}>7 Hari Terakhir</option>
                   <option value={30}>30 Hari Terakhir</option>
                   <option value={90}>3 Bulan Terakhir</option>
                </select>
             </div>
             <div className="h-[350px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" fontSize={9} tickMargin={10} stroke="#cbd5e1" fontWeight={700} />
                      <YAxis fontSize={9} stroke="#cbd5e1" fontWeight={700} />
                      <Tooltip 
                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.1)' }} 
                        labelStyle={{fontWeight: '900', color: '#64748b', fontSize:'10px', marginBottom:'5px'}}
                        labelFormatter={(label, payload) => payload?.[0]?.payload?.fullDateTime ? formatDateTimeUpper(payload[0].payload.fullDateTime) : label}
                      />
                      <Legend wrapperStyle={{paddingTop: '20px', fontSize: '10px', fontWeight: '700', textTransform: 'uppercase'}} />
                      <Line type="monotone" dataKey="hr" name="Heart Rate (bpm)" stroke="#e11d48" strokeWidth={3} dot={false} />
                      <Line type="monotone" dataKey="sys" name="Systolic (mmHg)" stroke="#2563eb" strokeWidth={3} dot={false} />
                      <Line type="monotone" dataKey="dia" name="Diastolic (mmHg)" stroke="#60a5fa" strokeWidth={3} dot={false} strokeDasharray="5 5" />
                      <Line type="monotone" dataKey="spo2" name="SpO2 (%)" stroke="#059669" strokeWidth={3} dot={false} />
                      <Line type="monotone" dataKey="temp" name="Temp (°C)" stroke="#d97706" strokeWidth={3} dot={false} />
                      <Line type="monotone" dataKey="rr" name="Resp. Rate (x/m)" stroke="#7c3aed" strokeWidth={3} dot={false} />
                   </LineChart>
                </ResponsiveContainer>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <button onClick={() => setViewMode('vitalList')} className="p-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><Activity size={32} /></div>
                <h4 className="font-black text-slate-800 text-lg">Riwayat Tanda Vital</h4>
                <div className="flex items-center gap-2 text-rose-500 font-bold text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Buka Data <ArrowRight size={14} /></div>
             </button>
             <button onClick={() => setViewMode('medList')} className="p-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><Pill size={32} /></div>
                <h4 className="font-black text-slate-800 text-lg">Obat Kondisi Kronis</h4>
                <div className="flex items-center gap-2 text-blue-500 font-bold text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Buka Data <ArrowRight size={14} /></div>
             </button>
             <button onClick={() => setViewMode('journalList')} className="p-8 bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group flex flex-col items-center text-center gap-4">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-500 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform"><MessageSquare size={32} /></div>
                <h4 className="font-black text-slate-800 text-lg">Jurnal Pengasuh</h4>
                <div className="flex items-center gap-2 text-indigo-500 font-bold text-xs uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Buka Data <ArrowRight size={14} /></div>
             </button>
          </div>
        </div>
      );
  }

  if (viewMode === 'vitalList') {
      return (
         <div className="animate-fadeIn space-y-8 pb-24">
            {renderConfirmation()}
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <button onClick={() => setViewMode('dashboard')} className="p-3 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors"><ChevronLeft size={24} className="text-slate-600" /></button>
                  <h2 className="text-2xl font-black text-slate-800">Riwayat Tanda Vital</h2>
               </div>
               <button onClick={() => { setEditingVital(null); setViewMode('vitalForm'); }} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest flex items-center gap-2 shadow-lg"><Plus size={16}/> Input Baru</button>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-6">
                 <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-2xl border border-slate-100 text-sm font-bold text-slate-600 relative">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dari</span>
                    <input type="date" value={vitalDateRange.start} onChange={(e) => setVitalDateRange({...vitalDateRange, start: e.target.value})} className="outline-none bg-transparent text-slate-700 pr-6" />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-600 pointer-events-none" size={16} />
                 </div>
                 <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-2xl border border-slate-100 text-sm font-bold text-slate-600 relative">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sampai</span>
                    <input type="date" value={vitalDateRange.end} onChange={(e) => setVitalDateRange({...vitalDateRange, end: e.target.value})} className="outline-none bg-transparent text-slate-700 pr-6" />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-600 pointer-events-none" size={16} />
                 </div>
                 {(vitalDateRange.start || vitalDateRange.end) && (
                    <button onClick={() => setVitalDateRange({start: '', end: ''})} className="p-3 bg-slate-200 hover:bg-slate-300 rounded-xl text-slate-600 transition-colors"><X size={14}/></button>
                 )}
            </div>

            <div className="bg-white rounded-[3rem] border border-slate-100 overflow-hidden shadow-sm">
               <div className="overflow-x-auto">
                  <table className="w-full text-left">
                     <thead>
                        <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 border-b border-slate-100">
                           <th className="px-6 py-4">Waktu</th>
                           <th className="px-6 py-4 text-center">Tekanan Darah</th>
                           <th className="px-6 py-4 text-center">Heart Rate</th>
                           <th className="px-6 py-4 text-center">Respiration</th>
                           <th className="px-6 py-4 text-center">SpO2</th>
                           <th className="px-6 py-4 text-center">Suhu</th>
                           <th className="px-6 py-4 text-right">Aksi</th>
                        </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100 text-sm font-bold text-slate-700">
                        {filteredVitalLogs.length > 0 ? filteredVitalLogs.map(log => {
                           const bpStatus = checkWHOStatus('sys', log.systolic);
                           const hrStatus = checkWHOStatus('hr', log.heartRate);
                           const rrStatus = checkWHOStatus('rr', log.respiratoryRate);
                           const spo2Status = checkWHOStatus('spo2', log.oxygen);
                           const tempStatus = checkWHOStatus('temp', log.temperature);
                           
                           return (
                              <tr key={log.id} className="hover:bg-slate-50/50">
                                 <td className="px-6 py-4">
                                    <p>{formatDateUpper(log.dateTime)}</p>
                                    <p className="text-[10px] text-slate-400">{new Date(log.dateTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</p>
                                 </td>
                                 <td className="px-6 py-4 text-center">
                                    <div>{log.systolic && log.diastolic ? `${log.systolic}/${log.diastolic}` : '-'}</div>
                                    <span className={`text-[8px] px-2 py-0.5 rounded-full uppercase ${bpStatus.color}`}>{bpStatus.status}</span>
                                 </td>
                                 <td className="px-6 py-4 text-center">
                                    <div>{log.heartRate || '-'} bpm</div>
                                    <span className={`text-[8px] px-2 py-0.5 rounded-full uppercase ${hrStatus.color}`}>{hrStatus.status}</span>
                                 </td>
                                 <td className="px-6 py-4 text-center">
                                    <div>{log.respiratoryRate || '-'} x/m</div>
                                    <span className={`text-[8px] px-2 py-0.5 rounded-full uppercase ${rrStatus.color}`}>{rrStatus.status}</span>
                                 </td>
                                 <td className="px-6 py-4 text-center">
                                    <div>{log.oxygen || '-'} %</div>
                                    <span className={`text-[8px] px-2 py-0.5 rounded-full uppercase ${spo2Status.color}`}>{spo2Status.status}</span>
                                 </td>
                                 <td className="px-6 py-4 text-center">
                                    <div>{log.temperature || '-'} °C</div>
                                    <span className={`text-[8px] px-2 py-0.5 rounded-full uppercase ${tempStatus.color}`}>{tempStatus.status}</span>
                                 </td>
                                 <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                       <button onClick={() => { setEditingVital(log); setViewMode('vitalForm'); }} className="text-blue-600 p-2 bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                                       <button onClick={() => { setDeleteId(log.id); setDeleteType('vital'); }} className="text-red-500 p-2 bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                                    </div>
                                 </td>
                              </tr>
                           )
                        }) : <tr><td colSpan={7} className="px-6 py-10 text-center text-slate-400 italic">Belum ada data.</td></tr>}
                     </tbody>
                  </table>
               </div>
            </div>
         </div>
      );
  }

  if (viewMode === 'medList') {
      const presRecords = records.filter(r => r.type === 'Prescription');
      return (
         <div className="animate-fadeIn space-y-8 pb-24">
            {renderConfirmation()}
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <button onClick={() => setViewMode('dashboard')} className="p-3 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors"><ChevronLeft size={24} className="text-slate-600" /></button>
                  <h2 className="text-2xl font-black text-slate-800">Obat Kondisi Kronis</h2>
               </div>
               <button onClick={() => { setEditingRecord(null); setViewMode('presForm'); }} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest flex items-center gap-2 shadow-lg"><Plus size={16}/> Tambah Resep</button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               {presRecords.length > 0 ? presRecords.map(rec => (
                  <div key={rec.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm relative group">
                     <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                           <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Pill size={24} /></div>
                           <div>
                              <h4 className="font-black text-slate-800 text-lg">{rec.title}</h4>
                              <p className="text-xs text-slate-500">{rec.obat}</p>
                           </div>
                        </div>
                        <div className="flex gap-2">
                           <button onClick={() => { setEditingRecord(rec); setViewMode('presForm'); }} className="text-blue-600 p-2 bg-blue-50 rounded-xl"><Edit2 size={18} /></button>
                           <button onClick={() => { setDeleteId(rec.id); setDeleteType('med'); }} className="text-red-500 p-2 bg-red-50 rounded-xl"><Trash2 size={18} /></button>
                        </div>
                     </div>
                     <div className="space-y-2 text-sm text-slate-600 bg-slate-50 p-4 rounded-2xl">
                        <div className="flex justify-between border-b border-slate-200 pb-2">
                           <span className="font-bold">Dokter</span>
                           <span>{rec.doctorName || '-'}</span>
                        </div>
                        <div className="flex justify-between border-b border-slate-200 pb-2">
                           <span className="font-bold">Faskes</span>
                           <span>{rec.facility || '-'}</span>
                        </div>
                        <div className="pt-1 italic text-slate-500">
                           "{rec.description}"
                        </div>
                     </div>
                  </div>
               )) : <div className="col-span-full py-20 text-center text-slate-400 italic">Belum ada data obat kronis.</div>}
            </div>
         </div>
      );
  }

  if (viewMode === 'journalList') {
      return (
         <div className="animate-fadeIn space-y-8 pb-24">
            {renderConfirmation()}
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-4">
                  <button onClick={() => setViewMode('dashboard')} className="p-3 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors"><ChevronLeft size={24} className="text-slate-600" /></button>
                  <h2 className="text-2xl font-black text-slate-800">Jurnal Pengasuh</h2>
               </div>
               <button onClick={() => { setEditingNote(null); setViewMode('noteForm'); }} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black uppercase text-xs tracking-widest flex items-center gap-2 shadow-lg"><Plus size={16}/> Catat Jurnal</button>
            </div>

            <div className="flex flex-col md:flex-row gap-4 mb-6">
                 <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-2xl border border-slate-100 text-sm font-bold text-slate-600 relative">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Dari</span>
                    <input type="date" value={journalDateRange.start} onChange={(e) => setJournalDateRange({...journalDateRange, start: e.target.value})} className="outline-none bg-transparent text-slate-700 pr-6" />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-600 pointer-events-none" size={16} />
                 </div>
                 <div className="flex items-center gap-2 bg-white px-4 py-3 rounded-2xl border border-slate-100 text-sm font-bold text-slate-600 relative">
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sampai</span>
                    <input type="date" value={journalDateRange.end} onChange={(e) => setJournalDateRange({...journalDateRange, end: e.target.value})} className="outline-none bg-transparent text-slate-700 pr-6" />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-600 pointer-events-none" size={16} />
                 </div>
                 {(journalDateRange.start || journalDateRange.end) && (
                    <button onClick={() => setJournalDateRange({start: '', end: ''})} className="p-3 bg-slate-200 hover:bg-slate-300 rounded-xl text-slate-600 transition-colors"><X size={14}/></button>
                 )}
            </div>

            <div className="space-y-4">
               {filteredNotes.length > 0 ? filteredNotes.map(note => (
                  <div key={note.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-6 group hover:shadow-lg transition-all duration-300">
                     <div className="flex flex-col items-center justify-center w-24 shrink-0 md:border-r md:border-slate-100 md:pr-6 text-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(note.dateTime).getFullYear()}</span>
                        <span className="text-xs font-black text-slate-500 uppercase">{new Date(note.dateTime).toLocaleString('id-ID', {month:'short'})}</span>
                        <span className="text-3xl font-black text-indigo-600">{new Date(note.dateTime).getDate()}</span>
                        <span className="text-[10px] text-slate-400 font-bold">{new Date(note.dateTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                     </div>
                     
                     <div className="flex-1 w-full md:w-auto">
                        <div className="flex justify-between items-start mb-3">
                           <div className="flex flex-wrap gap-2">
                              <span className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest">{note.type}</span>
                              {note.mood && <span className="px-3 py-1 bg-blue-50 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest">{note.mood}</span>}
                              {note.hygiene !== undefined && <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${note.hygiene ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>Higiene: {note.hygiene ? 'OK' : 'X'}</span>}
                           </div>
                           <div className="flex gap-2">
                              <button onClick={() => { setEditingNote(note); setViewMode('noteForm'); }} className="text-blue-600 p-2 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={16} /></button>
                              <button onClick={() => { setDeleteId(note.id); setDeleteType('note'); }} className="text-red-500 p-2 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16} /></button>
                           </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           <p className="text-slate-700 font-medium leading-relaxed italic">"{note.text}"</p>
                           <div className="grid grid-cols-2 gap-y-1 gap-x-4 text-[10px] text-slate-500 font-bold border-l-2 border-slate-100 pl-4">
                              {note.activity && <div className="truncate">Aktivitas: <span className="text-slate-800">{note.activity}</span></div>}
                              {note.meals && <div className="truncate">Makan: <span className="text-slate-800">{note.meals}</span></div>}
                              {note.fluids && <div className="truncate">Minum: <span className="text-slate-800">{note.fluids}</span></div>}
                              {note.bab && <div className="truncate">BAB: <span className="text-slate-800">{note.bab}</span></div>}
                              {note.bak && <div className="truncate">BAK: <span className="text-slate-800">{note.bak}</span></div>}
                           </div>
                        </div>
                     </div>
                  </div>
               )) : <div className="py-20 text-center text-slate-400 italic">Belum ada catatan jurnal.</div>}
            </div>
         </div>
      );
  }

  if (viewMode === 'vitalForm') {
     return (
        <div className="animate-fadeIn max-w-lg mx-auto pb-24">
           <div className="flex items-center gap-4 mb-8">
              <button onClick={() => setViewMode('dashboard')} className="p-3 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors"><ChevronLeft size={24} className="text-slate-600" /></button>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">{editingVital ? 'Ubah Data Vital' : 'Input Tanda Vital'}</h2>
           </div>
           
           <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100">
               <form onSubmit={handleSaveVital} className="space-y-6">
                 <div>
                    <label className="block text-xs font-black text-slate-400 uppercase mb-1.5">Waktu Pencatatan</label>
                    <input name="dateTime" type="datetime-local" defaultValue={editingVital?.dateTime || new Date().toISOString().slice(0, 16)} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                   <div className="col-span-2">
                     <label className="block text-xs font-black text-slate-400 uppercase mb-1.5">Suhu (°C)</label>
                     <input name="temp" type="number" step="0.1" defaultValue={editingVital?.temperature} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-xl text-center" />
                   </div>
                   <div>
                     <label className="block text-xs font-black text-slate-400 uppercase mb-1.5">Systolic</label>
                     <input name="sys" type="number" defaultValue={editingVital?.systolic} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-xl text-center" />
                   </div>
                   <div>
                     <label className="block text-xs font-black text-slate-400 uppercase mb-1.5">Diastolic</label>
                     <input name="dia" type="number" defaultValue={editingVital?.diastolic} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-xl text-center" />
                   </div>
                   <div>
                     <label className="block text-xs font-black text-slate-400 uppercase mb-1.5">HR (bpm)</label>
                     <input name="hr" type="number" defaultValue={editingVital?.heartRate} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-xl text-center" />
                   </div>
                   <div>
                     <label className="block text-xs font-black text-slate-400 uppercase mb-1.5">SpO2 (%)</label>
                     <input name="spo2" type="number" defaultValue={editingVital?.oxygen} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-xl text-center" />
                   </div>
                   <div>
                     <label className="block text-xs font-black text-slate-400 uppercase mb-1.5">RR (x/m)</label>
                     <input name="rr" type="number" defaultValue={editingVital?.respiratoryRate} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-xl text-center" />
                   </div>
                 </div>
                 
                 <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setViewMode('vitalList')} className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">Batal</button>
                    <button type="submit" className="flex-1 py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl flex items-center justify-center gap-2 tracking-widest hover:bg-blue-700 transition-all">Simpan</button>
                 </div>
               </form>
           </div>
        </div>
     );
  }

  if (viewMode === 'noteForm') {
    return (
        <div className="animate-fadeIn max-w-lg mx-auto pb-24">
           <div className="flex items-center gap-4 mb-8">
              <button onClick={() => setViewMode('journalList')} className="p-3 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors"><ChevronLeft size={24} className="text-slate-600" /></button>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">{editingNote ? 'Ubah Catatan' : 'Catatan Baru'}</h2>
           </div>
           
           <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100">
               <form onSubmit={handleSaveNote} className="space-y-6">
                 <div>
                    <label className="block text-xs font-black text-slate-400 uppercase mb-1.5">Tipe Catatan</label>
                    <select name="type" defaultValue={editingNote?.type || 'general'} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm">
                       <option value="general">Umum</option>
                       <option value="mobility">Mobilitas / Fisik</option>
                       <option value="diet">Makan / Diet</option>
                       <option value="sleep">Tidur / Istirahat</option>
                    </select>
                 </div>
                 
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-xs font-black text-slate-400 uppercase mb-1.5">Mood</label>
                       <select name="mood" defaultValue={editingNote?.mood || 'Netral'} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm">
                          <option value="Senang">Senang</option>
                          <option value="Netral">Netral</option>
                          <option value="Sedih">Sedih</option>
                          <option value="Marah">Marah</option>
                          <option value="Bingung">Bingung</option>
                       </select>
                    </div>
                    <div className="flex items-center pt-6">
                       <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" name="hygiene" defaultChecked={editingNote?.hygiene} className="w-5 h-5" />
                          <span className="text-xs font-bold text-slate-600">Sudah Mandi/Bersih Diri?</span>
                       </label>
                    </div>
                 </div>

                 <div>
                    <label className="block text-xs font-black text-slate-400 uppercase mb-1.5">Aktivitas Fisik</label>
                    <input name="activity" defaultValue={editingNote?.activity} placeholder="Mis: Jalan pagi, Senam" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium text-sm" />
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-xs font-black text-slate-400 uppercase mb-1.5">Asupan Makan</label>
                       <input name="meals" defaultValue={editingNote?.meals} placeholder="Mis: Bubur, Sayur" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium text-sm" />
                    </div>
                    <div>
                       <label className="block text-xs font-black text-slate-400 uppercase mb-1.5">Asupan Cairan</label>
                       <input name="fluids" defaultValue={editingNote?.fluids} placeholder="Mis: 1.5 L Air" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium text-sm" />
                    </div>
                 </div>

                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-xs font-black text-slate-400 uppercase mb-1.5">Buang Air Besar</label>
                       <input name="bab" defaultValue={editingNote?.bab} placeholder="Mis: 1x Pagi, Normal" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium text-sm" />
                    </div>
                    <div>
                       <label className="block text-xs font-black text-slate-400 uppercase mb-1.5">Buang Air Kecil</label>
                       <input name="bak" defaultValue={editingNote?.bak} placeholder="Mis: 4-5x, Jernih" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium text-sm" />
                    </div>
                 </div>

                 <div>
                    <label className="block text-xs font-black text-slate-400 uppercase mb-1.5">Catatan Observasi</label>
                    <textarea name="text" defaultValue={editingNote?.text} rows={3} required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium text-sm" placeholder="Detail kondisi atau kejadian hari ini..."></textarea>
                 </div>

                 <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setViewMode('journalList')} className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">Batal</button>
                    <button type="submit" className="flex-1 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl flex items-center justify-center gap-2 tracking-widest hover:bg-indigo-700 transition-all">Simpan Jurnal</button>
                 </div>
               </form>
           </div>
        </div>
    );
  }

  if (viewMode === 'presForm') {
     return (
        <div className="animate-fadeIn max-w-lg mx-auto pb-24">
           <div className="flex items-center gap-4 mb-8">
              <button onClick={() => setViewMode('medList')} className="p-3 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors"><ChevronLeft size={24} className="text-slate-600" /></button>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">{editingRecord ? 'Ubah Resep' : 'Tambah Resep'}</h2>
           </div>
           
           <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100">
               <form onSubmit={handleSavePrescription} className="space-y-6">
                 <div>
                    <label className="block text-xs font-black text-slate-400 uppercase mb-1.5">Judul Kondisi / Resep</label>
                    <input name="title" defaultValue={editingRecord?.title} required placeholder="Mis: Obat Hipertensi" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm" />
                 </div>
                 <div>
                    <label className="block text-xs font-black text-slate-400 uppercase mb-1.5">Nama Obat & Dosis</label>
                    <input name="obat" defaultValue={editingRecord?.obat} required placeholder="Mis: Amlodipine 5mg" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm" />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                       <label className="block text-xs font-black text-slate-400 uppercase mb-1.5">Dokter</label>
                       <input name="doctor" defaultValue={editingRecord?.doctorName} placeholder="dr. Smith" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm" />
                    </div>
                    <div>
                       <label className="block text-xs font-black text-slate-400 uppercase mb-1.5">Faskes</label>
                       <input name="facility" defaultValue={editingRecord?.facility} placeholder="RS Medika" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-sm" />
                    </div>
                 </div>
                 <div>
                    <label className="block text-xs font-black text-slate-400 uppercase mb-1.5">Catatan Tambahan</label>
                    <textarea name="notes" defaultValue={editingRecord?.description} rows={3} className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium text-sm" placeholder="Detail instruksi..."></textarea>
                 </div>
                 <div className="flex gap-4 pt-4">
                    <button type="button" onClick={() => setViewMode('medList')} className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">Batal</button>
                    <button type="submit" className="flex-1 py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl tracking-widest hover:bg-blue-700 transition-all">Simpan</button>
                 </div>
               </form>
           </div>
        </div>
     );
  }

  return null;
};

export default ElderlyView;
