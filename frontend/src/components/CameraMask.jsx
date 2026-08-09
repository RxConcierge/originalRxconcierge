import { useState } from "react";
import { Camera, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CameraMask() {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden" data-testid="camera-mask">
      {!open ? (
        <button
          data-testid="camera-open-btn"
          onClick={() => setOpen(true)}
          className="w-full flex items-center gap-3 p-4 text-left hover:bg-slate-50 transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
            <Camera className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-semibold text-slate-900">Scan a label with Privacy Mask</p>
            <p className="text-xs text-slate-500">Optional · helps ID the medication, never captures your data</p>
          </div>
        </button>
      ) : (
        <div className="relative">
          <div className="relative aspect-video bg-slate-900 flex items-center justify-center overflow-hidden">
            <img
              src="https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NDQ2NDF8MHwxfHNlYXJjaHw0fHxwcmVzY3JpcHRpb24lMjBtZWRpY2F0aW9uJTIwY2xlYW58ZW58MHx8fHwxNzg2MjkyMjkxfDA&ixlib=rb-4.1.0&q=85"
              alt="Medication label preview"
              className="w-full h-full object-cover opacity-70"
            />
            {/* Privacy mask border overlay */}
            <div className="absolute inset-0 border-[36px] border-black/55 pointer-events-none" />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-1/2 h-1/3 border-2 border-dashed border-white/90 rounded-md flex items-center justify-center">
                <span className="text-white/90 text-xs font-mono tracking-wide">ALIGN LABEL HERE</span>
              </div>
            </div>
            <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-emerald-500/90 text-white text-[11px] font-semibold px-2.5 py-1 rounded-full">
              <ShieldCheck className="w-3.5 h-3.5" /> Privacy Mask on — patient info blocked
            </div>
            <button
              data-testid="camera-close-btn"
              onClick={() => setOpen(false)}
              className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/70 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-3 flex items-center justify-between bg-white">
            <p className="text-xs text-slate-500">Only the drug name & strength area is read. Names, addresses & Rx numbers are masked.</p>
            <Button size="sm" disabled className="rounded-full bg-slate-200 text-slate-500" data-testid="camera-capture-btn">
              Capture (preview)
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
