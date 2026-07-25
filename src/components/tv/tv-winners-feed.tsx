'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WinnerInfo } from '@/types';
import { useAppStore } from '@/stores/app-store';
import { Trophy, Clock, User } from 'lucide-react';

interface TVWinnersFeedProps {
  maxVisible?: number;
}

export function TVWinnersFeed({ maxVisible = 10 }: TVWinnersFeedProps) {
  const { recentWinners } = useAppStore();
  const [showCongrats, setShowCongrats] = useState(false);
  const [latestWinner, setLatestWinner] = useState<WinnerInfo | null>(null);
  const [prevWinnersLength, setPrevWinnersLength] = useState(0);
  const feedRef = useRef<HTMLDivElement>(null);

  // Check if prize is a "losing" result
  const isLosingResult = (winner: WinnerInfo): boolean => {
    const name = winner.prizeName.toLowerCase();
    return name.includes('try again') || name.includes('loser') || name.includes('no prize') || name.includes('nothing');
  };

  // Adjust state when recentWinners length changes (React pattern for syncing state with props)
  if (recentWinners.length !== prevWinnersLength && recentWinners.length > prevWinnersLength && recentWinners.length > 0) {
    setPrevWinnersLength(recentWinners.length);
    const newWinner = recentWinners[0];
    if (!isLosingResult(newWinner)) {
      setLatestWinner(newWinner);
      setShowCongrats(true);
    }
  } else if (recentWinners.length !== prevWinnersLength) {
    setPrevWinnersLength(recentWinners.length);
  }

  // Auto-hide congrats banner after 5 seconds (setTimeout callback setState is allowed)
  useEffect(() => {
    if (!showCongrats) return;
    const timer = setTimeout(() => {
      setShowCongrats(false);
    }, 5000);
    return () => clearTimeout(timer);
  }, [showCongrats]);

  // Auto-scroll to show latest entries
  useEffect(() => {
    if (feedRef.current) {
      feedRef.current.scrollTop = 0;
    }
  }, [recentWinners]);

  // Format timestamp for display
  const formatTime = (timestamp: string): string => {
    try {
      const date = new Date(timestamp);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMin = Math.floor(diffMs / 60000);
      
      if (diffMin < 1) return 'Just now';
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHrs = Math.floor(diffMin / 60);
      if (diffHrs < 24) return `${diffHrs}h ago`;
      return date.toLocaleDateString();
    } catch {
      return '';
    }
  };

  // Get display name
  const getDisplayName = (winner: WinnerInfo): string => {
    if (winner.participantName) return winner.participantName;
    return 'Participant';
  };

  // Filter visible winners (maxVisible)
  const visibleWinners = recentWinners.slice(0, maxVisible);

  // Empty state
  if (recentWinners.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center"
        >
          <motion.div
            animate={{ 
              scale: [1, 1.1, 1],
              opacity: [0.7, 1, 0.7]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          >
            <Trophy className="w-16 h-16 text-amber-400/60 mx-auto mb-4" />
          </motion.div>
          <p className="text-2xl font-bold text-white/70 mb-2">Waiting for participants...</p>
          <p className="text-lg text-white/40">Spin the wheel to see results here!</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      {/* Congratulations banner */}
      <AnimatePresence>
        {showCongrats && latestWinner && (
          <motion.div
            initial={{ opacity: 0, y: -40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -40, scale: 0.9 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-white px-6 py-4 rounded-xl mb-4 shadow-lg shadow-amber-500/30"
          >
            <div className="flex items-center justify-center gap-3">
              <motion.span
                animate={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 0.5, repeat: 3 }}
                className="text-4xl"
              >
                🎊
              </motion.span>
              <div className="text-center">
                <p className="text-3xl font-extrabold tracking-wide">CONGRATULATIONS!</p>
                <p className="text-xl font-semibold mt-1">
                  {getDisplayName(latestWinner)} won <span className="font-bold text-yellow-200">{latestWinner.prizeName}</span>
                </p>
              </div>
              <motion.span
                animate={{ rotate: [0, -15, 15, 0] }}
                transition={{ duration: 0.5, repeat: 3 }}
                className="text-4xl"
              >
                🎊
              </motion.span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center gap-3 mb-4 px-2">
        <Trophy className="w-6 h-6 text-amber-400" />
        <h2 className="text-2xl font-bold text-white tracking-wide">Recent Winners</h2>
        <div className="ml-auto bg-amber-500/20 px-3 py-1 rounded-full">
          <span className="text-amber-400 text-sm font-semibold">{recentWinners.length} total</span>
        </div>
      </div>

      {/* Winners list */}
      <div
        ref={feedRef}
        className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
      >
        <AnimatePresence mode="popLayout">
          {visibleWinners.map((winner, index) => (
            <motion.div
              key={`${winner.timestamp}-${winner.prizeName}-${index}`}
              initial={{ opacity: 0, x: 80, scale: 0.95 }}
              animate={{ 
                opacity: index < 3 ? 1 : 0.7 + (0.3 * (3 - index) / 3),
                x: 0,
                scale: 1 
              }}
              exit={{ opacity: 0, x: -80, scale: 0.95 }}
              transition={{
                duration: 0.6,
                ease: [0.25, 0.46, 0.45, 0.94],
                opacity: { duration: 0.3 },
              }}
              layout
              className={`relative rounded-xl overflow-hidden ${
                isLosingResult(winner)
                  ? 'bg-white/5 border border-white/10'
                  : index === 0
                    ? 'bg-gradient-to-r from-amber-500/20 to-yellow-400/20 border border-amber-500/40 shadow-lg shadow-amber-500/10'
                    : 'bg-white/10 border border-white/20'
              }`}
            >
              {/* Gold shimmer effect for newest winner */}
              {index === 0 && !isLosingResult(winner) && (
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-400/10 to-transparent"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                />
              )}

              <div className="flex items-center gap-4 p-4">
                {/* Prize icon */}
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
                  isLosingResult(winner)
                    ? 'bg-white/10'
                    : 'bg-gradient-to-br from-amber-400 to-amber-600 shadow-inner'
                }`}>
                  {isLosingResult(winner) ? (
                    <span className="text-xl">😅</span>
                  ) : (
                    <span className="text-2xl">🏆</span>
                  )}
                </div>

                {/* Winner info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-white/50 shrink-0" />
                    <p className="text-lg font-bold text-white truncate">
                      {getDisplayName(winner)}
                    </p>
                  </div>
                  <p className={`text-base font-semibold truncate ${
                    isLosingResult(winner)
                      ? 'text-white/50'
                      : 'text-amber-300'
                  }`}>
                    {isLosingResult(winner) ? 'Try again next time!' : winner.prizeName}
                  </p>
                </div>

                {/* Timestamp */}
                <div className="flex items-center gap-1 shrink-0 text-white/40">
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-sm">{formatTime(winner.timestamp)}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Bottom gradient fade */}
      <div className="h-8 bg-gradient-to-t from-[#1a1a2e] to-transparent shrink-0 -mt-8 relative z-10 pointer-events-none" />
    </div>
  );
}
