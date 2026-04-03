import { Button, Card, Form, Input, Select, Space, Typography, message } from "antd";
import { createRequest } from "../api";
import type { OrganizationType } from "../types";
import { getErrorMessage } from "../shared/errors";

type PublicRequestForm = {
  organizationName: string;
  organizationType: OrganizationType;
  inn?: string;
  ogrn?: string;
  email?: string;
  phone?: string;
  website?: string;
  city?: string;
  requestedByEmail: string;
};

const organizationTypes: OrganizationType[] = ["Company", "Individual", "Other"];

export function PublicRequestPage() {
  const [form] = Form.useForm<PublicRequestForm>();
  const [messageApi, contextHolder] = message.useMessage();

  async function onSubmit(values: PublicRequestForm) {
    try {
      await createRequest({
        ...values,
        inn: values.inn || undefined,
        ogrn: values.ogrn || undefined,
        email: values.email || undefined,
        phone: values.phone || undefined,
        website: values.website || undefined,
        city: values.city || undefined
      });
      form.resetFields();
      messageApi.success("Request sent");
    } catch (error: unknown) {
      messageApi.error(getErrorMessage(error));
    }
  }

  return (
    <div className="page-wrap">
      {contextHolder}
      <Card className="page-card">
        <Space direction="vertical" size={20} style={{ width: "100%" }}>
          <Typography.Title level={3}>Organization Request</Typography.Title>
          <Typography.Text type="secondary">
            Create a request for organization onboarding. Staff will review and approve it.
          </Typography.Text>
          <Form layout="vertical" form={form} onFinish={onSubmit} initialValues={{ organizationType: "Company" }}>
            <Form.Item name="organizationName" label="Organization Name" rules={[{ required: true }]}>
              <Input placeholder="Example LLC" />
            </Form.Item>
            <Form.Item name="organizationType" label="Organization Type" rules={[{ required: true }]}>
              <Select options={organizationTypes.map((type) => ({ value: type, label: type }))} />
            </Form.Item>
            <Form.Item name="inn" label="INN">
              <Input />
            </Form.Item>
            <Form.Item name="ogrn" label="OGRN">
              <Input />
            </Form.Item>
            <Form.Item name="email" label="Organization Email">
              <Input type="email" />
            </Form.Item>
            <Form.Item name="phone" label="Phone">
              <Input />
            </Form.Item>
            <Form.Item name="website" label="Website">
              <Input />
            </Form.Item>
            <Form.Item name="city" label="City">
              <Input />
            </Form.Item>
            <Form.Item name="requestedByEmail" label="Requester Email" rules={[{ required: true, type: "email" }]}>
              <Input type="email" />
            </Form.Item>
            <Button type="primary" htmlType="submit">
              Send Request
            </Button>
          </Form>
        </Space>
      </Card>
    </div>
  );
}
