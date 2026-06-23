# IT Audit Tracker

A React Native / Expo mobile application for tracking **ITGC** (IT General Controls) and **ISA** (International Standards on Auditing) documentation across client engagements — including ISA 315 risk assessments, audit timelines, and deadline notifications.

---

## Features

| Area | Details |
|---|---|
| **Dashboard** | Global metrics, ITGC domain breakdown, upcoming milestones, and at-risk engagements |
| **Engagements** | Client list with status badges, ISA 315 labelling, progress bars; create/edit/delete via action sheet |
| **Engagement Detail** | Four-tab drill-down: Controls, Evidence, Findings, **Timeline** |
| **Controls** | Per-control status tracking (Not Started → In Progress → Tested → Exception), testing notes, linked evidence & findings |
| **Evidence** | Status tracking (Outstanding → Requested → Received → Reviewed), automatic overdue detection (>7 days past requested date) |
| **Findings** | Severity (High/Medium/Low/Informational), ISA references, management response editor, remediation status |
| **Timeline / Milestones** | Predefined audit phases (Planning, Fieldwork, Reporting, Sign-off) auto-generated from the engagement start date, plus custom milestones — each with exact date + time and individual notification toggle |
| **Auto Status Engine** | Engagement status automatically escalates to **"At Risk"** when any of: a control has an Exception, evidence is overdue, or an open High-severity finding exists. Reverts automatically to the auditor's last manual status once all risk conditions clear |
| **Notifications** | Local push reminders for finding deadlines (7-day / 3-day / day-of) and milestones (1-day-before / at-due-time); test button in Settings |
| **PDF/HTML Export** | Generates a full engagement report (domains, controls, evidence, findings) shareable via the device share sheet |
| **ISA 315 Support** | Dedicated engagement type selector at creation; purple "ISA 315" badge shown throughout the app |
| **Data Management** | Clear-all-data option in Settings; local AsyncStorage persistence with automatic schema migration for upgrades |

---

## Project Structure

```
it-audit-tracker/
├── app/                              # Expo Router screens (file-based routing)
│   ├── _layout.tsx                   # Root layout: ActionSheetProvider + AuditProvider + Stack
│   ├── (tabs)/
│   │   ├── _layout.tsx               # Bottom tab navigator
│   │   ├── index.tsx                 # Dashboard (metrics, domains, upcoming milestones)
│   │   ├── engagements.tsx           # Engagements list
│   │   ├── findings.tsx              # Global findings (formerly "ISA Docs")
│   │   └── settings.tsx              # Notifications, overdue evidence, clear-all-data
│   └── engagement/
│       ├── [id].tsx                  # Engagement detail — Controls / Evidence / Findings / Timeline tabs
│       ├── new.tsx                   # New engagement form (ISA 315 radio selector, date picker)
│       ├── control/
│       │   ├── [controlId].tsx       # Control detail + status editor
│       │   └── new.tsx               # Add control form
│       ├── evidence/
│       │   └── new.tsx               # Add evidence form (date picker)
│       ├── finding/
│       │   ├── [findingId].tsx       # Finding detail + management response editor
│       │   └── new.tsx               # Add finding form (date picker)
│       └── timeline/
│           ├── [id].tsx              # Edit milestone form
│           ├── new.tsx               # Add custom milestone form (date + time picker)
│           └── generate.tsx          # One-tap generate standard audit phases
│
└── src/
    ├── types/index.ts                # TypeScript domain models (Engagement, Control, Evidence, Finding, Milestone)
    ├── constants/
    │   ├── theme.ts                  # Colors, spacing, radius, typography
    │   └── seedData.ts               # Demo data (4 engagements) seeded on first launch
    ├── store/
    │   ├── auditStore.ts             # AsyncStorage CRUD, auto-status engine, computed aggregates, migration
    │   └── AuditContext.tsx          # React Context + useAudit() hook
    ├── components/
    │   ├── Badge.tsx                 # Status/severity badge
    │   ├── ProgressBar.tsx           # Color-coded progress bar
    │   ├── MetricCard.tsx            # Dashboard metric tile
    │   └── DateTimePickerField.tsx   # Material-style date/time picker (Android native dialogs, iOS bottom sheet)
    └── utils/
        ├── exportPDF.ts              # HTML report generation + share sheet
        └── notifications.ts          # Permission handling + scheduling for findings and milestones
```

---

## Data Model

```
Engagement
  ├── isISA315: boolean              — flags ISA 315 risk assessment engagements
  ├── status / manualStatus / statusIsAuto  — auto-status engine fields
  ├── Controls[]                     (ITGC: Access, Change Mgmt, IT Ops, SDLC)
  │     └── evidenceIds[]
  │     └── findingIds[]
  ├── Evidence[]                     (Outstanding → Requested → Received → Reviewed)
  ├── Findings[]                     (ISA references, severity, management response)
  └── Milestones[]                   (phase, exact due date+time, notification toggle)
```

All data is persisted locally with **AsyncStorage**. On first launch the app seeds demo data (Zenith Corp, Apex Ltd, Meridian Group, Stratum Bank). Existing installs upgrading from an older schema are automatically migrated on load — no data loss when new fields are added.

### Auto-Status Engine

An engagement is automatically flagged **"At Risk"** when any of the following is true:
- A control has status `Exception`
- Evidence is `Outstanding`/`Requested` more than 7 days past its requested date
- An open finding has severity `High`

Once none of these conditions apply, the engagement reverts to whatever status the auditor had manually set before the auto-flag (tracked via `manualStatus`). Engagements with status `Complete` are exempt from auto-flagging.

---

## Tech Stack

| Package | Purpose |
|---|---|
| `expo` (~54.0.0) | Build toolchain — **pin SDK 54 to match your installed Expo Go version** |
| `expo-router` | File-based navigation (tabs + stack + modals) |
| `@react-native-async-storage/async-storage` | Local persistence |
| `@react-native-community/datetimepicker` | Native Material/iOS date & time pickers |
| `@expo/react-native-action-sheet` | Modern bottom action sheets (replaces default `Alert.alert`) |
| `expo-notifications` | Local scheduled push notifications |
| `expo-file-system` (`/legacy` import) + `expo-sharing` | HTML report generation and sharing |
| `@expo/vector-icons` (MaterialCommunityIcons) | Icons |
| `react-native-reanimated` + `react-native-worklets` | Animation support (required by `expo-router`) |

---

## Getting Started

### Prerequisites

- **Node.js** 18+ and **npm** 9+
- **Expo Go** app — version must match the SDK below (currently **SDK 54**)

### Install & Run

```bash
npm install --legacy-peer-deps
npx expo start --clear
```

Scan the QR code with Expo Go, or press `a` for an Android emulator.

> **Always use `--legacy-peer-deps`** when installing or adding packages. The Expo/React Native peer dependency graph is stricter than npm 11 defaults expect, and omitting this flag will produce `ERESOLVE` errors.

> **Never run `npm audit fix --force`.** The flagged vulnerabilities live entirely in dev-only build tooling (`@expo/cli`, Jest, Metro) and never ship in the production app. Force-fixing will downgrade `react-native`/`expo` and break the pinned SDK 54 versions.

---

## Building with EAS

```bash
npm install -g eas-cli
eas login
eas build --platform android --profile preview   # installable APK
eas build --platform android --profile production # Play Store .aab
```

`eas.json` profiles:
- **development** — APK with dev client
- **preview** — installable APK for direct testing/sharing
- **production** — Android App Bundle for Play Store submission

### Known build gotchas

- If `npm ci` fails on the build server with a lock-file mismatch, run `npm install --legacy-peer-deps` locally and commit the regenerated `package-lock.json`.
- A blank/crashing app on launch after a successful build is almost always a **dependency version mismatch** — run `npx expo doctor` and apply `npx expo install --check` to align every package with the SDK version in `app.json`.
- APK file size (~150–180MB) is normal — it bundles all 4 CPU architectures. The Play Store production `.aab` build serves each device only its required architecture (~20–30MB).

---

## Notifications

Notifications are scheduled locally (no backend/push server required):
- **Findings** with a target remediation date get 3 reminders: 7 days before, 3 days before, and on the due date.
- **Milestones** get 2 reminders: 1 day before, and at the exact due date+time.
- Reminders must be (re)scheduled manually from **Settings → Notifications** after adding new deadlines — there's a "Refresh" button for this.
- Use **Settings → Send Test Notification** to verify permissions and scheduling are working (fires after 5 seconds).

---

## Customisation

### Adding new control domains
Edit `src/types/index.ts` → `ControlDomain` union type and `src/constants/theme.ts` → `DOMAIN_COLORS`.

### Adding new engagement statuses
Edit `src/types/index.ts` → `EngagementStatus` and `src/constants/theme.ts` → `STATUS_COLORS`. Note: the auto-status engine specifically checks for the literal string `'At Risk'` — renaming this status requires updating `src/store/auditStore.ts` → `applyAutoStatus()`.

### Changing the auto-status risk rules
Edit `hasRiskConditions()` in `src/store/auditStore.ts`.

### Changing standard milestone phases/offsets
Edit `PREDEFINED_PHASES` in `src/store/auditStore.ts`.

### Changing seed data
Edit `src/constants/seedData.ts`. To reset to a clean slate on a device, use **Settings → Clear All Data**, or programmatically:
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
await AsyncStorage.clear();
```

---

## Roadmap

### Shipped
- [x] Core data model (Engagement, Control, Evidence, Finding, Milestone)
- [x] AsyncStorage persistence with seed data + schema migration
- [x] Dashboard, Engagements, Findings, Settings tabs
- [x] Full create/edit/delete flows for all entities via action sheets
- [x] Auto-status escalation engine
- [x] Timeline/Milestone tracking with predefined + custom phases
- [x] Native Material date/time pickers
- [x] Local notifications for deadlines and milestones
- [x] HTML/PDF export with share sheet
- [x] ISA 315 engagement type support
- [x] EAS build pipeline (preview APK + production AAB)
- [x] Custom app icon and splash screen

### Planned
- [ ] File attachments on evidence items (`expo-file-system`)
- [ ] Global search across clients, controls, findings
- [ ] Dark mode
- [ ] Cloud sync (Supabase/Firebase) for multi-device access
- [ ] Team authentication and role-based access
- [ ] Audit trail / change log per control and finding

---

## License

MIT — built for personal/team IT audit use.