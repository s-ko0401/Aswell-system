import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./components/AppLayout";
import { RequireAdmin } from "./components/RequireAdmin";
import { RequireAuth } from "./components/RequireAuth";
import { LoginPage } from "./pages/LoginPage";
import { HomePage } from "./pages/HomePage";
import { UsersPage } from "./pages/99_Setting/UsersPage";
import { TemplatesPage } from "./pages/01_Training/01_TemplatesPage/TemplatesPage";
import { TrainingListPage } from "./pages/01_Training/02_TrainingListPage/TrainingListPage";
import { CalendarPage } from "./pages/02_Calendars/CalendarPage";
import { Toaster } from "./components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <Routes>
        <Route element={<AppLayout />}>
          <Route element={<RequireAuth />}>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<HomePage />} />
            <Route path="/training/templates" element={<TemplatesPage />} />
            <Route path="/training/list" element={<TrainingListPage />} />
            <Route path="/calendars" element={<CalendarPage />} />
            <Route element={<RequireAdmin />}>
              <Route path="/settings/users" element={<UsersPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="/login" element={<LoginPage />} />
      </Routes>
      <Toaster />
    </ThemeProvider>
  );
}

export default App;
