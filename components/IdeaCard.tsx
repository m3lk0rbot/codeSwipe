

import React from 'react';
import { TestResult } from '../types';
import { CheckIcon, XMarkIcon } from './icons/Icons';

interface TestResultsDisplayProps {
  results: TestResult[];
}

export const TestResultsDisplay: React.FC<TestResultsDisplayProps> = ({ results }) => {
    if (results.length === 0) {
        return <div className="text-center text-slate-500 text-sm mt-4">Run tests to see the results here.</div>;
    }
    
    return (
        <div className="space-y-3">
            {results.map((result, index) => (
                <div key={index} className={`p-3 rounded-md text-sm ${result.passed ? 'bg-emerald-900/50 border border-emerald-500/30' : 'bg-red-900/50 border border-red-500/30'}`}>
                    <div className="flex items-center justify-between font-semibold">
                        <p className={result.passed ? 'text-emerald-400' : 'text-red-400'}>
                            Test Case #{index + 1}
                        </p>
                        <div className="flex items-center gap-1.5">
                            {result.passed ? (
                                <>
                                    <CheckIcon className="w-5 h-5 text-emerald-400" />
                                    <span>Passed</span>
                                </>
                            ) : (
                                <>
                                    <XMarkIcon className="w-5 h-5 text-red-400" />
                                    <span>Failed</span>
                                </>
                            )}
                        </div>
                    </div>
                    {!result.passed && (
                        <div className="mt-2 pt-2 border-t border-slate-700 font-mono text-xs text-slate-400 space-y-1">
                           <p><span className="font-semibold text-slate-300">Input:</span> {result.input}</p>
                           <p><span className="font-semibold text-slate-300">Expected:</span> {result.expected}</p>
                           <p><span className="font-semibold text-red-400">Got:</span> {result.actual}</p>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
};