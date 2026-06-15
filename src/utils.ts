import { MetricConfig, MetricType } from './types'

export const metricTypeOptions = [
  { value: 'gauge', label: 'Gauge', description: 'Current value that can go up and down' },
  { value: 'counter', label: 'Counter', description: 'Monotonically increasing value' },
  { value: 'histogram', label: 'Histogram', description: 'Distribution of values in buckets' },
  { value: 'summary', label: 'Summary', description: 'Distribution with quantile calculations' },
]

export function generatePrometheusOutput(metric: MetricConfig): string {
  const timestamp = Date.now()
  const lines: string[] = []

  const labelsStr =
    Object.keys(metric.labels).length > 0
      ? `{${Object.entries(metric.labels)
          .map(([k, v]) => `${k}="${v}"`)
          .join(', ')}}`
      : ''

  switch (metric.type) {
    case 'gauge':
      lines.push(`# HELP ${metric.name} A gauge metric`)
      lines.push(`# TYPE ${metric.name} gauge`)
      lines.push(`${metric.name}${labelsStr} ${metric.value.toFixed(2)} ${timestamp}`)
      break

    case 'counter':
      lines.push(`# HELP ${metric.name} A counter metric`)
      lines.push(`# TYPE ${metric.name} counter`)
      lines.push(`${metric.name}${labelsStr} ${metric.value.toFixed(2)} ${timestamp}`)
      break

    case 'histogram': {
      lines.push(`# HELP ${metric.name} A histogram metric`)
      lines.push(`# TYPE ${metric.name} histogram`)
      const buckets = [0.1, 0.5, 1, 5, 10]
      const bucketValues = buckets.map(() => Math.floor(Math.random() * 100))
      for (let i = 0; i < buckets.length; i++) {
        lines.push(`${metric.name}_bucket${labelsStr}{le="${buckets[i]}"} ${bucketValues[i]} ${timestamp}`)
      }
      lines.push(`${metric.name}_bucket${labelsStr}{le="+Inf"} ${metric.value.toFixed(0)} ${timestamp}`)
      lines.push(`${metric.name}_sum${labelsStr} ${(metric.value * 10).toFixed(2)} ${timestamp}`)
      lines.push(`${metric.name}_count${labelsStr} ${metric.value.toFixed(0)} ${timestamp}`)
      break
    }

    case 'summary': {
      lines.push(`# HELP ${metric.name} A summary metric`)
      lines.push(`# TYPE ${metric.name} summary`)
      const quantiles = [0.5, 0.9, 0.95, 0.99]
      for (const q of quantiles) {
        lines.push(`${metric.name}${labelsStr}{quantile="${q}"} ${(metric.value * q * 2).toFixed(2)} ${timestamp}`)
      }
      lines.push(`${metric.name}_sum${labelsStr} ${(metric.value * 100).toFixed(2)} ${timestamp}`)
      lines.push(`${metric.name}_count${labelsStr} ${metric.value.toFixed(0)} ${timestamp}`)
      break
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
  const inner = trimmed.startsWith('{') && trimmed.endsWith('}') ? trimmed.slice(1, -1) : trimmed

  for (const pair of inner.split(',')) {
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

export function simulateValue(metric: MetricConfig): number {
  const step = metric.stepValue ?? 1

  switch (metric.type) {
    case 'gauge': {
      const direction = Math.random() > 0.5 ? 1 : -1
      let newValue = metric.value + direction * Math.floor(Math.random() * step + 1)
      if (newValue < 0) newValue = 0
      return newValue
    }
    case 'counter':
      return metric.value + Math.floor(Math.random() * step + 1)
    case 'histogram':
    case 'summary':
      return Math.floor(Math.random() * 1000)
    default:
      return metric.value
  }
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
