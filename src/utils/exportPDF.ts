import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { AppState, EngagementSummary } from '../types';

function severityColor(s: string) {
  if (s === 'High') return '#A32D2D';
  if (s === 'Medium') return '#854F0B';
  if (s === 'Low') return '#185FA5';
  return '#6B6B67';
}

function statusColor(s: string) {
  if (s === 'Open') return '#A32D2D';
  if (s === 'In Remediation') return '#854F0B';
  if (s === 'Closed') return '#0F6E56';
  return '#6B6B67';
}

function pctColor(p: number) {
  if (p >= 80) return '#0F6E56';
  if (p >= 50) return '#854F0B';
  return '#A32D2D';
}

export async function exportEngagementPDF(
  summary: EngagementSummary,
  state: AppState
): Promise<void> {
  const { engagement } = summary;
  const controls = engagement.controlIds.map(id => state.controls[id]).filter(Boolean);
  const evidence = engagement.evidenceIds.map(id => state.evidence[id]).filter(Boolean);
  const findings = engagement.findingIds.map(id => state.findings[id]).filter(Boolean);
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  // Domain rows
  const domainRows = summary.domainProgress
    .filter(d => d.total > 0)
    .map(d => `
      <tr>
        <td>${d.domain}</td>
        <td>${d.tested} / ${d.total}</td>
        <td style="color:${pctColor(d.pct)};font-weight:600">${d.pct}%</td>
        <td>${d.exceptions > 0 ? `<span style="color:#A32D2D">${d.exceptions} exception${d.exceptions > 1 ? 's' : ''}</span>` : '—'}</td>
      </tr>
    `).join('');

  // Controls rows
  const controlRows = controls.map(c => `
    <tr>
      <td style="font-family:monospace;font-size:11px">${c.id}</td>
      <td>${c.name}</td>
      <td>${c.domain}</td>
      <td style="color:${c.status === 'Tested' ? '#0F6E56' : c.status === 'Exception' ? '#A32D2D' : '#854F0B'};font-weight:600">${c.status}</td>
    </tr>
  `).join('');

  // Findings rows
  const findingRows = findings.map(f => `
    <tr>
      <td style="font-family:monospace;font-size:11px">${f.isaReference}</td>
      <td>${f.title}</td>
      <td style="color:${severityColor(f.severity)};font-weight:600">${f.severity}</td>
      <td>${f.domain}</td>
      <td style="color:${statusColor(f.status)};font-weight:600">${f.status}</td>
      <td>${f.targetRemediationDate ?? '—'}</td>
    </tr>
  `).join('');

  // Evidence rows
  const evidenceRows = evidence.map(e => `
    <tr>
      <td>${e.name}</td>
      <td style="color:${e.status === 'Received' || e.status === 'Reviewed' ? '#0F6E56' : e.status === 'Requested' ? '#854F0B' : '#A32D2D'};font-weight:600">${e.status}</td>
      <td>${e.requestedDate ?? '—'}</td>
      <td>${e.receivedDate ?? '—'}</td>
    </tr>
  `).join('');

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>IT Audit Report — ${engagement.clientName}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, Arial, sans-serif; font-size: 13px; color: #1A1A18; background: #fff; padding: 40px; }
  .header { border-bottom: 3px solid #0f2744; padding-bottom: 20px; margin-bottom: 28px; }
  .header h1 { font-size: 24px; color: #0f2744; margin-bottom: 4px; }
  .header .meta { font-size: 12px; color: #6B6B67; }
  .metrics { display: flex; gap: 16px; margin-bottom: 28px; }
  .metric { flex: 1; background: #F7F7F5; border-radius: 8px; padding: 14px; text-align: center; }
  .metric .val { font-size: 26px; font-weight: 600; margin-bottom: 4px; }
  .metric .lbl { font-size: 11px; color: #6B6B67; text-transform: uppercase; letter-spacing: 0.5px; }
  h2 { font-size: 14px; font-weight: 600; color: #0f2744; text-transform: uppercase; letter-spacing: 0.5px; margin: 24px 0 10px; border-bottom: 1px solid #E5E3DC; padding-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #F7F7F5; text-align: left; padding: 8px 10px; font-size: 11px; color: #6B6B67; text-transform: uppercase; letter-spacing: 0.3px; border-bottom: 1px solid #E5E3DC; }
  td { padding: 8px 10px; border-bottom: 1px solid #F0EDE8; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  .finding-desc { margin-top: 20px; }
  .finding-card { border: 1px solid #E5E3DC; border-radius: 8px; padding: 14px; margin-bottom: 12px; }
  .finding-card .ftitle { font-weight: 600; font-size: 13px; margin-bottom: 6px; }
  .finding-card .fmeta { font-size: 11px; color: #6B6B67; margin-bottom: 8px; }
  .finding-card .fdesc { font-size: 12px; color: #3A3A38; line-height: 1.6; margin-bottom: 8px; }
  .finding-card .fresponse { font-size: 12px; background: #F7F7F5; border-left: 3px solid #C8C5BC; padding: 8px 10px; border-radius: 4px; line-height: 1.6; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #E5E3DC; font-size: 11px; color: #9E9E9A; text-align: center; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 600; }
</style>
</head>
<body>

<div class="header">
  <h1>IT Audit Report — ${engagement.clientName}</h1>
  <div class="meta">${engagement.fiscalYear} &nbsp;·&nbsp; Lead Auditor: ${engagement.leadAuditor} &nbsp;·&nbsp; Generated: ${today}</div>
</div>

<div class="metrics">
  <div class="metric">
    <div class="val" style="color:${pctColor(summary.completionPct)}">${summary.completionPct}%</div>
    <div class="lbl">Controls Tested</div>
  </div>
  <div class="metric">
    <div class="val" style="color:${summary.openFindings > 0 ? '#A32D2D' : '#0F6E56'}">${summary.openFindings}</div>
    <div class="lbl">Open Findings</div>
  </div>
  <div class="metric">
    <div class="val" style="color:${pctColor(summary.evidencePct)}">${summary.evidencePct}%</div>
    <div class="lbl">Evidence Collected</div>
  </div>
  <div class="metric">
    <div class="val">${findings.length}</div>
    <div class="lbl">Total Findings</div>
  </div>
</div>

<h2>Domain Progress</h2>
<table>
  <thead><tr><th>Domain</th><th>Tested</th><th>% Complete</th><th>Exceptions</th></tr></thead>
  <tbody>${domainRows}</tbody>
</table>

<h2>Controls (${controls.length})</h2>
<table>
  <thead><tr><th>ID</th><th>Name</th><th>Domain</th><th>Status</th></tr></thead>
  <tbody>${controlRows}</tbody>
</table>

<h2>Evidence Tracker (${evidence.length})</h2>
<table>
  <thead><tr><th>Evidence Item</th><th>Status</th><th>Requested</th><th>Received</th></tr></thead>
  <tbody>${evidenceRows}</tbody>
</table>

<h2>Findings Summary</h2>
<table>
  <thead><tr><th>Reference</th><th>Title</th><th>Severity</th><th>Domain</th><th>Status</th><th>Due Date</th></tr></thead>
  <tbody>${findingRows}</tbody>
</table>

${findings.length > 0 ? `
<h2>Findings Detail</h2>
${findings.map(f => `
  <div class="finding-card">
    <div class="ftitle">${f.isaReference} — ${f.title}</div>
    <div class="fmeta">
      <span style="color:${severityColor(f.severity)};font-weight:600">${f.severity}</span>
      &nbsp;·&nbsp; ${f.domain}
      &nbsp;·&nbsp; Owner: ${f.owner || '—'}
      &nbsp;·&nbsp; Due: ${f.targetRemediationDate ?? '—'}
    </div>
    <div class="fdesc">${f.description || 'No description provided.'}</div>
    ${f.managementResponse ? `<div class="fresponse"><strong>Management Response:</strong> ${f.managementResponse}</div>` : ''}
  </div>
`).join('')}
` : ''}

<div class="footer">
  IT Audit Tracker &nbsp;·&nbsp; ${engagement.clientName} ${engagement.fiscalYear} &nbsp;·&nbsp; Confidential
</div>

</body>
</html>`;

  // Write HTML to a temp file then share it
  const filename = `${engagement.clientName.replace(/\s+/g, '_')}_${engagement.fiscalYear}_Audit_Report.html`;
  const fileUri = FileSystem.documentDirectory + filename;

  await FileSystem.writeAsStringAsync(fileUri, html, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'text/html',
      dialogTitle: `${engagement.clientName} Audit Report`,
      UTI: 'public.html',
    });
  }
}