'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
import { prizesApi } from '@/lib/api';
import { useAppStore } from '@/stores/app-store';
import { Prize } from '@/types';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown, Loader2 } from 'lucide-react';

export function PrizePanel() {
  const { currentCampaignId } = useAppStore();
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showDelete, setShowDelete] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#FF6B35',
    probability: 10,
    isLosing: false,
    sectorLabel: '',
    sortOrder: 0,
  });

  const [editData, setEditData] = useState({
    name: '',
    description: '',
    color: '#FF6B35',
    probability: 10,
    isLosing: false,
    sectorLabel: '',
    sortOrder: 0,
  });

  async function loadPrizes() {
    if (!currentCampaignId) {
      setPrizes([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await prizesApi.list(currentCampaignId);
      setPrizes((Array.isArray(data) ? data : []).sort((a: Prize, b: Prize) => a.sortOrder - b.sortOrder));
    } catch (error) {
      toast.error('Erreur lors du chargement des lots');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPrizes();
  }, [currentCampaignId]);

  async function handleCreate() {
    if (!formData.name.trim()) {
      toast.error('Le nom est requis');
      return;
    }
    if (!currentCampaignId) {
      toast.error('Sélectionnez une campagne d\'abord');
      return;
    }
    try {
      await prizesApi.create({
        name: formData.name,
        description: formData.description,
        color: formData.color,
        probability: formData.probability,
        isLosing: formData.isLosing,
        sectorLabel: formData.sectorLabel,
        sortOrder: formData.sortOrder,
        campaignId: currentCampaignId,
      });
      toast.success('Lot créé avec succès');
      setShowCreate(false);
      setFormData({ name: '', description: '', color: '#FF6B35', probability: 10, isLosing: false, sectorLabel: '', sortOrder: 0 });
      await loadPrizes();
    } catch (error) {
      toast.error('Erreur lors de la création');
    }
  }

  async function handleUpdate(id: string) {
    if (!editData.name.trim()) {
      toast.error('Le nom est requis');
      return;
    }
    try {
      await prizesApi.update(id, {
        name: editData.name,
        description: editData.description,
        color: editData.color,
        probability: editData.probability,
        isLosing: editData.isLosing,
        sectorLabel: editData.sectorLabel,
        sortOrder: editData.sortOrder,
      });
      toast.success('Lot mis à jour');
      setEditingId(null);
      await loadPrizes();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  }

  async function handleDelete(id: string) {
    try {
      await prizesApi.delete(id);
      toast.success('Lot supprimé');
      setShowDelete(null);
      await loadPrizes();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  }

  async function handleMoveUp(prize: Prize) {
    const currentIdx = prizes.findIndex((p) => p.id === prize.id);
    if (currentIdx <= 0) return;
    try {
      await prizesApi.update(prize.id, { sortOrder: prize.sortOrder - 1 });
      await loadPrizes();
    } catch (error) {
      toast.error('Erreur lors du déplacement');
    }
  }

  async function handleMoveDown(prize: Prize) {
    const currentIdx = prizes.findIndex((p) => p.id === prize.id);
    if (currentIdx >= prizes.length - 1) return;
    try {
      await prizesApi.update(prize.id, { sortOrder: prize.sortOrder + 1 });
      await loadPrizes();
    } catch (error) {
      toast.error('Erreur lors du déplacement');
    }
  }

  function startEdit(prize: Prize) {
    setEditingId(prize.id);
    setEditData({
      name: prize.name,
      description: prize.description || '',
      color: prize.color,
      probability: prize.probability,
      isLosing: prize.isLosing,
      sectorLabel: prize.sectorLabel || '',
      sortOrder: prize.sortOrder,
    });
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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Gestion des Lots</CardTitle>
        <Button onClick={() => setShowCreate(true)} size="sm" className="gap-1.5">
          <Plus className="size-4" />
          Nouveau Lot
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : prizes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Aucun lot trouvé. Créez votre premier lot.
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ordre</TableHead>
                  <TableHead>Couleur</TableHead>
                  <TableHead>Nom</TableHead>
                  <TableHead>Probabilité</TableHead>
                  <TableHead>Perdant</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prizes.map((prize) => (
                  <TableRow key={prize.id}>
                    {editingId === prize.id ? (
                      <>
                        <TableCell>{prize.sortOrder}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Input
                              type="color"
                              value={editData.color}
                              onChange={(e) => setEditData({ ...editData, color: e.target.value })}
                              className="h-8 w-12 p-1 cursor-pointer"
                            />
                            <span className="text-xs text-muted-foreground">{editData.color}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editData.name}
                            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            max={100}
                            value={editData.probability}
                            onChange={(e) => setEditData({ ...editData, probability: Number(e.target.value) })}
                            className="h-8 w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={editData.isLosing}
                            onCheckedChange={(checked) => setEditData({ ...editData, isLosing: checked })}
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editData.sectorLabel}
                            onChange={(e) => setEditData({ ...editData, sectorLabel: e.target.value })}
                            className="h-8 w-24"
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="default" onClick={() => handleUpdate(prize.id)} className="h-7">
                              Sauver
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-7">
                              Annuler
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell>
                          <div className="flex gap-0.5">
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => handleMoveUp(prize)}>
                              <ArrowUp className="size-3" />
                            </Button>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={() => handleMoveDown(prize)}>
                              <ArrowDown className="size-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div
                              className="size-6 rounded border"
                              style={{ backgroundColor: prize.color }}
                            />
                            <span className="text-xs text-muted-foreground">{prize.color}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{prize.name}</TableCell>
                        <TableCell>{prize.probability}%</TableCell>
                        <TableCell>
                          <Badge variant={prize.isLosing ? 'destructive' : 'default'}>
                            {prize.isLosing ? 'Perdant' : 'Gagnant'}
                          </Badge>
                        </TableCell>
                        <TableCell>{prize.sectorLabel || '-'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="ghost" onClick={() => startEdit(prize)} className="h-7">
                              <Pencil className="size-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setShowDelete(prize.id)}
                              className="h-7 text-destructive"
                            >
                              <Trash2 className="size-3" />
                            </Button>
                          </div>
                        </TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Create Dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nouveau Lot</DialogTitle>
              <DialogDescription>Ajoutez un nouveau lot à la campagne.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="prize-name">Nom *</Label>
                <Input
                  id="prize-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nom du lot"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="prize-description">Description</Label>
                <Input
                  id="prize-description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description du lot"
                />
              </div>
              <div className="grid gap-2">
                <Label>Couleur</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="h-10 w-16 cursor-pointer"
                  />
                  <div
                    className="size-10 rounded-lg border"
                    style={{ backgroundColor: formData.color }}
                  />
                  <span className="text-sm text-muted-foreground">{formData.color}</span>
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="prize-probability">Probabilité (%)</Label>
                <Input
                  id="prize-probability"
                  type="number"
                  min={0}
                  max={100}
                  value={formData.probability}
                  onChange={(e) => setFormData({ ...formData, probability: Number(e.target.value) })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="prize-sector-label">Label du secteur</Label>
                <Input
                  id="prize-sector-label"
                  value={formData.sectorLabel}
                  onChange={(e) => setFormData({ ...formData, sectorLabel: e.target.value })}
                  placeholder="Texte affiché sur la roue"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="prize-sort-order">Ordre de tri</Label>
                <Input
                  id="prize-sort-order"
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.isLosing}
                  onCheckedChange={(checked) => setFormData({ ...formData, isLosing: checked })}
                />
                <Label>Lot perdant</Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowCreate(false)}>
                Annuler
              </Button>
              <Button onClick={handleCreate}>Créer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDelete !== null} onOpenChange={() => setShowDelete(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmer la suppression</DialogTitle>
              <DialogDescription>
                Ce lot sera définitivement supprimé de la campagne.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowDelete(null)}>
                Annuler
              </Button>
              <Button variant="destructive" onClick={() => showDelete && handleDelete(showDelete)}>
                Supprimer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
