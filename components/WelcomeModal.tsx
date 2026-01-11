
import React from 'react';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';

interface WelcomeModalProps {
  onAgree: () => void;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ onAgree }) => {
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 md:p-8 bg-slate-900/90 backdrop-blur-xl">
      <div className="bg-white rounded-[3.5rem] w-full max-w-xl max-h-[90vh] shadow-2xl animate-scaleIn flex flex-col relative overflow-hidden border border-slate-100">
        <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 z-20"></div>
        
        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto p-10 md:p-14 scrollbar-hide">
          <div className="flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-slate-50 shadow-xl mb-8 shrink-0">
              <img 
                src="https://lh3.googleusercontent.com/d/1GCbiWaJ9RhpMZcUTE2D-idHjc_3UcLmb" 
                alt="Syifamili Logo" 
                className="w-full h-full object-cover"
              />
            </div>

            <h2 className="text-xl font-black text-slate-800 mb-6 leading-tight">
              Terimakasih telah menggunakan <span className="text-blue-600">Syifamili by Maindi</span> sebagai aplikasi Family Record keluarga Anda
            </h2>

            <div className="bg-blue-50/50 p-6 rounded-[2rem] border border-blue-100 mb-8 w-full">
              <p className="text-sm font-bold text-blue-800 leading-relaxed">
                Aplikasi ini hanya boleh dipakai oleh pembeli akses aplikasi resmi dari Maindi.
              </p>
            </div>

            <div className="space-y-6 text-left w-full">
              <div className="flex items-center gap-3 text-rose-600">
                <ShieldAlert size={24} />
                <h3 className="text-lg font-black uppercase tracking-widest">Larangan Keras</h3>
              </div>
              
              <div className="space-y-4">
                <p className="text-sm text-slate-600 leading-relaxed font-medium">
                  Anda dilarang menduplikasi/mengimitasi aplikasi atau memperjualbelikan kembali karena dalam pengembangan logika serta intelektual aplikasi membutuhkan tenaga, waktu, pikiran dan sumber daya lain dari tim Maindi.
                </p>
                
                <div className="p-6 bg-rose-50 rounded-[2.5rem] border border-rose-100 italic">
                  <p className="text-sm text-rose-800 font-bold leading-relaxed">
                    "Sehingga jika Anda melanggarnya, maka Anda sepakat untuk dimintai kompensasi di akhirat kelak berupa pahala Anda akan diberikan kepada tim Maindi hingga menutup seluruh dosa tim Maindi, jika tidak cukup maka dosa tim Maindi akan dipindahkan kepada Anda."
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-10 w-full">
              <button 
                onClick={onAgree}
                className="w-full py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] flex items-center justify-center gap-3 shadow-2xl hover:bg-blue-600 transition-all active:scale-95 group"
              >
                Saya Setuju
                <CheckCircle2 size={18} className="group-hover:scale-125 transition-transform" />
              </button>
              <p className="mt-4 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-relaxed">
                Dengan menekan tombol ini, Anda menyatakan mengerti dan menyetujui seluruh isi peringatan di atas.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal;
