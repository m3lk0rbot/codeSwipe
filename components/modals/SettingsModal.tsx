import React, { useState } from 'react';
import { ModalWrapper } from './ModalWrapper';
import { auth, saveUserSettings } from '../../services/firebase';
import type { Difficulty, ProgrammingLanguage } from '../../types';

interface SettingsModalProps {
  onClose: () => void;
}

// FIX: Changed id to be of type Difficulty and capitalized.
const levels: { id: Difficulty; title: string; description: string }[] = [
    { id: 'Beginner', title: 'Beginner', description: 'New to programming' },
    { id: 'Intermediate', title: 'Intermediate', description: 'Comfortable with basics' },
    { id: 'Advanced', title: 'Advanced', description: 'Ready for complex problems' },
    { id: 'Expert', title: 'Expert', description: 'Challenge me!' },
];

// FIX: Aligned languages with the ProgrammingLanguage type.
const languages: ProgrammingLanguage[] = ['JavaScript', 'Python', 'Java', 'C++', 'Go', 'Rust', 'TypeScript', 'C#'];
const topics = ['Arrays & Strings', 'Hash Tables', 'Linked Lists', 'Trees & Graphs', 'Dynamic Programming', 'Recursion & Backtracking', 'Sorting & Searching', 'Bit Manipulation', 'Math & Logic', 'Object-Oriented Design', 'System Design', 'Database Queries (SQL)'];


export const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
// FIX: Used specific types for state to match the required types for saveUserSettings.
  const [level, setLevel] = useState<Difficulty>('Intermediate');
  const [selectedLanguages, setSelectedLanguages] = useState<ProgrammingLanguage[]>(['JavaScript', 'Python']);
  const [selectedTopics, setSelectedTopics] = useState<string[]>(['Arrays & Strings', 'Hash Tables']);

// FIX: Updated parameter type to ProgrammingLanguage.
  const toggleLanguage = (lang: ProgrammingLanguage) => {
    setSelectedLanguages(prev => prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang]);
  };
  const toggleTopic = (topic: string) => {
    setSelectedTopics(prev => prev.includes(topic) ? prev.filter(t => t !== topic) : [...prev, topic]);
  };

  const handleSave = async () => {
    if (!auth.currentUser) return onClose();
// FIX: Type errors on level and selectedLanguages are resolved by the state type changes above.
    await saveUserSettings(auth.currentUser.uid, {
      level,
      languages: selectedLanguages,
      topics: selectedTopics,
    });
    onClose();
  };

  return (
    <ModalWrapper title="Challenge Settings" onClose={onClose}>
      <div className="space-y-8">
        {/* Skill Level */}
        <div>
          <h3 className="text-lg font-semibold text-white">Skill Level</h3>
          <p className="text-sm text-slate-400 mb-4">Select one level that best describes your current ability.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {levels.map(l => (
              <label key={l.id} htmlFor={l.id} className="flex items-center gap-3 p-3 rounded-md border border-slate-600 bg-slate-700/50 cursor-pointer">
                <input id={l.id} name="level" type="radio" checked={level === l.id} onChange={() => setLevel(l.id)} className="h-4 w-4 border-slate-500 bg-slate-800 text-sky-500 focus:ring-sky-500" />
                <div>
                  <span className="font-medium text-white">{l.title}</span>
                  <span className="block text-xs text-slate-400">{l.description}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Languages */}
        <div>
          <h3 className="text-lg font-semibold text-white">Programming Languages</h3>
          <p className="text-sm text-slate-400 mb-4">Select all languages you want to practice.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
             {languages.map(lang => (
                 <label key={lang} htmlFor={lang} className="flex items-center gap-2 cursor-pointer">
                    <input id={lang} name="language" type="checkbox" checked={selectedLanguages.includes(lang)} onChange={() => toggleLanguage(lang)} className="h-4 w-4 rounded border-slate-500 bg-slate-800 text-sky-500 focus:ring-sky-500" />
                    <span className="text-sm text-slate-300">{lang}</span>
                 </label>
             ))}
          </div>
        </div>
        
        {/* Topics */}
         <div>
          <h3 className="text-lg font-semibold text-white">Challenge Topics</h3>
          <p className="text-sm text-slate-400 mb-4">Focus on specific areas you want to improve.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
             {topics.map(topic => (
                 <label key={topic} htmlFor={topic} className="flex items-center gap-2 cursor-pointer">
                    <input id={topic} name="topic" type="checkbox" checked={selectedTopics.includes(topic)} onChange={() => toggleTopic(topic)} className="h-4 w-4 rounded border-slate-500 bg-slate-800 text-sky-500 focus:ring-sky-500" />
                    <span className="text-sm text-slate-300">{topic}</span>
                 </label>
             ))}
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t border-slate-700">
            <button
                onClick={handleSave}
                className="inline-flex items-center gap-2 rounded-md bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600"
            >
                Save Settings
            </button>
        </div>
      </div>
    </ModalWrapper>
  );
};
