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

// Status colors & labels (usage: unused / used)
const statusColors: Record<string, string> = {
  unused: 'secondary',
  used: 'default',
};

const statusLabels: Record<string, string> = {
  unused: 'Non utilisé',
  used: 'Utilisé',
};

// Result colors & labels (outcome: winning / losing / null)
const resultColors: Record<string, string> = {
  winning: 'default',
  losing: 'destructive',
};

const resultLabels: Record<string, string> = {
  winning: 'Gagnant',
  losing: 'Perdant',
};

interface EditState {
  codeId: string;
  codeValue: string;
  currentStatus: string;
  currentResult: string | null;
  newStatus: string;
  newResult: string | null;
  selectedPrizeId: string;
}

export function CodePanel() {
  const { currentCampaignId } = useAppStore();
  const [codes, setCodes] = useState<Code[]>([]);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [resultFilter, setResultFilter] = useState<string>('all');
  const [showGenerate, setShowGenerate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editData, setEditData] = useState<EditState | null>(null);

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
      const params: { status?: string; result?: string } = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (resultFilter !== 'all') params.result = resultFilter;
      const data = await codesApi.list(currentCampaignId, params);
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
  }, [currentCampaignId, statusFilter, resultFilter]);

  useEffect(() => {
    loadPrizes();
  }, [currentCampaignId]);

  async function handleGenerate() {
    if (!currentCampaignId) {
      toast.error('Sélectionnez une campagne d\'abord');
      return;
    }
    if (generateData.count < 1 || generateData.count > 1000) {
      toast.error('Le nombre de tickets doit être entre 1 et 1000');
      return;
    }
    try {
      await codesApi.generate({
        campaignId: currentCampaignId,
        count: generateData.count,
        prizeIds: generateData.prizeIds.length > 0 ? generateData.prizeIds : undefined,
      });
      toast.success(`${generateData.count} tickets générés`);
      setShowGenerate(false);
      setGenerateData({ count: 10, prizeIds: [] });
      await loadCodes();
    } catch (error) {
      toast.error('Erreur lors de la génération');
    }
  }

  function openEdit(code: Code) {
    setEditData({
      codeId: code.id,
      codeValue: code.value,
      currentStatus: code.status,
      currentResult: code.result,
      newStatus: code.status,
      newResult: code.result,
      selectedPrizeId: code.prizeId || '',
    });
    setShowEdit(true);
  }

  async function handleEditSubmit() {
    if (!editData) return;

    try {
      const updatePayload: Record<string, unknown> = {
        status: editData.newStatus,
        result: editData.newResult,
      };

      // When status is "unused", force result to null and clear prize
      if (editData.newStatus === 'unused') {
        updatePayload.result = null;
        updatePayload.prizeId = null;
      }

      // When result is "winning", prize is required
      if (editData.newResult === 'winning') {
        if (!editData.selectedPrizeId) {
          toast.error('Veuillez sélectionner un lot pour un ticket gagnant');
          return;
        }
        updatePayload.prizeId = editData.selectedPrizeId;
      }

      // When result is "losing", clear prize
      if (editData.newResult === 'losing') {
        updatePayload.prizeId = null;
      }

      // When result is null (used but no result), keep or clear prize
      if (editData.newResult === null && editData.newStatus === 'used') {
        updatePayload.prizeId = editData.selectedPrizeId || null;
      }

      await codesApi.update(editData.codeId, updatePayload);
      toast.success(`Ticket ${editData.codeValue} modifié avec succès`);
      setShowEdit(false);
      setEditData(null);
      await loadCodes();
    } catch (error) {
      toast.error('Erreur lors de la modification');
    }
  }

  // Calculate statistics
  const totalCodes = codes.length;
  const unusedCodes = codes.filter((c) => c.status === 'unused').length;
  const usedCodes = codes.filter((c) => c.status === 'used').length;
  const winningCodes = codes.filter((c) => c.result === 'winning').length;
  const losingCodes = codes.filter((c) => c.result === 'losing').length;

  // Determine display badge for result
  function getResultBadge(code: Code) {
    if (code.status === 'unused') {
      return <Badge variant="secondary" className="text-xs">En attente</Badge>;
    }
    if (code.result === 'winning') {
      return <Badge variant={resultColors.winning as 'default' | 'destructive'} className="text-xs bg-amber-100 text-amber-800 border-amber-300">{resultLabels.winning}</Badge>;
    }
    if (code.result === 'losing') {
      return <Badge variant={resultColors.losing as 'default' | 'destructive'} className="text-xs">{resultLabels.losing}</Badge>;
    }
    return <Badge variant="outline" className="text-xs">Non défini</Badge>;
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
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px] h-9">
                <SelectValue placeholder="Utilisation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="unused">Non utilisés</SelectItem>
                <SelectItem value="used">Utilisés</SelectItem>
              </SelectContent>
            </Select>
            <Select value={resultFilter} onValueChange={setResultFilter}>
              <SelectTrigger className="w-[130px] h-9">
                <SelectValue placeholder="Résultat" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
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
                    <TableHead>Utilisation</TableHead>
                    <TableHead>Résultat</TableHead>
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
                        <Badge variant={statusColors[code.status] as 'default' | 'secondary'}>
                          {statusLabels[code.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getResultBadge(code)}
                      </TableCell>
                      <TableCell>{code.prize?.name || '-'}</TableCell>
                      <TableCell>{new Date(code.createdAt).toLocaleDateString('fr-FR')}</TableCell>
                      <TableCell>{code.usedAt ? new Date(code.usedAt).toLocaleDateString('fr-FR') : '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEdit(code)}
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

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={(open) => {
        if (!open) {
          setShowEdit(false);
          setEditData(null);
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier le ticket</DialogTitle>
            <DialogDescription>
              Ticket : <span className="font-mono font-bold">{editData?.codeValue}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Current state summary */}
            <div className="flex items-center gap-3 rounded-lg border p-3 bg-muted/50">
              <span className="text-sm text-muted-foreground">Actuellement :</span>
              <Badge variant={statusColors[editData?.currentStatus || 'unused'] as 'default' | 'secondary'}>
                {statusLabels[editData?.currentStatus || 'unused']}
              </Badge>
              {editData?.currentResult && (
                <Badge
                  variant={resultColors[editData.currentResult] as 'default' | 'destructive'}
                  className={editData.currentResult === 'winning' ? 'bg-amber-100 text-amber-800 border-amber-300' : ''}
                >
                  {resultLabels[editData.currentResult]}
                </Badge>
              )}
              {!editData?.currentResult && editData?.currentStatus === 'used' && (
                <Badge variant="outline">Non défini</Badge>
              )}
              {editData?.currentStatus === 'unused' && (
                <Badge variant="secondary" className="text-xs">En attente</Badge>
              )}
            </div>

            {/* Status (utilisation) */}
            <div className="grid gap-2">
              <Label>Utilisation *</Label>
              <Select
                value={editData?.newStatus || 'unused'}
                onValueChange={(value) => {
                  if (editData) {
                    const newEdit = { ...editData, newStatus: value };
                    // If switching to "unused", clear result and prize
                    if (value === 'unused') {
                      newEdit.newResult = null;
                      newEdit.selectedPrizeId = '';
                    }
                    setEditData(newEdit);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unused">
                    <div className="flex items-center gap-2">
                      <div className="size-2.5 rounded-full bg-green-500" />
                      Non utilisé
                    </div>
                  </SelectItem>
                  <SelectItem value="used">
                    <div className="flex items-center gap-2">
                      <div className="size-2.5 rounded-full bg-blue-500" />
                      Utilisé
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Result (résultat) — only when status is "used" */}
            {editData?.newStatus === 'used' && (
              <div className="grid gap-2">
                <Label>Résultat *</Label>
                <Select
                  value={editData.newResult || '__none__'}
                  onValueChange={(value) => {
                    if (editData) {
                      const resultValue = value === '__none__' ? null : value;
                      const newEdit = { ...editData, newResult: resultValue };
                      // Clear prize when switching to losing
                      if (resultValue === 'losing') {
                        newEdit.selectedPrizeId = '';
                      }
                      setEditData(newEdit);
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">
                      <div className="flex items-center gap-2">
                        <div className="size-2.5 rounded-full bg-gray-400" />
                        Non défini
                      </div>
                    </SelectItem>
                    <SelectItem value="winning">
                      <div className="flex items-center gap-2">
                        <div className="size-2.5 rounded-full bg-amber-500" />
                        Gagnant
                      </div>
                    </SelectItem>
                    <SelectItem value="losing">
                      <div className="flex items-center gap-2">
                        <div className="size-2.5 rounded-full bg-red-500" />
                        Perdant
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Prize selection — when result is "winning" */}
            {editData?.newResult === 'winning' && (
              <div className="grid gap-2">
                <Label>Lot associé *</Label>
                <Select
                  value={editData.selectedPrizeId}
                  onValueChange={(value) => {
                    if (editData) {
                      setEditData({ ...editData, selectedPrizeId: value });
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

            {/* Warning messages for changes */}
            {editData && (editData.newStatus !== editData.currentStatus || editData.newResult !== editData.currentResult) && (
              <div className="rounded-lg border p-3 bg-muted/50 text-sm space-y-1">
                {editData.newStatus === 'unused' && (
                  <p className="text-green-600 font-medium">
                    ⚠ Le ticket sera réinitialisé : non utilisé, résultat et lot supprimés.
                  </p>
                )}
                {editData.newStatus === 'used' && editData.currentStatus === 'unused' && (
                  <p className="text-blue-600 font-medium">
                    ⚠ Le ticket sera marqué comme utilisé.
                  </p>
                )}
                {editData.newResult === 'winning' && (
                  <p className="text-amber-600 font-medium">
                    ⚠ Le résultat sera « Gagnant » avec le lot sélectionné.
                  </p>
                )}
                {editData.newResult === 'losing' && (
                  <p className="text-red-600 font-medium">
                    ⚠ Le résultat sera « Perdant ». Le lot associé sera supprimé.
                  </p>
                )}
                {editData.newResult === null && editData.currentResult !== null && editData.newStatus === 'used' && (
                  <p className="text-gray-600 font-medium">
                    ⚠ Le résultat sera effacé (ticket utilisé sans résultat défini).
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => {
              setShowEdit(false);
              setEditData(null);
            }}>
              Annuler
            </Button>
            <Button
              onClick={handleEditSubmit}
              disabled={
                editData?.newResult === 'winning' && !editData?.selectedPrizeId
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
