// Generic, use-case agnostic data model. A Tracker is a tree of Nodes;
// any node can hold resources, practice links (PYQs), notes and nested children.

export type Status = 'todo' | 'learning' | 'done'
export type Priority = 'high' | 'medium' | 'low'

export type ResourceType =
  | 'video'
  | 'pdf'
  | 'website'
  | 'course'
  | 'book'
  | 'practice'
  | 'notes'
  | 'drive'
  | 'upload'

export interface Resource {
  id: string
  title: string
  url: string
  type: ResourceType
  source?: string
  note?: string
  free?: boolean
  done?: boolean
  starred?: boolean
  mine?: boolean // added by the user (vs. seeded)
  fileName?: string // for uploads stored by the local server
  size?: number
  addedAt?: string
}

export interface Subtopic {
  id: string
  title: string
  done: boolean
  group?: string // optional heading the item is listed under
}

export interface TrackerNode {
  id: string
  title: string
  icon?: string
  color?: string
  summary?: string
  tips?: string
  notesGuide?: string
  weightage?: string
  marks?: number // numeric weight used for "weighted by marks" progress
  status: Status
  priority?: Priority
  estHours?: number
  confidence?: number // 0..5
  subtopics: Subtopic[]
  resources: Resource[]
  pyqs: Resource[]
  notes: string // markdown
  completedAt?: string
  revisions: string[] // ISO dates of revisions done
  lastStudied?: string
  minutes: number // focused time logged
  children: TrackerNode[]
}

export interface ActivityEntry {
  date: string // yyyy-mm-dd
  minutes: number
  actions: number
}

export interface LinkItem {
  title: string
  url: string
  source?: string
  note?: string
  free?: boolean
  type?: ResourceType
}

export interface TrackerMeta {
  examName?: string
  examInfo?: { label: string; value: string }[]
  strategy?: string[]
  papers?: LinkItem[]
  mockTests?: LinkItem[]
  generalResources?: LinkItem[]
  weightage?: { subject: string; marks: (number | null)[]; note?: string }[]
  weightageYears?: string[]
  weightageNote?: string
  milestones?: { date: string; label: string }[]
  outOfScope?: string[]
  dontSkip?: string[]
}

export interface Tracker {
  id: string
  name: string
  emoji: string
  tagline?: string
  targetDate?: string
  targetLabel?: string
  dailyGoalMinutes: number
  levelNames: string[] // e.g. ["Subject", "Topic", "Subtopic"]
  practiceLabel: string // e.g. "PYQs"
  createdAt: string
  nodes: TrackerNode[]
  meta: TrackerMeta
  activity: ActivityEntry[]
  sessions: { nodeId: string; start: string; minutes: number }[]
}

export interface AppState {
  version: number
  activeTrackerId: string | null
  theme: 'dark' | 'light'
  trackers: Tracker[]
}
