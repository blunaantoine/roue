import { create } from 'zustand';
import { ViewMode, Campaign, Prize, Code, Participation, WhatsAppContact, PromotionMessage, WheelConfig, CampaignStats, WinnerInfo, AdminLog } from '@/types';

interface AppState {
  // View management
  currentView: ViewMode;
  setCurrentView: (view: ViewMode) => void;

  // Current campaign
  currentCampaignId: string | null;
  setCurrentCampaignId: (id: string | null) => void;
  campaign: Campaign | null;
  setCampaign: (campaign: Campaign | null) => void;

  // Wheel state
  isSpinning: boolean;
  setIsSpinning: (spinning: boolean) => void;
  spinResult: { isLosing: boolean; prizeName: string; prizeColor: string; prizeId: string } | null;
  setSpinResult: (result: { isLosing: boolean; prizeName: string; prizeColor: string; prizeId: string } | null) => void;
  finalAngle: number;
  setFinalAngle: (angle: number) => void;

  // Winners (for TV display)
  recentWinners: WinnerInfo[];
  setRecentWinners: (winners: WinnerInfo[]) => void;
  addWinner: (winner: WinnerInfo) => void;

  // Promotion display
  currentPromotion: PromotionMessage | null;
  setCurrentPromotion: (promotion: PromotionMessage | null) => void;

  // Socket connection
  isSocketConnected: boolean;
  setIsSocketConnected: (connected: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'wheel',
  setCurrentView: (view) => set({ currentView: view }),

  currentCampaignId: null,
  setCurrentCampaignId: (id) => set({ currentCampaignId: id }),
  campaign: null,
  setCampaign: (campaign) => set({ campaign }),

  isSpinning: false,
  setIsSpinning: (spinning) => set({ isSpinning: spinning }),
  spinResult: null,
  setSpinResult: (result) => set({ spinResult: result }),
  finalAngle: 0,
  setFinalAngle: (angle) => set({ finalAngle: angle }),

  recentWinners: [],
  setRecentWinners: (winners) => set({ recentWinners: winners }),
  addWinner: (winner) => set((state) => ({
    recentWinners: [winner, ...state.recentWinners].slice(0, 20),
  })),

  currentPromotion: null,
  setCurrentPromotion: (promotion) => set({ currentPromotion: promotion }),

  isSocketConnected: false,
  setIsSocketConnected: (connected) => set({ isSocketConnected: connected }),
}));
