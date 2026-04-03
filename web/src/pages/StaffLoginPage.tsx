import { useEffect } from "react";
import { Button, Card, Form, Input, Space, Typography, message } from "antd";
import { useNavigate } from "react-router-dom";
import { login } from "../api";
import { useAuth } from "../features/auth/AuthContext";
import { getErrorMessage } from "../shared/errors";

type LoginForm = {
  username: string;
  password: string;
};

export function StaffLoginPage() {
  const navigate = useNavigate();
  const { isAuthenticated, login: loginByToken } = useAuth();
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/staff/requests", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  async function onFinish(values: LoginForm) {
    try {
      const auth = await login(values.username, values.password);
      loginByToken(auth.accessToken);
      messageApi.success(`Logged in as ${auth.user.username}`);
      navigate("/staff/requests", { replace: true });
    } catch (error: unknown) {
      messageApi.error(getErrorMessage(error));
    }
  }

  return (
    <div className="page-wrap">
      {contextHolder}
      <Card className="auth-card">
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Typography.Title level={3}>Staff Login</Typography.Title>
          <Form<LoginForm> layout="vertical" onFinish={onFinish}>
            <Form.Item name="username" label="Username" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="password" label="Password" rules={[{ required: true }]}>
              <Input.Password />
            </Form.Item>
            <Button type="primary" htmlType="submit">
              Login
            </Button>
          </Form>
        </Space>
      </Card>
    </div>
  );
}
