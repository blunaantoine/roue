'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/stores/app-store';
import { useSocket } from '@/hooks/use-socket';
import { WheelView } from '@/components/wheel/wheel-view';
import { AdminDashboard } from '@/components/admin/admin-dashboard';
import { TVDisplay } from '@/components/tv/tv-display';
import { Button } from '@/components/ui/button';
import { Volume2, VolumeX } from 'lucide-react';

export default function Home() {
  const {
    currentView,
    setCurrentView,
    currentCampaignId,
    setCurrentCampaignId,
    campaign,
    setCampaign,
    soundEnabled,
    setSoundEnabled,
  } = useAppStore();

  // Load default campaign on mount
  useEffect(() => {
    async function loadDefaultCampaign() {
      try {
        const res = await fetch('/api/campaigns');
        const campaigns = await res.json();
        const campaignList = Array.isArray(campaigns) ? campaigns : (campaigns.campaigns || []);
        if (campaignList.length > 0) {
          const firstCampaign = campaignList[0];
          setCurrentCampaignId(firstCampaign.id);
          const detailRes = await fetch(`/api/campaigns/${firstCampaign.id}`);
          const campaignData = await detailRes.json();
          const fullCampaign = campaignData.campaign || campaignData;
          setCampaign(fullCampaign);
        }
      } catch (error) {
        console.error('Failed to load campaign:', error);
      }
    }
    if (!currentCampaignId) {
      loadDefaultCampaign();
    }
  }, [currentCampaignId, setCurrentCampaignId, setCampaign]);

  useSocket();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#0f0c29] via-[#302b63] to-[#24243e]">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/40 backdrop-blur-md shadow-lg">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 via-yellow-500 to-red-500 flex items-center justify-center shadow-lg shadow-amber-500/30 animate-pulse">
              <span className="text-white font-bold text-lg">★</span>
            </div>
            <h1 className="text-xl font-bold tracking-tight text-white drop-shadow-lg">
              🎡 Roue de la Chance
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {currentView === 'wheel' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="text-white/70 hover:text-white hover:bg-white/10"
              >
                {soundEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
              </Button>
            )}
            <nav className="flex gap-1">
              <button
                onClick={() => setCurrentView('wheel')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                  currentView === 'wheel'
                    ? 'bg-gradient-to-r from-amber-400 to-red-500 text-white shadow-lg shadow-amber-500/30'
                    : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                }`}
              >
                🎡 Roue
              </button>
              <button
                onClick={() => setCurrentView('admin')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                  currentView === 'admin'
                    ? 'bg-gradient-to-r from-amber-400 to-red-500 text-white shadow-lg shadow-amber-500/30'
                    : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                }`}
              >
                ⚙️ Admin
              </button>
              <button
                onClick={() => setCurrentView('tv')}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
                  currentView === 'tv'
                    ? 'bg-gradient-to-r from-amber-400 to-red-500 text-white shadow-lg shadow-amber-500/30'
                    : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white'
                }`}
              >
                📺 TV
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {currentView === 'wheel' && <WheelView />}
        {currentView === 'admin' && <AdminDashboard />}
        {currentView === 'tv' && <TVDisplay />}
      </main>

      <footer className="border-t border-white/10 bg-black/40 backdrop-blur-md mt-auto">
        <div className="container mx-auto px-4 py-3 text-center text-xs text-white/50">
          Roue de la Chance — Plateforme Promotionnelle &copy; {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}
