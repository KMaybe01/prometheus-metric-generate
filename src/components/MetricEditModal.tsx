import { DeleteOutlined, ImportOutlined, PlusOutlined } from '@ant-design/icons'
import { Button, Card, Col, Form, Input, InputNumber, Modal, Row, Select, Typography, message } from 'antd'
import { useEffect, useState } from 'react'
import { MetricConfig, MetricType } from '../types'
import { extractLabelSets, metricTypeOptions, sameSeriesLabels } from '../utils'

const { Text } = Typography

interface SeriesFormValue {
  id: string
  labels: { key: string; value: string }[]
}

const rowsToLabels = (rows: { key: string; value: string }[] | undefined): Record<string, string> => {
  const labels: Record<string, string> = {}
  for (const row of rows ?? []) {
    const key = row.key?.trim()
    if (key) labels[key] = row.value ?? ''
  }
  return labels
}

interface MetricEditValues {
  name: string
  type: MetricType
  stepValue: number
  minValue?: number
  maxValue?: number
  series: SeriesFormValue[]
}

export interface MetricEditResult {
  name: string
  type: MetricType
  stepValue: number
  minValue?: number
  maxValue?: number
  series: { id: string; labels: Record<string, string> }[]
}

interface MetricEditModalProps {
  visible: boolean
  metric: MetricConfig | null
  onCancel: () => void
  onSave: (result: MetricEditResult) => void
}

const newSeriesId = () => `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

export function MetricEditModal({ visible, metric, onCancel, onSave }: MetricEditModalProps) {
  const [form] = Form.useForm<MetricEditValues>()
  const [batchText, setBatchText] = useState('')

  useEffect(() => {
    if (visible && metric) {
      form.setFieldsValue({
        name: metric.name,
        type: metric.type,
        stepValue: metric.stepValue,
        minValue: metric.minValue,
        maxValue: metric.maxValue,
        series: metric.series.map((s) => ({
          id: s.id,
          labels: Object.entries(s.labels).map(([key, value]) => ({ key, value })),
        })),
      })
      setBatchText('')
    }
  }, [visible, metric, form])

  // Batch parse: each {...} block (or k=v text without braces) becomes one series
  const handleBatchParse = () => {
    const sets = extractLabelSets(batchText)
    if (sets.length === 0) {
      message.error('No label sets found. Expected {label="value", ...} blocks or label=value pairs')
      return
    }
    const current: SeriesFormValue[] = form.getFieldValue('series') ?? []
    const added: SeriesFormValue[] = []
    let duplicates = 0
    for (const labels of sets) {
      const exists = (s: SeriesFormValue) => sameSeriesLabels(rowsToLabels(s.labels), labels)
      if ([...current, ...added].some(exists)) {
        duplicates++
        continue
      }
      added.push({
        id: newSeriesId(),
        labels: Object.entries(labels).map(([key, value]) => ({ key, value })),
      })
    }
    if (added.length === 0) {
      message.warning('All parsed label combinations already exist as series')
      return
    }
    form.setFieldValue('series', [...current, ...added])
    setBatchText('')
    message.success(`Added ${added.length} series${duplicates > 0 ? `, skipped ${duplicates} duplicates` : ''}`)
  }

  const handleOk = async () => {
    try {
      const values = await form.validateFields()
      if (values.minValue != null && values.maxValue != null && values.minValue > values.maxValue) {
        message.error('Min value must be less than or equal to Max value')
        return
      }
      if (!values.series || values.series.length === 0) {
        message.error('At least one series is required')
        return
      }

      const series = values.series.map((item) => {
        const labels: Record<string, string> = {}
        for (const label of item.labels ?? []) {
          const key = label.key?.trim()
          if (key) labels[key] = label.value ?? ''
        }
        return { id: item.id || newSeriesId(), labels }
      })

      // Duplicate label combinations would push identical series twice
      for (let i = 0; i < series.length; i++) {
        for (let j = i + 1; j < series.length; j++) {
          const a = series[i].labels
          const b = series[j].labels
          const keys = Object.keys(a)
          if (keys.length === Object.keys(b).length && keys.every((k) => a[k] === b[k])) {
            message.error('Duplicate label combinations found across series. Please remove or change one of them.')
            return
          }
        }
      }

      onSave({
        name: values.name.trim(),
        type: values.type,
        stepValue: values.stepValue,
        minValue: values.minValue,
        maxValue: values.maxValue,
        series,
      })
    } catch {
      // validation error, keep modal open
    }
  }

  return (
    <Modal
      title="Edit Metric"
      open={visible}
      onCancel={onCancel}
      onOk={handleOk}
      okText="Save"
      destroyOnHidden
      width={680}
    >
      <Form form={form} layout="vertical">
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="name"
              label="Metric Name"
              rules={[{ required: true, message: 'Please enter metric name' }]}
            >
              <Input placeholder="metric name" />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="type" label="Type" rules={[{ required: true }]}>
              <Select options={metricTypeOptions} />
            </Form.Item>
          </Col>
          <Col span={6}>
            <Form.Item name="stepValue" label="Step" rules={[{ required: true, message: 'Please enter step' }]}>
              <InputNumber style={{ width: '100%' }} min={1} placeholder="Step" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="minValue" label="Min Value (生成值下限)">
              <InputNumber style={{ width: '100%' }} placeholder="No limit" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="maxValue" label="Max Value (生成值上限)">
              <InputNumber style={{ width: '100%' }} placeholder="No limit" />
            </Form.Item>
          </Col>
        </Row>

        <Form.Item
          label="批量解析 Series (Batch Parse)"
          style={{ marginBottom: 12 }}
          tooltip="粘贴整条 metric_name{...} 或仅 {...} 部分，可一次粘贴多行/多段，每段解析为一条 series，自动去重"
        >
          <Input.TextArea
            rows={3}
            value={batchText}
            onChange={(e) => setBatchText(e.target.value)}
            placeholder={
              '{app="sgwc-rmsvc", job="sgwc-rmsvc", pod="sgwc-rmsvc-7fd9976689-ltd79", ...}\n可一次粘贴多条，每条 {...} 解析为一个 series'
            }
          />
          <Button
            type="primary"
            ghost
            icon={<ImportOutlined />}
            onClick={handleBatchParse}
            disabled={!batchText.trim()}
            block
            style={{ marginTop: 8 }}
          >
            Batch Parse & Add Series
          </Button>
        </Form.Item>

        <Form.Item
          label="Series (label 组合，同名 metric 可有多条 series)"
          style={{ marginBottom: 8 }}
          tooltip="每条 series 是一组独立 label；label value 支持多候选值，用 | 分隔（如 primary|secondary），每次生成随机取一个"
        >
          <Form.List name="series">
            {(seriesFields, { add: addSeries, remove: removeSeries }) => (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {seriesFields.map((sf) => (
                  <Card
                    size="small"
                    key={sf.key}
                    title={<Text style={{ fontSize: 13 }}>Series {sf.name + 1}</Text>}
                    extra={
                      <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeSeries(sf.name)} />
                    }
                  >
                    <Form.Item name={[sf.name, 'id']} hidden>
                      <Input />
                    </Form.Item>
                    <Form.List name={[sf.name, 'labels']}>
                      {(fields, { add, remove }) => (
                        <>
                          {fields.map((field) => (
                            <Row gutter={8} key={field.key} align="middle" style={{ marginBottom: 8 }}>
                              <Col span={9}>
                                <Form.Item
                                  name={[field.name, 'key']}
                                  noStyle
                                  rules={[{ required: true, message: 'Label key is required' }]}
                                >
                                  <Input placeholder="label key" />
                                </Form.Item>
                              </Col>
                              <Col span={13}>
                                <Form.Item name={[field.name, 'value']} noStyle>
                                  <Input placeholder="label value (多值用 | 分隔: v1|v2)" />
                                </Form.Item>
                              </Col>
                              <Col span={2}>
                                <Button
                                  type="text"
                                  danger
                                  icon={<DeleteOutlined />}
                                  onClick={() => remove(field.name)}
                                />
                              </Col>
                            </Row>
                          ))}
                          <Button
                            type="dashed"
                            icon={<PlusOutlined />}
                            onClick={() => add({ key: '', value: '' })}
                            block
                          >
                            Add Label
                          </Button>
                        </>
                      )}
                    </Form.List>
                  </Card>
                ))}
                <Button
                  type="dashed"
                  icon={<PlusOutlined />}
                  onClick={() => addSeries({ id: newSeriesId(), labels: [{ key: '', value: '' }] })}
                  block
                >
                  Add Series
                </Button>
              </div>
            )}
          </Form.List>
        </Form.Item>
      </Form>
    </Modal>
  )
}
