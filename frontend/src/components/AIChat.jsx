import { useState, useRef, useEffect } from "react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, User, CheckCircle2, Loader2, Sparkles, ArrowRight } from "lucide-react";

const SESSION_ID = "anon-" + Math.random().toString(36).slice(2);
const CHIPS = ["I'm not sure of the exact name", "It's a tablet", "It's an injection", "10mg", "It's for cholesterol"];

export default function AIChat({ onIdentified, identified, onContinue }) {
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      text: "Hi, I'm MedFind AI. Tell me the medication you need — even a description works. What's the name or what's it for?",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || busy) return;
    const history = messages.map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", text: m.text }));
    const mkId = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setMessages((m) => [...m, { id: mkId(), role: "user", text: content }]);
    setInput("");
    setBusy(true);
    try {
      const res = await api.post("/chat/message", { session_id: SESSION_ID, message: content, history });
      setMessages((m) => [...m, { id: mkId(), role: "assistant", text: res.data.reply }]);
      if (res.data.identified) onIdentified(res.data.identified, res.data.ready);
      if (res.data.ready) setReady(true);
    } catch (e) {
      console.error("Chat message failed:", e);
      setMessages((m) => [...m, { id: mkId(), role: "assistant", text: "Sorry, I had trouble responding. Please try again." }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div data-testid="ai-chat">
    <div className="flex flex-col h-[440px]">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-200 bg-slate-50 rounded-t-xl">
        <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-slate-900">MedFind AI · Medication ID</p>
          <p className="text-xs text-slate-500">Anonymous · no account needed</p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-white">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex gap-2.5 animate-fade-up ${m.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`w-7 h-7 shrink-0 rounded-full flex items-center justify-center ${
                m.role === "user" ? "bg-slate-900" : "bg-blue-100"
              }`}
            >
              {m.role === "user" ? (
                <User className="w-4 h-4 text-white" />
              ) : (
                <Bot className="w-4 h-4 text-blue-700" />
              )}
            </div>
            <div
              className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-slate-900 text-white rounded-tr-sm"
                  : "bg-slate-100 text-slate-800 rounded-tl-sm"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {busy && (
          <div className="flex gap-2.5 items-center text-slate-400 text-sm">
            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
              <Bot className="w-4 h-4 text-blue-700" />
            </div>
            <Loader2 className="w-4 h-4 animate-spin" /> thinking…
          </div>
        )}
      </div>

      {messages.length <= 2 && !identified?.name && (
        <div className="px-4 pb-2 flex flex-wrap gap-2">
          {CHIPS.map((c) => (
            <button
              key={c}
              data-testid="chat-chip"
              onClick={() => send(c)}
              className="text-xs px-3 py-1.5 rounded-full border border-slate-200 text-slate-600 hover:border-blue-400 hover:text-blue-700 transition-colors"
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="p-3 border-t border-slate-200 flex gap-2 bg-white rounded-b-xl">
        <Input
          data-testid="chat-input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Type the medication or describe it…"
          className="rounded-full border-slate-200 focus-visible:ring-blue-500/20"
        />
        <Button
          data-testid="chat-send-btn"
          onClick={() => send()}
          disabled={busy}
          className="rounded-full bg-blue-600 hover:bg-blue-700 px-4 active:scale-95 transition-transform"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>

      {ready && (
        <div className="p-4 border-t border-slate-200 bg-emerald-50/70 animate-fade-up" data-testid="chat-continue-banner">
          <p className="text-sm text-emerald-800 flex items-center gap-1.5 mb-3">
            <CheckCircle2 className="w-4 h-4" /> Medication details gathered — you're ready to submit.
          </p>
          <Button
            data-testid="chat-continue-btn"
            onClick={onContinue}
            className="w-full h-12 text-base rounded-full bg-blue-600 hover:bg-blue-700 active:scale-95 transition-transform gap-2 font-semibold"
          >
            Continue to Blind Request <ArrowRight className="w-5 h-5" />
          </Button>
        </div>
      )}
    </div>
  );
}
