# IT Audit Tracker

A React Native / Expo mobile application for tracking **ITGC** (IT General Controls) and **ISA** (Information Systems Audit) documentation across client engagements.

---

## Features

| Area | Details |
|---|---|
| **Dashboard** | Global metrics — controls tested %, open findings, evidence collected %, avg. completion; ITGC domain breakdown; at-risk engagements |
| **Engagements** | Client list with status badges, progress bars, quick stats; create new engagements via modal form |
| **Engagement Detail** | Three-tab drill-down: Controls (by domain), Evidence tracker, Findings |
| **Controls** | Per-control status updates (Not Started → In Progress → Tested → Exception), testing notes editor, linked evidence & findings |
| **Findings** | Global findings view with severity/status filters; per-finding detail with management response editor and remediation status |
| **ISA Docs** | Cross-engagement ISA documentation view, grouped by client, with management responses |

---

## Project Structure

```
it-audit-tracker/
├── app/                        # Expo Router screens
│   ├── _layout.tsx             # Root layout + AuditProvider
│   ├── (tabs)/
│   │   ├── _layout.tsx         # Bottom tab navigator
│   │   ├── index.tsx           # Dashboard
│   │   ├── engagements.tsx     # Engagements list
│   │   ├── findings.tsx        # Global findings
│   │   └── isa.tsx             # ISA documentation
│   └── engagement/
│       ├── [id].tsx            # Engagement detail
│       ├── new.tsx             # New engagement form (modal)
│       ├── control/
│       │   └── [controlId].tsx # Control detail + status editor
│       └── finding/
│           └── [findingId].tsx # Finding detail + mgmt response
│
└── src/
    ├── types/index.ts          # TypeScript domain models
    ├── constants/
    │   ├── theme.ts            # Colors, spacing, typography
    │   └── seedData.ts         # Demo data (4 engagements)
    ├── store/
    │   ├── auditStore.ts       # AsyncStorage CRUD + computed aggregates
    │   └── AuditContext.tsx    # React Context + hooks
    └── components/
        ├── Badge.tsx           # Status/severity badge
        ├── ProgressBar.tsx     # Color-coded progress bar
        └── MetricCard.tsx      # Dashboard metric tile
```

---

## Data Model

```
Engagement
  ├── Controls[]         (ITGC: Access, Change Mgmt, IT Ops, SDLC)
  │     └── evidenceIds[]
  │     └── findingIds[]
  ├── Evidence[]         (Outstanding → Requested → Received → Reviewed)
  └── Findings[]         (ISA references, severity, management response)
```

All data is persisted locally with **AsyncStorage**. The app seeds demo data (Zenith Corp, Apex Ltd, Meridian Group, Stratum Bank) on first launch.

---

## Tech Stack

| Package | Purpose |
|---|---|
| `expo` | Build toolchain |
| `expo-router` | File-based navigation (tabs + stack) |
| `@react-native-async-storage/async-storage` | Local persistence |
| `expo-sqlite` | Ready for migration to SQL if needed |
| `expo-file-system` + `expo-sharing` | Evidence file attachments (Phase 2) |
| `@expo/vector-icons` (MaterialCommunityIcons) | Icons |
| `react-native-reanimated` | Animation support |

---

## Getting Started

### Prerequisites

- **Node.js** 18+ and **npm** 9+
- **Expo Go** app on your iOS or Android device, OR an iOS/Android simulator

### Install & Run

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npx expo start

# 3. Scan the QR code with Expo Go on your phone
#    or press 'i' for iOS simulator / 'a' for Android emulator
```

### Run on Web (for quick preview)

```bash
npx expo start --web
```

---

## Development Roadmap

### Phase 1 — Complete ✅
- [x] Core data model (Engagement, Control, Evidence, Finding)
- [x] AsyncStorage persistence with seed data
- [x] Dashboard with domain-level analytics
- [x] Engagements list + detail (controls / evidence / findings tabs)
- [x] Control detail with status updates and testing notes
- [x] Finding detail with management response editor
- [x] ISA documentation view
- [x] New engagement form

### Phase 2 — Planned
- [ ] **Add Control / Finding / Evidence forms** — inline create from engagement detail
- [ ] **File attachments** — attach PDFs/images to evidence items via `expo-file-system`
- [ ] **Export** — generate PDF or Excel summary report via `expo-sharing`
- [ ] **Search** — global search across clients, controls, findings
- [ ] **Notifications** — local push notifications for upcoming deadlines
- [ ] **Dark mode** — system-aware theming
- [ ] **Cloud sync** — Supabase or Firebase backend for multi-device access

### Phase 3 — Future
- [ ] **Authentication** — team login, role-based access (Lead / Reviewer / Viewer)
- [ ] **Collaboration** — assign controls to team members, comment threads
- [ ] **Offline-first sync** — conflict resolution for multi-user edits
- [ ] **Audit trail** — change log per control/finding

---

## Customisation

### Adding new control domains
Edit `src/types/index.ts` → `ControlDomain` union type and `src/constants/theme.ts` → `DOMAIN_COLORS`.

### Adding new engagement statuses
Edit `src/types/index.ts` → `EngagementStatus` and `src/constants/theme.ts` → `STATUS_COLORS`.

### Changing seed data
Edit `src/constants/seedData.ts`. To reset to seed data, clear AsyncStorage:
```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
await AsyncStorage.clear();
```

---

## License

MIT — built for personal/team IT audit use.
