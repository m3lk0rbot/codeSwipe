import React from 'react';
import type { Challenge } from '../types';

interface AchievementModalProps {
  isOpen: boolean;
  onClose: () => void;
  challenge: Challenge;
  onContinue: () => void;
}

export default function AchievementModal({
  isOpen,
  onClose,
  challenge,
  onContinue
}: AchievementModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-md w-full">
        {/* Header */}
        <div className="p-6 text-center">
          <div className="mx-auto w-16 h-16 bg-yellow-500 rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-white mb-2">Achievement Unlocked!</h2>
          <p className="text-gray-300 mb-4">You successfully solved a coding challenge!</p>
          
          {/* Challenge Details */}
          <div className="bg-gray-700 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-white mb-2">{challenge.title}</h3>
            <div className="flex items-center justify-center space-x-4 text-sm">
              <span className="bg-blue-600 px-2 py-1 rounded text-white">{challenge.language}</span>
              <span className="bg-yellow-600 px-2 py-1 rounded text-white">{challenge.difficulty}</span>
            </div>
          </div>

          {/* Trophy Animation */}
          <div className="mb-6">
            <div className="animate-bounce">
              🏆
            </div>
            <p className="text-yellow-400 font-medium mt-2">Challenge Completed!</p>
          </div>

          {/* Action Button */}
          <button
            onClick={onContinue}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Continue Coding
          </button>
          
          <button
            onClick={onClose}
            className="w-full mt-2 text-gray-400 hover:text-white transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}