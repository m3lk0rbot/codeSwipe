import React, { useState } from 'react';
import { auth, saveUserSettings } from '../../services/firebase';
import { AcademicCapIcon, BullseyeIcon, CodeBracketSquareIcon, SparklesIcon } from '../icons/Icons';
import type { Difficulty, ProgrammingLanguage } from '../../types';

interface OnboardingModalProps {
  onComplete: () => void;
}

const levels: Difficulty[] = ['Beginner', 'Intermediate', 'Advanced', 'Expert'];
const languages: ProgrammingLanguage[] = ['JavaScript', 'Python', 'Java', 'C++', 'Go', 'Rust', 'TypeScript', 'C#'];
const goals = ['Interview Prep', 'Daily Practice', 'Learn New Language'];

const OptionButton: React.FC<{
    label: string;
    isSelected: boolean;
    onClick: () => void;
    isMultiSelect?: boolean;
}> = ({ label, isSelected, onClick, isMultiSelect = false }) => {
    const baseClasses = "text-center p-4 rounded-lg border-2 w-full transition-all duration-200 cursor-pointer";
    const selectedClasses = "bg-sky-500/20 border-sky-500 text-white font-semibold shadow-lg scale-105";
    const unselectedClasses = "bg-slate-700/50 border-slate-600 text-slate-300 hover:bg-slate-700 hover:border-slate-500";

    return (
        <div onClick={onClick} className={`${baseClasses} ${isSelected ? selectedClasses : unselectedClasses}`}>
            {isMultiSelect && (
                 <div className="flex items-center justify-center mb-2">
                    <div className={`w-5 h-5 rounded-md border-2 ${isSelected ? 'bg-sky-500 border-sky-400' : 'border-slate-500' } flex items-center justify-center`}>
                        {isSelected && <span className="text-white text-xs">✓</span>}
                    </div>
                 </div>
            )}
            {label}
        </div>
    );
};

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [selectedLevel, setSelectedLevel] = useState<Difficulty | null>(null);
  const [selectedLanguages, setSelectedLanguages] = useState<ProgrammingLanguage[]>([]);
  const [selectedGoal, setSelectedGoal] = useState<string | null>(null);

  const handleLanguageToggle = (lang: ProgrammingLanguage) => {
    setSelectedLanguages(prev => 
      prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]
    );
  };
  
  const getStepHeader = () => {
      const headers = [
          { icon: SparklesIcon, title: "Welcome to CodeSwipe! 👋" , subtitle: "Let's quickly personalize your learning journey." },
          { icon: AcademicCapIcon, title: "What's your current skill level?", subtitle: "This helps us find the right starting point for you." },
          { icon: CodeBracketSquareIcon, title: "Pick your favorite languages", subtitle: "You can select one or more. We'll prioritize these." },
          { icon: BullseyeIcon, title: "What's your primary goal?", subtitle: "Knowing your goal helps us tailor challenges for you." },
      ];
      const current = headers[step - 1];
      const Icon = current.icon;
      return (
        <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-2">
                <Icon className="w-8 h-8 text-sky-400" />
                <h2 className="text-2xl font-bold">{current.title}</h2>
            </div>
            <p className="text-slate-400">{current.subtitle}</p>
        </div>
      );
  }

  const renderStepContent = () => {
    switch(step) {
      case 1:
        return <div className="text-center p-8 text-slate-300">Your path to becoming a better coder starts now. Swipe, solve, and learn, one challenge at a time.</div>;
      case 2:
        return (
            <div className="grid grid-cols-2 gap-4">
                {levels.map(level => (
                    <OptionButton key={level} label={level} isSelected={selectedLevel === level} onClick={() => setSelectedLevel(level)} />
                ))}
            </div>
        );
      case 3:
        return (
            <div className="grid grid-cols-3 gap-4">
                {languages.map(lang => (
                     <OptionButton key={lang} label={lang} isSelected={selectedLanguages.includes(lang)} onClick={() => handleLanguageToggle(lang)} isMultiSelect />
                ))}
            </div>
        );
      case 4:
        return (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {goals.map(goal => (
                     <OptionButton key={goal} label={goal} isSelected={selectedGoal === goal} onClick={() => setSelectedGoal(goal)} />
                ))}
            </div>
        );
      default:
        return null;
    }
  };

  const canProceed = () => {
    switch(step) {
      case 1: return true;
      case 2: return selectedLevel !== null;
      case 3: return selectedLanguages.length > 0;
      case 4: return selectedGoal !== null;
      default: return false;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4 animate-fade-in">
      <div className="w-full max-w-2xl mx-auto bg-slate-800 rounded-2xl border border-slate-700 shadow-2xl flex flex-col transform transition-all duration-300 animate-slide-up">
        <div className="p-6 sm:p-8">
          <p className="text-sm font-semibold text-sky-400 text-center mb-4">Step {step}/4</p>
          {getStepHeader()}
          <div className="min-h-[150px] flex items-center justify-center">
            {renderStepContent()}
          </div>
        </div>
        
        <div className="flex items-center justify-between p-4 bg-slate-900/50 border-t border-slate-700 rounded-b-2xl">
          <button 
            onClick={() => setStep(s => s - 1)}
            className={`px-4 py-2 text-sm font-semibold rounded-md transition-all ${step > 1 ? 'text-slate-300 hover:bg-slate-700' : 'text-slate-600 cursor-not-allowed opacity-0'}`}
            disabled={step === 1}
          >
            Back
          </button>

          <button 
            onClick={onComplete}
            className="text-slate-400 hover:text-white text-sm font-semibold transition-colors px-4 py-2"
          >
            Skip for now
          </button>

          {step < 4 ? (
            <button 
                onClick={() => setStep(s => s + 1)} 
                disabled={!canProceed()}
                className="rounded-md bg-sky-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-500 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed"
            >
                Next
            </button>
          ) : (
            <button 
                onClick={async () => {
                    // Save settings if user selected any; else just complete
                    if (auth.currentUser && selectedLevel && selectedLanguages.length > 0 && selectedGoal) {
                        await saveUserSettings(auth.currentUser.uid, {
                            level: selectedLevel,
                            languages: selectedLanguages,
                            topics: [selectedGoal],
                        });
                    }
                    onComplete();
                }} 
                disabled={!canProceed()}
                className="rounded-md bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed"
            >
                Start Swiping! →
            </button>
          )}
        </div>
      </div>
      <style>{`
        @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
        }
        @keyframes slide-up {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
        .animate-slide-up { animation: slide-up 0.4s ease-out forwards; }
      `}</style>
    </div>
  );
};
