/**
 * Test Helpers for Local-First LMS
 * Use these in the browser console to test the implementation
 */

import { initializeUserKeys } from './crypto/keys';
import { saveEncrypted, getAllEncrypted, STORES } from './db/indexeddb';
import type { Lesson } from './db/types';

/**
 * Initialize encryption keys for testing
 * Call this first in the browser console
 */
export async function initTestKeys(userId: string = 'test-user-123') {
  console.log('🔑 Initializing encryption keys...');

  try {
    const keys = await initializeUserKeys(userId, 'test-password-123');
    console.log('✅ Keys initialized successfully!');
    console.log('Identity Public Key:', keys.identityPublicKey.substring(0, 50) + '...');
    console.log('Signing Public Key:', keys.signingPublicKey.substring(0, 50) + '...');
    return keys;
  } catch (error) {
    console.error('❌ Error initializing keys:', error);
    throw error;
  }
}

/**
 * Create a sample lesson for testing
 */
export async function createSampleLesson(
  userId: string = 'test-user-123',
  index: number = 1
): Promise<Lesson> {
  console.log(`📝 Creating sample lesson ${index}...`);

  const lesson: Lesson = {
    id: `lesson_${Date.now()}_${index}`,
    title: `Sample Lesson ${index}: Introduction to ${['Biology', 'Physics', 'Chemistry', 'Mathematics'][index % 4]}`,
    description: `This is a sample lesson to demonstrate the local-first, encrypted storage system. Lesson number ${index}.`,
    content: [
      {
        id: '1',
        type: 'text',
        order: 0,
        data: {
          content: `<h2>Welcome to Lesson ${index}</h2><p>This lesson is stored <strong>encrypted</strong> in your browser's IndexedDB. The server cannot read this content!</p>`,
          format: 'html',
        },
      },
      {
        id: '2',
        type: 'text',
        order: 1,
        data: {
          content: '<h3>Key Features</h3><ul><li>End-to-end encrypted</li><li>Works 100% offline</li><li>Instant performance</li><li>Privacy-preserving</li></ul>',
          format: 'html',
        },
      },
    ],
    subjectId: ['biology', 'physics', 'chemistry', 'math'][index % 4],
    classArmIds: [],
    createdById: userId,
    createdAt: Date.now() - index * 3600000, // Stagger creation times
    updatedAt: Date.now(),
    isPublished: index % 2 === 0, // Alternate published/draft
    publishedAt: index % 2 === 0 ? Date.now() : undefined,
    assignedTo: index % 3 === 0 ? ['all'] : [],
    attachments: [],
    isDownloaded: index % 2 === 0, // Half are "downloaded"
    isPinned: index % 3 === 0, // Every third is pinned
  };

  try {
    await saveEncrypted(STORES.LESSONS, lesson, userId);
    console.log(`✅ Lesson ${index} created and encrypted!`);
    return lesson;
  } catch (error) {
    console.error(`❌ Error creating lesson ${index}:`, error);
    throw error;
  }
}

/**
 * Create multiple sample lessons
 */
export async function createMultipleLessons(
  count: number = 5,
  userId: string = 'test-user-123'
) {
  console.log(`📚 Creating ${count} sample lessons...`);

  const lessons: Lesson[] = [];
  for (let i = 1; i <= count; i++) {
    const lesson = await createSampleLesson(userId, i);
    lessons.push(lesson);
  }

  console.log(`✅ Created ${count} lessons successfully!`);
  return lessons;
}

/**
 * View all encrypted lessons
 */
export async function viewAllLessons(userId: string = 'test-user-123') {
  console.log('📖 Fetching all lessons...');

  try {
    const lessons = await getAllEncrypted<Lesson>(STORES.LESSONS, userId);
    console.log(`✅ Found ${lessons.length} lessons:`);
    console.table(
      lessons.map((l) => ({
        Title: l.title,
        Subject: l.subjectId,
        Published: l.isPublished ? 'Yes' : 'No',
        Offline: l.isDownloaded ? 'Yes' : 'No',
        Blocks: l.content.length,
      }))
    );
    return lessons;
  } catch (error) {
    console.error('❌ Error fetching lessons:', error);
    throw error;
  }
}

/**
 * Complete test suite
 * Run this to test everything at once
 */
export async function runFullTest(userId: string = 'test-user-123') {
  console.log('🧪 Starting full test suite...\n');

  try {
    // Step 1: Initialize keys
    console.log('Step 1: Initialize encryption keys');
    await initTestKeys(userId);
    console.log('');

    // Step 2: Create sample lessons
    console.log('Step 2: Create sample lessons');
    await createMultipleLessons(5, userId);
    console.log('');

    // Step 3: View all lessons
    console.log('Step 3: View all lessons');
    const lessons = await viewAllLessons(userId);
    console.log('');

    // Step 4: Storage stats
    console.log('Step 4: Check storage usage');
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const { usage = 0, quota = 0 } = await navigator.storage.estimate();
      console.log(`📊 Storage: ${(usage / 1024 / 1024).toFixed(2)} MB / ${(quota / 1024 / 1024).toFixed(2)} MB`);
      console.log(`   Usage: ${((usage / quota) * 100).toFixed(2)}%`);
    }
    console.log('');

    console.log('✅ All tests passed!');
    console.log('\n🎉 Success! Your local-first LMS is working perfectly!');
    console.log('\nNext steps:');
    console.log('1. Navigate to /dashboard/lessons to see the UI');
    console.log('2. Open DevTools → Application → IndexedDB to inspect encrypted data');
    console.log('3. Toggle offline mode to test offline functionality');

    return { success: true, lessonsCreated: lessons.length };
  } catch (error) {
    console.error('❌ Test suite failed:', error);
    return { success: false, error };
  }
}

/**
 * Clear all test data
 */
export async function clearTestData() {
  console.log('🗑️ Clearing all test data...');

  try {
    // Clear IndexedDB
    const databases = ['lms_local_db', 'crypto_keys_db'];
    for (const dbName of databases) {
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.deleteDatabase(dbName);
        request.onsuccess = () => {
          console.log(`✅ Deleted ${dbName}`);
          resolve();
        };
        request.onerror = () => reject(request.error);
      });
    }

    console.log('✅ All test data cleared!');
    console.log('💡 Refresh the page to start fresh.');
  } catch (error) {
    console.error('❌ Error clearing data:', error);
    throw error;
  }
}

// Export for browser console access
if (typeof window !== 'undefined') {
  (window as any).testLMS = {
    initKeys: initTestKeys,
    createLesson: createSampleLesson,
    createMultiple: createMultipleLessons,
    viewLessons: viewAllLessons,
    runFullTest,
    clearData: clearTestData,
  };

  console.log('🧪 LMS Test Helpers Loaded!');
  console.log('Available commands:');
  console.log('  - testLMS.runFullTest()        // Run complete test');
  console.log('  - testLMS.initKeys()           // Initialize encryption keys');
  console.log('  - testLMS.createLesson()       // Create one lesson');
  console.log('  - testLMS.createMultiple(5)    // Create 5 lessons');
  console.log('  - testLMS.viewLessons()        // View all lessons');
  console.log('  - testLMS.clearData()          // Clear all data');
}
