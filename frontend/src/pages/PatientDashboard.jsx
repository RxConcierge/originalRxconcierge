import { useState, useEffect, useCallback } from "react";
import api, { formatApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Pill, Send, Sparkles, Truck, Zap, ShieldCheck, Phone, Mail, MapPin,
  RefreshCw, Clock, CheckCircle2, Loader2, Bell,
} from "lucide-react";

const DELIVERY = [["any", "Any"], ["free", "Free only"], ["fee", "Max fee"]];

function StatusBadge({ status }) {
  const map = {
    queued: ["In queue", "bg-blue-50 text-blue-700 border-blue-100"],
    clarifying: ["Clarifying", "bg-amber-50 text-amber-700 border-amber-100"],
    accepted: ["Accepted", "bg-emerald-50 text-emerald-700 border-emerald-100"],
  };
  const [label, cls] = map[status] || ["—", ""];
  return <Badge className={`rounded-full border font-medium ${cls}`}>{label}</Badge>;
}

export default function PatientDashboard() {
  const pending = JSON.parse(localStorage.getItem("mf_pendingMed") || "null");
  const [med, setMed] = useState({
    name: pending?.name || "", dose: pending?.dose || "", form: pending?.form || "", quantity: pending?.quantity || "",
  });
  const [transferStatus, setTransferStatus] = useState(!!pending?.transfer);
  const [prescriberStatus, setPrescriberStatus] = useState(!!pending?.prescriber_call);
  const [prescriptionStatus, setPrescriptionStatus] = useState(!!pending?.has_rx);
  const [deliveryPref, setDeliveryPref] = useState("any");
  const [maxFee, setMaxFee] = useState("");
  const [fillToday, setFillToday] = useState(false);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const [match, setMatch] = useState(null);
  const [requests, setRequests] = useState([]);
  const [tab, setTab] = useState("new");

  const loadRequests = useCallback(async () => {
    try {
      const res = await api.get("/requests/mine");
      setRequests(res.data);
    } catch (e) {
      console.error("Failed to load your requests:", e);
      toast.error("Couldn't load your requests. Please refresh.");
    }
  }, []);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const res = await api.post("/requests/preview-match", {
          delivery_pref: deliveryPref,
          max_fee: deliveryPref === "fee" && maxFee ? Number(maxFee) : null,
          fill_today: fillToday,
          medication_name: med.name,
        });
        setMatch(res.data);
      } catch (e) {
        console.error("Failed to preview pharmacy matches:", e);
      }
    }, 400);
    return () => clearTimeout(t);
  }, [deliveryPref, maxFee, fillToday, med.name]);

  const submit = async () => {
    if (!med.name) return toast.error("Medication name is required");
    setBusy(true);
    try {
      await api.post("/requests", {
        medication: med,
        transfer_status: transferStatus,
        prescriber_status: prescriberStatus,
        prescription_status: prescriptionStatus,
        delivery_pref: deliveryPref,
        max_fee: deliveryPref === "fee" && maxFee ? Number(maxFee) : null,
        fill_today: fillToday, notes,
      });
      localStorage.removeItem("mf_pendingMed");
      toast.success("Blind Request posted to the pharmacy queue");
      await loadRequests();
      setTab("mine");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="max-w-6xl mx-auto px-5 sm:px-8 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-heading text-3xl font-black tracking-tight text-slate-900">Your requests</h1>
          <p className="text-slate-500 text-sm mt-1">Post a Blind Request and track pharmacy responses.</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="rounded-full bg-slate-100 p-1">
          <TabsTrigger data-testid="tab-new" value="new" className="rounded-full px-5">New request</TabsTrigger>
          <TabsTrigger data-testid="tab-mine" value="mine" className="rounded-full px-5">
            My requests {requests.length > 0 && `(${requests.length})`}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white p-6 space-y-5">
              <div className="flex items-center gap-2 text-slate-900">
                <Pill className="w-5 h-5 text-blue-600" />
                <h3 className="font-heading font-semibold text-lg">Medication</h3>
                {pending && <Badge className="bg-blue-50 text-blue-700 rounded-full border border-blue-100">Pre-filled by AI</Badge>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Name</Label>
                  <Input data-testid="req-name" value={med.name} onChange={(e) => setMed({ ...med, name: e.target.value })}
                    className="mt-1.5 rounded-lg" placeholder="e.g. Atorvastatin" />
                </div>
                <div>
                  <Label className="text-sm">Dose / strength</Label>
                  <Input data-testid="req-dose" value={med.dose} onChange={(e) => setMed({ ...med, dose: e.target.value })}
                    className="mt-1.5 rounded-lg" placeholder="e.g. 20mg" />
                </div>
                <div>
                  <Label className="text-sm">Form</Label>
                  <Input data-testid="req-form" value={med.form} onChange={(e) => setMed({ ...med, form: e.target.value })}
                    className="mt-1.5 rounded-lg" placeholder="e.g. tablet" />
                </div>
                <div>
                  <Label className="text-sm">Quantity</Label>
                  <Input data-testid="req-qty" value={med.quantity} onChange={(e) => setMed({ ...med, quantity: e.target.value })}
                    className="mt-1.5 rounded-lg" placeholder="e.g. 30" />
                </div>
              </div>

              <div className="pt-2 flex items-start gap-2.5 rounded-lg bg-slate-50 border border-slate-200 p-3" data-testid="auto-classify-note">
                <Sparkles className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-sm text-slate-500">
                  Clinical details (drug schedule, storage, specialty status) are validated and auto-assigned by our AI for the pharmacy — you don't need to fill these in.
                </p>
              </div>

              <div>
                <Label className="text-sm mb-2 block">Intake details</Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <label className="flex items-center justify-between text-sm text-slate-700 border border-slate-200 rounded-lg px-3 py-2.5">
                    Transfer from pharmacy
                    <Switch data-testid="req-transfer" checked={transferStatus} onCheckedChange={setTransferStatus} />
                  </label>
                  <label className="flex items-center justify-between text-sm text-slate-700 border border-slate-200 rounded-lg px-3 py-2.5">
                    Have paper Rx
                    <Switch data-testid="req-prescription" checked={prescriptionStatus} onCheckedChange={setPrescriptionStatus} />
                  </label>
                  <label className="flex items-center justify-between text-sm text-slate-700 border border-slate-200 rounded-lg px-3 py-2.5">
                    Pharmacy to call prescriber
                    <Switch data-testid="req-prescriber" checked={prescriberStatus} onCheckedChange={setPrescriberStatus} />
                  </label>
                </div>
              </div>

              <div>
                <Label className="text-sm">Notes (optional)</Label>
                <Textarea data-testid="req-notes" value={notes} onChange={(e) => setNotes(e.target.value)}
                  className="mt-1.5 rounded-lg" placeholder="Anything a pharmacy should know" rows={2} />
              </div>

              <Button data-testid="submit-request-btn" onClick={submit} disabled={busy}
                className="w-full rounded-full h-11 bg-blue-600 hover:bg-blue-700 active:scale-95 transition-transform gap-2">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Post Blind Request
              </Button>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 justify-center">
                <ShieldCheck className="w-3.5 h-3.5" /> Your name & contact stay hidden until a pharmacy is matched.
              </p>
            </div>

            {/* Quick filters */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 h-fit space-y-5">
              <div className="flex items-center gap-2">
                <Truck className="w-5 h-5 text-blue-600" />
                <h3 className="font-heading font-semibold text-lg">Quick filters</h3>
              </div>
              <div>
                <Label className="text-sm mb-2 block">Delivery</Label>
                <div className="flex gap-2">
                  {DELIVERY.map(([val, label]) => (
                    <button key={val} data-testid={`req-delivery-${val}`} onClick={() => setDeliveryPref(val)}
                      className={`flex-1 text-sm px-2 py-2 rounded-lg border transition-colors ${
                        deliveryPref === val ? "bg-blue-600 text-white border-blue-600" : "bg-white border-slate-200 text-slate-600 hover:border-blue-400"
                      }`}>
                      {label}
                    </button>
                  ))}
                </div>
                {deliveryPref === "fee" && (
                  <Input data-testid="req-maxfee" type="number" value={maxFee} onChange={(e) => setMaxFee(e.target.value)}
                    className="mt-2 rounded-lg" placeholder="Max delivery fee ($)" />
                )}
              </div>
              <label className="flex items-center justify-between text-sm text-slate-700 border border-slate-200 rounded-lg px-3 py-2.5">
                <span className="flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500" /> Fill today</span>
                <Switch data-testid="req-filltoday" checked={fillToday} onCheckedChange={setFillToday} />
              </label>

              {match && (
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-4" data-testid="match-preview">
                  <p className="text-sm text-slate-600">
                    <span className="font-heading font-bold text-2xl text-slate-900">{match.count}</span> pharmacies match
                  </p>
                  {match.suggestion && (
                    <div className="mt-3 flex gap-2 text-sm text-indigo-700 bg-indigo-50 rounded-lg p-3" data-testid="ai-suggestion">
                      <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{match.suggestion}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="mine" className="mt-6 space-y-4">
          {requests.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center text-slate-400">
              No requests yet. Post your first Blind Request.
            </div>
          )}
          {requests.map((r) => (
            <div key={r.id} data-testid="my-request-card"
              className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-bold text-lg text-slate-900">{r.medication.name}</h3>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">
                    {r.medication.dose} · {r.medication.form} {r.medication.quantity && `· qty ${r.medication.quantity}`}
                  </p>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {r.transfer_status && <Badge variant="outline" className="rounded-full">Transfer</Badge>}
                  {r.prescription_status && <Badge variant="outline" className="rounded-full">Has Rx</Badge>}
                  {r.prescriber_status && <Badge variant="outline" className="rounded-full">Call prescriber</Badge>}
                  {r.fill_today && <Badge variant="outline" className="rounded-full">Fill today</Badge>}
                </div>
              </div>

              {r.refinements?.length > 0 && (
                <div className="mt-4 space-y-2">
                  {r.refinements.map((ref) => (
                    <div key={ref.created_at} className="flex gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg p-3">
                      <RefreshCw className="w-4 h-4 shrink-0 mt-0.5" />
                      <span><b>AI refinement:</b> {ref.summary}</span>
                    </div>
                  ))}
                </div>
              )}

              {r.status === "accepted" && r.contact && (
                <div className="mt-4 rounded-xl bg-emerald-50 border border-emerald-100 p-4" data-testid="contact-exchange">
                  <p className="text-sm font-semibold text-emerald-800 flex items-center gap-1.5 mb-2">
                    <CheckCircle2 className="w-4 h-4" /> Matched with {r.contact.pharmacy_name} · Fee ${r.platform_fee} charged
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-slate-700">
                    <span className="flex items-center gap-2"><Phone className="w-4 h-4 text-slate-400" /> {r.contact.pharmacy_phone}</span>
                    <span className="flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-400" /> {r.contact.pharmacy_address}</span>
                  </div>
                </div>
              )}

              {r.post_updates?.length > 0 && (
                <div className="mt-4 space-y-2" data-testid="patient-post-updates">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Updates from your pharmacy</p>
                  {r.post_updates.map((u) => (
                    <div key={u.id} className="flex gap-2 text-sm text-blue-800 bg-blue-50 border border-blue-100 rounded-lg p-3">
                      <Bell className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>
                        <b>{u.field}:</b> {u.value}
                        {u.note ? ` — ${u.note}` : ""}
                        <span className="block text-xs text-blue-500 mt-0.5">{u.pharmacy_name}</span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </main>
  );
}
