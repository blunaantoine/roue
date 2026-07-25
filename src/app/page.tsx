'use client';

import { useEffect } from 'react';
import { useAppStore } from '@/stores/app-store';
import { useSocket } from '@/hooks/use-socket';
import { WheelView } from '@/components/wheel/wheel-view';
import { AdminDashboard } from '@/components/admin/admin-dashboard';
import { TVDisplay } from '@/components/tv/tv-display';

export default function Home() {
  const { currentView, setCurrentView, currentCampaignId, setCurrentCampaignId, campaign, setCampaign } = useAppStore();

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
          // Load full campaign details (with prizes and wheelConfig)
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
    <div className="min-h-screen flex flex-col bg-background">
      <header className="sticky top-0 z-50 border-b bg-card shadow-sm">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-red-500 flex items-center justify-center">
              <span className="text-white font-bold text-sm">★</span>
            </div>
            <h1 className="text-lg font-bold tracking-tight">Roue de la Chance</h1>
          </div>
          <div className="flex items-center gap-2">
            <nav className="flex gap-1">
              <button
                onClick={() => setCurrentView('wheel')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  currentView === 'wheel'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
              >
                🎡 Roue
              </button>
              <button
                onClick={() => setCurrentView('admin')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  currentView === 'admin'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
              >
                ⚙️ Admin
              </button>
              <button
                onClick={() => setCurrentView('tv')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  currentView === 'tv'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-accent'
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

      <footer className="border-t bg-card mt-auto">
        <div className="container mx-auto px-4 py-2 text-center text-xs text-muted-foreground">
          Roue de la Chance — Plateforme Promotionnelle &copy; {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}
