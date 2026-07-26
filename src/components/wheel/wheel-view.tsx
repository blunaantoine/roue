'use client';

import { useState, useEffect } from 'react';
import { useAppStore } from '@/stores/app-store';
import { SpinWheel } from './spin-wheel';
import { SpinForm } from './spin-form';
import { SpinResult } from './spin-result';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Plus, Ticket, X, Loader2, Sparkles } from 'lucide-react';
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
  const [showSpinForm, setShowSpinForm] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [currentSpinningCode, setCurrentSpinningCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load prizes and wheel config
  useEffect(() => {
    async function loadData() {
      if (!currentCampaignId) {
        setLoading(false);
        return;
      }
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

  // Build wheel sectors
  useEffect(() => {
    if (!wheelConfig || prizes.length === 0) {
      setWheelSectors([]);
      return;
    }

    const sectorCount = wheelConfig.sectorCount;
    const losingSectorCount = wheelConfig.losingSectorCount;

    const losingPrizes = prizes.filter(p => p.isLosing);
    const winningPrizes = prizes.filter(p => !p.isLosing);

    const sectors: WheelSector[] = [];

    // Add losing sectors
    for (let i = 0; i < losingSectorCount; i++) {
      const losingPrize = losingPrizes[i % (losingPrizes.length || 1)] || {
        id: `losing-${i}`,
        name: 'Perdant',
        color: '#374151',
        sectorLabel: 'Perdant',
        isLosing: true,
      } as Prize;
      sectors.push({
        position: i,
        prizeId: losingPrize.id,
        prize: losingPrize,
        label: losingPrize.sectorLabel || losingPrize.name || 'Perdant',
        color: losingPrize.color || '#374151',
        isLosing: true,
      });
    }

    // Add winning prize sectors
    for (const prize of winningPrizes) {
      sectors.push({
        position: sectors.length,
        prizeId: prize.id,
        prize: prize,
        label: prize.sectorLabel || prize.name,
        color: prize.color,
        isLosing: false,
      });
    }

    // Fill remaining sectors with losing if needed
    while (sectors.length < sectorCount) {
      const losingPrize = losingPrizes[0] || {
        id: `losing-extra`,
        name: 'Perdant',
        color: '#374151',
        sectorLabel: 'Perdant',
        isLosing: true,
      } as Prize;
      sectors.push({
        position: sectors.length,
        prizeId: losingPrize.id,
        prize: losingPrize,
        label: losingPrize.sectorLabel || 'Perdant',
        color: losingPrize.color || '#374151',
        isLosing: true,
      });
    }

    // Truncate if too many
    while (sectors.length > sectorCount) {
      sectors.pop();
    }

    setWheelSectors(sectors);
  }, [prizes, wheelConfig]);

  // Handle code validation
  async function handleValidateCode() {
    if (!codeInput.trim()) {
      toast.error('Veuillez entrer un code');
      return;
    }

    // Check if already in session
    if (sessionCodes.find(c => c.codeValue === codeInput.trim().toUpperCase())) {
      toast.error('Ce code est déjà dans votre session');
      return;
    }

    setValidating(true);
    try {
      const data = await codesApi.validate(codeInput.trim().toUpperCase());

      if (!data.valid) {
        toast.error(data.error || 'Code invalide');
        return;
      }

      addSessionCode({
        codeValue: codeInput.trim().toUpperCase(),
        codeId: data.codeId,
        result: data.assignedPrize?.isLosing ? 'losing' : (data.assignedPrize ? 'winning' : null),
        prizeId: data.assignedPrize?.id,
        prize: data.assignedPrize || undefined,
      });

      toast.success('✅ Code accepté ! Tour ajouté.');
      setCodeInput('');
      setShowCodeDialog(false);
    } catch (error: any) {
      toast.error(error.message || 'Code invalide ou déjà utilisé');
    } finally {
      setValidating(false);
    }
  }

  // Handle spin
  async function handleSpin() {
    if (availableSpins <= 0) {
      toast.error('Ajoutez un code pour pouvoir tourner la roue');
      return;
    }

    if (isSpinning) return;

    // Take the first code from the session queue
    const codeToSpin = sessionCodes[0];
    if (!codeToSpin) return;

    setCurrentSpinningCode(codeToSpin.codeValue);
    setIsSpinning(true);

    try {
      const data = await fetch('/api/spin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codeValue: codeToSpin.codeValue }),
      }).then(r => r.json());

      if (data.error) {
        toast.error(data.error);
        setIsSpinning(false);
        return;
      }

      // Set animation parameters
      setFinalAngle(data.animation.finalAngle);

      // Wait for wheel animation to complete
      const spinDuration = data.animation.spinDuration || 5000;
      await new Promise(resolve => setTimeout(resolve, spinDuration + 500));

      // Remove the code from session
      removeSessionCode(codeToSpin.codeValue);

      // Set spin result
      setSpinResult({
        isWinning: data.isWinning,
        prizeName: data.prize?.name || 'Perdant',
        prizeColor: data.prize?.color || '#374151',
        prizeId: data.prize?.id || '',
        prizeImageUrl: data.prize?.imageUrl,
        prizeDescription: data.prize?.description,
      });

      // Show result
      setShowResult(true);

      // Confetti for winning
      if (data.isWinning && soundEnabled) {
        // Fire confetti
        const duration = 3000;
        const animationEnd = Date.now() + duration;

        const frame = () => {
          confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0 },
            colors: ['#FFD700', '#FF6B35', '#FF1744', '#E040FB', '#00E5FF'],
          });
          confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1 },
            colors: ['#FFD700', '#FF6B35', '#FF1744', '#E040FB', '#00E5FF'],
          });

          if (Date.now() < animationEnd) {
            requestAnimationFrame(frame);
          }
        };
        frame();

        // Additional burst
        setTimeout(() => {
          confetti({
            particleCount: 100,
            spread: 100,
            origin: { y: 0.6 },
            colors: ['#FFD700', '#FF6B35', '#FF1744', '#E040FB', '#00E5FF', '#76FF03'],
          });
        }, 500);
      }

      // Vibrate on mobile for win
      if (data.isWinning && navigator.vibrate) {
        navigator.vibrate([100, 50, 100, 50, 200]);
      }

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
        <Loader2 className="size-8 animate-spin text-amber-400" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center px-4 py-6 gap-6 max-w-4xl mx-auto">
      {/* Title area */}
      <div className="text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-white drop-shadow-lg tracking-wide">
          🎡 ROUE DE LA CHANCE
        </h2>
        <div className="mt-2 flex items-center justify-center gap-3">
          <Badge className="bg-white/20 text-white border-white/30 px-4 py-1.5 text-base font-semibold backdrop-blur-sm">
            <Ticket className="size-4 mr-1.5" />
            Tours disponibles : {availableSpins}
          </Badge>
        </div>
      </div>

      {/* Wheel */}
      <div className="relative w-full max-w-lg mx-auto">
        {wheelSectors.length > 0 ? (
          <SpinWheel
            sectors={wheelSectors}
            wheelConfig={wheelConfig}
            isSpinning={isSpinning}
            finalAngle={finalAngle}
            soundEnabled={soundEnabled}
          />
        ) : (
          <div className="flex items-center justify-center aspect-square bg-white/10 rounded-full border border-white/20">
            <p className="text-white/50 text-center px-8">
              Configurez les lots dans l&apos;administration pour voir la roue
            </p>
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-col sm:flex-row items-center gap-3 w-full max-w-md">
        <Button
          onClick={() => setShowCodeDialog(true)}
          className="w-full sm:w-auto bg-gradient-to-r from-emerald-400 to-emerald-600 hover:from-emerald-500 hover:to-emerald-700 text-white shadow-lg shadow-emerald-500/30 font-semibold gap-2"
          disabled={isSpinning}
        >
          <Plus className="size-4" />
          Ajouter un code
        </Button>

        <Button
          onClick={handleSpin}
          className="w-full sm:w-auto bg-gradient-to-r from-amber-400 via-yellow-500 to-red-500 hover:from-amber-500 hover:via-yellow-600 hover:to-red-600 text-white shadow-lg shadow-amber-500/30 font-bold text-lg gap-2 px-8 py-4"
          disabled={isSpinning || availableSpins <= 0}
        >
          {isSpinning ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <Sparkles className="size-5" />
          )}
          {isSpinning ? 'En cours...' : 'TOURNER'}
        </Button>
      </div>

      {/* Session codes list */}
      {sessionCodes.length > 0 && (
        <div className="w-full max-w-md bg-white/10 backdrop-blur-sm rounded-xl border border-white/20 p-4">
          <h3 className="text-sm font-semibold text-white/80 mb-2">Vos codes :</h3>
          <div className="space-y-1.5 max-h-32 overflow-y-auto">
            {sessionCodes.map((code, idx) => (
              <div key={code.codeValue} className="flex items-center justify-between bg-white/10 rounded-lg px-3 py-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-white/50">#{idx + 1}</span>
                  <span className="font-mono text-sm text-white">{code.codeValue}</span>
                  {code.result && (
                    <Badge variant={code.result === 'winning' ? 'default' : 'destructive'} className="text-xs">
                      {code.result === 'winning' ? 'Gagnant' : 'Perdant'}
                    </Badge>
                  )}
                </div>
                <button
                  onClick={() => removeSessionCode(code.codeValue)}
                  className="text-white/50 hover:text-red-400 transition-colors"
                  disabled={isSpinning}
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Code entry dialog */}
      <Dialog open={showCodeDialog} onOpenChange={setShowCodeDialog}>
        <DialogContent className="bg-[#1a1a2e] border-white/20 text-white">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">🔑 Entrer votre code</DialogTitle>
            <DialogDescription className="text-white/60">
              Saisissez le code que vous avez reçu pour obtenir un tour.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="code-input" className="text-white/80 mb-2">Code</Label>
            <Input
              id="code-input"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
              placeholder="EX: ABCD1234"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/40 text-center font-mono text-lg uppercase"
              maxLength={12}
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleValidateCode()}
            />
          </div>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setShowCodeDialog(false)}
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              Annuler
            </Button>
            <Button
              onClick={handleValidateCode}
              disabled={validating || !codeInput.trim()}
              className="bg-gradient-to-r from-emerald-400 to-emerald-600 text-white shadow-lg font-semibold"
            >
              {validating ? <Loader2 className="size-4 animate-spin" /> : 'Valider'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Spin result overlay */}
      {showResult && spinResult && (
        <SpinResult
          result={spinResult}
          onClose={() => setShowResult(false)}
        />
      )}

      {/* Optional: Participant info form before spin */}
      {showSpinForm && currentSpinningCode && (
        <SpinForm
          codeValue={currentSpinningCode}
          onSubmit={(name, phone) => {
            setShowSpinForm(false);
          }}
          onCancel={() => {
            setShowSpinForm(false);
          }}
        />
      )}
    </div>
  );
}
