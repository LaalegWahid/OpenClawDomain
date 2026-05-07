export interface UserSkill {
  id: string;
  name: string;
  description: string;
}

export interface AgentRecord {
  id: string;
  name: string;
  botUsername: string | null;
  status: string;
  type?: string;
  profileImage?: string | null;
  trialDaysLeft?: number | null;
  trialKind?: "free_trial" | "developer" | "free_referral" | null;
}
