
import React from 'react';

export const LoadingSpinner: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center text-center my-8">
            <div className="w-10 h-10 border-4 border-sky-400 border-dashed rounded-full animate-spin"></div>
            <p className="mt-4 text-md text-slate-300">Running tests...</p>
        </div>
    );
}
