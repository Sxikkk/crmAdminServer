import { ApartmentOutlined, FileTextOutlined, LogoutOutlined } from "@ant-design/icons";
import { Button, Layout, Menu, Space, Typography } from "antd";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";

const { Header, Sider, Content } = Layout;

export function StaffLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, role } = useAuth();

  return (
    <Layout className="staff-layout">
      <Sider width={240} theme="light" className="staff-sider">
        <div className="staff-brand">CRM Admin</div>
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={[
            { key: "/staff/requests", icon: <FileTextOutlined />, label: "Requests" },
            ...(role === "admin" || role === "manager"
              ? [{ key: "/staff/organizations", icon: <ApartmentOutlined />, label: "Organizations" }]
              : [])
          ]}
          onClick={(event) => navigate(event.key)}
        />
      </Sider>
      <Layout>
        <Header className="staff-header">
          <Typography.Title level={4} className="staff-header-title">
            Staff Panel
          </Typography.Title>
          <Space>
            <Button
              icon={<LogoutOutlined />}
              onClick={() => {
                logout();
                navigate("/staff/login", { replace: true });
              }}
            >
              Logout
            </Button>
          </Space>
        </Header>
        <Content className="staff-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
