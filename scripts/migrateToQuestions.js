// Migration script to move data from coding_challenges to Questions collection
// Run with: node scripts/migrateToQuestions.js

import admin from 'firebase-admin';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');

let serviceAccount;
try {
  const serviceAccountData = fs.readFileSync(serviceAccountPath, 'utf8');
  serviceAccount = JSON.parse(serviceAccountData);
} catch (error) {
  console.error('❌ Error loading service account key');
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

async function migrateData() {
  console.log('🚀 Starting migration from coding_challenges to Questions...\n');
  
  try {
    // Get all documents from coding_challenges
    const codingChallengesRef = db.collection('coding_challenges');
    const snapshot = await codingChallengesRef.get();
    
    if (snapshot.empty) {
      console.log('⚠️  No documents found in coding_challenges collection');
      return;
    }
    
    console.log(`📊 Found ${snapshot.size} documents to migrate\n`);
    
    let migrated = 0;
    let skipped = 0;
    let errors = 0;
    
    for (const doc of snapshot.docs) {
      try {
        const data = doc.data();
        
        // Check if required fields exist
        if (!data.title || !data.language || !data.solution) {
          console.log(`⏭️  Skipping "${data.title || 'Unknown'}" - missing required fields`);
          skipped++;
          continue;
        }
        
        // Create canonical representation for hashing
        const canonical = {
          title: data.title,
          language: data.language,
          difficulty: data.difficulty || 'Intermediate',
          description: data.description || '',
          starterCode: data.starterCode || '',
          testCases: data.testCases || [],
          solution: data.solution || '',
          solutionHash: sha256(data.solution || ''),
        };
        
        // Generate content hash as document ID
        const contentHash = sha256(JSON.stringify(canonical));
        
        // Check if already exists in Questions
        const questionsRef = db.collection('Questions').doc(contentHash);
        const existingDoc = await questionsRef.get();
        
        if (existingDoc.exists) {
          console.log(`⏭️  Skipping "${data.title}" - already exists in Questions`);
          skipped++;
          continue;
        }
        
        // Migrate to Questions collection
        await questionsRef.set({
          question_id: contentHash,
          ...canonical,
          source: 'migrated-from-coding_challenges',
          created_at: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        console.log(`✅ Migrated: "${data.title}" (${data.language} - ${data.difficulty})`);
        migrated++;
        
      } catch (error) {
        console.error(`❌ Error migrating document ${doc.id}:`, error.message);
        errors++;
      }
    }
    
    console.log('\n📈 Migration Summary:');
    console.log(`   ✅ Migrated: ${migrated}`);
    console.log(`   ⏭️  Skipped: ${skipped}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log('\n🎉 Migration complete!');
    
    // Ask if user wants to delete old collection
    console.log('\n⚠️  Note: The coding_challenges collection still exists.');
    console.log('   You can manually delete it from Firebase Console if no longer needed.');
    
  } catch (error) {
    console.error('❌ Fatal error during migration:', error);
  }
  
  process.exit(0);
}

// Run migration
migrateData().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
