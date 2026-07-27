'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useAppStore } from '@/stores/app-store';
import { useSocket } from '@/hooks/use-socket';
import { WheelView } from '@/components/wheel/wheel-view';
import { AdminDashboard } from '@/components/admin/admin-dashboard';
import { TVDisplay } from '@/components/tv/tv-display';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Volume2, VolumeX, LogOut, Settings, Loader2 } from 'lucide-react';
import { campaignsApi } from '@/lib/api';
import { toast } from 'sonner';

// Admin password - stored in localStorage for persistence
const ADMIN_PASSWORD_KEY = 'roue_admin_auth';
const ADMIN_PASSWORD = 'admin2024';

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
    isAdminAuthenticated,
    setIsAdminAuthenticated,
  } = useAppStore();

  // Auth dialog state
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [authenticating, setAuthenticating] = useState(false);

  // Triple-click detection
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Campaign selector state
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);

  // TV mode (separate from admin, accessible via admin)
  const [showTV, setShowTV] = useState(false);

  // Check localStorage for persisted auth on mount
  useEffect(() => {
    const savedAuth = localStorage.getItem(ADMIN_PASSWORD_KEY);
    if (savedAuth === 'true') {
      setIsAdminAuthenticated(true);
    }

    // Check URL hash for #admin
    const checkHash = () => {
      if (window.location.hash === '#admin') {
        if (!isAdminAuthenticated) {
          setShowAuthDialog(true);
        } else {
          setCurrentView('admin');
        }
      }
    };
    checkHash();

    // Listen for hash changes
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  // Load default campaign on mount
  useEffect(() => {
    async function loadDefaultCampaign() {
      try {
        const res = await fetch('/api/campaigns');
        const data = await res.json();
        const campaignList = Array.isArray(data) ? data : (data.campaigns || []);
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

  // Triple-click handler on title
  const handleTitleClick = useCallback(() => {
    clickCountRef.current += 1;

    if (clickTimerRef.current) {
      clearTimeout(clickTimerRef.current);
    }

    if (clickCountRef.current >= 3) {
      clickCountRef.current = 0;
      // Triple-click detected — show auth dialog or go to admin
      if (isAdminAuthenticated) {
        setCurrentView('admin');
      } else {
        setShowAuthDialog(true);
      }
    } else {
      clickTimerRef.current = setTimeout(() => {
        clickCountRef.current = 0;
      }, 500);
    }
  }, [isAdminAuthenticated, setCurrentView]);

  // Handle auth
  const handleAuthenticate = useCallback(async () => {
    if (!passwordInput.trim()) {
      setAuthError('Veuillez entrer le mot de passe');
      return;
    }

    setAuthenticating(true);
    setAuthError('');

    // Simple password check
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAdminAuthenticated(true);
      localStorage.setItem(ADMIN_PASSWORD_KEY, 'true');
      setShowAuthDialog(false);
      setPasswordInput('');
      setCurrentView('admin');
      toast.success('Accès administrateur autorisé');
    } else {
      setAuthError('Mot de passe incorrect');
    }

    setAuthenticating(false);
  }, [passwordInput, setIsAdminAuthenticated, setCurrentView]);

  // Handle logout
  const handleLogout = useCallback(() => {
    setIsAdminAuthenticated(false);
    localStorage.removeItem(ADMIN_PASSWORD_KEY);
    setCurrentView('wheel');
    toast.success('Déconnexion réussie');
  }, [setIsAdminAuthenticated, setCurrentView]);

  // Load campaigns for admin selector
  useEffect(() => {
    async function loadCampaigns() {
      if (currentView !== 'admin' || !isAdminAuthenticated) return;
      try {
        setLoadingCampaigns(true);
        const data = await campaignsApi.list();
        setCampaigns(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to load campaigns:', error);
      } finally {
        setLoadingCampaigns(false);
      }
    }
    loadCampaigns();
  }, [currentView, isAdminAuthenticated]);

  // Handle campaign change in admin selector
  const handleCampaignChange = useCallback(async (id: string) => {
    try {
      const data = await campaignsApi.get(id);
      setCurrentCampaignId(id);
      setCampaign(data);
      toast.success('Campagne sélectionnée');
    } catch (error) {
      toast.error('Erreur lors de la sélection de la campagne');
    }
  }, [setCurrentCampaignId, setCampaign]);

  // ==================== ADMIN VIEW (full page, separate from wheel) ====================
  if (currentView === 'admin' && isAdminAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        {/* Admin sticky header */}
        <header className="sticky top-0 z-50 border-b bg-white shadow-sm">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <Settings className="size-5 text-gray-600 shrink-0" />
              <h1 className="text-lg font-bold text-gray-800 truncate">
                Administration
              </h1>
            </div>

            {/* Campaign selector */}
            <div className="flex items-center gap-2 flex-1 max-w-xs">
              <Select
                value={currentCampaignId || ''}
                onValueChange={handleCampaignChange}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Sélectionner une campagne" />
                </SelectTrigger>
                <SelectContent>
                  {campaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* TV mode + Logout */}
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowTV(true)}
                className="gap-1.5"
              >
                Mode TV
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="size-4" />
                Déconnexion
              </Button>
            </div>
          </div>
        </header>

        {/* Admin dashboard content */}
        <main className="flex-1 overflow-y-auto">
          <AdminDashboard />
        </main>

        {/* TV mode overlay from admin */}
        {showTV && (
          <div className="fixed inset-0 z-[200] bg-black">
            <button
              onClick={() => setShowTV(false)}
              className="absolute top-4 right-4 z-10 bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors shadow-lg"
            >
              Quitter Mode TV
            </button>
            <TVDisplay />
          </div>
        )}
      </div>
    );
  }

  // ==================== WHEEL VIEW (default, clean, no admin visible) ====================
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[#0f0c29] via-[#302b63] to-[#24243e]">
      {/* Wheel page header - clean, no admin/TV buttons visible */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/40 backdrop-blur-md shadow-lg">
        <div className="container mx-auto px-3 sm:px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gradient-to-br from-amber-400 via-yellow-500 to-red-500 flex items-center justify-center shadow-lg shadow-amber-500/30 animate-pulse shrink-0">
              <span className="text-white font-bold text-sm sm:text-lg">★</span>
            </div>
            <h1
              className="text-base sm:text-xl font-bold tracking-tight text-white drop-shadow-lg truncate cursor-default select-none"
              onClick={handleTitleClick}
            >
              ROUE DE LA CHANCE
            </h1>
          </div>
          {/* Sound toggle only */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="text-white/70 hover:text-white hover:bg-white/10 shrink-0"
          >
            {soundEnabled ? <Volume2 className="size-4" /> : <VolumeX className="size-4" />}
          </Button>
        </div>
      </header>

      <main className="flex-1">
        <WheelView />
      </main>

      <footer className="border-t border-white/10 bg-black/40 backdrop-blur-md mt-auto">
        <div className="container mx-auto px-4 py-3 text-center text-xs text-white/50">
          Roue de la Chance &copy; {new Date().getFullYear()}
        </div>
      </footer>

      {/* Auth dialog */}
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="bg-[#1a1a2e] border-white/20 text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">Accès Administrateur</DialogTitle>
            <DialogDescription className="text-white/60">
              Entrez le mot de passe pour accéder au panneau d&apos;administration.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              type="password"
              value={passwordInput}
              onChange={(e) => {
                setPasswordInput(e.target.value);
                setAuthError('');
              }}
              placeholder="Mot de passe"
              className="bg-white/10 border-white/20 text-white placeholder:text-white/40 text-center"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && handleAuthenticate()}
            />
            {authError && (
              <p className="text-red-400 text-sm mt-2 text-center">{authError}</p>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="ghost"
              onClick={() => {
                setShowAuthDialog(false);
                setPasswordInput('');
                setAuthError('');
              }}
              className="text-white/60 hover:text-white hover:bg-white/10"
            >
              Annuler
            </Button>
            <Button
              onClick={handleAuthenticate}
              disabled={authenticating || !passwordInput.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {authenticating ? <Loader2 className="size-4 animate-spin" /> : 'Connexion'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
