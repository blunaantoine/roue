'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
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
import { promotionsApi } from '@/lib/api';
import { useAppStore } from '@/stores/app-store';
import { PromotionMessage } from '@/types';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Eye, Loader2 } from 'lucide-react';

export function PromotionPanel() {
  const { currentCampaignId } = useAppStore();
  const [promotions, setPromotions] = useState<PromotionMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showDelete, setShowDelete] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState<PromotionMessage | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    imageUrl: '',
    active: true,
  });

  const [editData, setEditData] = useState({
    title: '',
    content: '',
    imageUrl: '',
    active: true,
  });

  async function loadPromotions() {
    if (!currentCampaignId) {
      setPromotions([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await promotionsApi.list(currentCampaignId);
      setPromotions(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Erreur lors du chargement des promotions');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPromotions();
  }, [currentCampaignId]);

  async function handleCreate() {
    if (!formData.title.trim()) {
      toast.error('Le titre est requis');
      return;
    }
    if (!formData.content.trim()) {
      toast.error('Le contenu est requis');
      return;
    }
    if (!currentCampaignId) {
      toast.error('Sélectionnez une campagne d\'abord');
      return;
    }
    try {
      await promotionsApi.create({
        title: formData.title,
        content: formData.content,
        imageUrl: formData.imageUrl || undefined,
        active: formData.active,
        campaignId: currentCampaignId,
      });
      toast.success('Message promotionnel créé');
      setShowCreate(false);
      setFormData({ title: '', content: '', imageUrl: '', active: true });
      await loadPromotions();
    } catch (error) {
      toast.error('Erreur lors de la création');
    }
  }

  async function handleUpdate(id: string) {
    if (!editData.title.trim()) {
      toast.error('Le titre est requis');
      return;
    }
    if (!editData.content.trim()) {
      toast.error('Le contenu est requis');
      return;
    }
    try {
      await promotionsApi.update(id, {
        title: editData.title,
        content: editData.content,
        imageUrl: editData.imageUrl || undefined,
        active: editData.active,
      });
      toast.success('Message mis à jour');
      setEditingId(null);
      await loadPromotions();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  }

  async function handleDelete(id: string) {
    try {
      await promotionsApi.delete(id);
      toast.success('Message supprimé');
      setShowDelete(null);
      await loadPromotions();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  }

  async function handleToggleActive(promotion: PromotionMessage) {
    try {
      await promotionsApi.update(promotion.id, { active: !promotion.active });
      toast.success(promotion.active ? 'Message désactivé' : 'Message activé');
      await loadPromotions();
    } catch (error) {
      toast.error('Erreur lors du changement de statut');
    }
  }

  function startEdit(promotion: PromotionMessage) {
    setEditingId(promotion.id);
    setEditData({
      title: promotion.title,
      content: promotion.content,
      imageUrl: promotion.imageUrl || '',
      active: promotion.active,
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
        <CardTitle>Messages Promotionnels</CardTitle>
        <Button onClick={() => setShowCreate(true)} size="sm" className="gap-1.5">
          <Plus className="size-4" />
          Nouveau Message
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : promotions.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Aucun message promotionnel. Créez votre premier message.
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titre</TableHead>
                  <TableHead>Contenu</TableHead>
                  <TableHead>Image</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {promotions.map((promo) => (
                  <TableRow key={promo.id}>
                    {editingId === promo.id ? (
                      <>
                        <TableCell>
                          <Input
                            value={editData.title}
                            onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Textarea
                            value={editData.content}
                            onChange={(e) => setEditData({ ...editData, content: e.target.value })}
                            className="h-8 min-h-[60px]"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editData.imageUrl}
                            onChange={(e) => setEditData({ ...editData, imageUrl: e.target.value })}
                            className="h-8"
                            placeholder="URL de l'image"
                          />
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={editData.active}
                            onCheckedChange={(checked) => setEditData({ ...editData, active: checked })}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="default" onClick={() => handleUpdate(promo.id)} className="h-7">
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
                        <TableCell className="font-medium">{promo.title}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{promo.content}</TableCell>
                        <TableCell>
                          {promo.imageUrl ? (
                            <Badge variant="outline">Oui</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={promo.active}
                            onCheckedChange={() => handleToggleActive(promo)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="ghost" onClick={() => setShowPreview(promo)} className="h-7">
                              <Eye className="size-3" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => startEdit(promo)} className="h-7">
                              <Pencil className="size-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setShowDelete(promo.id)}
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
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Nouveau Message Promotionnel</DialogTitle>
              <DialogDescription>Créez un message pour l&apos;affichage TV.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="promo-title">Titre *</Label>
                <Input
                  id="promo-title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Titre du message"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="promo-content">Contenu *</Label>
                <Textarea
                  id="promo-content"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Texte du message promotionnel"
                  rows={4}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="promo-image">URL de l&apos;image (optionnel)</Label>
                <Input
                  id="promo-image"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                />
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={formData.active}
                  onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                />
                <Label>Actif</Label>
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

        {/* Preview Dialog */}
        <Dialog open={showPreview !== null} onOpenChange={() => setShowPreview(null)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Aperçu du Message</DialogTitle>
            </DialogHeader>
            {showPreview && (
              <div className="rounded-lg border bg-gradient-to-br from-amber-50 to-red-50 p-6 text-center">
                {showPreview.imageUrl && (
                  <img
                    src={showPreview.imageUrl}
                    alt={showPreview.title}
                    className="max-h-48 mx-auto rounded-lg mb-4 object-cover"
                  />
                )}
                <h3 className="text-xl font-bold mb-2">{showPreview.title}</h3>
                <p className="text-muted-foreground">{showPreview.content}</p>
                <Badge variant={showPreview.active ? 'default' : 'secondary'} className="mt-3">
                  {showPreview.active ? 'Actif' : 'Inactif'}
                </Badge>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDelete !== null} onOpenChange={() => setShowDelete(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmer la suppression</DialogTitle>
              <DialogDescription>
                Ce message promotionnel sera définitivement supprimé.
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
