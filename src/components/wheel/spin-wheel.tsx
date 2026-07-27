'use client';

import { useEffect, useRef, useCallback } from 'react';
import { WheelSector, WheelConfig } from '@/types';

// ─── Exact Design Colors (from image analysis) ───────────────────────────────
const SECTOR_GREEN = '#1B8137';         // Forest green for green sectors
const SECTOR_BLACK = '#1C1C1C';         // Charcoal black for black sectors
const SECTOR_GOLD_LIGHT = '#E6C85C';    // Gold highlight
const SECTOR_GOLD_MID = '#D4AF37';      // Gold main
const SECTOR_GOLD_DARK = '#B8960F';     // Gold shadow
const BG_COLOR = '#0A0A0A';             // Near-black background
const CENTER_BG = '#111111';            // Center hub background
const GOLD_LIGHT = '#FFD700';           // Bright gold
const GOLD_CREAM = '#FFF8DC';           // Cream highlight
const GOLD_MAIN = '#DAA520';            // Goldenrod
const GOLD_SHADOW = '#8B6914';          // Dark gold shadow
const GOLD_BRIGHT = '#FFE55C';          // Bright gold highlight
const RIM_WIDTH = 18;                   // Thick golden rim (8-10% of diameter)
const RIVET_COUNT = 20;                 // 20 rivets evenly spaced
const RIVET_RADIUS = 7;                 // Rivet size (larger, more prominent)
const LIGHT_RADIUS = 3;                // LED light radius
const LIGHT_COLOR = '#39FF14';          // Neon green LED
const CENTER_HUB_RATIO = 0.30;         // Center hub is 30% of wheel diameter
const MAX_CANVAS_SIZE = 520;
const ANIMATION_DURATION = 5000;
const POINTER_WIDTH = 40;              // Pointer triangle width

// Alternating color pattern: Green → Black → Gold (repeating)
const COLOR_PATTERN = [SECTOR_GREEN, SECTOR_BLACK, SECTOR_GOLD_MID];

// ─── Props ───────────────────────────────────────────────────────────────────
interface SpinWheelProps {
  sectors: WheelSector[];
  wheelConfig: WheelConfig | null;
  isSpinning: boolean;
  finalAngle: number;
  soundEnabled: boolean;
}

// ─── Utility ────────────────────────────────────────────────────────────────
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
  const lightPhaseRef = useRef(0);

  const config = wheelConfig || {
    sectorCount: 10,
    spinDuration: ANIMATION_DURATION,
  };

  const sectorCount = sectors.length || config.sectorCount;
  const sectorAngle = 360 / sectorCount;
  const spinDuration = config.spinDuration || ANIMATION_DURATION;

  // ─── Get color for a sector position (alternating pattern) ────────────
  function getSectorPatternColor(index: number): string {
    return COLOR_PATTERN[index % COLOR_PATTERN.length];
  }

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
      const outerRadius = size / 2 - 4;
      const radius = size / 2 - RIM_WIDTH - 6;
      const centerHubRadius = size * CENTER_HUB_RATIO / 2;

      // Clear + fill black
      ctx.clearRect(0, 0, size, size);
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, size, size);

      // ── 1. Background circle (opaque) ────────────────────────────────
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius + 2, 0, Math.PI * 2);
      ctx.fillStyle = BG_COLOR;
      ctx.fill();
      ctx.restore();

      // ── 2. Drop shadow behind wheel ──────────────────────────────────
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 30;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 15;
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
      ctx.fillStyle = BG_COLOR;
      ctx.fill();
      ctx.restore();

      // ── 3. Inner shadow on wheel face (3D depth) ──────────────────────
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      const innerShadow = ctx.createRadialGradient(
        centerX, centerY, radius * 0.5, centerX, centerY, radius
      );
      innerShadow.addColorStop(0, 'transparent');
      innerShadow.addColorStop(1, 'rgba(0, 0, 0, 0.4)');
      ctx.fillStyle = innerShadow;
      ctx.fill();
      ctx.restore();

      // ── 4. Draw sectors (rotated) ────────────────────────────────────
      const rotationRad = (rotation * Math.PI) / 180;
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(rotationRad);

      for (let i = 0; i < sectorCount; i++) {
        const sector = sectors[i] || {
          label: 'PERDU',
          isLosing: true,
        };

        const startAngleRad = (i * sectorAngle * Math.PI) / 180;
        const endAngleRad = ((i + 1) * sectorAngle * Math.PI) / 180;
        const midAngleRad = (startAngleRad + endAngleRad) / 2;

        // ── Sector fill with pattern color ──────────────────────────────
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, startAngleRad, endAngleRad);
        ctx.closePath();

        const patternColor = getSectorPatternColor(i);

        if (patternColor === SECTOR_GOLD_MID) {
          // Gold sector: metallic gradient with bevel/emboss
          const gradientX2 = Math.cos(midAngleRad) * radius;
          const gradientY2 = Math.sin(midAngleRad) * radius;
          const sectorGradient = ctx.createLinearGradient(0, 0, gradientX2, gradientY2);
          sectorGradient.addColorStop(0, SECTOR_GOLD_LIGHT);
          sectorGradient.addColorStop(0.5, SECTOR_GOLD_MID);
          sectorGradient.addColorStop(1, SECTOR_GOLD_DARK);
          ctx.fillStyle = sectorGradient;
        } else if (patternColor === SECTOR_GREEN) {
          // Green sector: slight gradient for depth
          const gradientX2 = Math.cos(midAngleRad) * radius;
          const gradientY2 = Math.sin(midAngleRad) * radius;
          const sectorGradient = ctx.createLinearGradient(0, 0, gradientX2, gradientY2);
          sectorGradient.addColorStop(0, '#1B8137');
          sectorGradient.addColorStop(1, '#156B2E');
          ctx.fillStyle = sectorGradient;
        } else {
          // Black sector: flat matte
          ctx.fillStyle = SECTOR_BLACK;
        }
        ctx.fill();

        // ── Bevel/emboss effect for gold sectors ────────────────────────
        if (patternColor === SECTOR_GOLD_MID) {
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, radius, startAngleRad, endAngleRad);
          ctx.closePath();
          ctx.clip();

          // Highlight on upper-left
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, radius - 1, startAngleRad, startAngleRad + 0.04);
          ctx.stroke();

          // Shadow on lower-right
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.arc(0, 0, radius - 1, endAngleRad - 0.04, endAngleRad);
          ctx.stroke();

          ctx.restore();
        }

        // ── Sector separation (dark stroke) ─────────────────────────────
        ctx.strokeStyle = '#1A1A1A';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius, startAngleRad, endAngleRad);
        ctx.closePath();
        ctx.stroke();

        // ── Sector text ──────────────────────────────────────────────────
        ctx.save();
        const textRadius = radius * 0.65;
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

        // Text color: white on green/black, dark on gold
        const textColor = patternColor === SECTOR_GOLD_MID ? '#1C1C1C' : '#FFFFFF';

        ctx.fillStyle = textColor;
        ctx.font = `bold 14px 'Montserrat', Arial, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Text shadow for readability
        if (patternColor !== SECTOR_GOLD_MID) {
          ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
          ctx.shadowBlur = 3;
        } else {
          ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
          ctx.shadowBlur = 1;
        }

        // Two-line text if label is long enough or if sector has quantity
        if (sector.isLosing) {
          // Losing sectors: just "PERDU" with a ✕ symbol
          ctx.fillText('✕', 0, -8);
          ctx.font = `bold 12px 'Montserrat', Arial, sans-serif`;
          ctx.fillText(labelText, 0, 8);
        } else {
          // Winning sectors: just the name
          ctx.fillText(labelText, 0, 0);
        }

        ctx.restore();
      }

      // ── 5. Center hub (black with gold border, LR logo) ──────────────
      ctx.beginPath();
      ctx.arc(0, 0, centerHubRadius, 0, Math.PI * 2);
      const hubGradient = ctx.createRadialGradient(
        -5, -5, 0, 0, 0, centerHubRadius
      );
      hubGradient.addColorStop(0, '#222222');
      hubGradient.addColorStop(1, CENTER_BG);
      ctx.fillStyle = hubGradient;
      ctx.fill();

      // Gold border ring (4px thick)
      ctx.strokeStyle = GOLD_MAIN;
      ctx.lineWidth = 4;
      ctx.stroke();

      // Inner shadow on hub
      ctx.beginPath();
      ctx.arc(0, 0, centerHubRadius - 4, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Inner decorative gold ring
      ctx.beginPath();
      ctx.arc(0, 0, centerHubRadius - 12, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // LR text
      ctx.save();
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      // "FLR" logo: F in green, L in green, R in white
      ctx.fillStyle = '#4CAF50';
      ctx.font = 'bold 20px Montserrat, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const flrWidth = ctx.measureText('FLR').width;
      const fWidth = ctx.measureText('F').width;
      const lWidth = ctx.measureText('L').width;
      const rWidth = ctx.measureText('R').width;

      // Draw "FLR" character by character for color control
      const totalWidth = fWidth + lWidth + rWidth;
      const startX = -totalWidth / 2;
      ctx.textAlign = 'left';
      ctx.fillText('F', startX, -5);
      ctx.fillText('L', startX + fWidth, -5);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText('R', startX + fWidth + lWidth, -5);

      // "LA ROUTE SARIÉ" subtext
      ctx.textAlign = 'center';
      ctx.fillStyle = '#CCCCCC';
      ctx.font = '500 7px Montserrat, Arial, sans-serif';
      ctx.fillText('LA ROUTE SARIÉ', 0, 12);

      ctx.restore();

      ctx.restore(); // End rotated context

      // ── 6. Golden rim with metallic cylindrical bevel ─────────────────
      ctx.save();
      // Metallic rim gradient (top-left light, bottom-right shadow)
      const rimGradient = ctx.createLinearGradient(
        centerX - outerRadius, centerY - outerRadius,
        centerX + outerRadius, centerY + outerRadius
      );
      rimGradient.addColorStop(0, GOLD_CREAM);    // Light highlight (top-left)
      rimGradient.addColorStop(0.15, GOLD_BRIGHT);
      rimGradient.addColorStop(0.3, GOLD_MAIN);
      rimGradient.addColorStop(0.5, GOLD_SHADOW);  // Shadow (middle)
      rimGradient.addColorStop(0.7, GOLD_MAIN);
      rimGradient.addColorStop(0.85, GOLD_BRIGHT);
      rimGradient.addColorStop(1, GOLD_SHADOW);     // Dark shadow (bottom-right)

      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2, true);
      ctx.fillStyle = rimGradient;
      ctx.fill();

      // Outer rim border
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, 0, Math.PI * 2);
      ctx.strokeStyle = GOLD_SHADOW;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Inner rim border
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.strokeStyle = GOLD_BRIGHT;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();

      // ── 7. 20 Rivets evenly spaced on rim ────────────────────────────
      const rimMidRadius = (radius + outerRadius) / 2;
      ctx.save();
      for (let i = 0; i < RIVET_COUNT; i++) {
        const angleRad = (i * Math.PI * 2) / RIVET_COUNT + rotationRad;
        const rivetX = centerX + Math.cos(angleRad) * rimMidRadius;
        const rivetY = centerY + Math.sin(angleRad) * rimMidRadius;

        // Rivet outer glow (subtle)
        ctx.beginPath();
        ctx.arc(rivetX, rivetY, RIVET_RADIUS + 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(212, 175, 55, 0.3)';
        ctx.fill();

        // Rivet shadow ring
        ctx.beginPath();
        ctx.arc(rivetX, rivetY, RIVET_RADIUS + 1.5, 0, Math.PI * 2);
        ctx.fillStyle = GOLD_SHADOW;
        ctx.fill();

        // Rivet body - prominent metallic sphere
        ctx.beginPath();
        ctx.arc(rivetX, rivetY, RIVET_RADIUS, 0, Math.PI * 2);
        const rivetGrad = ctx.createRadialGradient(
          rivetX - 2, rivetY - 2, 0, rivetX, rivetY, RIVET_RADIUS
        );
        rivetGrad.addColorStop(0, '#FFFFFF');              // Strong white highlight (top-left)
        rivetGrad.addColorStop(0.15, GOLD_CREAM);         // Cream highlight
        rivetGrad.addColorStop(0.4, GOLD_LIGHT);          // Bright gold
        rivetGrad.addColorStop(0.7, GOLD_MAIN);           // Main gold
        rivetGrad.addColorStop(1, GOLD_SHADOW);            // Dark gold shadow
        ctx.fillStyle = rivetGrad;
        ctx.fill();
      }
      ctx.restore();

      // ── 8. Neon green LED lights between rivets ──────────────────────
      const lightCount = RIVET_COUNT;  // Same count as rivets, offset
      const lightRadius2 = outerRadius + 2;
      const lightPhase = lightPhaseRef.current;

      ctx.save();
      for (let i = 0; i < lightCount; i++) {
        const angleRad = ((i + 0.5) * Math.PI * 2) / lightCount + rotationRad;
        const lx = centerX + Math.cos(angleRad) * lightRadius2;
        const ly = centerY + Math.sin(angleRad) * lightRadius2;

        const isOn = animating ? (i + lightPhase) % 3 !== 0 : true;
        if (!isOn) continue;

        // Glow effect
        ctx.beginPath();
        ctx.arc(lx, ly, LIGHT_RADIUS + 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(57, 255, 20, 0.6)';
        ctx.fill();

        // Light body
        ctx.beginPath();
        ctx.arc(lx, ly, LIGHT_RADIUS, 0, Math.PI * 2);
        const lightGrad = ctx.createRadialGradient(
          lx, ly, 0, lx, ly, LIGHT_RADIUS
        );
        lightGrad.addColorStop(0, '#AAFFAA');
        lightGrad.addColorStop(0.4, LIGHT_COLOR);
        lightGrad.addColorStop(1, '#00AA00');
        ctx.fillStyle = lightGrad;
        ctx.fill();
      }
      ctx.restore();

      // ── 9. Gold triangle pointer with red jewel ──────────────────────
      ctx.save();
      const pointerTipY = centerY - radius + 12;
      const pointerBaseY = centerY - outerRadius - 30;
      const pointerHW = POINTER_WIDTH / 2;

      // Pointer shadow
      ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 4;

      // Gold triangle
      ctx.beginPath();
      ctx.moveTo(centerX, pointerTipY);
      ctx.lineTo(centerX - pointerHW, pointerBaseY);
      ctx.lineTo(centerX + pointerHW, pointerBaseY);
      ctx.closePath();

      const pointerGradient = ctx.createLinearGradient(
        centerX, pointerBaseY, centerX, pointerTipY
      );
      pointerGradient.addColorStop(0, GOLD_BRIGHT);
      pointerGradient.addColorStop(0.3, GOLD_MAIN);
      pointerGradient.addColorStop(0.6, GOLD_SHADOW);
      pointerGradient.addColorStop(1, GOLD_LIGHT);
      ctx.fillStyle = pointerGradient;
      ctx.fill();
      ctx.strokeStyle = GOLD_SHADOW;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Bevel highlight on left edge
      ctx.beginPath();
      ctx.moveTo(centerX - pointerHW + 2, pointerBaseY);
      ctx.lineTo(centerX - 2, pointerTipY);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      // Red jewel at top of pointer base
      const jewelY = pointerBaseY + 15;
      const jewelR = 6;

      // Red glow
      ctx.beginPath();
      ctx.arc(centerX, jewelY, jewelR + 5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 0, 0, 0.4)';
      ctx.fill();

      // Jewel gold ring
      ctx.beginPath();
      ctx.arc(centerX, jewelY, jewelR + 1.5, 0, Math.PI * 2);
      ctx.fillStyle = GOLD_SHADOW;
      ctx.fill();

      // Jewel body (red gradient)
      ctx.beginPath();
      ctx.arc(centerX, jewelY, jewelR, 0, Math.PI * 2);
      const jewelGrad = ctx.createRadialGradient(
        centerX - 1, jewelY - 1, 0, centerX, jewelY, jewelR
      );
      jewelGrad.addColorStop(0, '#FF4444');
      jewelGrad.addColorStop(0.4, '#CC0000');
      jewelGrad.addColorStop(1, '#880000');
      ctx.fillStyle = jewelGrad;
      ctx.fill();

      // White highlight dot
      ctx.beginPath();
      ctx.arc(centerX - 2, jewelY - 2, 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fill();

      ctx.restore();

      // ── 10. Subtle specular highlight on wheel ────────────────────────
      ctx.save();
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.clip();
      const specGradient = ctx.createLinearGradient(
        centerX - radius, centerY - radius,
        centerX + radius * 0.3, centerY + radius * 0.3
      );
      specGradient.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
      specGradient.addColorStop(1, 'transparent');
      ctx.fillStyle = specGradient;
      ctx.fillRect(centerX - radius, centerY - radius, radius * 2, radius * 2);
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
          style={{ background: 'radial-gradient(circle, rgba(255,215,0,0.06) 0%, rgba(0,200,83,0.03) 40%, transparent 70%)' }}
        />
      </div>
      <canvas
        ref={canvasRef}
        className="relative z-10 max-w-full rounded-full"
        style={{ aspectRatio: '1 / 1', background: '#000000' }}
      />
    </div>
  );
}
