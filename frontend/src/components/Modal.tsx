import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />
      <div className="relative z-50 w-full max-w-md transform overflow-hidden rounded-3xl bg-white p-6 text-left align-middle shadow-2xl transition-all border animate-in fade-in zoom-in-95 duration-200">
        {title && (
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold tracking-tight text-slate-900">{title}</h3>
            <button 
              onClick={onClose}
              className="rounded-full p-1.5 hover:bg-slate-100 text-slate-500 transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        )}
        <div className="text-slate-600">
          {children}
        </div>
      </div>
    </div>
  );
}
