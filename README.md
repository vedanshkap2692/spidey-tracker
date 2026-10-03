# 🕷️ Spidey Tracker

Your friendly neighbourhood progress tracker. It's a desktop app (Electron + React) that ships pre-loaded with a fully researched **GATE 2027 Data Science & AI (DA)** tracker, and you can reuse it for any other goal.

## Install (no coding needed)

Download the zip for your computer from the [latest release](https://github.com/vedanshkap2692/spidey-tracker/releases/latest):

| Computer | File |
|---|---|
| Mac with an M1/M2/M3/M4 chip ( → About This Mac shows "Apple M…") | `SpideyTracker-mac-apple-silicon.zip` |
| Mac with an Intel chip | `SpideyTracker-mac-intel.zip` |
| Windows 10/11 | `SpideyTracker-windows.zip` |

**Mac:**
1. Unzip the file and drag **Spidey Tracker** into **Applications**.
2. The app isn't from the App Store, so macOS blocks it the first time. Open **Terminal** and run this once:
   ```
   xattr -cr "/Applications/Spidey Tracker.app"
   ```
3. Open it from Applications. To get a Desktop icon, ⌥⌘-drag the app onto the Desktop to make an alias.

**Windows:**
1. Unzip the file and open the folder.
2. Double-click **Spidey Tracker.exe**. If SmartScreen warns you, click **More info → Run anyway**.
3. To get a Desktop icon, right-click the exe → **Send to → Desktop (create shortcut)**.

The app starts with a fresh GATE DA tracker at 0%. To copy someone's progress, they use **Settings → Export (with progress)** and you use **Settings → Import JSON**.

## Launch

- **Desktop:** double-click **Spidey Tracker** on your Desktop. It's a shortcut to `~/Applications/Spidey Tracker.app`.
- **Browser:** run `npm run build && npm run serve`, then open http://localhost:4747.
- **Dev mode with hot reload:** `npm run dev` (UI on :5173, API on :4747).

## What's inside the GATE DA tracker

- **8 subjects → 83 topics → 946 checklist items**, built from the official GATE 2027 DA syllabus (IIT Madras) and your exhaustive checklist.
- **~500 resource links:** NPTEL, MIT OCW, CS229, CS188, ISLP, StatQuest, 3Blue1Brown, GO Classes, Piyush Wairale, CMU 15-445, db-book slides, and more. Most are mapped to the exact lecture or chapter.
- **~350 PYQ links:** official DA 2024/25/26 papers and keys, GATE Overflow tags (`gate-ds-ai-2024`, `gateda-2025`, `gateda-2026` plus topic tags), ExamSIDE and AspirantMitraa DA-only lists, and old GATE CSE questions where the syllabus overlaps.
- **Per topic:** an exam tip, estimated hours, priority, and a "how to get notes" guide for each subject.
- **Battle Plan page:** exam facts, milestones, past-paper marks by subject, a strategy from Oct to Feb, mock tests, and the syllabus boundary (what's out of scope, plus small topics you shouldn't skip).

## Features

| | |
|---|---|
| **Dashboard** | Overall %, which you can weight by study hours or by exam marks. Topics done, PYQs solved, resources finished, focus time vs. daily goal, streak, a countdown, and a pace check ("need X topics/week vs. doing Y"). Also next-up suggestions, revisions due, weak spots, and a 52-week activity heatmap. |
| **Web Map** | A spider-web radar of every subject. Each dot is a topic, coloured by status. Click any dot to open it. |
| **Topic panel** | Status (To do / Learning / Done), a grouped checklist, resources, PYQs, markdown notes, uploads (PDFs or any file, drag and drop), Drive links, a confidence rating, and a focus timer. |
| **Spider-Sense** | Spaced revision. Every topic you finish comes back at +1, 3, 7, 15, 30 and 60 days. |
| **Library** | Every link and file in one searchable, filterable list. |
| **⌘K** | Search across topics, checklist items, resources and pages. |
| **Focus timer** | 25, 50 or 90 minute sessions. The time is logged to the topic and to the heatmap. |

## Reuse it for anything (use-case agnostic)

A tracker is just a tree of nodes, and any node can have children, a checklist, resources, practice links, notes and uploads.

- **Settings → Blank** starts an empty tracker. Rename the levels (for example "Course, Module, Lesson") and the practice label (for example "Exercises").
- **Settings → Import JSON** loads a template. The minimal format is:

```json
{ "name": "AWS Cert", "emoji": "☁️", "levelNames": ["Domain", "Topic"], "practiceLabel": "Labs",
  "nodes": [ { "title": "Compute", "icon": "🖥️", "children": [
      { "title": "EC2", "subtopics": ["Instance types", "Pricing"], "estHours": 4,
        "resources": [{ "title": "EC2 docs", "url": "https://docs.aws.amazon.com/ec2/" }] } ] } ] }
```

- **Export as template** shares a tracker without your progress.

## Your data

Everything is saved locally to `~/Library/Application Support/Spidey Tracker/data/`:

- `db.json`
- `uploads/`
- `backups/` (automatic, last 30 kept). You can restore them from Settings.

## Rebuilding

- `npm run seed`: regenerates `templates/gate-da-2027.json` from `templates/gate-da-syllabus.txt` and `templates/research/*.json`. Edit the syllabus text to change topics.
- `npm run package`: rebuilds the `.app` and reinstalls it to `~/Applications`, with a Desktop shortcut.
