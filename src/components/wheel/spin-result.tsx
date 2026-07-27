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
    setTimeout(() => setAnimateIn(true), 100);
    setTimeout(() => setShowContent(true), 400);

    if (result.isWinning) {
      setTimeout(() => confetti({
        particleCount: 150, spread: 180, origin: { y: 0.5 },
        colors: ['#FFD700', '#00C853', '#FFE55C', '#E040FB', '#76FF03', '#00E5FF'],
      }), 300);
      setTimeout(() => confetti({
        particleCount: 50, spread: 360, startVelocity: 30, gravity: 0.5, ticks: 200,
        shapes: ['star'], colors: ['#FFD700', '#00C853'], origin: { x: 0.5, y: 0.5 },
      }), 600);
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
            ? 'bg-gradient-to-b from-[#00C853]/80 via-[#FFD700]/60 to-[#1B5E20]/80'
            : 'bg-gradient-to-b from-[#333]/80 to-[#111]/80'
        }`}
        onClick={onClose}
      />

      {/* Light rays for winning */}
      {result.isWinning && (
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 animate-[spin_4s_linear_infinite] opacity-20">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="absolute top-1/2 left-1/2 w-1 h-[50vh] -translate-x-1/2 origin-bottom"
                style={{ transform: `rotate(${i * 45}deg)`, background: 'linear-gradient(to top, transparent, #FFD700)' }} />
            ))}
          </div>
          <div className="absolute inset-0 bg-[#00C853]/20 animate-pulse" />
        </div>
      )}

      {/* Result card */}
      <div className={`relative z-10 max-w-sm w-full mx-4 transition-all duration-700 ${
        showContent ? 'scale-100 opacity-100' : 'scale-50 opacity-0'
      }`}>
        <div className={`rounded-2xl p-6 backdrop-blur-xl border shadow-2xl ${
          result.isWinning
            ? 'bg-gradient-to-br from-white/90 to-[#F0F0F0]/90 border-[#FFD700]/50 shadow-[#FFD700]/30'
            : 'bg-gradient-to-br from-[#222]/90 to-[#111]/90 border-white/10 shadow-white/10'
        }`}>
          {result.isWinning ? (
            <div className="text-center space-y-4">
              <div className="text-6xl animate-bounce">🎉</div>
              <h2 className="text-3xl font-extrabold bg-gradient-to-r from-[#FFD700] to-[#00C853] bg-clip-text text-transparent">
                FÉLICITATIONS !
              </h2>
              <p className="text-lg text-gray-700 font-medium">Vous avez gagné</p>
              <div className="rounded-xl p-4 mx-auto max-w-xs"
                style={{ background: `linear-gradient(135deg, ${lightenColor(result.prizeColor, 40)}, ${result.prizeColor})` }}>
                {result.prizeImageUrl && (
                  <div className="mb-3 flex justify-center">
                    <img src={result.prizeImageUrl} alt={result.prizeName}
                      className="w-32 h-32 object-contain rounded-lg shadow-lg animate-[zoomIn_0.5s_ease-out]" />
                  </div>
                )}
                <p className="text-xl font-bold text-white drop-shadow-md">🏆 {result.prizeName}</p>
                {result.prizeDescription && (
                  <p className="text-sm text-white/80 mt-1">{result.prizeDescription}</p>
                )}
              </div>
              <div className="bg-[#00C853]/10 rounded-lg p-3 text-sm text-[#00C853] font-medium border border-[#00C853]/20">
                Présentez ce résultat à la caisse.
              </div>
              <Button onClick={onClose}
                className="w-full bg-gradient-to-b from-[#FFE55C] to-[#FF9800] text-black font-extrabold shadow-lg text-lg py-3"
                style={{ boxShadow: '0 6px 20px rgba(255,193,7,0.4)' }}>
                OK
              </Button>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="text-5xl">😔</div>
              <h2 className="text-2xl font-bold text-white/80">
                Merci pour votre participation.
              </h2>
              <p className="text-lg text-white/50 font-medium">À bientôt !</p>
              <div className="bg-white/[0.06] rounded-lg p-3 text-sm text-white/50 border border-white/10">
                La roue s&apos;est arrêtée sur un secteur perdant.
              </div>
              <Button onClick={onClose}
                className="w-full bg-[#1a1a1a] hover:bg-[#333] text-white font-semibold border border-white/10">
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
