/**
 * Test Page for Local-First LMS
 * Use this page to test encryption and local storage
 */

'use client';

import { useEffect, useState } from 'react';
import { CheckCircle, Loader2, AlertCircle, Terminal } from 'lucide-react';
import { showAppConfirm } from '@/lib/appMessageBox';

export default function TestPage() {
  const [testStatus, setTestStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
  const [testResults, setTestResults] = useState<unknown>(null);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    // Load test helpers
    import('@/lib/test-helpers').then(() => {
      addLog('✅ Test helpers loaded successfully');
      addLog('💡 Open browser console to run manual tests');
    });
  }, []);

  const addLog = (message: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  const runTest = async () => {
    setTestStatus('running');
    setLogs([]);
    addLog('🧪 Starting automated test suite...');

    const originalLog = console.log;

    try {
      // Import test helpers
      const { runFullTest } = await import('@/lib/test-helpers');

      // Intercept console.log
      console.log = (...args: unknown[]) => {
        addLog(args.join(' '));
        originalLog(...args);
      };

      // Run test
      const result = await runFullTest('test-user-123');

      setTestResults(result);
      setTestStatus(result.success ? 'success' : 'error');
      addLog(result.success ? '✅ All tests passed!' : '❌ Tests failed');
    } catch (error) {
      setTestStatus('error');
      setTestResults({ error: (error as Error).message });
      addLog(`❌ Error: ${(error as Error).message}`);
    } finally {
      console.log = originalLog;
    }
  };

  const clearData = async () => {
    const confirmed = await showAppConfirm('This will delete all test data. Continue?', {
      title: 'Clear Test Data',
      variant: 'warning',
      confirmText: 'Clear Data',
    });
    if (!confirmed) return;

    addLog('🗑️ Clearing test data...');
    try {
      const { clearTestData } = await import('@/lib/test-helpers');
      await clearTestData();
      addLog('✅ Data cleared successfully');
      setTestStatus('idle');
      setTestResults(null);
    } catch (error) {
      addLog(`❌ Error clearing data: ${(error as Error).message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            🧪 Local-First LMS Test Suite
          </h1>
          <p className="text-gray-600">
            Test encryption, local storage, and offline functionality
          </p>
        </div>

        {/* Test Controls */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Test Controls</h2>
          <div className="flex gap-4">
            <button
              onClick={runTest}
              disabled={testStatus === 'running'}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
                ${
                  testStatus === 'running'
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }
              `}
            >
              {testStatus === 'running' ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Running Tests...
                </>
              ) : (
                <>
                  <Terminal className="w-4 h-4" />
                  Run Full Test
                </>
              )}
            </button>

            <button
              onClick={clearData}
              disabled={testStatus === 'running'}
              className="px-4 py-2 border border-red-300 text-red-700 rounded-lg font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              Clear Test Data
            </button>
          </div>
        </div>

        {/* Test Results */}
        {testStatus !== 'idle' && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              {testStatus === 'success' && (
                <>
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <h2 className="text-lg font-semibold text-green-900">Tests Passed!</h2>
                </>
              )}
              {testStatus === 'error' && (
                <>
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <h2 className="text-lg font-semibold text-red-900">Tests Failed</h2>
                </>
              )}
              {testStatus === 'running' && (
                <>
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                  <h2 className="text-lg font-semibold text-blue-900">Running Tests...</h2>
                </>
              )}
            </div>

            {testResults !== null && (
              <div className="bg-gray-50 rounded p-4 mt-4">
                <pre className="text-xs text-gray-700 overflow-x-auto">
                  {JSON.stringify(testResults, null, 2) ?? "null"}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Console Logs */}
        <div className="bg-gray-900 rounded-lg shadow-sm border border-gray-700 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Terminal className="w-4 h-4 text-green-400" />
            <h2 className="text-lg font-semibold text-white">Console Output</h2>
          </div>
          <div className="bg-black rounded p-4 h-96 overflow-y-auto font-mono text-sm">
            {logs.length === 0 ? (
              <p className="text-gray-500">No logs yet. Run a test to see output.</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="text-green-400 mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Manual Testing Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            📖 Manual Testing Instructions
          </h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p>Open your browser console (F12) and try these commands:</p>
            <div className="bg-white rounded p-3 font-mono text-xs space-y-1 mt-2">
              <div>
                <span className="text-gray-500">{"// Run complete test suite"}</span>
              </div>
              <div className="text-blue-600">testLMS.runFullTest()</div>

              <div className="mt-3">
                <span className="text-gray-500">{"// Create individual lesson"}</span>
              </div>
              <div className="text-blue-600">testLMS.createLesson()</div>

              <div className="mt-3">
                <span className="text-gray-500">{"// View all lessons (decrypted)"}</span>
              </div>
              <div className="text-blue-600">testLMS.viewLessons()</div>

              <div className="mt-3">
                <span className="text-gray-500">{"// Clear all test data"}</span>
              </div>
              <div className="text-blue-600">testLMS.clearData()</div>
            </div>
          </div>
        </div>

        {/* DevTools Inspection Guide */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-semibold text-purple-900 mb-3">
            🔍 Inspect Encrypted Data
          </h3>
          <div className="space-y-2 text-sm text-purple-800">
            <p>See the encryption in action:</p>
            <ol className="list-decimal list-inside space-y-1 mt-2">
              <li>Open DevTools (F12)</li>
              <li>Go to <strong>Application</strong> tab</li>
              <li>
                Expand <strong>IndexedDB</strong> → <strong>lms_local_db</strong> →{' '}
                <strong>lessons</strong>
              </li>
              <li>Click on a lesson to see encrypted data</li>
              <li>
                Notice the <code className="bg-purple-100 px-1 rounded">encrypted</code> field
                with ciphertext
              </li>
            </ol>
          </div>
        </div>

        {/* Test Offline Mode */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 mt-6">
          <h3 className="text-lg font-semibold text-amber-900 mb-3">
            📴 Test Offline Functionality
          </h3>
          <div className="space-y-2 text-sm text-amber-800">
            <ol className="list-decimal list-inside space-y-1">
              <li>Run the test suite to create sample lessons</li>
              <li>
                Go to DevTools → <strong>Network</strong> tab
              </li>
              <li>
                Check <strong>Offline</strong> ✅
              </li>
              <li>
                Navigate to <strong>/dashboard/lessons</strong>
              </li>
              <li>Lessons still load instantly from IndexedDB! 🎉</li>
              <li>Notice the yellow offline banner</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
