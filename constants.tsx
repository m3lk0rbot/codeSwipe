
import React from 'react';
import { Category } from './types';
import { BrainCircuitIcon, GpuIcon, UsersIcon } from './components/icons/Icons';

export const CATEGORIES: Category[] = [
  {
    id: 'ai-studio',
    title: 'AI Studio Category',
    description: 'Use Google AI Studio to vibe-code your concept from an idea into code and deploy the app directly to Cloud Run.',
    challenge: 'Best application generated with AI Studio.',
    Icon: BrainCircuitIcon,
  },
  {
    id: 'ai-agents',
    title: 'AI Agents Category',
    description: 'Build a multi-agent application using Google’s Agent Development Kit (ADK) with at least two communicating agents.',
    challenge: 'Most innovative multi-agent solution.',
    Icon: UsersIcon,
  },
  {
    id: 'gpu',
    title: 'GPU Category',
    description: 'Harness the power of NVIDIA L4 GPUs on Cloud Run to run performant open-source AI and ML models like Gemma.',
    challenge: 'Most impressive use of GPUs on Cloud Run.',
    Icon: GpuIcon,
  },
];
