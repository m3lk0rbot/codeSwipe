import React from 'react';
import { XMarkIcon } from '../icons/Icons';

interface ModalWrapperProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export const ModalWrapper: React.FC<ModalWrapperProps> = ({ title, onClose, children }) => {
  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div 
        className="w-full max-w-2xl bg-slate-800 rounded-xl border border-slate-700 shadow-2xl flex flex-col max-h-[85vh]"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700 shrink-0">
          <h2 className="text-xl font-bold text-white">{title}</h2>
          <button 
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
            aria-label="Close modal"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};
