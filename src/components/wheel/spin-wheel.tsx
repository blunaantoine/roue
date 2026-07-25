'use client';

import { useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Prize, WheelConfig } from '@/types';

interface SpinWheelProps {
  prizes: Prize[];
  wheelConfig: WheelConfig | null;
  isSpinning: boolean;
  onSpinComplete: () => void;
  finalAngle: number;
}

// Default wheel config values
const DEFAULT_CONFIG = {
  spinDuration: 5000,
  minRotations: 3,
  maxRotations: 7,
  pointerColor: '#FF0000',
  centerColor: '#FFFFFF',
  outerRingColor: '#333333',
  backgroundColor: '#1a1a2e',
  textColor: '#FFFFFF',
  fontSize: 16,
};

// Losing sector visual constants
const LOSING_COLOR = '#2d2d2d';
const LOSING_PATTERN_COLOR = '#444444';

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// Helper: determine optimal font size based on sector angle and canvas size
function getOptimalFontSize(sectorAngleDeg: number, radius: number): number {
  // Larger sectors can fit larger text
  if (sectorAngleDeg >= 60) return Math.max(18, Math.min(radius * 0.08, 28));
  if (sectorAngleDeg >= 45) return Math.max(16, Math.min(radius * 0.07, 24));
  if (sectorAngleDeg >= 30) return Math.max(14, Math.min(radius * 0.06, 20));
  return Math.max(12, Math.min(radius * 0.05, 16));
}

// Helper: get contrast color for text over a sector color
function getContrastTextColor(bgColor: string): string {
  // Parse hex color to determine luminance
  const hex = bgColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16) || 0;
  const g = parseInt(hex.substring(2, 4), 16) || 0;
  const b = parseInt(hex.substring(4, 6), 16) || 0;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#1a1a1a' : '#FFFFFF';
}

const SpinWheel = forwardRef<{ triggerSpin: (angle: number) => void }, SpinWheelProps>(
  ({ prizes, wheelConfig, isSpinning, onSpinComplete, finalAngle }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const animationRef = useRef<number | null>(null);
    const currentAngleRef = useRef(0);
    const targetAngleRef = useRef(0);
    const startTimeRef = useRef(0);
    const canvasSizeRef = useRef(500);
    const highlightedSectorRef = useRef<number | null>(null);

    const config = wheelConfig ?? DEFAULT_CONFIG;
    const spinDuration = config.spinDuration || DEFAULT_CONFIG.spinDuration;

    // Calculate sector angles (equal distribution)
    const sectorAngle = prizes.length > 0 ? 360 / prizes.length : 360;
    const sectorAngleRad = prizes.length > 0 ? (2 * Math.PI) / prizes.length : 2 * Math.PI;

    // Determine which sector the pointer lands on given a rotation angle
    const getWinningSectorIndex = useCallback(
      (angle: number) => {
        const normalized = ((angle % 360) + 360) % 360;
        const pointerPosition = ((360 - normalized) % 360);
        const sectorIndex = Math.floor(pointerPosition / sectorAngle);
        return sectorIndex % prizes.length;
      },
      [sectorAngle, prizes.length]
    );

    // Draw the wheel on canvas
    const drawWheel = useCallback(
      (rotationDeg: number, highlightIndex: number | null) => {
        const canvas = canvasRef.current;
        if (!canvas || prizes.length === 0) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const size = canvasSizeRef.current;
        const center = size / 2;
        const radius = center - 25; // Leave room for outer ring + pointer

        // Clear canvas
        ctx.clearRect(0, 0, size, size);

        // Draw background circle
        ctx.beginPath();
        ctx.arc(center, center, radius + 18, 0, 2 * Math.PI);
        ctx.fillStyle = config.outerRingColor || DEFAULT_CONFIG.outerRingColor;
        ctx.fill();

        // Decorative outer ring dots
        const dotCount = prizes.length * 2;
        for (let i = 0; i < dotCount; i++) {
          const angle = (i / dotCount) * 2 * Math.PI;
          const dotX = center + (radius + 10) * Math.cos(angle);
          const dotY = center + (radius + 10) * Math.sin(angle);
          ctx.beginPath();
          ctx.arc(dotX, dotY, 5, 0, 2 * Math.PI);
          ctx.fillStyle = '#FFD700';
          ctx.fill();
        }

        // Save context and apply rotation
        ctx.save();
        ctx.translate(center, center);
        // Rotate clockwise by rotationDeg, offset by -90° so sector 0 starts at top
        ctx.rotate(((rotationDeg - 90) * Math.PI) / 180);

        // Draw each sector
        for (let i = 0; i < prizes.length; i++) {
          const prize = prizes[i];
          const startAngleRad = i * sectorAngleRad;
          const endAngleRad = (i + 1) * sectorAngleRad;
          const midAngleRad = startAngleRad + sectorAngleRad / 2;

          // Sector fill
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, radius, startAngleRad, endAngleRad);
          ctx.closePath();

          if (prize.isLosing) {
            // Losing sector: dark with diagonal stripe pattern
            ctx.fillStyle = LOSING_COLOR;
            ctx.fill();

            // Draw diagonal stripes
            ctx.save();
            ctx.clip();
            const stripeWidth = 8;
            const stripeGap = 14;
            ctx.strokeStyle = LOSING_PATTERN_COLOR;
            ctx.lineWidth = stripeWidth;
            for (let s = -radius; s < radius; s += stripeGap) {
              ctx.beginPath();
              ctx.moveTo(s - radius, -radius);
              ctx.lineTo(s + radius, radius);
              ctx.stroke();
            }
            ctx.restore();
          } else {
            // Winning sector: use prize color with slight gradient effect
            const baseColor = prize.color;
            ctx.fillStyle = baseColor;
            ctx.fill();
            
            // Add a subtle inner gradient for depth
            ctx.save();
            ctx.clip();
            const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
            gradient.addColorStop(0, 'rgba(255,255,255,0.15)');
            gradient.addColorStop(0.5, 'rgba(255,255,255,0.05)');
            gradient.addColorStop(1, 'rgba(0,0,0,0.1)');
            ctx.fillStyle = gradient;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, radius, startAngleRad, endAngleRad);
            ctx.closePath();
            ctx.fill();
            ctx.restore();
          }

          // Highlight winning sector
          if (highlightIndex === i) {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, radius, startAngleRad, endAngleRad);
            ctx.closePath();
            ctx.fillStyle = 'rgba(255, 215, 0, 0.4)';
            ctx.fill();
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 4;
            ctx.stroke();
          }

          // Sector border
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, radius, startAngleRad, endAngleRad);
          ctx.closePath();
          ctx.strokeStyle = 'rgba(255,255,255,0.3)';
          ctx.lineWidth = 2;
          ctx.stroke();

          // ===== IMPROVED LABEL DRAWING =====
          ctx.save();
          ctx.rotate(midAngleRad);

          // Determine font size based on sector size and radius
          const fontSize = getOptimalFontSize(sectorAngle, radius);
          const label = prize.sectorLabel || prize.name;
          
          // Don't truncate short labels; only truncate very long ones
          const maxChars = sectorAngle >= 45 ? 15 : sectorAngle >= 30 ? 10 : 7;
          const displayLabel = label.length > maxChars ? label.substring(0, maxChars - 1) + '…' : label;
          
          // Determine text color for contrast
          const textColor = prize.isLosing ? '#999999' : getContrastTextColor(prize.color);
          
          // Position text at ~65% of radius (more central, more visible)
          const textPosition = radius * 0.62;

          // Draw text shadow for readability
          ctx.font = `bold ${fontSize}px 'Segoe UI', Arial, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          
          // First: draw dark shadow/outline for contrast
          ctx.strokeStyle = prize.isLosing ? 'rgba(0,0,0,0.6)' : 'rgba(0,0,0,0.8)';
          ctx.lineWidth = 3;
          ctx.lineJoin = 'round';
          ctx.strokeText(displayLabel, textPosition, 0);
          
          // Then: draw the main text
          ctx.fillStyle = textColor;
          ctx.fillText(displayLabel, textPosition, 0);

          ctx.restore();
        }

        ctx.restore();

        // Draw center circle (larger, with campaign branding)
        ctx.beginPath();
        ctx.arc(center, center, 38, 0, 2 * Math.PI);
        ctx.fillStyle = config.centerColor || DEFAULT_CONFIG.centerColor;
        ctx.fill();
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Center circle inner ring
        ctx.beginPath();
        ctx.arc(center, center, 34, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(255,215,0,0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Draw pointer/arrow at top (pointing down toward the wheel)
        const pointerLength = 40;
        const pointerWidth = 24;
        ctx.beginPath();
        ctx.moveTo(center, center - radius - 18); // Tip
        ctx.lineTo(center - pointerWidth / 2, center - radius - 18 - pointerLength);
        ctx.lineTo(center + pointerWidth / 2, center - radius - 18 - pointerLength);
        ctx.closePath();
        ctx.fillStyle = config.pointerColor || DEFAULT_CONFIG.pointerColor;
        ctx.fill();
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Small circle at pointer base
        ctx.beginPath();
        ctx.arc(center, center - radius - 18 - pointerLength / 2, 6, 0, 2 * Math.PI);
        ctx.fillStyle = '#FFD700';
        ctx.fill();
      },
      [prizes, config, sectorAngle, sectorAngleRad]
    );

    // Handle canvas resize
    useEffect(() => {
      const container = containerRef.current;
      if (!container) return;

      const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const width = entry.contentRect.width;
          const newSize = Math.min(width, 550);
          canvasSizeRef.current = newSize;
          if (canvasRef.current) {
            canvasRef.current.width = newSize;
            canvasRef.current.height = newSize;
          }
          drawWheel(currentAngleRef.current, highlightedSectorRef.current);
        }
      });

      resizeObserver.observe(container);
      return () => resizeObserver.disconnect();
    }, [drawWheel]);

    // Initial draw and redraw on prizes change
    useEffect(() => {
      if (canvasRef.current) {
        canvasRef.current.width = canvasSizeRef.current;
        canvasRef.current.height = canvasSizeRef.current;
      }
      drawWheel(currentAngleRef.current, highlightedSectorRef.current);
    }, [prizes, drawWheel]);

    // Spin animation
    const triggerSpin = useCallback(
      (angle: number) => {
        targetAngleRef.current = angle;
        startTimeRef.current = 0;
        currentAngleRef.current = 0;

        const animate = (timestamp: number) => {
          if (startTimeRef.current === 0) {
            startTimeRef.current = timestamp;
          }

          const elapsed = timestamp - startTimeRef.current;
          const progress = Math.min(elapsed / spinDuration, 1);
          const easedProgress = easeOutCubic(progress);
          currentAngleRef.current = easedProgress * targetAngleRef.current;

          drawWheel(currentAngleRef.current, null);

          if (progress < 1) {
            animationRef.current = requestAnimationFrame(animate);
          } else {
            // Animation complete
            const winIndex = getWinningSectorIndex(currentAngleRef.current);
            highlightedSectorRef.current = winIndex;
            drawWheel(currentAngleRef.current, winIndex);
            animationRef.current = null;
            onSpinComplete();
          }
        };

        animationRef.current = requestAnimationFrame(animate);
      },
      [spinDuration, drawWheel, getWinningSectorIndex, onSpinComplete]
    );

    useImperativeHandle(ref, () => ({
      triggerSpin,
    }));

    // Start spin when isSpinning becomes true and finalAngle is set
    useEffect(() => {
      if (isSpinning && finalAngle > 0) {
        highlightedSectorRef.current = null;
        triggerSpin(finalAngle);
      }
    }, [isSpinning, finalAngle, triggerSpin]);

    // Cleanup animation on unmount
    useEffect(() => {
      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }
      };
    }, []);

    return (
      <div ref={containerRef} className="w-full max-w-[550px] mx-auto aspect-square">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ display: 'block' }}
        />
      </div>
    );
  }
);

SpinWheel.displayName = 'SpinWheel';

export { SpinWheel };
