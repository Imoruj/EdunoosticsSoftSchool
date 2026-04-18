'use client';

import { useState } from 'react';
import { useScormApi } from '@/lib/hooks/useScormApi';
import { Loader2, Maximize2, Minimize2 } from 'lucide-react';

interface AdaptPlayerProps {
  lessonId: string;
  courseUrl: string; // The URL to index.html
  title?: string;
}

export function AdaptPlayer({ lessonId, courseUrl, title }: AdaptPlayerProps) {
  const { isReady } = useScormApi(lessonId);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  return (
    <div className={`relative flex flex-col bg-black rounded-xl overflow-hidden shadow-2xl transition-all duration-300 ${
      isFullscreen ? 'fixed inset-0 z-[100] m-0 rounded-none' : 'w-full aspect-video'
    }`}>
      {/* Player Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-800 text-white shrink-0">
        <h3 className="text-sm font-medium truncate">{title || 'Adapt Course'}</h3>
        <button 
          onClick={toggleFullscreen}
          className="p-1 hover:bg-gray-800 rounded transition-colors"
          title={isFullscreen ? 'Minimize' : 'Fullscreen'}
        >
          {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative bg-gray-50 overflow-hidden">
        {loading && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-50/80 backdrop-blur-sm">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-2" />
            <p className="text-sm text-gray-500 font-medium">Loading Course Content...</p>
          </div>
        )}
        
        {isReady ? (
          <iframe
            src={courseUrl}
            className="w-full h-full border-0"
            onLoad={() => setLoading(false)}
            allowFullScreen
            allow="autoplay; encrypted-media"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            Initialising Tracker...
          </div>
        )}
      </div>

      {/* Footer / Progress Hint */}
      {!isFullscreen && (
        <div className="px-4 py-1.5 bg-gray-900/50 text-[10px] text-gray-400 border-t border-gray-800">
          Your progress is automatically saved on each page transition.
        </div>
      )}
    </div>
  );
}
