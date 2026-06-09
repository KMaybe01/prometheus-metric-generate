import { PlusOutlined } from '@ant-design/icons'
import { Button, Card, Col, Input, Row, Select, Tooltip, message } from 'antd'
import { MetricType } from '../types'
import { metricTypeOptions } from '../utils'

interface MetricFormProps {
  metricName: string
  metricType: MetricType
  labels: string
  stepValue: number
  onNameChange: (value: string) => void
  onTypeChange: (value: MetricType) => void
  onLabelsChange: (value: string) => void
  onStepChange: (value: number) => void
  onAdd: () => void
}

export function MetricForm({
  metricName,
  metricType,
  labels,
  stepValue,
  onNameChange,
  onTypeChange,
  onLabelsChange,
  onStepChange,
  onAdd,
}: MetricFormProps) {
  const handleAdd = () => {
    if (!metricName.trim()) {
      message.error('Please enter metric name')
      return
    }
    if (stepValue <= 0) {
      message.error('Step must be greater than 0')
      return
    }
    onAdd()
  }

  return (
    <Card style={{ marginBottom: 24, background: '#fff', borderColor: '#d9d9d9' }}>
      <Row gutter={16} align="middle">
        <Col xs={24} sm={8} md={6}>
          <Input
            placeholder="Metric name (e.g. http_requests_total)"
            value={metricName}
            onChange={(e) => onNameChange(e.target.value)}
            onPressEnter={handleAdd}
          />
        </Col>
        <Col xs={24} sm={8} md={4}>
          <Select style={{ width: '100%' }} value={metricType} onChange={onTypeChange} options={metricTypeOptions} />
        </Col>
        <Col xs={24} sm={8} md={6}>
          <Input
            placeholder='Labels (e.g. method=GET, status=200 or {method="GET", status="200"})'
            value={labels}
            onChange={(e) => onLabelsChange(e.target.value)}
            onPressEnter={handleAdd}
          />
        </Col>
        <Col xs={24} sm={8} md={4}>
          <Tooltip title="每次变化的步伐值 (Step > 0)">
            <Input
              type="number"
              placeholder="Step"
              min={1}
              value={stepValue}
              onChange={(e) => onStepChange(Math.max(1, Number(e.target.value)))}
            />
          </Tooltip>
        </Col>
        <Col xs={24} sm={24} md={2}>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            disabled={!metricName.trim() || stepValue <= 0}
            block
          >
            Add
          </Button>
        </Col>
      </Row>
    </Card>
  )
}
