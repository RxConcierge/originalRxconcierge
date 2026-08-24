import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import AIChat from "@/components/AIChat";
import CameraMask from "@/components/CameraMask";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShieldCheck, Lock, Sparkles, ArrowRight, Star, Search, Store, CheckCircle2, Heart,
} from "lucide-react";

const VALUES = [
  { icon: Lock, title: "Anonymous by default", text: "Start without an account. Your name and contact stay private until you're matched." },
  { icon: Sparkles, title: "AI that just gets it", text: "Describe your medication in plain words — our assistant figures out the details." },
  { icon: Heart, title: "Local pharmacies compete", text: "Nearby pharmacies see your request and offer to fill it, on your terms." },
];

const STEPS = [
  { n: "1", title: "Chat", text: "Tell the assistant what you need." },
  { n: "2", title: "Post", text: "Send a private Blind Request." },
  { n: "3", title: "Match", text: "A pharmacy accepts — you connect." },
];

export default function PatientHome() {
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
    else localStorage.removeItem("mf_pendingMed");
    if (user && user.role === "patient") navigate("/patient");
    else if (user && user.role === "pharmacy") navigate("/pharmacy");
    else navigate("/auth");
  };

  return (
    <main className="bg-gradient-to-b from-blue-50/60 via-white to-white overflow-x-hidden">
      {/* Hero */}
      <section className="max-w-3xl mx-auto px-5 pt-14 pb-10 text-center">
        <Badge className="mb-6 bg-white text-blue-700 hover:bg-white border border-blue-100 rounded-full px-3.5 py-1.5 font-medium shadow-sm">
          <ShieldCheck className="w-3.5 h-3.5 mr-1.5" /> Private medication finder for patients
        </Badge>
        <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-black tracking-tighter leading-[1.03] text-slate-900">
          Get your medication,
          <br className="hidden sm:block" /> the calm way.
        </h1>
        <p className="mt-5 text-lg text-slate-500 leading-relaxed max-w-xl mx-auto">
          Chat with our assistant to identify what you need — no sign-up, no personal details.
          Then let nearby pharmacies take care of the rest.
        </p>
        <p className="mt-4 text-sm text-slate-400 flex items-center justify-center gap-1.5">
          <Lock className="w-3.5 h-3.5" /> No account needed to begin
        </p>

        {/* Phone mockup with live chat */}
        <div className="mt-12 flex justify-center">
          <div className="relative">
            <div className="absolute -inset-4 bg-blue-200/30 rounded-[3rem] blur-2xl -z-10" />
            <div className="w-[360px] max-w-[90vw] rounded-[2.75rem] bg-slate-900 p-3 shadow-[0_30px_60px_-15px_rgba(15,23,42,0.35)]">
              <div className="rounded-[2.1rem] overflow-hidden bg-white">
                <div className="relative h-7 bg-white flex justify-center items-start">
                  <div className="w-28 h-5 bg-slate-900 rounded-b-2xl" />
                </div>
                <AIChat onIdentified={onIdentified} identified={identified} onContinue={proceed} />
              </div>
            </div>
          </div>
        </div>

        {identified?.name && !ready && (
          <div className="mt-6 flex flex-wrap justify-center gap-2" data-testid="patient-identified-pills">
            {[identified.name, identified.dose, identified.form].filter(Boolean).map((v) => (
              <span key={v} className="text-sm px-3 py-1.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">{v}</span>
            ))}
          </div>
        )}

        <div className="mt-8 flex items-center justify-center gap-2 text-sm text-slate-400">
          <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-blue-500" /> Free to use</span>
          <span className="text-slate-200">·</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-blue-500" /> HIPAA-minded</span>
          <span className="text-slate-200">·</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-blue-500" /> 2-minute request</span>
        </div>
      </section>

      {/* Values */}
      <section className="max-w-5xl mx-auto px-5 py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {VALUES.map((v) => (
            <div key={v.title} className="rounded-2xl bg-white border border-slate-100 p-7 text-center shadow-[0_2px_20px_-8px_rgba(15,23,42,0.1)]">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mx-auto mb-4">
                <v.icon className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-heading font-semibold text-lg text-slate-900">{v.title}</h3>
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">{v.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Optional tools */}
      <section className="max-w-2xl mx-auto px-5 pb-6 space-y-4">
        <CameraMask />
        <div className="rounded-2xl border border-dashed border-indigo-200 bg-indigo-50/40 p-5 flex items-center gap-4">
          <div className="w-11 h-11 rounded-xl bg-indigo-600 flex items-center justify-center">
            <Star className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900">Concierge service</p>
            <p className="text-xs text-slate-500">White-glove sourcing for hard-to-find meds.</p>
          </div>
          <Button data-testid="concierge-btn" variant="outline" disabled className="rounded-full border-indigo-200 text-indigo-600 bg-white">
            Coming soon
          </Button>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-3xl mx-auto px-5 py-16 text-center">
        <h2 className="font-heading text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-10">Three simple steps</h2>
        <div className="grid grid-cols-3 gap-4">
          {STEPS.map((s) => (
            <div key={s.n}>
              <div className="w-11 h-11 rounded-full bg-blue-600 text-white font-heading font-bold flex items-center justify-center mx-auto mb-3">{s.n}</div>
              <h3 className="font-heading font-semibold text-slate-900">{s.title}</h3>
              <p className="text-sm text-slate-500 mt-1">{s.text}</p>
            </div>
          ))}
        </div>
        <Button
          data-testid="patient-cta-btn"
          onClick={proceed}
          className="mt-10 rounded-full h-12 px-8 text-base bg-blue-600 hover:bg-blue-700 active:scale-95 transition-transform gap-2"
        >
          {identified?.name ? "Continue to Blind Request" : "Start now"} <ArrowRight className="w-4 h-4" />
        </Button>
        <p className="mt-6 text-sm text-slate-400">
          Are you a pharmacy?{" "}
          <button data-testid="patient-to-pharmacy-link" onClick={() => navigate("/pharmacy-portal")} className="text-blue-600 font-medium hover:underline inline-flex items-center gap-1">
            <Store className="w-3.5 h-3.5" /> Visit the pharmacy portal
          </button>
        </p>
      </section>

      <footer className="border-t border-slate-100 py-8 text-center text-sm text-slate-400">
        © 2026 MedFind · Privacy · Terms · Contact
      </footer>
    </main>
  );
}
