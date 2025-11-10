import React from 'react';
import { Difficulty } from '../types';
import { UserSettingsDisplay } from './UserSettingsDisplay';
import { SparklesIcon } from './icons/Icons';

interface ChallengeInfoOverlayProps {
  title: string;
  description: string;
  difficulty: Difficulty;
  language?: string;
  topics?: string[];
  userLevel?: Difficulty;
  onGenerateAnswer?: () => void;
  isGeneratingAnswer?: boolean;
}

const difficultyColorMap = {
  Beginner: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  Intermediate: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  Advanced: 'bg-red-500/20 text-red-400 border-red-500/30',
  Expert: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
};

export const ChallengeInfoOverlay: React.FC<ChallengeInfoOverlayProps> = ({ 
  title, 
  description, 
  difficulty, 
  language, 
  topics, 
  userLevel,
  onGenerateAnswer,
  isGeneratingAnswer = false
}) => {
  // Display user's level if available, otherwise fall back to challenge difficulty
  const displayLevel = userLevel || difficulty;
  
  return (
    <div className="w-full">
        <div className="flex items-center gap-3">
             <h2 className="text-2xl font-bold text-white drop-shadow-lg">{title}</h2>
             <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium border ${difficultyColorMap[displayLevel]}`}>
                {displayLevel}
            </span>
            {onGenerateAnswer && (
              <button
                onClick={onGenerateAnswer}
                disabled={isGeneratingAnswer}
                className="w-8 h-8 rounded-full bg-sky-600 hover:bg-sky-500 
                           disabled:bg-gray-600 disabled:cursor-not-allowed
                           flex items-center justify-center transition-colors
                           shadow-lg hover:shadow-sky-500/50"
                aria-label="Generate answer"
              >
                {isGeneratingAnswer ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <SparklesIcon className="w-5 h-5 text-white" />
                )}
              </button>
            )}
        </div>
        <p className="mt-2 text-slate-200 text-sm drop-shadow-md">
            {description}
        </p>
    </div>
  );
};