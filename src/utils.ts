import { MetricConfig, MetricSeries, MetricType } from './types'

export const metricTypeOptions = [
  { value: 'gauge', label: 'Gauge', description: 'Current value that can go up and down' },
  { value: 'counter', label: 'Counter', description: 'Monotonically increasing value' },
  { value: 'histogram', label: 'Histogram', description: 'Distribution of values in buckets' },
  { value: 'summary', label: 'Summary', description: 'Distribution with quantile calculations' },
]

// Separator for multi-candidate label values, e.g. job=primary|secondary picks one randomly
export const MULTI_VALUE_SEPARATOR = '|'

export function resolveLabelValue(value: string): string {
  if (!value.includes(MULTI_VALUE_SEPARATOR)) return value
  const candidates = value.split(MULTI_VALUE_SEPARATOR).filter((p) => p !== '')
  if (candidates.length === 0) return value
  return candidates[Math.floor(Math.random() * candidates.length)]
}

// Randomly resolve multi-candidate label values into concrete ones
export function resolveLabels(labels: Record<string, string>): Record<string, string> {
  const resolved: Record<string, string> = {}
  for (const [key, value] of Object.entries(labels)) {
    resolved[key] = resolveLabelValue(value)
  }
  return resolved
}

export function sameSeriesLabels(a: Record<string, string>, b: Record<string, string>): boolean {
  const keysA = Object.keys(a)
  const keysB = Object.keys(b)
  if (keysA.length !== keysB.length) return false
  return keysA.every((key) => a[key] === b[key])
}

function formatLabelsStr(labels: Record<string, string>): string {
  const entries = Object.entries(labels)
  if (entries.length === 0) return ''
  return `{${entries.map(([k, v]) => `${k}="${v}"`).join(', ')}}`
}

export function generatePrometheusOutput(metric: MetricConfig): string {
  const timestamp = Date.now()
  const lines: string[] = []
  lines.push(`# HELP ${metric.name} Mock metric`)
  lines.push(`# TYPE ${metric.name} ${metric.type}`)

  for (const series of metric.series) {
    const resolved = resolveLabels(series.labels)
    const base = formatLabelsStr(resolved)

    switch (metric.type) {
      case 'gauge':
      case 'counter':
        lines.push(`${metric.name}${base} ${series.value.toFixed(2)} ${timestamp}`)
        break

      case 'histogram': {
        const buckets = [0.1, 0.5, 1, 5, 10]
        for (const bucket of buckets) {
          lines.push(
            `${metric.name}_bucket${formatLabelsStr({ ...resolved, le: `${bucket}` })} ${Math.floor(Math.random() * 100)} ${timestamp}`,
          )
        }
        lines.push(
          `${metric.name}_bucket${formatLabelsStr({ ...resolved, le: '+Inf' })} ${series.value.toFixed(0)} ${timestamp}`,
        )
        lines.push(`${metric.name}_sum${base} ${(series.value * 10).toFixed(2)} ${timestamp}`)
        lines.push(`${metric.name}_count${base} ${series.value.toFixed(0)} ${timestamp}`)
        break
      }

      case 'summary': {
        const quantiles = [0.5, 0.9, 0.95, 0.99]
        for (const q of quantiles) {
          lines.push(
            `${metric.name}${formatLabelsStr({ ...resolved, quantile: `${q}` })} ${(series.value * q * 2).toFixed(2)} ${timestamp}`,
          )
        }
        lines.push(`${metric.name}_sum${base} ${(series.value * 100).toFixed(2)} ${timestamp}`)
        lines.push(`${metric.name}_count${base} ${series.value.toFixed(0)} ${timestamp}`)
        break
      }
    }
  }

  return lines.join('\n')
}

export function getTypeColor(type: MetricType): string {
  const colors: Record<MetricType, string> = {
    gauge: 'blue',
    counter: 'green',
    histogram: 'purple',
    summary: 'orange',
  }
  return colors[type]
}

export function parseLabels(labelsStr: string): Record<string, string> {
  const labels: Record<string, string> = {}
  const trimmed = labelsStr.trim()
  if (!trimmed) return labels

  // Support both format:
  //   simple:  key1=value1, key2=value2
  //   object:  {key1="value1", key2="value2"}
  // Multi-candidate values are kept as-is: key=v1|v2
  const inner = trimmed.startsWith('{') && trimmed.endsWith('}') ? trimmed.slice(1, -1) : trimmed

  for (const pair of splitLabelPairs(inner)) {
    const eqIdx = pair.indexOf('=')
    if (eqIdx === -1) continue
    const key = pair.slice(0, eqIdx).trim()
    const value = pair
      .slice(eqIdx + 1)
      .trim()
      .replace(/["']/g, '')
    if (key && value) {
      labels[key] = value
    }
  }
  return labels
}

// Split on commas but ignore commas inside quoted label values
function splitLabelPairs(inner: string): string[] {
  const parts: string[] = []
  let current = ''
  let inQuote = false
  for (const ch of inner) {
    if (ch === '"') {
      inQuote = !inQuote
      current += ch
    } else if (ch === ',' && !inQuote) {
      parts.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  if (current.trim()) parts.push(current)
  return parts
}

export interface ParsedMetric {
  name: string
  labels: Record<string, string>
}

function parseLabelPairs(inner: string): Record<string, string> {
  const labels: Record<string, string> = {}
  for (const pair of splitLabelPairs(inner)) {
    const eqIdx = pair.indexOf('=')
    if (eqIdx === -1) continue
    const key = pair.slice(0, eqIdx).trim()
    const value = pair
      .slice(eqIdx + 1)
      .trim()
      .replace(/^["']|["']$/g, '')
    if (key) labels[key] = value
  }
  return labels
}

// Find the closing brace of a block opened at openIdx (quote-aware)
function findMatchingBrace(text: string, openIdx: number): number {
  let inQuote = false
  for (let i = openIdx + 1; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"') inQuote = !inQuote
    else if (ch === '}' && !inQuote) return i
  }
  return -1
}

// Parse a full metric line like: metric_name{label="value", label2="value2"} [value]
export function parseMetricText(text: string): ParsedMetric | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  const braceIdx = trimmed.indexOf('{')
  const name = (braceIdx === -1 ? trimmed : trimmed.slice(0, braceIdx)).trim()
  if (!name || !/^[a-zA-Z_:][a-zA-Z0-9_:]*$/.test(name)) return null
  if (braceIdx === -1) return { name, labels: {} }

  const endIdx = findMatchingBrace(trimmed, braceIdx)
  if (endIdx === -1) return null
  return { name, labels: parseLabelPairs(trimmed.slice(braceIdx + 1, endIdx)) }
}

// Extract all {...} label sets from arbitrary pasted text, one series per block.
// Supports full metric lines (name is ignored) and bare {...} blocks.
// Falls back to parsing the whole text as k=v pairs when no braces are present.
export function extractLabelSets(text: string): Record<string, string>[] {
  const results: Record<string, string>[] = []
  let cursor = 0
  while (cursor < text.length) {
    const openIdx = text.indexOf('{', cursor)
    if (openIdx === -1) break
    const closeIdx = findMatchingBrace(text, openIdx)
    if (closeIdx === -1) break
    const labels = parseLabelPairs(text.slice(openIdx + 1, closeIdx))
    if (Object.keys(labels).length > 0) results.push(labels)
    cursor = closeIdx + 1
  }
  if (results.length === 0) {
    const parsed = parseLabels(text)
    if (Object.keys(parsed).length > 0) results.push(parsed)
  }
  return results
}

export function clampValue(value: number, min?: number, max?: number): number {
  if (min != null && value < min) return min
  if (max != null && value > max) return max
  return value
}

export function simulateValue(metric: MetricConfig, currentValue: number): number {
  const step = metric.stepValue ?? 1
  const min = metric.minValue ?? 0
  const max = metric.maxValue ?? Number.MAX_SAFE_INTEGER

  switch (metric.type) {
    case 'gauge': {
      const direction = Math.random() > 0.5 ? 1 : -1
      return clampValue(currentValue + direction * Math.floor(Math.random() * step + 1), min, max)
    }
    case 'counter':
      return clampValue(currentValue + Math.floor(Math.random() * step + 1), min, max)
    case 'histogram':
    case 'summary': {
      const lower = metric.minValue ?? 0
      const upper = metric.maxValue ?? 1000
      return Math.floor(lower + Math.random() * Math.max(1, upper - lower))
    }
    default:
      return clampValue(currentValue, min, max)
  }
}

// Migrate legacy single-series metric (labels/value fields) to the series-based model
export function migrateMetric(raw: MetricConfig): MetricConfig {
  const legacy = raw as MetricConfig & {
    labels?: Record<string, string>
    value?: number
    lastUpdate?: Date | string
  }
  if (Array.isArray(raw.series) && raw.series.length > 0) return raw
  return {
    ...raw,
    series: [
      {
        id: 'series-0',
        labels: legacy.labels ?? {},
        value: legacy.value ?? 0,
        lastUpdate: new Date(legacy.lastUpdate ?? Date.now()),
      },
    ],
  }
}

export function createSeries(
  id: string,
  labels: Record<string, string>,
  initialValue: number,
  lastUpdate = new Date(),
): MetricSeries {
  return { id, labels, value: initialValue, lastUpdate }
}

export function loadFromStorage<T>(key: string, defaultValue: T): T {
  const saved = localStorage.getItem(key)
  if (saved) {
    return JSON.parse(saved)
  }
  return defaultValue
}

export function saveToStorage(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value))
}
