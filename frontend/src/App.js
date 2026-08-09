import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import Landing from "@/pages/Landing";
import AuthPage from "@/pages/AuthPage";
import PatientDashboard from "@/pages/PatientDashboard";
import PharmacyDashboard from "@/pages/PharmacyDashboard";

function Protected({ role, children }) {
  const { user, loading } = useAuth();
  if (loading)
    return <div className="p-12 text-slate-500 font-mono text-sm">Loading…</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (role && user.role !== role)
    return <Navigate to={user.role === "pharmacy" ? "/pharmacy" : "/patient"} replace />;
  return children;
}

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <BrowserRouter>
          <Navbar />
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route
              path="/patient"
              element={
                <Protected role="patient">
                  <PatientDashboard />
                </Protected>
              }
            />
            <Route
              path="/pharmacy"
              element={
                <Protected role="pharmacy">
                  <PharmacyDashboard />
                </Protected>
              }
            />
          </Routes>
        </BrowserRouter>
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </div>
  );
}

export default App;
