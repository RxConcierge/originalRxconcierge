import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import AIChat from "@/components/AIChat";
import CameraMask from "@/components/CameraMask";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck,
  Search,
  Store,
  ArrowRight,
  CheckCircle2,
  Pill,
  Sparkles,
  Lock,
  Truck,
  Star,
} from "lucide-react";

const STEPS = [
  { icon: Search, title: "Identify", text: "Chat with AI to pin down the exact name, dose & form." },
  { icon: Lock, title: "Blind Request", text: "Sign in and post an anonymous request — your identity stays hidden." },
  { icon: Store, title: "Pharmacies bid", text: "Local pharmacies see your request in their live queue." },
  { icon: CheckCircle2, title: "Match & connect", text: "On acceptance, contact details are exchanged securely." },
];

export default function Landing() {
  const [identified, setIdentified] = useState(null);
  const [ready, setReady] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const onIdentified = (med, isReady) => {
    setIdentified(med);
    if (isReady) setReady(true);
  };

  const proceed = () => {
    if (identified) localStorage.setItem("mf_pendingMed", JSON.stringify(identified));
    if (user?.role === "patient") navigate("/patient");
    else if (user?.role === "pharmacy") navigate("/pharmacy");
    else navigate("/auth");
  };

  return (
    <main className="max-w-7xl mx-auto px-5 sm:px-8">
      {/* Hero */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 pt-12 lg:pt-20 pb-10">
        <div className="lg:col-span-6 flex flex-col justify-center animate-fade-up">
          <Badge className="w-fit mb-5 bg-blue-50 text-blue-700 hover:bg-blue-50 border border-blue-100 rounded-full px-3 py-1 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Private-by-design pharmacy marketplace
          </Badge>
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter leading-[1.02] text-slate-900">
            Find the medication you need.{" "}
            <span className="text-blue-600">Stay anonymous</span> until you're matched.
          </h1>
          <p className="mt-6 text-lg text-slate-600 leading-relaxed max-w-xl">
            Start with a quick AI chat to identify your medication — no sign-up, no personal data.
            Post a Blind Request and let local pharmacies compete to fill it.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button
              data-testid="hero-start-btn"
              onClick={() => document.getElementById("chat")?.scrollIntoView({ behavior: "smooth" })}
              className="rounded-full h-12 px-6 text-base bg-blue-600 hover:bg-blue-700 active:scale-95 transition-transform gap-2"
            >
              Start with AI <ArrowRight className="w-4 h-4" />
            </Button>
            <Button
              data-testid="hero-pharmacy-btn"
              variant="outline"
              onClick={() => navigate("/auth")}
              className="rounded-full h-12 px-6 text-base gap-2"
            >
              <Store className="w-4 h-4" /> I'm a pharmacy
            </Button>
          </div>
          <div className="mt-8 flex items-center gap-6 text-sm text-slate-500">
            <span className="flex items-center gap-1.5"><Lock className="w-4 h-4 text-blue-600" /> Zero PII in chat</span>
            <span className="flex items-center gap-1.5"><Truck className="w-4 h-4 text-blue-600" /> Delivery filters</span>
            <span className="flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-blue-600" /> AI refinement</span>
          </div>
        </div>

        <div className="lg:col-span-6 relative">
          <div className="absolute -inset-4 bg-gradient-to-tr from-blue-100/50 to-indigo-100/40 rounded-3xl blur-2xl -z-10" />
          <img
            src="https://images.unsplash.com/photo-1576091358783-a212ec293ff3?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzN8MHwxfHNlYXJjaHwyfHxwaGFybWFjeSUyMG1lZGljYWwlMjBwcm9mZXNzaW9uYWx8ZW58MHx8fHwxNzg2MjkyMjkxfDA&ixlib=rb-4.1.0&q=85"
            alt="Pharmacist helping a patient"
            className="w-full h-[420px] object-cover rounded-2xl shadow-[0_8px_30px_-4px_rgba(15,23,42,0.15)] border border-white"
          />
        </div>
      </section>

      {/* Chat + intake */}
      <section id="chat" className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-16 scroll-mt-20">
        <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white shadow-[0_4px_20px_-4px_rgba(15,23,42,0.08)] overflow-hidden">
          <AIChat onIdentified={onIdentified} identified={identified} onContinue={proceed} />
        </div>

        <div className="lg:col-span-5 space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500 mb-4">
              Intake progress
            </p>
            <div className="space-y-3" data-testid="intake-panel">
              {(() => {
                const has = (k) => identified && k in identified;
                const yn = (v) => (v ? "Yes" : "No");
                const rows = [
                  { label: "Name", display: identified?.name, filled: !!identified?.name },
                  { label: "Dose", display: identified?.dose, filled: !!identified?.dose },
                  { label: "Form", display: identified?.form, filled: !!identified?.form },
                  { label: "Quantity", display: identified?.quantity, filled: !!identified?.quantity },
                  { label: "Transfer from pharmacy", display: has("transfer") ? yn(identified.transfer) : "", filled: has("transfer") },
                  { label: "Has paper Rx", display: has("has_rx") ? yn(identified.has_rx) : "", filled: has("has_rx") },
                  { label: "Pharmacy to call prescriber", display: has("prescriber_call") ? yn(identified.prescriber_call) : "", filled: has("prescriber_call") },
                ];
                return rows.map((r) => (
                  <div key={r.label} className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                    <span className="text-sm text-slate-500">{r.label}</span>
                    <span className={`text-sm font-medium ${r.filled ? "text-slate-900" : "text-slate-300"}`}>
                      {r.filled ? r.display : "—"}
                    </span>
                  </div>
                ));
              })()}
            </div>
            <Button
              data-testid="continue-request-btn"
              disabled={!identified?.name}
              onClick={proceed}
              className="w-full mt-5 rounded-full h-11 bg-blue-600 hover:bg-blue-700 active:scale-95 transition-transform gap-2 disabled:opacity-40"
            >
              {ready ? "Continue to Blind Request" : "Continue"} <ArrowRight className="w-4 h-4" />
            </Button>
            {ready && (
              <p className="mt-3 text-xs text-emerald-600 flex items-center gap-1.5 justify-center">
                <CheckCircle2 className="w-3.5 h-3.5" /> Medication identified — ready to submit
              </p>
            )}
          </div>

          <CameraMask />

          {/* Coming soon concierge */}
          <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/50 p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center">
              <Star className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-900">Concierge service</p>
              <p className="text-xs text-slate-500">White-glove sourcing for hard-to-find meds.</p>
            </div>
            <Button
              data-testid="concierge-btn"
              variant="outline"
              disabled
              className="rounded-full border-indigo-200 text-indigo-600 bg-white"
            >
              Coming soon
            </Button>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="pb-24 scroll-mt-20">
        <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900 mb-2">
          How MedFind works
        </h2>
        <p className="text-slate-600 mb-8 max-w-2xl">
          A progressive flow that protects patient privacy at every step.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className="rounded-xl border border-slate-200 bg-white p-6 hover:shadow-[0_8px_30px_-4px_rgba(15,23,42,0.12)] hover:-translate-y-0.5 transition-transform"
            >
              <div className="w-11 h-11 rounded-lg bg-blue-50 flex items-center justify-center mb-4">
                <s.icon className="w-5 h-5 text-blue-600" />
              </div>
              <div className="text-xs font-mono text-slate-400 mb-1">0{i + 1}</div>
              <h3 className="font-heading font-semibold text-lg text-slate-900">{s.title}</h3>
              <p className="text-sm text-slate-500 mt-1.5 leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
