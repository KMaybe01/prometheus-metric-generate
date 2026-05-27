import { ApiOutlined, CloseCircleOutlined, CloudServerOutlined, SettingOutlined, SyncOutlined } from '@ant-design/icons'
import { Button, Card, Col, Form, Row, Space, Statistic, Tag, Typography, message } from 'antd'
import { useCallback, useEffect, useRef, useState } from 'react'
import { MetricCard, MetricForm, ServerConfigModal } from './components'
import { ConnectionStatus, MetricConfig, MetricType, ServerConfig } from './types'
import { loadFromStorage, parseLabels, saveToStorage, simulateValue } from './utils'

const { Title, Text } = Typography

function App() {
  const [form] = Form.useForm<ServerConfig>()

  const [metrics, setMetrics] = useState<MetricConfig[]>(() => {
    const saved = loadFromStorage<MetricConfig[]>('metrics', [])
    return saved.map((m) => ({ ...m, lastUpdate: new Date(m.lastUpdate) }))
  })

  const [newMetricName, setNewMetricName] = useState('')
  const [newMetricType, setNewMetricType] = useState<MetricType>('gauge')
  const [newMetricLabels, setNewMetricLabels] = useState('')
  const [newMetricStep, setNewMetricStep] = useState(1)

  const [configModalVisible, setConfigModalVisible] = useState(false)
  const [serverConfig, setServerConfig] = useState<ServerConfig>(() =>
    loadFromStorage<ServerConfig>('serverConfig', {
      pushGatewayUrl: '',
      interval: 2000,
    }),
  )

  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('untested')
  const [connectionError, setConnectionError] = useState('')

  const resetConnection = useCallback(() => {
    setConnectionStatus('untested')
  }, [])

  const intervalsRef = useRef<Map<string, number>>(new Map())
  const pushIntervalsRef = useRef<Map<string, number>>(new Map())
  const prevRunningStateRef = useRef('')
  const prevPushingStateRef = useRef('')
  const metricsRef = useRef(metrics)
  metricsRef.current = metrics

  useEffect(() => {
    saveToStorage('metrics', metrics)
  }, [metrics])

  useEffect(() => {
    saveToStorage('serverConfig', serverConfig)
  }, [serverConfig])

  const pushMetricToGateway = useCallback(
    async (metricId: string) => {
      const metric = metricsRef.current.find((m) => m.id === metricId)
      if (!serverConfig.pushGatewayUrl || !metric || !metric.isPushing) return

      try {
        const labels = Object.entries(metric.labels)
          .map(([k, v]) => `${k}="${v}"`)
          .join(',')

        const lines: string[] = []
        lines.push(`# HELP ${metric.name} Mock metric`)
        lines.push(`# TYPE ${metric.name} ${metric.type}`)

        const labelStr = labels ? `{${labels}}` : ''

        switch (metric.type) {
          case 'gauge':
          case 'counter':
            lines.push(`${metric.name}${labelStr} ${metric.value}`)
            break
          case 'histogram':
            lines.push(`${metric.name}_count${labelStr} ${metric.value}`)
            lines.push(`${metric.name}_sum${labelStr} ${metric.value * 10}`)
            break
          case 'summary':
            lines.push(`${metric.name}_count${labelStr} ${metric.value}`)
            lines.push(`${metric.name}_sum${labelStr} ${metric.value * 100}`)
            break
        }

        const pushUrl = `${serverConfig.pushGatewayUrl.replace(/\/$/, '')}/metrics/job/${metric.name}`
        const bodyContent = `${lines.join('\n')}\n`

        await fetch(pushUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'text/plain' },
          body: bodyContent,
          mode: 'no-cors',
        })
      } catch (error) {
        console.error('Push failed:', error)
      }
    },
    [serverConfig.pushGatewayUrl],
  )

  const testConnection = async () => {
    const values = form.getFieldsValue()
    const url = values.pushGatewayUrl?.trim()

    if (!url) {
      message.error('Please enter Push Gateway URL')
      return
    }

    setConnectionStatus('testing')
    setConnectionError('')

    try {
      await fetch(`${url}/metrics`, {
        method: 'GET',
        mode: 'no-cors',
      })
      setConnectionStatus('success')
      message.success('Connection successful!')
    } catch (error) {
      setConnectionStatus('failed')
      setConnectionError(error instanceof Error ? error.message : 'Connection failed')
      message.error(`Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const saveConfig = async () => {
    try {
      const values = await form.validateFields()
      const newPushGatewayUrl = values.pushGatewayUrl?.trim() || ''

      setServerConfig({
        pushGatewayUrl: newPushGatewayUrl,
        interval: Number(values.interval),
      })

      if (newPushGatewayUrl) {
        setMetrics((prev) =>
          prev.map((m) => ({
            ...m,
            isPushing: m.isRunning,
          })),
        )
      }

      setConfigModalVisible(false)
      message.success('Configuration saved')
    } catch (error) {
      console.error('Validation failed:', error)
    }
  }

  // Manage generation intervals
  useEffect(() => {
    const runningState = metrics.map((m) => `${m.id}:${m.isRunning}`).join(',')
    if (runningState === prevRunningStateRef.current) return
    prevRunningStateRef.current = runningState

    for (const metric of metrics) {
      const hasInterval = intervalsRef.current.has(metric.id)

      if (metric.isRunning && !hasInterval) {
        const interval = setInterval(() => {
          setMetrics((prev) =>
            prev.map((m) =>
              m.id === metric.id
                ? {
                    ...m,
                    value: simulateValue(m),
                    lastUpdate: new Date(),
                  }
                : m,
            ),
          )
        }, serverConfig.interval)
        intervalsRef.current.set(metric.id, interval)
      } else if (!metric.isRunning && hasInterval) {
        clearInterval(intervalsRef.current.get(metric.id))
        intervalsRef.current.delete(metric.id)
      }
    }

    const metricIds = new Set(metrics.map((m) => m.id))
    for (const id of intervalsRef.current.keys()) {
      if (!metricIds.has(id)) {
        clearInterval(intervalsRef.current.get(id)!)
        intervalsRef.current.delete(id)
      }
    }
  }, [metrics, serverConfig.interval])

  // Manage push intervals
  useEffect(() => {
    if (!serverConfig.pushGatewayUrl) {
      for (const interval of pushIntervalsRef.current.values()) {
        clearInterval(interval)
      }
      pushIntervalsRef.current.clear()
      return
    }

    const pushingState = metrics.map((m) => `${m.id}:${m.isPushing}`).join(',')
    if (pushingState === prevPushingStateRef.current) return
    prevPushingStateRef.current = pushingState

    for (const metric of metrics) {
      const hasInterval = pushIntervalsRef.current.has(metric.id)

      if (metric.isPushing && !hasInterval) {
        const interval = setInterval(() => {
          pushMetricToGateway(metric.id)
        }, serverConfig.interval)
        pushIntervalsRef.current.set(metric.id, interval)
      } else if (!metric.isPushing && hasInterval) {
        clearInterval(pushIntervalsRef.current.get(metric.id))
        pushIntervalsRef.current.delete(metric.id)
      }
    }

    const metricIds = new Set(metrics.map((m) => m.id))
    for (const id of pushIntervalsRef.current.keys()) {
      if (!metricIds.has(id)) {
        clearInterval(pushIntervalsRef.current.get(id)!)
        pushIntervalsRef.current.delete(id)
      }
    }
  }, [metrics, serverConfig.pushGatewayUrl, serverConfig.interval, pushMetricToGateway])

  const addMetric = () => {
    if (!newMetricName.trim()) return

    const newMetric: MetricConfig = {
      id: Date.now().toString(),
      name: newMetricName,
      type: newMetricType,
      isRunning: true,
      isPushing: !!serverConfig.pushGatewayUrl,
      value: 0,
      labels: parseLabels(newMetricLabels),
      stepValue: newMetricStep,
      isExpanded: true,
      lastUpdate: new Date(),
    }

    setMetrics((prev) => [...prev, newMetric])
    setNewMetricName('')
    setNewMetricLabels('')
  }

  const toggleMetric = (id: string) => {
    setMetrics((prev) => prev.map((m) => (m.id === id ? { ...m, isRunning: !m.isRunning } : m)))
  }

  const togglePush = (id: string) => {
    if (!serverConfig.pushGatewayUrl) {
      message.warning('Please configure Push Gateway URL first')
      return
    }
    setMetrics((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          const nextPushing = !m.isPushing
          if (nextPushing) {
            // Push immediately when turned on
            pushMetricToGateway(id)
          }
          return { ...m, isPushing: nextPushing }
        }
        return m
      }),
    )
  }

  const toggleExpand = (id: string) => {
    setMetrics((prev) => prev.map((m) => (m.id === id ? { ...m, isExpanded: !m.isExpanded } : m)))
  }

  const deleteMetric = (id: string) => {
    setMetrics((prev) => prev.filter((m) => m.id !== id))
    if (intervalsRef.current.has(id)) {
      clearInterval(intervalsRef.current.get(id))
      intervalsRef.current.delete(id)
    }
    if (pushIntervalsRef.current.has(id)) {
      clearInterval(pushIntervalsRef.current.get(id))
      pushIntervalsRef.current.delete(id)
    }
  }

  const runningCount = metrics.filter((m) => m.isRunning).length
  const pushingCount = metrics.filter((m) => m.isPushing).length

  return (
    <div style={{ padding: '0 24px 48px', maxWidth: 1400, margin: '0 auto', minHeight: '100vh' }}>
      <div className="page-header">
        <Title level={1} className="header-title">
          <ApiOutlined style={{ marginRight: 16, color: '#52c41a' }} />
          Prometheus Metric Mock
        </Title>
      </div>

      <Card className="glass-container" style={{ marginBottom: 24, border: 'none' }}>
        <div
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}
        >
          <Space>
            <CloudServerOutlined style={{ fontSize: 20, color: serverConfig.pushGatewayUrl ? '#52c41a' : '#999' }} />
            <Text style={{ color: '#1a1a1a' }}>
              Push Gateway:{' '}
              {serverConfig.pushGatewayUrl ? (
                <a
                  href={serverConfig.pushGatewayUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#52c41a' }}
                >
                  {serverConfig.pushGatewayUrl}
                </a>
              ) : (
                <Text code style={{ color: '#666' }}>
                  Not configured
                </Text>
              )}
            </Text>
            {serverConfig.pushGatewayUrl && (
              <Tag
                color={connectionStatus === 'success' ? 'success' : connectionStatus === 'failed' ? 'error' : 'default'}
              >
                {connectionStatus === 'success' ? 'Connected' : connectionStatus === 'failed' ? 'Failed' : 'Ready'}
              </Tag>
            )}
            <Tag color="blue">Interval: {serverConfig.interval}ms</Tag>
          </Space>
          <Button
            icon={<SettingOutlined />}
            onClick={() => {
              form.setFieldsValue(serverConfig)
              setConfigModalVisible(true)
            }}
          >
            Configure
          </Button>
        </div>
      </Card>

      <MetricForm
        metricName={newMetricName}
        metricType={newMetricType}
        labels={newMetricLabels}
        stepValue={newMetricStep}
        onNameChange={setNewMetricName}
        onTypeChange={setNewMetricType}
        onLabelsChange={setNewMetricLabels}
        onStepChange={setNewMetricStep}
        onAdd={addMetric}
      />

      <Row gutter={[24, 24]} style={{ marginBottom: 32 }}>
        <Col xs={24} sm={8}>
          <Card className="glass-container" style={{ border: 'none' }}>
            <Statistic
              title={<span style={{ color: '#636e72', fontWeight: 500 }}>Total Metrics</span>}
              value={metrics.length}
              styles={{ content: { color: '#2d3436', fontWeight: 700 } }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="glass-container" style={{ border: 'none' }}>
            <Statistic
              title={<span style={{ color: '#636e72', fontWeight: 500 }}>Running Status</span>}
              value={runningCount}
              styles={{ content: { color: '#52c41a', fontWeight: 700 } }}
              prefix={<SyncOutlined spin={runningCount > 0} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card className="glass-container" style={{ border: 'none' }}>
            <Statistic
              title={<span style={{ color: '#636e72', fontWeight: 500 }}>Pushing Status</span>}
              value={pushingCount}
              styles={{
                content: {
                  color: serverConfig.pushGatewayUrl && pushingCount > 0 ? '#52c41a' : '#b2bec3',
                  fontWeight: 700,
                },
              }}
              prefix={serverConfig.pushGatewayUrl ? <CloudServerOutlined /> : <CloseCircleOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {metrics.length === 0 ? (
        <Card className="glass-container" style={{ textAlign: 'center', padding: '48px 0', border: 'none' }}>
          <Text style={{ color: '#636e72', fontSize: '1.1rem' }}>
            No metrics configured yet. Use the form above to add your first mock metric.
          </Text>
        </Card>
      ) : (
        <Row gutter={[24, 24]}>
          {metrics.map((metric) => (
            <Col xs={24} lg={12} key={metric.id}>
              <MetricCard
                metric={metric}
                serverConfig={serverConfig}
                onToggleRun={toggleMetric}
                onTogglePush={togglePush}
                onToggleExpand={toggleExpand}
                onDelete={deleteMetric}
              />
            </Col>
          ))}
        </Row>
      )}

      <ServerConfigModal
        visible={configModalVisible}
        connectionStatus={connectionStatus}
        connectionError={connectionError}
        form={form}
        onCancel={() => setConfigModalVisible(false)}
        onSave={saveConfig}
        onTestConnection={testConnection}
        onResetConnection={resetConnection}
      />
    </div>
  )
}

export default App
