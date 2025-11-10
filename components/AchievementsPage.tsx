import React, { useState, useEffect } from 'react';
import { auth } from '../services/firebase';
import { getUserAchievements } from '../services/achievementService';
import { TrophyIcon } from './icons/Icons';

interface Achievement {
  ac_id: string;
  completionDate: Date;
  question_id: string;
  user_id: string;
  // Joined from Questions table
  title: string;
  description: string;
  difficulty: string;
  language: string;
}

export const AchievementsPage: React.FC = () => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('All');

  const filters = ['All', 'JavaScript', 'Python', 'Java', 'Go', 'TypeScript'];

  useEffect(() => {
    loadAchievements();
  }, []);

  const loadAchievements = async () => {
    if (!auth.currentUser) return;
    
    setLoading(true);
    setError(null);
    try {
      const userAchievements = await getUserAchievements(auth.currentUser.uid);
      setAchievements(userAchievements);
    } catch (e: any) {
      console.error('Failed to load achievements:', e);
      setError(e.message || 'Failed to load achievements');
    } finally {
      setLoading(false);
    }
  };

  const filteredAchievements = achievements.filter(achievement => {
    if (filter === 'All') return true;
    return achievement.language === filter;
  });

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner': return 'text-green-400 bg-green-400/10';
      case 'intermediate': return 'text-yellow-400 bg-yellow-400/10';
      case 'advanced': return 'text-orange-400 bg-orange-400/10';
      case 'expert': return 'text-red-400 bg-red-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
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

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getAchievementStats = () => {
    const total = achievements.length;
    const byDifficulty = achievements.reduce((acc, achievement) => {
      acc[achievement.difficulty] = (acc[achievement.difficulty] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });
    
    const byLanguage = achievements.reduce((acc, achievement) => {
      acc[achievement.language] = (acc[achievement.language] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    return { total, byDifficulty, byLanguage };
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-red-400 border-dashed rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-300">Loading achievements...</p>
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
            onClick={loadAchievements}
            className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-500"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const stats = getAchievementStats();

  return (
    <div className="h-full bg-black page-container">
      <div className="p-4 pb-20">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <TrophyIcon className="w-8 h-8 text-yellow-500" />
          <h1 className="text-2xl font-bold text-white">My Achievements</h1>
        </div>

        {/* Language Filter */}
        <div className="mb-6 overflow-x-auto whitespace-nowrap pb-2">
          <div className="inline-flex gap-3">
            {filters.map((filterOption) => {
              // Hide language tabs with 0 questions (except "All")
              const count = filterOption === 'All' ? stats.total : (stats.byLanguage[filterOption] || 0);
              if (filterOption !== 'All' && count === 0) {
                return null;
              }
              
              return (
                <button
                  key={filterOption}
                  onClick={() => setFilter(filterOption)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                    filter === filterOption
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {filterOption}
                  {filterOption !== 'All' && stats.byLanguage[filterOption] && (
                    <span className="ml-2 text-xs opacity-75">({stats.byLanguage[filterOption]})</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Achievements List */}
        {filteredAchievements.length === 0 ? (
          <div className="text-center py-12">
            <TrophyIcon className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-slate-400 mb-2">
              {filter === 'All' ? 'No achievements yet' : `No ${filter} achievements`}
            </h3>
            <p className="text-slate-500 mb-4">
              {filter === 'All' 
                ? 'Start solving challenges to earn your first achievement!' 
                : `Try solving some ${filter} challenges to earn achievements.`
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAchievements.map((achievement) => (
              <div
                key={achievement.ac_id}
                className="bg-gray-900 rounded-lg p-4 hover:bg-gray-800 transition-colors border border-gray-800"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="text-white font-semibold text-lg mb-1">
                      {achievement.title}
                    </h3>
                    <p className="text-slate-300 text-sm mb-2 line-clamp-2">
                      {achievement.description}
                    </p>
                  </div>
                  <TrophyIcon className="w-6 h-6 text-yellow-500 flex-shrink-0 ml-3" />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block w-3 h-3 rounded-full ${getLanguageColor(achievement.language)}`}></span>
                      <span className="text-xs text-slate-400">{achievement.language}</span>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(achievement.difficulty)}`}>
                      {achievement.difficulty}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500">
                    Solved on {formatDate(achievement.completionDate)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};