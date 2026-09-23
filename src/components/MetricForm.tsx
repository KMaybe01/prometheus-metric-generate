import { PlusOutlined } from '@ant-design/icons'
import { Button, Card, Col, Input, InputNumber, Row, Select, Tooltip, message } from 'antd'
import { MetricType } from '../types'
import { metricTypeOptions } from '../utils'

interface MetricFormProps {
  metricName: string
  metricType: MetricType
  labels: string
  stepValue: number
  minValue?: number
  maxValue?: number
  pasteText: string
  onNameChange: (value: string) => void
  onTypeChange: (value: MetricType) => void
  onLabelsChange: (value: string) => void
  onStepChange: (value: number) => void
  onMinChange: (value?: number) => void
  onMaxChange: (value?: number) => void
  onPasteChange: (value: string) => void
  onAdd: () => void
  onAddParsed: () => void
}

export function MetricForm({
  metricName,
  metricType,
  labels,
  stepValue,
  minValue,
  maxValue,
  pasteText,
  onNameChange,
  onTypeChange,
  onLabelsChange,
  onStepChange,
  onMinChange,
  onMaxChange,
  onPasteChange,
  onAdd,
  onAddParsed,
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

  const handleAddParsed = () => {
    if (!pasteText.trim()) {
      message.error('Please paste a full metric line first')
      return
    }
    onAddParsed()
  }

  return (
    <Card style={{ marginBottom: 24, background: '#fff', borderColor: '#d9d9d9' }}>
      <Row gutter={16} align="middle">
        <Col xs={24} sm={8} md={5}>
          <Input
            placeholder="Metric name (e.g. http_requests_total)"
            value={metricName}
            onChange={(e) => onNameChange(e.target.value)}
            onPressEnter={handleAdd}
          />
        </Col>
        <Col xs={24} sm={8} md={3}>
          <Select style={{ width: '100%' }} value={metricType} onChange={onTypeChange} options={metricTypeOptions} />
        </Col>
        <Col xs={24} sm={8} md={7}>
          <Tooltip title="支持 k=v 逗号分隔或 {k=&quot;v&quot;} 格式；label 多候选值用 | 分隔（如 job=a|b），生成时随机取一个">
            <Input
              placeholder="Labels (e.g. method=GET, status=200; multi: job=a|b)"
              value={labels}
              onChange={(e) => onLabelsChange(e.target.value)}
              onPressEnter={handleAdd}
            />
          </Tooltip>
        </Col>
        <Col xs={8} sm={8} md={2}>
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
        <Col xs={8} sm={8} md={2}>
          <Tooltip title="生成值下限 (Min value)">
            <InputNumber
              style={{ width: '100%' }}
              placeholder="Min"
              value={minValue}
              onChange={(v) => onMinChange(v ?? undefined)}
            />
          </Tooltip>
        </Col>
        <Col xs={8} sm={8} md={2}>
          <Tooltip title="生成值上限 (Max value)">
            <InputNumber
              style={{ width: '100%' }}
              placeholder="Max"
              value={maxValue}
              onChange={(v) => onMaxChange(v ?? undefined)}
            />
          </Tooltip>
        </Col>
        <Col xs={24} sm={24} md={3}>
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
      <Row gutter={16} align="middle" style={{ marginTop: 12 }}>
        <Col xs={24} md={21}>
          <Tooltip title="直接粘贴整条 metric（含 labels），点击 Add 自动解析生成">
            <Input
              allowClear
              placeholder='Paste full metric, e.g. geo_healthy_alarm_gauges{app="combo-smf2-rmsvc", job="combo-smf2-rmsvc", ...}'
              value={pasteText}
              onChange={(e) => onPasteChange(e.target.value)}
              onPressEnter={handleAddParsed}
            />
          </Tooltip>
        </Col>
        <Col xs={24} md={3}>
          <Button
            type="primary"
            ghost
            icon={<PlusOutlined />}
            onClick={handleAddParsed}
            disabled={!pasteText.trim()}
            block
          >
            Add
          </Button>
        </Col>
      </Row>
    </Card>
  )
}
