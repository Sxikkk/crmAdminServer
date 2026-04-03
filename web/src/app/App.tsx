import { ConfigProvider } from "antd";
import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import { AuthProvider } from "../features/auth/AuthContext";

export function App() {
  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#0b6e4f",
          borderRadius: 10
        }
      }}
    >
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </ConfigProvider>
  );
}
