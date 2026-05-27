export type MetricType = 'gauge' | 'counter' | 'histogram' | 'summary'

export interface MetricConfig {
  id: string
  name: string
  type: MetricType
  isRunning: boolean
  isPushing: boolean
  value: number
  labels: Record<string, string>
  stepValue: number
  isExpanded: boolean
  lastUpdate: Date
}

export interface ServerConfig {
  pushGatewayUrl: string
  interval: number
}

export type ConnectionStatus = 'untested' | 'testing' | 'success' | 'failed'
