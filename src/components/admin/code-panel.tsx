'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { codesApi, prizesApi } from '@/lib/api';
import { useAppStore } from '@/stores/app-store';
import { Code, Prize } from '@/types';
import { toast } from 'sonner';
import { Plus, RefreshCw, Loader2, QrCode } from 'lucide-react';

const statusColors: Record<string, string> = {
  unused: 'secondary',
  used: 'default',
  winning: 'default',
  losing: 'destructive',
};

const statusLabels: Record<string, string> = {
  unused: 'Non utilisé',
  used: 'Utilisé',
  winning: 'Gagnant',
  losing: 'Perdant',
};

export function CodePanel() {
  const { currentCampaignId } = useAppStore();
  const [codes, setCodes] = useState<Code[]>([]);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [showGenerate, setShowGenerate] = useState(false);
  const [showReset, setShowReset] = useState<string | null>(null);

  const [generateData, setGenerateData] = useState({
    count: 10,
    prizeIds: [] as string[],
  });

  async function loadCodes() {
    if (!currentCampaignId) {
      setCodes([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const statusParam = filter !== 'all' ? filter : undefined;
      const data = await codesApi.list(currentCampaignId, statusParam);
      setCodes(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Erreur lors du chargement des codes');
    } finally {
      setLoading(false);
    }
  }

  async function loadPrizes() {
    if (!currentCampaignId) return;
    try {
      const data = await prizesApi.list(currentCampaignId);
      setPrizes(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Erreur lors du chargement des lots');
    }
  }

  useEffect(() => {
    loadCodes();
  }, [currentCampaignId, filter]);

  useEffect(() => {
    loadPrizes();
  }, [currentCampaignId]);

  async function handleGenerate() {
    if (!currentCampaignId) {
      toast.error('Sélectionnez une campagne d\'abord');
      return;
    }
    if (generateData.count < 1 || generateData.count > 1000) {
      toast.error('Le nombre de codes doit être entre 1 et 1000');
      return;
    }
    try {
      await codesApi.generate({
        campaignId: currentCampaignId,
        count: generateData.count,
        prizeIds: generateData.prizeIds.length > 0 ? generateData.prizeIds : undefined,
      });
      toast.success(`${generateData.count} codes générés`);
      setShowGenerate(false);
      setGenerateData({ count: 10, prizeIds: [] });
      await loadCodes();
    } catch (error) {
      toast.error('Erreur lors de la génération');
    }
  }

  async function handleResetToLosing(id: string) {
    try {
      await codesApi.update(id, { status: 'losing' });
      toast.success('Code réinitialisé en perdant');
      setShowReset(null);
      await loadCodes();
    } catch (error) {
      toast.error('Erreur lors de la réinitialisation');
    }
  }

  // Calculate statistics
  const totalCodes = codes.length;
  const usedCodes = codes.filter((c) => c.status === 'used').length;
  const unusedCodes = codes.filter((c) => c.status === 'unused').length;
  const winningCodes = codes.filter((c) => c.status === 'winning').length;
  const losingCodes = codes.filter((c) => c.status === 'losing').length;

  if (!currentCampaignId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Veuillez sélectionner une campagne d&apos;abord.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Total</div>
          <div className="text-2xl font-bold">{totalCodes}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Non utilisés</div>
          <div className="text-2xl font-bold text-green-600">{unusedCodes}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Utilisés</div>
          <div className="text-2xl font-bold">{usedCodes}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Gagnants</div>
          <div className="text-2xl font-bold text-amber-600">{winningCodes}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Perdants</div>
          <div className="text-2xl font-bold text-red-600">{losingCodes}</div>
        </Card>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Gestion des Codes</CardTitle>
          <div className="flex gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[140px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="unused">Non utilisés</SelectItem>
                <SelectItem value="used">Utilisés</SelectItem>
                <SelectItem value="winning">Gagnants</SelectItem>
                <SelectItem value="losing">Perdants</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={() => setShowGenerate(true)} size="sm" className="gap-1.5">
              <Plus className="size-4" />
              Générer
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : codes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Aucun code trouvé. Génère des codes pour commencer.
            </div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Lot</TableHead>
                    <TableHead>Date création</TableHead>
                    <TableHead>Date utilisation</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {codes.map((code) => (
                    <TableRow key={code.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <QrCode className="size-4 text-muted-foreground" />
                          <span className="font-mono font-medium">{code.value}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusColors[code.status] as 'default' | 'secondary' | 'destructive'}>
                          {statusLabels[code.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>{code.prize?.name || '-'}</TableCell>
                      <TableCell>{new Date(code.createdAt).toLocaleDateString('fr-FR')}</TableCell>
                      <TableCell>{code.usedAt ? new Date(code.usedAt).toLocaleDateString('fr-FR') : '-'}</TableCell>
                      <TableCell className="text-right">
                        {code.status !== 'losing' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setShowReset(code.id)}
                            className="h-7 gap-1"
                          >
                            <RefreshCw className="size-3" />
                            Réinitialiser
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Generate Dialog */}
      <Dialog open={showGenerate} onOpenChange={setShowGenerate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Générer des Codes</DialogTitle>
            <DialogDescription>Créez de nouveaux codes pour la campagne.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="code-count">Nombre de codes *</Label>
              <Input
                id="code-count"
                type="number"
                min={1}
                max={1000}
                value={generateData.count}
                onChange={(e) => setGenerateData({ ...generateData, count: Number(e.target.value) })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Assigner à des lots (optionnel)</Label>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {prizes.filter((p) => !p.isLosing).map((prize) => (
                  <div key={prize.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={generateData.prizeIds.includes(prize.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setGenerateData({
                            ...generateData,
                            prizeIds: [...generateData.prizeIds, prize.id],
                          });
                        } else {
                          setGenerateData({
                            ...generateData,
                            prizeIds: generateData.prizeIds.filter((id) => id !== prize.id),
                          });
                        }
                      }}
                      className="size-4 rounded border"
                    />
                    <div className="size-4 rounded" style={{ backgroundColor: prize.color }} />
                    <span className="text-sm">{prize.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowGenerate(false)}>
              Annuler
            </Button>
            <Button onClick={handleGenerate}>Générer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Confirmation Dialog */}
      <Dialog open={showReset !== null} onOpenChange={() => setShowReset(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Réinitialiser le code</DialogTitle>
            <DialogDescription>
              Ce code sera marqué comme perdant. Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowReset(null)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={() => showReset && handleResetToLosing(showReset)}>
              Réinitialiser
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
