'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { WheelSector, WheelConfig } from '@/types';

interface SpinWheelProps {
  sectors: WheelSector[];
  wheelConfig: WheelConfig | null;
  isSpinning: boolean;
  finalAngle: number;
  soundEnabled: boolean;
}

// Utility: lighten a hex color by a percentage
function lightenColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
  const B = Math.min(255, (num & 0x0000FF) + amt);
  const val = (R << 16) + (G << 8) + B;
  return `#${(0x1000000 + val).toString(16).slice(1)}`;
}

export function SpinWheel({ sectors, wheelConfig, isSpinning, finalAngle, soundEnabled }: SpinWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const prevSpinningRef = useRef(false);
  const isAnimatingRef = useRef(false);
  const startAngleRef = useRef(0);
  const targetAngleRef = useRef(0);
  const startTimeRef = useRef(0);
  const currentRotationRef = useRef(0);

  const config = wheelConfig || {
    sectorCount: 10,
    spinDuration: 5000,
    pointerColor: '#FF0000',
    centerColor: '#FFFFFF',
    outerRingColor: '#333333',
    backgroundColor: '#1a1a2e',
    textColor: '#FFFFFF',
    fontSize: 14,
  };

  const sectorCount = sectors.length || config.sectorCount;
  const sectorAngle = 360 / sectorCount;

  // Draw the wheel on canvas - uses refs so it doesn't need to be in React's dependency tracking
  const drawWheel = useCallback((rotation: number, animating: boolean) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size / 2 - 20;
    const innerRadius = 30;

    // Clear canvas
    ctx.clearRect(0, 0, size, size);

    // Apply 3D shadow effect
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 30;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 5;

    // Outer ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 10, 0, Math.PI * 2);
    ctx.fillStyle = config.outerRingColor;
    ctx.fill();
    ctx.restore();

    // Gold rim with gradient
    ctx.save();
    const rimGradient = ctx.createRadialGradient(centerX, centerY, radius - 2, centerX, centerY, radius + 10);
    rimGradient.addColorStop(0, '#FFD700');
    rimGradient.addColorStop(0.5, '#B8860B');
    rimGradient.addColorStop(1, '#FFD700');
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius + 10, 0, Math.PI * 2);
    ctx.strokeStyle = rimGradient;
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.restore();

    // Draw sectors
    const rotationRad = (rotation * Math.PI) / 180;
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotationRad);

    for (let i = 0; i < sectorCount; i++) {
      const sector = sectors[i] || {
        label: 'Perdant',
        color: '#374151',
        isLosing: true,
      };

      const startAngleRad = (i * sectorAngle * Math.PI) / 180;
      const endAngleRad = ((i + 1) * sectorAngle * Math.PI) / 180;

      // Sector fill with gradient
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, startAngleRad, endAngleRad);
      ctx.closePath();

      // Create gradient for sector
      const midAngle = (startAngleRad + endAngleRad) / 2;
      const gradientX2 = Math.cos(midAngle) * radius;
      const gradientY2 = Math.sin(midAngle) * radius;

      const sectorGradient = ctx.createLinearGradient(0, 0, gradientX2, gradientY2);
      if (sector.isLosing) {
        sectorGradient.addColorStop(0, '#4B5563');
        sectorGradient.addColorStop(1, sector.color);
      } else {
        sectorGradient.addColorStop(0, lightenColor(sector.color, 30));
        sectorGradient.addColorStop(1, sector.color);
      }

      ctx.fillStyle = sectorGradient;
      ctx.fill();

      // Sector border
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Sector text
      ctx.save();
      ctx.rotate(midAngle);
      const labelRadius = radius * 0.65;
      ctx.fillStyle = config.textColor;
      ctx.font = `bold ${Math.min(config.fontSize, 14)}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // Truncate long labels
      const maxChars = Math.floor(sectorAngle / 10);
      let labelText = sector.label;
      if (labelText.length > maxChars + 3) {
        labelText = labelText.substring(0, maxChars) + '..';
      }

      // Draw text with shadow for readability
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 3;
      ctx.fillText(labelText, labelRadius, 0);
      ctx.restore();

      // Losing sector icon (sad face)
      if (sector.isLosing) {
        ctx.save();
        ctx.rotate(midAngle);
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('😔', radius * 0.35, 0);
        ctx.restore();
      }
    }

    // Center circle with 3D effect
    ctx.beginPath();
    ctx.arc(0, 0, innerRadius + 5, 0, Math.PI * 2);
    const centerGradient = ctx.createRadialGradient(-5, -5, 0, 0, 0, innerRadius + 5);
    centerGradient.addColorStop(0, '#FFFFFF');
    centerGradient.addColorStop(0.5, '#E0E0E0');
    centerGradient.addColorStop(1, '#B0B0B0');
    ctx.fillStyle = centerGradient;
    ctx.fill();
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.stroke();

    // Center text
    ctx.font = 'bold 10px Arial';
    ctx.fillStyle = '#333';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('★', 0, 0);

    ctx.restore();

    // Pointer (fixed, not rotating) - triangular arrow at top
    ctx.save();
    ctx.translate(centerX, centerY - radius - 5);

    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 3;

    ctx.beginPath();
    ctx.moveTo(0, 30);
    ctx.lineTo(-15, -5);
    ctx.lineTo(15, -5);
    ctx.closePath();

    const pointerGradient = ctx.createLinearGradient(0, -5, 0, 30);
    pointerGradient.addColorStop(0, '#FF4444');
    pointerGradient.addColorStop(1, config.pointerColor);

    ctx.fillStyle = pointerGradient;
    ctx.fill();
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    // Decorative dots around the rim (lights)
    for (let i = 0; i < sectorCount * 2; i++) {
      const dotAngle = (i * Math.PI * 2) / (sectorCount * 2) + rotationRad;
      const dotX = centerX + Math.cos(dotAngle) * (radius + 5);
      const dotY = centerY + Math.sin(dotAngle) * (radius + 5);

      ctx.beginPath();
      ctx.arc(dotX, dotY, 3, 0, Math.PI * 2);
      ctx.fillStyle = animating
        ? (i % 2 === 0 ? '#FFD700' : '#FF6B35')
        : (i % 3 === 0 ? '#FFD700' : i % 3 === 1 ? '#FF6B35' : '#FF4444');
      ctx.fill();
    }
  }, [sectors, config, sectorCount, sectorAngle]);

  // Initial draw and resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const container = canvas.parentElement;
    if (!container) return;

    const containerWidth = container.clientWidth;
    const maxSize = Math.min(containerWidth, 500);
    canvas.width = maxSize;
    canvas.height = maxSize;

    drawWheel(currentRotationRef.current, isAnimatingRef.current);
  }, [sectors, config, drawWheel]);

  // Animation logic - start when isSpinning changes to true
  useEffect(() => {
    if (isSpinning && !prevSpinningRef.current) {
      prevSpinningRef.current = true;
      isAnimatingRef.current = true;

      startAngleRef.current = currentRotationRef.current;
      targetAngleRef.current = finalAngle;
      startTimeRef.current = Date.now();

      const duration = config.spinDuration;

      const animate = () => {
        const elapsed = Date.now() - startTimeRef.current;
        const progress = Math.min(elapsed / duration, 1);

        // Ease out cubic for smooth deceleration
        const eased = 1 - Math.pow(1 - progress, 3);

        const newRotation = startAngleRef.current + (targetAngleRef.current - startAngleRef.current) * eased;
        currentRotationRef.current = newRotation;
        drawWheel(newRotation, true);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          isAnimatingRef.current = false;
          currentRotationRef.current = targetAngleRef.current;
          drawWheel(targetAngleRef.current, false);
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    }

    if (!isSpinning && prevSpinningRef.current) {
      prevSpinningRef.current = false;
      isAnimatingRef.current = false;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      drawWheel(currentRotationRef.current, false);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isSpinning, finalAngle, config.spinDuration, drawWheel]);

  // Handle window resize
  useEffect(() => {
    function handleResize() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const container = canvas.parentElement;
      if (!container) return;

      const containerWidth = container.clientWidth;
      const maxSize = Math.min(containerWidth, 500);
      canvas.width = maxSize;
      canvas.height = maxSize;

      drawWheel(currentRotationRef.current, isAnimatingRef.current);
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawWheel]);

  return (
    <div className="relative w-full flex items-center justify-center">
      {/* Glow effect behind wheel */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className={`w-[90%] h-[90%] rounded-full transition-all duration-1000 ${
            isSpinning
              ? 'shadow-[0_0_60px_rgba(255,215,0,0.6),0_0_120px_rgba(255,107,35,0.3)]'
              : 'shadow-[0_0_30px_rgba(255,215,0,0.2)]'
          }`}
          style={{ background: 'radial-gradient(circle, rgba(255,215,0,0.1) 0%, transparent 70%)' }}
        />
      </div>

      <canvas
        ref={canvasRef}
        className="relative z-10 max-w-full"
        style={{ aspectRatio: '1/1' }}
      />
    </div>
  );
}
