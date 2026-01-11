
import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Image as ImageIcon, Search, Calendar, FileText, Eye, LayoutGrid, List, X, Stethoscope, Pill, CheckCircle2, Home, FileSearch, ExternalLink, Users, ChevronDown, ChevronLeft, FolderPlus, ArrowUpRight } from 'lucide-react';
import { FamilyMember, MedicalRecord, Medication, HomeCareLog } from '../types';

interface MediaVaultProps {
  member: FamilyMember;
  allMembers: FamilyMember[];
  onSwitchMember: (id: string) => void;
  records: MedicalRecord[];
  meds: Medication[];
  homeCareLogs: HomeCareLog[];
  onNavigateToDetail: (tab: string, memberId: string, itemId: string, subId?: string) => void;
}

const formatDateUpper = (dateString: string) => {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase();
};

const MediaVault: React.FC<MediaVaultProps> = ({ member, allMembers, onSwitchMember, records, meds, homeCareLogs, onNavigateToDetail }) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'detail'>('grid');
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [showMemberSelector, setShowMemberSelector] = useState(false);

  const allMedia = useMemo(() => {
    const mediaStream: any[] = [];
    
    records.forEach(r => {
      // General Record Files
      const rFiles = Array.isArray(r.files) ? r.files : [];
      rFiles.forEach((file, idx) => {
        mediaStream.push({
          id: `rec-${r.id}-${idx}`,
          parentId: r.id,
          title: r.title,
          date: r.dateTime,
          createdTime: r.dateTime,
          url: file.url,
          fileName: file.name,
          type: 'medical_record',
          category: 'Rekam Medis',
          subCategory: r.type,
          diagnosis: r.diagnosis,
          doctor: r.doctorName,
          subCount: rFiles.length,
          currentIdx: idx + 1
        });
      });

      // Investigation Files
      if (Array.isArray(r.investigations)) {
        r.investigations.forEach((inv, invIdx) => {
          if (Array.isArray(inv.files)) {
            inv.files.forEach((file, fIdx) => {
              mediaStream.push({
                id: `inv-${r.id}-${invIdx}-${fIdx}`,
                parentId: r.id,
                title: `${r.title}: ${inv.note}`,
                date: r.dateTime,
                createdTime: r.dateTime,
                url: file.url,
                fileName: file.name,
                type: 'investigation',
                category: 'Pemeriksaan Penunjang',
                subCategory: 'Lab/Radiology',
                note: inv.note,
                subCount: inv.files.length,
                currentIdx: fIdx + 1
              });
            });
          }
        });
      }
    });

    meds.filter(m => m.fileUrl).forEach(m => {
      mediaStream.push({
        id: `med-${m.id}`,
        parentId: m.id,
        title: m.name,
        date: m.nextTime || new Date().toISOString(),
        createdTime: m.nextTime || new Date().toISOString(),
        url: m.fileUrl,
        fileName: m.fileName,
        type: 'medication',
        category: 'Obat',
        subCategory: 'Medication',
        dosage: m.dosage,
        instructions: m.instructions
      });
    });

    homeCareLogs.forEach(log => {
      if (Array.isArray(log.entries)) {
        log.entries.forEach(entry => {
          if (Array.isArray(entry.files)) {
            entry.files.forEach((file, fIdx) => {
              mediaStream.push({
                id: `hc-${entry.id}-${fIdx}`,
                parentId: log.id,
                entryId: entry.id, // Store Entry ID for navigation
                title: `${log.title}: ${entry.symptom}`,
                date: entry.dateTime,
                createdTime: entry.dateTime,
                url: file.url,
                fileName: file.name,
                type: 'home_care',
                category: 'Log Perawatan',
                subCategory: 'Home Care Observation',
                note: entry.note,
                subCount: entry.files?.length || 1,
                currentIdx: fIdx + 1
              });
            });
          }
        });
      }
    });
    
    return mediaStream.sort((a, b) => {
      const timeA = new Date(a.createdTime).getTime();
      const timeB = new Date(b.createdTime).getTime();
      return timeB - timeA; // Descending order (Newest first)
    });
  }, [records, meds, homeCareLogs]);

  const filterCategories = [
    { id: 'all', label: 'SEMUA' },
    { id: 'home_care', label: 'LOG PERAWATAN' },
    { id: 'medical_record', label: 'REKAM MEDIS' },
    { id: 'investigation', label: 'PEMERIKSAAN PENUNJANG' },
    { id: 'medication', label: 'OBAT' }
  ];

  const filteredMedia = allMedia.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (item.diagnosis?.toLowerCase().includes(searchQuery.toLowerCase())) ||
                          (item.fileName?.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesFilter = filterType === 'all' || item.type === filterType;
    
    let matchesDate = true;
    const itemDate = new Date(item.createdTime);
    if (dateRange.start) {
      matchesDate = matchesDate && itemDate >= new Date(dateRange.start);
    }
    if (dateRange.end) {
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59);
      matchesDate = matchesDate && itemDate <= endDate;
    }

    return matchesSearch && matchesFilter && matchesDate;
  });

  const handleOpenDetail = (item: any) => {
    setSelectedItem(item);
    setViewMode('detail');
  };

  const handleNavigateToSource = () => {
    if (!selectedItem) return;
    
    if (selectedItem.type === 'medical_record' || selectedItem.type === 'investigation') {
      onNavigateToDetail('records', member.id, selectedItem.parentId);
    } else if (selectedItem.type === 'medication') {
      onNavigateToDetail('meds', member.id, selectedItem.parentId);
    } else if (selectedItem.type === 'home_care') {
      // Pass entryId as the 4th argument
      onNavigateToDetail('homecare', member.id, selectedItem.parentId, selectedItem.entryId);
    }
  };

  if (viewMode === 'detail' && selectedItem) {
    return (
      <div className="animate-fadeIn w-full space-y-8 pb-24">
         <div className="flex items-center gap-4">
            <button onClick={() => setViewMode('grid')} className="p-3 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors">
               <ChevronLeft size={24} className="text-slate-600" />
            </button>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Detail Berkas</h2>
         </div>

         <div className="bg-white rounded-[3rem] w-full overflow-hidden shadow-sm border border-slate-100 flex flex-col">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
               <div className="bg-slate-900 p-12 flex items-center justify-center min-h-[400px] lg:h-full relative group cursor-pointer" onClick={() => window.open(selectedItem.url, '_blank')}>
                   {selectedItem.url && selectedItem.fileName?.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                     <img src={selectedItem.url} className="max-w-full max-h-[600px] object-contain rounded-lg shadow-2xl" alt="Preview" />
                   ) : (
                     <div className="flex flex-col items-center text-slate-500">
                       <FileText size={100} strokeWidth={1} />
                       <p className="mt-4 font-black uppercase tracking-widest text-xs">Arsip Digital</p>
                     </div>
                   )}
                   <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <p className="text-white font-black uppercase tracking-widest text-sm flex items-center gap-2"><ExternalLink size={20}/> Buka Gambar Asli</p>
                   </div>
               </div>

               <div className="p-10 md:p-12 flex flex-col justify-center">
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                       <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                         selectedItem.type === 'medication' ? 'bg-amber-100 text-amber-700' : 
                         selectedItem.type === 'home_care' ? 'bg-emerald-100 text-emerald-700' : 
                         selectedItem.type === 'investigation' ? 'bg-indigo-100 text-indigo-700' :
                         'bg-blue-100 text-blue-700'
                       }`}>
                         {selectedItem.category}
                       </span>
                       <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          <Calendar size={12} /> {formatDateUpper(selectedItem.createdTime)}
                       </div>
                    </div>
                    <button onClick={handleNavigateToSource} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center gap-2">
                       Lihat Data <ArrowUpRight size={14} />
                    </button>
                  </div>
                  
                  <h3 className="text-3xl font-black text-slate-800 leading-tight mb-8">{selectedItem.title}</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     {selectedItem.doctor && <DataRow label="Provider / Dokter" value={selectedItem.doctor} />}
                     {selectedItem.diagnosis && <DataRow label="Diagnosis" value={selectedItem.diagnosis} />}
                     {selectedItem.note && <DataRow label="Catatan" value={selectedItem.note} />}
                     <DataRow label="Nama Berkas" value={selectedItem.fileName || 'N/A'} />
                  </div>
               </div>
            </div>
         </div>
      </div>
    );
  }

  // --- GRID/LIST VIEW ---
  return (
    <div className="space-y-8 animate-fadeIn">
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
              <h2 className="text-xl md:text-2xl font-black text-slate-800 leading-tight">Brankas Media</h2>
              <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setShowMemberSelector(true)}>
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">{member.name}</p>
                <ChevronDown size={14} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
              </div>
           </div>
        </div>

        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Cari berkas..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-slate-200 rounded-2xl shadow-sm outline-none focus:ring-4 focus:ring-blue-50 transition-all font-medium" 
            />
          </div>
          <div className="flex bg-white p-1 rounded-2xl shadow-sm border border-slate-200">
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-xl transition-colors ${viewMode === 'grid' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}><LayoutGrid size={20} /></button>
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-xl transition-colors ${viewMode === 'list' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}><List size={20} /></button>
          </div>
        </div>
      </div>

      {/* Filter Row: Dates moved above Categories */}
      <div className="flex flex-col gap-4 items-start">
         
         <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
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

         <div className="flex w-full overflow-x-auto gap-2 scrollbar-hide pb-1">
            {filterCategories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setFilterType(cat.id)}
                className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border-2 transition-all whitespace-nowrap ${
                  filterType === cat.id 
                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100' 
                    : 'bg-white border-slate-100 text-slate-500 hover:border-blue-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
         </div>
      </div>

       {/* MEMBER SELECTOR MODAL (PORTAL) */}
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

      {filteredMedia.length > 0 ? (
        <div className={viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6' : 'space-y-4'}>
          {filteredMedia.map((item) => (
            <div 
              key={item.id}
              onClick={() => handleOpenDetail(item)}
              className={`group bg-white rounded-[2.5rem] border border-slate-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden ${viewMode === 'list' ? 'flex items-center p-4 gap-6' : 'flex flex-col'}`}
            >
              <div className={`relative overflow-hidden bg-slate-100 ${viewMode === 'grid' ? 'h-52 w-full' : 'h-24 w-24 rounded-2xl shrink-0'}`}>
                {item.url && item.fileName?.match(/\.(jpg|jpeg|png|webp)$/i) ? (
                  <img src={item.url} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                    <FileText size={viewMode === 'grid' ? 40 : 24} />
                    <span className="text-[8px] font-black mt-2 uppercase tracking-widest">Digital Asset</span>
                  </div>
                )}
                <div className="absolute top-3 left-3 flex gap-1">
                   <div className={`p-2 rounded-lg text-white shadow-lg ${
                     item.type === 'medication' ? 'bg-amber-500' : 
                     item.type === 'home_care' ? 'bg-emerald-500' : 
                     item.type === 'investigation' ? 'bg-indigo-500' :
                     'bg-blue-600'
                   }`}>
                     {item.type === 'medication' ? <Pill size={14} /> : 
                      item.type === 'home_care' ? <Home size={14} /> : 
                      item.type === 'investigation' ? <FolderPlus size={14} /> :
                      <FileSearch size={14} />}
                   </div>
                </div>
              </div>

              <div className={`flex-1 ${viewMode === 'grid' ? 'p-6' : ''}`}>
                <h4 className="text-sm font-black text-slate-800 line-clamp-1 group-hover:text-blue-600 transition-colors">{item.title}</h4>
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-1">
                  <Calendar size={12} className="text-slate-300" /> 
                  {formatDateUpper(item.createdTime)}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-32 text-center bg-white rounded-[4rem] border-2 border-dashed border-slate-100 flex flex-col items-center">
          <ImageIcon size={64} className="text-slate-100 mb-6" />
          <h3 className="text-xl font-black text-slate-800">Media Vault Kosong</h3>
          <p className="text-slate-400 max-w-xs mx-auto mt-2 font-medium">Belum ada dokumentasi visual yang sesuai dengan filter.</p>
        </div>
      )}
    </div>
  );
};

const DataRow = ({ label, value }: any) => (
  <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
    <h5 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</h5>
    <p className="text-sm font-black text-slate-700 break-words">{value}</p>
  </div>
);

export default MediaVault;
