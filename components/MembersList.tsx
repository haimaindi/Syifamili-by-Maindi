
import React, { useState, useRef, useMemo } from 'react';
import { UserPlus, Shield, Trash2, Edit2, Camera, CreditCard, Search, Image as ImageIcon, ExternalLink, ChevronLeft, CheckCircle2, Eye, Loader2, Users } from 'lucide-react';
import { FamilyMember, Relation, AllergyDetail, Insurance, Language, Gender } from '../types';
import { spreadsheetService } from '../services/spreadsheetService';
import { useTranslation } from '../translations';
import ConfirmationModal from './ConfirmationModal';

interface MembersListProps {
  members: FamilyMember[];
  language: Language;
  onAddMember: (member: FamilyMember) => void;
  onUpdateMember: (member: FamilyMember) => void;
  onDeleteMember: (id: string) => void;
  onSelectMember: (id: string) => void;
  selectedId: string;
}

interface TempAllergy extends Partial<AllergyDetail> {
  localFile?: File;
  previewUrl?: string; // For instant preview
}

interface TempInsurance extends Partial<Insurance> {
  localFile?: File;
  previewUrl?: string; // For instant preview
}

const formatDateUpper = (dateString: string) => {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase();
};

const MembersList: React.FC<MembersListProps> = ({ members, language, onAddMember, onUpdateMember, onDeleteMember, onSelectMember, selectedId }) => {
  const [viewMode, setViewMode] = useState<'list' | 'form' | 'detail'>('list');
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [memberPhotoFile, setMemberPhotoFile] = useState<File | null>(null);
  
  const [tempAllergies, setTempAllergies] = useState<TempAllergy[]>([]);
  const [tempInsurances, setTempInsurances] = useState<TempInsurance[]>([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  const photoInputRef = useRef<HTMLInputElement>(null);
  const t = useTranslation(language);

  // Confirmation Modal State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const bday = new Date(birthDate);
    let years = today.getFullYear() - bday.getFullYear();
    let months = today.getMonth() - bday.getMonth();
    if (months < 0 || (months === 0 && today.getDate() < bday.getDate())) {
      years--;
      months = 12 + months;
    }
    return { years, months };
  };

  const handleOpenForm = (member?: FamilyMember) => {
    if (member) {
      setEditingMember(member);
      setTempAllergies(member.allergies || []);
      setTempInsurances(member.insurances || []);
    } else {
      setEditingMember(null);
      setTempAllergies([]);
      setTempInsurances([]);
    }
    setMemberPhotoFile(null);
    setViewMode('form');
  };

  const handleOpenDetail = (member: FamilyMember) => {
    setEditingMember(member);
    onSelectMember(member.id); // Also select it for context
    setViewMode('detail');
  };

  const handleDeleteClick = (id: string) => {
    setDeleteTargetId(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = () => {
    if (deleteTargetId) {
      onDeleteMember(deleteTargetId);
      setDeleteTargetId(null);
    }
  };

  // Instant Image Preview Handlers
  const handleInsuranceFileChange = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const newArr = [...tempInsurances];
      newArr[idx].localFile = file;
      newArr[idx].previewUrl = url;
      setTempInsurances(newArr);
    }
  };

  const handleAllergyFileChange = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      const newArr = [...tempAllergies];
      newArr[idx].localFile = file;
      newArr[idx].previewUrl = url;
      setTempAllergies(newArr);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    const formData = new FormData(e.currentTarget);
    const birthDate = formData.get('birthDate') as string;
    const { years } = calculateAge(birthDate);
    
    try {
      let photoUrl = editingMember?.photoUrl || `https://picsum.photos/seed/${Math.random()}/200`;
      if (memberPhotoFile) {
        const result = await spreadsheetService.uploadFile(memberPhotoFile);
        if (result?.url) photoUrl = result.url;
      }
      
      const finalAllergies: AllergyDetail[] = [];
      for (const al of tempAllergies) {
        let finalAlPhoto = al.photoUrl || '';
        if (al.localFile) {
          const result = await spreadsheetService.uploadFile(al.localFile);
          if (result?.url) finalAlPhoto = result.url;
        }
        if (al.name) {
          finalAllergies.push({
            id: al.id || Math.random().toString(36).substr(2, 5),
            name: al.name,
            reaction: al.reaction || '',
            photoUrl: finalAlPhoto
          });
        }
      }

      const finalInsurances: Insurance[] = [];
      for (const ins of tempInsurances) {
        let finalCardUrl = ins.cardUrl || '';
        if (ins.localFile) {
           const result = await spreadsheetService.uploadFile(ins.localFile);
           if (result?.url) finalCardUrl = result.url;
        }
        if (ins.providerName) {
           finalInsurances.push({
             id: ins.id || Math.random().toString(36).substr(2, 5),
             providerName: ins.providerName,
             number: ins.number || '',
             cardUrl: finalCardUrl
           });
        }
      }

      const memberData: FamilyMember = {
        id: editingMember?.id || Math.random().toString(36).substr(2, 9),
        name: formData.get('name') as string,
        relation: formData.get('relation') as Relation,
        gender: formData.get('gender') as Gender,
        birthDate,
        bloodType: formData.get('bloodType') as string,
        allergies: finalAllergies,
        photoUrl,
        isElderly: years >= 60,
        isChild: years <= 12,
        nik: formData.get('nik') as string,
        insurances: finalInsurances,
      };

      if (editingMember) onUpdateMember(memberData);
      else onAddMember(memberData);
      setViewMode('list');
    } catch (err) {
      alert("Gagal menyimpan data profil.");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredMembers = useMemo(() => {
    return members.filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [members, searchTerm]);

  const getRelationLabel = (rel: Relation) => {
    switch (rel) {
      case 'Father': return 'Ayah';
      case 'Mother': return 'Ibu';
      case 'Child': return 'Anak';
      case 'Grandfather': return 'Kakek';
      case 'Grandmother': return 'Nenek';
      default: return 'Lainnya';
    }
  };

  // --- RENDER FORM ---
  if (viewMode === 'form') {
    return (
      <div className="animate-fadeIn w-full pb-24">
        <div className="flex items-center gap-4 mb-6 md:mb-8">
           <button onClick={() => setViewMode('list')} className="p-3 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors">
              <ChevronLeft size={24} className="text-slate-600" />
           </button>
           <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">{editingMember ? 'Ubah Profil Anggota' : 'Daftarkan Anggota Baru'}</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="bg-white p-6 md:p-12 rounded-[2.5rem] md:rounded-[3.5rem] shadow-sm border border-slate-100 space-y-8">
            <div className="flex flex-col items-center mb-8">
              <div className="relative group cursor-pointer w-32 h-32" onClick={() => photoInputRef.current?.click()}>
                <div className="w-full h-full rounded-[2.5rem] overflow-hidden border-4 border-slate-100 shadow-xl group-hover:border-blue-400 transition-all">
                  <img src={memberPhotoFile ? URL.createObjectURL(memberPhotoFile) : (editingMember?.photoUrl || 'https://picsum.photos/seed/new/200')} className="w-full h-full object-cover" alt="Profile" />
                </div>
                <div className="absolute inset-0 bg-black/40 rounded-[2.5rem] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Camera className="text-white" size={32} />
                </div>
                <input type="file" ref={photoInputRef} className="hidden" accept="image/*" onChange={(e) => setMemberPhotoFile(e.target.files?.[0] || null)} />
              </div>
              <p className="mt-3 text-[10px] font-black uppercase text-slate-400 tracking-widest">Ketuk untuk ganti foto</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nama Lengkap</label>
                <input name="name" defaultValue={editingMember?.name} required className="w-full px-5 py-3.5 md:px-6 md:py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold shadow-sm focus:ring-4 focus:ring-blue-50 transition-all text-sm md:text-base" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">NIK / Identitas</label>
                <input name="nik" defaultValue={editingMember?.nik} className="w-full px-5 py-3.5 md:px-6 md:py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold shadow-sm focus:ring-4 focus:ring-blue-50 transition-all text-sm md:text-base" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Hubungan</label>
                <select name="relation" defaultValue={editingMember?.relation || 'Other'} className="w-full px-5 py-3.5 md:px-6 md:py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold shadow-sm appearance-none focus:ring-4 focus:ring-blue-50 transition-all text-sm md:text-base">
                  <option value="Father">Ayah</option><option value="Mother">Ibu</option>
                  <option value="Child">Anak</option><option value="Grandfather">Kakek</option><option value="Grandmother">Nenek</option>
                  <option value="Other">Lainnya</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Jenis Kelamin</label>
                <select name="gender" defaultValue={editingMember?.gender || 'Laki-laki'} className="w-full px-5 py-3.5 md:px-6 md:py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold shadow-sm appearance-none focus:ring-4 focus:ring-blue-50 transition-all text-sm md:text-base">
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tanggal Lahir</label>
                <input name="birthDate" type="date" defaultValue={editingMember?.birthDate} required className="w-full px-5 py-3.5 md:px-6 md:py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold shadow-sm focus:ring-4 focus:ring-blue-50 transition-all text-sm md:text-base" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Gol. Darah</label>
                <select name="bloodType" defaultValue={editingMember?.bloodType || 'Tidak Tahu'} className="w-full px-5 py-3.5 md:px-6 md:py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold shadow-sm appearance-none focus:ring-4 focus:ring-blue-50 transition-all text-sm md:text-base">
                  <option value="Tidak Tahu">Tidak Tahu</option>
                  <option value="A">A</option><option value="B">B</option><option value="AB">AB</option><option value="O">O</option>
                  <option value="A+">A+</option><option value="A-">A-</option>
                  <option value="B+">B+</option><option value="B-">B-</option>
                  <option value="AB+">AB+</option><option value="AB-">AB-</option>
                  <option value="O+">O+</option><option value="O-">O-</option>
                </select>
              </div>
            </div>

            {/* Insurance Dynamic Section */}
            <div className="bg-blue-50/50 p-6 md:p-8 rounded-[2.5rem] border border-blue-100">
               <div className="flex justify-between items-center mb-6">
                  <h5 className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2"><CreditCard size={14} /> Asuransi / BPJS</h5>
                  <button type="button" onClick={() => setTempInsurances([...tempInsurances, { id: Math.random().toString(36).substr(2,5), providerName: '', number: '' }])} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase shadow-md flex items-center gap-1">+ Tambah</button>
               </div>
               <div className="space-y-4">
                  {tempInsurances.map((ins, idx) => (
                    <div key={idx} className="bg-white p-5 rounded-3xl border border-blue-100 flex gap-4 items-start relative group">
                        <div className="flex-1 space-y-3 w-full">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <input placeholder="Nama Penyedia (ex: BPJS)" value={ins.providerName} onChange={(e) => { const n = [...tempInsurances]; n[idx].providerName = e.target.value; setTempInsurances(n); }} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold" />
                              <input placeholder="Nomor Kartu / Polis" value={ins.number} onChange={(e) => { const n = [...tempInsurances]; n[idx].number = e.target.value; setTempInsurances(n); }} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold" />
                           </div>
                           
                           <div className="flex flex-col sm:flex-row gap-4 items-center">
                             <label className="cursor-pointer bg-slate-50 px-4 py-3 rounded-xl flex items-center gap-3 border border-slate-200 hover:bg-slate-100 w-full sm:w-auto justify-center transition-colors">
                                <ImageIcon size={14} className="text-slate-400" />
                                <span className="text-[10px] font-black uppercase text-slate-500">{ins.previewUrl || ins.cardUrl ? 'Ganti Foto' : 'Upload Foto Kartu'}</span>
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleInsuranceFileChange(e, idx)} />
                             </label>
                             {/* Instant Preview */}
                             {(ins.previewUrl || ins.cardUrl) && (
                               <div className="w-20 h-20 aspect-square bg-slate-100 rounded-xl overflow-hidden border border-slate-200 relative shrink-0">
                                  <img src={ins.previewUrl || ins.cardUrl} className="w-full h-full object-cover" alt="Preview" />
                               </div>
                             )}
                           </div>
                        </div>
                        {/* Delete Button Separated - ALWAYS RED */}
                        <button type="button" onClick={() => setTempInsurances(tempInsurances.filter((_, i) => i !== idx))} className="shrink-0 p-3 bg-red-50 text-red-500 rounded-xl border border-red-100 shadow-sm transition-all h-fit hover:bg-red-100"><Trash2 size={18} /></button>
                    </div>
                  ))}
                  {tempInsurances.length === 0 && <p className="text-center text-xs text-slate-400 italic">Belum ada asuransi terdaftar.</p>}
               </div>
            </div>

            {/* Allergy Dynamic Section */}
            <div className="bg-rose-50/50 p-6 md:p-8 rounded-[2.5rem] border border-red-100">
               <div className="flex justify-between items-center mb-6">
                  <h5 className="text-[10px] font-black text-rose-600 uppercase tracking-widest flex items-center gap-2"><Shield size={14} /> Daftar Alergi</h5>
                  <button type="button" onClick={() => setTempAllergies([...tempAllergies, { id: Math.random().toString(36).substr(2,5), name: '', reaction: '' }])} className="bg-rose-600 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase shadow-md flex items-center gap-1">+ Tambah</button>
               </div>
               <div className="space-y-4">
                  {tempAllergies.map((al, idx) => (
                     <div key={idx} className="bg-white p-5 rounded-3xl border border-rose-100 flex gap-4 items-start relative group">
                        <div className="flex-1 space-y-3 w-full">
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <input placeholder="Pemicu Alergi (ex: Kacang)" value={al.name} onChange={(e) => { const n = [...tempAllergies]; n[idx].name = e.target.value; setTempAllergies(n); }} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold" />
                              <input placeholder="Reaksi (ex: Gatal, Sesak)" value={al.reaction} onChange={(e) => { const n = [...tempAllergies]; n[idx].reaction = e.target.value; setTempAllergies(n); }} className="w-full px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-xs" />
                           </div>
                           
                           <div className="flex flex-col sm:flex-row gap-4 items-center">
                             <label className="cursor-pointer bg-slate-50 px-4 py-3 rounded-xl flex items-center gap-3 border border-slate-200 hover:bg-slate-100 w-full sm:w-auto justify-center transition-colors">
                                <ImageIcon size={14} className="text-slate-400" />
                                <span className="text-[10px] font-black uppercase text-slate-500">{al.previewUrl || al.photoUrl ? 'Ganti Foto' : 'Upload Foto Reaksi'}</span>
                                <input type="file" className="hidden" accept="image/*" onChange={(e) => handleAllergyFileChange(e, idx)} />
                             </label>
                             {/* Instant Preview */}
                             {(al.previewUrl || al.photoUrl) && (
                               <div className="w-20 h-20 aspect-square bg-slate-100 rounded-xl overflow-hidden border border-slate-200 relative shrink-0">
                                  <img src={al.previewUrl || al.photoUrl} className="w-full h-full object-cover" alt="Preview" />
                               </div>
                             )}
                           </div>
                        </div>
                        {/* Delete Button Separated - ALWAYS RED */}
                        <button type="button" onClick={() => setTempAllergies(tempAllergies.filter((_, i) => i !== idx))} className="shrink-0 p-3 bg-red-50 text-red-500 rounded-xl border border-red-100 shadow-sm transition-all h-fit hover:bg-red-100"><Trash2 size={18} /></button>
                     </div>
                  ))}
                  {tempAllergies.length === 0 && <p className="text-center text-xs text-slate-400 italic">Tidak ada alergi tercatat.</p>}
               </div>
            </div>

            <div className="flex gap-4 pt-6">
               <button type="button" onClick={() => setViewMode('list')} className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">Batal</button>
               <button type="submit" disabled={isSaving} className="flex-1 py-5 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl flex items-center justify-center gap-2 tracking-widest hover:bg-blue-700 transition-all">{isSaving ? <Loader2 className="animate-spin" size={20} /> : 'SIMPAN PROFIL'}</button>
            </div>
        </form>
      </div>
    );
  }

  // --- RENDER DETAIL VIEW (Full Page) ---
  if (viewMode === 'detail' && editingMember) {
     return (
        <div className="animate-fadeIn w-full space-y-8 pb-24">
           <div className="flex items-center gap-4">
              <button onClick={() => setViewMode('list')} className="p-3 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors">
                 <ChevronLeft size={24} className="text-slate-600" />
              </button>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Detail Profil</h2>
           </div>
           
           <div className="bg-white rounded-[3.5rem] p-8 md:p-12 shadow-sm border border-slate-100">
              <div className="flex flex-col md:flex-row gap-8 items-center md:items-start mb-10">
                 <div className="w-32 h-32 rounded-[2.5rem] overflow-hidden border-8 border-slate-50 shadow-2xl shrink-0">
                    <img src={editingMember.photoUrl} className="w-full h-full object-cover" />
                 </div>
                 <div className="text-center md:text-left flex-1">
                    <h3 className="text-3xl font-black text-slate-800 mb-2">{editingMember.name}</h3>
                    <div className="flex flex-wrap justify-center md:justify-start gap-2">
                       <span className="px-4 py-1.5 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest">{getRelationLabel(editingMember.relation)}</span>
                       <span className="px-4 py-1.5 bg-slate-100 text-slate-500 rounded-full text-[10px] font-black uppercase tracking-widest">{calculateAge(editingMember.birthDate).years} Tahun</span>
                       {editingMember.gender && <span className="px-4 py-1.5 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-widest">{editingMember.gender}</span>}
                    </div>
                 </div>
                 <div className="md:ml-auto flex gap-2">
                    <button onClick={() => handleOpenForm(editingMember)} className="px-6 py-3 bg-blue-600 text-white rounded-xl shadow-lg hover:bg-blue-700 transition-all text-xs font-black uppercase tracking-widest flex items-center gap-2">
                       <Edit2 size={14} /> Ubah Profil
                    </button>
                 </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                 <MiniBox label="NIK" value={editingMember.nik || '-'} />
                 <MiniBox label="Gol. Darah" value={editingMember.bloodType} />
                 <MiniBox label="Kategori" value={editingMember.isElderly ? 'Lansia' : editingMember.isChild ? 'Anak' : 'Dewasa'} />
                 <MiniBox label="Tgl Lahir" value={formatDateUpper(editingMember.birthDate)} />
              </div>

              <div className="space-y-6">
                 {/* Insurance List */}
                 <div>
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Daftar Asuransi</h4>
                    {editingMember.insurances && editingMember.insurances.length > 0 ? (
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {editingMember.insurances.map((ins, i) => (
                             <div key={i} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 relative group overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-5"><CreditCard size={60} /></div>
                                <div className="relative z-10">
                                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{ins.providerName}</p>
                                   <p className="text-lg font-black text-blue-600 leading-tight mb-4 break-all">{ins.number}</p>
                                   {ins.cardUrl && (
                                      <button onClick={() => window.open(ins.cardUrl, '_blank')} className="flex items-center gap-2 text-[10px] font-black text-slate-500 hover:text-blue-600 uppercase tracking-widest">
                                         <ExternalLink size={12} /> Lihat Kartu
                                      </button>
                                   )}
                                </div>
                             </div>
                          ))}
                       </div>
                    ) : (
                       <p className="text-sm text-slate-400 italic">Tidak ada data asuransi.</p>
                    )}
                 </div>

                 {/* Allergies */}
                 <div>
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-100 pb-2">Riwayat Alergi</h4>
                    {editingMember.allergies && editingMember.allergies.length > 0 ? (
                       <div className="flex flex-wrap gap-3">
                          {editingMember.allergies.map((al, i) => (
                             <div key={i} className="bg-rose-50 px-5 py-3 rounded-2xl border border-rose-100 flex items-center gap-3">
                                <Shield size={16} className="text-rose-500" />
                                <div>
                                   <p className="font-black text-slate-800 text-xs">{al.name}</p>
                                   <p className="text-[10px] text-rose-500 italic">{al.reaction}</p>
                                </div>
                             </div>
                          ))}
                       </div>
                    ) : (
                       <p className="text-sm text-slate-400 italic">Tidak ada riwayat alergi.</p>
                    )}
                 </div>
              </div>
           </div>
        </div>
     );
  }

  // --- RENDER LIST VIEW ---
  return (
    <div className="space-y-8 animate-fadeIn pb-24">
      <ConfirmationModal 
        isOpen={showDeleteConfirm} 
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmDelete}
        title="Hapus Profil Anggota?"
        message="Data profil dan semua riwayat medis terkait akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan."
      />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-800 tracking-tight">{t.members}</h2>
          <p className="text-slate-500 font-medium italic text-sm md:text-base">Sentralisasi profil medis seluruh keluarga</p>
        </div>
        <button onClick={() => handleOpenForm()} className="bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-100 flex items-center gap-2 hover:bg-blue-700 transition-all active:scale-95">
          <UserPlus size={18} /> {t.addMember}
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
        <input 
          type="text" 
          placeholder="Cari nama anggota keluarga..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-14 pr-6 py-4 bg-white border border-slate-100 rounded-[2rem] shadow-sm outline-none font-medium focus:ring-4 focus:ring-blue-50 transition-all" 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMembers.map(member => {
          const { years } = calculateAge(member.birthDate);
          return (
            <div 
              key={member.id}
              className={`group bg-white rounded-[2.5rem] border transition-all duration-300 cursor-pointer overflow-hidden flex flex-col ${selectedId === member.id ? 'border-blue-500 shadow-xl ring-4 ring-blue-50' : 'border-slate-100 hover:border-blue-200 hover:shadow-lg'}`}
              onClick={() => handleOpenDetail(member)}
            >
              <div className="p-6 flex items-center gap-5">
                 <div className="w-20 h-20 rounded-[1.5rem] overflow-hidden bg-slate-100 shrink-0 border border-slate-50 shadow-md">
                    <img src={member.photoUrl} className="w-full h-full object-cover" />
                 </div>
                 <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-black text-slate-800 leading-tight truncate mb-1">{member.name}</h4>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">{getRelationLabel(member.relation)} • {years} Thn</p>
                    <div className="flex flex-wrap items-center gap-2">
                       {member.gender && <span className="text-[9px] font-black px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-lg uppercase">{member.gender}</span>}
                       {member.bloodType !== 'Tidak Tahu' && <span className="text-[9px] font-black px-2 py-0.5 bg-red-50 text-red-500 rounded-lg uppercase">{member.bloodType}</span>}
                    </div>
                 </div>
              </div>
              <div className="mt-auto border-t border-slate-50 p-4 flex justify-end gap-3 bg-slate-50/50 items-center">
                 <button onClick={(e) => { e.stopPropagation(); handleOpenForm(member); }} className="px-4 py-2 bg-white text-blue-600 border border-blue-100 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-50 transition-all shadow-sm">Ubah Profil</button>
                 <button onClick={(e) => { e.stopPropagation(); handleDeleteClick(member.id); }} className="p-2 text-red-500 bg-red-50 rounded-lg transition-all" title="Delete"><Trash2 size={18} /></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const MiniBox = ({ label, value }: any) => (
  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center shadow-sm">
    <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">{label}</p>
    <p className="text-xs font-black text-slate-800 truncate">{value}</p>
  </div>
);

export default MembersList;
