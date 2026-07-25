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
  fontSize: 14,
};

// Losing sector visual constants
const LOSING_COLOR = '#2d2d2d';
const LOSING_PATTERN_COLOR = '#444444';

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

const SpinWheel = forwardRef<{ triggerSpin: (angle: number) => void }, SpinWheelProps>(
  ({ prizes, wheelConfig, isSpinning, onSpinComplete, finalAngle }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const animationRef = useRef<number | null>(null);
    const currentAngleRef = useRef(0);
    const targetAngleRef = useRef(0);
    const startTimeRef = useRef(0);
    const canvasSizeRef = useRef(400);
    const highlightedSectorRef = useRef<number | null>(null);

    const config = wheelConfig ?? DEFAULT_CONFIG;
    const spinDuration = config.spinDuration || DEFAULT_CONFIG.spinDuration;

    // Calculate sector angles (equal distribution)
    const sectorAngle = prizes.length > 0 ? 360 / prizes.length : 360;
    const sectorAngleRad = prizes.length > 0 ? (2 * Math.PI) / prizes.length : 2 * Math.PI;

    // Determine which sector the pointer lands on given a rotation angle
    const getWinningSectorIndex = useCallback(
      (angle: number) => {
        // Normalize angle to 0-360
        const normalized = ((angle % 360) + 360) % 360;
        // The pointer is at the top. After rotating by `angle` degrees clockwise,
        // the sector at position (360 - normalized) from the top is under the pointer.
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
        const radius = center - 20; // Leave room for outer ring

        // Clear canvas
        ctx.clearRect(0, 0, size, size);

        // Draw background circle
        ctx.beginPath();
        ctx.arc(center, center, radius + 15, 0, 2 * Math.PI);
        ctx.fillStyle = config.outerRingColor || DEFAULT_CONFIG.outerRingColor;
        ctx.fill();

        // Decorative outer ring dots
        const dotCount = 24;
        for (let i = 0; i < dotCount; i++) {
          const angle = (i / dotCount) * 2 * Math.PI;
          const dotX = center + (radius + 8) * Math.cos(angle);
          const dotY = center + (radius + 8) * Math.sin(angle);
          ctx.beginPath();
          ctx.arc(dotX, dotY, 4, 0, 2 * Math.PI);
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
            const stripeGap = 12;
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
            // Winning sector: use prize color
            ctx.fillStyle = prize.color;
            ctx.fill();
          }

          // Highlight winning sector
          if (highlightIndex === i) {
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.arc(0, 0, radius, startAngleRad, endAngleRad);
            ctx.closePath();
            ctx.fillStyle = 'rgba(255, 215, 0, 0.3)';
            ctx.fill();
            ctx.strokeStyle = '#FFD700';
            ctx.lineWidth = 3;
            ctx.stroke();
          }

          // Sector border
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, radius, startAngleRad, endAngleRad);
          ctx.closePath();
          ctx.strokeStyle = 'rgba(255,255,255,0.15)';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Draw sector label
          ctx.save();
          const labelAngle = startAngleRad + sectorAngleRad / 2;
          ctx.rotate(labelAngle);
          ctx.textAlign = 'right';
          ctx.fillStyle = prize.isLosing ? '#888888' : (config.textColor || DEFAULT_CONFIG.textColor);
          const fontSize = config.fontSize || DEFAULT_CONFIG.fontSize;
          ctx.font = `bold ${Math.min(fontSize, sectorAngle > 30 ? 14 : 10)}px sans-serif`;
          const label = prize.sectorLabel || prize.name;
          // Truncate label if too long
          const maxLen = sectorAngle > 40 ? 12 : sectorAngle > 25 ? 8 : 5;
          const truncatedLabel = label.length > maxLen ? label.substring(0, maxLen) + '...' : label;
          ctx.fillText(truncatedLabel, radius - 15, 4);
          ctx.restore();
        }

        ctx.restore();

        // Draw center circle
        ctx.beginPath();
        ctx.arc(center, center, 30, 0, 2 * Math.PI);
        ctx.fillStyle = config.centerColor || DEFAULT_CONFIG.centerColor;
        ctx.fill();
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw pointer/arrow at top (pointing down toward the wheel)
        const pointerLength = 35;
        const pointerWidth = 18;
        ctx.beginPath();
        ctx.moveTo(center, center - radius - 15); // Tip pointing down toward wheel
        ctx.lineTo(center - pointerWidth / 2, center - radius - 15 - pointerLength);
        ctx.lineTo(center + pointerWidth / 2, center - radius - 15 - pointerLength);
        ctx.closePath();
        ctx.fillStyle = config.pointerColor || DEFAULT_CONFIG.pointerColor;
        ctx.fill();
        ctx.strokeStyle = '#FFD700';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Small circle at pointer base
        ctx.beginPath();
        ctx.arc(center, center - radius - 15 - pointerLength / 2, 5, 0, 2 * Math.PI);
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
          const newSize = Math.min(width, 500);
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
      <div ref={containerRef} className="w-full max-w-[500px] mx-auto aspect-square">
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
