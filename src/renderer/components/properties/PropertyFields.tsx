import { useState, useCallback, useMemo } from 'react'
import { Plus, X } from 'lucide-react'
import { NOTE_TYPES } from '../../types'
import { useVaultStore } from '../../stores/vault'
import { parseFrontmatter, rebuildFrontmatter, extractFrontmatter } from '../../lib/markdown'

interface PropertyFieldsProps {
  content: string
}

export function PropertyFields({ content }: PropertyFieldsProps) {
  const props = useMemo(() => parseFrontmatter(content) ?? {}, [content])
  const setContent = useVaultStore((s) => s.setContent)

  const updateProperty = useCallback(
    (key: string, value: unknown) => {
      const updated = { ...props, [key]: value }
      const { body } = extractFrontmatter(content)
      const newFm = rebuildFrontmatter(updated)
      setContent(newFm ? newFm + '\n' + body : body)
    },
    [props, content, setContent]
  )

  const removeProperty = useCallback(
    (key: string) => {
      const updated = { ...props }
      delete updated[key]
      const { body } = extractFrontmatter(content)
      const newFm = rebuildFrontmatter(updated)
      setContent(newFm ? newFm + '\n' + body : body)
    },
    [props, content, setContent]
  )

  const addProperty = useCallback(
    (key: string) => {
      if (!key || props[key] !== undefined) return
      updateProperty(key, '')
    },
    [props, updateProperty]
  )

  const noteType = props.type as string | undefined
  const typeConfig = noteType ? NOTE_TYPES[noteType] : undefined
  const Icon = typeConfig?.icon

  const entries = Object.entries(props)

  return (
    <div className="px-3 py-3">
      {/* Note type badge */}
      {typeConfig && Icon && (
        <div className="flex items-center gap-2 mb-3">
          <Icon size={14} style={{ color: typeConfig.color }} />
          <span
            className="text-[11px] font-medium px-1.5 py-px rounded-full tracking-wide uppercase"
            style={{
              backgroundColor: typeConfig.color + '15',
              color: typeConfig.color,
            }}
          >
            {typeConfig.name}
          </span>
        </div>
      )}

      {/* Property rows */}
      {entries.length === 0 && (
        <p className="text-[11px] mb-3" style={{ color: 'var(--text-tertiary)' }}>
          No frontmatter
        </p>
      )}

      <div className="space-y-1.5">
        {entries
          .filter(([key]) => key !== 'type')
          .map(([key, value]) => (
            <PropertyField
              key={key}
              propKey={key}
              value={value}
              onUpdate={(v) => updateProperty(key, v)}
              onRemove={() => removeProperty(key)}
            />
          ))}
      </div>

      {/* Add property */}
      <AddPropertyButton onAdd={addProperty} />
    </div>
  )
}

function PropertyField({
  propKey,
  value,
  onUpdate,
  onRemove,
}: {
  propKey: string
  value: unknown
  onUpdate: (v: unknown) => void
  onRemove: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [editValue, setEditValue] = useState('')

  const startEdit = () => {
    setEditValue(Array.isArray(value) ? value.join(', ') : String(value ?? ''))
    setEditing(true)
  }

  const commitEdit = () => {
    setEditing(false)
    // Detect arrays: if original was array or new value contains commas
    if (Array.isArray(value) || editValue.includes(',')) {
      const arr = editValue.split(',').map((s) => s.trim()).filter(Boolean)
      onUpdate(arr)
    } else {
      onUpdate(editValue)
    }
  }

  const displayValue = Array.isArray(value) ? value.join(', ') : String(value ?? '')

  return (
    <div className="group flex items-start gap-1.5">
      <div className="flex-1 min-w-0">
        <div className="text-[10px] mb-0.5" style={{ color: 'var(--text-muted)' }}>
          {propKey}
        </div>
        {editing ? (
          <input
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit()
              if (e.key === 'Escape') setEditing(false)
            }}
            className="w-full text-[12px] px-1.5 py-0.5 rounded bg-transparent outline-none"
            style={{
              color: 'var(--text-primary)',
              border: '1px solid var(--accent)',
              background: 'var(--bg-input)',
            }}
          />
        ) : (
          <div
            onClick={startEdit}
            className="text-[12px] px-1.5 py-0.5 rounded cursor-pointer transition-colors truncate"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >
            {Array.isArray(value) ? (
              <span className="flex flex-wrap gap-1">
                {value.map((v, i) => {
                  const s = String(v)
                  const isWikilink = s.startsWith('[[') && s.endsWith(']]')
                  const display = isWikilink ? s.slice(2, -2) : s
                  return (
                    <span
                      key={i}
                      className="inline-block px-1.5 py-px rounded-full text-[10px]"
                      style={{
                        background: isWikilink ? 'var(--accent-light)' : 'var(--surface-primary)',
                        border: `1px solid ${isWikilink ? 'var(--accent-soft)' : 'var(--surface-secondary)'}`,
                        color: isWikilink ? 'var(--accent)' : 'var(--text-secondary)',
                      }}
                    >
                      {display}
                    </span>
                  )
                })}
              </span>
            ) : (
              <DisplayValue value={displayValue} />
            )}
          </div>
        )}
      </div>
      <button
        onClick={onRemove}
        className="p-0.5 mt-2 rounded opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity"
        style={{ color: 'var(--text-tertiary)' }}
        title="Remove property"
      >
        <X size={10} />
      </button>
    </div>
  )
}

function DisplayValue({ value }: { value: string }) {
  if (!value) return <span style={{ color: 'var(--text-tertiary)' }}>empty</span>

  // Wikilink scalar
  if (value.startsWith('[[') && value.endsWith(']]')) {
    return <span style={{ color: 'var(--accent)' }}>{value.slice(2, -2)}</span>
  }

  // Boolean display
  if (value === 'true' || value === 'false') {
    return (
      <span style={{ color: value === 'true' ? 'var(--success)' : 'var(--text-tertiary)' }}>
        {value}
      </span>
    )
  }

  return <>{value}</>
}

function AddPropertyButton({ onAdd }: { onAdd: (key: string) => void }) {
  const [adding, setAdding] = useState(false)
  const [newKey, setNewKey] = useState('')

  const commit = () => {
    if (newKey.trim()) onAdd(newKey.trim())
    setNewKey('')
    setAdding(false)
  }

  if (adding) {
    return (
      <div className="mt-2">
        <input
          autoFocus
          placeholder="Property name"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commit()
            if (e.key === 'Escape') { setNewKey(''); setAdding(false) }
          }}
          className="w-full text-[11px] px-2 py-1 rounded bg-transparent outline-none"
          style={{
            color: 'var(--text-primary)',
            border: '1px solid var(--border)',
            background: 'var(--bg-input)',
          }}
        />
      </div>
    )
  }

  return (
    <button
      onClick={() => setAdding(true)}
      className="flex items-center gap-1 mt-3 text-[11px] cursor-pointer transition-colors"
      style={{ color: 'var(--text-tertiary)' }}
      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-secondary)' }}
      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-tertiary)' }}
    >
      <Plus size={11} />
      Add property
    </button>
  )
}
