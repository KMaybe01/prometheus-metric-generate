import {
  CloseCircleOutlined,
  CloudServerOutlined,
  CodeOutlined,
  DeleteOutlined,
  EditOutlined,
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
  onEdit: (id: string) => void
  onDelete: (id: string) => void
}

function renderLabelTags(labels: Record<string, string>) {
  return Object.entries(labels).map(([k, v]) => (
    <Tag key={k} color={v.includes('|') ? 'orange' : 'default'} style={{ marginBottom: 4 }}>
      {k}={v}
    </Tag>
  ))
}

export function MetricCard({
  metric,
  serverConfig,
  onToggleRun,
  onTogglePush,
  onToggleExpand,
  onEdit,
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
        <div
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
          onClick={() => onEdit(metric.id)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') onEdit(metric.id)
          }}
        >
          <Space wrap>
            <Text
              strong
              style={{ color: '#1a1a1a', cursor: 'pointer' }}
              onClick={(e) => {
                e.stopPropagation()
                onToggleExpand(metric.id)
              }}
            >
              {metric.name} {metric.isExpanded ? '▼' : '▶'}
            </Text>
            <Tag color={getTypeColor(metric.type)}>{metric.type}</Tag>
            {metric.series.length > 1 && <Tag color="geekblue">{metric.series.length} series</Tag>}
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
        <Space>
          <Tooltip title="Edit Metric (labels, range, etc.)">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={(e) => {
                e.stopPropagation()
                onEdit(metric.id)
              }}
            />
          </Tooltip>
          <Button
            type="text"
            danger
            icon={<DeleteOutlined />}
            onClick={(e) => {
              e.stopPropagation()
              onDelete(metric.id)
            }}
          />
        </Space>
      }
    >
      {/* 装饰层：只有开启 Push 时才渲染旋转光束和内遮罩 */}
      {metric.isPushing && <div className="pushing-card-beam" />}
      {metric.isPushing && <div className="pushing-card-inner" />}

      {metric.isExpanded && (
        <>
          {metric.series.length === 1 ? (
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title={<span style={{ color: '#666' }}>Current Value</span>}
                  value={metric.series[0].value}
                  styles={{ content: { color: '#52c41a', fontSize: 28, fontFamily: 'Fira Code, monospace' } }}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title={<span style={{ color: '#666' }}>Last Update</span>}
                  value={metric.series[0].lastUpdate.toLocaleString()}
                  styles={{ content: { color: '#999', fontSize: 14 } }}
                />
              </Col>
            </Row>
          ) : (
            <>
              <Text style={{ color: '#666' }}>Series ({metric.series.length}):</Text>
              <div style={{ marginTop: 8, maxHeight: 320, overflowY: 'auto' }}>
                {metric.series.map((series) => (
                  <div
                    key={series.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      gap: 8,
                      padding: '6px 0',
                      borderBottom: '1px solid #f0f0f0',
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Text
                        strong
                        style={{
                          color: '#52c41a',
                          fontFamily: 'Fira Code, monospace',
                          marginRight: 12,
                        }}
                      >
                        {series.value}
                      </Text>
                      {renderLabelTags(series.labels)}
                    </div>
                    <Text style={{ color: '#999', fontSize: 12, whiteSpace: 'nowrap' }}>
                      {series.lastUpdate.toLocaleTimeString()}
                    </Text>
                  </div>
                ))}
              </div>
            </>
          )}

          <Divider style={{ borderColor: '#d9d9d9', margin: '12px 0' }} />
          <Space wrap>
            <Text style={{ color: '#888' }}>Step: </Text>
            <Tag color="blue">{metric.stepValue}</Tag>
            {(metric.minValue != null || metric.maxValue != null) && (
              <>
                <Text style={{ color: '#888' }}>Range: </Text>
                <Tag color="purple">
                  {metric.minValue ?? '-∞'} ~ {metric.maxValue ?? '+∞'}
                </Tag>
              </>
            )}
          </Space>

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
