import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState, Engagement, Control, Evidence, Finding, EngagementSummary, DomainProgress, ControlDomain } from '../types';
import { SEED_DATA } from '../constants/seedData';

const STORAGE_KEY = 'it_audit_tracker_state';

// ─── Persistence ──────────────────────────────────────────────────────────────

export async function loadState(): Promise<AppState> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as AppState;
    // First launch — seed demo data
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

// ─── Engagement CRUD ──────────────────────────────────────────────────────────

export async function createEngagement(state: AppState, data: Omit<Engagement, 'id' | 'controlIds' | 'evidenceIds' | 'findingIds' | 'createdAt' | 'updatedAt'>): Promise<AppState> {
  const id = uid('eng');
  const now = new Date().toISOString();
  const engagement: Engagement = {
    ...data,
    id,
    controlIds: [],
    evidenceIds: [],
    findingIds: [],
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
  const updated = { ...existing, ...patch, updatedAt: new Date().toISOString() };
  const next: AppState = { ...state, engagements: { ...state.engagements, [id]: updated } };
  await saveState(next);
  return next;
}

export async function deleteEngagement(state: AppState, id: string): Promise<AppState> {
  const { [id]: _, ...restEngagements } = state.engagements;
  // Also remove linked controls, evidence, findings
  const eng = state.engagements[id];
  if (!eng) return state;

  const controls = { ...state.controls };
  eng.controlIds.forEach(cid => delete controls[cid]);

  const evidence = { ...state.evidence };
  eng.evidenceIds.forEach(eid => delete evidence[eid]);

  const findings = { ...state.findings };
  eng.findingIds.forEach(fid => delete findings[fid]);

  const next: AppState = { engagements: restEngagements, controls, evidence, findings };
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
  const next: AppState = {
    ...state,
    controls: { ...state.controls, [id]: control },
    engagements: { ...state.engagements, [data.engagementId]: updatedEng },
  };
  await saveState(next);
  return next;
}

export async function updateControl(state: AppState, id: string, patch: Partial<Control>): Promise<AppState> {
  const existing = state.controls[id];
  if (!existing) return state;
  const next: AppState = { ...state, controls: { ...state.controls, [id]: { ...existing, ...patch } } };
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
  const next: AppState = {
    ...state,
    evidence: { ...state.evidence, [id]: ev },
    engagements: { ...state.engagements, [data.engagementId]: updatedEng },
    controls,
  };
  await saveState(next);
  return next;
}

export async function updateEvidence(state: AppState, id: string, patch: Partial<Evidence>): Promise<AppState> {
  const existing = state.evidence[id];
  if (!existing) return state;
  const next: AppState = { ...state, evidence: { ...state.evidence, [id]: { ...existing, ...patch } } };
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
  const next: AppState = {
    ...state,
    findings: { ...state.findings, [id]: finding },
    engagements: { ...state.engagements, [data.engagementId]: updatedEng },
    controls,
  };
  await saveState(next);
  return next;
}

export async function updateFinding(state: AppState, id: string, patch: Partial<Finding>): Promise<AppState> {
  const existing = state.findings[id];
  if (!existing) return state;
  const next: AppState = { ...state, findings: { ...state.findings, [id]: { ...existing, ...patch } } };
  await saveState(next);
  return next;
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

// ─── Delete helpers ───────────────────────────────────────────────────────────

export async function deleteControl(state: AppState, id: string): Promise<AppState> {
  const ctrl = state.controls[id];
  if (!ctrl) return state;
  const { [id]: _, ...restControls } = state.controls;
  const eng = state.engagements[ctrl.engagementId];
  const updatedEng = eng
    ? { ...eng, controlIds: eng.controlIds.filter(cid => cid !== id), updatedAt: new Date().toISOString() }
    : eng;
  const next: AppState = {
    ...state,
    controls: restControls,
    engagements: updatedEng ? { ...state.engagements, [ctrl.engagementId]: updatedEng } : state.engagements,
  };
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
  // Also unlink from control
  const controls = { ...state.controls };
  if (ev.controlId && controls[ev.controlId]) {
    controls[ev.controlId] = {
      ...controls[ev.controlId],
      evidenceIds: controls[ev.controlId].evidenceIds.filter(eid => eid !== id),
    };
  }
  const next: AppState = {
    ...state,
    evidence: restEvidence,
    controls,
    engagements: updatedEng ? { ...state.engagements, [ev.engagementId]: updatedEng } : state.engagements,
  };
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
  // Also unlink from control
  const controls = { ...state.controls };
  if (finding.controlId && controls[finding.controlId]) {
    controls[finding.controlId] = {
      ...controls[finding.controlId],
      findingIds: controls[finding.controlId].findingIds.filter(fid => fid !== id),
    };
  }
  const next: AppState = {
    ...state,
    findings: restFindings,
    controls,
    engagements: updatedEng ? { ...state.engagements, [finding.engagementId]: updatedEng } : state.engagements,
  };
  await saveState(next);
  return next;
}

// ─── Clear all data ───────────────────────────────────────────────────────────

export async function clearAllData(): Promise<AppState> {
  const empty: AppState = { engagements: {}, controls: {}, evidence: {}, findings: {} };
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
    // Only Outstanding or Requested evidence with a requested date is considered overdue
    if (ev.status === 'Received' || ev.status === 'Reviewed') return;
    if (!ev.requestedDate) return;

    const requested = new Date(ev.requestedDate);
    requested.setHours(0, 0, 0, 0);
    const diffMs = today.getTime() - requested.getTime();
    const daysOverdue = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Flag as overdue if requested date was more than 7 days ago
    if (daysOverdue > 7) {
      const engagement = state.engagements[ev.engagementId];
      results.push({
        evidence: ev,
        engagementName: engagement?.clientName ?? 'Unknown',
        daysOverdue,
      });
    }
  });

  return results.sort((a, b) => b.daysOverdue - a.daysOverdue);
}