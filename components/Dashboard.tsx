
import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, Pill, TrendingUp, Clock, MapPin, Activity, Filter, Sparkles, ShieldCheck, HeartPulse } from 'lucide-react';
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
import { FamilyMember, Appointment, Medication, MedicalRecord, Language } from '../types';
import { useTranslation } from '../translations';

interface DashboardProps {
  members: FamilyMember[];
  appointments: Appointment[];
  meds: Medication[];
  records?: MedicalRecord[]; 
  language: Language;
  onSwitchMember: (id: string) => void;
  onNavigateToDetail: (tab: string, memberId: string, itemId: string) => void;
  activeMemberId: string;
}

const formatDateUpper = (dateString: string) => {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase();
};

const formatMonthYearUpper = (dateString: string) => {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return dateString;
  return d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' }).toUpperCase();
};

const Dashboard: React.FC<DashboardProps> = ({ 
  members, 
  appointments, 
  meds, 
  records = [],
  language, 
  onSwitchMember, 
  onNavigateToDetail, 
  activeMemberId 
}) => {
  const t = useTranslation(language);
  const [filterMonths, setFilterMonths] = useState<number>(12);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - filterMonths);
    start.setDate(1);
    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    });
  }, [filterMonths]);

  const chartData = useMemo(() => {
    if (!dateRange.start || !dateRange.end) return [];
    const start = new Date(dateRange.start);
    const end = new Date(dateRange.end);
    const months: { label: string; date: Date }[] = [];
    const current = new Date(start);
    current.setDate(1);
    const endMonth = new Date(end);
    endMonth.setDate(1);

    while (current <= endMonth) {
      months.push({
        label: current.toLocaleString('id-ID', { month: 'short', year: '2-digit' }),
        date: new Date(current)
      });
      current.setMonth(current.getMonth() + 1);
    }

    const data = months.map(m => {
      const entry: any = { name: m.label };
      members.forEach(mem => { entry[mem.id] = 0; });
      return entry;
    });

    records.forEach(rec => {
      const recDate = new Date(rec.dateTime);
      if (recDate >= start && recDate <= end) {
        const bucketIndex = months.findIndex(m => 
          m.date.getMonth() === recDate.getMonth() && 
          m.date.getFullYear() === recDate.getFullYear()
        );
        if (bucketIndex !== -1 && data[bucketIndex].hasOwnProperty(rec.memberId)) {
          data[bucketIndex][rec.memberId] += 1;
        }
      }
    });
    return data;
  }, [records, members, dateRange]);

  const sortedAppointments = useMemo(() => {
    const now = new Date();
    return [...appointments]
      .filter(app => new Date(app.dateTime) >= now)
      .sort((a, b) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime())
      .slice(0, 4);
  }, [appointments]);

  const sortedMeds = useMemo(() => {
    return [...meds]
      .filter(m => m.active && m.nextTime)
      .sort((a, b) => new Date(a.nextTime).getTime() - new Date(b.nextTime).getTime())
      .slice(0, 4);
  }, [meds]);

  const getMemberName = (id: string) => members.find(m => m.id === id)?.name || 'Unknown';
  const memberColors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#6366f1'];

  return (
    <div className="space-y-10 animate-fadeIn pb-12">
      <section className="relative overflow-hidden bg-slate-900 rounded-[3rem] p-10 md:p-14 shadow-2xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/20 rounded-full blur-[100px] -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-600/10 rounded-full blur-[80px] -ml-20 -mb-20"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.03] pointer-events-none">
           <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
           </svg>
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center gap-8 lg:gap-16">
          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full mb-6">
               <span className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Family Medical Records</span>
            </div>
            
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-[900] text-white mb-6 tracking-tight leading-tight">
              Selamat Datang!
            </h2>
            
            <div className="max-w-xl">
              <p className="text-slate-300 font-medium text-base md:text-lg leading-relaxed">
                <span className="text-white font-black">Kepanikan</span> adalah separuh penyakit, <span className="text-white font-black">ketenangan</span> adalah separuh obat, dan <span className="text-white font-black">kesabaran</span> adalah awal dari kesembuhan.
              </p>
              <div className="flex items-center gap-3 mt-4 justify-center md:justify-start">
                 <div className="h-[1px] w-8 bg-slate-700"></div>
                 <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Ibnu Sina (Avicenna)</p>
              </div>
            </div>
          </div>

          <div className="w-full md:w-auto flex flex-col items-center shrink-0">
             <div className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 aspect-square rounded-2xl overflow-hidden border border-white shadow-2xl relative group">
                <img 
                  src="https://lh3.googleusercontent.com/d/1CyyE_h6w4kFYtuVrsm39UTYa97OhoKRA" 
                  alt="Client Logo" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
             </div>
          </div>
        </div>
      </section>

      <div className="bg-white p-8 md:p-12 rounded-[3.5rem] shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div className="flex items-center gap-5">
             <div className="p-5 bg-blue-50 text-blue-600 rounded-3xl border border-blue-100 shadow-sm"><TrendingUp size={32} /></div>
             <div>
                <h3 className="font-black text-slate-800 tracking-tight text-2xl">Laporan Aktivitas Medis</h3>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Kunjungan per bulan antar anggota keluarga</p>
             </div>
          </div>
          <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-100 w-full md:w-auto">
             <Filter size={14} className="text-slate-400 ml-4" />
             <select 
               value={filterMonths}
               onChange={(e) => setFilterMonths(Number(e.target.value))}
               className="bg-transparent text-[11px] font-black uppercase text-slate-600 outline-none py-2 px-4 w-full md:w-auto cursor-pointer"
             >
               <option value={6}>6 Bulan Terakhir</option>
               <option value={12}>1 Tahun Terakhir</option>
               <option value={24}>2 Tahun Terakhir</option>
             </select>
          </div>
        </div>
        
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" fontSize={11} tickMargin={15} stroke="#cbd5e1" axisLine={false} tickLine={false} fontWeight={700} />
              <YAxis fontSize={11} stroke="#cbd5e1" axisLine={false} tickLine={false} fontWeight={700} allowDecimals={false} />
              <Tooltip 
                contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 20px 50px -10px rgba(0,0,0,0.12)', padding: '24px' }}
                itemStyle={{ fontSize: '13px', fontWeight: 'bold' }}
                labelStyle={{ marginBottom: '12px', color: '#64748b', fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.15em' }}
              />
              <Legend iconType="circle" wrapperStyle={{ paddingTop: '40px', fontSize: '12px', fontWeight: '700' }} />
              {members.map((member, index) => (
                <Line 
                  key={member.id}
                  type="monotone" 
                  dataKey={member.id} 
                  name={member.name}
                  stroke={memberColors[index % memberColors.length]} 
                  strokeWidth={5} 
                  dot={{ r: 6, strokeWidth: 3, fill: '#fff' }} 
                  activeDot={{ r: 10, strokeWidth: 0 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        <div className="bg-white p-8 md:p-12 rounded-[3.5rem] shadow-sm border border-slate-100 flex flex-col h-full transition-shadow hover:shadow-lg">
          <div className="flex items-center gap-4 mb-10">
            <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl shadow-inner"><Calendar size={28} /></div>
            <h3 className="font-black text-slate-800 tracking-tight text-xl">{t.nextCheckups}</h3>
          </div>
          <div className="space-y-6 flex-1">
            {sortedAppointments.length > 0 ? sortedAppointments.map(app => (
              <div 
                key={app.id} 
                onClick={() => onNavigateToDetail('schedule', app.memberId, app.id)}
                className="flex gap-6 p-6 rounded-[2.5rem] bg-slate-50/50 border border-slate-100 hover:bg-white hover:border-indigo-100 hover:shadow-xl transition-all cursor-pointer group"
              >
                <div className="w-16 h-16 shrink-0 bg-indigo-600 rounded-[1.5rem] flex flex-col items-center justify-center text-white shadow-lg transition-transform group-hover:scale-110">
                  <span className="text-[7px] font-black uppercase tracking-widest mb-1">{formatMonthYearUpper(app.dateTime)}</span>
                  <span className="text-2xl font-black leading-none">{new Date(app.dateTime).getDate()}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">{getMemberName(app.memberId)}</p>
                  <h4 className="font-black text-slate-800 text-base line-clamp-1 group-hover:text-indigo-600 transition-colors">{app.title}</h4>
                  <div className="flex items-center gap-5 mt-2 opacity-60">
                     <div className="flex items-center gap-2 font-bold"><Clock size={12} /><span className="text-[11px]">{new Date(app.dateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit', hour12: false})}</span></div>
                     <div className="flex items-center gap-2 font-bold truncate"><MapPin size={12} /><span className="text-[11px] truncate">{app.location}</span></div>
                  </div>
                </div>
              </div>
            )) : <NoDataMessage text={t.noAppointments} />}
          </div>
        </div>

        <div className="bg-white p-8 md:p-12 rounded-[3.5rem] shadow-sm border border-slate-100 flex flex-col h-full transition-shadow hover:shadow-lg">
          <div className="flex items-center gap-4 mb-10">
            <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl shadow-inner"><Pill size={28} /></div>
            <h3 className="font-black text-slate-800 tracking-tight text-xl">{t.medReminders}</h3>
          </div>
          <div className="space-y-6 flex-1">
            {sortedMeds.length > 0 ? sortedMeds.map(med => (
              <div 
                key={med.id} 
                onClick={() => onNavigateToDetail('meds', med.memberId, med.id)}
                className="p-8 rounded-[2.5rem] bg-amber-50/50 border border-amber-100 hover:bg-white hover:border-amber-200 hover:shadow-xl transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-4">
                   <div>
                     <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-1">{getMemberName(med.memberId)}</p>
                     <h4 className="font-black text-slate-800 text-lg group-hover:text-amber-600 transition-colors">{med.name}</h4>
                   </div>
                   <span className="text-[9px] font-black bg-amber-600 text-white px-4 py-1.5 rounded-full uppercase shadow-sm">{med.dosage}</span>
                </div>
                <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
                   <Clock size={16} className="text-amber-500" />
                   <span>{formatDateUpper(med.nextTime)} • {new Date(med.nextTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', hour12: false})}</span>
                </div>
              </div>
            )) : <NoDataMessage text={t.noMeds} />}
          </div>
        </div>
      </div>
    </div>
  );
};

const NoDataMessage = ({ text }: { text: string }) => (
  <div className="py-20 text-center bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200 flex flex-col items-center">
     <Clock size={48} className="text-slate-200 mb-5" />
     <p className="text-slate-400 text-xs font-black uppercase tracking-widest">{text}</p>
  </div>
);

export default Dashboard;
