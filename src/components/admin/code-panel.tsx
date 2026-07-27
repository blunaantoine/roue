'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { Plus, Pencil, Loader2, QrCode, Printer, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

// Status colors & labels
const statusColors: Record<string, string> = {
  unused: 'secondary',
  used: 'default',
};

const statusLabels: Record<string, string> = {
  unused: 'Non utilisé',
  used: 'Utilisé',
};

// Result colors & labels
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

interface DeleteConfirmState {
  open: boolean;
  mode: 'single' | 'batch';
  codeId?: string;
  codeValue?: string;
  groupKey?: string;
  count: number;
}

// Group key: createdAt truncated to the second
function getGroupKey(createdAt: string): string {
  // Remove milliseconds: "2024-01-15T10:30:45.123Z" -> "2024-01-15T10:30:45Z"
  return createdAt.replace(/\.\d{3}Z$/, 'Z');
}

// Format date for display
function formatGroupDate(groupKey: string): string {
  const date = new Date(groupKey);
  return date.toLocaleString('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function CodePanel() {
  const { currentCampaignId, campaign } = useAppStore();
  const [codes, setCodes] = useState<Code[]>([]);
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [resultFilter, setResultFilter] = useState<string>('all');
  const [showGenerate, setShowGenerate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editData, setEditData] = useState<EditState | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState>({
    open: false,
    mode: 'single',
    count: 0,
  });
  const [deleting, setDeleting] = useState(false);

  const [generateData, setGenerateData] = useState({
    count: 10,
    result: 'losing' as 'winning' | 'losing',
    prizeId: '',
  });

  // Group codes by creation batch (truncated to seconds)
  const codeGroups = useMemo(() => {
    const groups: Record<string, Code[]> = {};
    for (const code of codes) {
      const key = getGroupKey(code.createdAt);
      if (!groups[key]) groups[key] = [];
      groups[key].push(code);
    }
    // Sort groups by creation date descending
    const sortedKeys = Object.keys(groups).sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
    const result: { key: string; codes: Code[] }[] = [];
    for (const key of sortedKeys) {
      result.push({ key, codes: groups[key] });
    }
    return result;
  }, [codes]);

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

  // Auto-expand new groups when codes change
  useEffect(() => {
    if (codeGroups.length > 0) {
      setExpandedGroups((prev) => {
        const newSet = new Set(prev);
        // Auto-expand the most recent group
        if (!newSet.has(codeGroups[0].key)) {
          newSet.add(codeGroups[0].key);
        }
        return newSet;
      });
    }
  }, [codeGroups.length]);

  // Auto-select first winning prize when result changes to "winning"
  useEffect(() => {
    if (generateData.result === 'winning' && !generateData.prizeId) {
      const firstWinningPrize = prizes.find(p => !p.isLosing && p.active);
      if (firstWinningPrize) {
        setGenerateData(prev => ({ ...prev, prizeId: firstWinningPrize.id }));
      }
    }
  }, [generateData.result, prizes]);

  // Print tickets function
  function printTickets(ticketCodes: Code[]) {
    const campaignName = campaign?.name || 'Campagne';
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('Veuillez autoriser les popups pour imprimer');
      return;
    }

    const ticketsHtml = ticketCodes.map((code) => `
      <div class="ticket">
        <div class="code-value">${code.value}</div>
        <div class="campaign-name">${campaignName}</div>
        <div class="creation-date">${new Date(code.createdAt).toLocaleDateString('fr-FR')}</div>
      </div>
    `).join('');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Tickets - ${campaignName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
            background: white;
          }
          .tickets-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
          }
          .ticket {
            border: 2px solid #333;
            border-radius: 8px;
            padding: 20px 16px;
            text-align: center;
            page-break-inside: avoid;
          }
          .code-value {
            font-size: 24px;
            font-weight: bold;
            font-family: 'Courier New', monospace;
            margin-bottom: 8px;
            letter-spacing: 2px;
          }
          .campaign-name {
            font-size: 14px;
            color: #555;
            margin-bottom: 4px;
          }
          .creation-date {
            font-size: 12px;
            color: #888;
          }
          @media print {
            body { padding: 0; }
            .ticket { border: 1px solid #999; }
          }
        </style>
      </head>
      <body>
        <div class="tickets-grid">
          ${ticketsHtml}
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  }

  // Delete single code
  async function handleDeleteSingle(codeId: string) {
    try {
      setDeleting(true);
      const res = await fetch(`/api/codes/${codeId}`, { method: 'DELETE' });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Erreur' }));
        throw new Error(error.error || 'Erreur lors de la suppression');
      }
      toast.success('Ticket supprimé avec succès');
      await loadCodes();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  }

  // Delete batch of codes by group
  async function handleDeleteBatch(groupKey: string) {
    if (!currentCampaignId) return;
    try {
      setDeleting(true);
      const res = await fetch('/api/codes/batch-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignId: currentCampaignId,
          createdAt: groupKey,
        }),
      });
      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: 'Erreur' }));
        throw new Error(error.error || 'Erreur lors de la suppression');
      }
      const result = await res.json();
      toast.success(`${result.deletedCount} tickets supprimés`);
      await loadCodes();
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de la suppression');
    } finally {
      setDeleting(false);
    }
  }

  // Confirm delete handler
  function confirmDelete() {
    if (deleteConfirm.mode === 'single' && deleteConfirm.codeId) {
      handleDeleteSingle(deleteConfirm.codeId);
    } else if (deleteConfirm.mode === 'batch' && deleteConfirm.groupKey) {
      handleDeleteBatch(deleteConfirm.groupKey);
    }
    setDeleteConfirm({ open: false, mode: 'single', count: 0 });
  }

  // Toggle group expanded state
  function toggleGroup(key: string) {
    setExpandedGroups((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  }

  async function handleGenerate() {
    if (!currentCampaignId) {
      toast.error('Sélectionnez une campagne d\'abord');
      return;
    }
    if (generateData.count < 1 || generateData.count > 1000) {
      toast.error('Le nombre de tickets doit être entre 1 et 1000');
      return;
    }
    if (generateData.result === 'winning' && !generateData.prizeId) {
      toast.error('Sélectionnez un lot pour les tickets gagnants');
      return;
    }
    try {
      await codesApi.generate({
        campaignId: currentCampaignId,
        count: generateData.count,
        result: generateData.result,
        prizeId: generateData.result === 'winning' ? generateData.prizeId : undefined,
      });
      toast.success(`${generateData.count} tickets ${generateData.result === 'winning' ? 'gagnants' : 'perdants'} générés`);
      setShowGenerate(false);
      setGenerateData({ count: 10, result: 'losing', prizeId: '' });
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
      // Show predetermined result for unused tickets
      if (code.result === 'winning') {
        return <Badge className="text-xs bg-amber-100 text-amber-800 border-amber-300">Gagnant</Badge>;
      }
      if (code.result === 'losing') {
        return <Badge variant="destructive" className="text-xs">Perdant</Badge>;
      }
      return <Badge variant="secondary" className="text-xs">En attente</Badge>;
    }
    if (code.result === 'winning') {
      return <Badge className="text-xs bg-amber-100 text-amber-800 border-amber-300">{resultLabels.winning}</Badge>;
    }
    if (code.result === 'losing') {
      return <Badge variant={resultColors.losing as 'default' | 'destructive'} className="text-xs">{resultLabels.losing}</Badge>;
    }
    return <Badge variant="outline" className="text-xs">Non défini</Badge>;
  }

  if (!currentCampaignId) {
    return (
      <Card className="bg-[#1a1a2e] border-[#16213e]">
        <CardContent className="py-8 text-center text-muted-foreground">
          Veuillez sélectionner une campagne d&apos;abord.
        </CardContent>
      </Card>
    );
  }

  const winningPrizes = prizes.filter(p => !p.isLosing && p.active);
  const losingPrizes = prizes.filter(p => p.isLosing && p.active);

  return (
    <div className="space-y-4">
      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4 bg-[#1a1a2e] border-[#16213e]">
          <div className="text-sm text-muted-foreground">Total</div>
          <div className="text-2xl font-bold text-white">{totalCodes}</div>
        </Card>
        <Card className="p-4 bg-[#1a1a2e] border-[#16213e]">
          <div className="text-sm text-muted-foreground">Non utilisés</div>
          <div className="text-2xl font-bold text-green-400">{unusedCodes}</div>
        </Card>
        <Card className="p-4 bg-[#1a1a2e] border-[#16213e]">
          <div className="text-sm text-muted-foreground">Utilisés</div>
          <div className="text-2xl font-bold text-white">{usedCodes}</div>
        </Card>
        <Card className="p-4 bg-[#1a1a2e] border-[#16213e]">
          <div className="text-sm text-muted-foreground">Gagnants</div>
          <div className="text-2xl font-bold text-amber-400">{winningCodes}</div>
        </Card>
        <Card className="p-4 bg-[#1a1a2e] border-[#16213e]">
          <div className="text-sm text-muted-foreground">Perdants</div>
          <div className="text-2xl font-bold text-red-400">{losingCodes}</div>
        </Card>
      </div>

      {/* Main Card */}
      <Card className="bg-[#1a1a2e] border-[#16213e]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-white">Gestion des Tickets</CardTitle>
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px] h-9 bg-[#16213e] border-[#0f3460] text-white">
                <SelectValue placeholder="Utilisation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="unused">Non utilisés</SelectItem>
                <SelectItem value="used">Utilisés</SelectItem>
              </SelectContent>
            </Select>
            <Select value={resultFilter} onValueChange={setResultFilter}>
              <SelectTrigger className="w-[130px] h-9 bg-[#16213e] border-[#0f3460] text-white">
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
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {codeGroups.map((group) => {
                const isExpanded = expandedGroups.has(group.key);
                const unusedCount = group.codes.filter(c => c.status === 'unused').length;
                const usedCount = group.codes.filter(c => c.status === 'used').length;

                return (
                  <div key={group.key} className="rounded-lg border border-[#0f3460] bg-[#16213e] overflow-hidden">
                    {/* Group Header */}
                    <div
                      className="flex items-center justify-between p-3 cursor-pointer hover:bg-[#1a2744] transition-colors"
                      onClick={() => toggleGroup(group.key)}
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronUp className="size-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="size-4 text-muted-foreground" />
                        )}
                        <div>
                          <div className="text-sm font-medium text-white">
                            {formatGroupDate(group.key)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {group.codes.length} ticket{group.codes.length > 1 ? 's' : ''}
                            {' · '}
                            <span className="text-green-400">{unusedCount} non utilisé{unusedCount > 1 ? 's' : ''}</span>
                            {usedCount > 0 && (
                              <>
                                {' · '}
                                <span className="text-blue-400">{usedCount} utilisé{usedCount > 1 ? 's' : ''}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 gap-1 text-xs text-white hover:bg-[#0f3460]"
                          onClick={() => printTickets(group.codes)}
                        >
                          <Printer className="size-3" />
                          Imprimer tout
                        </Button>
                        {unusedCount > 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 gap-1 text-xs text-red-400 hover:bg-red-900/30 hover:text-red-300"
                            onClick={() => setDeleteConfirm({
                              open: true,
                              mode: 'batch',
                              groupKey: group.key,
                              count: unusedCount,
                            })}
                          >
                            <Trash2 className="size-3" />
                            Supprimer tout
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Group Content (expanded) */}
                    {isExpanded && (
                      <div className="border-t border-[#0f3460]">
                        <Table>
                          <TableHeader>
                            <TableRow className="border-[#0f3460] hover:bg-transparent">
                              <TableHead className="text-muted-foreground">Code</TableHead>
                              <TableHead className="text-muted-foreground">Utilisation</TableHead>
                              <TableHead className="text-muted-foreground">Résultat</TableHead>
                              <TableHead className="text-muted-foreground">Lot</TableHead>
                              <TableHead className="text-muted-foreground">Date utilisation</TableHead>
                              <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.codes.map((code) => (
                              <TableRow key={code.id} className="border-[#0f3460] hover:bg-[#1a2744]">
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <QrCode className="size-4 text-muted-foreground" />
                                    <span className="font-mono font-medium text-white">{code.value}</span>
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
                                <TableCell className="text-white">{code.prize?.name || '-'}</TableCell>
                                <TableCell className="text-white">{code.usedAt ? new Date(code.usedAt).toLocaleDateString('fr-FR') : '-'}</TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 gap-1 text-xs text-white hover:bg-[#0f3460]"
                                      onClick={() => printTickets([code])}
                                    >
                                      <Printer className="size-3" />
                                      Imprimer
                                    </Button>
                                    {code.status === 'unused' && (
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 gap-1 text-xs text-red-400 hover:bg-red-900/30 hover:text-red-300"
                                        onClick={() => setDeleteConfirm({
                                          open: true,
                                          mode: 'single',
                                          codeId: code.id,
                                          codeValue: code.value,
                                          count: 1,
                                        })}
                                      >
                                        <Trash2 className="size-3" />
                                        Supprimer
                                      </Button>
                                    )}
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => openEdit(code)}
                                      className="h-7 gap-1 text-xs text-white hover:bg-[#0f3460]"
                                    >
                                      <Pencil className="size-3" />
                                      Modifier
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirm.open} onOpenChange={(open) => {
        if (!open) setDeleteConfirm({ open: false, mode: 'single', count: 0 });
      }}>
        <DialogContent className="bg-[#1a1a2e] border-[#16213e]">
          <DialogHeader>
            <DialogTitle className="text-white">Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer {deleteConfirm.count} code{deleteConfirm.count > 1 ? 's' : ''} ?
              {deleteConfirm.mode === 'batch' && (
                <span className="block mt-1 text-muted-foreground">
                  Seuls les codes non utilisés seront supprimés.
                </span>
              )}
              {deleteConfirm.mode === 'single' && deleteConfirm.codeValue && (
                <span className="block mt-1 font-mono text-white">
                  Code : {deleteConfirm.codeValue}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => setDeleteConfirm({ open: false, mode: 'single', count: 0 })}
              className="text-white hover:bg-[#16213e]"
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
            >
              {deleting ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Suppression...
                </>
              ) : (
                'Supprimer'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate Dialog */}
      <Dialog open={showGenerate} onOpenChange={setShowGenerate}>
        <DialogContent className="bg-[#1a1a2e] border-[#16213e]">
          <DialogHeader>
            <DialogTitle className="text-white">Générer des Tickets</DialogTitle>
            <DialogDescription>
              Créez des tickets avec un résultat prédéterminé (gagnant ou perdant).
              Le résultat du ticket détermine où la roue s&apos;arrêtera.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Result type selection */}
            <div className="grid gap-2">
              <Label className="text-white">Type de ticket *</Label>
              <div className="grid grid-cols-2 gap-3">
                <Button
                  variant={generateData.result === 'winning' ? 'default' : 'outline'}
                  className={`h-auto py-3 flex flex-col items-center gap-1 ${generateData.result === 'winning' ? 'bg-amber-500 hover:bg-amber-600 text-white' : 'text-white border-[#0f3460] hover:bg-[#16213e]'}`}
                  onClick={() => setGenerateData(prev => ({ ...prev, result: 'winning', prizeId: '' }))}
                >
                  <span className="text-lg">🏆</span>
                  <span className="font-semibold">Gagnant</span>
                  <span className="text-xs">La roue s&apos;arrête sur un lot</span>
                </Button>
                <Button
                  variant={generateData.result === 'losing' ? 'default' : 'outline'}
                  className={`h-auto py-3 flex flex-col items-center gap-1 ${generateData.result === 'losing' ? 'bg-red-500 hover:bg-red-600 text-white' : 'text-white border-[#0f3460] hover:bg-[#16213e]'}`}
                  onClick={() => setGenerateData(prev => ({ ...prev, result: 'losing', prizeId: '' }))}
                >
                  <span className="text-lg">💨</span>
                  <span className="font-semibold">Perdant</span>
                  <span className="text-xs">La roue s&apos;arrête sur &quot;Perdu&quot;</span>
                </Button>
              </div>
            </div>

            {/* Number of tickets */}
            <div className="grid gap-2">
              <Label htmlFor="code-count" className="text-white">Nombre de tickets *</Label>
              <Input
                id="code-count"
                type="number"
                min={1}
                max={1000}
                value={generateData.count}
                onChange={(e) => setGenerateData(prev => ({ ...prev, count: Number(e.target.value) }))}
                className="bg-[#16213e] border-[#0f3460] text-white"
              />
            </div>

            {/* Prize selection for winning tickets */}
            {generateData.result === 'winning' && (
              <div className="grid gap-2">
                <Label className="text-white">Lot à attribuer *</Label>
                {winningPrizes.length === 0 ? (
                  <div className="rounded-lg border border-[#0f3460] p-3 bg-[#16213e] text-sm text-muted-foreground">
                    Aucun lot gagnant disponible. Créez d&apos;abord des lots gagnants dans la section &quot;Lots&quot;.
                  </div>
                ) : (
                  <Select
                    value={generateData.prizeId}
                    onValueChange={(value) => setGenerateData(prev => ({ ...prev, prizeId: value }))}
                  >
                    <SelectTrigger className="bg-[#16213e] border-[#0f3460] text-white">
                      <SelectValue placeholder="Sélectionnez un lot" />
                    </SelectTrigger>
                    <SelectContent>
                      {winningPrizes.map((prize) => (
                        <SelectItem key={prize.id} value={prize.id}>
                          <div className="flex items-center gap-2">
                            <div className="size-4 rounded" style={{ backgroundColor: prize.color }} />
                            <span>{prize.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <p className="text-xs text-muted-foreground">
                  Tous les tickets gagnants générés seront assignés à ce lot. La roue s&apos;arrêtera sur le secteur correspondant.
                </p>
              </div>
            )}

            {/* Losing tickets info */}
            {generateData.result === 'losing' && losingPrizes.length === 0 && (
              <div className="rounded-lg border border-yellow-600/50 p-3 bg-yellow-950/50 text-sm text-yellow-400">
                Aucun secteur &quot;Perdu&quot; défini. Créez un lot avec le statut &quot;Perdant&quot; dans la section &quot;Lots&quot; pour que la roue puisse s&apos;arrêter sur un secteur perdant.
              </div>
            )}

            {/* Summary */}
            <div className="rounded-lg border border-[#0f3460] p-3 bg-[#16213e] text-sm">
              <div className="flex items-center justify-between text-white">
                <span className="text-muted-foreground">Résumé :</span>
                <span className="font-medium">
                  {generateData.count} tickets {generateData.result === 'winning' ? 'gagnants' : 'perdants'}
                </span>
              </div>
              {generateData.result === 'winning' && generateData.prizeId && (
                <div className="flex items-center justify-between mt-1 text-white">
                  <span className="text-muted-foreground">Lot :</span>
                  <div className="flex items-center gap-1.5">
                    {(() => {
                      const selectedPrize = winningPrizes.find(p => p.id === generateData.prizeId);
                      return selectedPrize ? (
                        <>
                          <div className="size-3 rounded" style={{ backgroundColor: selectedPrize.color }} />
                          <span>{selectedPrize.name}</span>
                        </>
                      ) : null;
                    })()}
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowGenerate(false)} className="text-white hover:bg-[#16213e]">
              Annuler
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={generateData.result === 'winning' && !generateData.prizeId}
            >
              Générer
            </Button>
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
        <DialogContent className="bg-[#1a1a2e] border-[#16213e]">
          <DialogHeader>
            <DialogTitle className="text-white">Modifier le ticket</DialogTitle>
            <DialogDescription>
              Ticket : <span className="font-mono font-bold text-white">{editData?.codeValue}</span>
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            {/* Current state summary */}
            <div className="flex items-center gap-3 rounded-lg border border-[#0f3460] p-3 bg-[#16213e]">
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
              {editData?.currentStatus === 'unused' && !editData?.currentResult && (
                <Badge variant="secondary" className="text-xs">En attente</Badge>
              )}
            </div>

            {/* Status (utilisation) */}
            <div className="grid gap-2">
              <Label className="text-white">Utilisation *</Label>
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
                <SelectTrigger className="bg-[#16213e] border-[#0f3460] text-white">
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
                <Label className="text-white">Résultat *</Label>
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
                  <SelectTrigger className="bg-[#16213e] border-[#0f3460] text-white">
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
                <Label className="text-white">Lot associé *</Label>
                <Select
                  value={editData.selectedPrizeId}
                  onValueChange={(value) => {
                    if (editData) {
                      setEditData({ ...editData, selectedPrizeId: value });
                    }
                  }}
                >
                  <SelectTrigger className="bg-[#16213e] border-[#0f3460] text-white">
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
              <div className="rounded-lg border border-[#0f3460] p-3 bg-[#16213e] text-sm space-y-1">
                {editData.newStatus === 'unused' && (
                  <p className="text-green-400 font-medium">
                    Le ticket sera réinitialisé : non utilisé, résultat et lot supprimés.
                  </p>
                )}
                {editData.newStatus === 'used' && editData.currentStatus === 'unused' && (
                  <p className="text-blue-400 font-medium">
                    Le ticket sera marqué comme utilisé.
                  </p>
                )}
                {editData.newResult === 'winning' && (
                  <p className="text-amber-400 font-medium">
                    Le résultat sera « Gagnant » avec le lot sélectionné.
                  </p>
                )}
                {editData.newResult === 'losing' && (
                  <p className="text-red-400 font-medium">
                    Le résultat sera « Perdant ». Le lot associé sera supprimé.
                  </p>
                )}
                {editData.newResult === null && editData.currentResult !== null && editData.newStatus === 'used' && (
                  <p className="text-gray-400 font-medium">
                    Le résultat sera effacé (ticket utilisé sans résultat défini).
                  </p>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => {
              setShowEdit(false);
              setEditData(null);
            }} className="text-white hover:bg-[#16213e]">
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
