// Study Plan TypeScript Types
// These interfaces define the shape of all Learning Sheet data structures.

export interface ChecklistItem {
  label: string;
  url: string | null;
}

export type StepType = 'watch' | 'read' | 'solve' | 'build' | 'revise' | 'external';

export interface PlanStep {
  id: string;
  title: string;
  type: StepType;
  lectureIds: string[];
  materialIds: string[];
  homeworkIds: string[];
  externalTasks: ChecklistItem[];
  checklist: ChecklistItem[];
  order: number;
  estimatedMinutes: number;
}

export interface PlanModule {
  id: string;
  sourceModuleId: string | null;
  title: string;
  objective: string;
  estimatedDays: number;
  steps: PlanStep[];
}

export interface PlanMeta {
  totalSteps: number;
  totalMinutes: number;
  totalDays: number;
  lectureCount: number;
  moduleCount: number;
  generatedAt: string;
}

export interface StudyPlan {
  id?: string;            // Firestore document ID (set after save)
  diplomaId: string;
  generatedBy: 'agent' | 'admin';
  title: string;
  version: number;
  modules: PlanModule[];
  meta: PlanMeta;
  publishedAt?: any;      // Firestore Timestamp
  createdAt?: any;        // Firestore Timestamp
}

export interface StudentProgress {
  id?: string;            // `${studentId}_${planId}`
  studentId: string;
  planId: string;
  completedSteps: string[];
  completedModules: string[];
  notes: Record<string, string>; // moduleId → note text
  completionPercent: number;
  migratedFromPlanId?: string;
  updatedAt?: any;        // Firestore Timestamp
}

export interface ProgressSummary {
  avgCompletion: number;
  studentCount: number;
  topStudents: {
    studentId: string;
    completedSteps: number;
    completionPercent: number;
    lastActive: any;
  }[];
  records?: StudentProgress[];
}
