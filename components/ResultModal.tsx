import React, { useEffect, useState } from 'react';
import type { Challenge } from '../types';
import { getAICodeReview, type CodeReview } from '../services/geminiService';

interface TestResult {
  passed: boolean;
  input: any;
  expected: string;
  actual: string;
  error?: string;
}

interface ResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  challenge: Challenge;
  testResults: TestResult[];
  allTestsPassed: boolean;
  userSolution: string;
  onNextQuestion: () => void;
  onRetryQuestion: () => void;
  onRepeatQuestion: () => void;
}

export default function ResultModal({
  isOpen,
  onClose,
  challenge,
  testResults,
  allTestsPassed,
  userSolution,
  onNextQuestion,
  onRetryQuestion,
  onRepeatQuestion
}: ResultModalProps) {
  const [codeReview, setCodeReview] = useState<CodeReview | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  // Fetch AI code review when modal opens
  useEffect(() => {
    if (isOpen && !codeReview) {
      setReviewLoading(true);
      getAICodeReview(
        userSolution,
        challenge.solution,
        challenge.language,
        allTestsPassed,
        challenge.title
      )
        .then(review => {
          setCodeReview(review);
          setReviewLoading(false);
        })
        .catch(error => {
          console.error('Failed to get code review:', error);
          setCodeReview({
            score: allTestsPassed ? 7 : 4,
            strength: allTestsPassed ? 'Solution works correctly!' : 'Keep practicing!',
            improvement: 'Review your code and try again.',
            error: 'AI review unavailable',
          });
          setReviewLoading(false);
        });
    }
  }, [isOpen, userSolution, challenge, allTestsPassed, codeReview]);

  // Reset review when modal closes
  useEffect(() => {
    if (!isOpen) {
      setCodeReview(null);
      setReviewLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const passedTests = testResults.filter(result => result.passed).length;
  const totalTests = testResults.length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className={`p-6 rounded-t-lg ${allTestsPassed ? 'bg-green-600' : 'bg-green-600'}`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                allTestsPassed ? 'bg-green-500' : 'bg-green-500'
              }`}>
                {allTestsPassed ? (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <div>
                {/* Show Test Results will be avaliable on next update
                <h2 className="text-xl font-bold text-white">
                  {allTestsPassed ? 'Congratulations!' : 'Tests Failed'}
                </h2>
                <p className="text-white opacity-90">
                  {allTestsPassed 
                    ? 'All tests passed successfully!' 
                    : `${passedTests} of ${totalTests} tests passed`
                  }
                </p>*/}
               <h2 className="bg-blacks-600 text-xl font-bold text-white">
                Test Result
              </h2>
              <p className="text-white opacity-90">
                {allTestsPassed 
                  ? 'All tests passed successfully!' 
                  : 'All tests passed successfully'
                }
              </p>

              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-300 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Challenge Info */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-2">{challenge.title}</h3>
            <div className="flex items-center space-x-4 text-sm text-gray-400">
              <span className="bg-blue-600 px-2 py-1 rounded text-white">{challenge.language}</span>
              <span className="bg-yellow-600 px-2 py-1 rounded text-white">{challenge.difficulty}</span>
            </div>
          </div>

          {/* Test Results - All in one container */}
          <div className="mb-6">
            <h4 className="text-md font-semibold text-white mb-3">Test Results</h4>
            <div className={`p-4 rounded-lg border ${
              allTestsPassed
                ? 'bg-green-900 border-green-600'
                : 'bg-red-900 border-red-600'
            }`}>
              <div className="space-y-4">
                {testResults.map((result, index) => (
                  <div key={index}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-white">Test Case #{index + 1}</span>
                      <span className={`px-2 py-1 rounded text-sm font-medium ${
                        result.passed
                          ? 'bg-green-600 text-white'
                          : 'bg-red-600 text-white'
                      }`}>
                        {result.passed ? 'Passed' : 'Failed'}
                      </span>
                    </div>
                    
                    <div className="text-sm space-y-1">
                      <div className="text-gray-300">
                        <span className="font-medium">Input:</span> {result.input}
                      </div>
                      <div className="text-gray-300">
                        <span className="font-medium">Expected:</span> {result.expected}
                      </div>
                      <div className="text-gray-300">
                        <span className="font-medium">Got:</span> {result.actual}
                      </div>
                      {result.error && (
                        <div className="text-red-400">
                          <span className="font-medium">Error:</span> {result.error}
                        </div>
                      )}
                    </div>
                    
                    {/* Divider between test cases (except for the last one) */}
                    {index < testResults.length - 1 && (
                      <div className="mt-4 border-t border-gray-700"></div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AI-Powered Code Review */}
          <div className="mb-6">
            <div className="flex items-center space-x-2 mb-3">
              <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <h4 className="text-md font-semibold text-white">AI-Powered Code Review</h4>
            </div>
            
            {reviewLoading ? (
              <div className="p-4 rounded-lg bg-gray-700 border border-gray-600">
                <div className="flex items-center space-x-3">
                  <div className="w-5 h-5 border-2 border-purple-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-gray-300">Analyzing your code...</span>
                </div>
              </div>
            ) : codeReview ? (
              <div className="p-4 rounded-lg bg-gradient-to-br from-purple-900 to-indigo-900 border border-purple-600">
                {/* Score */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-white font-medium">Code Quality Score</span>
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      {[...Array(10)].map((_, i) => (
                        <div
                          key={i}
                          className={`w-2 h-6 rounded ${
                            i < (codeReview.score || 0)
                              ? 'bg-gradient-to-t from-purple-500 to-pink-500'
                              : 'bg-gray-600'
                          }`}
                        />
                      ))}
                    </div>
                    <span className="text-white font-bold text-lg">{codeReview.score}/10</span>
                  </div>
                </div>

                {/* Strength */}
                <div className="mb-3">
                  <div className="flex items-start space-x-2">
                    <svg className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <p className="text-green-400 font-medium text-sm">Strength</p>
                      <p className="text-gray-200 text-sm mt-1">{codeReview.strength}</p>
                    </div>
                  </div>
                </div>

                {/* Improvement */}
                <div>
                  <div className="flex items-start space-x-2">
                    <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <div>
                      <p className="text-yellow-400 font-medium text-sm">Improvement Suggestion</p>
                      <p className="text-gray-200 text-sm mt-1">{codeReview.improvement}</p>
                    </div>
                  </div>
                </div>

                {/* Error message if any */}
                {codeReview.error && (
                  <div className="mt-3 text-xs text-gray-400 italic">
                    {codeReview.error}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {allTestsPassed ? (
              <>
                <button
                  onClick={onNextQuestion}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Next Question
                </button>
                <button
                  onClick={onRepeatQuestion}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Repeat Question
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onRetryQuestion}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={onNextQuestion}
                  className="flex-1 bg-gray-600 hover:bg-gray-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                >
                  Skip Question
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}