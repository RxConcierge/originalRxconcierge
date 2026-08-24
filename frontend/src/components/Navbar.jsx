import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Pill, LogOut, LayoutDashboard } from "lucide-react";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const dashPath = user?.role === "pharmacy" ? "/pharmacy" : "/patient";

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
        <Link to="/" data-testid="nav-logo" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center">
            <Pill className="w-5 h-5 text-white" strokeWidth={2.4} />
          </div>
          <span className="font-heading font-extrabold text-xl tracking-tight text-slate-900">
            MedFind
          </span>
        </Link>

        <nav className="flex items-center gap-2 sm:gap-4">
          {!user && (
            <>
              <Link
                to="/"
                data-testid="nav-for-patients"
                className="hidden sm:block text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors px-2"
              >
                For Patients
              </Link>
              <Link
                to="/pharmacy-portal"
                data-testid="nav-for-pharmacies"
                className="hidden sm:block text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors px-2"
              >
                For Pharmacies
              </Link>
              <Button
                data-testid="nav-signin-btn"
                variant="ghost"
                onClick={() => navigate("/auth")}
                className="rounded-full"
              >
                Sign in
              </Button>
              <Button
                data-testid="nav-getstarted-btn"
                onClick={() => navigate("/auth")}
                className="rounded-full bg-blue-600 hover:bg-blue-700 active:scale-95 transition-transform"
              >
                Get started
              </Button>
            </>
          )}
          {user && (
            <>
              <span className="hidden sm:inline text-sm text-slate-500">
                {user.role === "pharmacy" ? user.pharmacy_name || user.name : user.name}
              </span>
              <Button
                data-testid="nav-dashboard-btn"
                variant="ghost"
                onClick={() => navigate(dashPath)}
                className="rounded-full gap-2"
              >
                <LayoutDashboard className="w-4 h-4" /> Dashboard
              </Button>
              <Button
                data-testid="nav-logout-btn"
                variant="outline"
                onClick={() => {
                  logout();
                  navigate("/");
                }}
                className="rounded-full gap-2"
              >
                <LogOut className="w-4 h-4" /> Logout
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
