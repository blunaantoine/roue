'use client';

import { useEffect, useRef, useCallback } from 'react';
import { WheelSector, WheelConfig } from '@/types';

// ─── Design Constants ────────────────────────────────────────────────────────
const LOSING_COLOR = '#1a1a1a';          // Charcoal black for losing sectors
const WINNING_GREEN = '#1B5E20';         // Forest green for winning sectors (type A)
const WINNING_GOLD = '#FDB933';          // Gold for winning sectors (type B)
const BG_COLOR = '#000000';              // Black background circle
const CENTER_COLOR = '#000000';          // Black center hub
const GOLD_LIGHT = '#FFD700';            // Light gold
const GOLD_DARK = '#D4AF37';             // Dark gold / metallic gold
const RIM_WIDTH = 16;                    // Width of golden rim ring
const RIVET_RADIUS = 4;                 // Rivet radius
const LIGHT_RADIUS = 3;                // Decorative light radius
const LIGHT_COUNT_MULTIPLIER = 2;       // Lights per sector
const CENTER_HUB_RADIUS = 40;           // Center hub radius
const MAX_CANVAS_SIZE = 520;            // Max canvas size
const TEXT_FONT_SIZE = 13;              // Sector label font size
const TEXT_RADIUS_RATIO = 0.65;         // Text position ratio
const ANIMATION_DURATION = 5000;        // Default spin duration

// ─── Props ───────────────────────────────────────────────────────────────────
interface SpinWheelProps {
  sectors: WheelSector[];
  wheelConfig: WheelConfig | null;
  isSpinning: boolean;
  finalAngle: number;
  soundEnabled: boolean;
}

// ─── Utility ────────────────────────────────────────────────────────────────
function lightenColor(color: string, percent: number): string {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
  const B = Math.min(255, (num & 0x0000FF) + amt);
  const val = (R << 16) + (G << 8) + B;
  return `#${(0x1000000 + val).toString(16).slice(1)}`;
}

function truncateLabel(label: string, maxChars: number): string {
  if (label.length <= maxChars) return label;
  return label.substring(0, maxChars - 1) + '…';
}

// ─── Sector Color Assignment ────────────────────────────────────────────────
// Alternating pattern: green-gold-charcoal for a visually appealing wheel
// Losing sectors = charcoal (#1a1a1a)
// Winning sectors alternate between green (#1B5E20) and gold (#FDB933)
function getSectorColor(index: number, isLosing: boolean, prizeColor: string): string {
  if (isLosing) return LOSING_COLOR;
  // For winning sectors, use the prize's color from the database
  // If no color set, alternate between green and gold
  if (prizeColor && prizeColor !== '#FF6B6B') return prizeColor;
  // Default alternating pattern
  const pattern = index % 3;
  if (pattern === 0) return WINNING_GREEN;
  if (pattern === 1) return WINNING_GOLD;
  return LOSING_COLOR;
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
  const lightPhaseRef = useRef(0);

  const config = wheelConfig || {
    sectorCount: 10,
    spinDuration: ANIMATION_DURATION,
    pointerColor: '#FF0000',
    centerColor: CENTER_COLOR,
    outerRingColor: '#D4AF37',
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
      const radius = size / 2 - RIM_WIDTH - 6;
      const outerRadius = size / 2 - 4;

      // Clear canvas + fill opaque black background
      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, size, size);

      // ── 1. Opaque background circle ────────────────────────────────
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius + 2, 0, Math.PI * 2);
      ctx.fillStyle = BG_COLOR;
      ctx.fill();
      ctx.restore();

      // ── 2. Shadow behind wheel ──────────────────────────────────────
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 30;
      ctx.shadowOffsetX = 5;
      ctx.shadowOffsetY = 5;
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
      ctx.fillStyle = BG_COLOR;
      ctx.fill();
      ctx.restore();

      // ── 3. Draw sectors (rotated) ──────────────────────────────────
      const rotationRad = (rotation * Math.PI) / 180;
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(rotationRad);

      for (let i = 0; i < sectorCount; i++) {
        const sector = sectors[i] || {
          label: 'PERDU',
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

        const sectorColor = getSectorColor(i, sector.isLosing, sector.color);

        if (sector.isLosing) {
          // Losing sectors: flat charcoal
          ctx.fillStyle = LOSING_COLOR;
        } else {
          // Winning sectors: slight gradient for 3D depth
          const gradientX2 = Math.cos(midAngleRad) * radius;
          const gradientY2 = Math.sin(midAngleRad) * radius;
          const sectorGradient = ctx.createLinearGradient(0, 0, gradientX2, gradientY2);
          sectorGradient.addColorStop(0, lightenColor(sectorColor, 20));
          sectorGradient.addColorStop(1, sectorColor);
          ctx.fillStyle = sectorGradient;
        }
        ctx.fill();

        // ── Sector border lines (thin golden) ─────────────────────────
        ctx.strokeStyle = 'rgba(212, 175, 55, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // ── Sector text ──────────────────────────────────────────────
        ctx.save();
        const textRadius = radius * TEXT_RADIUS_RATIO;
        const textX = Math.cos(midAngleRad) * textRadius;
        const textY = Math.sin(midAngleRad) * textRadius;

        const actualTextY = Math.sin(midAngleRad + rotationRad) * textRadius;
        const isBottomHalf = actualTextY > 0;

        ctx.translate(textX, textY);
        if (isBottomHalf) {
          ctx.rotate(-rotationRad - midAngleRad + Math.PI);
        } else {
          ctx.rotate(-rotationRad - midAngleRad);
        }

        const maxChars = Math.max(5, Math.floor(sectorAngle / 7));
        const labelText = truncateLabel(sector.label, maxChars);

        // Determine text color based on sector background
        const textColorForSector = sector.isLosing ? '#FFFFFF' : 
          (sectorColor === WINNING_GOLD ? '#000000' : '#FFFFFF');

        ctx.fillStyle = textColorForSector;
        ctx.font = `bold ${TEXT_FONT_SIZE}px 'Montserrat', Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 4;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
        ctx.fillText(labelText, 0, 0);
        ctx.restore();
      }

      // ── 4. Center hub (black with golden border + FLR logo) ────────
      ctx.beginPath();
      ctx.arc(0, 0, CENTER_HUB_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = CENTER_COLOR;
      ctx.fill();
      ctx.strokeStyle = GOLD_DARK;
      ctx.lineWidth = 3;
      ctx.stroke();

      // Inner decorative ring
      ctx.beginPath();
      ctx.arc(0, 0, CENTER_HUB_RADIUS - 8, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // FLR text in center hub
      ctx.save();
      ctx.fillStyle = '#00C853';
      ctx.font = 'bold 16px Montserrat, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('FLR', 0, -6);
      ctx.fillStyle = '#9E9E9E';
      ctx.font = 'bold 6px Montserrat, Arial, sans-serif';
      ctx.fillText('LA ROUTE', 0, 6);
      ctx.restore();

      ctx.restore(); // End rotated context

      // ── 5. Golden rim with gradient ─────────────────────────────────
      ctx.save();
      const rimGradient = ctx.createRadialGradient(
        centerX, centerY, radius - 2, centerX, centerY, outerRadius
      );
      rimGradient.addColorStop(0, GOLD_LIGHT);
      rimGradient.addColorStop(0.3, '#FFE55C');
      rimGradient.addColorStop(0.5, GOLD_DARK);
      rimGradient.addColorStop(0.7, GOLD_LIGHT);
      rimGradient.addColorStop(1, GOLD_DARK);

      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2, true);
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

      // ── 6. Rivets on golden rim ──────────────────────────────────────
      const rimMidRadius = (radius + outerRadius) / 2;
      ctx.save();
      for (let i = 0; i < sectorCount; i++) {
        const angleRad = (i * sectorAngle * Math.PI) / 180 + rotationRad;
        const rivetX = centerX + Math.cos(angleRad) * rimMidRadius;
        const rivetY = centerY + Math.sin(angleRad) * rimMidRadius;

        // Rivet shadow
        ctx.beginPath();
        ctx.arc(rivetX, rivetY, RIVET_RADIUS + 1, 0, Math.PI * 2);
        ctx.fillStyle = '#8B6914';
        ctx.fill();

        // Rivet highlight
        ctx.beginPath();
        ctx.arc(rivetX, rivetY, RIVET_RADIUS, 0, Math.PI * 2);
        const rivetGrad = ctx.createRadialGradient(
          rivetX - 1, rivetY - 1, 0, rivetX, rivetY, RIVET_RADIUS
        );
        rivetGrad.addColorStop(0, '#FFFACD');
        rivetGrad.addColorStop(0.5, GOLD_LIGHT);
        rivetGrad.addColorStop(1, GOLD_DARK);
        ctx.fillStyle = rivetGrad;
        ctx.fill();
      }
      ctx.restore();

      // ── 7. Decorative lights around rim ────────────────────────────
      const lightCount = sectorCount * LIGHT_COUNT_MULTIPLIER;
      const lightRadius = outerRadius + 1;
      const lightPhase = lightPhaseRef.current;

      ctx.save();
      for (let i = 0; i < lightCount; i++) {
        const angleRad = (i * Math.PI * 2) / lightCount + rotationRad;
        const lightX = centerX + Math.cos(angleRad) * lightRadius;
        const lightY = centerY + Math.sin(angleRad) * lightRadius;

        const isOn = animating ? (i + lightPhase) % 3 !== 0 : true;
        if (!isOn) continue;

        const isGold = i % 2 === 0;
        const baseColor = isGold ? GOLD_LIGHT : '#00C853';

        // Light glow
        ctx.beginPath();
        ctx.arc(lightX, lightY, LIGHT_RADIUS + 2, 0, Math.PI * 2);
        ctx.fillStyle = isGold ? 'rgba(255, 215, 0, 0.3)' : 'rgba(0, 200, 83, 0.3)';
        ctx.fill();

        // Light dot
        ctx.beginPath();
        ctx.arc(lightX, lightY, LIGHT_RADIUS, 0, Math.PI * 2);
        const lightGrad = ctx.createRadialGradient(
          lightX, lightY, 0, lightX, lightY, LIGHT_RADIUS
        );
        lightGrad.addColorStop(0, isGold ? '#FFFACD' : '#66FF66');
        lightGrad.addColorStop(1, baseColor);
        ctx.fillStyle = lightGrad;
        ctx.fill();
      }
      ctx.restore();

      // ── 8. Golden triangle pointer with red jewel (fixed at top) ────
      ctx.save();
      const pointerTipY = centerY - radius + 10;
      const pointerBaseY = centerY - outerRadius - 28;
      const pointerHalfWidth = 20;

      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 4;

      ctx.beginPath();
      ctx.moveTo(centerX, pointerTipY);
      ctx.lineTo(centerX - pointerHalfWidth, pointerBaseY);
      ctx.lineTo(centerX + pointerHalfWidth, pointerBaseY);
      ctx.closePath();

      const pointerGradient = ctx.createLinearGradient(
        centerX, pointerBaseY, centerX, pointerTipY
      );
      pointerGradient.addColorStop(0, '#FFE55C');
      pointerGradient.addColorStop(0.4, GOLD_DARK);
      pointerGradient.addColorStop(1, GOLD_LIGHT);
      ctx.fillStyle = pointerGradient;
      ctx.fill();
      ctx.strokeStyle = GOLD_DARK;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      // Red jewel
      const jewelCenterY = pointerBaseY + (pointerTipY - pointerBaseY) * 0.35;
      const jewelRadius = 5;
      ctx.beginPath();
      ctx.arc(centerX, jewelCenterY, jewelRadius + 1.5, 0, Math.PI * 2);
      ctx.fillStyle = GOLD_DARK;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(centerX, jewelCenterY, jewelRadius, 0, Math.PI * 2);
      const jewelGrad = ctx.createRadialGradient(
        centerX - 1, jewelCenterY - 1, 0, centerX, jewelCenterY, jewelRadius
      );
      jewelGrad.addColorStop(0, '#FF6666');
      jewelGrad.addColorStop(0.4, '#FF0000');
      jewelGrad.addColorStop(1, '#8B0000');
      ctx.fillStyle = jewelGrad;
      ctx.fill();

      // Shine
      ctx.beginPath();
      ctx.arc(centerX - 2, jewelCenterY - 2, 1.5, 0, Math.PI * 2);
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

  // ─── Animation ──────────────────────────────────────────────────────────
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
        const eased = 1 - Math.pow(1 - progress, 3);
        const newRotation = startAngleRef.current + (targetAngleRef.current - startAngleRef.current) * eased;
        currentRotationRef.current = newRotation;
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
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      drawWheel(currentRotationRef.current, false);
    }

    return () => { if (animationRef.current) cancelAnimationFrame(animationRef.current); };
  }, [isSpinning, finalAngle, spinDuration, drawWheel]);

  // ─── Handle resize ──────────────────────────────────────────────────────
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
    <div className="relative w-full max-w-[520px] mx-auto flex items-center justify-center">
      {/* Glow effect behind wheel */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className={`w-[92%] h-[92%] rounded-full transition-all duration-1000 ${
            isSpinning
              ? 'shadow-[0_0_60px_rgba(255,215,0,0.5),0_0_120px_rgba(0,200,83,0.2)]'
              : 'shadow-[0_0_30px_rgba(255,215,0,0.12)]'
          }`}
          style={{ background: 'radial-gradient(circle, rgba(255,215,0,0.06) 0%, transparent 70%)' }}
        />
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className="relative z-10 max-w-full rounded-full"
        style={{ aspectRatio: '1 / 1', background: '#000000' }}
      />
    </div>
  );
}
