import type { LucideIcon } from 'lucide-react'
import {
  Calendar,
  User,
  FileText,
  Target,
  Lightbulb,
  MessageSquare,
  BookOpen,
} from 'lucide-react'

export interface NoteIndex {
  path: string
  title: string | null
  note_type: string | null
  tags: string[]
  wikilinks: string[]
  modified: number
}

export interface FileEntry {
  name: string
  path: string
  is_directory: boolean
  children?: FileEntry[]
  expanded?: boolean
}

export interface ParsedNote {
  frontmatter: Record<string, unknown>
  content: string
  title: string | null
  wikilinks: string[]
  tags: string[]
}

export interface NoteType {
  name: string
  icon: LucideIcon
  color: string
  suggestedProperties: string[]
}

export const NOTE_TYPES: Record<string, NoteType> = {
  Meeting: {
    name: 'Meeting',
    icon: Calendar,
    color: '#6366f1',
    suggestedProperties: ['date', 'with', 'context'],
  },
  Person: {
    name: 'Person',
    icon: User,
    color: '#8b5cf6',
    suggestedProperties: ['role', 'organization', 'email'],
  },
  Document: {
    name: 'Document',
    icon: FileText,
    color: '#3b82f6',
    suggestedProperties: ['context', 'about'],
  },
  Project: {
    name: 'Project',
    icon: Target,
    color: '#10b981',
    suggestedProperties: ['status', 'context', 'milestone'],
  },
  Idea: {
    name: 'Idea',
    icon: Lightbulb,
    color: '#f59e0b',
    suggestedProperties: ['status', 'context'],
  },
  Thread: {
    name: 'Thread',
    icon: MessageSquare,
    color: '#ec4899',
    suggestedProperties: ['platform', 'with', 'context'],
  },
  Journal: {
    name: 'Journal',
    icon: BookOpen,
    color: '#6b7280',
    suggestedProperties: ['date'],
  },
}
