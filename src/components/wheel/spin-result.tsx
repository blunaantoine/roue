'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import confetti from 'canvas-confetti';

interface SpinResultProps {
  result: {
    isWinning: boolean;
    prizeName: string;
    prizeColor: string;
    prizeId: string;
    prizeImageUrl?: string;
    prizeDescription?: string;
  };
  onClose: () => void;
}

export function SpinResult({ result, onClose }: SpinResultProps) {
  const [animateIn, setAnimateIn] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    // Animate in
    setTimeout(() => setAnimateIn(true), 100);
    setTimeout(() => setShowContent(true), 400);

    // Additional confetti burst for winning
    if (result.isWinning) {
      setTimeout(() => {
        confetti({
          particleCount: 150,
          spread: 180,
          origin: { y: 0.5 },
          colors: ['#FFD700', '#FF6B35', '#FF1744', '#E040FB', '#76FF03', '#00E5FF'],
        });
      }, 300);

      // Star burst
      setTimeout(() => {
        confetti({
          particleCount: 50,
          spread: 360,
          startVelocity: 30,
          gravity: 0.5,
          ticks: 200,
          shapes: ['star'],
          colors: ['#FFD700', '#FF6B35'],
          origin: { x: 0.5, y: 0.5 },
        });
      }, 600);
    }
  }, [result.isWinning]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center transition-all duration-500 ${
        animateIn ? 'opacity-100' : 'opacity-0'
      }`}
    >
      {/* Background overlay */}
      <div
        className={`absolute inset-0 transition-all duration-1000 ${
          result.isWinning
            ? 'bg-gradient-to-b from-amber-500/80 via-red-500/60 to-purple-500/80'
            : 'bg-gradient-to-b from-gray-700/80 to-gray-900/80'
        }`}
        onClick={onClose}
      />

      {/* Light effect for winning */}
      {result.isWinning && (
        <div className="absolute inset-0 overflow-hidden">
          {/* Rotating light rays */}
          <div className="absolute inset-0 animate-[spin_4s_linear_infinite] opacity-30">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="absolute top-1/2 left-1/2 w-1 h-[50vh] -translate-x-1/2 origin-bottom"
                style={{
                  transform: `rotate(${i * 45}deg)`,
                  background: `linear-gradient(to top, transparent, #FFD700)`,
                }}
              />
            ))}
          </div>
          {/* Pulsing glow */}
          <div className="absolute inset-0 bg-amber-400/20 animate-pulse" />
        </div>
      )}

      {/* Result card */}
      <div
        className={`relative z-10 max-w-sm w-full mx-4 transition-all duration-700 ${
          showContent ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
        }`}
      >
        <div
          className={`rounded-2xl p-6 backdrop-blur-xl border shadow-2xl ${
            result.isWinning
              ? 'bg-gradient-to-br from-amber-50/90 to-white/90 border-amber-400/50 shadow-amber-500/30'
              : 'bg-gradient-to-br from-gray-100/90 to-gray-50/90 border-gray-400/30 shadow-gray-500/20'
          }`}
        >
          {result.isWinning ? (
            // WINNING RESULT
            <div className="text-center space-y-4">
              {/* Celebration emoji */}
              <div className="text-6xl animate-bounce">🎉</div>

              <h2 className="text-3xl font-bold text-amber-600 animate-pulse">
                FÉLICITATIONS !
              </h2>

              <p className="text-lg text-gray-700 font-medium">
                Vous avez gagné
              </p>

              {/* Prize display */}
              <div
                className="rounded-xl p-4 mx-auto max-w-xs"
                style={{
                  background: `linear-gradient(135deg, ${lightenColor(result.prizeColor, 40)}, ${result.prizeColor})`,
                }}
              >
                {result.prizeImageUrl && (
                  <div className="mb-3 flex justify-center">
                    <img
                      src={result.prizeImageUrl}
                      alt={result.prizeName}
                      className="w-32 h-32 object-contain rounded-lg shadow-lg animate-[zoomIn_0.5s_ease-out]"
                    />
                  </div>
                )}
                <p className="text-xl font-bold text-white drop-shadow-md">
                  🏆 {result.prizeName}
                </p>
                {result.prizeDescription && (
                  <p className="text-sm text-white/80 mt-1">
                    {result.prizeDescription}
                  </p>
                )}
              </div>

              <div className="bg-amber-100 rounded-lg p-3 text-sm text-amber-700 font-medium">
                Présentez ce résultat à la caisse.
              </div>

              <Button
                onClick={onClose}
                className="w-full bg-gradient-to-r from-amber-400 to-red-500 text-white font-bold shadow-lg shadow-amber-500/30 hover:from-amber-500 hover:to-red-600 text-lg py-3"
              >
                OK
              </Button>
            </div>
          ) : (
            // LOSING RESULT
            <div className="text-center space-y-4">
              <div className="text-6xl">😔</div>

              <h2 className="text-2xl font-bold text-gray-600">
                Merci pour votre participation.
              </h2>

              <p className="text-lg text-gray-500 font-medium">
                À bientôt !
              </p>

              <div className="bg-gray-200 rounded-lg p-3 text-sm text-gray-600">
                La roue s&apos;est arrêtée sur un secteur perdant.
              </div>

              <Button
                onClick={onClose}
                className="w-full bg-gradient-to-r from-gray-400 to-gray-600 text-white font-semibold shadow-lg hover:from-gray-500 hover:to-gray-700"
              >
                OK
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function lightenColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
  const B = Math.min(255, (num & 0x0000FF) + amt);
  return `#${(1 << 24 + R << 16 + G << 8 + B).toString(16).slice(1)}`;
}
