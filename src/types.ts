export type MetricType = 'gauge' | 'counter' | 'histogram' | 'summary'

// One time series: a specific label combination with its own generated value
export interface MetricSeries {
  id: string
  labels: Record<string, string>
  value: number
  lastUpdate: Date
}

export interface MetricConfig {
  id: string
  name: string
  type: MetricType
  isRunning: boolean
  isPushing: boolean
  series: MetricSeries[]
  stepValue: number
  minValue?: number
  maxValue?: number
  isExpanded: boolean
}

export interface ServerConfig {
  pushGatewayUrl: string
  interval: number
}

export type ConnectionStatus = 'untested' | 'testing' | 'success' | 'failed'
