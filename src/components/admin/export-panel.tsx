'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { exportApi } from '@/lib/api';
import { useAppStore } from '@/stores/app-store';
import { toast } from 'sonner';
import { Download, FileText, FileJson } from 'lucide-react';

export function ExportPanel() {
  const { currentCampaignId } = useAppStore();
  const [dataType, setDataType] = useState<'codes' | 'participations' | 'contacts'>('codes');
  const [format, setFormat] = useState<'csv' | 'json'>('csv');

  function handleExport() {
    if (!currentCampaignId) {
      toast.error('Sélectionnez une campagne d\'abord');
      return;
    }
    exportApi.download(currentCampaignId, dataType, format);
    toast.success(`Export ${dataType} en format ${format} lancé`);
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
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="size-5" />
          Export de Données
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-6 py-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Type de données</Label>
              <Select value={dataType} onValueChange={(v) => setDataType(v as 'codes' | 'participations' | 'contacts')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="codes">Codes</SelectItem>
                  <SelectItem value="participations">Participations</SelectItem>
                  <SelectItem value="contacts">Contacts WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Format</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as 'csv' | 'json')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Export Buttons */}
          <div className="grid md:grid-cols-3 gap-3">
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => {
                setDataType('codes');
                setFormat('csv');
                if (currentCampaignId) {
                  exportApi.download(currentCampaignId, 'codes', 'csv');
                  toast.success('Export codes CSV lancé');
                }
              }}
            >
              <FileText className="size-6 text-green-600" />
              <span className="font-medium">Codes CSV</span>
              <span className="text-xs text-muted-foreground">Tableur compatible</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => {
                setDataType('participations');
                setFormat('csv');
                if (currentCampaignId) {
                  exportApi.download(currentCampaignId, 'participations', 'csv');
                  toast.success('Export participations CSV lancé');
                }
              }}
            >
              <FileText className="size-6 text-blue-600" />
              <span className="font-medium">Participations CSV</span>
              <span className="text-xs text-muted-foreground">Données de participation</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => {
                setDataType('contacts');
                setFormat('csv');
                if (currentCampaignId) {
                  exportApi.download(currentCampaignId, 'contacts', 'csv');
                  toast.success('Export contacts CSV lancé');
                }
              }}
            >
              <FileText className="size-6 text-amber-600" />
              <span className="font-medium">Contacts CSV</span>
              <span className="text-xs text-muted-foreground">Contacts WhatsApp</span>
            </Button>
          </div>

          {/* Quick JSON exports */}
          <div className="grid md:grid-cols-3 gap-3">
            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => {
                setDataType('codes');
                setFormat('json');
                if (currentCampaignId) {
                  exportApi.download(currentCampaignId, 'codes', 'json');
                  toast.success('Export codes JSON lancé');
                }
              }}
            >
              <FileJson className="size-6 text-green-600" />
              <span className="font-medium">Codes JSON</span>
              <span className="text-xs text-muted-foreground">Format structuré</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => {
                setDataType('participations');
                setFormat('json');
                if (currentCampaignId) {
                  exportApi.download(currentCampaignId, 'participations', 'json');
                  toast.success('Export participations JSON lancé');
                }
              }}
            >
              <FileJson className="size-6 text-blue-600" />
              <span className="font-medium">Participations JSON</span>
              <span className="text-xs text-muted-foreground">Format structuré</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto py-4 flex flex-col items-center gap-2"
              onClick={() => {
                setDataType('contacts');
                setFormat('json');
                if (currentCampaignId) {
                  exportApi.download(currentCampaignId, 'contacts', 'json');
                  toast.success('Export contacts JSON lancé');
                }
              }}
            >
              <FileJson className="size-6 text-amber-600" />
              <span className="font-medium">Contacts JSON</span>
              <span className="text-xs text-muted-foreground">Format structuré</span>
            </Button>
          </div>

          {/* Custom Export */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold mb-3">Export personnalisé</h4>
            <div className="flex items-center gap-3">
              <Select value={dataType} onValueChange={(v) => setDataType(v as 'codes' | 'participations' | 'contacts')}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="codes">Codes</SelectItem>
                  <SelectItem value="participations">Participations</SelectItem>
                  <SelectItem value="contacts">Contacts WhatsApp</SelectItem>
                </SelectContent>
              </Select>
              <Select value={format} onValueChange={(v) => setFormat(v as 'csv' | 'json')}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={handleExport} className="gap-1.5">
                <Download className="size-4" />
                Exporter
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
