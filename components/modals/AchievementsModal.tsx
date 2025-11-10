import React, { useState, useEffect } from 'react';
import { ModalWrapper } from './ModalWrapper';
import { TrophyIcon } from '../icons/Icons';
import { getUserAchievements, getUserStats, type Achievement } from '../../services/achievementService';
import { auth } from '../../services/firebase';

interface AchievementsModalProps {
  onClose: () => void;
}

export const AchievementsModal: React.FC<AchievementsModalProps> = ({ onClose }) => {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadAchievements = async () => {
      if (!auth.currentUser) return;
      
      try {
        setLoading(true);
        const [userAchievements, userStats] = await Promise.all([
          getUserAchievements(auth.currentUser.uid),
          getUserStats(auth.currentUser.uid)
        ]);
        setAchievements(userAchievements);
        setStats(userStats);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadAchievements();
  }, []);

  if (loading) {
    return (
      <ModalWrapper title="My Achievements" onClose={onClose}>
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-sky-400 border-dashed rounded-full animate-spin"></div>
        </div>
      </ModalWrapper>
    );
  }

  if (error) {
    return (
      <ModalWrapper title="My Achievements" onClose={onClose}>
        <div className="flex flex-col items-center justify-center text-center py-12">
          <p className="text-red-400 mb-4">Failed to load achievements: {error}</p>
          <button
            onClick={onClose}
            className="rounded-md bg-sky-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-500"
          >
            Close
          </button>
        </div>
      </ModalWrapper>
    );
  }

  if (achievements.length === 0) {
    return (
      <ModalWrapper title="My Achievements" onClose={onClose}>
        <div className="flex flex-col items-center justify-center text-center py-12">
          <TrophyIcon className="h-16 w-16 text-amber-400" />
          <h3 className="mt-4 text-xl font-semibold text-white">Your Solved Challenges</h3>
          <p className="mt-2 text-slate-400 max-w-sm">
            As you solve challenges, they will appear here. For now, it's a blank canvas for your future victories!
          </p>
          <button
            onClick={onClose}
            className="mt-6 rounded-md bg-sky-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-500"
          >
            Start Swiping
          </button>
        </div>
      </ModalWrapper>
    );
  }

  return (
    <ModalWrapper title="My Achievements" onClose={onClose}>
      <div className="max-h-96 overflow-y-auto">
        {/* Stats Summary */}
        {stats && (
          <div className="mb-6 grid grid-cols-2 gap-4">
            <div className="bg-gray-700 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">{stats.totalSolved}</div>
              <div className="text-sm text-gray-400">Total Solved</div>
            </div>
            <div className="bg-gray-700 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">
                {Object.keys(stats.byLanguage).length}
              </div>
              <div className="text-sm text-gray-400">Languages</div>
            </div>
          </div>
        )}

        {/* Difficulty Breakdown */}
        {stats && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-400 mb-3">By Difficulty</h4>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(stats.byDifficulty).map(([difficulty, count]) => (
                <div key={difficulty} className="bg-gray-700 rounded p-2 text-center">
                  <div className="text-lg font-bold text-white">{count as number}</div>
                  <div className="text-xs text-gray-400">{difficulty}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Achievement List */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-400">Recent Achievements</h4>
          {achievements.map((achievement) => (
            <div
              key={achievement.ac_id}
              className="bg-gray-700 rounded-lg p-4 border border-gray-600"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h5 className="font-medium text-white">{achievement.question.title}</h5>
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="bg-blue-600 px-2 py-1 rounded text-xs text-white">
                      {achievement.question.language}
                    </span>
                    <span className="bg-yellow-600 px-2 py-1 rounded text-xs text-white">
                      {achievement.question.difficulty}
                    </span>
                  </div>
                  <p className="text-sm text-gray-400 mt-2">
                    {achievement.question.description}
                  </p>
                  <p className="text-xs text-gray-500 mt-2">
                    Solved on {new Date(achievement.datetime).toLocaleDateString()}
                  </p>
                </div>
                <TrophyIcon className="h-6 w-6 text-amber-400 ml-3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </ModalWrapper>
  );
};
