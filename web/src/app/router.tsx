import { Navigate, createBrowserRouter } from "react-router-dom";
import { PublicRequestPage } from "../pages/PublicRequestPage";
import { StaffLoginPage } from "../pages/StaffLoginPage";
import { StaffRequestsPage } from "../pages/staff/StaffRequestsPage";
import { StaffOrganizationsPage } from "../pages/staff/StaffOrganizationsPage";
import { MainLayout } from "../layouts/MainLayout";
import { StaffLayout } from "../layouts/StaffLayout";
import { ProtectedRoute } from "../features/auth/ProtectedRoute";

export const router = createBrowserRouter([
  {
    element: <MainLayout />,
    children: [
      { path: "/", element: <PublicRequestPage /> },
      { path: "/staff/login", element: <StaffLoginPage /> }
    ]
  },
  {
    path: "/staff",
    element: (
      <ProtectedRoute>
        <StaffLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="/staff/requests" replace /> },
      { path: "requests", element: <StaffRequestsPage /> },
      {
        path: "organizations",
        element: (
          <ProtectedRoute allowedRoles={["admin", "manager"]}>
            <StaffOrganizationsPage />
          </ProtectedRoute>
        )
      }
    ]
  },
  { path: "*", element: <Navigate to="/" replace /> }
]);
