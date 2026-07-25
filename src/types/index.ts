export type ViewMode = 'wheel' | 'admin' | 'tv';

export interface Prize {
  id: string;
  name: string;
  description?: string;
  color: string;
  icon?: string;
  probability: number;
  isLosing: boolean;
  sectorLabel?: string;
  sortOrder: number;
  active: boolean;
  campaignId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Code {
  id: string;
  value: string;
  status: 'unused' | 'used' | 'winning' | 'losing';
  prizeId?: string;
  prize?: Prize;
  campaignId: string;
  createdAt: string;
  usedAt?: string;
}

export interface Participation {
  id: string;
  participantName?: string;
  participantPhone?: string;
  codeValue: string;
  prizeId?: string;
  prize?: Prize;
  codeId: string;
  campaignId: string;
  createdAt: string;
}

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  prizes?: Prize[];
  wheelConfig?: WheelConfig;
}

export interface WheelConfig {
  id: string;
  spinDuration: number;
  minRotations: number;
  maxRotations: number;
  pointerColor: string;
  centerColor: string;
  outerRingColor: string;
  backgroundColor: string;
  textColor: string;
  fontSize: number;
  campaignId: string;
  createdAt: string;
  updatedAt: string;
}

export interface WhatsAppContact {
  id: string;
  name: string;
  phone: string;
  notes?: string;
  campaignId: string;
  createdAt: string;
}

export interface PromotionMessage {
  id: string;
  title: string;
  content: string;
  imageUrl?: string;
  active: boolean;
  campaignId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminLog {
  id: string;
  action: string;
  details?: string;
  adminName: string;
  createdAt: string;
  campaignId?: string;
}

export interface SpinResult {
  success: boolean;
  isLosing: boolean;
  prize?: Prize;
  codeValue: string;
  participantName?: string;
  participantPhone?: string;
  finalAngle?: number;
  spinDuration?: number;
  message?: string;
}

export interface CampaignStats {
  totalCodes: number;
  usedCodes: number;
  unusedCodes: number;
  winnersCount: number;
  losersCount: number;
  prizeDistribution: { prizeId: string; prizeName: string; count: number }[];
  recentParticipations: Participation[];
  participationTrend: { date: string; count: number }[];
}

export interface WinnerInfo {
  prizeName: string;
  participantName?: string;
  participantPhone?: string;
  timestamp: string;
}
