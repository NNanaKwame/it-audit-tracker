// ─── Enums ────────────────────────────────────────────────────────────────────

export type RiskLevel = 'High' | 'Medium' | 'Low';

export type ControlDomain = 'Access Management' | 'Change Management' | 'IT Operations' | 'SDLC';

export type ControlStatus = 'Not Started' | 'In Progress' | 'Tested' | 'Exception';

export type EvidenceStatus = 'Outstanding' | 'Requested' | 'Received' | 'Reviewed';

export type EngagementStatus = 'Kickoff' | 'In Progress' | 'At Risk' | 'On Track' | 'Complete';

export type FindingSeverity = 'High' | 'Medium' | 'Low' | 'Informational';

// ─── Core Models ──────────────────────────────────────────────────────────────

export interface Control {
  id: string;                   // e.g. "ACC-01"
  engagementId: string;
  domain: ControlDomain;
  name: string;
  description: string;
  status: ControlStatus;
  testingNotes: string;
  testedBy: string;
  testedDate: string | null;    // ISO date string
  evidenceIds: string[];
  findingIds: string[];
}

export interface Evidence {
  id: string;
  engagementId: string;
  controlId: string | null;
  name: string;
  description: string;
  status: EvidenceStatus;
  requestedDate: string | null;
  receivedDate: string | null;
  fileUri: string | null;       // local file path from expo-file-system
  fileName: string | null;
  uploadedBy: string;
  notes: string;
}

export interface Finding {
  id: string;
  engagementId: string;
  controlId: string | null;
  title: string;
  description: string;
  severity: FindingSeverity;
  domain: ControlDomain;
  owner: string;
  managementResponse: string;
  targetRemediationDate: string | null;
  status: 'Open' | 'In Remediation' | 'Closed';
  isaReference: string;         // ISA doc reference number
}

export interface Engagement {
  id: string;
  clientName: string;
  fiscalYear: string;           // e.g. "FY2025"
  startDate: string;            // ISO date
  endDate: string | null;
  status: EngagementStatus;
  leadAuditor: string;
  team: string[];
  controlIds: string[];
  evidenceIds: string[];
  findingIds: string[];
  notes: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Computed / View Models ───────────────────────────────────────────────────

export interface EngagementSummary {
  engagement: Engagement;
  totalControls: number;
  testedControls: number;
  completionPct: number;
  openFindings: number;
  evidenceReceived: number;
  totalEvidence: number;
  evidencePct: number;
  domainProgress: DomainProgress[];
}

export interface DomainProgress {
  domain: ControlDomain;
  total: number;
  tested: number;
  exceptions: number;
  pct: number;
}

// ─── Store Shape ──────────────────────────────────────────────────────────────

export interface AppState {
  engagements: Record<string, Engagement>;
  controls: Record<string, Control>;
  evidence: Record<string, Evidence>;
  findings: Record<string, Finding>;
}
