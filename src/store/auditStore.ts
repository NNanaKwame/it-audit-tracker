import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AppState, Engagement, Control, Evidence, Finding, Milestone,
  EngagementSummary, DomainProgress, ControlDomain, EngagementStatus,
} from '../types';
import { SEED_DATA } from '../constants/seedData';

const STORAGE_KEY = 'it_audit_tracker_state';

// ─── Migration ────────────────────────────────────────────────────────────────
// Ensures state loaded from older app versions has all required fields.

function migrateState(raw: any): AppState {
  const engagements: Record<string, Engagement> = {};
  Object.values(raw.engagements ?? {}).forEach((e: any) => {
    const merged: Engagement = {
      milestoneIds: [],
      statusIsAuto: false,
      manualStatus: e.status ?? 'Kickoff',
      isISA315: false,
      ...e,
    };

    // Self-heal a known bad combination: status is "At Risk" but statusIsAuto
    // is false (so the auto-engine will never re-evaluate it) and/or
    // manualStatus is itself "At Risk" (so even a manual revert would loop
    // back to "At Risk"). Treat any "At Risk" status found on load as
    // auto-flagged so the engine takes over and can revert it properly once
    // risk conditions are re-checked.
    if (merged.status === 'At Risk') {
      merged.statusIsAuto = true;
      if (merged.manualStatus === 'At Risk' || !merged.manualStatus) {
        merged.manualStatus = 'In Progress';
      }
    }

    engagements[merged.id] = merged;
  });

  return {
    engagements,
    controls: raw.controls ?? {},
    evidence: raw.evidence ?? {},
    findings: raw.findings ?? {},
    milestones: raw.milestones ?? {},
  };
}

// ─── Persistence ──────────────────────────────────────────────────────────────

export async function loadState(): Promise<AppState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) {
      let state = migrateState(JSON.parse(raw));
      // Re-evaluate auto-status for every engagement on load. This catches
      // any engagement whose risk conditions cleared while the app was
      // closed (e.g. a finding was the only thing keeping it "At Risk" and
      // hasn't been re-checked since), and self-heals any seed/migrated
      // data that was left in an inconsistent state.
      Object.keys(state.engagements).forEach(engId => {
        state = applyAutoStatus(state, engId);
      });
      await saveState(state);
      return state;
    }
    await saveState(SEED_DATA);
    return SEED_DATA;
  } catch {
    return SEED_DATA;
  }
}

export async function saveState(state: AppState): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state', e);
  }
}

// ─── ID generation ────────────────────────────────────────────────────────────

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Auto-status engine ───────────────────────────────────────────────────────
// Determines whether an engagement should be auto-flagged "At Risk" based on:
//   - any control with status "Exception"
//   - any evidence overdue (Outstanding/Requested for > 7 days past requestedDate)
//   - any open finding with severity "High"
// If none of these apply and the engagement was auto-flagged, it reverts to
// the auditor's last manually-set status.

function isEvidenceOverdue(ev: Evidence): boolean {
  if (ev.status === 'Received' || ev.status === 'Reviewed') return false;
  if (!ev.requestedDate) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const requested = new Date(ev.requestedDate);
  requested.setHours(0, 0, 0, 0);
  const daysOverdue = Math.floor((today.getTime() - requested.getTime()) / (1000 * 60 * 60 * 24));
  return daysOverdue > 7;
}

function hasRiskConditions(state: AppState, engagementId: string): boolean {
  const eng = state.engagements[engagementId];
  if (!eng) return false;

  const hasException = eng.controlIds.some(cid => state.controls[cid]?.status === 'Exception');
  if (hasException) return true;

  const hasOverdueEvidence = eng.evidenceIds.some(eid => {
    const ev = state.evidence[eid];
    return ev ? isEvidenceOverdue(ev) : false;
  });
  if (hasOverdueEvidence) return true;

  const hasOpenHighFinding = eng.findingIds.some(fid => {
    const f = state.findings[fid];
    return f ? f.severity === 'High' && f.status !== 'Closed' : false;
  });
  if (hasOpenHighFinding) return true;

  return false;
}

/**
 * Re-evaluates auto-status for one engagement and applies the change if needed.
 * Does not touch engagements whose status is "Complete" — completed engagements
 * are left alone regardless of risk conditions.
 */
function applyAutoStatus(state: AppState, engagementId: string): AppState {
  const eng = state.engagements[engagementId];
  if (!eng) return state;
  if (eng.status === 'Complete') return state;

  const atRisk = hasRiskConditions(state, engagementId);

  if (atRisk && eng.status !== 'At Risk') {
    // Entering risk state — remember what to revert to.
    // Guard: never store 'At Risk' itself as the fallback (can happen if this
    // function runs twice in a row before state settles).
    const fallback = eng.statusIsAuto ? eng.manualStatus : eng.status;
    return {
      ...state,
      engagements: {
        ...state.engagements,
        [engagementId]: {
          ...eng,
          manualStatus: fallback === 'At Risk' ? 'In Progress' : fallback,
          status: 'At Risk',
          statusIsAuto: true,
          updatedAt: new Date().toISOString(),
        },
      },
    };
  }

  if (!atRisk && eng.statusIsAuto && eng.status === 'At Risk') {
    // Risk cleared — revert to the manual status.
    // Guard: if manualStatus somehow ended up as 'At Risk' or 'Complete'
    // (shouldn't happen, but defensive), fall back to 'In Progress'.
    const revertTo = (eng.manualStatus === 'At Risk' || eng.manualStatus === 'Complete')
      ? 'In Progress'
      : eng.manualStatus;
    return {
      ...state,
      engagements: {
        ...state.engagements,
        [engagementId]: {
          ...eng,
          status: revertTo,
          statusIsAuto: false,
          updatedAt: new Date().toISOString(),
        },
      },
    };
  }

  return state;
}

// ─── Engagement CRUD ──────────────────────────────────────────────────────────

export async function createEngagement(
  state: AppState,
  data: Omit<Engagement, 'id' | 'controlIds' | 'evidenceIds' | 'findingIds' | 'milestoneIds' | 'createdAt' | 'updatedAt' | 'statusIsAuto' | 'manualStatus'>
): Promise<AppState> {
  const id = uid('eng');
  const now = new Date().toISOString();
  const engagement: Engagement = {
    ...data,
    id,
    statusIsAuto: false,
    manualStatus: data.status,
    controlIds: [],
    evidenceIds: [],
    findingIds: [],
    milestoneIds: [],
    createdAt: now,
    updatedAt: now,
  };
  const next: AppState = { ...state, engagements: { ...state.engagements, [id]: engagement } };
  await saveState(next);
  return next;
}

export async function updateEngagement(state: AppState, id: string, patch: Partial<Engagement>): Promise<AppState> {
  const existing = state.engagements[id];
  if (!existing) return state;

  // If the auditor is manually setting a status, treat it as the new manual baseline
  const manualOverride = patch.status && !patch.statusIsAuto
    ? { manualStatus: patch.status, statusIsAuto: false }
    : {};

  const updated = { ...existing, ...patch, ...manualOverride, updatedAt: new Date().toISOString() };
  const next: AppState = { ...state, engagements: { ...state.engagements, [id]: updated } };
  await saveState(next);
  return next;
}

export async function deleteEngagement(state: AppState, id: string): Promise<AppState> {
  const eng = state.engagements[id];
  if (!eng) return state;
  const { [id]: _, ...restEngagements } = state.engagements;

  const controls = { ...state.controls };
  eng.controlIds.forEach(cid => delete controls[cid]);

  const evidence = { ...state.evidence };
  eng.evidenceIds.forEach(eid => delete evidence[eid]);

  const findings = { ...state.findings };
  eng.findingIds.forEach(fid => delete findings[fid]);

  const milestones = { ...state.milestones };
  eng.milestoneIds.forEach(mid => delete milestones[mid]);

  const next: AppState = { engagements: restEngagements, controls, evidence, findings, milestones };
  await saveState(next);
  return next;
}

// ─── Control CRUD ─────────────────────────────────────────────────────────────

export async function createControl(state: AppState, data: Omit<Control, 'id' | 'evidenceIds' | 'findingIds'>): Promise<AppState> {
  const id = uid('ctrl');
  const control: Control = { ...data, id, evidenceIds: [], findingIds: [] };
  const eng = state.engagements[data.engagementId];
  if (!eng) return state;
  const updatedEng = { ...eng, controlIds: [...eng.controlIds, id], updatedAt: new Date().toISOString() };
  let next: AppState = {
    ...state,
    controls: { ...state.controls, [id]: control },
    engagements: { ...state.engagements, [data.engagementId]: updatedEng },
  };
  next = applyAutoStatus(next, data.engagementId);
  await saveState(next);
  return next;
}

export async function updateControl(state: AppState, id: string, patch: Partial<Control>): Promise<AppState> {
  const existing = state.controls[id];
  if (!existing) return state;
  let next: AppState = { ...state, controls: { ...state.controls, [id]: { ...existing, ...patch } } };
  next = applyAutoStatus(next, existing.engagementId);
  await saveState(next);
  return next;
}

export async function deleteControl(state: AppState, id: string): Promise<AppState> {
  const ctrl = state.controls[id];
  if (!ctrl) return state;
  const { [id]: _, ...restControls } = state.controls;
  const eng = state.engagements[ctrl.engagementId];
  const updatedEng = eng
    ? { ...eng, controlIds: eng.controlIds.filter(cid => cid !== id), updatedAt: new Date().toISOString() }
    : eng;
  let next: AppState = {
    ...state,
    controls: restControls,
    engagements: updatedEng ? { ...state.engagements, [ctrl.engagementId]: updatedEng } : state.engagements,
  };
  next = applyAutoStatus(next, ctrl.engagementId);
  await saveState(next);
  return next;
}

// ─── Evidence CRUD ────────────────────────────────────────────────────────────

export async function createEvidence(state: AppState, data: Omit<Evidence, 'id'>): Promise<AppState> {
  const id = uid('evid');
  const ev: Evidence = { ...data, id };
  const eng = state.engagements[data.engagementId];
  if (!eng) return state;
  const updatedEng = { ...eng, evidenceIds: [...eng.evidenceIds, id], updatedAt: new Date().toISOString() };
  const controls = { ...state.controls };
  if (data.controlId && controls[data.controlId]) {
    controls[data.controlId] = {
      ...controls[data.controlId],
      evidenceIds: [...controls[data.controlId].evidenceIds, id],
    };
  }
  let next: AppState = {
    ...state,
    evidence: { ...state.evidence, [id]: ev },
    engagements: { ...state.engagements, [data.engagementId]: updatedEng },
    controls,
  };
  next = applyAutoStatus(next, data.engagementId);
  await saveState(next);
  return next;
}

export async function updateEvidence(state: AppState, id: string, patch: Partial<Evidence>): Promise<AppState> {
  const existing = state.evidence[id];
  if (!existing) return state;
  let next: AppState = { ...state, evidence: { ...state.evidence, [id]: { ...existing, ...patch } } };
  next = applyAutoStatus(next, existing.engagementId);
  await saveState(next);
  return next;
}

export async function deleteEvidence(state: AppState, id: string): Promise<AppState> {
  const ev = state.evidence[id];
  if (!ev) return state;
  const { [id]: _, ...restEvidence } = state.evidence;
  const eng = state.engagements[ev.engagementId];
  const updatedEng = eng
    ? { ...eng, evidenceIds: eng.evidenceIds.filter(eid => eid !== id), updatedAt: new Date().toISOString() }
    : eng;
  const controls = { ...state.controls };
  if (ev.controlId && controls[ev.controlId]) {
    controls[ev.controlId] = {
      ...controls[ev.controlId],
      evidenceIds: controls[ev.controlId].evidenceIds.filter(eid => eid !== id),
    };
  }
  let next: AppState = {
    ...state,
    evidence: restEvidence,
    controls,
    engagements: updatedEng ? { ...state.engagements, [ev.engagementId]: updatedEng } : state.engagements,
  };
  next = applyAutoStatus(next, ev.engagementId);
  await saveState(next);
  return next;
}

// ─── Finding CRUD ─────────────────────────────────────────────────────────────

export async function createFinding(state: AppState, data: Omit<Finding, 'id'>): Promise<AppState> {
  const id = uid('find');
  const finding: Finding = { ...data, id };
  const eng = state.engagements[data.engagementId];
  if (!eng) return state;
  const updatedEng = { ...eng, findingIds: [...eng.findingIds, id], updatedAt: new Date().toISOString() };
  const controls = { ...state.controls };
  if (data.controlId && controls[data.controlId]) {
    controls[data.controlId] = {
      ...controls[data.controlId],
      findingIds: [...controls[data.controlId].findingIds, id],
    };
  }
  let next: AppState = {
    ...state,
    findings: { ...state.findings, [id]: finding },
    engagements: { ...state.engagements, [data.engagementId]: updatedEng },
    controls,
  };
  next = applyAutoStatus(next, data.engagementId);
  await saveState(next);
  return next;
}

export async function updateFinding(state: AppState, id: string, patch: Partial<Finding>): Promise<AppState> {
  const existing = state.findings[id];
  if (!existing) return state;
  let next: AppState = { ...state, findings: { ...state.findings, [id]: { ...existing, ...patch } } };
  next = applyAutoStatus(next, existing.engagementId);
  await saveState(next);
  return next;
}

export async function deleteFinding(state: AppState, id: string): Promise<AppState> {
  const finding = state.findings[id];
  if (!finding) return state;
  const { [id]: _, ...restFindings } = state.findings;
  const eng = state.engagements[finding.engagementId];
  const updatedEng = eng
    ? { ...eng, findingIds: eng.findingIds.filter(fid => fid !== id), updatedAt: new Date().toISOString() }
    : eng;
  const controls = { ...state.controls };
  if (finding.controlId && controls[finding.controlId]) {
    controls[finding.controlId] = {
      ...controls[finding.controlId],
      findingIds: controls[finding.controlId].findingIds.filter(fid => fid !== id),
    };
  }
  let next: AppState = {
    ...state,
    findings: restFindings,
    controls,
    engagements: updatedEng ? { ...state.engagements, [finding.engagementId]: updatedEng } : state.engagements,
  };
  next = applyAutoStatus(next, finding.engagementId);
  await saveState(next);
  return next;
}

// ─── Milestone CRUD ───────────────────────────────────────────────────────────

const PREDEFINED_PHASES: { phase: Milestone['phase']; title: string; offsetDays: number }[] = [
  { phase: 'Planning', title: 'Planning Complete', offsetDays: 7 },
  { phase: 'Fieldwork', title: 'Fieldwork Complete', offsetDays: 30 },
  { phase: 'Reporting', title: 'Draft Report Issued', offsetDays: 45 },
  { phase: 'Sign-off', title: 'Final Sign-off', offsetDays: 60 },
];

export async function createDefaultMilestones(state: AppState, engagementId: string): Promise<AppState> {
  const eng = state.engagements[engagementId];
  if (!eng) return state;

  const startDate = new Date(eng.startDate);
  const milestones: Record<string, Milestone> = { ...state.milestones };
  const newIds: string[] = [];

  PREDEFINED_PHASES.forEach(p => {
    const due = new Date(startDate);
    due.setDate(due.getDate() + p.offsetDays);
    due.setHours(17, 0, 0, 0); // default 5 PM
    const id = uid('mile');
    milestones[id] = {
      id,
      engagementId,
      title: p.title,
      phase: p.phase,
      dueDateTime: due.toISOString(),
      completed: false,
      completedAt: null,
      notes: '',
      notifyEnabled: true,
      createdAt: new Date().toISOString(),
    };
    newIds.push(id);
  });

  const updatedEng = { ...eng, milestoneIds: [...eng.milestoneIds, ...newIds] };
  const next: AppState = {
    ...state,
    milestones,
    engagements: { ...state.engagements, [engagementId]: updatedEng },
  };
  await saveState(next);
  return next;
}

export async function createMilestone(state: AppState, data: Omit<Milestone, 'id' | 'createdAt' | 'completed' | 'completedAt'>): Promise<AppState> {
  const id = uid('mile');
  const milestone: Milestone = {
    ...data,
    id,
    completed: false,
    completedAt: null,
    createdAt: new Date().toISOString(),
  };
  const eng = state.engagements[data.engagementId];
  if (!eng) return state;
  const updatedEng = { ...eng, milestoneIds: [...eng.milestoneIds, id] };
  const next: AppState = {
    ...state,
    milestones: { ...state.milestones, [id]: milestone },
    engagements: { ...state.engagements, [data.engagementId]: updatedEng },
  };
  await saveState(next);
  return next;
}

export async function updateMilestone(state: AppState, id: string, patch: Partial<Milestone>): Promise<AppState> {
  const existing = state.milestones[id];
  if (!existing) return state;
  const updated = { ...existing, ...patch };
  if (patch.completed === true && !existing.completed) {
    updated.completedAt = new Date().toISOString();
  }
  if (patch.completed === false) {
    updated.completedAt = null;
  }
  const next: AppState = { ...state, milestones: { ...state.milestones, [id]: updated } };
  await saveState(next);
  return next;
}

export async function deleteMilestone(state: AppState, id: string): Promise<AppState> {
  const milestone = state.milestones[id];
  if (!milestone) return state;
  const { [id]: _, ...restMilestones } = state.milestones;
  const eng = state.engagements[milestone.engagementId];
  const updatedEng = eng
    ? { ...eng, milestoneIds: eng.milestoneIds.filter(mid => mid !== id) }
    : eng;
  const next: AppState = {
    ...state,
    milestones: restMilestones,
    engagements: updatedEng ? { ...state.engagements, [milestone.engagementId]: updatedEng } : state.engagements,
  };
  await saveState(next);
  return next;
}

export function getMilestoneStatus(milestone: Milestone): 'Upcoming' | 'Due Soon' | 'Overdue' | 'Completed' {
  if (milestone.completed) return 'Completed';
  const now = new Date();
  const due = new Date(milestone.dueDateTime);
  const hoursUntil = (due.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursUntil < 0) return 'Overdue';
  if (hoursUntil < 72) return 'Due Soon';
  return 'Upcoming';
}

// ─── Computed / Aggregates ────────────────────────────────────────────────────

export function getEngagementSummary(state: AppState, engagementId: string): EngagementSummary | null {
  const engagement = state.engagements[engagementId];
  if (!engagement) return null;

  const controls = engagement.controlIds.map(id => state.controls[id]).filter(Boolean);
  const evidence = engagement.evidenceIds.map(id => state.evidence[id]).filter(Boolean);

  const testedControls = controls.filter(c => c.status === 'Tested' || c.status === 'Exception').length;
  const completionPct = controls.length ? Math.round((testedControls / controls.length) * 100) : 0;

  const openFindings = engagement.findingIds
    .map(id => state.findings[id])
    .filter(f => f && f.status !== 'Closed').length;

  const evidenceReceived = evidence.filter(e => e.status === 'Received' || e.status === 'Reviewed').length;
  const evidencePct = evidence.length ? Math.round((evidenceReceived / evidence.length) * 100) : 0;

  const DOMAINS: ControlDomain[] = ['Access Management', 'Change Management', 'IT Operations', 'SDLC'];
  const domainProgress: DomainProgress[] = DOMAINS.map(domain => {
    const dc = controls.filter(c => c.domain === domain);
    const dt = dc.filter(c => c.status === 'Tested' || c.status === 'Exception').length;
    const de = dc.filter(c => c.status === 'Exception').length;
    return { domain, total: dc.length, tested: dt, exceptions: de, pct: dc.length ? Math.round((dt / dc.length) * 100) : 0 };
  });

  return { engagement, totalControls: controls.length, testedControls, completionPct, openFindings, evidenceReceived, totalEvidence: evidence.length, evidencePct, domainProgress };
}

export function getAllSummaries(state: AppState): EngagementSummary[] {
  return Object.keys(state.engagements)
    .map(id => getEngagementSummary(state, id))
    .filter(Boolean) as EngagementSummary[];
}

export function getGlobalStats(state: AppState) {
  const summaries = getAllSummaries(state);
  const totalControls = Object.keys(state.controls).length;
  const testedControls = Object.values(state.controls).filter(c => c.status === 'Tested' || c.status === 'Exception').length;
  const openFindings = Object.values(state.findings).filter(f => f.status !== 'Closed').length;
  const totalEvidence = Object.keys(state.evidence).length;
  const receivedEvidence = Object.values(state.evidence).filter(e => e.status === 'Received' || e.status === 'Reviewed').length;
  const activeEngagements = summaries.filter(s => s.engagement.status !== 'Complete').length;
  const avgCompletion = summaries.length ? Math.round(summaries.reduce((acc, s) => acc + s.completionPct, 0) / summaries.length) : 0;

  return {
    totalControls,
    testedControls,
    controlsPct: totalControls ? Math.round((testedControls / totalControls) * 100) : 0,
    openFindings,
    totalEvidence,
    receivedEvidence,
    evidencePct: totalEvidence ? Math.round((receivedEvidence / totalEvidence) * 100) : 0,
    activeEngagements,
    avgCompletion,
  };
}

// ─── Clear all data ───────────────────────────────────────────────────────────

export async function clearAllData(): Promise<AppState> {
  const empty: AppState = { engagements: {}, controls: {}, evidence: {}, findings: {}, milestones: {} };
  await saveState(empty);
  return empty;
}

// ─── Overdue evidence helpers ─────────────────────────────────────────────────

export interface OverdueEvidence {
  evidence: Evidence;
  engagementName: string;
  daysOverdue: number;
}

export function getOverdueEvidence(state: AppState): OverdueEvidence[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const results: OverdueEvidence[] = [];

  Object.values(state.evidence).forEach(ev => {
    if (!isEvidenceOverdue(ev)) return;
    const requested = new Date(ev.requestedDate!);
    requested.setHours(0, 0, 0, 0);
    const daysOverdue = Math.floor((today.getTime() - requested.getTime()) / (1000 * 60 * 60 * 24));
    const engagement = state.engagements[ev.engagementId];
    results.push({
      evidence: ev,
      engagementName: engagement?.clientName ?? 'Unknown',
      daysOverdue,
    });
  });

  return results.sort((a, b) => b.daysOverdue - a.daysOverdue);
}

// ─── Upcoming milestones (for dashboard) ─────────────────────────────────────

export interface UpcomingMilestone {
  milestone: Milestone;
  engagementName: string;
  status: ReturnType<typeof getMilestoneStatus>;
}

export function getUpcomingMilestones(state: AppState): UpcomingMilestone[] {
  const results: UpcomingMilestone[] = [];
  Object.values(state.milestones).forEach(m => {
    if (m.completed) return;
    const status = getMilestoneStatus(m);
    const engagement = state.engagements[m.engagementId];
    results.push({ milestone: m, engagementName: engagement?.clientName ?? 'Unknown', status });
  });
  return results.sort((a, b) => new Date(a.milestone.dueDateTime).getTime() - new Date(b.milestone.dueDateTime).getTime());
}