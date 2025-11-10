import React from 'react';
import { ModalWrapper } from './ModalWrapper';
import { CodeBracketSquareIcon } from '../icons/Icons';

interface AboutModalProps {
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ onClose }) => {
  return (
    <ModalWrapper title="About CodeSwipe" onClose={onClose}>
      <div className="space-y-4 text-slate-300">
        <div className="text-center mb-8 pb-4 border-b border-slate-700">
            <div className="flex items-center justify-center gap-3">
                 <CodeBracketSquareIcon className="h-10 w-10 text-sky-400" />
                 <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
                    CodeSwipe
                </h1>
            </div>
            <p className="mt-4 text-xl text-slate-300">
                The fast-paced way to sharpen your coding skills.
            </p>
        </div>
        <p>
            <strong>CodeSwipe</strong> is an interactive, swipe-based learning platform designed to make sharpening your coding skills as engaging and addictive as scrolling through your favorite social media feed.
        </p>
        <p>
            Users swipe through bite-sized code challenges, write solutions in a live editor, and get instant, AI-powered feedback.
        </p>
        <p className="pt-4 border-t border-slate-700">
            This project was built for the <strong className="text-white">Google Cloud Run Hackathon</strong>. It leverages a multi-agent AI backend built with Google's Agent Development Kit (ADK) and deployed on Cloud Run, powered by the Gemini API.
        </p>
      </div>
    </ModalWrapper>
  );
};