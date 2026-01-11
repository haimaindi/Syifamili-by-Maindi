
import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, Plus, Clock, MapPin, User, Trash2, X, BellRing, Edit2, Eye, Info, ChevronLeft, Users, ChevronDown, Search } from 'lucide-react';
import { FamilyMember, Appointment } from '../types';

interface ScheduleViewProps {
  member: FamilyMember;
  allMembers: FamilyMember[];
  onSwitchMember: (id: string) => void;
  appointments: Appointment[];
  onAddAppointment: (app: Appointment) => void;
  onUpdateAppointment: (app: Appointment) => void;
  onDeleteAppointment: (id: string) => void;
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

const formatMonthYearUpper = (dateString: string) => {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }).toUpperCase();
};

const ScheduleView: React.FC<ScheduleViewProps> = ({ member, allMembers, onSwitchMember, appointments, onAddAppointment, onUpdateAppointment, onDeleteAppointment, initialOpenId }) => {
  const [viewMode, setViewMode] = useState<'list' | 'form' | 'detail'>('list');
  const [editingApp, setEditingApp] = useState<Appointment | null>(null);
  const [viewingApp, setViewingApp] = useState<Appointment | null>(null);
  const [showMemberSelector, setShowMemberSelector] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const getCurrentLocalDateTime = () => {
    const now = new Date();
    const tzOffset = now.getTimezoneOffset() * 60000; 
    return new Date(now.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  useEffect(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    if (initialOpenId) {
      const target = appointments.find(a => a.id === initialOpenId);
      if (target) {
        setViewingApp(target);
        setViewMode('detail');
      }
    }
  }, [initialOpenId, appointments]);

  const handleOpenForm = (app?: Appointment) => {
    setEditingApp(app || null);
    setViewMode('form');
  };

  const handleOpenDetail = (app: Appointment) => {
    setViewingApp(app);
    setViewMode('detail');
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const appData: Appointment = {
      id: editingApp?.id || Math.random().toString(36).substr(2, 9),
      memberId: member.id,
      title: formData.get('title') as string,
      dateTime: formData.get('datetime') as string,
      doctor: formData.get('doctor') as string,
      location: formData.get('location') as string,
      reminded: false
    };
    if (editingApp) onUpdateAppointment(appData);
    else onAddAppointment(appData);
    setViewMode('list');
  };

  const sortedAppointments = useMemo(() => {
    return [...appointments]
      .filter(app => 
        app.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.doctor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.location.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
  }, [appointments, searchTerm]);

  if (viewMode === 'form') {
    return (
      <div className="animate-fadeIn w-full">
        <div className="flex items-center gap-4 mb-8">
           <button onClick={() => setViewMode('list')} className="p-3 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors">
              <ChevronLeft size={24} className="text-slate-600" />
           </button>
           <h2 className="text-2xl font-black text-slate-800 tracking-tight">{editingApp ? 'Ubah Jadwal' : 'Buat Jadwal Baru'}</h2>
        </div>

        <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-100">
            <form onSubmit={handleSave} className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Tujuan / Keluhan Utama</label>
                <input name="title" defaultValue={editingApp?.title} required className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 font-bold" placeholder="Mis: Cek Jantung, Vaksin" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Waktu & Tanggal</label>
                <input name="datetime" type="datetime-local" defaultValue={editingApp?.dateTime || getCurrentLocalDateTime()} required className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 font-bold" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Dokter / Tenaga Kesehatan</label>
                <input name="doctor" defaultValue={editingApp?.doctor} required className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 font-bold" placeholder="dr. Robert Fox" />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Fasilitas Kesehatan</label>
                <input name="location" defaultValue={editingApp?.location} required className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-100 font-bold" placeholder="RS Medika" />
              </div>
              <div className="flex gap-4 mt-8">
                <button type="button" onClick={() => setViewMode('list')} className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-200 transition-all">Batal</button>
                <button type="submit" className="flex-1 py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all">Simpan Jadwal</button>
              </div>
            </form>
        </div>
      </div>
    );
  }

  if (viewMode === 'detail' && viewingApp) {
    return (
      <div className="animate-fadeIn w-full space-y-8">
        <div className="flex items-center gap-4">
           <button onClick={() => setViewMode('list')} className="p-3 bg-white border border-slate-200 rounded-full hover:bg-slate-50 transition-colors">
              <ChevronLeft size={24} className="text-slate-600" />
           </button>
           <h2 className="text-2xl font-black text-slate-800 tracking-tight">Detail Jadwal</h2>
        </div>

        <div className="bg-white rounded-[3.5rem] p-10 shadow-sm border border-slate-100 relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-32 bg-indigo-600"></div>
            
            <div className="relative pt-12 flex flex-col items-center text-center">
                <div className="w-32 h-32 rounded-3xl bg-white border-8 border-white shadow-2xl flex flex-col items-center justify-center text-indigo-600 mb-8">
                    <span className="text-sm font-black uppercase">{formatMonthYearUpper(viewingApp.dateTime)}</span>
                    <span className="text-5xl font-black">{new Date(viewingApp.dateTime).getDate()}</span>
                </div>
                
                <h3 className="text-3xl font-black text-slate-800 leading-tight mb-3">{viewingApp.title}</h3>
                <div className="flex items-center gap-2 px-6 py-2 bg-indigo-50 text-indigo-600 rounded-full text-xs font-black uppercase tracking-widest mb-10">
                    <Clock size={14} /> {formatDateTimeUpper(viewingApp.dateTime)}
                </div>

                <div className="w-full space-y-4 text-left">
                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-4">
                        <div className="p-3 bg-white rounded-xl text-slate-400 shadow-sm"><User size={20} /></div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Dokter / Tenaga Kesehatan</p>
                            <p className="text-base font-black text-slate-800">{viewingApp.doctor}</p>
                        </div>
                    </div>
                    <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 flex items-start gap-4">
                        <div className="p-3 bg-white rounded-xl text-slate-400 shadow-sm"><MapPin size={20} /></div>
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Lokasi</p>
                            <p className="text-base font-black text-slate-800">{viewingApp.location}</p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4 w-full mt-10">
                   <button onClick={() => handleOpenForm(viewingApp)} className="flex-1 py-5 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">Ubah</button>
                   <button onClick={() => { if(confirm('Hapus jadwal ini?')) { onDeleteAppointment(viewingApp.id); setViewMode('list'); } }} className="flex-1 py-5 bg-red-50 text-red-500 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-red-100 transition-all">Hapus</button>
                </div>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
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
              <h2 className="text-xl md:text-2xl font-black text-slate-800 leading-tight">Jadwal Kontrol</h2>
              <div className="flex items-center gap-2 cursor-pointer group" onClick={() => setShowMemberSelector(true)}>
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">{member.name}</p>
                <ChevronDown size={14} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
              </div>
           </div>
        </div>

        <button onClick={() => handleOpenForm()} className="w-full md:w-auto bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all active:scale-95">
          <Plus size={20} /> Jadwal Baru
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

      <div className="relative">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
        <input 
          type="text" 
          placeholder="Cari jadwal, dokter, atau fasilitas..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-14 pr-6 py-4 bg-white border border-slate-100 rounded-[2rem] shadow-sm outline-none font-medium focus:ring-4 focus:ring-blue-50 transition-all text-sm" 
        />
      </div>

      <div className="space-y-4">
        {sortedAppointments.length > 0 ? sortedAppointments.map(app => (
          <div key={app.id} onClick={() => handleOpenDetail(app)} className="bg-white p-7 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col sm:flex-row gap-6 hover:shadow-xl hover:border-indigo-100 transition-all group relative overflow-hidden cursor-pointer">
            <div className="w-20 h-20 shrink-0 bg-indigo-50 rounded-[1.5rem] flex flex-col items-center justify-center text-indigo-600 border border-indigo-100 shadow-sm">
              <span className="text-[6px] font-black uppercase tracking-widest opacity-60 text-center leading-tight">{formatMonthYearUpper(app.dateTime)}</span>
              <span className="text-3xl font-black leading-none mt-1">{new Date(app.dateTime).getDate()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2 mb-3">
                <h4 className="text-xl font-black text-slate-800 leading-tight">{app.title}</h4>
                <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                   <button onClick={(e) => { e.stopPropagation(); handleOpenForm(app); }} className="p-2.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Edit2 size={18} /></button>
                   <button onClick={(e) => { e.stopPropagation(); if(confirm('Hapus?')) onDeleteAppointment(app.id); }} className="p-2.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><Trash2 size={18} /></button>
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50/50 px-3 py-1.5 rounded-xl border border-indigo-100">
                  <Clock size={14} /> {formatDateTimeUpper(app.dateTime)}
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><User size={14} className="text-slate-400" /> {app.doctor}</div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><MapPin size={14} className="text-slate-400" /> {app.location}</div>
              </div>
            </div>
          </div>
        )) : (
          <div className="bg-white border-2 border-dashed border-slate-100 rounded-[4rem] p-24 text-center">
            <Calendar size={64} className="mx-auto mb-6 text-slate-100" />
            <h3 className="text-xl font-black text-slate-800">Tidak Ada Jadwal</h3>
            <p className="text-slate-400 max-w-xs mx-auto mt-2 font-medium">Belum ada agenda pemeriksaan medis mendatang.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ScheduleView;
