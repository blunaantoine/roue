'use client';

import { useCallback } from 'react';
import { useAppStore } from '@/stores/app-store';
import { useSocket } from '@/hooks/use-socket';
import { SpinWheel } from '@/components/wheel/spin-wheel';
import { SpinForm } from '@/components/wheel/spin-form';
import { SpinResult } from '@/components/wheel/spin-result';

export function WheelView() {
  const {
    campaign,
    isSpinning,
    spinResult,
    currentCampaignId,
    setIsSpinning,
    setSpinResult,
    setFinalAngle,
    finalAngle,
  } = useAppStore();

  const { emitSpinResult } = useSocket();

  // Get prizes and wheel config from campaign
  const prizes = campaign?.prizes ?? [];
  const wheelConfig = campaign?.wheelConfig ?? null;

  // Handle when spin is triggered from the form
  const handleSpinTriggered = useCallback(() => {
    // The spin API has already been called and store updated
  }, []);

  // Handle when the wheel animation completes
  const handleSpinComplete = useCallback(() => {
    // Get the pending result from the store
    const state = useAppStore.getState();
    const pendingResult = (state as unknown as Record<string, unknown>).pendingSpinResult as {
      isLosing: boolean;
      prizeName: string;
      prizeColor: string;
      prizeId: string;
    } | null;
    const pendingApiResult = (state as unknown as Record<string, unknown>).pendingSpinApiResult as Record<string, unknown> | null;

    if (pendingResult) {
      setSpinResult(pendingResult);
      setIsSpinning(false);

      // Emit spin result via socket
      if (pendingApiResult) {
        emitSpinResult({
          codeValue: (pendingApiResult as Record<string, unknown>).codeValue as string ?? '',
          prizeId: pendingResult.prizeId,
          prizeName: pendingResult.prizeName,
          isLosing: pendingResult.isLosing,
          participantName: (pendingApiResult as Record<string, unknown>).participantName as string | undefined,
          participantPhone: (pendingApiResult as Record<string, unknown>).participantPhone as string | undefined,
        });
      }

      // Clean up pending state
      useAppStore.setState({
        pendingSpinResult: undefined,
        pendingSpinApiResult: undefined,
      });
    } else {
      setIsSpinning(false);
    }
  }, [setSpinResult, setIsSpinning, emitSpinResult]);

  // Handle reset (play again)
  const handleReset = useCallback(() => {
    setSpinResult(null);
    setFinalAngle(0);
    setIsSpinning(false);
    useAppStore.setState({
      pendingSpinResult: undefined,
      pendingSpinApiResult: undefined,
    });
  }, [setSpinResult, setFinalAngle, setIsSpinning]);

  // No campaign loaded
  if (!campaign && !currentCampaignId) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-amber-400 to-red-500 flex items-center justify-center">
            <span className="text-white text-3xl">🎡</span>
          </div>
          <h2 className="text-2xl font-bold text-foreground">No Active Campaign</h2>
          <p className="text-muted-foreground max-w-sm">
            There is no active promotional campaign at the moment. Please check back later!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-120px)] bg-gradient-to-br from-amber-50 via-white to-red-50 dark:from-amber-950 dark:via-gray-950 dark:to-red-950">
      {/* Campaign Header */}
      {campaign && (
        <div className="text-center py-6 px-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight">
            {campaign.name}
          </h1>
          {campaign.description && (
            <p className="text-muted-foreground mt-2 max-w-lg mx-auto">
              {campaign.description}
            </p>
          )}
        </div>
      )}

      {/* Main Content - Wheel + Form Layout */}
      <div className="container mx-auto px-4 pb-8">
        <div className="flex flex-col lg:flex-row items-center lg:items-start justify-center gap-8">
          {/* Wheel Section */}
          <div className="flex-shrink-0 w-full lg:w-auto max-w-[500px]">
            <SpinWheel
              prizes={prizes}
              wheelConfig={wheelConfig}
              isSpinning={isSpinning}
              onSpinComplete={handleSpinComplete}
              finalAngle={finalAngle}
            />
          </div>

          {/* Form Section */}
          <div className="flex-shrink-0 w-full lg:w-auto max-w-md">
            {!isSpinning && !spinResult && (
              <SpinForm
                prizes={prizes}
                wheelConfig={wheelConfig}
                onSpinTriggered={handleSpinTriggered}
              />
            )}

            {/* Spinning state - show progress indicator */}
            {isSpinning && !spinResult && (
              <div className="text-center space-y-4 p-8">
                <div className="w-16 h-16 mx-auto rounded-full border-4 border-t-amber-500 border-r-red-500 border-b-amber-500 border-l-red-500 animate-spin" />
                <p className="text-lg font-semibold text-foreground">Spinning the wheel...</p>
                <p className="text-sm text-muted-foreground">Wait for the result!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Result Overlay */}
      <SpinResult onReset={handleReset} />
    </div>
  );
}
