
import React from 'react';
import { ExclamationTriangleIcon } from './icons/Icons';

interface ErrorDisplayProps {
  message: string;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message }) => {
  return (
    <div className="flex flex-col items-center justify-center text-center my-16 bg-red-900/20 border border-red-500/30 rounded-lg p-6 max-w-md mx-auto">
      <ExclamationTriangleIcon className="h-10 w-10 text-red-400" />
      <h3 className="mt-2 text-lg font-semibold text-white">An Error Occurred</h3>
      <p className="mt-1 text-sm text-red-300">{message}</p>
    </div>
  );
};
