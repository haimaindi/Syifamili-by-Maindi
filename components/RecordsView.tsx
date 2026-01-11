
import React, { useState, useRef, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { FileText, Plus, Search, Trash2, Eye, Cpu, X, Upload, Loader2, Edit2, Clock, MapPin, Activity, Thermometer, Droplet, Stethoscope, Pill, Hospital, ExternalLink, Sparkles, CheckCircle2, Info, ChevronLeft, Users, ChevronDown, Calendar, Wind, Filter, FolderPlus, Image as ImageIcon, ClipboardList, RefreshCw } from 'lucide-react';
import { FamilyMember, MedicalRecord, Language, FileAttachment, InvestigationEntry } from '../types';
import { analyzeMedicalRecord } from '../services/geminiService';
import { spreadsheetService } from '../services/spreadsheetService';
import { useTranslation } from '../translations';
import ConfirmationModal from './ConfirmationModal';

interface RecordsViewProps {
  member: FamilyMember;
  allMembers: FamilyMember[];
  onSwitchMember: (id: string) => void;
  records: MedicalRecord[];
  language: Language;
  onAddRecord: (record: MedicalRecord) => void;
  onUpdateRecord: (record: MedicalRecord) => void;
  onDeleteRecord: (id: string) => void;
  initialOpenId?: string | null;
}

interface TempInvestigation {
  id: string;
  note: string;
  existingFiles: FileAttachment[];
  newFiles: File[];
  previewUrls: string[];
}

const formatDateUpper = (dateString: string) => {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase();
};

const RecordsView: React.FC<RecordsViewProps> = ({ member, allMembers, onSwitchMember, records, language, onAddRecord, onUpdateRecord, onDeleteRecord, initialOpenId }) => {
  const [viewMode, setViewMode] = useState<'list' | 'form' | 'detail'>('list');
  const [editingRecord, setEditingRecord] = useState<MedicalRecord | null>(null);
  const [viewRecord, setViewRecord] = useState<MedicalRecord | null>(null);
  
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showMemberSelector, setShowMemberSelector] = useState(false);
  const t = useTranslation(language);
  const [isSaving, setIsSaving] = useState(false);
  
  const [existingFiles, setExistingFiles] = useState<FileAttachment[]>([]);
  const [newFiles, setNewFiles] = useState<{file: File, preview: string}[]>([]);
  const [tempInvestigations, setTempInvestigations] = useState<TempInvestigation[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialOpenId) {
      const target = records.find(r => r.id === initialOpenId);
      if (target) {
        setViewRecord(target);
        setViewMode('detail');
      }
    }
  }, [initialOpenId, records]);

  const getCurrentLocalDateTime = () => {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000; 
    const localISOTime = new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
    return localISOTime;
  };

  const handleOpenForm = (record?: MedicalRecord) => {
    setEditingRecord(record || null);
    setExistingFiles(record?.files || []);
    setNewFiles([]);
    
    if (record?.investigations) {
      setTempInvestigations(record.investigations.map(inv => ({
        id: inv.id,
        note: inv.note,
        existingFiles: inv.files || [],
        newFiles: [],
        previewUrls: []
      })));
    } else {
      setTempInvestigations([]);
    }
    
    setViewMode('form');
  };

  const handleOpenDetail = (record: MedicalRecord) => {
    setViewRecord(record);
    setViewMode('detail');
  };

  const confirmDeleteRecord = () => {
    if (deleteTargetId) {
      onDeleteRecord(deleteTargetId);
      setDeleteTargetId(null);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const filesArray = Array.from(files).map((file: File) => ({
        file,
        preview: URL.createObjectURL(file)
      }));
      setNewFiles(prev => [...prev, ...filesArray]);
    }
    if (e.target) e.target.value = '';
  };

  const addInvestigationRow = () => {
    setTempInvestigations(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 6),
      note: '',
      existingFiles: [],
      newFiles: [],
      previewUrls: []
    }]);
  };

  const updateInvestigationNote = (idx: number, note: string) => {
    const newArr = [...tempInvestigations];
    newArr[idx].note = note;
    setTempInvestigations(newArr);
  };

  const handleInvestigationFileSelect = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const newArr = [...tempInvestigations];
      const filesArray = Array.from(files);
      newArr[idx].newFiles = [...newArr[idx].newFiles, ...filesArray];
      newArr[idx].previewUrls = [...newArr[idx].previewUrls, ...filesArray.map((f: File) => URL.createObjectURL(f))];
      setTempInvestigations(newArr);
    }
    if (e.target) e.target.value = '';
  };

  const removeInvestigationNewFile = (invIdx: number, fileIdx: number) => {
    const newArr = [...tempInvestigations];
    newArr[invIdx].newFiles = newArr[invIdx].newFiles.filter((_, i) => i !== fileIdx);
    newArr[invIdx].previewUrls = newArr[invIdx].previewUrls.filter((_, i) => i !== fileIdx);
    setTempInvestigations(newArr);
  };

  const removeInvestigationExistingFile = (invIdx: number, fileIdx: number) => {
    const newArr = [...tempInvestigations];
    newArr[invIdx].existingFiles = newArr[invIdx].existingFiles.filter((_, i) => i !== fileIdx);
    setTempInvestigations(newArr);
  };

  const removeInvestigationRow = (idx: number) => {
    setTempInvestigations(prev => prev.filter((_, i) => i !== idx));
  };

  const removeNewFile = (idx: number) => {
    setNewFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const removeExistingFile = (idx: number) => {
    setExistingFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    try {
      const uploadedMain: FileAttachment[] = [];
      for (const item of newFiles) {
        const result = await spreadsheetService.uploadFile(item.file);
        if (result?.url) uploadedMain.push({ url: result.url, name: item.file.name });
      }
      const finalMainFiles = [...existingFiles, ...uploadedMain];
      
      const finalInvestigations: InvestigationEntry[] = [];
      for (const inv of tempInvestigations) {
        const uploadedInv: FileAttachment[] = [];
        for (const file of inv.newFiles) {
          const result = await spreadsheetService.uploadFile(file);
          if (result?.url) uploadedInv.push({ url: result.url, name: file.name });
        }
        if (inv.note.trim() || inv.existingFiles.length > 0 || uploadedInv.length > 0) {
          finalInvestigations.push({
            id: inv.id,
            note: inv.note,
            files: [...inv.existingFiles, ...uploadedInv]
          });
        }
      }

      const bp = formData.get('bloodPressure') as string;
      let sys, dia;
      if (bp && bp.includes('/')) {
        const [s, d] = bp.split('/');
        sys = parseFloat(s);
        dia = parseFloat(d);
      } else if (bp) {
         sys = parseFloat(bp);
      }

      const recordData: MedicalRecord = {
        id: editingRecord?.id || Math.random().toString(36).substr(2, 9),
        memberId: member.id,
        title: formData.get('title') as string,
        dateTime: formData.get('dateTime') as string,
        type: formData.get('type') as any,
        description: formData.get('description') as string,
        diagnosis: formData.get('diagnosis') as string,
        saran: formData.get('saran') as string,
        obat: formData.get('obat') as string,
        doctorName: formData.get('doctorName') as string,
        facility: formData.get('facility') as string,
        files: finalMainFiles,
        investigations: finalInvestigations,
        aiAnalysis: editingRecord?.aiAnalysis, 
        temperature: parseFloat(formData.get('temperature') as string) || undefined,
        systolic: sys,
        diastolic: dia,
        heartRate: parseFloat(formData.get('heartRate') as string) || undefined,
        oxygen: parseFloat(formData.get('oxygen') as string) || undefined,
        respiratoryRate: parseFloat(formData.get('respiratoryRate') as string) || undefined,
      };
      if (editingRecord) onUpdateRecord(recordData);
      else onAddRecord(recordData);
      setViewMode('list');
    } catch (err) {
      alert("Gagal menyimpan rekam medis.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleGenerateAI = async (record: MedicalRecord) => {
    setAnalyzingId(record.id);
    const context = `
      Record Title: ${record.title}
      Date: ${record.dateTime}
      Type: ${record.type}
      Diagnosis: ${record.diagnosis || 'Not specified'}
      Doctor: ${record.doctorName || '-'} at ${record.facility || '-'}
      Medication: ${record.obat || '-'}
      Vitals: Temp ${record.temperature || '-'}, BP ${record.systolic || '-'}/${record.diastolic || '-'}, HR ${record.heartRate || '-'}, SpO2 ${record.oxygen || '-'}
      Investigations: ${record.investigations?.map(i => i.note).join(', ') || 'None'}
      Notes: ${record.description} ${record.saran}
    `;
    
    const result = await analyzeMedicalRecord(context, language);
    const updatedRecord = { ...record, aiAnalysis: result };
    onUpdateRecord(updatedRecord);
    setViewRecord(updatedRecord);
    setAnalyzingId(null);
  };

  const filteredRecords = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return records
      .filter(r => {
        const matchesSearch = 
          r.title.toLowerCase().includes(term) || 
          r.diagnosis?.toLowerCase().includes(term) ||
          r.doctorName?.toLowerCase().includes(term) ||
          r.facility?.toLowerCase().includes(term) ||
          r.obat?.toLowerCase().includes(term) ||
          r.type.toLowerCase().includes(term) ||
          r.description?.toLowerCase().includes(term) ||
          r.saran?.toLowerCase().includes(term);

        let matchesDate = true;
        if (dateRange.start) {
          matchesDate = matchesDate && new Date(r.dateTime) >= new Date(dateRange.start);
        }
        if (dateRange.end) {
          const endDate = new Date(dateRange.end);
          endDate.setHours(23, 59, 59); 
          matchesDate = matchesDate && new Date(r.dateTime) <= endDate;
        }

        return matchesSearch && matchesDate;
      })
      .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
  }, [records, searchTerm, dateRange]);

  if (viewMode === 'form') {
    return (
      <div className="animate-fadeIn w-full">
        <div className="flex items-center gap-4 mb-8">
           <button onClick={() => setViewMode('list')} className="p-3 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors">
              <ChevronLeft size={24} className="text-slate-600" />
           </button>
           <h2 className="text-2xl font-black text-slate-800 tracking-tight">{editingRecord ? 'Ubah Rekam Medis' : 'Input Rekam Medis Baru'}</h2>
        </div>

        <form onSubmit={handleSave} className="bg-white p-8 md:p-12 rounded-[3.5rem] shadow-sm border border-slate-100 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Judul Catatan / Keluhan Utama</label>
                  <input name="title" defaultValue={editingRecord?.title} required className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-lg" placeholder="Mis: Konsultasi Rutin, Sakit Kepala" />
                </div>
                
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Waktu & Tanggal</label>
                  <input name="dateTime" type="datetime-local" defaultValue={editingRecord?.dateTime || getCurrentLocalDateTime()} required className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Tipe Rekam Medis</label>
                  <select name="type" defaultValue={editingRecord?.type || 'Consultation'} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold appearance-none">
                    <option value="Consultation">Konsultasi</option><option value="Lab">Hasil Laboratorium</option>
                    <option value="Imaging">Radiologi (X-Ray/MRI)</option><option value="Vaccination">Vaksinasi</option>
                    <option value="Prescription">Resep Obat</option><option value="Clinical Photo">Foto Klinis</option>
                    <option value="Other">Lainnya</option>
                  </select>
                </div>

                <div className="md:col-span-2 bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 shadow-inner">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase mb-4 flex items-center gap-2 tracking-widest"><Activity size={14} /> Tanda Vital (TTV)</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <VitalsInput label="Suhu (°C)" name="temperature" defaultValue={editingRecord?.temperature} />
                    <VitalsInput label="BP (120/80)" name="bloodPressure" defaultValue={editingRecord?.systolic ? `${editingRecord.systolic}/${editingRecord.diastolic}` : ''} placeholder="Sys/Dia" type="text" />
                    <VitalsInput label="HR (bpm)" name="heartRate" defaultValue={editingRecord?.heartRate} />
                    <VitalsInput label="RR (x/min)" name="respiratoryRate" defaultValue={editingRecord?.respiratoryRate} />
                    <VitalsInput label="SpO2 (%)" name="oxygen" defaultValue={editingRecord?.oxygen} />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Diagnosis</label>
                  <input name="diagnosis" defaultValue={editingRecord?.diagnosis} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-black text-blue-600" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Fasilitas Kesehatan</label>
                  <input name="facility" defaultValue={editingRecord?.facility} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" placeholder="RS / Klinik" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Nama Dokter</label>
                  <input name="doctorName" defaultValue={editingRecord?.doctorName} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Daftar Obat</label>
                  <input name="obat" defaultValue={editingRecord?.obat} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-2 tracking-widest">Saran & Instruksi</label>
                  <textarea name="saran" defaultValue={editingRecord?.saran} rows={3} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium"></textarea>
                </div>
                
                <div className="md:col-span-2 bg-indigo-50/50 p-8 rounded-[2.5rem] border border-indigo-100">
                   <div className="flex justify-between items-center mb-6">
                      <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2"><FolderPlus size={14} /> Pemeriksaan Penunjang (Lab/Radiologi)</h4>
                      <button type="button" onClick={addInvestigationRow} className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase shadow-md flex items-center gap-1">+ Tambah Item</button>
                   </div>
                   <div className="space-y-4">
                      {tempInvestigations.map((inv, idx) => (
                        <div key={inv.id} className="flex gap-3 items-start">
                           <div className="flex-1 bg-white p-6 rounded-3xl border border-indigo-100 relative group">
                              <div className="mb-4">
                                 <label className="block text-[9px] font-black text-slate-400 uppercase mb-1.5 tracking-widest">Keterangan Pemeriksaan</label>
                                 <input value={inv.note} onChange={(e) => updateInvestigationNote(idx, e.target.value)} placeholder="Mis: Hasil Lab Darah Lengkap" className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold outline-none" />
                              </div>
                              <div className="flex flex-wrap gap-3 items-center">
                                 {inv.existingFiles.map((f, fIdx) => (
                                   <div key={`ex-${fIdx}`} className="relative w-16 h-16 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group/file">
                                     {f.name.match(/\.(jpg|jpeg|png|webp)$/i) ? <img src={f.url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><FileText size={16} className="text-slate-300" /></div>}
                                     <button type="button" onClick={() => removeInvestigationExistingFile(idx, fIdx)} className="absolute top-0.5 right-0.5 p-1 bg-red-500 text-white rounded-md opacity-0 group-hover/file:opacity-100 transition-opacity"><X size={10} /></button>
                                   </div>
                                 ))}
                                 {inv.newFiles.map((f, fIdx) => (
                                   <div key={`new-${fIdx}`} className="relative w-16 h-16 rounded-xl overflow-hidden border border-blue-200 bg-blue-50 group/file">
                                     {f.type.startsWith('image/') ? <img src={inv.previewUrls[fIdx]} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><FileText size={16} className="text-blue-300" /></div>}
                                     <button type="button" onClick={() => removeInvestigationNewFile(idx, fIdx)} className="absolute top-0.5 right-0.5 p-1 bg-red-500 text-white rounded-md opacity-0 group-hover/file:opacity-100 transition-opacity"><X size={10} /></button>
                                   </div>
                                 ))}
                                 <label className="w-16 h-16 rounded-xl border-2 border-dashed border-indigo-200 flex flex-col items-center justify-center text-indigo-300 hover:border-indigo-400 hover:text-indigo-400 transition-all cursor-pointer bg-indigo-50/50">
                                   <ImageIcon size={20} />
                                   <input type="file" multiple className="hidden" accept="image/*,.pdf" onChange={(e) => handleInvestigationFileSelect(e, idx)} />
                                 </label>
                              </div>
                           </div>
                           <button type="button" onClick={() => removeInvestigationRow(idx)} className="p-3 text-red-500 bg-red-50 rounded-2xl border border-red-100 shadow-sm hover:bg-red-100 transition-all mt-2"><Trash2 size={18} /></button>
                        </div>
                      ))}
                      {tempInvestigations.length === 0 && <p className="text-center text-xs text-slate-400 italic py-4">Belum ada pemeriksaan penunjang.</p>}
                   </div>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-[10px] font-black text-slate-400 uppercase mb-3 tracking-widest">Dokumentasi Lain</label>
                  <div className="flex flex-wrap gap-3">
                    {existingFiles.map((f, i) => (
                      <div key={`ex-${i}`} className="relative w-24 h-24 rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 group">
                        {f.name.match(/\.(jpg|jpeg|png|webp)$/i) ? <img src={f.url} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><FileText size={24} className="text-slate-300" /></div>}
                        <button type="button" onClick={() => removeExistingFile(i)} className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-md"><X size={12} strokeWidth={4} /></button>
                      </div>
                    ))}
                    {newFiles.map((item, i) => (
                      <div key={`new-${i}`} className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-blue-400 bg-blue-50 group">
                        {item.file.type.startsWith('image/') ? <img src={item.preview} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><FileText size={24} className="text-blue-300" /></div>}
                        <button type="button" onClick={() => removeNewFile(i)} className="absolute top-1 right-1 p-1.5 bg-red-500 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shadow-md"><X size={12} strokeWidth={4} /></button>
                        <div className="absolute bottom-1 left-1 bg-blue-600 text-[6px] text-white px-1 rounded uppercase font-black">BARU</div>
                      </div>
                    ))}
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-300 hover:border-blue-400 hover:text-blue-400 transition-all">
                      <Plus size={24} /><span className="text-[8px] font-black uppercase mt-1">Tambah</span>
                    </button>
                    <input type="file" ref={fileInputRef} multiple className="hidden" onChange={handleFileSelect} accept="image/*,.pdf" />
                  </div>
                </div>
            </div>

            <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setViewMode('list')} className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">Batal</button>
                <button type="submit" disabled={isSaving} className="flex-1 py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl flex items-center justify-center gap-2 hover:bg-blue-700 transition-all">
                  {isSaving ? <Loader2 className="animate-spin" size={18} /> : t.save}
                </button>
            </div>
        </form>
      </div>
    );
  }

  if (viewMode === 'detail' && viewRecord) {
     return (
        <div className="animate-fadeIn w-full space-y-8">
           <div className="flex items-center gap-4">
              <button onClick={() => setViewMode('list')} className="p-3 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors">
                 <ChevronLeft size={24} className="text-slate-600" />
              </button>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Detail Rekam Medis</h2>
           </div>

           <div className="bg-white rounded-[3.5rem] p-8 md:p-12 shadow-sm border border-slate-100">
               <div className="flex justify-between items-start mb-10 border-b border-slate-50 pb-8">
                  <div>
                     <span className="text-[10px] font-black text-blue-600 uppercase mb-2 block tracking-widest">{viewRecord.type}</span>
                     <h3 className="text-3xl font-black text-slate-800 leading-tight mb-2">{viewRecord.title}</h3>
                     <div className="flex items-center gap-2 text-slate-400 text-sm font-bold">
                        <Clock size={16} /> {formatDateUpper(viewRecord.dateTime)} {new Date(viewRecord.dateTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                     </div>
                  </div>
                  <div className="flex gap-2">
                     <button onClick={() => handleOpenForm(viewRecord)} className="p-4 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 rounded-2xl transition-all"><Edit2 size={20} /></button>
                  </div>
               </div>

               <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
                <DetailBadge icon={Thermometer} label="Suhu" value={viewRecord.temperature ? `${viewRecord.temperature}°C` : '--'} color="amber" />
                <DetailBadge icon={Activity} label="BP" value={viewRecord.systolic ? `${viewRecord.systolic}/${viewRecord.diastolic}` : '--'} color="blue" />
                <DetailBadge icon={Activity} label="Detak" value={viewRecord.heartRate || '--'} color="rose" />
                <DetailBadge icon={Wind} label="RR" value={viewRecord.respiratoryRate ? `${viewRecord.respiratoryRate} x/m` : '--'} color="indigo" />
                <DetailBadge icon={Droplet} label="SpO2" value={viewRecord.oxygen ? `${viewRecord.oxygen}%` : '--'} color="emerald" />
               </div>

               <div className="space-y-6">
                 <DetailSection icon={Stethoscope} title="Diagnosis Utama" content={viewRecord.diagnosis} highlight />
                 <DetailSection icon={Hospital} title="Fasilitas & Dokter" content={`${viewRecord.facility || '-'} (${viewRecord.doctorName || '-'})`} />
                 <DetailSection icon={Pill} title="Rencana Pengobatan" content={viewRecord.obat} />
                 <DetailSection icon={ClipboardList} title="Instruksi & Saran" content={viewRecord.saran} />
                 
                 {viewRecord.investigations && viewRecord.investigations.length > 0 && (
                   <div className="pt-4">
                      <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-4 border-b border-indigo-50 pb-2">Pemeriksaan Penunjang</h4>
                      <div className="space-y-3">
                        {viewRecord.investigations.map((inv, idx) => (
                           <div key={idx} className="bg-indigo-50/30 p-5 rounded-3xl border border-indigo-50">
                              <p className="font-bold text-slate-800 text-sm mb-3 flex items-center gap-2"><FolderPlus size={14} className="text-indigo-400"/> {inv.note}</p>
                              {inv.files && inv.files.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {inv.files.map((f, i) => (
                                    <div key={i} onClick={() => window.open(f.url, '_blank')} className="w-24 h-24 rounded-2xl border border-white/50 overflow-hidden cursor-pointer hover:border-indigo-500 transition-all shadow-sm relative group bg-slate-50 flex items-center justify-center">
                                       {f.name.match(/\.(jpg|jpeg|png|webp)$/i) ? <img src={f.url} className="w-full h-full object-cover" /> : <div className="text-indigo-300 flex flex-col items-center"><FileText size={24}/><span className="text-[7px] font-black mt-1 uppercase block text-center truncate w-full px-1">{f.name}</span></div>}
                                       <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                          <ExternalLink className="text-white" size={16} />
                                       </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                           </div>
                        ))}
                      </div>
                   </div>
                 )}

                 {viewRecord.files && viewRecord.files.length > 0 && (
                   <div className="pt-4">
                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Dokumentasi Lain</h4>
                     <div className="flex flex-wrap gap-3">
                       {viewRecord.files.map((f, i) => (
                         <div key={i} onClick={() => window.open(f.url, '_blank')} className="w-24 h-24 rounded-2xl border border-slate-200 overflow-hidden cursor-pointer hover:border-blue-500 transition-all shadow-sm relative group bg-slate-50 flex items-center justify-center">
                           {f.name.match(/\.(jpg|jpeg|png|webp)$/i) ? <img src={f.url} className="w-full h-full object-cover" /> : <div className="text-slate-300"><FileText size={24}/><span className="text-[7px] font-black mt-1 uppercase block text-center">FILE</span></div>}
                           <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                              <ExternalLink className="text-white" size={16} />
                           </div>
                         </div>
                       ))}
                     </div>
                   </div>
                 )}

                 <div className="pt-8">
                    {!viewRecord.aiAnalysis && (
                      <button 
                        onClick={() => handleGenerateAI(viewRecord)}
                        disabled={analyzingId === viewRecord.id} 
                        className="w-full py-5 bg-gradient-to-r from-slate-900 to-indigo-900 text-white rounded-[2rem] font-black uppercase text-xs flex items-center justify-center gap-3 shadow-2xl hover:scale-[1.02] active:scale-95 transition-all"
                      >
                        {analyzingId === viewRecord.id ? <Loader2 className="animate-spin" size={18} /> : <Sparkles size={18} className="text-amber-400" />}
                        ANALISA REKAM MEDIS
                      </button>
                    )}
                    
                    {viewRecord.aiAnalysis && (
                      <div className="mt-8 space-y-4 animate-fadeIn">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                            <Info size={14} /> Analisa Rekam Medis
                          </div>
                          <button onClick={() => handleGenerateAI(viewRecord)} disabled={analyzingId === viewRecord.id} className="text-[10px] font-bold text-slate-400 hover:text-indigo-600 flex items-center gap-1">
                             {analyzingId === viewRecord.id ? <Loader2 className="animate-spin" size={12}/> : <RefreshCw size={12} />} Analisa Ulang
                          </button>
                        </div>
                        <div className="bg-white border-2 border-indigo-50 rounded-[2.5rem] p-8 md:p-10 text-slate-800 shadow-xl relative overflow-hidden">
                           <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none"><Cpu size={120} /></div>
                           <div className="relative z-10">
                              <div className="prose prose-sm prose-indigo max-w-none font-medium leading-relaxed" dangerouslySetInnerHTML={{ __html: viewRecord.aiAnalysis }} />
                           </div>
                           <div className="mt-8 pt-6 border-t border-slate-100 flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest italic">
                              <Info size={12} /> Informasi ini mungkin tidak akurat, konsutasikan ke dokter/nakes profesional.
                           </div>
                        </div>
                      </div>
                    )}
                 </div>
               </div>
           </div>
        </div>
     );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <ConfirmationModal 
        isOpen={!!deleteTargetId} 
        onClose={() => setDeleteTargetId(null)}
        onConfirm={confirmDeleteRecord}
        title="Hapus Rekam Medis?"
        message="Data rekam medis ini akan dihapus permanen dan tidak bisa dikembalikan."
      />

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
              <h2 className="text-xl md:text-2xl font-black text-slate-800 leading-tight">{t.records}</h2>
              <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setShowMemberSelector(true)}>
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">{member.name}</p>
                <ChevronDown size={14} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
              </div>
           </div>
        </div>
        
        <button onClick={() => handleOpenForm()} className="w-full md:w-auto bg-blue-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 flex items-center justify-center gap-2">
          <Plus size={18} /> {t.newRecord}
        </button>
      </div>

       {showMemberSelector && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 shadow-2xl animate-scaleIn flex flex-col border-2 border-white relative overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-black text-slate-800">Pilih Anggota Keluarga</h3>
              <button onClick={() => setShowMemberSelector(false)} className="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-[60vh] overflow-y-auto scrollbar-hide">
              {allMembers.map(m => (
                <button 
                  key={m.id}
                  onClick={() => { onSwitchMember(m.id); setShowMemberSelector(false); }}
                  className={`p-4 rounded-[2rem] border transition-all flex flex-col items-center gap-3 ${m.id === member.id ? 'bg-blue-50 border-blue-200 ring-2 ring-blue-100' : 'bg-white border-slate-100 hover:border-blue-200 hover:shadow-md'}`}
                >
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 border border-slate-50 shadow-sm">
                    <img src={m.photoUrl} className="w-full h-full object-cover" alt={m.name} />
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-black text-slate-800 line-clamp-1">{m.name}</p>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{m.relation}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      )}

      <div className="bg-white rounded-[3rem] border border-slate-100 overflow-hidden shadow-sm">
        <div className="p-6 md:p-8 bg-slate-50/50 border-b border-slate-100 flex flex-col gap-4">
          <div className="relative">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
            <input 
              type="text" 
              placeholder="Cari keluhan, dokter, faskes, atau detail lainnya..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-14 pr-6 py-4 bg-white border border-slate-100 rounded-2xl outline-none font-medium focus:ring-4 focus:ring-blue-50 transition-all text-sm" 
            />
          </div>
          <div className="flex flex-wrap items-center gap-3">
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
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-slate-400 text-[10px] font-black uppercase tracking-widest bg-slate-50 border-b border-slate-100">
                <th className="px-6 py-5">Tgl & Judul</th>
                <th className="px-6 py-5">Tipe</th>
                <th className="px-6 py-5">Diagnosis</th>
                <th className="px-6 py-5">Lokasi / Dokter</th>
                <th className="px-6 py-5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.map(record => (
                <tr key={record.id} className="hover:bg-blue-50/30 transition-colors group cursor-pointer" onClick={() => handleOpenDetail(record)}>
                  <td className="px-6 py-6">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[10px] font-black text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded-lg">{formatDateUpper(record.dateTime)}</span>
                      </div>
                      <p className="font-black text-slate-800 text-sm md:text-base line-clamp-1">{record.title}</p>
                    </div>
                  </td>
                  <td className="px-6 py-6">
                     <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{record.type}</span>
                  </td>
                  <td className="px-6 py-6">
                    <span className="px-3 py-1.5 rounded-xl text-[10px] font-black uppercase bg-slate-100 text-slate-600 border border-slate-200 line-clamp-1 w-fit">{record.diagnosis || 'N/A'}</span>
                  </td>
                  <td className="px-6 py-6">
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-slate-800">{record.facility || '-'}</p>
                      <p className="text-[10px] font-medium text-slate-400 italic">{record.doctorName || '-'}</p>
                    </div>
                  </td>
                  <td className="px-6 py-6 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={(e) => { e.stopPropagation(); handleOpenForm(record); }} className="p-3 text-blue-600 bg-blue-50 rounded-2xl transition-all"><Edit2 size={16} /></button>
                      <button onClick={(e) => { e.stopPropagation(); setDeleteTargetId(record.id); }} className="p-3 text-red-500 bg-red-50 rounded-2xl transition-all"><Trash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const VitalsInput = ({ label, name, defaultValue, placeholder, type = "number" }: any) => (
  <div className="flex flex-col items-center">
    <label className="block text-[7px] font-black text-slate-400 mb-1 uppercase text-center tracking-tighter">{label}</label>
    <input name={name} type={type} step="0.1" defaultValue={defaultValue} placeholder={placeholder} className="w-full px-3 py-3 bg-white border border-slate-200 rounded-xl font-bold text-center text-xs outline-none focus:ring-2 focus:ring-blue-100" />
  </div>
);

const DetailBadge = ({ icon: Icon, label, value, color }: any) => {
  const colors: any = { 
    amber: "bg-amber-50 text-amber-600 border-amber-100", 
    blue: "bg-blue-50 text-blue-600 border-blue-100", 
    rose: "bg-rose-50 text-rose-600 border-rose-100", 
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100" 
  };
  return (
    <div className={`p-4 rounded-3xl ${colors[color]} border shadow-sm text-center flex flex-col items-center flex-1`}>
      <Icon size={16} className="mb-2" />
      <span className="text-[7px] font-black uppercase tracking-widest opacity-60 mb-1">{label}</span>
      <span className="text-sm font-black truncate w-full">{value}</span>
    </div>
  );
};

const DetailSection = ({ icon: Icon, title, content, highlight }: any) => (
  <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 flex items-start gap-4 hover:bg-white hover:shadow-md transition-all group">
    <div className="p-3 bg-white rounded-2xl border border-slate-100 text-slate-400 shadow-sm group-hover:text-blue-600 transition-colors"><Icon size={20} /></div>
    <div className="flex-1 min-w-0">
      <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{title}</h5>
      <p className={`text-sm leading-relaxed break-words ${highlight ? 'font-black text-blue-600 text-base' : 'font-bold text-slate-700'}`}>{content || '-'}</p>
    </div>
  </div>
);

export default RecordsView;
