
import React from 'react';
import { X } from 'lucide-react';
import { createPortal } from 'react-dom';

interface AdsModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
}

const AdsModal: React.FC<AdsModalProps> = ({ isOpen, onClose, imageUrl }) => {
  if (!isOpen || !imageUrl) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-900/80 backdrop-blur-md animate-fadeIn">
      <div className="relative bg-white rounded-[2.5rem] shadow-2xl animate-scaleIn overflow-hidden max-w-lg w-full aspect-square border-4 border-white">
        {/* Close Button Container - Floating atop the image */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 z-[1001] p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-all backdrop-blur-md shadow-lg"
          aria-label="Close Ad"
        >
          <X size={24} strokeWidth={3} />
        </button>

        {/* Full Image */}
        <img 
          src={imageUrl} 
          alt="Family Records Ad" 
          className="w-full h-full object-cover"
          onError={(e) => {
             // Handle broken image
             onClose();
          }}
        />
      </div>
    </div>,
    document.body
  );
};

export default AdsModal;
