'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { wheelConfigApi, prizesApi } from '@/lib/api';
import { useAppStore } from '@/stores/app-store';
import { WheelConfig, Prize } from '@/types';
import { toast } from 'sonner';
import { Save, Loader2, Palette, Settings } from 'lucide-react';

export function WheelConfigPanel() {
  const { currentCampaignId } = useAppStore();
  const [config, setConfig] = useState<WheelConfig | null>(null);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    sectorCount: 10,
    losingSectorCount: 4,
    spinDuration: 5,
    minRotations: 3,
    maxRotations: 8,
    pointerColor: '#FF0000',
    centerColor: '#FFFFFF',
    outerRingColor: '#333333',
    backgroundColor: '#1a1a2e',
    textColor: '#FFFFFF',
    fontSize: 16,
    soundEnabled: true,
  });

  async function loadConfig() {
    if (!currentCampaignId) {
      setConfig(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const wc = await wheelConfigApi.get(currentCampaignId);
      setConfig(wc);
      setFormData({
        sectorCount: wc.sectorCount ?? 10,
        losingSectorCount: wc.losingSectorCount ?? 4,
        spinDuration: wc.spinDuration / 1000, // Convert ms to seconds for UI
        minRotations: wc.minRotations,
        maxRotations: wc.maxRotations,
        pointerColor: wc.pointerColor,
        centerColor: wc.centerColor,
        outerRingColor: wc.outerRingColor,
        backgroundColor: wc.backgroundColor,
        textColor: wc.textColor,
        fontSize: wc.fontSize,
        soundEnabled: wc.soundEnabled ?? true,
      });
    } catch (error) {
      toast.error('Erreur lors du chargement de la configuration');
    } finally {
      setLoading(false);
    }
  }

  async function loadPrizes() {
    if (!currentCampaignId) return;
    try {
      const data = await prizesApi.list(currentCampaignId);
      setPrizes((Array.isArray(data) ? data : []).sort((a: Prize, b: Prize) => a.sortOrder - b.sortOrder));
    } catch (error) {
      toast.error('Erreur lors du chargement des lots');
    }
  }

  useEffect(() => {
    loadConfig();
    loadPrizes();
  }, [currentCampaignId]);

  async function handleSave() {
    if (!currentCampaignId) {
      toast.error('Sélectionnez une campagne d\'abord');
      return;
    }
    try {
      setSaving(true);
      const data = await wheelConfigApi.update(currentCampaignId, {
        sectorCount: formData.sectorCount,
        losingSectorCount: formData.losingSectorCount,
        spinDuration: formData.spinDuration * 1000, // Convert back to ms
        minRotations: formData.minRotations,
        maxRotations: formData.maxRotations,
        pointerColor: formData.pointerColor,
        centerColor: formData.centerColor,
        outerRingColor: formData.outerRingColor,
        backgroundColor: formData.backgroundColor,
        textColor: formData.textColor,
        fontSize: formData.fontSize,
        soundEnabled: formData.soundEnabled,
      });
      setConfig(data.wheelConfig);
      toast.success('Configuration sauvegardée');
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  }

  // Build sector layout preview
  function renderSectorLayout() {
    const losingPrizes = prizes.filter(p => p.isLosing);
    const winningPrizes = prizes.filter(p => !p.isLosing);
    const losingCount = formData.losingSectorCount;
    const winningCount = formData.sectorCount - losingCount;

    const sectors = [];
    for (let i = 0; i < losingCount; i++) {
      const prize = losingPrizes[i % (losingPrizes.length || 1)];
      sectors.push({ label: prize?.sectorLabel || prize?.name || 'Perdant', color: prize?.color || '#374151', isLosing: true });
    }
    for (let i = 0; i < winningCount && i < winningPrizes.length; i++) {
      const prize = winningPrizes[i];
      sectors.push({ label: prize?.sectorLabel || prize?.name || `Lot ${i + 1}`, color: prize?.color || '#FF6B35', isLosing: false });
    }
    while (sectors.length < formData.sectorCount) {
      sectors.push({ label: 'Perdant', color: '#374151', isLosing: true });
    }

    return sectors;
  }

  // Mini wheel preview
  function renderWheelPreview() {
    const sectors = renderSectorLayout();
    if (sectors.length === 0) return null;

    const equalAngle = 360 / sectors.length;
    let currentAngle = 0;

    return (
      <div className="flex flex-col items-center gap-4">
        <svg width="200" height="200" viewBox="-100 -100 200 200">
          <circle cx="0" cy="0" r="98" fill={formData.outerRingColor} />
          <circle cx="0" cy="0" r="90" fill={formData.backgroundColor} />

          {sectors.map((seg, i) => {
            const startAngle = currentAngle;
            currentAngle += equalAngle;
            const startRad = (startAngle * Math.PI) / 180;
            const endRad = ((startAngle + equalAngle) * Math.PI) / 180;
            const midRad = (startRad + endRad) / 2;
            const x1 = Math.cos(startRad) * 88;
            const y1 = Math.sin(startRad) * 88;
            const x2 = Math.cos(endRad) * 88;
            const y2 = Math.sin(endRad) * 88;
            const largeArc = equalAngle > 180 ? 1 : 0;

            const path = `M 0 0 L ${x1} ${y1} A 88 88 0 ${largeArc} 1 ${x2} ${y2} Z`;

            const labelRadius = 55;
            const labelX = Math.cos(midRad) * labelRadius;
            const labelY = Math.sin(midRad) * labelRadius;

            return (
              <g key={i}>
                <path d={path} fill={seg.color} stroke="#FFD700" strokeWidth="1" />
                <text
                  x={labelX}
                  y={labelY}
                  fill={formData.textColor}
                  fontSize={Math.min(formData.fontSize, 12)}
                  textAnchor="middle"
                  dominantBaseline="central"
                  transform={`rotate(${startAngle + equalAngle / 2}, ${labelX}, ${labelY})`}
                >
                  {seg.label}
                </text>
              </g>
            );
          })}

          <circle cx="0" cy="0" r="15" fill={formData.centerColor} stroke={formData.outerRingColor} strokeWidth="2" />
          <polygon points="0,-95 -8,-78 8,-78" fill={formData.pointerColor} stroke="#fff" strokeWidth="1" />
        </svg>

        {/* Sector position table */}
        <div className="w-full max-w-xs">
          <div className="text-sm font-semibold mb-2 text-center">Disposition des secteurs</div>
          <div className="grid grid-cols-5 gap-1">
            {sectors.map((sector, i) => (
              <div
                key={i}
                className={`flex flex-col items-center p-1 rounded text-xs ${
                  sector.isLosing ? 'border border-red-300' : 'border border-green-300'
                }`}
                style={{ backgroundColor: sector.color + '30' }}
              >
                <div className="font-bold">{i + 1}</div>
                <div
                  className="size-4 rounded-full border"
                  style={{ backgroundColor: sector.color }}
                />
                <div className="truncate text-[10px] max-w-full">{sector.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!currentCampaignId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Veuillez sélectionner une campagne d&apos;abord.
        </CardContent>
      </Card>
    );
  }

  const sectors = renderSectorLayout();
  const losingPrizes = prizes.filter(p => p.isLosing);
  const winningPrizes = prizes.filter(p => !p.isLosing);

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {/* Config Form */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Settings className="size-5" />
            Configuration de la Roue
          </CardTitle>
          <Button onClick={handleSave} size="sm" className="gap-1.5 bg-gradient-to-r from-amber-400 to-red-500 text-white" disabled={saving}>
            {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            Sauvegarder
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              {/* Sector Configuration */}
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  🎡 Secteurs
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="sector-count" className="text-xs">Nombre de secteurs</Label>
                    <Input
                      id="sector-count"
                      type="number"
                      min={2}
                      max={20}
                      value={formData.sectorCount}
                      onChange={(e) => setFormData({ ...formData, sectorCount: Number(e.target.value) })}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="losing-count" className="text-xs">Secteurs perdants</Label>
                    <Input
                      id="losing-count"
                      type="number"
                      min={1}
                      max={formData.sectorCount - 1}
                      value={formData.losingSectorCount}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (val >= 1 && val < formData.sectorCount) {
                          setFormData({ ...formData, losingSectorCount: val });
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="mt-2 p-2 rounded border text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Secteurs perdants : {formData.losingSectorCount}</span>
                    <span>Secteurs gagnants : {formData.sectorCount - formData.losingSectorCount}</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span>Lots gagnants disponibles : {winningPrizes.length}</span>
                    <span>Lots perdants configurés : {losingPrizes.length}</span>
                  </div>
                  {formData.sectorCount - formData.losingSectorCount > winningPrizes.length && (
                    <div className="text-red-500 mt-1">
                      ⚠️ Il n'y a pas assez de lots gagnants pour remplir tous les secteurs gagnants.
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Animation Settings */}
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  🎬 Animation
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="spin-duration" className="text-xs">Durée (s)</Label>
                    <Input
                      id="spin-duration"
                      type="number"
                      min={1}
                      max={30}
                      value={formData.spinDuration}
                      onChange={(e) => setFormData({ ...formData, spinDuration: Number(e.target.value) })}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="min-rotations" className="text-xs">Min rotations</Label>
                    <Input
                      id="min-rotations"
                      type="number"
                      min={1}
                      max={20}
                      value={formData.minRotations}
                      onChange={(e) => setFormData({ ...formData, minRotations: Number(e.target.value) })}
                    />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="max-rotations" className="text-xs">Max rotations</Label>
                    <Input
                      id="max-rotations"
                      type="number"
                      min={1}
                      max={20}
                      value={formData.maxRotations}
                      onChange={(e) => setFormData({ ...formData, maxRotations: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Sound Toggle */}
              <div className="flex items-center gap-3">
                <Switch
                  checked={formData.soundEnabled}
                  onCheckedChange={(checked) => setFormData({ ...formData, soundEnabled: checked })}
                />
                <Label>🔊 Sons activés</Label>
              </div>

              <Separator />

              {/* Color Settings */}
              <div>
                <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <Palette className="size-4" />
                  Couleurs
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Pointeur</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={formData.pointerColor}
                        onChange={(e) => setFormData({ ...formData, pointerColor: e.target.value })}
                        className="h-9 w-12 cursor-pointer"
                      />
                      <Input
                        value={formData.pointerColor}
                        onChange={(e) => setFormData({ ...formData, pointerColor: e.target.value })}
                        className="h-9"
                      />
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Centre</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={formData.centerColor}
                        onChange={(e) => setFormData({ ...formData, centerColor: e.target.value })}
                        className="h-9 w-12 cursor-pointer"
                      />
                      <Input
                        value={formData.centerColor}
                        onChange={(e) => setFormData({ ...formData, centerColor: e.target.value })}
                        className="h-9"
                      />
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Anneau extérieur</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={formData.outerRingColor}
                        onChange={(e) => setFormData({ ...formData, outerRingColor: e.target.value })}
                        className="h-9 w-12 cursor-pointer"
                      />
                      <Input
                        value={formData.outerRingColor}
                        onChange={(e) => setFormData({ ...formData, outerRingColor: e.target.value })}
                        className="h-9"
                      />
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Fond</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={formData.backgroundColor}
                        onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                        className="h-9 w-12 cursor-pointer"
                      />
                      <Input
                        value={formData.backgroundColor}
                        onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                        className="h-9"
                      />
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <Label className="text-xs">Texte</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="color"
                        value={formData.textColor}
                        onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                        className="h-9 w-12 cursor-pointer"
                      />
                      <Input
                        value={formData.textColor}
                        onChange={(e) => setFormData({ ...formData, textColor: e.target.value })}
                        className="h-9"
                      />
                    </div>
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="font-size" className="text-xs">Taille texte</Label>
                    <Input
                      id="font-size"
                      type="number"
                      min={8}
                      max={32}
                      value={formData.fontSize}
                      onChange={(e) => setFormData({ ...formData, fontSize: Number(e.target.value) })}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview Card */}
      <Card>
        <CardHeader>
          <CardTitle>Aperçu de la Roue</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-6">
          {loading ? (
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          ) : prizes.length === 0 ? (
            <div className="text-center text-muted-foreground">
              Ajoutez des lots pour voir l&apos;aperçu de la roue.
            </div>
          ) : (
            renderWheelPreview()
          )}
        </CardContent>
      </Card>
    </div>
  );
}
