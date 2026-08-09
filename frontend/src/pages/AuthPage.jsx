import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Pill, User, Store, Loader2 } from "lucide-react";

export default function AuthPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [role, setRole] = useState("patient");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    email: "", password: "", name: "", phone: "",
    pharmacy_name: "", address: "",
    delivery_free: false, delivery_fee: 0, can_fill_today: false,
    has_fridge: false, specialties: false,
  });

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const redirect = (user) => {
    if (user.role === "pharmacy") navigate("/pharmacy");
    else navigate("/patient");
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      let user;
      if (mode === "login") {
        user = await login(form.email, form.password);
      } else {
        const payload = {
          email: form.email, password: form.password, name: form.name, role, phone: form.phone,
        };
        if (role === "pharmacy") {
          Object.assign(payload, {
            pharmacy_name: form.pharmacy_name, address: form.address,
            delivery_free: form.delivery_free, delivery_fee: Number(form.delivery_fee) || 0,
            can_fill_today: form.can_fill_today, has_fridge: form.has_fridge, specialties: form.specialties,
            schedules: ["III-V"], watchlist: [],
          });
        }
        user = await register(payload);
      }
      toast.success(`Welcome${user.name ? ", " + user.name : ""}!`);
      redirect(user);
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setBusy(false);
    }
  };

  const fillDemo = (email) => {
    setMode("login");
    set("email", email);
    set("password", "demo123");
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] grid grid-cols-1 lg:grid-cols-2">
      {/* left visual */}
      <div className="hidden lg:block relative">
        <img
          src="https://images.unsplash.com/photo-1580281657702-257584239a55?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAxODF8MHwxfHNlYXJjaHwzfHxjbGVhbiUyMG1vZGVybiUyMG1lZGljYWwlMjBjbGluaWN8ZW58MHx8fHwxNzg2MjkyMjkxfDA&ixlib=rb-4.1.0&q=85"
          alt="Clean modern medical clinic"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 to-slate-900/10" />
        <div className="absolute bottom-10 left-10 right-10 text-white">
          <Pill className="w-8 h-8 mb-3" />
          <p className="font-heading text-2xl font-bold tracking-tight max-w-sm">
            The private way to source medication, together with your local pharmacies.
          </p>
        </div>
      </div>

      {/* form */}
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <h1 className="font-heading text-3xl font-black tracking-tight text-slate-900">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="text-slate-500 mt-1.5 text-sm">
            {mode === "login" ? "Sign in to continue your request." : "Join MedFind in a few seconds."}
          </p>

          {mode === "register" && (
            <div className="mt-6 grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
              {[
                ["patient", "Patient", User],
                ["pharmacy", "Pharmacy", Store],
              ].map(([val, label, Icon]) => (
                <button
                  key={val}
                  data-testid={`role-${val}-btn`}
                  onClick={() => setRole(val)}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    role === val ? "bg-white text-blue-700 shadow-sm" : "text-slate-500"
                  }`}
                >
                  <Icon className="w-4 h-4" /> {label}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === "register" && (
              <div>
                <Label className="text-sm">{role === "pharmacy" ? "Contact name" : "Full name"}</Label>
                <Input data-testid="auth-name" required value={form.name} onChange={(e) => set("name", e.target.value)}
                  className="mt-1.5 rounded-lg focus-visible:ring-blue-500/20" placeholder="Jordan Rivera" />
              </div>
            )}
            <div>
              <Label className="text-sm">Email</Label>
              <Input data-testid="auth-email" type="email" required value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className="mt-1.5 rounded-lg focus-visible:ring-blue-500/20" placeholder="you@email.com" />
            </div>
            <div>
              <Label className="text-sm">Password</Label>
              <Input data-testid="auth-password" type="password" required value={form.password}
                onChange={(e) => set("password", e.target.value)}
                className="mt-1.5 rounded-lg focus-visible:ring-blue-500/20" placeholder="••••••••" />
            </div>

            {mode === "register" && (
              <div>
                <Label className="text-sm">Phone</Label>
                <Input data-testid="auth-phone" value={form.phone} onChange={(e) => set("phone", e.target.value)}
                  className="mt-1.5 rounded-lg focus-visible:ring-blue-500/20" placeholder="+1-555-0100" />
              </div>
            )}

            {mode === "register" && role === "pharmacy" && (
              <div className="space-y-4 rounded-xl border border-slate-200 p-4 bg-slate-50">
                <div>
                  <Label className="text-sm">Pharmacy name</Label>
                  <Input data-testid="auth-pharmacy-name" required value={form.pharmacy_name}
                    onChange={(e) => set("pharmacy_name", e.target.value)}
                    className="mt-1.5 rounded-lg bg-white" placeholder="Downtown Rx" />
                </div>
                <div>
                  <Label className="text-sm">Address</Label>
                  <Input data-testid="auth-address" value={form.address} onChange={(e) => set("address", e.target.value)}
                    className="mt-1.5 rounded-lg bg-white" placeholder="120 Market St" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ["delivery_free", "Free delivery"],
                    ["can_fill_today", "Fill today"],
                    ["has_fridge", "Cold storage"],
                    ["specialties", "Specialty meds"],
                  ].map(([k, label]) => (
                    <label key={k} className="flex items-center justify-between text-sm text-slate-700 bg-white rounded-lg px-3 py-2 border border-slate-200">
                      {label}
                      <Switch data-testid={`auth-${k}`} checked={form[k]} onCheckedChange={(v) => set(k, v)} />
                    </label>
                  ))}
                </div>
                <div>
                  <Label className="text-sm">Delivery fee ($)</Label>
                  <Input data-testid="auth-delivery-fee" type="number" value={form.delivery_fee}
                    onChange={(e) => set("delivery_fee", e.target.value)} className="mt-1.5 rounded-lg bg-white" />
                </div>
              </div>
            )}

            <Button data-testid="auth-submit-btn" type="submit" disabled={busy}
              className="w-full rounded-full h-11 bg-blue-600 hover:bg-blue-700 active:scale-95 transition-transform">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === "login" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <p className="mt-5 text-sm text-slate-500 text-center">
            {mode === "login" ? "New here?" : "Already have an account?"}{" "}
            <button data-testid="auth-toggle-btn" onClick={() => setMode(mode === "login" ? "register" : "login")}
              className="text-blue-600 font-medium hover:underline">
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </p>

          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Demo accounts (pw: demo123)</p>
            <div className="flex flex-wrap gap-2">
              <button data-testid="demo-patient-btn" onClick={() => fillDemo("patient@demo.com")}
                className="text-xs px-3 py-1.5 rounded-full bg-white border border-slate-200 hover:border-blue-400 transition-colors">
                patient@demo.com
              </button>
              <button data-testid="demo-pharmacy-btn" onClick={() => fillDemo("downtown@demo.com")}
                className="text-xs px-3 py-1.5 rounded-full bg-white border border-slate-200 hover:border-blue-400 transition-colors">
                downtown@demo.com
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
