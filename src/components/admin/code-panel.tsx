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
import { Plus, Pencil, Loader2, QrCode } from 'lucide-react';

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

const statusOptions: { value: string; label: string; color: string }[] = [
  { value: 'unused', label: 'Non utilisé', color: 'bg-green-500' },
  { value: 'used', label: 'Utilisé', color: 'bg-blue-500' },
  { value: 'winning', label: 'Gagnant', color: 'bg-amber-500' },
  { value: 'losing', label: 'Perdant', color: 'bg-red-500' },
];

interface StatusEditState {
  codeId: string;
  codeValue: string;
  currentStatus: string;
  newStatus: string;
  selectedPrizeId: string;
}

export function CodePanel() {
  const { currentCampaignId } = useAppStore();
  const [codes, setCodes] = useState<Code[]>([]);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [showGenerate, setShowGenerate] = useState(false);
  const [showStatusEdit, setShowStatusEdit] = useState(false);
  const [statusEditData, setStatusEditData] = useState<StatusEditState | null>(null);

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

  function openStatusEdit(code: Code) {
    setStatusEditData({
      codeId: code.id,
      codeValue: code.value,
      currentStatus: code.status,
      newStatus: code.status,
      selectedPrizeId: code.prizeId || '',
    });
    setShowStatusEdit(true);
  }

  async function handleStatusUpdate() {
    if (!statusEditData) return;

    const { codeId, newStatus, selectedPrizeId } = statusEditData;

    try {
      const updatePayload: Record<string, unknown> = {
        status: newStatus,
      };

      // When status is "winning", assign the selected prize
      if (newStatus === 'winning') {
        if (!selectedPrizeId) {
          toast.error('Veuillez sélectionner un lot pour un ticket gagnant');
          return;
        }
        updatePayload.prizeId = selectedPrizeId;
      } else if (newStatus === 'losing') {
        // Losing codes: clear prize assignment
        updatePayload.prizeId = null;
      } else if (newStatus === 'unused') {
        // Reset code: clear prize and usage date
        updatePayload.prizeId = null;
      } else if (newStatus === 'used') {
        // Just used: keep existing prize or clear
        updatePayload.prizeId = selectedPrizeId || null;
      }

      await codesApi.update(codeId, updatePayload);
      toast.success(`Statut du ticket ${statusEditData.codeValue} modifié avec succès`);
      setShowStatusEdit(false);
      setStatusEditData(null);
      await loadCodes();
    } catch (error) {
      toast.error('Erreur lors de la modification du statut');
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
          <CardTitle>Gestion des Tickets</CardTitle>
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
              Aucun ticket trouvé. Génère des tickets pour commencer.
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
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openStatusEdit(code)}
                          className="h-7 gap-1"
                        >
                          <Pencil className="size-3" />
                          Modifier
                        </Button>
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
            <DialogTitle>Générer des Tickets</DialogTitle>
            <DialogDescription>Créez de nouveaux tickets pour la campagne.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="code-count">Nombre de tickets *</Label>
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

      {/* Status Edit Dialog */}
      <Dialog open={showStatusEdit} onOpenChange={(open) => {
        if (!open) {
          setShowStatusEdit(false);
          setStatusEditData(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le statut du ticket</DialogTitle>
            <DialogDescription>
              Ticket : <span className="font-mono font-bold">{statusEditData?.codeValue}</span>
              — Statut actuel : <Badge variant={statusColors[statusEditData?.currentStatus || 'unused'] as 'default' | 'secondary' | 'destructive'}>
                {statusLabels[statusEditData?.currentStatus || 'unused']}
              </Badge>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nouveau statut *</Label>
              <Select
                value={statusEditData?.newStatus || 'unused'}
                onValueChange={(value) => {
                  if (statusEditData) {
                    setStatusEditData({
                      ...statusEditData,
                      newStatus: value,
                      // Clear prize selection when switching to losing/unused
                      selectedPrizeId: value === 'losing' || value === 'unused' ? '' : statusEditData.selectedPrizeId,
                    });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      <div className="flex items-center gap-2">
                        <div className={`size-2.5 rounded-full ${opt.color}`} />
                        {opt.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Prize selection - shown when status is "winning" */}
            {statusEditData?.newStatus === 'winning' && (
              <div className="grid gap-2">
                <Label>Lot associé *</Label>
                <Select
                  value={statusEditData.selectedPrizeId}
                  onValueChange={(value) => {
                    if (statusEditData) {
                      setStatusEditData({ ...statusEditData, selectedPrizeId: value });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez un lot" />
                  </SelectTrigger>
                  <SelectContent>
                    {prizes.filter((p) => !p.isLosing && p.active).map((prize) => (
                      <SelectItem key={prize.id} value={prize.id}>
                        <div className="flex items-center gap-2">
                          <div className="size-4 rounded" style={{ backgroundColor: prize.color }} />
                          <span>{prize.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Prize selection for "used" status - optional */}
            {statusEditData?.newStatus === 'used' && (
              <div className="grid gap-2">
                <Label>Lot associé (optionnel)</Label>
                <Select
                  value={statusEditData.selectedPrizeId || '__none__'}
                  onValueChange={(value) => {
                    if (statusEditData) {
                      setStatusEditData({ ...statusEditData, selectedPrizeId: value === '__none__' ? '' : value });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Aucun lot" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">Aucun lot</SelectItem>
                    {prizes.filter((p) => !p.isLosing && p.active).map((prize) => (
                      <SelectItem key={prize.id} value={prize.id}>
                        <div className="flex items-center gap-2">
                          <div className="size-4 rounded" style={{ backgroundColor: prize.color }} />
                          <span>{prize.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Warning for status changes */}
            {statusEditData && statusEditData.newStatus !== statusEditData.currentStatus && (
              <div className="rounded-lg border p-3 bg-muted/50 text-sm">
                {statusEditData.newStatus === 'unused' && (
                  <p className="text-green-600 font-medium">
                    ⚠ Le ticket sera réinitialisé et pourra être utilisé à nouveau. Le lot associé sera supprimé.
                  </p>
                )}
                {statusEditData.newStatus === 'losing' && (
                  <p className="text-red-600 font-medium">
                    ⚠ Le ticket sera marqué comme perdant. Le lot associé sera supprimé.
                  </p>
                )}
                {statusEditData.newStatus === 'winning' && (
                  <p className="text-amber-600 font-medium">
                    ⚠ Le ticket sera marqué comme gagnant avec le lot sélectionné.
                  </p>
                )}
                {statusEditData.newStatus === 'used' && (
                  <p className="text-blue-600 font-medium">
                    ⚠ Le ticket sera marqué comme utilisé.
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => {
              setShowStatusEdit(false);
              setStatusEditData(null);
            }}>
              Annuler
            </Button>
            <Button
              onClick={handleStatusUpdate}
              disabled={
                statusEditData?.newStatus === 'winning' && !statusEditData?.selectedPrizeId
              }
            >
              Confirmer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
