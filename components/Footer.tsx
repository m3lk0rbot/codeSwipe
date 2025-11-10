import React from 'react';
import { UserCircleIcon, CogIcon, TrophyIcon, HomeIcon, CompassIcon } from './icons/Icons';

type ViewType = 'home' | 'discover' | 'achievements' | 'settings' | 'profile' | null;

interface FooterProps {
    activeView: ViewType;
    setActiveView: (view: ViewType) => void;
}

const NavButton: React.FC<{
    label: string;
    viewType: NonNullable<ViewType>;
    Icon: React.FC<React.SVGProps<SVGSVGElement>>;
    isActive: boolean;
    onClick: () => void;
}> = ({ label, Icon, isActive, onClick }) => {
    const activeClasses = 'text-white';
    const inactiveClasses = 'text-gray-500 hover:text-gray-300';
    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center justify-center gap-1 w-full transition-colors duration-200 ${isActive ? activeClasses : inactiveClasses}`}
        >
            <Icon className="w-6 h-6" />
            <span className="text-xs font-medium">{label}</span>
        </button>
    );
};

export const Footer: React.FC<FooterProps> = ({ activeView, setActiveView }) => {
    return (
        <footer className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800">
            <nav className="flex items-center justify-around max-w-lg mx-auto h-16 px-2">
                <NavButton 
                    label="Home" 
                    Icon={HomeIcon} 
                    viewType="home" 
                    isActive={activeView === 'home'} 
                    onClick={() => setActiveView('home')}
                />
                <NavButton 
                    label="Discover" 
                    Icon={CompassIcon} 
                    viewType="discover" 
                    isActive={activeView === 'discover'} 
                    onClick={() => setActiveView('discover')}
                />
                <NavButton 
                    label="Achievements" 
                    Icon={TrophyIcon} 
                    viewType="achievements" 
                    isActive={activeView === 'achievements'} 
                    onClick={() => setActiveView('achievements')}
                />
                <NavButton 
                    label="Settings" 
                    Icon={CogIcon} 
                    viewType="settings" 
                    isActive={activeView === 'settings'} 
                    onClick={() => setActiveView('settings')}
                />
                <NavButton 
                    label="Profile" 
                    Icon={UserCircleIcon} 
                    viewType="profile" 
                    isActive={activeView === 'profile'} 
                    onClick={() => setActiveView('profile')}
                />
            </nav>
        </footer>
    );
};
