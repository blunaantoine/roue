'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { contactsApi } from '@/lib/api';
import { useAppStore } from '@/stores/app-store';
import { WhatsAppContact } from '@/types';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Search, Loader2 } from 'lucide-react';

export function ContactPanel() {
  const { currentCampaignId } = useAppStore();
  const [contacts, setContacts] = useState<WhatsAppContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showDelete, setShowDelete] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    notes: '',
  });

  const [editData, setEditData] = useState({
    name: '',
    phone: '',
    notes: '',
  });

  async function loadContacts() {
    if (!currentCampaignId) {
      setContacts([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await contactsApi.list(currentCampaignId);
      setContacts(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Erreur lors du chargement des contacts');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadContacts();
  }, [currentCampaignId]);

  const filteredContacts = contacts.filter((c) =>
    search === '' ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  async function handleCreate() {
    if (!formData.name.trim()) {
      toast.error('Le nom est requis');
      return;
    }
    if (!formData.phone.trim()) {
      toast.error('Le téléphone est requis');
      return;
    }
    if (!currentCampaignId) {
      toast.error('Sélectionnez une campagne d\'abord');
      return;
    }
    try {
      await contactsApi.create({
        name: formData.name,
        phone: formData.phone,
        notes: formData.notes,
        campaignId: currentCampaignId,
      });
      toast.success('Contact ajouté');
      setShowCreate(false);
      setFormData({ name: '', phone: '', notes: '' });
      await loadContacts();
    } catch (error) {
      toast.error('Erreur lors de la création');
    }
  }

  async function handleUpdate(id: string) {
    if (!editData.name.trim()) {
      toast.error('Le nom est requis');
      return;
    }
    if (!editData.phone.trim()) {
      toast.error('Le téléphone est requis');
      return;
    }
    try {
      await contactsApi.update(id, {
        name: editData.name,
        phone: editData.phone,
        notes: editData.notes,
      });
      toast.success('Contact mis à jour');
      setEditingId(null);
      await loadContacts();
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  }

  async function handleDelete(id: string) {
    try {
      await contactsApi.delete(id);
      toast.success('Contact supprimé');
      setShowDelete(null);
      await loadContacts();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  }

  function startEdit(contact: WhatsAppContact) {
    setEditingId(contact.id);
    setEditData({
      name: contact.name,
      phone: contact.phone,
      notes: contact.notes || '',
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
        <CardTitle>Contacts WhatsApp</CardTitle>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="size-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher..."
              className="h-9 pl-8 w-[200px]"
            />
          </div>
          <Button onClick={() => setShowCreate(true)} size="sm" className="gap-1.5">
            <Plus className="size-4" />
            Ajouter
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : filteredContacts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {search ? 'Aucun contact trouvé pour cette recherche.' : 'Aucun contact. Ajoutez votre premier contact.'}
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContacts.map((contact) => (
                  <TableRow key={contact.id}>
                    {editingId === contact.id ? (
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
                            value={editData.phone}
                            onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            value={editData.notes}
                            onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                            className="h-8"
                          />
                        </TableCell>
                        <TableCell />
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="default" onClick={() => handleUpdate(contact.id)} className="h-7">
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
                        <TableCell className="font-medium">{contact.name}</TableCell>
                        <TableCell>{contact.phone}</TableCell>
                        <TableCell className="max-w-[200px] truncate">{contact.notes || '-'}</TableCell>
                        <TableCell>{new Date(contact.createdAt).toLocaleDateString('fr-FR')}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            <Button size="sm" variant="ghost" onClick={() => startEdit(contact)} className="h-7">
                              <Pencil className="size-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setShowDelete(contact.id)}
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
              <DialogTitle>Ajouter un Contact</DialogTitle>
              <DialogDescription>Ajoutez un nouveau contact WhatsApp.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="contact-name">Nom *</Label>
                <Input
                  id="contact-name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nom du contact"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contact-phone">Téléphone *</Label>
                <Input
                  id="contact-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+212 6XX XXX XXX"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="contact-notes">Notes</Label>
                <Input
                  id="contact-notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Notes optionnelles"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setShowCreate(false)}>
                Annuler
              </Button>
              <Button onClick={handleCreate}>Ajouter</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDelete !== null} onOpenChange={() => setShowDelete(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirmer la suppression</DialogTitle>
              <DialogDescription>
                Ce contact WhatsApp sera définitivement supprimé.
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
