'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/stores/app-store';
import { Button } from '@/components/ui/button';
import { Trophy, XCircle, PartyPopper, RotateCcw } from 'lucide-react';

interface SpinResultProps {
  onReset: () => void;
}

export function SpinResult({ onReset }: SpinResultProps) {
  const { spinResult } = useAppStore();
  const [visible, setVisible] = useState(true);
  const [confettiPieces, setConfettiPieces] = useState<Array<{ id: number; x: number; y: number; color: string; delay: number; size: number }>>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Generate confetti pieces for winners
  useEffect(() => {
    if (spinResult && !spinResult.isLosing) {
      const pieces = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * -50 - 20,
        color: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#F7DC6F', '#BB8FCE'][Math.floor(Math.random() * 6)],
        delay: Math.random() * 0.5,
        size: Math.random() * 8 + 4,
      }));
      setConfettiPieces(pieces);
    }
  }, [spinResult]);

  // Auto-close after 10 seconds
  useEffect(() => {
    if (spinResult) {
      setVisible(true);
      timerRef.current = setTimeout(() => {
        setVisible(false);
        setTimeout(() => onReset(), 500); // Wait for exit animation
      }, 10000);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [spinResult, onReset]);

  const handlePlayAgain = useCallback(() => {
    setVisible(false);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setTimeout(() => onReset(), 500);
  }, [onReset]);

  if (!spinResult) return null;

  const isWinner = !spinResult.isLosing;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
        >
          {/* Confetti animation for winners */}
          {isWinner && confettiPieces.map((piece) => (
            <motion.div
              key={piece.id}
              initial={{ y: piece.y + 'vh', x: piece.x + 'vw', opacity: 1, rotate: 0 }}
              animate={{
                y: '100vh',
                x: piece.x + 'vw',
                opacity: [1, 1, 0.5, 0],
                rotate: [0, 180, 360, 540],
              }}
              transition={{
                duration: 3 + Math.random() * 2,
                delay: piece.delay,
                ease: 'easeOut',
              }}
              className="fixed top-0 pointer-events-none"
              style={{
                width: piece.size,
                height: piece.size,
                backgroundColor: piece.color,
                borderRadius: Math.random() > 0.5 ? '50%' : '0%',
              }}
            />
          ))}

          <motion.div
            initial={{ scale: 0.5, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 30 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="relative max-w-md w-full mx-4"
          >
            {isWinner ? (
              /* Winner Display */
              <div className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950 dark:to-yellow-950 border-2 border-amber-300 dark:border-amber-700 rounded-2xl p-8 text-center shadow-2xl">
                <motion.div
                  animate={{ rotate: [0, -10, 10, -5, 5, 0] }}
                  transition={{ duration: 0.5, delay: 0.3 }}
                >
                  <PartyPopper className="w-16 h-16 text-amber-500 mx-auto mb-2" />
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-3xl font-bold text-amber-700 dark:text-amber-300 mb-2"
                >
                  Congratulations!
                </motion.h2>

                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.6 }}
                  className="inline-flex items-center gap-2 bg-amber-500 text-white px-6 py-3 rounded-full text-xl font-bold shadow-lg mb-4"
                >
                  <Trophy className="w-6 h-6" />
                  {spinResult.prizeName}
                </motion.div>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.8 }}
                  className="text-muted-foreground mb-6"
                >
                  You&apos;re a winner! Enjoy your prize.
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1 }}
                >
                  <Button
                    onClick={handlePlayAgain}
                    className="bg-gradient-to-r from-amber-500 to-red-500 hover:from-amber-600 hover:to-red-600 text-white font-bold shadow-lg"
                    size="lg"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Play Again
                  </Button>
                </motion.div>
              </div>
            ) : (
              /* Loser Display */
              <div className="bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-950 dark:to-slate-950 border-2 border-gray-300 dark:border-gray-700 rounded-2xl p-8 text-center shadow-2xl">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <XCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                </motion.div>

                <motion.h2
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-2"
                >
                  Better Luck Next Time!
                </motion.h2>

                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.6 }}
                  className="text-muted-foreground mb-6"
                >
                  Don&apos;t worry — try again with a new code!
                </motion.p>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                >
                  <Button
                    onClick={handlePlayAgain}
                    variant="outline"
                    size="lg"
                    className="font-bold"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Try Again
                  </Button>
                </motion.div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
