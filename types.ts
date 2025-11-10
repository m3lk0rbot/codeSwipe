

import type React from 'react';

export type ProgrammingLanguage = 'JavaScript' | 'Python' | 'Go' | 'Java' | 'TypeScript' | 'C++' | 'C#' | 'Rust';
export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';

export interface TestCase {
  input: any;
  expected: any;
}

export interface Challenge {
  id: string;
  title: string;
  language: ProgrammingLanguage;
  difficulty: Difficulty;
  description: string;
  starterCode: string;
  testCases: TestCase[];
  solution: string; // For mock evaluation
}

export interface TestResult {
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
}

export interface Category {
  id: string;
  title: string;
  description: string;
  challenge: string;
  Icon: React.FC<React.SVGProps<SVGSVGElement>>;
}
