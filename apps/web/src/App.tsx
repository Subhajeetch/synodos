import { Navigate, Route, Routes } from "react-router";
import { AppLayout } from "@/components/app-layout";
import { PublicOnly, RequireAuth } from "@/components/route-guards";
import { LoginPage, SignupPage } from "@/pages/auth";
import { EditorPage } from "@/pages/editor";
import OverviewPage from "@/pages/overview";
import ProfilePage from "@/pages/profile";
import SettingsPage from "@/pages/settings";

export default function App() {
  return (
    <Routes>
      <Route element={<PublicOnly />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Navigate to="/dashboard/overview" replace />} />
          <Route path="/dashboard/overview" element={<OverviewPage />} />
          <Route path="/dashboard/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
        {/* the editor gets its own full-screen layout later */}
        <Route path="/docs/:id" element={<EditorPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard/overview" replace />} />
    </Routes>
  );
}
