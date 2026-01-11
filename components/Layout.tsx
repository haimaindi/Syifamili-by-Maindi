
import React, { useState } from 'react';
import { 
  Activity, 
  Users, 
  Calendar, 
  Pill, 
  Baby, 
  Heart, 
  FileText, 
  Menu,
  X,
  RefreshCw,
  CheckCircle2,
  Image as ImageIcon,
  PhoneCall,
  Home,
  RotateCw,
  Calculator,
  Grid,
  Loader2,
  Handshake
} from 'lucide-react';
import { Language } from '../types';
import { useTranslation } from '../translations';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  language: Language;
  syncStatus?: { isSyncing: boolean; lastSync: Date | null };
  onManualFetch?: () => void;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, 
  activeTab, 
  setActiveTab, 
  language, 
  syncStatus, 
  onManualFetch
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loadingLink, setLoadingLink] = useState(false);
  const t = useTranslation(language);

  const navItems = [
    { id: 'dashboard', label: t.dashboard, icon: Activity },
    { id: 'recommendations', label: 'Mitra Kesehatan', icon: Handshake },
    { id: 'members', label: t.members, icon: Users },
    { id: 'records', label: t.records, icon: FileText },
    { id: 'homecare', label: t.homeCare, icon: Home },
    { id: 'meds', label: t.meds, icon: Pill },
    { id: 'kids', label: t.kids, icon: Baby },
    { id: 'elderly', label: t.elderly, icon: Heart },
    { id: 'schedule', label: t.schedule, icon: Calendar },
    { id: 'vault', label: t.vault, icon: ImageIcon },
    { id: 'calculators', label: t.calculators, icon: Calculator },
    { id: 'contacts', label: t.contacts, icon: PhoneCall },
  ];

  const handleMoreAppsClick = async () => {
    setLoadingLink(true);
    try {
      const sheetId = '1HYNx5hJn_0uM3aKlrjfaeTFYkkUDune6rdUuTxWfOQg';
      const sheetName = 'More Apps from Maindi';
      const cell = 'A1';
      const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(sheetName)}&range=${cell}`;

      const response = await fetch(url);
      if (!response.ok) throw new Error('Network response was not ok');
      
      const text = await response.text();
      const cleanUrl = text.replace(/"/g, '').trim();
      
      if (cleanUrl && cleanUrl.startsWith('http')) {
        window.open(cleanUrl, '_blank');
      } else {
        alert('Tautan tidak valid atau tidak ditemukan dalam spreadsheet.');
      }
    } catch (error) {
      console.error('Failed to fetch Maindi Apps link:', error);
      alert('Gagal mengambil tautan layanan. Pastikan Anda terhubung ke internet.');
    } finally {
      setLoadingLink(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden relative">
      <button 
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="lg:hidden fixed bottom-8 right-8 z-[100] bg-blue-600 text-white p-4 rounded-full shadow-2xl scale-110 active:scale-95 transition-all flex items-center justify-center border-4 border-white"
      >
        {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90] lg:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-[95] w-72 bg-white border-r border-slate-200 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          <div className="py-10 px-4 flex items-center justify-center gap-3">
            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-slate-100 shadow-md shrink-0">
              <img 
                src="https://lh3.googleusercontent.com/d/1DrGOVDFdXv24Ac2z2t49pZUH-evReTxV" 
                alt="App Icon" 
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 h-16 flex items-center overflow-hidden">
              <img 
                src="https://lh3.googleusercontent.com/d/18mOaOLYnOPdnHXZYoAJ6juWonHvtWqx1" 
                alt="Syifamili Logo" 
                className="w-full h-full object-contain object-center"
              />
            </div>
          </div>

          <nav className="flex-1 px-4 space-y-1 overflow-y-auto scrollbar-hide">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsSidebarOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200
                  ${activeTab === item.id 
                    ? 'bg-blue-600 text-white font-semibold shadow-lg shadow-blue-100' 
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'}
                `}
              >
                <item.icon size={20} />
                <span className="text-sm font-semibold">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-100 bg-slate-50/30">
            <button
              onClick={handleMoreAppsClick}
              disabled={loadingLink}
              className="w-full bg-slate-800 hover:bg-slate-900 text-white p-4 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition-all shadow-md group active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-center gap-2">
                {loadingLink ? (
                  <Loader2 size={16} className="animate-spin text-slate-400" />
                ) : (
                  <Grid size={16} className="text-blue-300 group-hover:text-white transition-colors" />
                )}
                <span className="text-[10px] font-black uppercase tracking-widest">
                  {loadingLink ? 'Memuat...' : 'More Apps/Services'}
                </span>
              </div>
              {!loadingLink && (
                <span className="text-[8px] font-bold text-slate-400 group-hover:text-slate-300 transition-colors tracking-[0.15em] uppercase">
                  from Maindi
                </span>
              )}
            </button>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shrink-0">
          <h2 className="text-lg font-bold text-slate-800 capitalize tracking-tight">
            {navItems.find(i => i.id === activeTab)?.label || activeTab}
          </h2>

          <div className="flex items-center gap-2">
            {syncStatus && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-xl border border-slate-100">
                {syncStatus.isSyncing ? (
                  <RefreshCw size={12} className="text-blue-500 animate-spin" />
                ) : (
                  <CheckCircle2 size={12} className="text-emerald-500" />
                )}
                <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                  {syncStatus.isSyncing ? t.syncing : 'Synced'}
                </span>
              </div>
            )}
            
            <div className="flex items-center bg-slate-100 rounded-xl p-1 border border-slate-200">
              <button 
                onClick={onManualFetch}
                className="p-2 text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg transition-all group"
                title="Refresh from Cloud"
              >
                <RotateCw size={18} className="group-active:rotate-180 transition-transform duration-500" />
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-4 lg:p-8 scrollbar-hide bg-slate-50/50">
          <div className="max-w-6xl mx-auto space-y-8 pb-12">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
