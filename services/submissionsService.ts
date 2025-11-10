import { db } from './firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { TestResult } from '../types';

export async function recordSubmission(params: {
  userId: string;
  questionId: string;
  userCode: string;
  results: TestResult[];
}): Promise<{ passedAll: boolean }>{
  const { userId, questionId, userCode, results } = params;
  
  // Guard against undefined values
  if (!userId || !questionId || !userCode || !results) {
    console.error('recordSubmission called with undefined values:', { userId, questionId, userCode, results });
    return { passedAll: false };
  }
  
  const submissions = collection(db, 'Submissions');
  const subRef = doc(submissions);
  const passedAll = results.every(r => r.passed);
  await setDoc(subRef, {
    submission_id: subRef.id,
    user_id: userId,
    question_id: questionId,
    user_code: userCode,
    result: results,
    created_at: serverTimestamp(),
    passed_all_tests: passedAll,
  });
  if (passedAll) {
    const achievements = collection(db, 'Achievements');
    const acRef = doc(achievements);
    await setDoc(acRef, {
      ac_id: acRef.id,
      user_id: userId,
      question_id: questionId,
      completionDate: serverTimestamp(),
    });
  }
  return { passedAll };
}


