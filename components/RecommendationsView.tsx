
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Sparkles, 
  MapPin, 
  Phone, 
  Globe, 
  Loader2, 
  Search, 
  Building2, 
  Info,
  ChevronLeft,
  Navigation,
  MessageSquare,
  Hash,
  ExternalLink,
  UserPlus,
  CheckCircle2,
  X,
  Stethoscope,
  Hospital,
  Handshake,
  FileBadge
} from 'lucide-react';
import { Recommendation, HealthContact } from '../types';
import { spreadsheetService } from '../services/spreadsheetService';

interface RecommendationsViewProps {
  onAddContact?: (contact: HealthContact) => void;
}

const RecommendationsView: React.FC<RecommendationsViewProps> = ({ onAddContact }) => {
  const [items, setItems] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('Semua');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<Recommendation | null>(null);
  const [isSavedToContact, setIsSavedToContact] = useState(false);
  
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [formContact, setFormContact] = useState<Partial<HealthContact>>({});

  const categories = ["Semua", "Dokter", "Tenaga Kesehatan", "Fasilitas Kesehatan", "Lainnya"];

  const fetchData = async () => {
    setLoading(true);
    try {
      const data = await spreadsheetService.fetchRecommendations();
      setItems(data);
    } catch (err) {
      console.error("Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const parseDateStr = (dateStr: string) => {
    if (!dateStr || typeof dateStr !== 'string') return null;
    if (dateStr.includes('Date(')) {
        const match = dateStr.match(/\d+/g);
        if (match && match.length >= 3) {
            return new Date(parseInt(match[0]), parseInt(match[1]), parseInt(match[2]));
        }
    }
    const cleanStr = dateStr.trim();
    const parts = cleanStr.split('/');
    if (parts.length !== 3) {
        const fallback = new Date(cleanStr);
        return isNaN(fallback.getTime()) ? null : fallback;
    }
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; 
    const year = parseInt(parts[2], 10);
    const date = new Date(year, month, day);
    return isNaN(date.getTime()) ? null : date;
  };

  const filteredItems = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return items
      .filter(item => {
        const hasId = item.id && String(item.id).trim() !== '' && String(item.id).toLowerCase() !== 'id';
        const endDateObj = parseDateStr(item.endDate);
        const isActive = endDateObj ? (endDateObj >= today) : false;
        const matchCategory = activeCategory === 'Semua' || item.jenis === activeCategory;
        const q = searchTerm.toLowerCase();
        const matchSearch = item.nama.toLowerCase().includes(q) || 
                           item.alamat.toLowerCase().includes(q) ||
                           item.wilayahKerja.toLowerCase().includes(q) ||
                           (item.keywords && item.keywords.toLowerCase().includes(q));

        return hasId && isActive && matchCategory && matchSearch;
      })
      .sort((a, b) => {
        if (a.priorities === b.priorities) return 0;
        return a.priorities ? -1 : 1;
      });
  }, [items, activeCategory, searchTerm]);

  const handleOpenMap = (url: string) => {
    if (url && url.startsWith('http')) {
      window.open(url, '_blank');
    } else {
      alert("Tautan peta tidak tersedia.");
    }
  };

  const initiateAddContact = () => {
    if (!selectedItem) return;

    let contactType: HealthContact['type'] = 'Other';
    if (selectedItem.jenis === 'Dokter') contactType = 'Doctor';
    else if (selectedItem.jenis === 'Fasilitas Kesehatan') contactType = 'Hospital';

    let contactPhone = '';
    let contactAddress = '';
    let contactGmaps = '';

    if (selectedItem.tenagaKesehatan) {
       contactAddress = selectedItem.tempatPraktik1 
          ? `${selectedItem.tempatPraktik1} - ${selectedItem.alamat1}`
          : selectedItem.alamat;
       contactPhone = selectedItem.kontak1 || selectedItem.kontak;
       contactGmaps = selectedItem.link1 || selectedItem.linkAlamat;
    } else {
       contactAddress = selectedItem.alamat;
       contactPhone = selectedItem.kontak;
       contactGmaps = selectedItem.linkAlamat;
    }

    setFormContact({
      name: selectedItem.nama,
      type: contactType,
      phone: contactPhone,
      address: contactAddress,
      gmapsUrl: contactGmaps 
    });
    setShowConfirmModal(true);
  };

  const handleFinalSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onAddContact || !formContact.name) return;

    const newContact: HealthContact = {
      id: `rcm-${selectedItem?.id}-${Date.now()}`,
      name: formContact.name,
      type: (formContact.type as any) || 'Other',
      phone: formContact.phone || '',
      address: formContact.address || '',
      gmapsUrl: formContact.gmapsUrl || ''
    };

    onAddContact(newContact);
    setIsSavedToContact(true);
    setShowConfirmModal(false);
    setTimeout(() => setIsSavedToContact(false), 5000);
  };

  if (loading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-4 text-slate-400">
        <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
        <p className="font-black uppercase tracking-widest text-[10px]">Menghubungkan ke Katalog...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-12 w-full">
      {showConfirmModal && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg p-8 md:p-10 shadow-2xl animate-scaleIn flex flex-col border-2 border-white relative overflow-hidden">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><UserPlus size={24} /></div>
                <div>
                   <h3 className="text-xl font-black text-slate-800 leading-none">Konfirmasi Kontak</h3>
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Simpan ke Buku Telepon Faskes</p>
                </div>
              </div>
              <button onClick={() => setShowConfirmModal(false)} className="p-2 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleFinalSave} className="space-y-5">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nama Kontak</label>
                <input 
                  value={formContact.name} 
                  onChange={(e) => setFormContact({...formContact, name: e.target.value})}
                  required 
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-700 focus:ring-4 focus:ring-blue-50 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Kategori</label>
                <select 
                  value={formContact.type} 
                  onChange={(e) => setFormContact({...formContact, type: e.target.value as any})}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-700 appearance-none focus:ring-4 focus:ring-blue-50 transition-all"
                >
                  <option value="Doctor">Dokter / Nakes</option>
                  <option value="Hospital">Rumah Sakit</option>
                  <option value="Clinic">Klinik</option>
                  <option value="Pharmacy">Apotek</option>
                  <option value="Other">Lainnya</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Nomor Telepon</label>
                <input 
                  value={formContact.phone} 
                  onChange={(e) => setFormContact({...formContact, phone: e.target.value})}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-slate-700 focus:ring-4 focus:ring-blue-50 transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">Alamat Utama</label>
                <textarea 
                  value={formContact.address} 
                  onChange={(e) => setFormContact({...formContact, address: e.target.value})}
                  rows={3}
                  className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium text-slate-600 text-sm focus:ring-4 focus:ring-blue-50 transition-all"
                ></textarea>
              </div>

              <div className="pt-4 flex gap-4">
                 <button type="button" onClick={() => setShowConfirmModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200">Batal</button>
                 <button type="submit" className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-blue-100 hover:bg-blue-700 active:scale-95 transition-all">Tambahkan</button>
              </div>
            </form>
          </div>
        </div>, document.body
      )}

      {selectedItem ? (
        <div className="space-y-6 animate-fadeIn pb-12 w-full max-w-full">
          <div className="flex flex-wrap justify-between gap-4">
            <button 
              onClick={() => setSelectedItem(null)}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 font-black uppercase text-[9px] tracking-widest hover:bg-slate-50 transition-all shadow-sm"
            >
              <ChevronLeft size={14} /> Kembali
            </button>

            <button 
              onClick={initiateAddContact}
              disabled={isSavedToContact}
              className={`inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all shadow-lg ${
                isSavedToContact 
                  ? 'bg-emerald-500 text-white shadow-emerald-100 cursor-default' 
                  : 'bg-blue-600 text-white shadow-blue-100 hover:bg-blue-700 active:scale-95'
              }`}
            >
              {isSavedToContact ? (
                <><CheckCircle2 size={14} /> Berhasil Tersimpan!</>
              ) : (
                <><UserPlus size={14} /> Simpan ke Kontak Faskes</>
              )}
            </button>
          </div>

          <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-xl border border-slate-100 w-full">
            <div className="grid grid-cols-1 lg:grid-cols-2">
              <div className="bg-slate-50 border-b lg:border-b-0 lg:border-r border-slate-100">
                <div className="aspect-video lg:aspect-square w-full bg-white flex items-center justify-center overflow-hidden">
                  <img 
                    src={selectedItem.imageUrl || "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=800"} 
                    className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                    alt={selectedItem.nama}
                    onError={(e) => { (e.target as any).src = "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=800" }}
                  />
                </div>
                <div className="p-6 md:p-10 space-y-5">
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-[9px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-lg border border-blue-100 flex items-center gap-1.5">
                      {selectedItem.jenis === 'Dokter' ? <Stethoscope size={10}/> : <Hospital size={10}/>} {selectedItem.subJenis}
                    </span>
                    {selectedItem.wilayahKerja && (
                      <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-100 flex items-center gap-1.5">
                        <MapPin size={10} /> {selectedItem.wilayahKerja}
                      </span>
                    )}
                  </div>
                  
                  <div>
                    <h2 className="text-2xl md:text-3xl font-black text-slate-800 leading-tight">
                      {selectedItem.nama}
                    </h2>
                    {selectedItem.tenagaKesehatan && selectedItem.str && (
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2">
                        <FileBadge size={14} className="text-blue-500" /> NO. STR: {selectedItem.str}
                      </p>
                    )}
                  </div>

                  {selectedItem.campaign && (
                    <div className="p-5 bg-amber-50 rounded-3xl border border-amber-100 italic">
                      <p className="text-xs font-bold text-amber-800 leading-relaxed">"{selectedItem.campaign}"</p>
                    </div>
                  )}
                  {selectedItem.keywords && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {selectedItem.keywords.split(',').map((tag, i) => (
                        <span key={i} className="text-[8px] font-bold text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded-md">
                          #{tag.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 md:p-10 space-y-8">
                {selectedItem.tenagaKesehatan ? (
                  <div className="space-y-6">
                    <h3 className="text-base font-black text-slate-800 flex items-center gap-2.5">
                      <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><Building2 size={18} /></div>
                      Informasi Praktik
                    </h3>
                    
                    {[1, 2, 3].map(num => {
                      const tp = (selectedItem as any)[`tempatPraktik${num}`];
                      const al = (selectedItem as any)[`alamat${num}`];
                      const ko = (selectedItem as any)[`kontak${num}`];
                      const li = (selectedItem as any)[`link${num}`];
                      const sip = (selectedItem as any)[`sip${num}`];

                      if (!tp || tp.trim() === "") return null;

                      return (
                        <div key={num} className="p-5 bg-slate-50 rounded-[2rem] border border-slate-100 group transition-all hover:bg-white hover:shadow-md">
                          <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 flex flex-wrap items-center justify-between gap-1.5">
                            <div className="flex items-center gap-1.5">
                              <Hash size={10} /> Praktik {num} {num === 1 && <span className="px-1.5 py-0.5 bg-blue-600 text-white rounded text-[7px]">UTAMA</span>}
                            </div>
                            {sip && <span className="px-2 py-0.5 bg-white border border-slate-200 text-blue-600 rounded-lg text-[7px]">SIP: {sip}</span>}
                          </div>
                          <h4 className="text-base font-black text-slate-800 mb-1.5">{tp}</h4>
                          <p className="text-xs font-medium text-slate-500 mb-4">{al}</p>
                          
                          <div className="flex flex-wrap gap-2">
                            {ko && (
                              <a href={`tel:${ko}`} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[9px] font-black text-blue-600 uppercase tracking-widest hover:bg-blue-50 transition-colors">
                                <Phone size={12} /> Hubungi
                              </a>
                            )}
                            {li && (
                              <button onClick={() => handleOpenMap(li)} className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[9px] font-black text-emerald-600 uppercase tracking-widest hover:bg-emerald-50 transition-colors">
                                <Navigation size={12} /> Peta
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="space-y-6">
                    <h3 className="text-base font-black text-slate-800 flex items-center gap-2.5">
                      <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg"><Info size={18} /></div>
                      Detail Informasi
                    </h3>
                    
                    <div className="space-y-5">
                      <div className="flex items-start gap-3.5">
                        <div className="p-2.5 bg-slate-50 rounded-xl text-slate-400"><MapPin size={20} /></div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Alamat Utama</p>
                          <p className="text-sm font-bold text-slate-700 leading-relaxed mb-3">{selectedItem.alamat}</p>
                          {selectedItem.linkAlamat && (
                            <button onClick={() => handleOpenMap(selectedItem.linkAlamat)} className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white rounded-lg text-[9px] font-black uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-all">
                               <Navigation size={12} /> Petunjuk Jalan
                            </button>
                          )}
                        </div>
                      </div>

                      {selectedItem.kontak && (
                        <div className="flex items-start gap-3.5">
                          <div className="p-2.5 bg-slate-50 rounded-xl text-slate-400"><Phone size={20} /></div>
                          <div>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Nomor Kontak</p>
                            <a href={`tel:${selectedItem.kontak}`} className="text-base font-black text-blue-600 hover:underline">{selectedItem.kontak}</a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="pt-6 border-t border-slate-100">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {selectedItem.sosmed && (
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><Globe size={12} /> Sosial Media</p>
                        <span className="text-xs font-bold text-slate-600 break-all">{selectedItem.sosmed}</span>
                      </div>
                    )}
                    {selectedItem.kontak && (
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1.5"><MessageSquare size={12} /> Hubungi Sekarang</p>
                        <a href={`tel:${selectedItem.kontak}`} className="text-xs font-bold text-blue-600 hover:underline">Klik Untuk Menghubungi</a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <section className="relative overflow-hidden bg-slate-900 rounded-[2rem] p-6 md:p-10 shadow-2xl">
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-600/20 rounded-full blur-[80px] -mr-24 -mt-24"></div>
            <div className="relative z-10">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full mb-3 md:mb-5">
                <Handshake size={12} className="text-blue-400" />
                <span className="text-[8px] font-black text-blue-400 uppercase tracking-[0.2em]">Mitra Kesehatan Anda</span>
              </div>
              <h2 className="text-xl md:text-3xl font-black text-white mb-2 md:mb-4 tracking-tight leading-tight">
                Mitra Kesehatan Anda
              </h2>
              <p className="text-slate-300 font-medium text-xs md:text-base max-w-2xl">
                Informasi tenaga kesehatan, fasilitas kesehatan, dan mitra kesehatan lain untuk keluarga Anda.
              </p>
            </div>
          </section>

          <div className="bg-white p-4 md:p-6 rounded-[2rem] shadow-sm border border-slate-100 space-y-4 md:space-y-5">
            <div className="flex flex-wrap gap-1 md:gap-1.5">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3.5 md:px-5 py-1.5 md:py-2.5 rounded-lg md:rounded-xl text-[7px] md:text-[9px] font-black uppercase tracking-widest transition-all ${
                    activeCategory === cat 
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' 
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
              <input 
                type="text"
                placeholder="Cari nama, wilayah, atau spesialis..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-5 py-2.5 md:py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold focus:ring-4 focus:ring-blue-50 transition-all text-[10px] md:text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-2.5 md:gap-4">
            {filteredItems.map((item) => (
              <div 
                key={item.id} 
                onClick={() => setSelectedItem(item)}
                className="bg-white rounded-xl md:rounded-2xl border border-slate-100 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer group flex flex-col h-full"
              >
                <div className="aspect-[4/3] w-full overflow-hidden bg-slate-50">
                  <img 
                    src={item.imageUrl || "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=800"} 
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    alt={item.nama}
                    onError={(e) => { (e.target as any).src = "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=800" }}
                  />
                </div>

                <div className="p-2.5 md:p-3.5 flex flex-col flex-1">
                  <div className="flex flex-col gap-0.5 mb-1.5">
                    <span className="text-[6px] md:text-[7px] font-black uppercase tracking-widest text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md w-fit">
                      {item.subJenis}
                    </span>
                    {item.wilayahKerja && (
                      <span className="text-[7px] md:text-[8px] font-bold text-slate-400 flex items-center gap-0.5 truncate">
                        <MapPin size={7} className="shrink-0" /> {item.wilayahKerja}
                      </span>
                    )}
                  </div>
                  
                  <h3 className="text-[10px] md:text-[11px] font-black text-slate-800 leading-tight mb-1.5 group-hover:text-blue-600 transition-colors line-clamp-2">
                    {item.nama}
                  </h3>

                  {item.campaign && (
                    <p className="text-[7px] md:text-[8px] font-medium text-slate-400 italic line-clamp-1 mt-auto">
                      "{item.campaign}"
                    </p>
                  )}
                  
                  <div className="mt-2.5 pt-2 border-t border-slate-50 flex items-center justify-between text-[7px] md:text-[8px] font-black uppercase tracking-widest text-slate-300 group-hover:text-blue-600 transition-colors">
                    <span>Info</span>
                    <ChevronLeft size={10} className="rotate-180" />
                  </div>
                </div>
              </div>
            ))}

            {filteredItems.length === 0 && (
              <div className="col-span-full py-16 text-center bg-white rounded-[2rem] border-2 border-dashed border-slate-100 flex flex-col items-center">
                <Info size={32} className="text-slate-200 mb-3" />
                <h3 className="text-base font-black text-slate-800">Tidak Ditemukan</h3>
                <p className="text-slate-400 max-w-xs mx-auto mt-1 text-[10px] font-medium">Coba gunakan kata kunci lain atau pastikan data belum kedaluwarsa.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default RecommendationsView;
