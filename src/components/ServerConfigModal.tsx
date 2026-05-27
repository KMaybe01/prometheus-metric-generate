import { CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons'
import { Alert, Button, Form, FormInstance, Input, Modal } from 'antd'
import { useEffect, useState } from 'react'
import { ConnectionStatus, ServerConfig } from '../types'

interface ServerConfigModalProps {
  visible: boolean
  connectionStatus: ConnectionStatus
  connectionError: string
  form: FormInstance<ServerConfig>
  onCancel: () => void
  onSave: () => void
  onTestConnection: () => void
  onResetConnection: () => void
}

export function ServerConfigModal({
  visible,
  connectionStatus,
  connectionError,
  form,
  onCancel,
  onSave,
  onTestConnection,
  onResetConnection,
}: ServerConfigModalProps) {
  const [submittable, setSubmittable] = useState(false)

  // Watch all values to trigger re-validation
  const values = Form.useWatch<ServerConfig>([], form)

  // Reset connection status when modal opens or URL changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: values?.pushGatewayUrl is intentional - re-run on URL change
  useEffect(() => {
    if (visible) {
      onResetConnection()
    }
  }, [visible, values?.pushGatewayUrl, onResetConnection])

  useEffect(() => {
    form
      .validateFields({ validateOnly: true })
      .then(() => setSubmittable(connectionStatus === 'success'))
      .catch(() => setSubmittable(false))
  }, [form, connectionStatus])

  return (
    <Modal
      title="Server Configuration"
      open={visible}
      onCancel={onCancel}
      onOk={onSave}
      okText="Save"
      okButtonProps={{ disabled: !submittable }}
      width={600}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="pushGatewayUrl"
          label="Push Gateway URL"
          rules={[{ required: true, message: 'Please enter Push Gateway URL' }]}
        >
          <Input placeholder="http://pushgateway-grafana-dev.apps.ocp.site" />
        </Form.Item>
        <Form.Item
          name="interval"
          label="Push Interval (ms)"
          rules={[
            { required: true, message: 'Please enter Push Interval' },
            {
              validator: async (_, value) => {
                if (value && Number(value) < 500) {
                  return Promise.reject(new Error('Interval must be at least 500ms'))
                }
                return Promise.resolve()
              },
            },
          ]}
        >
          <Input type="number" placeholder="2000" min={500} />
        </Form.Item>
        <Form.Item>
          <Button
            type="dashed"
            block
            onClick={onTestConnection}
            loading={connectionStatus === 'testing'}
            icon={
              connectionStatus === 'success' ? (
                <CheckCircleOutlined />
              ) : connectionStatus === 'failed' ? (
                <CloseCircleOutlined />
              ) : undefined
            }
          >
            Test Connection
          </Button>
        </Form.Item>
        {connectionError && <Alert type="error" message={connectionError} showIcon />}
      </Form>
    </Modal>
  )
}
