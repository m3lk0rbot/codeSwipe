import React, { useState, useEffect } from 'react';
import { auth, signOut } from '../services/firebase';
import { getUserStats } from '../services/achievementService';
import { getUserLikedQuestionsWithDetails, getUserLikes } from '../services/likesService';
import { UserCircleIcon, TrophyIcon, CodeBracketSquareIcon } from './icons/Icons';
import type { User } from '../services/firebase';

interface UserStats {
  totalSolved: number;
  byDifficulty: {
    Beginner: number;
    Intermediate: number;
    Advanced: number;
    Expert: number;
  };
  byLanguage: Record<string, number>;
  recentSolves: any[];
  totalLikes: number;
  userLevel: string;
  ranking: number;
}

export const ProfilePage: React.FC<{ user: User }> = ({ user }) => {
  const [stats, setStats] = useState<UserStats | null>(null);
  const [likedQuestions, setLikedQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadUserStats();
  }, []);

  const loadUserStats = async () => {
    if (!auth.currentUser) return;
    
    setLoading(true);
    setError(null);
    try {
      const [userStats, likes, likedQuestionsData] = await Promise.all([
        getUserStats(auth.currentUser.uid),
        getUserLikes(auth.currentUser.uid),
        getUserLikedQuestionsWithDetails(auth.currentUser.uid)
      ]);
      
      // Calculate user level based on problems solved
      const level = userStats.totalSolved < 5 ? 'Beginner' :
                    userStats.totalSolved < 15 ? 'Intermediate' :
                    userStats.totalSolved < 30 ? 'Advanced' : 'Expert';
      
      // Calculate ranking (simplified - based on total solved)
      const ranking = Math.max(1, 100 - userStats.totalSolved);
      
      setStats({
        ...userStats,
        totalLikes: likes.length,
        userLevel: level,
        ranking: ranking
      });
      
      setLikedQuestions(likedQuestionsData);
    } catch (e: any) {
      console.error('Failed to load user stats:', e);
      setError(e.message || 'Failed to load profile data');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const getLanguageColor = (language: string) => {
    const colors: { [key: string]: string } = {
      'javascript': 'bg-yellow-500',
      'python': 'bg-blue-500',
      'java': 'bg-red-500',
      'go': 'bg-cyan-500',
      'typescript': 'bg-blue-600',
      'c++': 'bg-purple-500',
      'c#': 'bg-green-600',
      'rust': 'bg-orange-600',
    };
    return colors[language.toLowerCase()] || 'bg-gray-500';
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner': return 'text-green-400';
      case 'intermediate': return 'text-yellow-400';
      case 'advanced': return 'text-orange-400';
      case 'expert': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const formatJoinDate = (timestamp: any) => {
    try {
      const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
      return new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long'
      }).format(date);
    } catch {
      return 'Recently';
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-red-400 border-dashed rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center max-w-md">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={loadUserStats}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-500"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-black page-container">
      <div className="p-4 pb-20">
        {/* Profile Header */}
        <div className="bg-slate-800 rounded-lg p-6 mb-6">
          <div className="flex flex-col items-center text-center">
            {/* Avatar */}
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center mb-4">
              {user.photoURL ? (
                <img 
                  src={user.photoURL} 
                  alt="Profile" 
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <UserCircleIcon className="w-16 h-16 text-white" />
              )}
            </div>
            
            {/* User Info */}
            <h1 className="text-2xl font-bold text-white mb-1">
              {user.displayName || 'Anonymous Developer'}
            </h1>
            <p className="text-slate-400 mb-2">{user.email}</p>
            <p className="text-sm text-slate-500">
              Joined {formatJoinDate(user.metadata?.creationTime)}
            </p>
          </div>
        </div>

        {/* Stats Overview */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-sky-400 mb-1">{stats.totalSolved}</div>
              <div className="text-sm text-slate-400">Problems Solved</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-400 mb-1">{stats.userLevel}</div>
              <div className="text-sm text-slate-400">Level</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-pink-400 mb-1">{stats.totalLikes}</div>
              <div className="text-sm text-slate-400">Total Likes</div>
            </div>
            <div className="bg-slate-800 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-yellow-400 mb-1">#{stats.ranking}</div>
              <div className="text-sm text-slate-400">Ranking</div>
            </div>
          </div>
        )}

        {/* Language Breakdown */}
        {stats && Object.keys(stats.byLanguage).length > 0 && (
          <div className="bg-slate-800 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <CodeBracketSquareIcon className="w-5 h-5" />
              Languages
            </h3>
            <div className="space-y-3">
              {Object.entries(stats.byLanguage)
                .sort(([,a], [,b]) => b - a)
                .map(([language, count]) => (
                  <div key={language} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`w-3 h-3 rounded-full ${getLanguageColor(language)}`}></span>
                      <span className="text-white">{language}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-20 bg-slate-700 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${getLanguageColor(language)}`}
                          style={{ width: `${Math.min((count / stats.totalSolved) * 100, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-slate-400 text-sm w-8 text-right">{count}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Liked Questions */}
        {likedQuestions.length > 0 && (
          <div className="bg-slate-800 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-pink-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
              </svg>
              Liked Questions
            </h3>
            <div className="space-y-3">
              {likedQuestions.slice(0, 5).map((item, index) => {
                const question = item.question;
                
                return (
                  <div key={index} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg hover:bg-slate-600 transition-colors cursor-pointer">
                    <div className="flex-1">
                      <h4 className="text-white font-medium">{question.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs ${getDifficultyColor(question.difficulty)}`}>
                          {question.difficulty}
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="text-xs text-slate-400">{question.language}</span>
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-pink-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                    </svg>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Account Actions */}
        <div className="bg-slate-800 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Account</h3>
          <div className="space-y-3">
            <button
              onClick={handleSignOut}
              className="w-full p-3 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors font-medium"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
