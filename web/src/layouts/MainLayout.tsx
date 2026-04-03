import { Button, Layout, Space, Typography } from "antd";
import { Link, Outlet, useLocation } from "react-router-dom";

const { Header, Content } = Layout;

export function MainLayout() {
  const location = useLocation();
  const inStaff = location.pathname.startsWith("/staff");

  return (
    <Layout className="main-layout">
      <Header className="main-header">
        <Typography.Title level={4} className="main-logo">
          CRM Admin
        </Typography.Title>
        <Space>
          <Button type={!inStaff ? "primary" : "default"}>
            <Link to="/">Public</Link>
          </Button>
          <Button type={inStaff ? "primary" : "default"}>
            <Link to="/staff/login">Staff</Link>
          </Button>
        </Space>
      </Header>
      <Content className="main-content">
        <Outlet />
      </Content>
    </Layout>
  );
}
