
import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen, onClose, onConfirm, title, message, 
  confirmText = "Ya, Hapus", cancelText = "Batal", isDanger = true
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl animate-scaleIn flex flex-col items-center text-center border-4 border-white relative overflow-hidden">
        <div className={`w-20 h-20 rounded-full flex items-center justify-center mb-6 shadow-sm border ${isDanger ? 'bg-rose-50 text-rose-500 border-rose-100' : 'bg-blue-50 text-blue-500 border-blue-100'}`}>
          <AlertTriangle size={36} strokeWidth={2.5} />
        </div>
        <h3 className="text-xl font-black text-slate-800 mb-2 leading-tight">{title}</h3>
        <p className="text-xs font-bold text-slate-400 mb-8 leading-relaxed max-w-[80%]">{message}</p>
        <div className="flex gap-3 w-full">
          <button onClick={onClose} className="flex-1 py-4 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest transition-all">
            {cancelText}
          </button>
          <button onClick={() => { onConfirm(); onClose(); }} className={`flex-1 py-4 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all ${isDanger ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'}`}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmationModal;
