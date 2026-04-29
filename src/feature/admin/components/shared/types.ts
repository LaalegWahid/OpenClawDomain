export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string | null;
  banned: boolean | null;
  createdAt: string;
  agentCount: number;
  developerAccess: boolean;
}

export interface AgentRow {
  id: string;
  name: string;
  botUsername: string;
  status: string;
  type: string;
  isPrimary: boolean;
  containerId: string | null;
  apiProvider: string | null;
  agentModel: string | null;
  openclawAgentId: string | null;
  createdAt: string;
  updatedAt: string;
  ownerId: string | null;
  ownerEmail: string | null;
  ownerName: string | null;
}

export interface SeriesPoint {
  day: string;
  count: number;
}

export interface FeedbackRow {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  agentId: string | null;
  agentName: string | null;
  userEmail: string | null;
  userName: string | null;
}

export interface RecentVisit {
  timestamp: string;
  url: string;
  pageId: string;
  referrer: string | null;
  sessionId: string;
  deviceType: string | null;
  browserName: string | null;
  country: string | null;
  subdivision: string | null;
  city: string | null;
}

export interface VisitStats {
  totalVisits: number;
  uniqueSessions: number;
  dailyVisits: SeriesPoint[];
  recent: RecentVisit[];
  error: string | null;
}

export interface AgentInfo {
  id: string;
  name: string;
  botUsername: string;
  type: string;
  status: string;
  containerId: string | null;
  createdAt: string;
  ownerEmail: string | null;
  ownerName: string | null;
}

export interface LogLine {
  timestamp: string;
  message: string;
}

export interface InitialLogs {
  lines: LogLine[];
  logGroup: string;
  logStream: string;
  error: string | null;
  nextForwardToken: string | null;
}
