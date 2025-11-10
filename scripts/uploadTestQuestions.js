// Script to upload test questions to Firebase
// Run with: node scripts/uploadTestQuestions.js
// Or with custom file: node scripts/uploadTestQuestions.js all_q.json

import admin from 'firebase-admin';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
// IMPORTANT: Update this path to your service account key file
const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');

let serviceAccount;
try {
  const serviceAccountData = fs.readFileSync(serviceAccountPath, 'utf8');
  serviceAccount = JSON.parse(serviceAccountData);
} catch (error) {
  console.error('❌ Error loading service account key:');
  console.error('   Make sure serviceAccountKey.json exists in the project root');
  console.error('   Download it from: Firebase Console → Project Settings → Service Accounts');
  process.exit(1);
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Helper function to create SHA-256 hash
function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

// Check if custom questions file is provided
const customFile = process.argv[2];
let testQuestions;

if (customFile) {
  console.log(`📂 Loading questions from: ${customFile}\n`);
  try {
    const filePath = path.resolve(__dirname, customFile);
    const fileContent = fs.readFileSync(filePath, 'utf8');
    testQuestions = JSON.parse(fileContent);
    console.log(`✅ Loaded ${testQuestions.length} questions from file\n`);
  } catch (error) {
    console.error(`❌ Error loading file: ${error.message}`);
    process.exit(1);
  }
} else {
  console.log('📝 Using built-in sample questions\n');
}

// Sample test questions (used if no file provided)

// Use custom questions if loaded, otherwise use sample questions
if (!testQuestions) {
  testQuestions = [
    {
      title: "Two Sum",
      language: "JavaScript",
      difficulty: "Beginner",
      description: "Given an array of integers nums and an integer target, return indices of the two numbers that add up to target.",
      starterCode: `function twoSum(nums, target) {\n  // Your code here\n}`,
      solution: `function twoSum(nums, target) {\n  const map = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const complement = target - nums[i];\n    if (map.has(complement)) {\n      return [map.get(complement), i];\n    }\n    map.set(nums[i], i);\n  }\n  return [];\n}`,
      testCases: [
        { input: { nums: [2, 7, 11, 15], target: 9 }, expected: [0, 1] },
        { input: { nums: [3, 2, 4], target: 6 }, expected: [1, 2] },
        { input: { nums: [3, 3], target: 6 }, expected: [0, 1] }
      ]
    },
    {
      title: "Reverse String",
      language: "JavaScript",
      difficulty: "Beginner",
      description: "Write a function that reverses a string. The input string is given as an array of characters.",
      starterCode: `function reverseString(s) {\n  // Your code here\n}`,
      solution: `function reverseString(s) {\n  let left = 0;\n  let right = s.length - 1;\n  while (left < right) {\n    [s[left], s[right]] = [s[right], s[left]];\n    left++;\n    right--;\n  }\n  return s;\n}`,
      testCases: [
        { input: { s: ['h', 'e', 'l', 'l', 'o'] }, expected: ['o', 'l', 'l', 'e', 'h'] },
        { input: { s: ['H', 'a', 'n', 'n', 'a', 'h'] }, expected: ['h', 'a', 'n', 'n', 'a', 'H'] }
      ]
    },
    {
      title: "Palindrome Number",
      language: "JavaScript",
      difficulty: "Beginner",
      description: "Given an integer x, return true if x is a palindrome, and false otherwise.",
      starterCode: `function isPalindrome(x) {\n  // Your code here\n}`,
      solution: `function isPalindrome(x) {\n  if (x < 0) return false;\n  const str = x.toString();\n  return str === str.split('').reverse().join('');\n}`,
      testCases: [
        { input: { x: 121 }, expected: true },
        { input: { x: -121 }, expected: false },
        { input: { x: 10 }, expected: false }
      ]
    }
  ];
}

async function uploadQuestions() {
  console.log('🚀 Starting to upload test questions...\n');
  
  for (const question of testQuestions) {
    try {
      // Create canonical representation for hashing
      const canonical = {
        title: question.title,
        language: question.language,
        difficulty: question.difficulty,
        description: question.description,
        starterCode: question.starterCode,
        testCases: question.testCases,
        solution: question.solution,
        solutionHash: sha256(question.solution),
      };
      
      // Generate content hash as document ID
      const contentHash = sha256(JSON.stringify(canonical));
      
      // Check if question already exists
      const docRef = db.collection('Questions').doc(contentHash);
      const doc = await docRef.get();
      
      if (doc.exists) {
        console.log(`⏭️  Skipping "${question.title}" - already exists`);
        continue;
      }
      
      // Upload question
      await docRef.set({
        question_id: contentHash,
        ...canonical,
        source: 'manual-upload',
        created_at: admin.firestore.FieldValue.serverTimestamp(),
      });
      
      console.log(`✅ Uploaded: "${question.title}" (${question.difficulty})`);
      
    } catch (error) {
      console.error(`❌ Error uploading "${question.title}":`, error.message);
    }
  }
  
  console.log('\n🎉 Upload complete!');
  process.exit(0);
}

// Run the upload
uploadQuestions().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
