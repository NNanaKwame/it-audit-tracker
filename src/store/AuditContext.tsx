import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { AppState, Engagement, Control, Evidence, Finding, Milestone } from '../types';
import * as Store from '../store/auditStore';

interface AuditContextValue {
  state: AppState;
  loading: boolean;
  // Engagement
  createEngagement: (data: Omit<Engagement, 'id' | 'controlIds' | 'evidenceIds' | 'findingIds' | 'milestoneIds' | 'createdAt' | 'updatedAt' | 'statusIsAuto' | 'manualStatus'>) => Promise<void>;
  updateEngagement: (id: string, patch: Partial<Engagement>) => Promise<void>;
  deleteEngagement: (id: string) => Promise<void>;
  // Control
  createControl: (data: Omit<Control, 'id' | 'evidenceIds' | 'findingIds'>) => Promise<void>;
  updateControl: (id: string, patch: Partial<Control>) => Promise<void>;
  deleteControl: (id: string) => Promise<void>;
  // Evidence
  createEvidence: (data: Omit<Evidence, 'id'>) => Promise<void>;
  updateEvidence: (id: string, patch: Partial<Evidence>) => Promise<void>;
  deleteEvidence: (id: string) => Promise<void>;
  // Finding
  createFinding: (data: Omit<Finding, 'id'>) => Promise<void>;
  updateFinding: (id: string, patch: Partial<Finding>) => Promise<void>;
  deleteFinding: (id: string) => Promise<void>;
  // Milestone
  createMilestone: (data: Omit<Milestone, 'id' | 'createdAt' | 'completed' | 'completedAt'>) => Promise<void>;
  updateMilestone: (id: string, patch: Partial<Milestone>) => Promise<void>;
  deleteMilestone: (id: string) => Promise<void>;
  createDefaultMilestones: (engagementId: string) => Promise<void>;
  // Data management
  clearAllData: () => Promise<void>;
  // Computed
  getSummary: (engagementId: string) => ReturnType<typeof Store.getEngagementSummary>;
  getAllSummaries: () => ReturnType<typeof Store.getAllSummaries>;
  getGlobalStats: () => ReturnType<typeof Store.getGlobalStats>;
  getOverdueEvidence: () => ReturnType<typeof Store.getOverdueEvidence>;
  getUpcomingMilestones: () => ReturnType<typeof Store.getUpcomingMilestones>;
}

const AuditContext = createContext<AuditContextValue | null>(null);

export function AuditProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>({ engagements: {}, controls: {}, evidence: {}, findings: {}, milestones: {} });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Store.loadState().then(s => { setState(s); setLoading(false); });
  }, []);

  const wrap = useCallback((fn: (s: AppState, ...args: any[]) => Promise<AppState>) => {
    return async (...args: any[]) => {
      const next = await fn(state, ...args);
      setState(next);
    };
  }, [state]);

  const value: AuditContextValue = {
    state,
    loading,
    createEngagement: wrap(Store.createEngagement) as any,
    updateEngagement: (id, patch) => wrap(Store.updateEngagement)(id, patch),
    deleteEngagement: (id) => wrap(Store.deleteEngagement)(id),
    createControl: wrap(Store.createControl) as any,
    updateControl: (id, patch) => wrap(Store.updateControl)(id, patch),
    deleteControl: (id) => wrap(Store.deleteControl)(id),
    createEvidence: wrap(Store.createEvidence) as any,
    updateEvidence: (id, patch) => wrap(Store.updateEvidence)(id, patch),
    deleteEvidence: (id) => wrap(Store.deleteEvidence)(id),
    createFinding: wrap(Store.createFinding) as any,
    updateFinding: (id, patch) => wrap(Store.updateFinding)(id, patch),
    deleteFinding: (id) => wrap(Store.deleteFinding)(id),
    createMilestone: wrap(Store.createMilestone) as any,
    updateMilestone: (id, patch) => wrap(Store.updateMilestone)(id, patch),
    deleteMilestone: (id) => wrap(Store.deleteMilestone)(id),
    createDefaultMilestones: (engagementId) => wrap(Store.createDefaultMilestones)(engagementId),
    clearAllData: async () => {
      const next = await Store.clearAllData();
      setState(next);
    },
    getSummary: (id) => Store.getEngagementSummary(state, id),
    getAllSummaries: () => Store.getAllSummaries(state),
    getGlobalStats: () => Store.getGlobalStats(state),
    getOverdueEvidence: () => Store.getOverdueEvidence(state),
    getUpcomingMilestones: () => Store.getUpcomingMilestones(state),
  };

  return <AuditContext.Provider value={value}>{children}</AuditContext.Provider>;
}

export function useAudit() {
  const ctx = useContext(AuditContext);
  if (!ctx) throw new Error('useAudit must be used within AuditProvider');
  return ctx;
}