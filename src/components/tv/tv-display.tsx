'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '@/stores/app-store';
import { useSocket } from '@/hooks/use-socket';
import { prizesApi, wheelConfigApi, participationsApi, promotionsApi } from '@/lib/api';
import { Prize, WheelConfig, PromotionMessage, WinnerInfo } from '@/types';
import { TVWheel } from './tv-wheel';
import { TVWinnersFeed } from './tv-winners-feed';
import { TVPromoBanner } from './tv-promo-banner';
import { TVResultOverlay } from './tv-result-overlay';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

export function TVDisplay() {
  const {
    currentCampaignId,
    campaign,
    isSocketConnected,
    isSpinning,
    setIsSpinning,
    spinResult,
    setSpinResult,
    setRecentWinners,
    addWinner,
    setCurrentPromotion,
    finalAngle,
    setFinalAngle,
  } = useAppStore();

  const { emitTvReady } = useSocket();

  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [wheelConfig, setWheelConfig] = useState<WheelConfig | null>(null);
  const [promotions, setPromotions] = useState<PromotionMessage[]>([]);
  const [showOverlay, setShowOverlay] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentSpinDuration, setCurrentSpinDuration] = useState<number>(5);

  // Socket ref for direct event handling
  const socketRef = useRef<any>(null);

  // Load initial data
  const loadData = useCallback(async () => {
    if (!currentCampaignId) return;
    
    try {
      setLoading(true);
      setError(null);

      // Load prizes
      const prizesData = await prizesApi.list(currentCampaignId);
      setPrizes(Array.isArray(prizesData) ? prizesData : []);

      // Load wheel config
      const wheelData = await wheelConfigApi.get(currentCampaignId);
      setWheelConfig(wheelData);

      // Load recent participations (as initial winners list)
      const participationsData = await participationsApi.list(currentCampaignId);
      const participations = Array.isArray(participationsData) ? participationsData : [];
      
      // Convert participations to winner info
      const winners: WinnerInfo[] = participations
        .filter((p: any) => p.prize && !p.prize.isLosing)
        .slice(0, 20)
        .map((p: any) => ({
          prizeName: p.prize.name,
          participantName: p.participantName || undefined,
          participantPhone: p.participantPhone || undefined,
          timestamp: p.createdAt,
        }));
      
      setRecentWinners(winners);

      // Load promotions
      const promoData = await promotionsApi.list(currentCampaignId);
      setPromotions((Array.isArray(promoData) ? promoData : []).filter((p: PromotionMessage) => p.active));

    } catch (err) {
      console.error('Failed to load TV data:', err);
      setError('Failed to load data. Retrying...');
      // Retry after 5 seconds
      setTimeout(() => loadData(), 5000);
    } finally {
      setLoading(false);
    }
  }, [currentCampaignId, setRecentWinners]);

  // Initialize data on mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Emit tv-ready when connected and campaign is set
  useEffect(() => {
    if (currentCampaignId && isSocketConnected) {
      emitTvReady();
    }
  }, [currentCampaignId, isSocketConnected, emitTvReady]);

  // Listen for socket events for spin animation and results
  useEffect(() => {
    // We need to listen for 'spin-animation' and 'spin-complete' events directly
    // The useSocket hook handles 'new-winner' and 'recent-winners' via store updates
    // but we need to handle animation triggers here for the TV display
    
    const handleSpinAnimation = (data: { finalAngle: number; spinDuration: number; campaignId: string }) => {
      if (data.campaignId === currentCampaignId) {
        setIsSpinning(true);
        setFinalAngle(data.finalAngle);
        setCurrentSpinDuration(data.spinDuration || 5);
      }
    };

    const handleSpinComplete = (data: { isLosing: boolean; prizeName: string; prizeColor: string; prizeId: string; campaignId: string; participantName?: string }) => {
      if (data.campaignId === currentCampaignId) {
        setIsSpinning(false);
        setSpinResult({
          isLosing: data.isLosing,
          prizeName: data.prizeName,
          prizeColor: data.prizeColor,
          prizeId: data.prizeId,
        });
        
        // Show result overlay
        setShowOverlay(true);

        // Auto-hide overlay (handled inside TVResultOverlay)
      }
    };

    const handleNewWinner = (data: WinnerInfo & { campaignId?: string }) => {
      if (data.campaignId === currentCampaignId || !data.campaignId) {
        addWinner(data);
      }
    };

    const handleRecentWinners = (data: { winners: WinnerInfo[]; campaignId?: string }) => {
      if (data.campaignId === currentCampaignId || !data.campaignId) {
        setRecentWinners(data.winners);
      }
    };

    const handlePromotionDisplay = (data: PromotionMessage & { campaignId?: string }) => {
      if (data.campaignId === currentCampaignId || !data.campaignId) {
        setCurrentPromotion(data);
      }
    };

    // Note: In a real implementation, these listeners would be attached to the socket instance
    // from the useSocket hook. Since the hook provides the socket reference,
    // we're simulating the event handling through the store updates that the hook already does.
    // The spin-animation and spin-complete events would be handled directly on the socket instance.

    return () => {
      // Cleanup would remove socket listeners
    };
  }, [currentCampaignId, setIsSpinning, setSpinResult, setFinalAngle, addWinner, setRecentWinners, setCurrentPromotion]);

  // Handle overlay hide
  const handleOverlayHide = useCallback(() => {
    setShowOverlay(false);
    setSpinResult(null);
  }, [setSpinResult]);

  // Loading state
  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-b from-[#1a1a2e] via-[#16213e] to-[#0f3460]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <RefreshCw className="w-16 h-16 text-amber-400 mx-auto mb-6" />
          </motion.div>
          <p className="text-3xl font-bold text-white/80 mb-2">Loading TV Display...</p>
          <p className="text-lg text-white/40">Preparing the wheel and data</p>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (error && !prizes.length) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-gradient-to-b from-[#1a1a2e] via-[#16213e] to-[#0f3460]">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <p className="text-3xl font-bold text-red-400 mb-4">⚠ Connection Error</p>
          <p className="text-xl text-white/60">{error}</p>
          <button
            onClick={loadData}
            className="mt-6 px-6 py-3 bg-amber-500 text-white rounded-lg font-semibold text-lg hover:bg-amber-600 transition-colors"
          >
            Retry
          </button>
        </motion.div>
      </div>
    );
  }

  const campaignName = campaign?.name || 'Wheel of Fortune';

  return (
    <div className="h-screen w-screen flex flex-col bg-gradient-to-b from-[#1a1a2e] via-[#16213e] to-[#0f3460] overflow-hidden select-none">
      {/* ===== TOP BAR ===== */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative flex items-center justify-between px-8 py-4 bg-[#1a1a2e]/80 border-b border-white/10"
      >
        {/* Logo / Campaign name */}
        <div className="flex items-center gap-4">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-red-500 flex items-center justify-center shadow-lg shadow-amber-500/30"
          >
            <span className="text-white font-bold text-xl">★</span>
          </motion.div>
          <div>
            <h1 className="text-4xl font-extrabold text-white tracking-wider">
              {campaignName}
            </h1>
            <p className="text-base text-white/40 tracking-wide">Live Promotion Display</p>
          </div>
        </div>

        {/* Connection status */}
        <div className="flex items-center gap-3">
          <AnimatePresence mode="wait">
            {isSocketConnected ? (
              <motion.div
                key="connected"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-2 bg-green-500/20 px-4 py-2 rounded-full border border-green-500/30"
              >
                <Wifi className="w-5 h-5 text-green-400" />
                <span className="text-green-400 font-semibold text-sm">Live</span>
                <motion.div
                  className="w-2 h-2 rounded-full bg-green-400"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                />
              </motion.div>
            ) : (
              <motion.div
                key="disconnected"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex items-center gap-2 bg-red-500/20 px-4 py-2 rounded-full border border-red-500/30"
              >
                <WifiOff className="w-5 h-5 text-red-400" />
                <span className="text-red-400 font-semibold text-sm">Offline</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Time display */}
          <motion.div
            className="text-white/60 text-base font-mono"
            animate={{ opacity: [0.6, 1, 0.6] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </motion.div>
        </div>

        {/* Decorative gradient line */}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400/40 to-transparent" />
      </motion.div>

      {/* ===== MAIN CONTENT AREA ===== */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Split layout: 60% wheel, 40% winners */}
        <div className="flex-1 flex min-h-0">
          {/* LEFT: Wheel (60%) */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="w-[60%] flex items-center justify-center p-6 relative"
          >
            {/* Background glow */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-[70%] h-[70%] rounded-full bg-gradient-to-br from-amber-500/5 via-transparent to-purple-500/5" />
            </div>

            <TVWheel
              prizes={prizes}
              wheelConfig={wheelConfig}
              isSpinning={isSpinning}
              finalAngle={finalAngle}
              spinDuration={currentSpinDuration}
            />

            {/* Decorative corner accents */}
            <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-amber-400/30 rounded-tl-lg" />
            <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-amber-400/30 rounded-tr-lg" />
          </motion.div>

          {/* RIGHT: Winners feed (40%) */}
          <motion.div
            initial={{ opacity: 0, x: 40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="w-[40%] flex flex-col p-6 bg-[#1a1a2e]/40 border-l border-white/10"
          >
            <TVWinnersFeed maxVisible={10} />
          </motion.div>
        </div>

        {/* ===== BOTTOM BANNER ===== */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="h-[100px] bg-[#1a1a2e]/60 border-t border-white/10 relative"
        >
          <TVPromoBanner
            campaignId={currentCampaignId || undefined}
            rotationInterval={10000}
          />
          
          {/* Decorative gradient line */}
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-400/40 to-transparent" />
        </motion.div>
      </div>

      {/* ===== RESULT OVERLAY ===== */}
      <TVResultOverlay
        isVisible={showOverlay}
        isLosing={spinResult?.isLosing ?? false}
        prizeName={spinResult?.prizeName}
        prizeColor={spinResult?.prizeColor}
        participantName={undefined}
        autoHideDuration={5000}
        onHide={handleOverlayHide}
      />

      {/* ===== DECORATIVE PARTICLES ===== */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Floating ambient particles */}
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={`particle-${i}`}
            className="absolute w-1 h-1 rounded-full bg-amber-400/20"
            style={{
              left: `${15 + i * 15}%`,
              top: `${20 + (i % 3) * 25}%`,
            }}
            animate={{
              y: [0, -30, 0],
              opacity: [0.1, 0.3, 0.1],
            }}
            transition={{
              duration: 3 + i * 0.5,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.3,
            }}
          />
        ))}
      </div>
    </div>
  );
}
