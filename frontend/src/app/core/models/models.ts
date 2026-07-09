export type TaskStatus = 'PROCESSING' | 'COMPLETED' | 'BLOCKED';
export type WorkflowStage = 'DEVELOPMENT' | 'QA' | 'REVIEW' | 'PRODUCTION';
export type Priority = 'Low' | 'Medium' | 'High' | 'Critical';
export type ParsingStatus = 'Pending' | 'Processing' | 'Completed' | 'Failed';
export type StandupSource = 'Manual' | 'Slack' | 'API';

export interface Member {
  _id: string;
  name: string;
  email: string;
  slackUserId?: string;
  role: string;
  skills?: string[];
  teamId?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface MemberStats {
  memberId: string;
  current: number;
  blocked: number;
  doneToday: number;
  workloadPercent: number;
}

export interface Team {
  _id: string;
  name: string;
  slackChannelId?: string;
  slackChannelName?: string;
  isSlackConnected?: boolean;
}

export interface Task {
  _id: string;
  memberId: Member | string;
  standupId?: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  workflowStage: WorkflowStage;
  priority: Priority;
  deadline?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  _id: string;
  taskId: string;
  actorType?: 'USER' | 'AI_AGENT' | 'SYSTEM';
  actorId?: string;
  activityType?: 'STATUS_CHANGE' | 'COMMENT' | 'NOTIFICATION' | 'FOLLOWUP';
  previousStatus?: string;
  currentStatus?: string;
  oldValue?: unknown;
  newValue?: { title?: string; priority?: string; workflowStage?: string } | unknown;
  message?: string;
  createdAt: string;
}

export interface Standup {
  _id: string;
  submittedBy?: Member | string | null;
  source?: StandupSource;
  parsingStatus: ParsingStatus;
  message?: string;
  parsed?: boolean;
  createdAt: string;
}

export interface DashboardSummary {
  totalTasks: number;
  inProgress: number;
  completed: number;
  blocked: number;
  dueToday: number;
  taskGrowth: number;
  completedTodayDelta: number;
}

export interface ThroughputPoint {
  day: string;
  completed: number;
  capacity: number;
}
