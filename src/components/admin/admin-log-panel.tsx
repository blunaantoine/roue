'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { adminLogsApi } from '@/lib/api';
import { useAppStore } from '@/stores/app-store';
import { AdminLog } from '@/types';
import { toast } from 'sonner';
import { Loader2, ScrollText, RefreshCw } from 'lucide-react';

export function AdminLogPanel() {
  const { currentCampaignId } = useAppStore();
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadLogs() {
    if (!currentCampaignId) {
      setLogs([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await adminLogsApi.list(currentCampaignId);
      setLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      toast.error('Erreur lors du chargement des logs');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLogs();
  }, [currentCampaignId]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!currentCampaignId) return;
    const interval = setInterval(() => {
      loadLogs();
    }, 30000);
    return () => clearInterval(interval);
  }, [currentCampaignId]);

  if (!currentCampaignId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Veuillez sélectionner une campagne d&apos;abord.
        </CardContent>
      </Card>
    );
  }

  // Badge color based on action type
  function getActionBadge(action: string) {
    if (action.includes('delete') || action.includes('supprimer')) {
      return <Badge variant="destructive">{action}</Badge>;
    }
    if (action.includes('create') || action.includes('créer') || action.includes('generate') || action.includes('générer')) {
      return <Badge className="bg-green-600">{action}</Badge>;
    }
    if (action.includes('update') || action.includes('mettre') || action.includes('modifier')) {
      return <Badge className="bg-blue-600">{action}</Badge>;
    }
    return <Badge variant="secondary">{action}</Badge>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <ScrollText className="size-5" />
          Logs Admin
        </CardTitle>
        <button
          onClick={loadLogs}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className={`size-4 ${loading ? 'animate-spin' : ''}`} />
          Rafraîchir
        </button>
      </CardHeader>
      <CardContent>
        {loading && logs.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Aucun log trouvé.
          </div>
        ) : (
          <div className="max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Action</TableHead>
                  <TableHead>Détails</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>{getActionBadge(log.action)}</TableCell>
                    <TableCell className="max-w-[300px] truncate">{log.details || '-'}</TableCell>
                    <TableCell className="font-medium">{log.adminName}</TableCell>
                    <TableCell>
                      {new Date(log.createdAt).toLocaleDateString('fr-FR', {
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
