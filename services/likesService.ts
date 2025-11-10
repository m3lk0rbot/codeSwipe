import { db } from './firebase';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';

export interface Like {
  like_id?: string;
  user_id: string;
  question_id: string;
  created_at: Date;
}

/**
 * Add a like for a question
 */
export async function likeQuestion(userId: string, questionId: string): Promise<string> {
  try {
    // Check if user has already liked this question
    const existingLike = await hasUserLikedQuestion(userId, questionId);
    if (existingLike) {
      throw new Error('Question already liked');
    }

    const likeData = {
      user_id: userId,
      question_id: questionId,
      created_at: new Date()
    };

    const docRef = await addDoc(collection(db, 'Likes'), likeData);
    console.log('Like saved with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error saving like:', error);
    throw error;
  }
}

/**
 * Remove a like for a question
 */
export async function unlikeQuestion(userId: string, questionId: string): Promise<void> {
  try {
    const q = query(
      collection(db, 'Likes'),
      where('user_id', '==', userId),
      where('question_id', '==', questionId)
    );

    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const likeDoc = querySnapshot.docs[0];
      await deleteDoc(doc(db, 'Likes', likeDoc.id));
      console.log('Like removed');
    }
  } catch (error) {
    console.error('Error removing like:', error);
    throw error;
  }
}

/**
 * Check if user has liked a question
 */
export async function hasUserLikedQuestion(userId: string, questionId: string): Promise<boolean> {
  try {
    const q = query(
      collection(db, 'Likes'),
      where('user_id', '==', userId),
      where('question_id', '==', questionId)
    );

    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking if question liked:', error);
    return false;
  }
}

/**
 * Get user's liked questions
 */
export async function getUserLikes(userId: string): Promise<Like[]> {
  try {
    const q = query(
      collection(db, 'Likes'),
      where('user_id', '==', userId)
    );

    const querySnapshot = await getDocs(q);
    const likes: Like[] = [];

    querySnapshot.forEach((doc) => {
      likes.push({
        like_id: doc.id,
        ...doc.data()
      } as Like);
    });

    // Sort by created_at (most recent first)
    likes.sort((a, b) => {
      const dateA = a.created_at instanceof Date ? a.created_at : new Date(a.created_at);
      const dateB = b.created_at instanceof Date ? b.created_at : new Date(b.created_at);
      return dateB.getTime() - dateA.getTime();
    });

    return likes;
  } catch (error) {
    console.error('Error fetching user likes:', error);
    throw error;
  }
}

/**
 * Get like count for a question
 */
export async function getQuestionLikeCount(questionId: string): Promise<number> {
  try {
    const q = query(
      collection(db, 'Likes'),
      where('question_id', '==', questionId)
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.size;
  } catch (error) {
    console.error('Error getting like count:', error);
    return 0;
  }
}

/**
 * Toggle like status for a question
 */
export async function toggleQuestionLike(userId: string, questionId: string): Promise<boolean> {
  try {
    const isLiked = await hasUserLikedQuestion(userId, questionId);
    
    if (isLiked) {
      await unlikeQuestion(userId, questionId);
      return false; // Now unliked
    } else {
      await likeQuestion(userId, questionId);
      return true; // Now liked
    }
  } catch (error) {
    console.error('Error toggling like:', error);
    throw error;
  }
}

/**
 * Get user's liked questions with full question details
 */
export async function getUserLikedQuestionsWithDetails(userId: string) {
  try {
    const likes = await getUserLikes(userId);
    
    // Fetch question details for each like
    const likedQuestionsPromises = likes.map(async (like) => {
      try {
        const questionDoc = await getDocs(
          query(collection(db, 'Questions'), where('question_id', '==', like.question_id))
        );
        
        if (!questionDoc.empty) {
          const questionData = questionDoc.docs[0].data();
          return {
            like_id: like.like_id,
            created_at: like.created_at,
            question: {
              question_id: like.question_id,
              title: questionData.title || 'Unknown Question',
              description: questionData.description || '',
              difficulty: questionData.difficulty || 'Intermediate',
              language: questionData.language || 'JavaScript',
            }
          };
        }
        return null;
      } catch (error) {
        console.error('Error fetching question details:', error);
        return null;
      }
    });

    const likedQuestions = await Promise.all(likedQuestionsPromises);
    return likedQuestions.filter(q => q !== null);
  } catch (error) {
    console.error('Error fetching liked questions with details:', error);
    return [];
  }
}