'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { statsApi } from '@/lib/api';
import { useAppStore } from '@/stores/app-store';
import { CampaignStats, Participation } from '@/types';
import { toast } from 'sonner';
import { Loader2, Trophy, Users, QrCode, Percent } from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export function StatsPanel() {
  const { currentCampaignId } = useAppStore();
  const [stats, setStats] = useState<CampaignStats | null>(null);
  const [loading, setLoading] = useState(true);

  async function loadStats() {
    if (!currentCampaignId) {
      setStats(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await statsApi.get(currentCampaignId);
      setStats(data);
    } catch (error) {
      toast.error('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadStats();
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Aucune statistique disponible.
        </CardContent>
      </Card>
    );
  }

  // Prepare pie chart data
  const pieData = stats.prizeDistribution.map((item) => ({
    name: item.prizeName,
    value: item.count,
  }));

  // Prepare trend data
  const trendData = stats.participationTrend.map((item) => ({
    date: new Date(item.date).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
    count: item.count,
  }));

  // Colors for pie chart
  const COLORS = ['#FF6B35', '#FFD700', '#4CAF50', '#E91E63', '#9C27B0', '#00BCD4', '#FF5722', '#795548', '#607D8B', '#3F51B5'];

  return (
    <div className="space-y-4">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <QrCode className="size-5 text-blue-500" />
            <div>
              <div className="text-xs text-muted-foreground">Total Codes</div>
              <div className="text-2xl font-bold">{stats.totalCodes}</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Users className="size-5 text-green-500" />
            <div>
              <div className="text-xs text-muted-foreground">Utilisés</div>
              <div className="text-2xl font-bold">{stats.usedCodes}</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Users className="size-5 text-muted-foreground" />
            <div>
              <div className="text-xs text-muted-foreground">Non utilisés</div>
              <div className="text-2xl font-bold">{stats.unusedCodes}</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Trophy className="size-5 text-amber-500" />
            <div>
              <div className="text-xs text-muted-foreground">Gagnants</div>
              <div className="text-2xl font-bold text-amber-600">{stats.winnersCount}</div>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2">
            <Percent className="size-5 text-red-500" />
            <div>
              <div className="text-xs text-muted-foreground">Perdants</div>
              <div className="text-2xl font-bold text-red-600">{stats.losersCount}</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Prize Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribution des Lots</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Aucune donnée de distribution disponible.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Participation Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Tendance des Participations</CardTitle>
          </CardHeader>
          <CardContent>
            {trendData.length === 0 ? (
              <div className="text-center text-muted-foreground py-8">
                Aucune donnée de tendance disponible.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis allowDecimals={false} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    name="Participations"
                    stroke="#FF6B35"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Recent Participations */}
      <Card>
        <CardHeader>
          <CardTitle>Participations Récentes</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentParticipations.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Aucune participation récente.
            </div>
          ) : (
            <div className="max-h-64 overflow-y-auto">
              <div className="space-y-2">
                {stats.recentParticipations.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-2 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <div className="flex flex-col">
                        <span className="font-medium">{p.participantName || 'Anonyme'}</span>
                        <span className="text-xs text-muted-foreground">{p.participantPhone || '-'}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-sm">{p.codeValue}</span>
                      {p.prize && (
                        <Badge variant={p.prize.isLosing ? 'destructive' : 'default'}>
                          {p.prize.name}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {new Date(p.createdAt).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
