'use client';

import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAppStore } from '@/stores/app-store';
import { WinnerInfo, PromotionMessage } from '@/types';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const { currentCampaignId, setIsSocketConnected, addWinner, setRecentWinners, setCurrentPromotion } = useAppStore();

  useEffect(() => {
    const socketInstance = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 10000,
    });

    socketRef.current = socketInstance;

    socketInstance.on('connect', () => {
      setIsSocketConnected(true);
      console.log('Socket connected');
    });

    socketInstance.on('disconnect', () => {
      setIsSocketConnected(false);
      console.log('Socket disconnected');
    });

    socketInstance.on('spin-complete', (data: { codeValue: string; prizeId: string; prizeName: string; isLosing: boolean; participantName?: string }) => {
      console.log('Spin complete:', data);
    });

    socketInstance.on('new-winner', (data: WinnerInfo) => {
      addWinner(data);
    });

    socketInstance.on('recent-winners', (data: { winners: WinnerInfo[] }) => {
      setRecentWinners(data.winners);
    });

    socketInstance.on('promotion-display', (data: PromotionMessage) => {
      setCurrentPromotion(data);
    });

    return () => {
      socketInstance.disconnect();
    };
  }, [setIsSocketConnected, addWinner, setRecentWinners, setCurrentPromotion]);

  useEffect(() => {
    if (socketRef.current && currentCampaignId) {
      socketRef.current.emit('join-room', {
        campaignId: currentCampaignId,
        role: useAppStore.getState().currentView === 'tv' ? 'tv' : useAppStore.getState().currentView === 'admin' ? 'admin' : 'customer',
      });
    }
  }, [currentCampaignId]);

  const emitSpinStart = useCallback((codeValue: string) => {
    if (socketRef.current && currentCampaignId) {
      socketRef.current.emit('spin-start', { codeValue, campaignId: currentCampaignId });
    }
  }, [currentCampaignId]);

  const emitSpinResult = useCallback((data: { codeValue: string; prizeId: string; prizeName: string; isLosing: boolean; participantName?: string; participantPhone?: string }) => {
    if (socketRef.current && currentCampaignId) {
      socketRef.current.emit('spin-result', { ...data, campaignId: currentCampaignId });
    }
  }, [currentCampaignId]);

  const emitAdminAction = useCallback((action: string, details?: string) => {
    if (socketRef.current && currentCampaignId) {
      socketRef.current.emit('admin-action', { action, details, campaignId: currentCampaignId });
    }
  }, [currentCampaignId]);

  const emitPromotionUpdate = useCallback(() => {
    if (socketRef.current && currentCampaignId) {
      socketRef.current.emit('promotion-update', { campaignId: currentCampaignId });
    }
  }, [currentCampaignId]);

  const emitTvReady = useCallback(() => {
    if (socketRef.current && currentCampaignId) {
      socketRef.current.emit('tv-ready', { campaignId: currentCampaignId });
    }
  }, [currentCampaignId]);

  return {
    socket: socketRef.current,
    emitSpinStart,
    emitSpinResult,
    emitAdminAction,
    emitPromotionUpdate,
    emitTvReady,
    isConnected: useAppStore.getState().isSocketConnected,
  };
}
