import React from 'react';

interface UserSettingsDisplayProps {
  language: string;
  topics: string[];
}

export const UserSettingsDisplay: React.FC<UserSettingsDisplayProps> = ({ language, topics }) => {
  const topicsDisplay = topics.length > 0 ? topics.join(', ') : 'None';
  
  return (
    <div className="mt-2 text-slate-400 text-xs">
      <span>Language: {language}</span>
      <span className="mx-2">|</span>
      <span>Topics: {topicsDisplay}</span>
    </div>
  );
};
