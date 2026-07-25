'use client';

import { useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TVResultOverlayProps {
  isVisible: boolean;
  isLosing: boolean;
  prizeName?: string;
  prizeColor?: string;
  participantName?: string;
  autoHideDuration?: number; // in milliseconds
  onHide?: () => void;
}

// Confetti particle component
function ConfettiParticle({ delay, color, startX, startY }: { 
  delay: number; 
  color: string; 
  startX: number; 
  startY: number;
}) {
  const endX = startX + (Math.random() - 0.5) * 400;
  const endY = startY + 200 + Math.random() * 300;
  const rotation = Math.random() * 720 - 360;
  const scale = Math.random() * 0.5 + 0.5;

  return (
    <motion.div
      className="absolute w-3 h-3 rounded-sm"
      style={{
        backgroundColor: color,
        left: startX,
        top: startY,
      }}
      initial={{ 
        opacity: 1, 
        scale: 0,
        x: 0,
        y: 0,
        rotate: 0,
      }}
      animate={{ 
        opacity: [1, 1, 0],
        scale: [0, scale, scale],
        x: endX - startX,
        y: endY - startY,
        rotate: rotation,
      }}
      transition={{
        duration: 2.5,
        delay,
        ease: 'easeOut',
        opacity: { duration: 2.5, delay: delay + 0.5 },
      }}
    />
  );
}

// Confetti burst effect
function ConfettiBurst() {
  const particles = useMemo(() => {
    const colors = ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE'];
    const count = 60;
    
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      color: colors[i % colors.length],
      startX: Math.random() * 1920,
      startY: -20 - Math.random() * 100,
      delay: Math.random() * 0.8,
    }));
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <ConfettiParticle
          key={p.id}
          color={p.color}
          startX={p.startX}
          startY={p.startY}
          delay={p.delay}
        />
      ))}
    </div>
  );
}

export function TVResultOverlay({
  isVisible,
  isLosing,
  prizeName,
  prizeColor,
  participantName,
  autoHideDuration = 5000,
  onHide,
}: TVResultOverlayProps) {
  // Auto-hide after duration - only schedules the callback (no direct setState)
  useEffect(() => {
    if (!isVisible) return;
    const timer = setTimeout(() => {
      onHide?.();
    }, isLosing ? 2500 : autoHideDuration);
    return () => clearTimeout(timer);
  }, [isVisible, isLosing, autoHideDuration, onHide]);

  // Get display name
  const displayName = participantName || 'Winner';

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex items-center justify-center"
        >
          {/* Background overlay */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: isLosing
                ? 'radial-gradient(ellipse at center, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.95) 100%)'
                : 'radial-gradient(ellipse at center, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.95) 100%)',
            }}
          />

          {/* Confetti for winners */}
          {!isLosing && <ConfettiBurst />}

          {/* Content */}
          <div className="relative z-10 text-center">
            {isLosing ? (
              // Losing result
              <motion.div
                initial={{ opacity: 0, scale: 0.5, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: -20 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              >
                <motion.div
                  initial={{ y: 0 }}
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                  className="text-8xl mb-6"
                >
                  😊
                </motion.div>
                <motion.h2
                  className="text-6xl font-extrabold text-white/80 mb-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  Try Again!
                </motion.h2>
                <motion.p
                  className="text-2xl text-white/50"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  Better luck next time!
                </motion.p>
              </motion.div>
            ) : (
              // Winning result
              <motion.div
                initial={{ opacity: 0, scale: 0.3 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
              >
                {/* Winner badge */}
                <motion.div
                  initial={{ rotate: -10, scale: 0.8 }}
                  animate={{ rotate: [0, 3, -3, 0], scale: 1 }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                  className="inline-block mb-6"
                >
                  <motion.div
                    className="text-9xl"
                    animate={{ 
                      scale: [1, 1.2, 1],
                      rotate: [0, 10, -10, 0],
                    }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                  >
                    🎉
                  </motion.div>
                </motion.div>

                {/* WINNER text */}
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                >
                  <h1
                    className="text-8xl font-black tracking-wider mb-4"
                    style={{
                      background: `linear-gradient(135deg, #FFD700, #FFA500, #FFD700, #FF8C00)`,
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      filter: 'drop-shadow(0 0 20px rgba(255, 215, 0, 0.5))',
                    }}
                  >
                    WINNER!
                  </h1>
                </motion.div>

                {/* Participant name */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5, duration: 0.4 }}
                >
                  <p className="text-4xl font-bold text-white mb-2">
                    {displayName}
                  </p>
                </motion.div>

                {/* Prize name */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.7, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
                  className="mt-6"
                >
                  <div
                    className="inline-block px-10 py-5 rounded-2xl border-2"
                    style={{
                      backgroundColor: prizeColor ? `${prizeColor}33` : 'rgba(255, 215, 0, 0.2)',
                      borderColor: prizeColor || '#FFD700',
                      boxShadow: `0 0 40px ${prizeColor || '#FFD700'}44, 0 0 80px ${prizeColor || '#FFD700'}22`,
                    }}
                  >
                    <p className="text-3xl font-extrabold" style={{ color: prizeColor || '#FFD700' }}>
                      {prizeName || 'Mystery Prize'}
                    </p>
                  </div>
                </motion.div>

                {/* Pulsing ring effect */}
                <motion.div
                  className="absolute inset-0 pointer-events-none"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0, 0.3, 0] }}
                  transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                >
                  <div
                    className="w-40 h-40 rounded-full mx-auto mt-[-200px]"
                    style={{
                      border: `3px solid ${prizeColor || '#FFD700'}`,
                      boxShadow: `0 0 60px ${prizeColor || '#FFD700'}44`,
                    }}
                  />
                </motion.div>
              </motion.div>
            )}
          </div>

          {/* Auto-hide countdown bar */}
          <div className="absolute bottom-0 left-0 w-full h-1 bg-white/10">
            <motion.div
              className="h-full"
              style={{
                background: isLosing
                  ? 'linear-gradient(to right, #666, #999)'
                  : 'linear-gradient(to right, #FFD700, #FFA500)',
              }}
              initial={{ width: '100%' }}
              animate={{ width: '0%' }}
              transition={{
                duration: isLosing ? 2.5 : autoHideDuration / 1000,
                ease: 'linear',
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
