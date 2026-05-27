import {
  CloseCircleOutlined,
  CloudServerOutlined,
  CodeOutlined,
  DeleteOutlined,
  PauseCircleOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons'
import { Button, Card, Col, Divider, Row, Space, Statistic, Switch, Tag, Tooltip, Typography } from 'antd'
import { MetricConfig } from '../types'
import { generatePrometheusOutput, getTypeColor } from '../utils'

const { Text } = Typography

interface MetricCardProps {
  metric: MetricConfig
  serverConfig: { pushGatewayUrl: string }
  onToggleRun: (id: string) => void
  onTogglePush: (id: string) => void
  onToggleExpand: (id: string) => void
  onDelete: (id: string) => void
}

export function MetricCard({
  metric,
  serverConfig,
  onToggleRun,
  onTogglePush,
  onToggleExpand,
  onDelete,
}: MetricCardProps) {
  const cardClasses = [metric.isPushing ? 'pushing-card' : '', metric.isRunning ? 'generating-card' : '']
    .filter(Boolean)
    .join(' ')

  return (
    <Card
      className={cardClasses}
      style={{
        borderColor: metric.isRunning && !metric.isPushing ? '#52c41a' : 'transparent',
        borderWidth: '2px',
        transition: 'all 0.3s ease',
        position: 'relative',
        zIndex: 0,
      }}
      title={
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Space>
            <Text strong style={{ color: '#1a1a1a', cursor: 'pointer' }} onClick={() => onToggleExpand(metric.id)}>
              {metric.name} {metric.isExpanded ? '▼' : '▶'}
            </Text>
            <Tag color={getTypeColor(metric.type)}>{metric.type}</Tag>
            {metric.isPushing && (
              <Tag color="success" icon={<CloudServerOutlined />}>
                Pushing
              </Tag>
            )}
          </Space>
          <Space onClick={(e) => e.stopPropagation()}>
            <Tooltip title="Generate Metric">
              <Switch
                checked={metric.isRunning}
                onChange={() => onToggleRun(metric.id)}
                checkedChildren={<PlayCircleOutlined />}
                unCheckedChildren={<PauseCircleOutlined />}
                size="small"
              />
            </Tooltip>
            <Tooltip title="Push to Gateway">
              <Switch
                checked={metric.isPushing}
                onChange={() => onTogglePush(metric.id)}
                checkedChildren={<CloudServerOutlined />}
                unCheckedChildren={<CloseCircleOutlined />}
                disabled={!serverConfig.pushGatewayUrl}
                size="small"
              />
            </Tooltip>
          </Space>
        </div>
      }
      extra={
        <Button
          type="text"
          danger
          icon={<DeleteOutlined />}
          onClick={(e) => {
            e.stopPropagation()
            onDelete(metric.id)
          }}
        />
      }
    >
      {/* 装饰层：只有开启 Push 时才渲染旋转光束和内遮罩 */}
      {metric.isPushing && <div className="pushing-card-beam" />}
      {metric.isPushing && <div className="pushing-card-inner" />}

      {metric.isExpanded && (
        <>
          <Row gutter={16}>
            <Col span={12}>
              <Statistic
                title={<span style={{ color: '#666' }}>Current Value</span>}
                value={metric.value}
                styles={{ content: { color: '#52c41a', fontSize: 28, fontFamily: 'Fira Code, monospace' } }}
              />
            </Col>
            <Col span={12}>
              <Statistic
                title={<span style={{ color: '#666' }}>Last Update</span>}
                value={metric.lastUpdate.toLocaleString()}
                styles={{ content: { color: '#999', fontSize: 14 } }}
              />
            </Col>
          </Row>

          {Object.keys(metric.labels).length > 0 && (
            <>
              <Divider style={{ borderColor: '#d9d9d9', margin: '12px 0' }} />
              <Text style={{ color: '#666' }}>Labels: </Text>
              {Object.entries(metric.labels).map(([k, v]) => (
                <Tag key={k} color="default" style={{ marginLeft: 4 }}>
                  {k}={v}
                </Tag>
              ))}
            </>
          )}

          <Divider style={{ borderColor: '#d9d9d9', margin: '12px 0' }} />
          <Text style={{ color: '#888' }}>Step: </Text>
          <Tag color="blue">{metric.stepValue}</Tag>

          <div style={{ display: 'flex', alignItems: 'center', marginTop: 12, marginBottom: 8 }}>
            <CodeOutlined style={{ marginRight: 8, color: '#666' }} />
            <Text strong style={{ color: '#1a1a1a' }}>
              Prometheus Output
            </Text>
          </div>
          <div className="prometheus-output">{generatePrometheusOutput(metric)}</div>
        </>
      )}
    </Card>
  )
}
