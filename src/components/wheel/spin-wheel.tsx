'use client';

import { useEffect, useRef, useCallback } from 'react';
import { WheelSector, WheelConfig } from '@/types';

// ─── Constants ───────────────────────────────────────────────────────────────
const LOSING_COLOR = '#2D2D2D';       // Uniform color for ALL losing sectors
const BG_COLOR = '#0a0a0a';           // Opaque dark background circle
const CENTER_COLOR = '#0a0a0a';       // Black center hub
const GOLD_LIGHT = '#FFD700';         // Light gold
const GOLD_DARK = '#B8860B';          // Dark gold
const RIM_WIDTH = 14;                 // Width of the golden rim ring
const RIVET_RADIUS = 4;              // Radius of decorative rivets on rim
const LIGHT_RADIUS = 3.5;            // Radius of decorative lights around rim
const LIGHT_COUNT_MULTIPLIER = 2;    // Number of lights per sector
const CENTER_HUB_RADIUS = 38;        // Center hub circle radius
const MAX_CANVAS_SIZE = 560;         // Max canvas dimension in px
const TEXT_FONT_SIZE = 16;           // Sector label font size
const TEXT_RADIUS_RATIO = 0.65;      // Position text at 65% of the radius
const ANIMATION_DURATION = 5000;     // Default spin duration in ms

// ─── Props ───────────────────────────────────────────────────────────────────
interface SpinWheelProps {
  sectors: WheelSector[];
  wheelConfig: WheelConfig | null;
  isSpinning: boolean;
  finalAngle: number;
  soundEnabled: boolean;
}

// ─── Utility: lighten a hex color by a percentage ────────────────────────────
function lightenColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
  const B = Math.min(255, (num & 0x0000FF) + amt);
  const val = (R << 16) + (G << 8) + B;
  return `#${(0x1000000 + val).toString(16).slice(1)}`;
}

// ─── Utility: truncate label to fit within sector arc ────────────────────────
function truncateLabel(label: string, maxChars: number): string {
  if (label.length <= maxChars) return label;
  return label.substring(0, maxChars - 1) + '…';
}

// ─── Component ───────────────────────────────────────────────────────────────
export function SpinWheel({
  sectors,
  wheelConfig,
  isSpinning,
  finalAngle,
  soundEnabled,
}: SpinWheelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const prevSpinningRef = useRef(false);
  const isAnimatingRef = useRef(false);
  const startAngleRef = useRef(0);
  const targetAngleRef = useRef(0);
  const startTimeRef = useRef(0);
  const currentRotationRef = useRef(0);
  // Track light flash phase for animation
  const lightPhaseRef = useRef(0);

  const config = wheelConfig || {
    sectorCount: 10,
    spinDuration: ANIMATION_DURATION,
    pointerColor: '#FF0000',
    centerColor: CENTER_COLOR,
    outerRingColor: '#333333',
    backgroundColor: BG_COLOR,
    textColor: '#FFFFFF',
    fontSize: TEXT_FONT_SIZE,
  };

  const sectorCount = sectors.length || config.sectorCount;
  const sectorAngle = 360 / sectorCount;
  const spinDuration = config.spinDuration || ANIMATION_DURATION;

  // ─── Draw the wheel ─────────────────────────────────────────────────────
  const drawWheel = useCallback(
    (rotation: number, animating: boolean) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const size = canvas.width;
      const centerX = size / 2;
      const centerY = size / 2;
      const radius = size / 2 - RIM_WIDTH - 4; // Inner radius for sectors
      const outerRadius = size / 2 - 4;         // Outer edge of the rim

      // Clear the entire canvas
      ctx.clearRect(0, 0, size, size);

      // ── 0. Fill entire canvas with opaque black background
      // This prevents ANY transparency — the gradient background of the page will NOT show through
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, size, size);

      // ── 1. Opaque dark background circle ──────────────────────────────
      // This prevents any transparency showing through
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius + 2, 0, Math.PI * 2);
      ctx.fillStyle = BG_COLOR;
      ctx.fill();
      ctx.restore();

      // ── 2. Shadow behind the wheel ────────────────────────────────────
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 25;
      ctx.shadowOffsetX = 4;
      ctx.shadowOffsetY = 4;
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
      ctx.fillStyle = BG_COLOR;
      ctx.fill();
      ctx.restore();

      // ── 3. Draw sectors (rotated) ─────────────────────────────────────
      const rotationRad = (rotation * Math.PI) / 180;
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(rotationRad);

      for (let i = 0; i < sectorCount; i++) {
        const sector = sectors[i] || {
          label: 'Perdant',
          color: LOSING_COLOR,
          isLosing: true,
        };

        const startAngleRad = (i * sectorAngle * Math.PI) / 180;
        const endAngleRad = ((i + 1) * sectorAngle * Math.PI) / 180;
        const midAngleRad = (startAngleRad + endAngleRad) / 2;

        // ── Sector fill ───────────────────────────────────────────────
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, startAngleRad, endAngleRad);
        ctx.closePath();

        if (sector.isLosing) {
          // ALL losing sectors: uniform color, NO gradient
          ctx.fillStyle = LOSING_COLOR;
        } else {
          // Winning sectors: slight gradient from lighter shade to base color
          const gradientX2 = Math.cos(midAngleRad) * radius;
          const gradientY2 = Math.sin(midAngleRad) * radius;
          const sectorGradient = ctx.createLinearGradient(0, 0, gradientX2, gradientY2);
          sectorGradient.addColorStop(0, lightenColor(sector.color, 25));
          sectorGradient.addColorStop(1, sector.color);
          ctx.fillStyle = sectorGradient;
        }
        ctx.fill();

        // ── Sector border lines (thin golden) ─────────────────────────
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.3)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // ── Sector text (horizontal, readable from outside) ──────────
        ctx.save();
        const textRadius = radius * TEXT_RADIUS_RATIO;
        const textX = Math.cos(midAngleRad) * textRadius;
        const textY = Math.sin(midAngleRad) * textRadius;

        // In canvas coordinates, y increases downward.
        // Sectors where textY > 0 are in the BOTTOM half of the screen.
        // For those sectors, we flip the text (add π rotation) so it reads
        // correctly from outside the wheel instead of appearing upside-down.
        // We check the actual screen position including the wheel rotation.
        const actualTextY = Math.sin(midAngleRad + rotationRad) * textRadius;
        const isBottomHalf = actualTextY > 0;

        ctx.translate(textX, textY);

        if (isBottomHalf) {
          // Bottom-half: flip text so it reads from outside (top of text faces outward)
          ctx.rotate(-rotationRad - midAngleRad + Math.PI);
        } else {
          // Top-half: normal horizontal text (top of text faces inward/center)
          ctx.rotate(-rotationRad - midAngleRad);
        }

        // Determine max characters based on sector angle
        const maxChars = Math.max(5, Math.floor(sectorAngle / 6));
        const labelText = truncateLabel(sector.label, maxChars);

        ctx.fillStyle = '#FFFFFF';
        ctx.font = `bold ${TEXT_FONT_SIZE}px Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Text shadow for readability
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        ctx.fillText(labelText, 0, 0);
        ctx.restore();
      }

      // ── 4. Center hub (black with golden border) ─────────────────────
      ctx.beginPath();
      ctx.arc(0, 0, CENTER_HUB_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = CENTER_COLOR;
      ctx.fill();
      // Golden border ring
      ctx.strokeStyle = GOLD_LIGHT;
      ctx.lineWidth = 3;
      ctx.stroke();

      // Inner decorative golden ring
      ctx.beginPath();
      ctx.arc(0, 0, CENTER_HUB_RADIUS - 6, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 215, 0, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.restore(); // End rotated context

      // ── 5. Golden rim with gradient ───────────────────────────────────
      // Draw the rim as a thick ring between radius and outerRadius
      ctx.save();
      const rimGradient = ctx.createRadialGradient(
        centerX,
        centerY,
        radius - 2,
        centerX,
        centerY,
        outerRadius
      );
      rimGradient.addColorStop(0, GOLD_LIGHT);
      rimGradient.addColorStop(0.4, GOLD_DARK);
      rimGradient.addColorStop(0.7, GOLD_LIGHT);
      rimGradient.addColorStop(1, GOLD_DARK);

      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2, true); // Counter-clockwise for cutout
      ctx.fillStyle = rimGradient;
      ctx.fill();

      // Outer rim border
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
      ctx.strokeStyle = GOLD_DARK;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Inner rim border
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = GOLD_LIGHT;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();

      // ── 6. Rivets on the golden rim at sector boundaries ──────────────
      const rimMidRadius = (radius + outerRadius) / 2;
      ctx.save();
      for (let i = 0; i < sectorCount; i++) {
        const angleRad = (i * sectorAngle * Math.PI) / 180 + rotationRad;
        const rivetX = centerX + Math.cos(angleRad) * rimMidRadius;
        const rivetY = centerY + Math.sin(angleRad) * rimMidRadius;

        // Rivet base (dark circle for depth)
        ctx.beginPath();
        ctx.arc(rivetX, rivetY, RIVET_RADIUS + 1, 0, Math.PI * 2);
        ctx.fillStyle = '#8B6914';
        ctx.fill();

        // Rivet highlight (golden circle)
        ctx.beginPath();
        ctx.arc(rivetX, rivetY, RIVET_RADIUS, 0, Math.PI * 2);
        const rivetGrad = ctx.createRadialGradient(
          rivetX - 1,
          rivetY - 1,
          0,
          rivetX,
          rivetY,
          RIVET_RADIUS
        );
        rivetGrad.addColorStop(0, '#FFF8DC'); // Light highlight
        rivetGrad.addColorStop(0.5, GOLD_LIGHT);
        rivetGrad.addColorStop(1, GOLD_DARK);
        ctx.fillStyle = rivetGrad;
        ctx.fill();
      }
      ctx.restore();

      // ── 7. Decorative lights around the rim (alternating gold/red) ────
      const lightCount = sectorCount * LIGHT_COUNT_MULTIPLIER;
      const lightRadius = outerRadius + 1;
      const lightPhase = lightPhaseRef.current;

      ctx.save();
      for (let i = 0; i < lightCount; i++) {
        const angleRad = (i * Math.PI * 2) / lightCount + rotationRad;
        const lightX = centerX + Math.cos(angleRad) * lightRadius;
        const lightY = centerY + Math.sin(angleRad) * lightRadius;

        // Determine if this light is "on" during animation (flash effect)
        const isOn = animating
          ? (i + lightPhase) % 3 !== 0
          : true; // All on when not spinning

        if (!isOn) continue;

        const isGold = i % 2 === 0;
        const baseColor = isGold ? GOLD_LIGHT : '#FF2D2D';

        // Light glow
        ctx.beginPath();
        ctx.arc(lightX, lightY, LIGHT_RADIUS + 2, 0, Math.PI * 2);
        ctx.fillStyle = isGold
          ? 'rgba(255, 215, 0, 0.3)'
          : 'rgba(255, 45, 45, 0.3)';
        ctx.fill();

        // Light dot
        ctx.beginPath();
        ctx.arc(lightX, lightY, LIGHT_RADIUS, 0, Math.PI * 2);
        const lightGrad = ctx.createRadialGradient(
          lightX,
          lightY,
          0,
          lightX,
          lightY,
          LIGHT_RADIUS
        );
        lightGrad.addColorStop(0, isGold ? '#FFFACD' : '#FF8888');
        lightGrad.addColorStop(1, baseColor);
        ctx.fillStyle = lightGrad;
        ctx.fill();
      }
      ctx.restore();

      // ── 8. Golden triangle pointer with red jewel (fixed at top) ──────
      ctx.save();
      const pointerTipY = centerY - radius + 8; // Tip goes further into the wheel for visibility
      const pointerBaseY = centerY - outerRadius - 28;
      const pointerHalfWidth = 22;

      // Pointer shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 3;

      // Golden triangle
      ctx.beginPath();
      ctx.moveTo(centerX, pointerTipY);                           // Tip (pointing down)
      ctx.lineTo(centerX - pointerHalfWidth, pointerBaseY);       // Top-left
      ctx.lineTo(centerX + pointerHalfWidth, pointerBaseY);       // Top-right
      ctx.closePath();

      const pointerGradient = ctx.createLinearGradient(
        centerX,
        pointerBaseY,
        centerX,
        pointerTipY
      );
      pointerGradient.addColorStop(0, GOLD_LIGHT);
      pointerGradient.addColorStop(0.5, '#DAA520');
      pointerGradient.addColorStop(1, GOLD_DARK);
      ctx.fillStyle = pointerGradient;
      ctx.fill();

      // Pointer border
      ctx.strokeStyle = GOLD_DARK;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Reset shadow for the jewel
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      // Red jewel circle inside the pointer
      const jewelCenterY = pointerBaseY + (pointerTipY - pointerBaseY) * 0.35;
      const jewelRadius = 6;

      // Jewel outer ring
      ctx.beginPath();
      ctx.arc(centerX, jewelCenterY, jewelRadius + 1.5, 0, Math.PI * 2);
      ctx.fillStyle = GOLD_DARK;
      ctx.fill();

      // Jewel body (red with gradient)
      ctx.beginPath();
      ctx.arc(centerX, jewelCenterY, jewelRadius, 0, Math.PI * 2);
      const jewelGrad = ctx.createRadialGradient(
        centerX - 1,
        jewelCenterY - 1,
        0,
        centerX,
        jewelCenterY,
        jewelRadius
      );
      jewelGrad.addColorStop(0, '#FF6666');   // Light red highlight
      jewelGrad.addColorStop(0.4, '#FF0000'); // Bright red
      jewelGrad.addColorStop(1, '#8B0000');   // Dark red
      ctx.fillStyle = jewelGrad;
      ctx.fill();

      // Jewel shine
      ctx.beginPath();
      ctx.arc(centerX - 2, jewelCenterY - 2, 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fill();

      ctx.restore();
    },
    [sectors, config, sectorCount, sectorAngle]
  );

  // ─── Initial draw & resize ──────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const container = canvas.parentElement;
    if (!container) return;

    const containerWidth = container.clientWidth;
    const maxSize = Math.min(containerWidth, MAX_CANVAS_SIZE);
    canvas.width = maxSize;
    canvas.height = maxSize;

    drawWheel(currentRotationRef.current, isAnimatingRef.current);
  }, [sectors, config, drawWheel]);

  // ─── Animation: starts when isSpinning flips to true ────────────────────
  useEffect(() => {
    if (isSpinning && !prevSpinningRef.current) {
      prevSpinningRef.current = true;
      isAnimatingRef.current = true;

      startAngleRef.current = currentRotationRef.current;
      targetAngleRef.current = finalAngle;
      startTimeRef.current = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTimeRef.current;
        const progress = Math.min(elapsed / spinDuration, 1);

        // Ease-out cubic for smooth deceleration
        const eased = 1 - Math.pow(1 - progress, 3);

        const newRotation =
          startAngleRef.current +
          (targetAngleRef.current - startAngleRef.current) * eased;
        currentRotationRef.current = newRotation;

        // Update light phase for flashing effect
        lightPhaseRef.current = Math.floor(elapsed / 150) % 3;

        drawWheel(newRotation, true);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          isAnimatingRef.current = false;
          currentRotationRef.current = targetAngleRef.current;
          lightPhaseRef.current = 0;
          drawWheel(targetAngleRef.current, false);
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    }

    if (!isSpinning && prevSpinningRef.current) {
      prevSpinningRef.current = false;
      isAnimatingRef.current = false;
      lightPhaseRef.current = 0;
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
  }, [isSpinning, finalAngle, spinDuration, drawWheel]);

  // ─── Handle window resize ───────────────────────────────────────────────
  useEffect(() => {
    function handleResize() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const container = canvas.parentElement;
      if (!container) return;

      const containerWidth = container.clientWidth;
      const maxSize = Math.min(containerWidth, MAX_CANVAS_SIZE);
      canvas.width = maxSize;
      canvas.height = maxSize;

      drawWheel(currentRotationRef.current, isAnimatingRef.current);
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [drawWheel]);

  return (
    <div className="relative w-full max-w-[560px] mx-auto flex items-center justify-center">
      {/* Glow effect behind wheel */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className={`w-[92%] h-[92%] rounded-full transition-all duration-1000 ${
            isSpinning
              ? 'shadow-[0_0_60px_rgba(255,215,0,0.5),0_0_120px_rgba(255,107,35,0.25)]'
              : 'shadow-[0_0_30px_rgba(255,215,0,0.15)]'
          }`}
          style={{
            background:
              'radial-gradient(circle, rgba(255,215,0,0.08) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* Canvas wheel - opaque black background prevents transparency */}
      <canvas
        ref={canvasRef}
        className="relative z-10 max-w-full rounded-full"
        style={{ aspectRatio: '1 / 1', background: '#000000' }}
      />
    </div>
  );
}
