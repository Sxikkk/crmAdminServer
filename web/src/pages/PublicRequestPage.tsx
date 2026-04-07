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
const organizationTypeLabels: Record<OrganizationType, string> = {
  Company: "Компания",
  Individual: "ИП",
  Other: "Другое"
};

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
      messageApi.success("Заявка отправлена");
    } catch (error: unknown) {
      messageApi.error(getErrorMessage(error));
    }
  }

  return (
    <div className="page-wrap">
      {contextHolder}
      <Card className="page-card">
        <Space direction="vertical" size={20} style={{ width: "100%" }}>
          <Typography.Title level={3}>Заявка на организацию</Typography.Title>
          <Typography.Text type="secondary">
            Создайте заявку на подключение организации. Сотрудники проверят её и примут решение.
          </Typography.Text>
          <Form layout="vertical" form={form} onFinish={onSubmit} initialValues={{ organizationType: "Company" }}>
            <Form.Item name="organizationName" label="Название организации" rules={[{ required: true }]}>
              <Input placeholder="Например, ООО Ромашка" />
            </Form.Item>
            <Form.Item name="organizationType" label="Тип организации" rules={[{ required: true }]}>
              <Select options={organizationTypes.map((type) => ({ value: type, label: organizationTypeLabels[type] }))} />
            </Form.Item>
            <Form.Item name="inn" label="INN">
              <Input />
            </Form.Item>
            <Form.Item name="ogrn" label="OGRN">
              <Input />
            </Form.Item>
            <Form.Item name="email" label="Email организации">
              <Input type="email" />
            </Form.Item>
            <Form.Item name="phone" label="Телефон">
              <Input />
            </Form.Item>
            <Form.Item name="website" label="Сайт">
              <Input />
            </Form.Item>
            <Form.Item name="city" label="Город">
              <Input />
            </Form.Item>
            <Form.Item name="requestedByEmail" label="Email заявителя" rules={[{ required: true, type: "email" }]}>
              <Input type="email" />
            </Form.Item>
            <Button type="primary" htmlType="submit">
              Отправить заявку
            </Button>
          </Form>
        </Space>
      </Card>
    </div>
  );
}
