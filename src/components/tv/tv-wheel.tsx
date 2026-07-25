'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Prize, WheelConfig } from '@/types';

interface TVWheelProps {
  prizes: Prize[];
  wheelConfig?: WheelConfig;
  isSpinning: boolean;
  finalAngle?: number;
  spinDuration?: number;
}

// Default color palette for sectors
const DEFAULT_SECTOR_COLORS = [
  '#E74C3C', '#F39C12', '#2ECC71', '#3498DB',
  '#9B59B6', '#1ABC9C', '#E67E22', '#2980B9',
  '#8E44AD', '#16A085', '#D35400', '#C0392B',
];

export function TVWheel({ prizes, wheelConfig, isSpinning, finalAngle, spinDuration }: TVWheelProps) {
  const [rotationAngle, setRotationAngle] = useState(0);
  const [highlightedSector, setHighlightedSector] = useState<number | null>(null);
  const prevIsSpinningRef = useRef(isSpinning);
  const lastSpinAngleRef = useRef(0);

  // Filter active prizes for wheel display
  const activePrizes = useMemo(() => 
    prizes.filter(p => p.active).sort((a, b) => a.sortOrder - b.sortOrder),
    [prizes]
  );

  const sectorAngle = useMemo(() => 
    activePrizes.length > 0 ? 360 / activePrizes.length : 0,
    [activePrizes.length]
  );

  // Generate SVG sectors
  const sectors = useMemo(() => {
    if (activePrizes.length === 0) return [];

    return activePrizes.map((prize, index) => {
      const startAngle = index * sectorAngle - 90; // Start from top
      const endAngle = startAngle + sectorAngle;
      const midAngle = startAngle + sectorAngle / 2;
      const color = prize.color || DEFAULT_SECTOR_COLORS[index % DEFAULT_SECTOR_COLORS.length];
      
      // SVG arc path calculation
      const radius = 180;
      const innerRadius = 40;
      const cx = 200;
      const cy = 200;
      
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;
      const midRad = (midAngle * Math.PI) / 180;
      
      // Outer arc
      const x1Outer = cx + radius * Math.cos(startRad);
      const y1Outer = cy + radius * Math.sin(startRad);
      const x2Outer = cx + radius * Math.cos(endRad);
      const y2Outer = cy + radius * Math.sin(endRad);
      
      // Inner arc
      const x1Inner = cx + innerRadius * Math.cos(endRad);
      const y1Inner = cy + innerRadius * Math.sin(endRad);
      const x2Inner = cx + innerRadius * Math.cos(startRad);
      const y2Inner = cy + innerRadius * Math.sin(startRad);
      
      // Text position
      const textRadius = radius * 0.65;
      const textX = cx + textRadius * Math.cos(midRad);
      const textY = cy + textRadius * Math.sin(midRad);
      
      const largeArcFlag = sectorAngle > 180 ? 1 : 0;
      
      const path = [
        `M ${x1Outer} ${y1Outer}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2Outer} ${y2Outer}`,
        `L ${x1Inner} ${y1Inner}`,
        `A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${x2Inner} ${y2Inner}`,
        'Z',
      ].join(' ');

      return {
        path,
        color,
        label: prize.sectorLabel || prize.name,
        textX,
        textY,
        midAngle,
        prize,
        index,
      };
    });
  }, [activePrizes, sectorAngle]);

  // Handle spin start/stop via effect
  useEffect(() => {
    const prevIsSpinning = prevIsSpinningRef.current;
    if (isSpinning === prevIsSpinning) return;

    prevIsSpinningRef.current = isSpinning;

    if (isSpinning && finalAngle !== undefined && spinDuration) {
      // Spin started - compute target angle
      const minRotations = wheelConfig?.minRotations || 5;
      const maxRotations = wheelConfig?.maxRotations || 10;
      const rotations = minRotations + (maxRotations - minRotations) * (finalAngle / 360);
      const targetAngle = lastSpinAngleRef.current + rotations * 360 + finalAngle;
      lastSpinAngleRef.current = targetAngle;
      setRotationAngle(targetAngle);
      setHighlightedSector(null);
    } else if (!isSpinning && finalAngle !== undefined && activePrizes.length > 0) {
      // Spin stopped - highlight winning sector
      const normalizedAngle = ((360 - (finalAngle % 360)) + 360) % 360;
      const sectorIndex = Math.floor(normalizedAngle / sectorAngle) % activePrizes.length;
      setHighlightedSector(sectorIndex);
    }
  }, [isSpinning, finalAngle, spinDuration, activePrizes.length, sectorAngle, wheelConfig]);

  // Auto-remove highlight after 3 seconds
  useEffect(() => {
    if (highlightedSector === null) return;
    const timer = setTimeout(() => {
      setHighlightedSector(null);
    }, 3000);
    return () => clearTimeout(timer);
  }, [highlightedSector]);

  // Pointer triangle at top
  const pointerSvg = useMemo(() => {
    const cx = 200;
    const pointerY = 8;
    return [
      `M ${cx - 12} ${pointerY}`,
      `L ${cx + 12} ${pointerY}`,
      `L ${cx} ${pointerY + 30}`,
      'Z',
    ].join(' ');
  }, []);

  const bgColor = wheelConfig?.backgroundColor || '#1a1a2e';
  const outerRingColor = wheelConfig?.outerRingColor || '#FFD700';
  const centerColor = wheelConfig?.centerColor || '#2d2d44';
  const textColor = wheelConfig?.textColor || '#FFFFFF';
  const pointerColor = wheelConfig?.pointerColor || '#FF0000';

  if (activePrizes.length === 0) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center text-white/70"
        >
          <p className="text-3xl font-bold mb-2">No Prizes Configured</p>
          <p className="text-xl">Waiting for wheel setup...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center w-full h-full relative">
      {/* Glow effect behind wheel */}
      <motion.div
        className="absolute w-[420px] h-[420px] rounded-full"
        animate={{
          boxShadow: isSpinning
            ? '0 0 60px rgba(255, 215, 0, 0.6), 0 0 120px rgba(255, 215, 0, 0.3)'
            : highlightedSector !== null
              ? '0 0 80px rgba(255, 215, 0, 0.8), 0 0 160px rgba(255, 215, 0, 0.4)'
              : '0 0 30px rgba(255, 215, 0, 0.2)',
        }}
        transition={{ duration: 0.5 }}
      />

      {/* SVG Wheel */}
      <svg
        viewBox="0 0 400 400"
        className="w-full max-w-[500px] max-h-[500px]"
        style={{
          transform: `rotate(${rotationAngle}deg)`,
          transition: isSpinning
            ? `transform ${spinDuration || 5}s cubic-bezier(0.17, 0.67, 0.12, 0.99)`
            : 'none',
        }}
      >
        {/* Outer ring */}
        <circle cx="200" cy="200" r="190" fill="none" stroke={outerRingColor} strokeWidth="8" />
        
        {/* Background circle */}
        <circle cx="200" cy="200" r="185" fill={bgColor} />
        
        {/* Decorative dots on outer ring */}
        {sectors.map((_, index) => {
          const dotAngle = (index * sectorAngle - 90) * Math.PI / 180;
          const dotR = 188;
          const dx = 200 + dotR * Math.cos(dotAngle);
          const dy = 200 + dotR * Math.sin(dotAngle);
          return <circle key={`dot-${index}`} cx={dx} cy={dy} r="4" fill={outerRingColor} />;
        })}
        
        {/* Sectors */}
        {sectors.map((sector, index) => (
          <g key={`sector-${index}`}>
            <path
              d={sector.path}
              fill={sector.color}
              stroke="rgba(0,0,0,0.3)"
              strokeWidth="1"
              opacity={highlightedSector === index ? 1 : 0.85}
            />
            {/* Highlight flash */}
            {highlightedSector === index && (
              <path
                d={sector.path}
                fill="rgba(255, 255, 255, 0.3)"
                className="animate-pulse"
              />
            )}
            {/* Sector label */}
            <text
              x={sector.textX}
              y={sector.textY}
              fill={textColor}
              fontSize={wheelConfig?.fontSize || 14}
              fontWeight="bold"
              textAnchor="middle"
              dominantBaseline="middle"
              transform={`rotate(${sector.midAngle}, ${sector.textX}, ${sector.textY})`}
              style={{ pointerEvents: 'none' }}
            >
              {sector.label.length > 10 ? sector.label.substring(0, 10) + '...' : sector.label}
            </text>
          </g>
        ))}
        
        {/* Center circle */}
        <circle cx="200" cy="200" r="35" fill={centerColor} stroke={outerRingColor} strokeWidth="3" />
        <text
          x="200"
          y="200"
          fill={outerRingColor}
          fontSize="10"
          fontWeight="bold"
          textAnchor="middle"
          dominantBaseline="middle"
        >
          SPIN
        </text>
      </svg>

      {/* Pointer (fixed, not rotating) */}
      <svg
        viewBox="0 0 400 50"
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[80px] h-[50px] z-10"
      >
        <path d={pointerSvg} fill={pointerColor} stroke="rgba(0,0,0,0.5)" strokeWidth="1" />
      </svg>

      {/* Spinning indicator */}
      <AnimatePresence>
        {isSpinning && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-amber-500/90 backdrop-blur-sm text-white px-6 py-3 rounded-full font-bold text-xl shadow-lg"
          >
            🎰 Spinning...
          </motion.div>
        )}
      </AnimatePresence>

      {/* Winner flash on sector */}
      <AnimatePresence>
        {highlightedSector !== null && !isSpinning && sectors[highlightedSector] && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm text-gray-900 px-8 py-3 rounded-full font-bold text-xl shadow-lg"
          >
            🎯 {sectors[highlightedSector].prize.name}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
