
import React from 'react';
import type { User } from '../../services/firebase';
import { ModalWrapper } from './ModalWrapper';
import { logOut } from '../../services/firebase';
import { UserCircleIcon } from '../icons/Icons';

interface ProfileModalProps {
  onClose: () => void;
  user: User | null;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({ onClose, user }) => {

  const handleSignOut = async () => {
      try {
        await logOut();
        onClose(); // Close the modal after signing out
      } catch (error) {
        console.error("Error signing out: ", error);
      }
  };

  if (!user) {
    // This case should ideally not be hit if the modal is only shown for logged-in users,
    // but it's good practice for robustness.
    return (
      <ModalWrapper title="My Profile" onClose={onClose}>
        <p>Please sign in to view your profile.</p>
      </ModalWrapper>
    );
  }

  return (
    <ModalWrapper title="My Profile" onClose={onClose}>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          {user.photoURL ? (
            <img src={user.photoURL} alt="Profile" className="w-20 h-20 rounded-full" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-slate-700 flex items-center justify-center">
                <UserCircleIcon className="w-16 h-16 text-slate-400" />
            </div>
          )}
          <div>
            <h3 className="text-2xl font-bold">{user.displayName || 'Anonymous User'}</h3>
            <p className="text-slate-400">{user.email}</p>
            <p className="text-sm text-slate-500 mt-1">
              Member since: {user.metadata.creationTime ? new Date(user.metadata.creationTime).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : 'N/A'}
            </p>
          </div>
        </div>
        
        <div className="border-t border-slate-700 pt-6">
          <p className="text-slate-400 text-center">
            Learning Preferences and Editor settings will be available here soon.
          </p>
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-slate-700">
             <button
                onClick={handleSignOut}
                className="rounded-md bg-red-800/80 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700 transition-colors"
            >
                Sign Out
            </button>
            <button
                className="rounded-md bg-slate-700 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-600"
            >
                Edit Profile
            </button>
        </div>
      </div>
    </ModalWrapper>
  );
};