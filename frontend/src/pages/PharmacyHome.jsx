import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Store, ArrowRight, ShieldAlert, Snowflake, Star, Bell, Clock, ListFilter,
  RefreshCw, DollarSign, Check, MessageSquare, Activity, Users,
} from "lucide-react";

const KPIS = [
  ["In queue", "12", "text-blue-600"],
  ["Watchlist alerts", "3", "text-red-600"],
  ["Accepted today", "8", "text-emerald-600"],
  ["Earnings", "$23.50", "text-slate-900"],
];

const QUEUE = [
  { name: "Ozempic", dd: "0.5mg · injection pen", tags: [["Fridge", "blue"], ["Specialty", "indigo"], ["Fill today", "amber"]], watch: true },
  { name: "Adderall XR", dd: "20mg · capsule", tags: [["Schedule II", "red"]], watch: true },
  { name: "Amoxicillin", dd: "500mg · capsule", tags: [["Clarifying", "amber"]], watch: false },
  { name: "Lantus", dd: "100 u/mL · injection", tags: [["Fridge", "blue"]], watch: false },
];

const TAG_CLS = {
  red: "bg-red-50 text-red-700 border-red-100",
  blue: "bg-blue-50 text-blue-700 border-blue-100",
  indigo: "bg-indigo-50 text-indigo-700 border-indigo-100",
  amber: "bg-amber-50 text-amber-700 border-amber-100",
};

const FEATURES = [
  { icon: ListFilter, title: "Clinical Filters", text: "Slice the queue by Schedule II, III–V, Fridge and Specialty in one tap." },
  { icon: Bell, title: "Watchlist Alerts", text: "Get flagged the instant a request matches the drugs you watch." },
  { icon: RefreshCw, title: "AI Refinement Loop", text: "Reject with a reason — AI refines the request and returns it to the queue." },
  { icon: DollarSign, title: "Post-payment Earnings", text: "Earn $0.50 for every clinical update you push to a matched patient." },
];

export default function PharmacyHome() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const enter = () => navigate(user && user.role === "pharmacy" ? "/pharmacy" : "/auth");

  return (
    <main className="bg-slate-50">
      {/* Hero */}
      <section className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-16 lg:py-20 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
          <div className="lg:col-span-5">
            <Badge className="mb-5 bg-white/10 text-blue-200 hover:bg-white/10 border border-white/10 rounded-full px-3 py-1 font-medium">
              <Store className="w-3.5 h-3.5 mr-1.5" /> MedFind for Pharmacies
            </Badge>
            <h1 className="font-heading text-4xl sm:text-5xl font-black tracking-tighter leading-[1.05]">
              Turn incoming demand into a <span className="text-blue-400">clean, filterable queue.</span>
            </h1>
            <p className="mt-5 text-lg text-slate-300 leading-relaxed max-w-lg">
              A real-time operational dashboard for pharmacy teams — triage blind requests with clinical
              filters, watchlist alerts, and an AI refinement loop, then accept in one click.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button data-testid="pharmacy-enter-btn" onClick={enter}
                className="rounded-full h-12 px-6 text-base bg-blue-600 hover:bg-blue-500 active:scale-95 transition-transform gap-2">
                Open dashboard <ArrowRight className="w-4 h-4" />
              </Button>
              <Button data-testid="pharmacy-signin-btn" variant="outline" onClick={() => navigate("/auth")}
                className="rounded-full h-12 px-6 text-base border-white/20 bg-transparent text-white hover:bg-white/10">
                Sign in
              </Button>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm text-slate-400">
              <span className="flex items-center gap-1.5"><Activity className="w-4 h-4 text-blue-400" /> Live queue</span>
              <span className="flex items-center gap-1.5"><Users className="w-4 h-4 text-blue-400" /> Blind by default</span>
              <span className="flex items-center gap-1.5"><DollarSign className="w-4 h-4 text-blue-400" /> Earn on updates</span>
            </div>
          </div>

          {/* Dashboard preview */}
          <div className="lg:col-span-7">
            <div className="rounded-2xl bg-white shadow-2xl overflow-hidden border border-slate-200" data-testid="dashboard-preview">
              {/* window chrome */}
              <div className="h-10 bg-slate-100 border-b border-slate-200 flex items-center gap-1.5 px-4">
                <span className="w-3 h-3 rounded-full bg-red-400" />
                <span className="w-3 h-3 rounded-full bg-amber-400" />
                <span className="w-3 h-3 rounded-full bg-emerald-400" />
                <span className="ml-3 text-xs font-mono text-slate-400">app.medfind.com/pharmacy</span>
              </div>
              <div className="p-5">
                {/* KPIs */}
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {KPIS.map(([label, val, color]) => (
                    <div key={label} className="rounded-lg border border-slate-200 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
                      <p className={`font-heading font-black text-xl mt-0.5 ${color}`}>{val}</p>
                    </div>
                  ))}
                </div>
                {/* Filters */}
                <div className="flex items-center gap-2 flex-wrap mb-4 text-xs">
                  <span className="text-slate-400 flex items-center gap-1"><ListFilter className="w-3.5 h-3.5" /> Filters:</span>
                  {[["Schedule II", ShieldAlert, "red"], ["Fridge", Snowflake, "blue"], ["Specialty", Star, "indigo"]].map(([l, Ic, c]) => (
                    <span key={l} className={`flex items-center gap-1 px-2.5 py-1 rounded-full border ${TAG_CLS[c]}`}>
                      <Ic className="w-3 h-3" /> {l}
                    </span>
                  ))}
                  <span className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-red-100 bg-red-50 text-red-700">
                    <Bell className="w-3 h-3" /> Watchlist only
                  </span>
                </div>
                {/* Queue */}
                <div className="space-y-2">
                  {QUEUE.map((q) => (
                    <div key={q.name} className={`rounded-lg border p-3 flex items-center justify-between gap-3 ${q.watch ? "border-red-200 ring-1 ring-red-100" : "border-slate-200"}`}>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {q.watch && <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-red-600 text-white flex items-center gap-1"><Bell className="w-2.5 h-2.5" />Watch</span>}
                          <span className="font-heading font-bold text-sm text-slate-900">{q.name}</span>
                          <span className="text-xs text-slate-500">{q.dd}</span>
                        </div>
                        <div className="flex gap-1.5 flex-wrap mt-1.5">
                          {q.tags.map(([t, c]) => (
                            <span key={t} className={`text-[10px] px-2 py-0.5 rounded-full border ${TAG_CLS[c]}`}>{t}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className="w-7 h-7 rounded-full border border-slate-200 flex items-center justify-center text-slate-400"><MessageSquare className="w-3.5 h-3.5" /></span>
                        <span className="px-3 h-7 rounded-full bg-emerald-600 text-white text-xs font-medium flex items-center gap-1"><Check className="w-3.5 h-3.5" />Accept</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <p className="text-center text-xs text-slate-400 mt-3">Preview — sample data</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-5 sm:px-8 py-16">
        <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 mb-2">Built for the bench, not the boardroom</h2>
        <p className="text-slate-500 mb-10 max-w-2xl">Everything your team needs to work the queue fast and safely.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border border-slate-200 bg-white p-6 hover:shadow-[0_8px_30px_-4px_rgba(15,23,42,0.12)] hover:-translate-y-0.5 transition-transform">
              <div className="w-11 h-11 rounded-lg bg-slate-900 flex items-center justify-center mb-4">
                <f.icon className="w-5 h-5 text-blue-400" />
              </div>
              <h3 className="font-heading font-semibold text-lg text-slate-900">{f.title}</h3>
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{f.text}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 rounded-2xl bg-slate-900 text-white p-8 sm:p-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div>
            <h3 className="font-heading text-2xl font-bold tracking-tight">Ready to work your queue?</h3>
            <p className="text-slate-300 mt-1">Sign in and start accepting requests in minutes.</p>
          </div>
          <Button data-testid="pharmacy-cta-btn" onClick={enter}
            className="rounded-full h-12 px-8 text-base bg-blue-600 hover:bg-blue-500 active:scale-95 transition-transform gap-2 shrink-0">
            Open dashboard <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
        <p className="mt-6 text-sm text-slate-400 text-center">
          Looking for medication as a patient?{" "}
          <button data-testid="pharmacy-to-patient-link" onClick={() => navigate("/")} className="text-blue-600 font-medium hover:underline">
            Go to the patient app
          </button>
        </p>
      </section>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-slate-400">
        © 2026 MedFind for Pharmacies · Privacy · Terms · Contact
      </footer>
    </main>
  );
}
