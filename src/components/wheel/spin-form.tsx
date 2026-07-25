'use client';

import { useState, useCallback } from 'react';
import { useAppStore } from '@/stores/app-store';
import { codesApi, spinApi } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, Ticket, User, Phone, Sparkles } from 'lucide-react';
import { Prize, WheelConfig } from '@/types';

interface SpinFormProps {
  prizes: Prize[];
  wheelConfig: WheelConfig | null;
  onSpinTriggered: () => void;
}

export function SpinForm({ prizes, wheelConfig, onSpinTriggered }: SpinFormProps) {
  const {
    setIsSpinning,
    setFinalAngle,
    campaign,
  } = useAppStore();

  const [codeValue, setCodeValue] = useState('');
  const [participantName, setParticipantName] = useState('');
  const [participantPhone, setParticipantPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validatedCode, setValidatedCode] = useState<string | null>(null);

  const handleSpin = useCallback(async () => {
    if (!codeValue.trim()) {
      setError('Please enter a code to spin');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      // Step 1: Validate the code
      const validateResult = await codesApi.validate(codeValue.trim());

      if (!validateResult.valid) {
        setError('Invalid or already used code');
        setIsLoading(false);
        return;
      }

      // Step 2: Process the spin
      const spinResult = await spinApi.spin({
        codeValue: codeValue.trim(),
        participantName: participantName.trim() || undefined,
        participantPhone: participantPhone.trim() || undefined,
      });

      // Step 3: Update store with spin data
      setValidatedCode(codeValue.trim());
      setFinalAngle(spinResult.animation.finalAngle);
      setIsSpinning(true);
      // Note: socket emit is handled in wheel-view on animation complete

      // Step 4: After spin animation, set result
      // The actual result will be set when the animation completes (handled by wheel-view)
      // But we store it now for later use
      const resultData = {
        isLosing: spinResult.isWinning === false || (spinResult.prize?.isLosing ?? true),
        prizeName: spinResult.prize?.name ?? 'No Prize',
        prizeColor: spinResult.prize?.color ?? '#2d2d2d',
        prizeId: spinResult.prize?.id ?? '',
      };

      // Store spin result data temporarily so it can be applied after animation
      // We'll set it after the wheel animation completes
      useAppStore.setState({
        pendingSpinResult: resultData,
        pendingSpinApiResult: spinResult,
      });

      onSpinTriggered();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Something went wrong';
      setError(message);
      setIsLoading(false);
    }
  }, [codeValue, participantName, participantPhone, setIsSpinning, setFinalAngle, onSpinTriggered]);

  const handleReset = useCallback(() => {
    setCodeValue('');
    setParticipantName('');
    setParticipantPhone('');
    setError(null);
    setValidatedCode(null);
    setIsLoading(false);
  }, []);

  return (
    <Card className="w-full max-w-md mx-auto border-2 shadow-lg">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
          <Sparkles className="w-6 h-6 text-amber-500" />
          Spin to Win!
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          {campaign?.description ?? 'Enter your promotional code and spin the wheel'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Code Input */}
        <div className="space-y-2">
          <Label htmlFor="code-input" className="flex items-center gap-1.5 text-sm font-semibold">
            <Ticket className="w-4 h-4 text-amber-500" />
            Promotional Code
          </Label>
          <Input
            id="code-input"
            type="text"
            placeholder="Enter your code here..."
            value={codeValue}
            onChange={(e) => {
              setCodeValue(e.target.value.toUpperCase());
              setError(null);
            }}
            className="text-center text-lg font-mono tracking-wider h-12"
            disabled={isLoading}
            maxLength={20}
          />
        </div>

        {/* Participant Name */}
        <div className="space-y-2">
          <Label htmlFor="name-input" className="flex items-center gap-1.5 text-sm font-medium">
            <User className="w-4 h-4 text-muted-foreground" />
            Name <span className="text-xs text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="name-input"
            type="text"
            placeholder="Your name"
            value={participantName}
            onChange={(e) => setParticipantName(e.target.value)}
            disabled={isLoading}
            className="h-10"
          />
        </div>

        {/* WhatsApp Phone */}
        <div className="space-y-2">
          <Label htmlFor="phone-input" className="flex items-center gap-1.5 text-sm font-medium">
            <Phone className="w-4 h-4 text-muted-foreground" />
            WhatsApp <span className="text-xs text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="phone-input"
            type="tel"
            placeholder="+1 234 567 8900"
            value={participantPhone}
            onChange={(e) => setParticipantPhone(e.target.value)}
            disabled={isLoading}
            className="h-10"
          />
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-md p-3 text-center">
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
          </div>
        )}

        {/* Spin Button */}
        <Button
          onClick={handleSpin}
          disabled={isLoading || !codeValue.trim()}
          className="w-full h-14 text-xl font-bold bg-gradient-to-r from-amber-500 to-red-500 hover:from-amber-600 hover:to-red-600 text-white shadow-lg transition-all duration-200 hover:shadow-xl active:scale-95"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Spinning...
            </>
          ) : (
            <>
              🎰 SPIN!
            </>
          )}
        </Button>

        {/* Reset Button (only visible after validation) */}
        {validatedCode && !isLoading && (
          <Button
            variant="outline"
            onClick={handleReset}
            className="w-full"
          >
            Reset & Play Again
          </Button>
        )}

        {/* Prizes hint */}
        {prizes.length > 0 && (
          <div className="text-center text-xs text-muted-foreground pt-2">
            {prizes.filter(p => !p.isLosing).length} prizes available • Spin the wheel to find out!
          </div>
        )}
      </CardContent>
    </Card>
  );
}
