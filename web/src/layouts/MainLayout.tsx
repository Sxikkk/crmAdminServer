import { Button, Layout, Space, Typography } from "antd";
import { BulbOutlined } from "@ant-design/icons";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useThemeMode } from "../features/theme/ThemeContext";

const { Header, Content } = Layout;

export function MainLayout() {
  const location = useLocation();
  const inStaff = location.pathname.startsWith("/staff");
  const { isDark, toggleTheme } = useThemeMode();

  return (
    <Layout className="main-layout">
      <Header className="main-header">
        <Typography.Title level={4} className="main-logo">
          CRM Админка
        </Typography.Title>
        <Space>
          <Button icon={<BulbOutlined />} onClick={toggleTheme}>
            {isDark ? "Светлая" : "Тёмная"}
          </Button>
          <Button type={!inStaff ? "primary" : "default"}>
            <Link to="/">Публичная</Link>
          </Button>
          <Button type={inStaff ? "primary" : "default"}>
            <Link to="/staff/login">Сотрудники</Link>
          </Button>
        </Space>
      </Header>
      <Content className="main-content">
        <Outlet />
      </Content>
    </Layout>
  );
}
