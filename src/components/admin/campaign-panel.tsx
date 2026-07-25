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
import { campaignsApi } from '@/lib/api';
import { useAppStore } from '@/stores/app-store';
import { Campaign } from '@/types';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Star, Loader2 } from 'lucide-react';

export function CampaignPanel() {
  const { currentCampaignId, setCurrentCampaignId, setCampaign } = useAppStore();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showDelete, setShowDelete] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    active: true,
  });

  const [editData, setEditData] = useState({
    name: '',
    description: '',
    startDate: '',
    endDate: '',
    active: true,
  });

  async function loadCampaigns() {
    try {
      setLoading(true);
      const data = await campaignsApi.list();
      setCampaigns(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Erreur lors du chargement des campagnes');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCampaigns();
  }, []);

  async function handleCreate() {
    if (!formData.name.trim()) {
      toast.error('Le nom est requis');
      return;
    }
    if (!formData.startDate) {
      toast.error('La date de début est requise');
      return;
    }
    try {
      const data = await campaignsApi.create({
        name: formData.name,
        description: formData.description,
        startDate: formData.startDate,
        endDate: formData.endDate || undefined,
        active: formData.active,
      });
      toast.success('Campagne créée avec succès');
      setShowCreate(false);
      setFormData({ name: '', description: '', startDate: '', endDate: '', active: true });
      await loadCampaigns();
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
      const data = await campaignsApi.update(id, {
        name: editData.name,
        description: editData.description,
        startDate: editData.startDate,
        endDate: editData.endDate || undefined,
        active: editData.active,
      });
      toast.success('Campagne mise à jour');
      setEditingId(null);
      await loadCampaigns();
      if (id === currentCampaignId) {
        setCampaign(data);
      }
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  }

  async function handleDelete(id: string) {
    try {
      await campaignsApi.delete(id);
      toast.success('Campagne supprimée');
      setShowDelete(null);
      if (id === currentCampaignId) {
        setCurrentCampaignId(null);
        setCampaign(null);
      }
      await loadCampaigns();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  }

  async function handleSelectCampaign(id: string) {
    try {
      const data = await campaignsApi.get(id);
      setCurrentCampaignId(id);
      setCampaign(data);
      toast.success('Campagne sélectionnée');
    } catch (error) {
      toast.error('Erreur lors de la sélection');
    }
  }

  function startEdit(campaign: Campaign) {
    setEditingId(campaign.id);
    setEditData({
      name: campaign.name,
      description: campaign.description || '',
      startDate: campaign.startDate ? campaign.startDate.split('T')[0] : '',
      endDate: campaign.endDate ? campaign.endDate.split('T')[0] : '',
      active: campaign.active,
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Gestion des Campagnes</CardTitle>
        <Button onClick={() => setShowCreate(true)} size="sm" className="gap-1.5">
          <Plus className="size-4" />
          Nouvelle Campagne
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Aucune campagne trouvée. Créez votre première campagne.
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Début</TableHead>
                  <TableHead>Fin</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {campaigns.map((campaign) => (
                  <TableRow key={campaign.id}>
                    {editingId === campaign.id ? (
                      <>
                        <TableCell>
                          <Input
                            value={editData.name}
                            onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editData.description}
                            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={editData.startDate}
                            onChange={(e) => setEditData({ ...editData, startDate: e.target.value })}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={editData.endDate}
                            onChange={(e) => setEditData({ ...editData, endDate: e.target.value })}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={editData.active}
                            onCheckedChange={(checked) => setEditData({ ...editData, active: checked })}
                          />
                        </TableCell>
                        <TableCell />
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="default" onClick={() => handleUpdate(campaign.id)} className="h-7">
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
                        <TableCell className="font-medium">{campaign.name}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{campaign.description || '-'}</TableCell>
                        <TableCell>{campaign.startDate ? new Date(campaign.startDate).toLocaleDateString('fr-FR') : '-'}</TableCell>
                        <TableCell>{campaign.endDate ? new Date(campaign.endDate).toLocaleDateString('fr-FR') : '-'}</TableCell>
                        <TableCell>
                          <Badge variant={campaign.active ? 'default' : 'secondary'}>
                            {campaign.active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {currentCampaignId === campaign.id && (
                            <Star className="size-4 text-amber-500 fill-amber-500" />
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleSelectCampaign(campaign.id)}
                              className="h-7 gap-1"
                            >
                              <Star className="size-3" />
                              Sélectionner
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEdit(campaign)}
                              className="h-7"
                            >
                              <Pencil className="size-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setShowDelete(campaign.id)}
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
              <DialogTitle>Nouvelle Campagne</DialogTitle>
              <DialogDescription>Créez une nouvelle campagne promotionnelle.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nom *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nom de la campagne"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Description de la campagne"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="startDate">Date de début *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="endDate">Date de fin</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
                <Label>Active</Label>
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
                Cette action est irréversible. La campagne et toutes ses données associées seront supprimées.
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
