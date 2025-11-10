import React from 'react';

interface LoadingModalProps {
  isOpen: boolean;
}

export const LoadingModal: React.FC<LoadingModalProps> = ({ isOpen }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-slate-800/90 rounded-2xl shadow-2xl p-8 border border-slate-700">
        <div className="flex flex-col items-center gap-4">
          {/* Spinner */}
          <div className="w-16 h-16 border-4 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
          {/* No text - just spinner */}
        </div>
      </div>
    </div>
  );
};