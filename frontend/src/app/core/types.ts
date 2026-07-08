/**
 * types.ts
 * -----------------------------------------------------------------------
 * Single source of truth for all data shapes used across the app.
 * Every interface/enum here maps directly to a MongoDB collection defined
 * in the "AI Engineering Manager - Database Design Specification" PDF.
 *
 * NOTE ON SCHEMA GAPS (flagging honestly rather than silently inventing
 * backend fields):
 *  - The PDF's `tasks.status` enum only lists PROCESSING / COMPLETED / BLOCKED,
 *    but the UI screenshots show finer-grained states ("To Do", "In Progress",
 *    "Review"). Rather than adding fields that don't exist on the backend,
 *    the extra granularity is derived on the frontend from `status` +
 *    `workflowStage` (see `task-status.util.ts`). If you'd rather the backend
 *    own this, add a `TODO` value to `TaskStatus` and drop the derivation.
 *  - The PDF's `tasks.priority` enum is Low/Medium/High/Critical. The
 *    screenshots use "Normal/High/Urgent" labels — treated as display labels
 *    for Medium/High/Critical respectively (see `priority.util.ts`).
 * -----------------------------------------------------------------------
 */

// ---------------------------------------------------------------------------
// Enums (per collection)
// ---------------------------------------------------------------------------

export enum MemberRole {
  DEVELOPER = 'Developer',
  QA = 'QA',
  SCRUM_MASTER = 'ScrumMaster',
  CTO = 'CTO',
  ADMIN = 'Admin',
}

export enum StandupSource {
  MANUAL = 'Manual',
  SLACK = 'Slack',
  API = 'API',
}

export enum ParsingStatus {
  PENDING = 'Pending',
  PROCESSING = 'Processing',
  COMPLETED = 'Completed',
  FAILED = 'Failed',
}

export enum TaskStatus {
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  BLOCKED = 'BLOCKED',
}

export enum WorkflowStage {
  DEVELOPMENT = 'DEVELOPMENT',
  QA = 'QA',
  REVIEW = 'REVIEW',
  PRODUCTION = 'PRODUCTION',
}

export enum TaskPriority {
  LOW = 'Low',
  MEDIUM = 'Medium',
  HIGH = 'High',
  CRITICAL = 'Critical',
}

export enum ActorType {
  USER = 'USER',
  AI_AGENT = 'AI_AGENT',
  SYSTEM = 'SYSTEM',
}

export enum ActivityType {
  STATUS_CHANGE = 'STATUS_CHANGE',
  COMMENT = 'COMMENT',
  NOTIFICATION = 'NOTIFICATION',
  FOLLOWUP = 'FOLLOWUP',
}

export enum NotificationChannel {
  SLACK = 'Slack',
  EMAIL = 'Email',
  APP = 'App',
}

export enum NotificationSenderType {
  AI = 'AI',
  SYSTEM = 'SYSTEM',
  USER = 'USER',
}

export enum NotificationStatus {
  QUEUED = 'Queued',
  SENT = 'Sent',
  DELIVERED = 'Delivered',
  READ = 'Read',
  FAILED = 'Failed',
}

export enum DependencyType {
  BLOCKS = 'Blocks',
  RELATES_TO = 'Relates To',
}

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

export interface Member {
  _id: string;
  name: string;
  email: string;
  slackUserId?: string;
  role: MemberRole;
  skills?: string[];
  teamId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;

  // ---- UI-only fields hydrated by the frontend, never sent by the API ----
  avatarUrl?: string;
}

export interface Team {
  _id: string;
  name: string;
}

export interface Standup {
  _id: string;
  submittedBy: string; // Member._id
  source?: StandupSource;
  parsingStatus: ParsingStatus;
  message?: string;
  parsed?: boolean;
  createdAt: string;
}

export interface StandupMessage {
  _id: string;
  standupId: string;
  memberId: string;
  rawMessage: string;
  parsed: boolean;
}

export interface Task {
  _id: string;
  memberId: string; // ownerId
  standupId?: string;
  title: string;
  description?: string;
  status: TaskStatus;
  workflowStage: WorkflowStage;
  priority: TaskPriority;
  deadline?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TaskUpdate {
  _id: string;
  taskId: string;
  actorType?: ActorType;
  actorId?: string; // updatedBy
  activityType?: ActivityType;
  previousStatus?: string;
  currentStatus?: string;
  oldValue?: unknown;
  newValue?: unknown;
  message?: string; // updateMessage
  createdAt: string;
  updatedAt?: string;
}

export interface AppNotification {
  _id: string;
  taskId?: string;
  recipientId: string;
  senderType: NotificationSenderType;
  channel: NotificationChannel;
  status: NotificationStatus;
  createdAt: string;
}

export interface TaskDependency {
  _id: string;
  taskId: string;
  dependsOnTaskId: string;
  dependencyType?: DependencyType;
}

// ---------------------------------------------------------------------------
// View-model / aggregate DTOs
// (things a real API would compute server-side and hand to the frontend —
//  represented here so components stay dumb and only bind to inputs)
// ---------------------------------------------------------------------------

/** Aggregate counters shown in the Dashboard stat cards. */
export interface DashboardStats {
  totalTasks: number;
  totalTasksDeltaPct?: number;
  inProgress: number;
  completed: number;
  completedDeltaAbs?: number;
  blocked: number;
  dueToday: number;
}

/** One row of the Dashboard "Team Overview" table. */
export interface TeamOverviewRow {
  member: Member;
  active: number;
  blocked: number;
  doneToday: number;
  status: 'Working' | 'Available' | 'Busy';
}

/** One row of the Team page cards, with derived workload. */
export interface TeamMemberWorkload {
  member: Member;
  current: number;
  today: number;
  blocked: number;
  workloadPct: number;
  status: 'Working' | 'Available' | 'Busy';
}

/** Parser confidence / extraction status shown on the Stand-up Summary page. */
export interface ParserStatus {
  confidenceScorePct: number;
  entityExtraction: { ok: boolean; detail: string };
  contextLinking: { ok: boolean; detail: string };
  temporalClarity: { ok: boolean; detail: string };
}

/** A potential duplicate task detected by the AI pipeline. */
export interface DetectedDuplicate {
  _id: string;
  taskTitle: string;
  matchPct: number;
  matchedSourceLabel: string;
  alreadyInBacklog?: boolean;
}

/** One point on the "Sentiment Over Week" chart. */
export interface SentimentPoint {
  day: string;
  score: number;
}

/** One point on the "Weekly Throughput" chart. */
export interface ThroughputPoint {
  day: string;
  completed: number;
  capacity: number;
}

/** One bullet in the Dashboard's "Today's Stand-up Summary" card. */
export interface StandupHighlight {
  icon: 'success' | 'warning' | 'progress' | 'shield';
  label: string;
  description: string;
}
