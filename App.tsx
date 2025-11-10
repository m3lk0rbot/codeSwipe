

import React, { useState, useCallback, useEffect } from 'react';
import type { User } from './services/firebase';
import { onAuthStateChanged, auth, getUserSettings } from './services/firebase';
import { ChallengeCard } from './components/CategorySelector';
import { Challenge, TestResult as TestResultType } from './types';
import { runCode } from './services/geminiService';
import { ensureQuestionSaved } from './services/questionsService';
import { recordSubmission } from './services/submissionsService';
import { fetchQuestionFromCurator, fetchSmartQuestionFromCurator, generateAnswer } from './services/curatorService';
import { fetchDatabaseOnlyQuestions, getQuestionSolution } from './services/questionsService';
import { ChevronLeftIcon, ChevronRightIcon } from './components/icons/Icons';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { DiscoverPage } from './components/DiscoverPage';
import { AchievementsPage } from './components/AchievementsPage';
import { SettingsPage } from './components/SettingsPage';
import { ProfilePage } from './components/ProfilePage';
import { OnboardingModal } from './components/modals/OnboardingModal';
import { LoginPage } from './components/LoginPage';
import ResultModal from './components/ResultModal';
import AchievementModal from './components/AchievementModal';
import { ErrorModal } from './components/ErrorModal';
import { LoadingModal } from './components/LoadingModal';
import { ModeSelectionModal } from './components/ModeSelectionModal';
import { Toast, ToastType } from './components/Toast';
import { saveAchievement, hasUserSolvedQuestion } from './services/achievementService';

type ViewType = 'home' | 'discover' | 'achievements' | 'settings' | 'profile' | null;
type QuestionMode = 'ai' | 'db';

const MODE_STORAGE_KEY = 'codeswipe_question_mode';

const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [currentChallenge, setCurrentChallenge] = useState<Challenge | null>(null);
    const [loadingChallenge, setLoadingChallenge] = useState(false);
    const [userCode, setUserCode] = useState('');
    const [results, setResults] = useState<TestResultType[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [touchStartX, setTouchStartX] = useState<number | null>(null);
    const [touchEndX, setTouchEndX] = useState<number | null>(null);
    const [activeView, setActiveView] = useState<ViewType>('home');
    const [showResultModal, setShowResultModal] = useState(false);
    const [showAchievementModal, setShowAchievementModal] = useState(false);
    const [showErrorModal, setShowErrorModal] = useState(false);
    const [allTestsPassed, setAllTestsPassed] = useState(false);
    const [currentQuestionId, setCurrentQuestionId] = useState<string | null>(null);
    const [questionMode, setQuestionMode] = useState<QuestionMode>('ai');
    const [showModeSelectionModal, setShowModeSelectionModal] = useState(false);
    const [userLanguage, setUserLanguage] = useState<string>('');
    const [userTopics, setUserTopics] = useState<string[]>([]);
    const [userLevel, setUserLevel] = useState<string>('');
    const [isGeneratingAnswer, setIsGeneratingAnswer] = useState(false);
    const [toastMessage, setToastMessage] = useState<string>('');
    const [toastType, setToastType] = useState<ToastType>('info');
    const [showToast, setShowToast] = useState(false);

    const loadQuestion = useCallback(async () => {
        if (!auth.currentUser) return;
        setLoadingChallenge(true);
        setError(null);
        try {
            const settings = await getUserSettings(auth.currentUser.uid);
            console.log('📋 User settings retrieved:', settings);
            
            // Store user settings for display
            if (settings) {
                setUserLanguage(settings.languages[0] || '');
                setUserTopics(settings.topics || []);
                setUserLevel(settings.level || '');
            }
            
            const filters = settings ? {
                level: settings.level,
                languages: settings.languages,
                topics: settings.topics,
            } : undefined;
            console.log('🎯 Filters:', filters);
            console.log('🎮 Current mode:', questionMode);

            let challenge: Challenge;

            // Route to appropriate fetching function based on mode
            if (questionMode === 'db') {
                // DB Mode: Fetch from database only
                console.log('🗄️ Using DB Mode - fetching from database only');
                challenge = await fetchDatabaseOnlyQuestions(auth.currentUser.uid, filters);
            } else {
                // AI Mode: Use smart question fetching (70% DB + 30% fresh from Gemini)
                console.log('🤖 Using AI Mode - smart fetching with Gemini');
                challenge = await fetchSmartQuestionFromCurator(auth.currentUser.uid, filters);
            }

            console.log('✅ Challenge received - Difficulty:', challenge.difficulty);
            setCurrentChallenge(challenge);
            setUserCode(challenge.starterCode);
        } catch (e: any) {
            console.error('Failed to load question:', e);
            setError(e.message || 'Failed to load question. Please try again.');
            setShowErrorModal(true); // Show error in modal
        } finally {
            setLoadingChallenge(false);
        }
    }, [questionMode]);

    // Restore mode from localStorage on initialization
    useEffect(() => {
        try {
            const savedMode = localStorage.getItem(MODE_STORAGE_KEY);
            if (savedMode === 'ai' || savedMode === 'db') {
                setQuestionMode(savedMode);
            }
        } catch (error) {
            console.warn('Failed to restore mode from localStorage:', error);
            // Default to 'ai' mode if localStorage is unavailable
        }
    }, []);

    useEffect(() => {
        // The auth state listener is the single source of truth for the user's state.
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
            setAuthLoading(false);
            if (currentUser) {
                loadQuestion();
            }
        });

        return () => unsubscribe();
    }, [loadQuestion]);

    // Reload question when mode changes
    useEffect(() => {
        if (user && !authLoading) {
            loadQuestion();
        }
    }, [questionMode, user, authLoading, loadQuestion]);

    const handleRunTests = useCallback(async () => {
        if (!currentChallenge) return;
        setIsLoading(true);
        setError(null);
        setResults([]);
        try {
            const questionId = await ensureQuestionSaved(currentChallenge);
            setCurrentQuestionId(questionId); // Store questionId for like functionality
            const testResults = await runCode(userCode, currentChallenge.testCases, currentChallenge.solution || '', currentChallenge.language);
            setResults(testResults);

            // Check if all tests passed
            const allPassed = testResults.every(result => result.passed);
            setAllTestsPassed(allPassed);

            // Record submission
            if (auth.currentUser) {
                await recordSubmission({
                    userId: auth.currentUser.uid,
                    questionId,
                    userCode,
                    results: testResults,
                });

                // If all tests passed, save achievement and show modals
                if (allPassed) {
                    // Check if user has already solved this question
                    const alreadySolved = await hasUserSolvedQuestion(auth.currentUser.uid, questionId);

                    if (!alreadySolved) {
                        // Save achievement
                        await saveAchievement({
                            user_id: auth.currentUser.uid,
                            question_id: questionId,
                            question: {
                                title: currentChallenge.title,
                                language: currentChallenge.language,
                                difficulty: currentChallenge.difficulty,
                                description: currentChallenge.description
                            },
                            solution: userCode
                        });

                        // Show achievement modal after result modal
                        setTimeout(() => {
                            setShowAchievementModal(true);
                        }, 2000);
                    }
                }
            }

            // Show result modal
            setShowResultModal(true);

        } catch (e: any) {
            setError(e.message);
            setShowErrorModal(true); // Show error in modal
        } finally {
            setIsLoading(false);
        }
    }, [userCode, currentChallenge]);

    const handleNextChallenge = () => {
        setShowResultModal(false);
        setShowAchievementModal(false);
        loadQuestion();
    };

    const handleSelectChallenge = (challenge: Challenge) => {
        setCurrentChallenge(challenge);
        setActiveView('home');
    };

    const handlePrevChallenge = () => {
        loadQuestion(); // For now, just load a new question
    };

    const handleRetryQuestion = () => {
        setShowResultModal(false);
        setUserCode(currentChallenge?.starterCode || '');
        setResults([]);
        setError(null);
    };

    const handleRepeatQuestion = () => {
        setShowResultModal(false);
        setUserCode(currentChallenge?.starterCode || '');
        setResults([]);
        setError(null);
    };

    const handleCloseResultModal = () => {
        setShowResultModal(false);
    };

    const handleCloseAchievementModal = () => {
        setShowAchievementModal(false);
    };

    const handleAchievementContinue = () => {
        setShowAchievementModal(false);
        loadQuestion();
    };

    const handleModeChange = useCallback((mode: QuestionMode) => {
        setQuestionMode(mode);
        try {
            localStorage.setItem(MODE_STORAGE_KEY, mode);
        } catch (error) {
            console.warn('Failed to save mode to localStorage:', error);
        }
    }, []);

    const handleOpenModeSelection = () => {
        setShowModeSelectionModal(true);
    };

    const showToastNotification = useCallback((message: string, type: ToastType = 'info') => {
        setToastMessage(message);
        setToastType(type);
        setShowToast(true);
    }, []);

    const handleGenerateAnswer = useCallback(async () => {
        if (!currentChallenge) return;
        
        setIsGeneratingAnswer(true);
        
        try {
            let solution: string | null;

            if (questionMode === 'db') {
                console.log('🗄️ Fetching solution from DB for challenge:', currentChallenge.title);
                if (!currentChallenge.id) {
                    throw new Error('Question ID is missing for DB mode answer generation.');
                }
                solution = await getQuestionSolution(currentChallenge.id);
                if (!solution) {
                    throw new Error('Solution not found in the database for this question.');
                }
            } else {
                console.log('🤖 Generating answer via AI for challenge:', currentChallenge.title);
                solution = await generateAnswer(currentChallenge);
            }
            
            // Update code editor with generated solution
            setUserCode(solution);
            console.log('✅ Answer retrieved and inserted into editor');
            
            // Show success toast
            showToastNotification('Answer retrieved successfully!', 'success');
            
        } catch (error: any) {
            console.error('❌ Failed to get answer:', error);
            
            // Determine specific error message based on error type
            let errorMessage = 'Unable to retrieve answer. Please try again.';
            
            if (error.message?.includes('timeout') || error.message?.includes('timed out')) {
                errorMessage = 'Answer generation timed out. Please try again.';
            } else if (error.message?.includes('network') || error.message?.includes('fetch')) {
                errorMessage = 'Network error. Please check your connection and try again.';
            } else if (error.message?.includes('500') || error.message?.includes('503')) {
                errorMessage = 'Service temporarily unavailable. Please try again in a moment.';
            } else if (error.message?.includes('429')) {
                errorMessage = 'Too many requests. Please wait a moment and try again.';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            // Show error toast instead of modal for non-blocking notification
            showToastNotification(errorMessage, 'error');
        } finally {
            setIsGeneratingAnswer(false);
        }
    }, [currentChallenge, showToastNotification, questionMode]);

    // Swipe gestures for mobile
    const SWIPE_THRESHOLD = 60; // pixels
    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEndX(null);
        setTouchStartX(e.targetTouches[0].clientX);
    };
    const onTouchMove = (e: React.TouchEvent) => {
        setTouchEndX(e.targetTouches[0].clientX);
    };
    const onTouchEnd = () => {
        if (touchStartX === null || touchEndX === null) return;
        const deltaX = touchStartX - touchEndX;
        if (Math.abs(deltaX) < SWIPE_THRESHOLD) return;
        if (deltaX > 0) {
            handleNextChallenge(); // swipe left -> next
        } else {
            handlePrevChallenge(); // swipe right -> prev
        }
    };

    useEffect(() => {
        if (currentChallenge) {
            setUserCode(currentChallenge.starterCode);
            setResults([]);
            setError(null);
            // Ensure question is saved and get the ID for like functionality
            ensureQuestionSaved(currentChallenge)
                .then(questionId => setCurrentQuestionId(questionId))
                .catch(() => { });
        }
    }, [currentChallenge]);

    if (authLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-900">
                <div className="w-12 h-12 border-4 border-sky-400 border-dashed rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!user) {
        return <LoginPage />;
    }

    if (loadingChallenge) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-900">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-sky-400 border-dashed rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-slate-300">Loading...</p>
                </div>
            </div>
        );
    }

    if (!currentChallenge) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-900">
                <div className="text-center max-w-md">
                    <p className="text-red-400 mb-4">{error || 'Failed to load challenge'}</p>
                    <button
                        onClick={() => loadQuestion()}
                        className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-500"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    const renderMainContent = () => {
        switch (activeView) {
            case 'discover':
                return <DiscoverPage onSelectChallenge={handleSelectChallenge} />;
            case 'achievements':
                return <AchievementsPage />;
            case 'settings':
                return <SettingsPage onSettingsChange={loadQuestion} />;
            case 'profile':
                return <ProfilePage user={user} />;
            case 'home':
            default:
                return (
                    <div className="h-full flex flex-col bg-black">
                        {/* Header with proper spacing */}
                        <div className="flex-shrink-0 p-4">
                            <Header 
                                user={user} 
                                currentMode={questionMode}
                                onOpenModeSelection={handleOpenModeSelection}
                            />
                        </div>

                        {/* Main content area that fills remaining space */}
                        <div className="flex-1 flex items-center justify-center p-4">
                            <div className="w-full max-w-4xl flex items-center justify-center gap-4 h-full">
                                <button onClick={handlePrevChallenge} className="p-2 rounded-full hover:bg-gray-700 transition-colors hidden md:block">
                                    <ChevronLeftIcon className="w-8 h-8 text-gray-400" />
                                </button>
                                <div className="w-full max-w-2xl h-full" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
                                    <ChallengeCard
                                        challenge={currentChallenge}
                                        userCode={userCode}
                                        setUserCode={setUserCode}
                                        onRunTests={handleRunTests}
                                        results={results}
                                        isLoading={isLoading}
                                        error={error}
                                        questionId={currentQuestionId}
                                        userLanguage={userLanguage}
                                        userTopics={userTopics}
                                        userLevel={userLevel}
                                        currentMode={questionMode}
                                        onOpenModeSelection={handleOpenModeSelection}
                                        onGenerateAnswer={handleGenerateAnswer}
                                        isGeneratingAnswer={isGeneratingAnswer}
                                    />
                                </div>
                                <button onClick={handleNextChallenge} className="p-2 rounded-full hover:bg-gray-700 transition-colors hidden md:block">
                                    <ChevronRightIcon className="w-8 h-8 text-gray-400" />
                                </button>
                            </div>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="flex flex-col h-screen bg-black text-white">
            <main className="flex-grow relative bg-black overflow-hidden">
                {renderMainContent()}

                {/* No more modals - all are now pages */}

                {/* Result Modal */}
                {showResultModal && currentChallenge && (
                    <ResultModal
                        isOpen={showResultModal}
                        onClose={handleCloseResultModal}
                        challenge={currentChallenge}
                        testResults={results}
                        allTestsPassed={allTestsPassed}
                        userSolution={userCode}
                        onNextQuestion={handleNextChallenge}
                        onRetryQuestion={handleRetryQuestion}
                        onRepeatQuestion={handleRepeatQuestion}
                    />
                )}

                {/* Achievement Modal */}
                {showAchievementModal && currentChallenge && (
                    <AchievementModal
                        isOpen={showAchievementModal}
                        onClose={handleCloseAchievementModal}
                        challenge={currentChallenge}
                        onContinue={handleAchievementContinue}
                    />
                )}

                {/* Error Modal */}
                {showErrorModal && error && (
                    <ErrorModal
                        isOpen={showErrorModal}
                        onClose={() => {
                            setShowErrorModal(false);
                            setError(null);
                        }}
                        error={error}
                    />
                )}

                {/* Loading Modal - Centered */}
                <LoadingModal isOpen={isLoading} />

                {/* Mode Selection Modal */}
                <ModeSelectionModal
                    isOpen={showModeSelectionModal}
                    onClose={() => setShowModeSelectionModal(false)}
                    currentMode={questionMode}
                    onModeChange={handleModeChange}
                />

                {/* Toast Notification */}
                <Toast
                    message={toastMessage}
                    type={toastType}
                    isOpen={showToast}
                    onClose={() => setShowToast(false)}
                    duration={5000}
                />
            </main>

            <Footer activeView={activeView} setActiveView={setActiveView} />
        </div>
    );
}

export default App;
