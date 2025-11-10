import React, { useState, useEffect } from 'react';
import { Challenge } from '../types';
import { fetchRandomQuestions, fetchUniqueLanguages, fetchSmartQuestions } from '../services/questionsService';
import { auth } from '../services/firebase';

interface DiscoverPageProps {
    onSelectChallenge: (challenge: Challenge) => void;
}

export const DiscoverPage: React.FC<DiscoverPageProps> = ({ onSelectChallenge }) => {
    const [questions, setQuestions] = useState<Challenge[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('For You');
    const [categories, setCategories] = useState<string[]>(['For You']);
    const [loadingCategories, setLoadingCategories] = useState(true);

    useEffect(() => {
        loadRandomQuestions();
        loadCategories();
    }, []);

    const loadCategories = async () => {
        setLoadingCategories(true);
        try {
            const uniqueLanguages = await fetchUniqueLanguages();
            // Only update if we got valid languages from database
            if (uniqueLanguages && uniqueLanguages.length > 0) {
                setCategories(['For You', ...uniqueLanguages]);
                console.log('✅ Loaded dynamic categories from database:', uniqueLanguages);
            } else {
                // Fallback to hardcoded categories when database returns empty
                setCategories(['For You', 'JavaScript', 'Python', 'Java', 'Go', 'TypeScript']);
                console.log('⚠️ Using fallback categories (database returned empty)');
            }
        } catch (e: any) {
            console.error('❌ Failed to load categories:', e);
            // Fallback to hardcoded categories on error
            setCategories(['For You', 'JavaScript', 'Python', 'Java', 'Go', 'TypeScript']);
            console.log('⚠️ Using fallback categories (error occurred)');
        } finally {
            setLoadingCategories(false);
        }
    };

    const loadRandomQuestions = async () => {
        setLoading(true);
        setError(null);
        try {
            const userId = auth.currentUser?.uid;
            // Use smart question fetching for better user experience
            const smartQuestions = await fetchSmartQuestions(10, userId);
            setQuestions(smartQuestions);
        } catch (e: any) {
            console.error('Failed to load questions:', e);
            setError(e.message || 'Failed to load questions');
        } finally {
            setLoading(false);
        }
    };

    const filteredQuestions = questions.filter(question => {
        const matchesSearch = question.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            question.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'For You' ||
            question.language.toLowerCase() === selectedCategory.toLowerCase();
        return matchesSearch && matchesCategory;
    });

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty.toLowerCase()) {
            case 'beginner': return 'text-green-400';
            case 'intermediate': return 'text-yellow-400';
            case 'advanced': return 'text-orange-400';
            case 'expert': return 'text-red-400';
            default: return 'text-gray-400';
        }
    };

    const getLanguageColor = (language: string) => {
        const colors: { [key: string]: string } = {
            'javascript': 'bg-yellow-500',
            'python': 'bg-blue-500',
            'java': 'bg-red-500',
            'go': 'bg-cyan-500',
            'typescript': 'bg-blue-600',
            'c++': 'bg-purple-500',
            'c#': 'bg-green-600',
            'rust': 'bg-orange-600',
        };
        return colors[language.toLowerCase()] || 'bg-gray-500';
    };

    if (loading || loadingCategories) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="text-center">
                    <div className="w-12 h-12 border-4 border-red-400 border-dashed rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-300">
                        {loading ? 'Loading questions...' : 'Loading categories...'}
                    </p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-full items-center justify-center">
                <div className="text-center max-w-md">
                    <p className="text-red-400 mb-4">{error}</p>
                    <button
                        onClick={loadRandomQuestions}
                        className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-500"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full bg-black page-container">
            <div className="p-4 pb-20">
                {/* Search Bar */}
                <div className="relative mb-4">
                    <input
                        type="text"
                        placeholder="Search questions, languages, or topics"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-gray-900 rounded-full py-3 pl-10 pr-4 text-white border-none focus:outline-none focus:ring-2 focus:ring-red-500 placeholder-gray-400"
                    />
                    <div className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 flex items-center justify-center">
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                </div>

                {/* Category Filters */}
                <div className="mb-6 overflow-x-auto whitespace-nowrap pb-2">
                    <div className="inline-flex gap-3">
                        {categories.map((category) => (
                            <button
                                key={category}
                                onClick={() => setSelectedCategory(category)}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${selectedCategory === category
                                    ? 'bg-red-500 text-white'
                                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                                    }`}
                            >
                                {category}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Questions Header */}
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold">
                        {selectedCategory === 'For You' ? 'Trending Questions' : `${selectedCategory} Questions`}
                    </h3>
                    <button
                        onClick={loadRandomQuestions}
                        className="text-sky-400 text-sm hover:text-sky-300"
                    >
                        Refresh
                    </button>
                </div>

                {/* Questions Grid */}
                {filteredQuestions.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-400 mb-4">No questions found</p>
                        <button
                            onClick={loadRandomQuestions}
                            className="px-4 py-2 bg-sky-600 text-white rounded-md hover:bg-sky-500"
                        >
                            Load More Questions
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredQuestions.map((question, index) => (
                            <div
                                key={`${question.title}-${index}`}
                                onClick={() => onSelectChallenge(question)}
                                className="bg-gray-900 rounded-lg p-4 cursor-pointer hover:bg-gray-800 transition-colors border border-gray-800"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="text-white font-medium text-lg flex-1 mr-2">
                                        {question.title}
                                    </h4>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                        <span className={`inline-block w-3 h-3 rounded-full ${getLanguageColor(question.language)}`}></span>
                                        <span className="text-xs text-gray-400">{question.language}</span>
                                    </div>
                                </div>

                                <p className="text-gray-300 text-sm mb-3 line-clamp-2">
                                    {question.description}
                                </p>

                                <div className="flex justify-between items-center">
                                    <span className={`text-xs font-medium ${getDifficultyColor(question.difficulty)}`}>
                                        {question.difficulty}
                                    </span>
                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                        <span>{question.testCases?.length || 0} tests</span>
                                        <span>•</span>
                                        <span>Tap to solve</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};