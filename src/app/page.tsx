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
import { Settings, LogOut, Loader2, Gift, Shield, Trophy, Users } from 'lucide-react';
import { campaignsApi } from '@/lib/api';
import { toast } from 'sonner';

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

  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [authenticating, setAuthenticating] = useState(false);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [showTV, setShowTV] = useState(false);

  // Triple-click detection
  const clickCountRef = useRef(0);
  const clickTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check localStorage + hash on mount
  useEffect(() => {
    const savedAuth = localStorage.getItem(ADMIN_PASSWORD_KEY);
    if (savedAuth === 'true') {
      setIsAdminAuthenticated(true);
    }
    const checkHash = () => {
      if (window.location.hash === '#admin') {
        if (!isAdminAuthenticated && savedAuth !== 'true') {
          setShowAuthDialog(true);
        } else {
          setCurrentView('admin');
        }
      }
    };
    checkHash();
    window.addEventListener('hashchange', checkHash);
    return () => window.removeEventListener('hashchange', checkHash);
  }, []);

  // Load default campaign
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
          setCampaign(campaignData.campaign || campaignData);
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
    if (clickTimerRef.current) clearTimeout(clickTimerRef.current);
    if (clickCountRef.current >= 3) {
      clickCountRef.current = 0;
      if (isAdminAuthenticated) {
        setCurrentView('admin');
      } else {
        setShowAuthDialog(true);
      }
    } else {
      clickTimerRef.current = setTimeout(() => { clickCountRef.current = 0; }, 500);
    }
  }, [isAdminAuthenticated, setCurrentView]);

  const handleAuthenticate = useCallback(async () => {
    if (!passwordInput.trim()) { setAuthError('Veuillez entrer le mot de passe'); return; }
    setAuthenticating(true); setAuthError('');
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAdminAuthenticated(true);
      localStorage.setItem(ADMIN_PASSWORD_KEY, 'true');
      setShowAuthDialog(false); setPasswordInput('');
      setCurrentView('admin');
      toast.success('Accès administrateur autorisé');
    } else {
      setAuthError('Mot de passe incorrect');
    }
    setAuthenticating(false);
  }, [passwordInput, setIsAdminAuthenticated, setCurrentView]);

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
        const data = await campaignsApi.list();
        setCampaigns(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error('Failed to load campaigns:', error);
      }
    }
    loadCampaigns();
  }, [currentView, isAdminAuthenticated]);

  const handleCampaignChange = useCallback(async (id: string) => {
    try {
      const data = await campaignsApi.get(id);
      setCurrentCampaignId(id);
      setCampaign(data);
      toast.success('Campagne sélectionnée');
    } catch (error) {
      toast.error('Erreur lors de la sélection');
    }
  }, [setCurrentCampaignId, setCampaign]);

  // ==================== ADMIN VIEW ====================
  if (currentView === 'admin' && isAdminAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <header className="sticky top-0 z-50 border-b bg-white shadow-sm">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <Settings className="size-5 text-gray-600 shrink-0" />
              <h1 className="text-lg font-bold text-gray-800 truncate">Administration</h1>
            </div>
            <div className="flex items-center gap-2 flex-1 max-w-xs">
              <Select value={currentCampaignId || ''} onValueChange={handleCampaignChange}>
                <SelectTrigger className="w-full"><SelectValue placeholder="Sélectionner une campagne" /></SelectTrigger>
                <SelectContent>
                  {campaigns.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={() => setShowTV(true)} className="gap-1.5">Mode TV</Button>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50">
                <LogOut className="size-4" /> Déconnexion
              </Button>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto"><AdminDashboard /></main>
        {showTV && (
          <div className="fixed inset-0 z-[200] bg-black">
            <button onClick={() => setShowTV(false)} className="absolute top-4 right-4 z-10 bg-red-600 hover:bg-red-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors shadow-lg">Quitter Mode TV</button>
            <TVDisplay />
          </div>
        )}
      </div>
    );
  }

  // ==================== WHEEL VIEW (exact design) ====================
  return (
    <div className="min-h-screen flex flex-col bg-black relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Green diagonal light streaks */}
        <div className="absolute -top-20 -left-20 w-[60%] h-[60%] opacity-[0.07] rotate-[35deg]"
          style={{ background: 'linear-gradient(180deg, #00C853 0%, transparent 80%)' }} />
        <div className="absolute -bottom-20 -right-20 w-[40%] h-[40%] opacity-[0.05] rotate-[35deg]"
          style={{ background: 'linear-gradient(0deg, #00C853 0%, transparent 80%)' }} />
        {/* Dot grid pattern top-right */}
        <div className="absolute top-6 right-6 opacity-[0.08]"
          style={{
            backgroundImage: 'radial-gradient(circle, #00C853 1px, transparent 1px)',
            backgroundSize: '12px 12px',
            width: '80px',
            height: '80px',
          }} />
        {/* Confetti/sparkle particles */}
        {[...Array(12)].map((_, i) => (
          <div key={i}
            className={`absolute rounded-full opacity-[0.15] ${i % 3 === 0 ? 'bg-[#FFD700]' : i % 3 === 1 ? 'bg-[#00C853]' : 'bg-white'}`}
            style={{
              width: `${2 + (i % 4)}px`,
              height: `${2 + (i % 4)}px`,
              left: `${5 + i * 8}%`,
              top: `${10 + (i % 5) * 15}%`,
            }} />
        ))}
      </div>

      {/* ===== HEADER ===== */}
      <header className="relative z-10 px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          {/* Left: Logo + Title */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Logo box */}
            <div className="bg-white rounded-xl px-2.5 py-2 flex flex-col items-center shadow-lg shrink-0">
              <span className="text-[#00C853] font-extrabold text-lg leading-none">FLR</span>
              <span className="text-black font-semibold text-[6px] uppercase tracking-wider leading-none mt-0.5">LA ROUTE SARIÉ</span>
            </div>
            {/* Title */}
            <div className="min-w-0">
              <h1
                className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight leading-tight cursor-default select-none"
                onClick={handleTitleClick}
              >
                <span className="text-white">ROUE DE&nbsp;</span>
                <span className="bg-gradient-to-r from-[#FFD700] to-[#FFA500] bg-clip-text text-transparent">L'ÉCONOMIE</span>
              </h1>
              <div className="flex items-center gap-1 mt-0.5">
                <p className="text-white/70 text-xs sm:text-sm">Tentez votre chance et gagnez des cadeaux !</p>
                <div className="h-[2px] w-16 bg-[#00C853] opacity-60" />
              </div>
            </div>
          </div>
          {/* Right: Gift icon */}
          <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-[1.5px] border-[#D4AF37] flex items-center justify-center shrink-0">
            <Gift className="size-5 sm:size-6 text-[#FFD700]" />
          </div>
        </div>
      </header>

      {/* ===== MAIN WHEEL CONTENT ===== */}
      <main className="flex-1 relative z-10">
        <WheelView />
      </main>

      {/* ===== FOOTER INFO BAR ===== */}
      <footer className="relative z-10 px-4 pb-4 pt-2 mt-auto">
        <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 text-center">
              <Shield className="size-4 text-[#00C853] mx-auto mb-1" />
              <p className="text-white font-bold text-[10px] sm:text-[11px]">100% ÉQUITABLE</p>
              <p className="text-white/40 text-[8px] sm:text-[9px]">Chaque code a sa chance</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="flex-1 text-center">
              <Trophy className="size-4 text-[#00C853] mx-auto mb-1" />
              <p className="text-white font-bold text-[10px] sm:text-[11px]">NOMBREUX LOTS</p>
              <p className="text-white/40 text-[8px] sm:text-[9px]">Des cadeaux exclusifs</p>
            </div>
            <div className="w-px h-8 bg-white/10" />
            <div className="flex-1 text-center">
              <Users className="size-4 text-[#00C853] mx-auto mb-1" />
              <p className="text-white font-bold text-[10px] sm:text-[11px]">PARTICIPEZ</p>
              <p className="text-white/40 text-[8px] sm:text-[9px]">Plus vous jouez, plus vous gagnez</p>
            </div>
          </div>
        </div>
      </footer>

      {/* Auth dialog */}
      <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
        <DialogContent className="bg-[#1a1a2e] border-white/20 text-white max-w-sm mx-auto">
          <DialogHeader>
            <DialogTitle className="text-white text-xl">Accès Administrateur</DialogTitle>
            <DialogDescription className="text-white/60">Entrez le mot de passe pour accéder au panneau d&apos;administration.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input type="password" value={passwordInput} onChange={(e) => { setPasswordInput(e.target.value); setAuthError(''); }}
              placeholder="Mot de passe" className="bg-white/10 border-white/20 text-white placeholder:text-white/40 text-center"
              autoFocus onKeyDown={(e) => e.key === 'Enter' && handleAuthenticate()} />
            {authError && <p className="text-red-400 text-sm mt-2 text-center">{authError}</p>}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => { setShowAuthDialog(false); setPasswordInput(''); setAuthError(''); }}
              className="text-white/60 hover:text-white hover:bg-white/10">Annuler</Button>
            <Button onClick={handleAuthenticate} disabled={authenticating || !passwordInput.trim()}
              className="bg-[#00C853] hover:bg-[#2E7D32] text-white font-semibold">
              {authenticating ? <Loader2 className="size-4 animate-spin" /> : 'Connexion'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
