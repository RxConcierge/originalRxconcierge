import { useState, useEffect, useCallback } from "react";
import api, { formatApiError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Snowflake, Star, ShieldAlert, Bell, Check, X, MessageSquare, RefreshCw,
  Phone, Mail, MapPin, Clock, Sparkles, Loader2, ListFilter, DollarSign, Plus,
} from "lucide-react";

const CLINICAL = [
  { key: "schedule", val: "II", label: "Schedule II", icon: ShieldAlert, color: "text-red-600 border-red-200 bg-red-50" },
  { key: "schedule", val: "III-V", label: "Schedule III–V", icon: ShieldAlert, color: "text-amber-600 border-amber-200 bg-amber-50" },
  { key: "fridge", val: true, label: "Fridge", icon: Snowflake, color: "text-blue-600 border-blue-200 bg-blue-50" },
  { key: "specialty", val: true, label: "Specialty", icon: Star, color: "text-indigo-600 border-indigo-200 bg-indigo-50" },
];

export default function PharmacyDashboard() {
  const { user } = useAuth();
  const [queue, setQueue] = useState([]);
  const [accepted, setAccepted] = useState([]);
  const [earnings, setEarnings] = useState({ total: 0, count: 0, entries: [] });
  const [filters, setFilters] = useState({ schedule: "all", fridge: false, specialty: false, watchlist_only: false });
  const [watchlist, setWatchlist] = useState(user?.watchlist || []);
  const [newWatch, setNewWatch] = useState("");
  const [tab, setTab] = useState("queue");

  const loadQueue = useCallback(async () => {
    try {
      const res = await api.get("/requests/queue", {
        params: {
          schedule: filters.schedule,
          fridge: filters.fridge,
          specialty: filters.specialty,
          watchlist_only: filters.watchlist_only,
        },
      });
      setQueue(res.data);
    } catch (e) {}
  }, [filters]);

  const loadAccepted = async () => {
    try {
      const res = await api.get("/requests/accepted");
      setAccepted(res.data);
    } catch (e) {}
  };

  const loadEarnings = async () => {
    try {
      const res = await api.get("/pharmacy/earnings");
      setEarnings(res.data);
    } catch (e) {}
  };

  useEffect(() => { loadQueue(); }, [loadQueue]);
  useEffect(() => { loadAccepted(); loadEarnings(); }, []);

  const toggleClinical = (f) => {
    if (f.key === "schedule") {
      setFilters((s) => ({ ...s, schedule: s.schedule === f.val ? "all" : f.val }));
    } else {
      setFilters((s) => ({ ...s, [f.key]: !s[f.key] }));
    }
  };

  const isActive = (f) => (f.key === "schedule" ? filters.schedule === f.val : filters[f.key]);

  const accept = async (id) => {
    try {
      const res = await api.post(`/requests/${id}/accept`);
      toast.success(`Accepted · platform fee $${res.data.platform_fee} charged (simulated)`);
      await loadQueue();
      await loadAccepted();
      setTab("accepted");
    } catch (err) {
      toast.error(formatApiError(err.response?.data?.detail) || err.message);
    }
  };

  const saveWatchlist = async (list) => {
    try {
      await api.put("/pharmacy/watchlist", { watchlist: list });
      setWatchlist(list);
      loadQueue();
    } catch (e) { toast.error("Could not save watchlist"); }
  };

  const watchHits = queue.filter((r) => r.watchlist_hit).length;

  const kpis = [
    ["In queue", queue.length, "text-blue-600"],
    ["Watchlist alerts", watchHits, "text-red-600"],
    ["Accepted", accepted.length, "text-emerald-600"],
    ["Earnings", `$${earnings.total.toFixed(2)}`, "text-slate-900"],
  ];

  return (
    <main className="max-w-7xl mx-auto px-5 sm:px-8 py-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-heading text-3xl font-black tracking-tight text-slate-900">
            {user?.pharmacy_name || "Pharmacy"} · Live queue
          </h1>
          <p className="text-slate-500 text-sm mt-1">Blind requests from nearby patients, updated in real time.</p>
        </div>
        <Button data-testid="pharm-concierge-btn" variant="outline" disabled
          className="rounded-full border-indigo-200 text-indigo-600 gap-2">
          <Star className="w-4 h-4" /> Concierge · Coming soon
        </Button>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map(([label, val, color]) => (
          <div key={label} className="rounded-xl border border-slate-200 bg-white p-4" data-testid="kpi-card">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
            <p className={`font-heading font-black text-3xl mt-1 ${color}`}>{val}</p>
          </div>
        ))}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="rounded-full bg-slate-100 p-1">
          <TabsTrigger data-testid="tab-queue" value="queue" className="rounded-full px-5">Queue</TabsTrigger>
          <TabsTrigger data-testid="tab-accepted" value="accepted" className="rounded-full px-5">Accepted</TabsTrigger>
          <TabsTrigger data-testid="tab-earnings" value="earnings" className="rounded-full px-5">Earnings</TabsTrigger>
          <TabsTrigger data-testid="tab-watchlist" value="watchlist" className="rounded-full px-5">Watchlist</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="mt-5">
          {/* Clinical filters */}
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <span className="text-sm text-slate-500 flex items-center gap-1.5 mr-1"><ListFilter className="w-4 h-4" /> Clinical filters:</span>
            {CLINICAL.map((f) => (
              <button key={f.label} data-testid={`filter-${f.label}`} onClick={() => toggleClinical(f)}
                className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border transition-colors ${
                  isActive(f) ? f.color : "bg-white border-slate-200 text-slate-600 hover:border-slate-400"
                }`}>
                <f.icon className="w-3.5 h-3.5" /> {f.label}
              </button>
            ))}
            <button data-testid="filter-watchlist" onClick={() => setFilters((s) => ({ ...s, watchlist_only: !s.watchlist_only }))}
              className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-full border transition-colors ${
                filters.watchlist_only ? "bg-red-50 text-red-600 border-red-200" : "bg-white border-slate-200 text-slate-600 hover:border-slate-400"
              }`}>
              <Bell className="w-3.5 h-3.5" /> Watchlist only
            </button>
          </div>

          <div className="space-y-3">
            {queue.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center text-slate-400">
                No requests match these filters.
              </div>
            )}
            {queue.map((r) => (
              <QueueRow key={r.id} r={r} onAccept={accept} reload={loadQueue} />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="accepted" className="mt-5 space-y-3">
          {accepted.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 p-12 text-center text-slate-400">
              No accepted requests yet.
            </div>
          )}
          {accepted.map((r) => (
            <AcceptedCard key={r.id} r={r} onUpdated={() => { loadAccepted(); loadEarnings(); }} />
          ))}
        </TabsContent>

        <TabsContent value="earnings" className="mt-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 max-w-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-heading font-semibold text-lg text-slate-900 flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-600" /> Earnings
                </h3>
                <p className="text-sm text-slate-500 mt-0.5">You earn $0.50 for each post-payment clinical update you provide.</p>
              </div>
              <div className="text-right">
                <p className="font-heading font-black text-3xl text-slate-900" data-testid="earnings-total">${earnings.total.toFixed(2)}</p>
                <p className="text-xs text-slate-400">{earnings.count} update{earnings.count === 1 ? "" : "s"}</p>
              </div>
            </div>
            <div className="space-y-2" data-testid="earnings-list">
              {earnings.entries.length === 0 && (
                <p className="text-sm text-slate-400 py-6 text-center">No earnings yet. Add a clinical update on an accepted request to earn $0.50.</p>
              )}
              {earnings.entries.map((e) => (
                <div key={e.id} className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{e.reason}</p>
                    <p className="text-xs text-slate-400">{e.medication} · {new Date(e.created_at).toLocaleString()}</p>
                  </div>
                  <span className="font-mono font-semibold text-emerald-600">+${Number(e.amount).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="watchlist" className="mt-5">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 max-w-xl">
            <h3 className="font-heading font-semibold text-lg text-slate-900 flex items-center gap-2 mb-1">
              <Bell className="w-5 h-5 text-red-500" /> Drug watchlist
            </h3>
            <p className="text-sm text-slate-500 mb-4">Requests containing these drugs are flagged with an alert in your queue.</p>
            <div className="flex gap-2 mb-4">
              <Input data-testid="watchlist-input" value={newWatch} onChange={(e) => setNewWatch(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && newWatch.trim()) { saveWatchlist([...watchlist, newWatch.trim()]); setNewWatch(""); } }}
                placeholder="Add a drug name…" className="rounded-lg" />
              <Button data-testid="watchlist-add-btn" onClick={() => { if (newWatch.trim()) { saveWatchlist([...watchlist, newWatch.trim()]); setNewWatch(""); } }}
                className="rounded-full bg-blue-600 hover:bg-blue-700">Add</Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {watchlist.length === 0 && <span className="text-sm text-slate-400">No drugs watched yet.</span>}
              {watchlist.map((w) => (
                <Badge key={w} className="rounded-full bg-red-50 text-red-700 border border-red-100 gap-1.5 pr-1.5">
                  {w}
                  <button data-testid="watchlist-remove" onClick={() => saveWatchlist(watchlist.filter((x) => x !== w))}
                    className="w-4 h-4 rounded-full hover:bg-red-200 flex items-center justify-center">
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </main>
  );
}

function QueueRow({ r, onAccept, reload }) {
  const [clarifyOpen, setClarifyOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const clarify = async () => {
    if (!question.trim()) return;
    setBusy(true);
    try {
      await api.post(`/requests/${r.id}/clarify`, { question });
      toast.success("Clarification sent");
      setClarifyOpen(false); setQuestion("");
      reload();
    } catch (e) { toast.error("Failed to send"); } finally { setBusy(false); }
  };

  const reject = async () => {
    if (!reason.trim()) return;
    setBusy(true);
    try {
      const res = await api.post(`/requests/${r.id}/reject`, { reason });
      toast.success("Rejected · AI refined the request for the queue");
      setRejectOpen(false); setReason("");
      reload();
    } catch (e) { toast.error("Failed to reject"); } finally { setBusy(false); }
  };

  return (
    <div data-testid="queue-row"
      className={`rounded-xl border bg-white p-4 hover:shadow-[0_4px_20px_-4px_rgba(15,23,42,0.08)] transition-shadow ${
        r.watchlist_hit ? "border-red-300 ring-1 ring-red-100" : "border-slate-200"
      }`}>
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <div className="flex items-center gap-2 flex-wrap">
            {r.watchlist_hit && (
              <Badge className="rounded-full bg-red-600 text-white gap-1" data-testid="watchlist-alert">
                <Bell className="w-3 h-3" /> Watchlist
              </Badge>
            )}
            <h3 className="font-heading font-bold text-base text-slate-900">{r.medication.name}</h3>
            <span className="text-sm text-slate-500">{r.medication.dose} · {r.medication.form}</span>
            {r.medication.quantity && <span className="text-sm text-slate-400">qty {r.medication.quantity}</span>}
          </div>
          <div className="flex gap-1.5 flex-wrap mt-2">
            {r.schedule !== "none" && (
              <Badge className="rounded-full bg-red-50 text-red-700 border border-red-100">Schedule {r.schedule}</Badge>
            )}
            {r.fridge && <Badge className="rounded-full bg-blue-50 text-blue-700 border border-blue-100"><Snowflake className="w-3 h-3 mr-1" />Fridge</Badge>}
            {r.specialty && <Badge className="rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100"><Star className="w-3 h-3 mr-1" />Specialty</Badge>}
            {r.fill_today && <Badge className="rounded-full bg-amber-50 text-amber-700 border border-amber-100"><Clock className="w-3 h-3 mr-1" />Fill today</Badge>}
            <Badge variant="outline" className="rounded-full">
              Delivery: {r.delivery_pref === "fee" ? `≤ $${r.max_fee ?? "-"}` : r.delivery_pref}
            </Badge>
            {r.status === "clarifying" && <Badge className="rounded-full bg-amber-100 text-amber-800">Clarifying</Badge>}
          </div>

          {r.refinements?.length > 0 && (
            <div className="mt-2 flex gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-lg p-2.5">
              <RefreshCw className="w-4 h-4 shrink-0 mt-0.5" />
              <span><b>AI refined:</b> {r.refinements[r.refinements.length - 1].summary}</span>
            </div>
          )}
          {r.clarifications?.length > 0 && (
            <div className="mt-2 text-sm text-slate-500 flex gap-2">
              <MessageSquare className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{r.clarifications[r.clarifications.length - 1].question}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Clarify */}
          <Dialog open={clarifyOpen} onOpenChange={setClarifyOpen}>
            <DialogTrigger asChild>
              <Button data-testid="clarify-btn" variant="outline" size="sm" className="rounded-full gap-1.5">
                <MessageSquare className="w-4 h-4" /> Clarify
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Ask for clarification</DialogTitle>
                <DialogDescription>Send a question to the patient about this request.</DialogDescription>
              </DialogHeader>
              <Textarea data-testid="clarify-input" value={question} onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. Is a generic acceptable? What quantity exactly?" rows={3} className="rounded-lg" />
              <DialogFooter>
                <Button data-testid="clarify-submit" onClick={clarify} disabled={busy}
                  className="rounded-full bg-blue-600 hover:bg-blue-700">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Reject */}
          <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
            <DialogTrigger asChild>
              <Button data-testid="reject-btn" variant="outline" size="sm" className="rounded-full gap-1.5 text-red-600 border-red-200 hover:bg-red-50">
                <X className="w-4 h-4" /> Reject
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Reject &amp; refine</DialogTitle>
                <DialogDescription>The AI summarizes this into a refinement note and returns the request to the queue.</DialogDescription>
              </DialogHeader>
              <p className="text-sm text-slate-500">The AI will summarize this into a refinement note and return the request to the queue.</p>
              <Textarea data-testid="reject-input" value={reason} onChange={(e) => setReason(e.target.value)}
                placeholder="Why can't you fill it? e.g. Out of stock; need brand confirmation" rows={3} className="rounded-lg" />
              <DialogFooter>
                <Button data-testid="reject-submit" onClick={reject} disabled={busy}
                  className="rounded-full bg-red-600 hover:bg-red-700">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reject & refine"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button data-testid="accept-btn" size="sm" onClick={() => onAccept(r.id)}
            className="rounded-full bg-emerald-600 hover:bg-emerald-700 gap-1.5 active:scale-95 transition-transform">
            <Check className="w-4 h-4" /> Accept
          </Button>
        </div>
      </div>
    </div>
  );
}


function AcceptedCard({ r, onUpdated }) {
  const [open, setOpen] = useState(false);
  const [field, setField] = useState("");
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const FIELDS = ["Dose", "Form", "Quantity", "Substitution", "Stock status", "Ready time"];

  const submit = async () => {
    if (!field.trim() || !value.trim()) return toast.error("Field and new value are required");
    setBusy(true);
    try {
      const res = await api.post(`/requests/${r.id}/post-update`, { field, value, note });
      toast.success(`Update sent to patient · you earned $${res.data.fee_earned.toFixed(2)}`);
      setOpen(false); setField(""); setValue(""); setNote("");
      onUpdated();
    } catch (e) {
      toast.error(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid="accepted-card" className="rounded-2xl border border-emerald-200 bg-white p-6">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <Check className="w-5 h-5 text-emerald-600" />
        <h3 className="font-heading font-bold text-lg text-slate-900">{r.medication.name}</h3>
        <span className="text-sm text-slate-500">{r.medication.dose} · {r.medication.form}</span>
        <Badge className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
          Fee ${r.platform_fee}
        </Badge>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="post-update-btn" size="sm" variant="outline"
              className="ml-auto rounded-full gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50">
              <Plus className="w-4 h-4" /> Add clinical update
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Post-payment clinical update</DialogTitle>
              <DialogDescription>Send an updated clinical detail to the patient. You earn $0.50 per update.</DialogDescription>
            </DialogHeader>
            <p className="text-sm text-slate-500">The patient sees this update instantly. You earn $0.50 per update.</p>
            <div className="flex flex-wrap gap-2">
              {FIELDS.map((f) => (
                <button key={f} data-testid={`post-field-${f}`} onClick={() => setField(f)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    field === f ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-200 text-slate-600 hover:border-slate-400"
                  }`}>
                  {f}
                </button>
              ))}
            </div>
            <Input data-testid="post-field-input" value={field} onChange={(e) => setField(e.target.value)}
              placeholder="Detail being updated (e.g. Dose)" className="rounded-lg" />
            <Input data-testid="post-value-input" value={value} onChange={(e) => setValue(e.target.value)}
              placeholder="New value (e.g. 40mg confirmed)" className="rounded-lg" />
            <Textarea data-testid="post-note-input" value={note} onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note for the patient" rows={2} className="rounded-lg" />
            <DialogFooter>
              <Button data-testid="post-update-submit" onClick={submit} disabled={busy}
                className="rounded-full bg-blue-600 hover:bg-blue-700">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send update · earn $0.50"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {r.contact && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-slate-700 bg-slate-50 rounded-lg p-4">
          <span className="font-medium text-slate-900">{r.contact.patient_name}</span>
          <span className="flex items-center gap-2"><Phone className="w-4 h-4 text-slate-400" /> {r.contact.patient_phone}</span>
          <span className="flex items-center gap-2"><Mail className="w-4 h-4 text-slate-400" /> {r.contact.patient_email}</span>
        </div>
      )}

      {r.post_updates?.length > 0 && (
        <div className="mt-3 space-y-2" data-testid="pharm-post-updates">
          {r.post_updates.map((u) => (
            <div key={u.id} className="flex items-center justify-between text-sm text-blue-800 bg-blue-50 border border-blue-100 rounded-lg p-3">
              <span><b>{u.field}:</b> {u.value}{u.note ? ` — ${u.note}` : ""}</span>
              <span className="font-mono text-emerald-600 text-xs shrink-0">+${Number(u.fee).toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
