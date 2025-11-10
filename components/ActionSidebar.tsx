import React, { useState, useEffect } from 'react';
import { ProgrammingLanguage } from '../types';
import { HeartIcon, ShareIcon, LightBulbIcon } from './icons/Icons';
import { toggleQuestionLike, hasUserLikedQuestion } from '../services/likesService';
import { auth } from '../services/firebase';

interface ActionSidebarProps {
  language: ProgrammingLanguage;
  questionId: string;
  currentMode?: 'ai' | 'db';
  onOpenModeSelection?: () => void;
}

const getLanguageStyle = (lang: ProgrammingLanguage): { abbr: string; className: string } => {
  switch (lang) {
    case 'JavaScript':
      return { abbr: 'JS', className: 'bg-yellow-400 text-slate-900' };
    case 'Python':
      return { abbr: 'Py', className: 'bg-blue-500 text-white' };
    case 'Go':
      return { abbr: 'Go', className: 'bg-cyan-400 text-slate-900' };
    default:
      return { abbr: 'C', className: 'bg-slate-500 text-white' };
  }
};

const ActionButton: React.FC<{ label: string; children: React.ReactNode; onClick?: () => void }> = ({ label, children, onClick }) => (
  <button onClick={onClick} className="flex flex-col items-center gap-1 group">
    <div className="w-10 h-10 rounded-full bg-slate-800/70 flex items-center justify-center group-hover:bg-slate-700/90 transition-all duration-200 transform group-hover:scale-110 shadow-lg backdrop-blur-sm">
      {children}
    </div>
    <span className="text-[10px] font-medium text-slate-400">{label}</span>
  </button>
);


export const ActionSidebar: React.FC<ActionSidebarProps> = ({ language, questionId, currentMode, onOpenModeSelection }) => {
  const { abbr, className } = getLanguageStyle(language);
  const [isLiked, setIsLiked] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  // Check if question is already liked
  useEffect(() => {
    const checkLikeStatus = async () => {
      if (!auth.currentUser || !questionId) return;

      try {
        const liked = await hasUserLikedQuestion(auth.currentUser.uid, questionId);
        setIsLiked(liked);
      } catch (error) {
        console.error('Error checking like status:', error);
      }
    };

    checkLikeStatus();
  }, [questionId]);

  const handleLike = async () => {
    if (!auth.currentUser || !questionId || isLiking) return;

    setIsLiking(true);
    try {
      const newLikeStatus = await toggleQuestionLike(auth.currentUser.uid, questionId);
      setIsLiked(newLikeStatus);
    } catch (error) {
      console.error('Error toggling like:', error);
    } finally {
      setIsLiking(false);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: 'Code Swipe Challenge',
      text: 'Check out this coding challenge on Code Swipe!',
      url: window.location.href,
    };

    // Try native share API first (mobile-friendly)
    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
        console.log('✅ Shared successfully via native share');
      } catch (error: any) {
        // User cancelled or error occurred
        if (error.name !== 'AbortError') {
          console.error('Share failed:', error);
          // Show fallback menu on error
          setShowShareMenu(true);
        }
      }
    } else {
      // Fallback for desktop browsers
      setShowShareMenu(true);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert('Link copied to clipboard!');
      setShowShareMenu(false);
    } catch (error) {
      console.error('Failed to copy link:', error);
      alert('Failed to copy link. Please copy manually.');
    }
  };

  const getModeIcon = () => {
    return currentMode === 'ai' ? '✨' : '💾';
  };

  return (
    <>
      <div className="absolute right-[0.1rem] top-1/2 -translate-y-1/2 z-10 flex flex-col items-center gap-3">
        {/* Language Badge */}
        <div className="flex flex-col items-center gap-1 group cursor-pointer">
          <div className={`relative w-11 h-11 rounded-full flex items-center justify-center font-bold text-base border-2 border-white/40 shadow-lg transition-transform transform group-hover:scale-110 ${className}`}>
            {abbr}
          </div>
        </div>

        {/* Like Button */}
        <ActionButton label="Like" onClick={handleLike}>
          <HeartIcon
            className={`w-5 h-5 drop-shadow-lg transition-colors ${isLiked ? 'text-red-500' : 'text-white'
              } ${isLiking ? 'animate-pulse' : ''}`}
          />
        </ActionButton>

        {/* Share Button */}
        <ActionButton label="Share" onClick={handleShare}>
          <ShareIcon className="w-5 h-5 text-white drop-shadow-lg" />
        </ActionButton>

        {/* Mode Selector Button */}
        {onOpenModeSelection && (
          <button onClick={onOpenModeSelection} className="flex flex-col items-center gap-1 group">
            <div className="w-10 h-10 rounded-full bg-slate-800/70 flex items-center justify-center group-hover:bg-slate-700/90 transition-all duration-200 transform group-hover:scale-110 shadow-lg backdrop-blur-sm">
              <span className="text-lg">{getModeIcon()}</span>
            </div>
            <span className="text-[10px] font-medium text-slate-400">Mode</span>
          </button>
        )}
      </div>

      {/* Share Menu Modal (Fallback for Desktop) */}
      {showShareMenu && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center"
          onClick={() => setShowShareMenu(false)}
        >
          <div 
            className="bg-slate-800 rounded-t-2xl md:rounded-2xl p-6 w-full max-w-md animate-slideInUp"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-white font-bold text-lg mb-4">Share Challenge</h3>
            <div className="space-y-3">
              <a 
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent('Check out this coding challenge on Code Swipe!')}&url=${encodeURIComponent(window.location.href)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              >
                <span className="text-2xl">🐦</span>
                <span className="text-white">Share on Twitter</span>
              </a>
              <a 
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(window.location.href)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              >
                <span className="text-2xl">💼</span>
                <span className="text-white">Share on LinkedIn</span>
              </a>
              <a 
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
              >
                <span className="text-2xl">📘</span>
                <span className="text-white">Share on Facebook</span>
              </a>
              <button 
                onClick={handleCopyLink}
                className="flex items-center gap-3 p-3 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors w-full text-left"
              >
                <span className="text-2xl">🔗</span>
                <span className="text-white">Copy Link</span>
              </button>
            </div>
            <button 
              onClick={() => setShowShareMenu(false)}
              className="mt-4 w-full p-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
};