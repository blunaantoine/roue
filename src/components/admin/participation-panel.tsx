'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { participationsApi } from '@/lib/api';
import { useAppStore } from '@/stores/app-store';
import { Participation } from '@/types';
import { toast } from 'sonner';
import { Loader2, Calendar } from 'lucide-react';

export function ParticipationPanel() {
  const { currentCampaignId } = useAppStore();
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  async function loadParticipations() {
    if (!currentCampaignId) {
      setParticipations([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await participationsApi.list(currentCampaignId);
      let result = Array.isArray(data) ? data : [];

      // Apply date filters
      if (startDate) {
        result = result.filter((p: Participation) => new Date(p.createdAt) >= new Date(startDate));
      }
      if (endDate) {
        result = result.filter((p: Participation) => new Date(p.createdAt) <= new Date(endDate + 'T23:59:59'));
      }

      setParticipations(result);
    } catch (error) {
      toast.error('Erreur lors du chargement des participations');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadParticipations();
  }, [currentCampaignId]);

  function applyDateFilter() {
    loadParticipations();
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
        <CardTitle>Participations</CardTitle>
        <div className="flex items-center gap-2">
          <Calendar className="size-4 text-muted-foreground" />
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <Label htmlFor="start-date" className="text-xs">Du</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-8 w-[130px]"
              />
            </div>
            <div className="flex items-center gap-1">
              <Label htmlFor="end-date" className="text-xs">Au</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-8 w-[130px]"
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : participations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Aucune participation trouvée.
          </div>
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Participant</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Lot</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {participations.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">
                      {p.participantName || 'Anonyme'}
                    </TableCell>
                    <TableCell>{p.participantPhone || '-'}</TableCell>
                    <TableCell>
                      <span className="font-mono">{p.codeValue}</span>
                    </TableCell>
                    <TableCell>
                      {p.prize ? (
                        <div className="flex items-center gap-1.5">
                          <div
                            className="size-3 rounded"
                            style={{ backgroundColor: p.prize.color }}
                          />
                          <span>{p.prize.name}</span>
                          {p.prize.isLosing && (
                            <Badge variant="destructive" className="text-xs">Perdant</Badge>
                          )}
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell>
                      {new Date(p.createdAt).toLocaleDateString('fr-FR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
