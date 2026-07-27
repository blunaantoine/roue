'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/stores/app-store';
import { SpinWheel } from './spin-wheel';
import { SpinResult } from './spin-result';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { prizesApi, wheelConfigApi, codesApi } from '@/lib/api';
import { Prize, WheelConfig, WheelSector } from '@/types';
import { toast } from 'sonner';
import { QrCode, X, Loader2, RefreshCw } from 'lucide-react';
import confetti from 'canvas-confetti';

export function WheelView() {
  const {
    currentCampaignId,
    campaign,
    isSpinning,
    setIsSpinning,
    spinResult,
    setSpinResult,
    finalAngle,
    setFinalAngle,
    sessionCodes,
    addSessionCode,
    removeSessionCode,
    availableSpins,
    soundEnabled,
  } = useAppStore();

  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [wheelConfig, setWheelConfig] = useState<WheelConfig | null>(null);
  const [wheelSectors, setWheelSectors] = useState<WheelSector[]>([]);
  const [showCodeDialog, setShowCodeDialog] = useState(false);
  const [codeInput, setCodeInput] = useState('');
  const [validating, setValidating] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load prizes and wheel config
  useEffect(() => {
    async function loadData() {
      if (!currentCampaignId) { setLoading(false); return; }
      try {
        setLoading(true);
        const prizesData = await prizesApi.list(currentCampaignId);
        const sortedPrizes = (Array.isArray(prizesData) ? prizesData : []).sort(
          (a: Prize, b: Prize) => a.sortOrder - b.sortOrder
        );
        setPrizes(sortedPrizes);
        const configData = await wheelConfigApi.get(currentCampaignId);
        setWheelConfig(configData);
      } catch (error) {
        console.error('Failed to load wheel data:', error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [currentCampaignId]);

  // Build wheel sectors using alternating Green/Black/Gold pattern
  // In the design, both winning AND losing sectors appear on ALL colors
  // The color is determined by POSITION, not by prize type
  useEffect(() => {
    if (!wheelConfig || prizes.length === 0) { setWheelSectors([]); return; }

    const sectorCount = wheelConfig.sectorCount;
    const losingSectorCount = wheelConfig.losingSectorCount;
    const winningSectorCount = sectorCount - losingSectorCount;

    const losingPrizes = prizes.filter(p => p.isLosing);
    const winningPrizes = prizes.filter(p => !p.isLosing);

    const sectors: WheelSector[] = [];

    // Alternating pattern: Green(0), Black(1), Gold(2) — repeats
    // We distribute winning prizes across all positions first,
    // then fill remaining positions with losing sectors
    // This matches the design where winning/losing items appear on all colors

    // Strategy: place winning prizes on specific positions, losing on others
    // Use the design pattern: winning on Green and Gold positions, losing on Black positions
    // But some losing also appear on Green/Gold (like PERDU on Gold position 9)

    // For simplicity: interleave winning and losing to match the visual pattern
    // Winning sectors first, then distribute losing in remaining spots
    let winningIdx = 0;
    let losingIdx = 0;

    for (let i = 0; i < sectorCount; i++) {
      const patternIndex = i % 3; // 0=Green, 1=Black, 2=Gold

      // Allocate winning prizes first, then losing for remaining
      if (winningIdx < winningPrizes.length && winningIdx < winningSectorCount) {
        const prize = winningPrizes[winningIdx];
        sectors.push({
          position: i, prizeId: prize.id, prize: prize,
          label: prize.sectorLabel || prize.name,
          color: patternIndex === 0 ? '#1B8137' : patternIndex === 1 ? '#1C1C1C' : '#D4AF37',
          isLosing: false,
        });
        winningIdx++;
      } else {
        const losingPrize = losingPrizes[losingIdx % (losingPrizes.length || 1)] || {
          id: `losing-${i}`, name: 'Perdant',
          sectorLabel: 'PERDU', isLosing: true,
        } as Prize;
        sectors.push({
          position: i, prizeId: losingPrize.id, prize: losingPrize,
          label: losingPrize.sectorLabel || losingPrize.name || 'PERDU',
          color: patternIndex === 0 ? '#1B8137' : patternIndex === 1 ? '#1C1C1C' : '#D4AF37',
          isLosing: true,
        });
        losingIdx++;
      }
    }

    while (sectors.length > sectorCount) { sectors.pop(); }
    setWheelSectors(sectors);
  }, [prizes, wheelConfig]);

  // Handle code validation
  async function handleValidateCode() {
    if (!codeInput.trim()) { toast.error('Veuillez entrer un code'); return; }
    if (sessionCodes.find(c => c.codeValue === codeInput.trim().toUpperCase())) {
      toast.error('Ce code est déjà dans votre session'); return;
    }
    setValidating(true);
    try {
      const data = await codesApi.validate(codeInput.trim().toUpperCase());
      if (!data.valid) { toast.error(data.error || 'Code invalide'); return; }
      addSessionCode({
        codeValue: codeInput.trim().toUpperCase(), codeId: data.codeId,
        result: data.assignedPrize?.isLosing ? 'losing' : (data.assignedPrize ? 'winning' : null),
        prizeId: data.assignedPrize?.id, prize: data.assignedPrize || undefined,
      });
      toast.success('Code accepté ! Tour ajouté.');
      setCodeInput('');
      setShowCodeDialog(false);
    } catch (error: any) {
      toast.error(error.message || 'Code invalide ou déjà utilisé');
    } finally { setValidating(false); }
  }

  // Handle spin
  async function handleSpin() {
    if (availableSpins <= 0) { toast.error('Ajoutez un code pour pouvoir tourner la roue'); return; }
    if (isSpinning) return;
    const codeToSpin = sessionCodes[0];
    if (!codeToSpin) return;
    setIsSpinning(true);
    try {
      const data = await fetch('/api/spin', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codeValue: codeToSpin.codeValue }),
      }).then(r => r.json());
      if (data.error) { toast.error(data.error); setIsSpinning(false); return; }
      setFinalAngle(data.animation.finalAngle);
      const spinDuration = data.animation.spinDuration || 5000;
      await new Promise(resolve => setTimeout(resolve, spinDuration + 500));
      removeSessionCode(codeToSpin.codeValue);
      setSpinResult({
        isWinning: data.isWinning, prizeName: data.prize?.name || 'Perdant',
        prizeColor: data.prize?.color || '#1a1a1a', prizeId: data.prize?.id || '',
        prizeImageUrl: data.prize?.imageUrl, prizeDescription: data.prize?.description,
      });
      setShowResult(true);
      if (data.isWinning && soundEnabled) {
        const duration = 3000;
        const animationEnd = Date.now() + duration;
        const frame = () => {
          confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 },
            colors: ['#FFD700', '#00C853', '#FF6B35', '#E040FB', '#00E5FF'] });
          confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 },
            colors: ['#FFD700', '#00C853', '#FF6B35', '#E040FB', '#00E5FF'] });
          if (Date.now() < animationEnd) requestAnimationFrame(frame);
        };
        frame();
        setTimeout(() => confetti({ particleCount: 100, spread: 100, origin: { y: 0.6 },
          colors: ['#FFD700', '#00C853', '#FF6B35', '#E040FB', '#76FF03'] }), 500);
      }
      if (data.isWinning && navigator.vibrate) navigator.vibrate([100, 50, 100, 50, 200]);
      setIsSpinning(false);
    } catch (error) {
      console.error('Spin error:', error);
      setIsSpinning(false);
      toast.error('Erreur lors du tour');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="size-8 animate-spin text-[#FFD700]" />
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col items-center px-4 py-2 gap-3 sm:gap-4 max-w-lg mx-auto">
        {/* ===== STATUS PANEL ===== */}
        <div className="w-full max-w-[340px] sm:max-w-[400px] bg-white/[0.05] border border-[#FFD700]/20 rounded-2xl px-4 py-2.5 flex items-center justify-between">
          {/* Left: Refresh icon */}
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/[0.06]">
            <RefreshCw className="size-4 text-[#00C853]" />
          </div>
          {/* Center: Label */}
          <div className="flex-1 text-center">
            <p className="text-white/80 text-[10px] sm:text-[11px] uppercase tracking-[1.5px] font-semibold">
              TOURS DISPONIBLES
            </p>
          </div>
          {/* Right: Number */}
          <div className="flex items-center gap-1">
            <span className="text-[#FFD700]/50 text-sm font-bold">—</span>
            <span className="text-[#FFD700] text-3xl sm:text-4xl font-extrabold">{availableSpins}</span>
            <span className="text-[#FFD700]/50 text-sm font-bold">—</span>
          </div>
        </div>

        {/* ===== THE WHEEL ===== */}
        <div className="relative w-full max-w-[340px] sm:max-w-[420px] md:max-w-[480px] mx-auto">
          {wheelSectors.length > 0 ? (
            <SpinWheel
              sectors={wheelSectors}
              wheelConfig={wheelConfig}
              isSpinning={isSpinning}
              finalAngle={finalAngle}
              soundEnabled={soundEnabled}
            />
          ) : (
            <div className="flex items-center justify-center aspect-square bg-[#1a1a1a] rounded-full border border-[#D4AF37]">
              <p className="text-white/50 text-center px-8 text-sm">
                Configurez les lots dans l&apos;administration pour voir la roue
              </p>
            </div>
          )}
        </div>

        {/* ===== ACTION BUTTONS ===== */}
        {/* Add code button */}
        <Button
          onClick={() => setShowCodeDialog(true)}
          className="w-full max-w-[340px] sm:max-w-[400px] bg-[#00C853] hover:bg-[#2E7D32] text-white shadow-lg font-bold gap-2 rounded-xl h-12 sm:h-14 text-sm sm:text-base"
          style={{ boxShadow: '0 4px 15px rgba(0,200,83,0.3)' }}
          disabled={isSpinning}
        >
          <QrCode className="size-5" />
          AJOUTER UN CODE
        </Button>

        {/* Divider: PRÊT À TOURNER ? */}
        <div className="flex items-center justify-center gap-2 w-full max-w-[340px] sm:max-w-[400px]">
          <div className="flex-1 h-px bg-[#FFD700]/40" />
          <span className="text-[#FFD700] text-[10px] sm:text-[11px] uppercase tracking-[2px] font-semibold">
            PRÊT À TOURNER ?
          </span>
          <div className="flex-1 h-px bg-[#FFD700]/40" />
        </div>

        {/* Spin button */}
        <Button
          onClick={handleSpin}
          className="w-full max-w-[340px] sm:max-w-[400px] text-black font-extrabold rounded-xl h-14 sm:h-16 text-xl sm:text-2xl gap-2 disabled:!opacity-100"
          style={{
            background: isSpinning || availableSpins <= 0
              ? '#374151'
              : 'linear-gradient(180deg, #FFE55C 0%, #FFC107 50%, #FF9800 100%)',
            boxShadow: isSpinning || availableSpins <= 0
              ? 'none'
              : '0 6px 20px rgba(255,193,7,0.4)',
          }}
          disabled={isSpinning || availableSpins <= 0}
        >
          <RefreshCw className="size-5 sm:size-6" />
          {isSpinning ? 'En cours...' : 'TOURNER'}
          {!isSpinning && availableSpins > 0 && (
            <span className="text-xs sm:text-sm font-semibold opacity-70 block">Bonne chance !</span>
          )}
        </Button>

        {/* Session codes list */}
        {sessionCodes.length > 0 && (
          <div className="w-full max-w-[340px] sm:max-w-[400px] bg-white/[0.04] border border-white/[0.08] rounded-xl p-3">
            <h3 className="text-[10px] sm:text-xs font-semibold text-white/60 uppercase tracking-wider mb-2">Vos codes :</h3>
            <div className="space-y-1 max-h-24 sm:max-h-28 overflow-y-auto">
              {sessionCodes.map((code, idx) => (
                <div key={code.codeValue} className="flex items-center justify-between bg-white/[0.06] rounded-lg px-2.5 py-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-[10px] text-white/40 shrink-0">{idx + 1}.</span>
                    <span className="font-mono text-xs text-white truncate">{code.codeValue}</span>
                  </div>
                  <button onClick={() => removeSessionCode(code.codeValue)} className="text-white/30 hover:text-red-400 transition-colors shrink-0" disabled={isSpinning}>
                    <X className="size-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Code entry dialog */}
      <Dialog open={showCodeDialog} onOpenChange={setShowCodeDialog}>
        <DialogContent className="bg-[#1a1a2e] border-white/20 text-white max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">Entrer votre code</DialogTitle>
            <DialogDescription className="text-white/60">Saisissez le code que vous avez reçu pour obtenir un tour.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="code-input" className="text-white/80 mb-2">Code</Label>
            <Input id="code-input" value={codeInput} onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder="EX: ABCD1234"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/40 text-center font-mono text-lg uppercase"
              maxLength={12} autoFocus onKeyDown={(e) => e.key === 'Enter' && handleValidateCode()} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowCodeDialog(false)}
              className="text-white/60 hover:text-white hover:bg-white/10">Annuler</Button>
            <Button onClick={handleValidateCode} disabled={validating || !codeInput.trim()}
              className="bg-[#00C853] hover:bg-[#2E7D32] text-white font-semibold">
              {validating ? <Loader2 className="size-4 animate-spin" /> : 'Valider'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Spin result overlay */}
      {showResult && spinResult && (
        <SpinResult result={spinResult} onClose={() => setShowResult(false)} />
      )}
    </>
  );
}
