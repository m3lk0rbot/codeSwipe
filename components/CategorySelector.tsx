import React from 'react';
import { Challenge, TestResult } from '../types';
import { CodeEditor } from './InterestInput';
import { TestResultsDisplay } from './IdeaCard';
import { PlayIcon } from './icons/Icons';
import { LoadingSpinner } from './LoadingSpinner';
import { ErrorDisplay } from './ErrorDisplay';
import { ActionSidebar } from './ActionSidebar';
import { ChallengeInfoOverlay } from './ChallengeInfoOverlay';

interface ChallengeCardProps {
  challenge: Challenge;
  userCode: string;
  setUserCode: (code: string) => void;
  onRunTests: () => void;
  results: TestResult[];
  isLoading: boolean;
  error: string | null;
  questionId?: string;
  userLanguage?: string;
  userTopics?: string[];
  userLevel?: string;
  currentMode?: 'ai' | 'db';
  onOpenModeSelection?: () => void;
  onGenerateAnswer?: () => void;
  isGeneratingAnswer?: boolean;
}

export const ChallengeCard: React.FC<ChallengeCardProps> = ({
  challenge, userCode, setUserCode, onRunTests, results, isLoading, error, questionId, userLanguage, userTopics, userLevel, currentMode, onOpenModeSelection, onGenerateAnswer, isGeneratingAnswer
}) => {
  const descriptionLengthClass = challenge.description.length > 150 ? 'max-h-[35%]' : 'max-h-[25%]';

  return (
    <div className="w-full h-full mx-auto flex flex-col relative bg-black">
      {/* Main Content - No borders, no background */}
      <div className="flex-grow flex flex-col h-full overflow-hidden">
        {/* Question Section */}
        <div className={`${descriptionLengthClass} overflow-y-auto px-4 pt-4 pb-2 flex-shrink-0`} style={{ marginBottom: '10px' }}>
          <ChallengeInfoOverlay
            title={challenge.title}
            description={challenge.description}
            difficulty={challenge.difficulty}
            language={userLanguage}
            topics={userTopics}
            userLevel={userLevel as any}
            onGenerateAnswer={onGenerateAnswer}
            isGeneratingAnswer={isGeneratingAnswer}
          />
        </div>

        {/* Code Editor Section - Fills remaining space */}
        <div className="h-[50%] px-4 py-2 flex-shrink-0 relative overflow-hidden" style={{marginTop: '10px'}}>
          <CodeEditor
            code={userCode}
            setCode={setUserCode}
            language={challenge.language}
          />
        </div>

        {/* Run Button Section */}
        <div className="px-4 py-2 flex-shrink-0 flex justify-center">
          <button
            onClick={onRunTests}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-red-500 to-pink-600 px-8 py-2.5 text-sm font-bold text-white shadow-lg hover:from-red-600 hover:to-pink-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-400 disabled:cursor-not-allowed transition-all transform hover:scale-[1.02] active:scale-[0.98]"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Running...</span>
              </>
            ) : (
              <>
                <PlayIcon className="w-5 h-5" />
                <span>Run Tests</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Floating Action Buttons - Right Center */}
      <ActionSidebar 
        language={challenge.language} 
        questionId={questionId || challenge.id}
        currentMode={currentMode}
        onOpenModeSelection={onOpenModeSelection}
      />
    </div>
  );
};