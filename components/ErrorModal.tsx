import React from 'react';

interface ErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  error: string;
}

export const ErrorModal: React.FC<ErrorModalProps> = ({ isOpen, onClose, error }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
      <div className="bg-slate-900 rounded-2xl shadow-2xl max-w-md w-full border border-red-500/30 animate-fadeIn">
        {/* Header */}
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Error Occurred</h3>
              <p className="text-sm text-slate-400">Something went wrong</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
            <p className="text-red-400 text-sm font-mono break-words">{error}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-red-500 hover:bg-red-600 text-white font-semibold rounded-full transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};