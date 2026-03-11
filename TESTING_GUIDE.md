# 🧪 Testing Guide: Local-First LMS

## ✅ Server is Running!

Your development server is running at:
```
http://localhost:3001
```

---

## 🚀 Quick Test (5 Minutes)

### Step 1: Visit the Test Page

Open your browser and go to:
```
http://localhost:3001/dashboard/lessons/test
```

This is a special test page with automated testing tools.

### Step 2: Run Automated Tests

1. Click the **"Run Full Test"** button
2. Wait 2-3 seconds
3. You should see:
   - ✅ Green success message
   - Console output showing test progress
   - Test results JSON

### Step 3: View the Lessons

Navigate to:
```
http://localhost:3001/dashboard/lessons
```

You should see:
- ✅ List of 5 sample lessons
- ✅ Published/Draft badges
- ✅ Offline indicators
- ✅ Sync status (top right)
- ✅ Stats dashboard at bottom

### Step 4: Inspect Encrypted Data

1. Press **F12** to open DevTools
2. Go to **Application** tab
3. Expand **IndexedDB** → **lms_local_db** → **lessons**
4. Click on any lesson
5. Notice the `encrypted` field:
   ```json
   {
     "id": "lesson_123...",
     "encrypted": {
       "ciphertext": "A7sK9mP2...",  // ← Can't read this!
       "iv": "xY2nQ1..."
     },
     "subjectId": "biology",
     "updatedAt": 1709123456
   }
   ```

The content is **encrypted**! The server can never read it.

---

## 🔬 Manual Testing in Console

### Open Browser Console

Press **F12** → Go to **Console** tab

### Available Test Commands

```javascript
// Run complete test suite
testLMS.runFullTest()

// Initialize encryption keys only
testLMS.initKeys()

// Create a single lesson
testLMS.createLesson()

// Create multiple lessons (default: 5)
testLMS.createMultiple(10)  // Creates 10 lessons

// View all lessons (decrypted)
testLMS.viewLessons()

// Clear all test data
testLMS.clearData()
```

### Example Testing Session

```javascript
// 1. Initialize keys
await testLMS.initKeys('my-user-id')

// 2. Create 3 lessons
await testLMS.createMultiple(3, 'my-user-id')

// 3. View them (automatically decrypted)
const lessons = await testLMS.viewLessons('my-user-id')
console.table(lessons)

// 4. Clean up
await testLMS.clearData()
```

---

## 📴 Test Offline Mode

### Method 1: DevTools

1. Open DevTools (F12)
2. Go to **Network** tab
3. Check **Offline** ✅
4. Refresh the page (Ctrl+R)
5. **App still works!** Lessons load from IndexedDB
6. Yellow offline banner appears at top

### Method 2: Disconnect WiFi

1. Disconnect from WiFi/ethernet
2. Refresh the page
3. Everything still works!
4. Create new lessons → Saved locally
5. Reconnect → Changes will sync (when implemented)

---

## 🔍 Detailed Testing Checklist

### ✅ Encryption Tests

- [ ] Keys are generated on first use
- [ ] Keys stored as non-extractable in IndexedDB
- [ ] Lesson content encrypted before storage
- [ ] Encrypted data visible in DevTools
- [ ] Data successfully decrypted on retrieval
- [ ] Different users have different keys

### ✅ Storage Tests

- [ ] Lessons persist after page refresh
- [ ] Multiple lessons can be stored
- [ ] Lessons can be filtered/queried
- [ ] Storage stats are accurate
- [ ] Data survives browser restart

### ✅ Offline Tests

- [ ] App loads without network
- [ ] Lessons display from local storage
- [ ] Offline banner appears
- [ ] Sync status shows "offline"
- [ ] Can create/edit lessons offline
- [ ] Changes save to IndexedDB

### ✅ UI/UX Tests

- [ ] Lessons list displays correctly
- [ ] Empty state shows when no lessons
- [ ] Loading skeletons appear
- [ ] Sync status updates
- [ ] Published/Draft badges work
- [ ] Offline indicators display
- [ ] Stats dashboard accurate

### ✅ Performance Tests

- [ ] Initial load < 2 seconds
- [ ] Lesson decryption < 10ms
- [ ] List of 100 lessons loads quickly
- [ ] No UI freezing/lag
- [ ] Smooth scrolling

---

## 🐛 Troubleshooting

### Issue: "Master key not found"

**Symptom**: Error when trying to save/load lessons

**Solution**:
```javascript
// In browser console, run:
await testLMS.initKeys('your-user-id')
```

### Issue: Lessons not appearing

**Symptom**: Empty list even after creating lessons

**Solutions**:
1. Check browser console for errors
2. Verify keys are initialized
3. Make sure you're using the same userId
4. Try refreshing the page

```javascript
// Debug in console:
await testLMS.viewLessons()  // Should show lessons
```

### Issue: Encryption errors

**Symptom**: "Failed to decrypt" errors

**Solution**:
```javascript
// Clear all data and start fresh:
await testLMS.clearData()
// Refresh page, then run:
await testLMS.runFullTest()
```

### Issue: Page won't load

**Symptom**: White screen or loading forever

**Solution**:
1. Check server is running (should be on port 3001)
2. Check browser console for errors
3. Try clearing browser cache
4. Restart dev server:
   ```bash
   # Stop server (Ctrl+C)
   # Restart:
   npm run dev
   ```

---

## 📊 Expected Results

### After Running `testLMS.runFullTest()`

**Console Output:**
```
🧪 Starting full test suite...

Step 1: Initialize encryption keys
🔑 Initializing encryption keys...
✅ Keys initialized successfully!

Step 2: Create sample lessons
📚 Creating 5 sample lessons...
📝 Creating sample lesson 1...
✅ Lesson 1 created and encrypted!
📝 Creating sample lesson 2...
✅ Lesson 2 created and encrypted!
... (3 more lessons)

Step 3: View all lessons
📖 Fetching all lessons...
✅ Found 5 lessons:
┌─────────┬──────────────────────────────┬──────────┬───────────┬────────┬────────┐
│ (index) │            Title             │ Subject  │ Published │ Offline│ Blocks │
├─────────┼──────────────────────────────┼──────────┼───────────┼────────┼────────┤
│    0    │ Sample Lesson 1: Intro to... │ physics  │   'No'    │  'No'  │   2    │
│    1    │ Sample Lesson 2: Intro to... │ chemistry│   'Yes'   │  'Yes' │   2    │
... (3 more rows)

Step 4: Check storage usage
📊 Storage: 0.05 MB / 50000.00 MB
   Usage: 0.00%

✅ All tests passed!

🎉 Success! Your local-first LMS is working perfectly!
```

**Lessons Page:**
- Shows 5 lessons
- Stats: 5 Total, 2-3 Published, 2-3 Offline
- Clean, minimalist UI
- Sync status shows "synced" or "offline"

---

## 🎯 What to Test Next

### 1. Create Your Own Lesson

Try creating a lesson manually:

```javascript
const myLesson = {
  id: 'my-lesson-' + Date.now(),
  title: 'My First Encrypted Lesson',
  description: 'Testing manual lesson creation',
  content: [
    {
      id: '1',
      type: 'text',
      order: 0,
      data: { content: 'Hello, encrypted world!' }
    }
  ],
  subjectId: 'test-subject',
  createdById: 'test-user-123',
  createdAt: Date.now(),
  updatedAt: Date.now(),
  isPublished: true,
  assignedTo: ['all'],
  attachments: [],
  isDownloaded: false,
  isPinned: false
}

// Import and save
import { saveEncrypted, STORES } from '@/lib/db/indexeddb'
await saveEncrypted(STORES.LESSONS, myLesson, 'test-user-123')

// Verify it's there
await testLMS.viewLessons()
```

### 2. Test Multi-User Encryption

```javascript
// User 1
await testLMS.initKeys('user-1')
await testLMS.createLesson('user-1', 1)

// User 2 (different keys!)
await testLMS.initKeys('user-2')
await testLMS.createLesson('user-2', 1)

// User 1 can't decrypt User 2's lessons
// (without key exchange - coming in Phase 7)
```

### 3. Test Storage Limits

```javascript
// Create many lessons to test performance
await testLMS.createMultiple(100)

// View them all
const lessons = await testLMS.viewLessons()
console.log(`Created ${lessons.length} lessons`)

// Check storage usage
const stats = await navigator.storage.estimate()
console.log(`Using ${(stats.usage / 1024 / 1024).toFixed(2)} MB`)
```

---

## 📸 Screenshots to Take

For documentation/demonstration:

1. **Lessons List Page**
   - Full page view showing all lessons
   - Sync status indicator
   - Stats dashboard

2. **DevTools - Encrypted Data**
   - IndexedDB view showing encrypted field
   - Ciphertext that's unreadable

3. **Offline Mode**
   - Yellow offline banner
   - Lessons still loading
   - "Offline" sync status

4. **Test Page**
   - Running automated tests
   - Console output showing success
   - Test results panel

---

## ✅ Success Criteria

You know it's working when:

- ✅ Tests pass without errors
- ✅ Lessons appear in the UI
- ✅ Data is encrypted in IndexedDB
- ✅ App works offline
- ✅ Sync status updates correctly
- ✅ No console errors
- ✅ Fast performance (<100ms loads)

---

## 🎓 Understanding What You're Testing

### The Encryption Flow

```
User Creates Lesson
       ↓
React Hook (useLessons)
       ↓
saveEncrypted() function
       ↓
Get user's master key from IndexedDB
       ↓
Encrypt lesson content with AES-256-GCM
       ↓
Store encrypted blob in IndexedDB
       ↓
Done! (Server never sees plaintext)
```

### The Retrieval Flow

```
User Opens Lessons Page
       ↓
React Hook (useLessons)
       ↓
getAllEncrypted() function
       ↓
Fetch encrypted blobs from IndexedDB
       ↓
Get user's master key
       ↓
Decrypt each lesson
       ↓
Display in UI (plaintext)
```

---

## 📞 Need Help?

### Check These First

1. **Browser Console**: Look for error messages
2. **Network Tab**: Verify offline mode is working
3. **Application Tab**: Inspect IndexedDB structure
4. **Server Logs**: Check terminal for errors

### Common Questions

**Q: Can I use this in production?**
A: The encryption foundation is production-ready, but you'll need to add:
- User authentication integration
- Server-side key exchange API
- Sync implementation
- Error boundaries
- User onboarding

**Q: Is the encryption secure?**
A: Yes! We're using:
- AES-256-GCM (military-grade)
- Web Crypto API (hardware-accelerated)
- Non-extractable keys
- Zero-knowledge architecture

**Q: What happens if I clear browser data?**
A: All local lessons will be lost (unless synced to server). This is why Phase 7 (sync) is important.

**Q: Can teachers and students share lessons?**
A: Not yet. You need to implement:
- Public key exchange (Phase 4)
- Multi-recipient encryption (already coded!)
- Sync relay (Phase 8)

---

## 🎉 Next Steps After Testing

Once you've verified everything works:

1. **Integrate with Authentication**
   - Call `initializeUserKeys()` on user registration
   - Store public keys in database
   - Use real user IDs from NextAuth session

2. **Build Lesson Editor**
   - Rich text editor (Tiptap/Slate)
   - Image/video upload
   - Save to IndexedDB on every change

3. **Build Quiz System**
   - Quiz builder UI
   - Question types (MCQ, drag-drop, etc.)
   - Auto-grading logic

4. **Implement Sync**
   - Server relay for encrypted blobs
   - WebRTC P2P sync
   - Conflict resolution

---

**You're all set! Start testing!** 🚀

Open http://localhost:3001/dashboard/lessons/test and click "Run Full Test"
