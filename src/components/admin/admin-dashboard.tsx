'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { CampaignPanel } from './campaign-panel';
import { PrizePanel } from './prize-panel';
import { CodePanel } from './code-panel';
import { ParticipationPanel } from './participation-panel';
import { ContactPanel } from './contact-panel';
import { PromotionPanel } from './promotion-panel';
import { WheelConfigPanel } from './wheel-config-panel';
import { StatsPanel } from './stats-panel';
import { ExportPanel } from './export-panel';
import { AdminLogPanel } from './admin-log-panel';
import {
  Megaphone,
  Gift,
  QrCode,
  Users,
  Phone,
  Tv,
  Settings2,
  BarChart3,
  Download,
  ScrollText,
} from 'lucide-react';

export function AdminDashboard() {
  return (
    <div className="container mx-auto px-4 py-6">
      <Tabs defaultValue="campaigns" className="w-full">
        <TabsList className="flex w-full flex-wrap h-auto gap-1">
          <TabsTrigger value="campaigns" className="gap-1.5">
            <Megaphone className="size-4" />
            <span className="hidden sm:inline">Campagnes</span>
          </TabsTrigger>
          <TabsTrigger value="prizes" className="gap-1.5">
            <Gift className="size-4" />
            <span className="hidden sm:inline">Lots</span>
          </TabsTrigger>
          <TabsTrigger value="codes" className="gap-1.5">
            <QrCode className="size-4" />
            <span className="hidden sm:inline">Codes</span>
          </TabsTrigger>
          <TabsTrigger value="participations" className="gap-1.5">
            <Users className="size-4" />
            <span className="hidden sm:inline">Participations</span>
          </TabsTrigger>
          <TabsTrigger value="contacts" className="gap-1.5">
            <Phone className="size-4" />
            <span className="hidden sm:inline">Contacts</span>
          </TabsTrigger>
          <TabsTrigger value="promotions" className="gap-1.5">
            <Tv className="size-4" />
            <span className="hidden sm:inline">Promotions</span>
          </TabsTrigger>
          <TabsTrigger value="wheel-config" className="gap-1.5">
            <Settings2 className="size-4" />
            <span className="hidden sm:inline">Config Roue</span>
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-1.5">
            <BarChart3 className="size-4" />
            <span className="hidden sm:inline">Statistiques</span>
          </TabsTrigger>
          <TabsTrigger value="export" className="gap-1.5">
            <Download className="size-4" />
            <span className="hidden sm:inline">Export</span>
          </TabsTrigger>
          <TabsTrigger value="logs" className="gap-1.5">
            <ScrollText className="size-4" />
            <span className="hidden sm:inline">Logs</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns">
          <CampaignPanel />
        </TabsContent>
        <TabsContent value="prizes">
          <PrizePanel />
        </TabsContent>
        <TabsContent value="codes">
          <CodePanel />
        </TabsContent>
        <TabsContent value="participations">
          <ParticipationPanel />
        </TabsContent>
        <TabsContent value="contacts">
          <ContactPanel />
        </TabsContent>
        <TabsContent value="promotions">
          <PromotionPanel />
        </TabsContent>
        <TabsContent value="wheel-config">
          <WheelConfigPanel />
        </TabsContent>
        <TabsContent value="stats">
          <StatsPanel />
        </TabsContent>
        <TabsContent value="export">
          <ExportPanel />
        </TabsContent>
        <TabsContent value="logs">
          <AdminLogPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}
