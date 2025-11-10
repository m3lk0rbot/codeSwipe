
import React from 'react';
import { CodeBracketSquareIcon } from './icons/Icons';
import type { User } from '../services/firebase';

type HeaderProps = {
    user: User | null;
    currentMode?: 'ai' | 'db';
    onOpenModeSelection?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ user, currentMode = 'ai', onOpenModeSelection }) => {
    const getModeIcon = () => {
        return currentMode === 'ai' ? '✨' : '💾';
    };

    const getModeLabel = () => {
        return currentMode === 'ai' ? 'AI Mode' : 'DB Mode';
    };

    return (
        <header className="px-4 pt-2">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <CodeBracketSquareIcon className="h-8 w-8 text-sky-400" />
                    <span className="text-xl font-bold text-white">Code Swipe</span>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                    {user && (
                        <>
                            <div className="flex items-center gap-2">
                                {/* Show username on all screen sizes, but shorter on mobile */}
                                <span className="text-sm text-slate-200 max-w-[120px] sm:max-w-none truncate">
                                    {user.displayName || user.email?.split('@')[0] || 'User'}
                                </span>
                                {user.photoURL ? (
                                    <img src={user.photoURL} alt="User" className="h-8 w-8 rounded-full flex-shrink-0" />
                                ) : (
                                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-sky-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                                        <span className="text-white text-sm font-medium">
                                            {(user.displayName || user.email || 'U')[0].toUpperCase()}
                                        </span>
                                    </div>
                                )}
                            </div>

                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
