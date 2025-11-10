import { db } from './firebase';
import { collection, addDoc, query, where, getDocs, orderBy, doc, getDoc } from 'firebase/firestore';

export interface Achievement {
  ac_id?: string;
  user_id: string;
  question_id: string;
  question: {
    title: string;
    language: string;
    difficulty: string;
    description: string;
  };
  solution: string;
  datetime: Date;
}

/**
 * Save a solved challenge to achievements
 */
export async function saveAchievement(achievement: Omit<Achievement, 'ac_id' | 'datetime'>): Promise<string> {
  try {
    const achievementData = {
      ...achievement,
      datetime: new Date()
    };

    const docRef = await addDoc(collection(db, 'Achievements'), achievementData);
    console.log('Achievement saved with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error saving achievement:', error);
    throw error;
  }
}

/**
 * Get user's achievements with joined question data
 */
export async function getUserAchievements(userId: string): Promise<any[]> {
  try {
    // Get achievements for the user
    const q = query(
      collection(db, 'Achievements'),
      where('user_id', '==', userId)
    );

    const querySnapshot = await getDocs(q);
    const achievements: any[] = [];

    // For each achievement, fetch the corresponding question data
    for (const achievementDoc of querySnapshot.docs) {
      const achievementData = achievementDoc.data();
      
      try {
        // Fetch question details from Questions table
        const questionRef = doc(db, 'Questions', achievementData.question_id);
        const questionSnap = await getDoc(questionRef);
        
        if (questionSnap.exists()) {
          const questionData = questionSnap.data();
          
          achievements.push({
            ac_id: achievementDoc.id,
            completionDate: achievementData.datetime?.toDate() || new Date(),
            question_id: achievementData.question_id,
            user_id: achievementData.user_id,
            // Joined data from Questions table
            title: questionData.title || 'Unknown Challenge',
            description: questionData.description || 'No description available',
            difficulty: questionData.difficulty || 'Intermediate',
            language: questionData.language || 'JavaScript',
            solution: achievementData.solution || ''
          });
        } else {
          // Fallback to stored question data if Questions table entry doesn't exist
          achievements.push({
            ac_id: achievementDoc.id,
            completionDate: achievementData.datetime?.toDate() || new Date(),
            question_id: achievementData.question_id,
            user_id: achievementData.user_id,
            title: achievementData.question?.title || 'Unknown Challenge',
            description: achievementData.question?.description || 'No description available',
            difficulty: achievementData.question?.difficulty || 'Intermediate',
            language: achievementData.question?.language || 'JavaScript',
            solution: achievementData.solution || ''
          });
        }
      } catch (error) {
        console.warn('Error fetching question data for achievement:', achievementDoc.id, error);
        // Add achievement with fallback data
        achievements.push({
          ac_id: achievementDoc.id,
          completionDate: achievementData.datetime?.toDate() || new Date(),
          question_id: achievementData.question_id,
          user_id: achievementData.user_id,
          title: achievementData.question?.title || 'Unknown Challenge',
          description: achievementData.question?.description || 'No description available',
          difficulty: achievementData.question?.difficulty || 'Intermediate',
          language: achievementData.question?.language || 'JavaScript',
          solution: achievementData.solution || ''
        });
      }
    }

    // Sort by completion date (most recent first)
    achievements.sort((a, b) => b.completionDate.getTime() - a.completionDate.getTime());

    return achievements;
  } catch (error) {
    console.error('Error fetching achievements:', error);
    throw error;
  }
}

/**
 * Check if user has already solved this question
 */
export async function hasUserSolvedQuestion(userId: string, questionId: string): Promise<boolean> {
  try {
    const q = query(
      collection(db, 'Achievements'),
      where('user_id', '==', userId),
      where('question_id', '==', questionId)
    );

    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking if question solved:', error);
    return false;
  }
}

/**
 * Get achievement statistics for user
 */
export async function getUserStats(userId: string) {
  try {
    const achievements = await getUserAchievements(userId);
    
    const stats = {
      totalSolved: achievements.length,
      byDifficulty: {
        Beginner: 0,
        Intermediate: 0,
        Advanced: 0,
        Expert: 0
      },
      byLanguage: {} as Record<string, number>,
      recentSolves: achievements.slice(0, 5)
    };

    achievements.forEach(achievement => {
      // Count by difficulty - handle both question object and direct properties
      const difficulty = achievement.question?.difficulty || achievement.difficulty || 'Intermediate';
      if (difficulty in stats.byDifficulty) {
        stats.byDifficulty[difficulty as keyof typeof stats.byDifficulty]++;
      }

      // Count by language - handle both question object and direct properties
      const lang = achievement.question?.language || achievement.language || 'JavaScript';
      stats.byLanguage[lang] = (stats.byLanguage[lang] || 0) + 1;
    });

    return stats;
  } catch (error) {
    console.error('Error getting user stats:', error);
    throw error;
  }
}