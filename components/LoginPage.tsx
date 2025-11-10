
import React, { useState } from 'react';
import { signInWithGoogle } from '../services/firebase';
import { CodeBracketSquareIcon, GoogleIcon } from './icons/Icons';

export const LoginPage: React.FC = () => {
    const [isSigningIn, setIsSigningIn] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSignIn = async () => {
        setIsSigningIn(true);
        setError(null);
        try {
            // signInWithPopup returns a promise that resolves upon successful sign-in.
            // onAuthStateChanged in App.tsx will then handle the user state update.
            await signInWithGoogle();
        } catch (err: any) {
            console.error("Google Sign-In Error:", err);
            let message = "Could not sign in. Please try again.";
            if (err.code === 'auth/popup-blocked') {
                message = "Pop-up was blocked by the browser. Please allow pop-ups for this site and try again.";
            } else if (err.code === 'auth/unauthorized-domain') {
                message = `This domain is not authorized for sign-in. Please add the correct domain to the authorized domains list in your Firebase settings.`;
            }
            setError(message);
        } finally {
            setIsSigningIn(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-4">
            <div className="text-center">
                 <div className="flex items-center justify-center gap-3">
                     <CodeBracketSquareIcon className="h-12 w-12 text-sky-400" />
                     <h1 className="text-5xl font-bold tracking-tight text-white sm:text-6xl">
                        CodeSwipe
                    </h1>
                </div>
                <p className="mt-4 text-xl text-slate-300">
                    The fast-paced way to sharpen your coding skills.
                </p>
            </div>

            <div className="mt-16">
                 <button
                    onClick={handleSignIn}
                    disabled={isSigningIn}
                    className="inline-flex items-center justify-center gap-3 w-full rounded-md bg-white px-6 py-3.5 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                 >
                    <GoogleIcon className="w-5 h-5" />
                    {isSigningIn ? 'Signing in...' : 'Sign in with Google'}
                </button>
            </div>
            {error && <p className="mt-4 text-sm text-red-400 max-w-md text-center">{error}</p>}
        </div>
    );
};
