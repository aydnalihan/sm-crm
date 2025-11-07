"use client";
import React, { useMemo, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

// Sayaç Makinesi CRM – Gamified Intake MVP (Animated + CSV + UI polish)
// Rev: renk iyileştirme, filtre popover z-index, detay çekmecesi footer, Enter ile ilerleme

/***************************
 * Utils (paylaşılan)
 ***************************/
const CSV_HEADERS = [
  "instagram",
  "contactName",
  "phone",
  "businessName",
  "businessType",
  "entryQuestion",
  "priceOffer",
  "priceOther",
  "valueReason",
  "objection",
  "saleHappened",
  "paymentType",
  "segment",
  "churnRisk",
  "pipeline",
  "createdAt",
  "priceNumeric",
];

function csvEscapeCell(v: unknown): string {
  if (v === null || v === undefined) return "";
  const s = String(v).replace(/"/g, '""');
  // Hücre içinde virgül/çift tırnak/newline varsa tırnakla
  const needsQuote = /[",\n]/.test(s);
  return needsQuote ? `"${s}"` : s;
}

function toCSV(rows: any[]): string {
  const lines = [CSV_HEADERS.join(",")];
  for (const r of rows) {
    lines.push(CSV_HEADERS.map((h) => csvEscapeCell((r as any)[h])).join(","));
  }
  return lines.join("\n");
}

function formatPriceTRY(n?: number | null) {
  if (n === null || n === undefined || isNaN(n as any)) return "—";
  try {
    return new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0 }).format(n as number);
  } catch {
    return `${n} ₺`;
  }
}

/***************************
 * Uygulama
 ***************************/
export default function App() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-sky-50 text-slate-900">
      {/* decorative blobs */}
      <div className="pointer-events-none absolute -top-24 -right-24 w-[36rem] h-[36rem] rounded-full bg-gradient-to-br from-amber-400/20 to-sky-400/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 w-[28rem] h-[28rem] rounded-full bg-gradient-to-tr from-blue-400/20 to-emerald-400/20 blur-3xl" />

      <Header />
      <Main />
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-10 bg-white/70 backdrop-blur border-b border-slate-200">
      <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-sky-600 text-white grid place-items-center font-bold shadow-sm">SM</div>
          <div>
            <h1 className="text-lg font-semibold leading-tight">Sayaç Makinesi CRM</h1>
            <p className="text-xs text-slate-500 -mt-0.5">Gamified intake • Pipeline • CSV export</p>
          </div>
        </div>
        <div className="text-xs text-slate-500">MVP · Local only</div>
      </div>
    </header>
  );
}

function Main() {
  const [activeTab, setActiveTab] = useState("intake");
  return (
    <main className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-6 flex justify-center gap-2">
        <TabButton label="Yeni Kayıt" active={activeTab === "intake"} onClick={() => setActiveTab("intake")} />
        <TabButton label="Liste / Analiz" active={activeTab === "list"} onClick={() => setActiveTab("list")} />
        <TabButton label="Hızlı Notlar" active={activeTab === "notes"} onClick={() => setActiveTab("notes")} />
      </div>
      <AnimatePresence mode="wait">
        {activeTab === "intake" && (
          <motion.div
            key="intake"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="max-w-xl mx-auto"
          >
            <GamifiedIntake onFinish={() => setActiveTab("list")} />
          </motion.div>
        )}
        {activeTab === "list" && (
          <motion.div
            key="list"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
          >
            <LeadList />
          </motion.div>
        )}
        {activeTab === "notes" && (
          <motion.div
            key="notes"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="max-w-3xl mx-auto"
          >
            <NotesPanel />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm rounded-2xl border shadow-sm transition ${
        active
          ? "bg-sky-600 hover:bg-sky-700 text-white border-transparent shadow"
          : "bg-white/90 text-slate-700 border-slate-300 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}

// --- Data Layer (Local Storage) ---
const LS_KEY = "sm_crm_v1";

function useLeads() {
  const [leads, setLeads] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(leads));
  }, [leads]);
  return { leads, setLeads };
}

const PIPELINE_STATES = [
  "Aday Cari",
  "Telefon Görüşmesi Bekliyor",
  "Görüşme Yapıldı",
  "Teklif Verildi",
  "Satış Onaylandı",
  "Satış Tamamlandı",
  "Churn (Kaybedildi)",
];

// --- Gamified Intake ---
const QUESTIONS = [
  { key: "instagram", label: "Instagram hesabı", type: "text", placeholder: "@kullanici" },
  { key: "contactName", label: "Kişi İsmi", type: "text", placeholder: "Ad Soyad" },
  { key: "phone", label: "Telefon Numarası", type: "text", placeholder: "+90 5xx xxx xx xx" },
  { key: "businessName", label: "İşletme İsmi", type: "text", placeholder: "Kahve Bahçesi" },
  {
    key: "businessType",
    label: "İşletme Türü",
    type: "select",
    options: ["Kafe", "Hızlı Tüketim (Fastfood)", "Oto", "Diğer"],
  },
  {
    key: "entryQuestion",
    label: "Hangi soru ile başladı?",
    type: "select",
    options: ["Bilgi alabilir miyim?", "Fiyat nedir?"],
  },
  {
    key: "priceOffer",
    label: "Fiyat teklifi ne kadar?",
    type: "select",
    options: ["6000", "5500", "Diğer"],
    extraInputOn: "Diğer",
    extraKey: "priceOther",
  },
  {
    key: "valueReason",
    label: "Hangi değer için geldi?",
    type: "select",
    options: ["Reklam", "Tekrarlı satış", "Hareketlilik"],
  },
  {
    key: "objection",
    label: "Hangi engel ile geldi?",
    type: "select",
    options: ["Pahalı", "Daha ucuza yapan var", "Ne sunacaksın ki?"],
  },
  { key: "saleHappened", label: "Satış gerçekleşti mi?", type: "select", options: ["Evet", "Hayır"] },
  {
    key: "paymentType",
    label: "Ödeme türü",
    type: "select",
    options: ["Direkt", "Kapora ile parçalı ödeme"],
  },
];

function GamifiedIntake({ onFinish }: { onFinish?: () => void }) {
  const { leads, setLeads } = useLeads();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({
    createdAt: new Date().toISOString(),
    pipeline: "Aday Cari",
  } as any);
  const total = QUESTIONS.length;
  const q = QUESTIONS[step];

  const progress = Math.round((step / total) * 100);
  const isLast = step >= total - 1;

  function next() {
    if (step < total - 1) setStep(step + 1);
  }
  function back() {
    if (step > 0) setStep(step - 1);
  }
  function finish() {
    const price =
      (answers as any).priceOffer === "Diğer"
        ? Number((answers as any).priceOther || 0)
        : Number((answers as any).priceOffer);
    const businessType = (answers as any).businessType || "Diğer";
    const churnRisk = deriveChurnRisk(answers as any);
    const segment = deriveSegment(businessType);

    const record = {
      id: (crypto as any).randomUUID(),
      ...(answers as any),
      priceNumeric: isNaN(price) ? null : price,
      churnRisk,
      segment,
    };
    setLeads([record, ...(leads as any[])]);
    onFinish?.();
  }

  const onEnter = () => {
    if (isLast) finish();
    else next();
  };

  return (
    <div className="relative">
      {/* top progress */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-2xl bg-sky-600 text-white grid place-items-center text-xs font-semibold shadow">
          {step + 1}
        </div>
        <div className="flex-1">
          <div className="flex justify-between text-xs text-slate-500 mb-1">
            <span>İlerleme</span>
            <span>{progress}%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-sky-600" style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      {/* animated question card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={q.key}
          initial={{ opacity: 0, y: 48, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -16, scale: 0.98 }}
          transition={{ type: "spring", stiffness: 300, damping: 24 }}
          className="rounded-3xl border border-slate-200 bg-white/90 p-5 md:p-7 shadow-xl backdrop-blur-sm"
          tabIndex={-1}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onEnter();
            }
          }}
        >
          <p className="text-xs uppercase tracking-wide text-slate-600">Soru</p>
          <h2 className="text-2xl font-semibold leading-snug mb-4 text-slate-800">
            {q.label}
          </h2>
          <QuestionInput
            q={q as any}
            value={(answers as any)[(q as any).key]}
            otherValue={(answers as any)[(q as any).extraKey || ""]}
            onChange={(val: any, extraVal: any) => {
              setAnswers((prev: any) => ({
                ...prev,
                [(q as any).key]: val,
                ...((q as any).extraKey ? { [(q as any).extraKey]: extraVal } : {}),
              }));
            }}
            onEnter={onEnter}
          />
        </motion.div>
      </AnimatePresence>

      <div className="mt-4 flex items-center justify-between">
        <button
          onClick={back}
          disabled={step === 0}
          className="px-4 py-2 text-sm rounded-2xl border border-slate-300 text-slate-700 disabled:opacity-40 bg-white/90 hover:bg-slate-50 shadow-sm"
        >
          Geri
        </button>
        {!isLast ? (
          <button className="px-5 py-2 text-sm rounded-2xl bg-sky-600 hover:bg-sky-700 text-white shadow" onClick={next}>
            Devam ↵
          </button>
        ) : (
          <button className="px-5 py-2 text-sm rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white shadow" onClick={finish}>
            Kaydı Tamamla ↵
          </button>
        )}
      </div>

      <div className="mt-6 text-xs text-slate-500 text-center">
        <p className="font-medium mb-1">Toplanan alanlar</p>
        <p>
          Instagram, kişi, telefon, işletme, tür, giriş sorusu, teklif, değer, engel, satış, ödeme tipi + türetilen: segment,
          churn riski.
        </p>
      </div>
    </div>
  );
}

function QuestionInput({ q, value, otherValue, onChange, onEnter }: { q: any; value: any; otherValue: any; onChange: (v: any, e?: any) => void; onEnter: ()=>void }) {
  if (q.type === "text") {
    return (
      <input
        className="w-full px-4 py-3 border border-slate-300 rounded-2xl outline-none focus:ring-2 focus:ring-sky-300 shadow-inner"
        placeholder={q.placeholder}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onEnter();
          }
        }}
      />
    );
  }
  if (q.type === "select") {
    const showExtra = (q as any).extraInputOn && value === (q as any).extraInputOn;
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {(q as any).options.map((opt: string) => (
            <label
              key={opt}
              className={`border rounded-2xl px-3 py-2 cursor-pointer text-sm transition shadow-sm ${
                value === opt
                  ? "border-transparent bg-sky-600 text-white"
                  : "border-slate-300 bg-white/90 hover:bg-slate-50"
              }`}
            >
              <input type="radio" className="hidden" checked={value === opt} onChange={() => onChange(opt)} />
              {opt}
            </label>
          ))}
        </div>
        {showExtra && (
          <div className="grid grid-cols-[1fr_auto] items-center gap-2">
            <input
              type="number"
              min={0}
              step={100}
              className="w-full px-4 py-3 border border-slate-300 rounded-2xl outline-none focus:ring-2 focus:ring-sky-300 shadow-inner"
              placeholder="Diğer – tutar yazın"
              value={otherValue || ""}
              onChange={(e) => onChange((q as any).extraInputOn, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  onEnter();
                }
              }}
            />
            <span className="text-sm px-3 py-2 rounded-xl bg-slate-100 text-slate-700 border border-slate-200">₺</span>
          </div>
        )}
        {showExtra && <PricePreview raw={otherValue} />}
      </div>
    );
  }
  return null;
}

function PricePreview({ raw }: { raw: any }) {
  const n = Number(raw as any);
  const valid = !isNaN(n) && n > 0;
  return (
    <div className={`text-xs ${valid ? "text-teal-700" : "text-amber-700"}`}>
      {valid ? `Girilen fiyat: ${formatPriceTRY(n)}` : "Geçerli bir tutar girin (sadece sayı)."}
    </div>
  );
}

function deriveSegment(businessType: string): string {
  if (/Hızlı/i.test(businessType)) return "Fastfood";
  if (/Kafe/i.test(businessType)) return "Kafe";
  if (/Oto/i.test(businessType)) return "Oto";
  return "Diğer";
}

function deriveChurnRisk(a: any): "Düşük" | "Orta" | "Yüksek" {
  let score = 0;
  if (a.objection === "Pahalı") score += 2;
  if (a.objection === "Daha ucuza yapan var") score += 3;
  if (a.entryQuestion === "Fiyat nedir?") score += 1;
  if (a.saleHappened === "Evet") score -= 3;
  if (a.paymentType === "Kapora ile parçalı ödeme") score -= 1;
  if ((a.priceOffer === "Diğer" ? Number(a.priceOther) : Number(a.priceOffer)) >= 6000) score += 1;
  if (score <= 0) return "Düşük";
  if (score <= 2) return "Orta";
  return "Yüksek";
}

// --- List & Analysis ---
function LeadList() {
  const { leads, setLeads } = useLeads();
  const [query, setQuery] = useState("");
  const [filterSegment, setFilterSegment] = useState("Hepsi");
  const [filterPipeline, setFilterPipeline] = useState("Hepsi");
  const [detailId, setDetailId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return (leads as any[]).filter((l) => {
      const q = query.toLowerCase();
      const text = [l.instagram, l.contactName, l.phone, l.businessName, l.businessType, l.segment].join(" ").toLowerCase();
      const passQuery = !q || text.includes(q);
      const passSeg = filterSegment === "Hepsi" || l.segment === filterSegment;
      const passPipe = filterPipeline === "Hepsi" || l.pipeline === filterPipeline;
      return passQuery && passSeg && passPipe;
    });
  }, [leads, query, filterSegment, filterPipeline]);

  function updatePipeline(id: string, pipeline: string) {
    setLeads((prev: any[]) => prev.map((l) => (l.id === id ? { ...l, pipeline } : l)));
  }

  function remove(id: string) {
    if (!confirm("Kaydı silmek istediğinize emin misiniz?")) return;
    setLeads((prev: any[]) => prev.filter((l) => l.id !== id));
  }

  const current = (leads as any[]).find((x) => x.id === detailId);

  return (
    <div className="space-y-4">
      <div className="bg-white/90 border border-slate-200 rounded-2xl p-4 shadow-sm backdrop-blur isolate">
        <div className="grid md:grid-cols-4 gap-3">
          <input
            className="px-3 py-2 border border-slate-300 rounded-2xl"
            placeholder="Ara: @instagram, isim, telefon, işletme…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <FilterSelect
            label="Segment"
            value={filterSegment}
            onChange={setFilterSegment}
            options={["Hepsi", "Kafe", "Fastfood", "Oto", "Diğer"]}
          />
          <FilterSelect
            label="Pipeline"
            value={filterPipeline}
            onChange={setFilterPipeline}
            options={["Hepsi", ...PIPELINE_STATES]}
          />
          <div className="flex gap-2">
            <ExportButtonJSON data={filtered as any[]} />
            <ExportButtonCSV data={filtered as any[]} />
          </div>
        </div>
      </div>

      <div className="bg-white/90 border border-slate-200 rounded-2xl overflow-hidden shadow-sm backdrop-blur">
        <table className="w-full text-sm">
          <thead className="bg-gradient-to-r from-amber-50 to-sky-50 text-slate-700">
            <tr>
              <Th>İsim</Th>
              <Th>İşletme</Th>
              <Th>Tür</Th>
              <Th>Segment</Th>
              <Th>Fiyat</Th>
              <Th>Engel</Th>
              <Th>Churn</Th>
              <Th>Pipeline</Th>
              <Th>Aksiyon</Th>
            </tr>
          </thead>
          <tbody>
            {(filtered as any[]).length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-10 text-slate-500">
                  Kayıt yok. Yeni Kayıt sekmesinden ekleyin.
                </td>
              </tr>
            )}
            <AnimatePresence initial={false}>
              {(filtered as any[]).map((l: any) => (
                <motion.tr
                  key={l.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer"
                  onClick={() => setDetailId(l.id)}
                >
                  <Td>
                    <div className="font-medium">{l.contactName || "—"}</div>
                    <div className="text-xs text-slate-500">{l.instagram || ""}</div>
                    <div className="text-xs text-slate-500">{l.phone || ""}</div>
                  </Td>
                  <Td>
                    <div className="font-medium">{l.businessName || "—"}</div>
                    <div className="text-xs text-slate-500">{new Date(l.createdAt).toLocaleDateString()}</div>
                  </Td>
                  <Td>{l.businessType}</Td>
                  <Td>
                    <Badge>{l.segment}</Badge>
                  </Td>
                  <Td>
                    {l.priceOffer === "Diğer" ? (
                      formatPriceTRY(Number(l.priceOther))
                    ) : (
                      formatPriceTRY(Number(l.priceOffer))
                    )}
                  </Td>
                  <Td>{l.objection}</Td>
                  <Td>
                    <Badge tone={l.churnRisk === 'Yüksek' ? 'red' : l.churnRisk === 'Orta' ? 'amber' : 'emerald'}>
                      {l.churnRisk}
                    </Badge>
                  </Td>
                  <Td>
                    <select
                      className="px-2 py-1 border border-slate-300 rounded-lg text-xs"
                      value={l.pipeline}
                      onChange={(e) => updatePipeline(l.id, e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {PIPELINE_STATES.map((s) => (
                        <option key={s}>{s}</option>
                      ))}
                    </select>
                  </Td>
                  <Td>
                    <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setDetailId(l.id)}
                        className="px-2 py-1 text-xs rounded-lg border border-sky-300 text-sky-700 hover:bg-sky-50"
                      >
                        Detay
                      </button>
                      <button
                        onClick={() => remove(l.id)}
                        className="px-2 py-1 text-xs rounded-lg border border-red-300 text-red-700 hover:bg-red-50"
                      >
                        Sil
                      </button>
                    </div>
                  </Td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Mobile card list */}
      <div className="md:hidden space-y-3">
        {(filtered as any[]).length === 0 && (
          <div className="bg-white/90 border border-slate-200 rounded-2xl p-6 text-center text-slate-500">
            Kayıt yok. Yeni Kayıt sekmesinden ekleyin.
          </div>
        )}
        <AnimatePresence initial={false}>
          {(filtered as any[]).map((l:any) => (
            <motion.div
              key={l.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="bg-white/90 border border-slate-200 rounded-2xl p-4 shadow-sm" 
              onClick={() => setDetailId(l.id)}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-semibold leading-tight">{l.contactName || '—'}</div>
                  <div className="text-xs text-slate-500">{l.instagram || ''}</div>
                  <div className="text-xs text-slate-500">{l.phone || ''}</div>
                </div>
                <Badge tone={l.churnRisk === 'Yüksek' ? 'red' : l.churnRisk === 'Orta' ? 'amber' : 'emerald'}>
                  {l.churnRisk}
                </Badge>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] uppercase text-slate-500">İşletme</div>
                  <div className="font-medium">{l.businessName || '—'}</div>
                </div>
                <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] uppercase text-slate-500">Tür / Segment</div>
                  <div className="font-medium">{l.businessType} · {l.segment}</div>
                </div>
                <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] uppercase text-slate-500">Fiyat</div>
                  <div className="font-medium">
                    {l.priceOffer === 'Diğer' ? formatPriceTRY(Number(l.priceOther)) : formatPriceTRY(Number(l.priceOffer))}
                  </div>
                </div>
                <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[11px] uppercase text-slate-500">Engel</div>
                  <div className="font-medium">{l.objection}</div>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <select
                  className="flex-1 px-3 py-2 border border-slate-300 rounded-xl text-sm"
                  value={l.pipeline}
                  onChange={(e) => { e.stopPropagation(); updatePipeline(l.id, e.target.value); }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {PIPELINE_STATES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="px-3 py-2 rounded-xl border border-sky-300 text-sky-700 text-sm"
                  onClick={(e) => { e.stopPropagation(); setDetailId(l.id); }}
                >
                  Detay
                </button>
                <button
                  type="button"
                  className="px-3 py-2 rounded-xl border border-red-300 text-red-700 text-sm"
                  onClick={(e) => { e.stopPropagation(); remove(l.id); }}
                >
                  Sil
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {current && (
          <DetailDrawer
            key={current.id}
            lead={current}
            onClose={() => setDetailId(null)}
            onSave={(updated) =>
              setLeads((prev: any[]) => prev.map((x) => (x.id === updated.id ? updated : x)))
            }
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string)=>void; options: string[] }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{left:number; top:number; width:number}>({ left: 0, top: 0, width: 0 });
  const btnRef = useRef<HTMLButtonElement | null>(null);

  function computePos() {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos({ left: Math.round(r.left), top: Math.round(r.bottom + 8), width: Math.round(Math.min(288, r.width)) });
  }

  useEffect(() => {
    if (!open) return;
    computePos();
    const onScroll = () => computePos();
    const onResize = () => computePos();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        className="w-full px-3 py-2 border border-slate-300 rounded-2xl text-left bg-white/90 hover:bg-slate-50"
        onClick={() => setOpen((o) => !o)}
      >
        <div className="text-[11px] uppercase text-slate-500">{label}</div>
        <div className="text-sm font-medium">{value}</div>
      </button>

      {open && createPortal(
        <>
          {/* overlay to capture outside clicks */}
          <div
            className="fixed inset-0 z-[95]"
            onClick={() => setOpen(false)}
          />
          <div
            className="fixed z-[100] p-2 rounded-2xl bg-white border border-slate-200 shadow-2xl"
            style={{ left: pos.left, top: pos.top, width: pos.width || undefined }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {options.map((opt) => (
                <button
                  key={opt}
                  className={`px-3 py-2 rounded-xl border text-sm ${value === opt ? 'border-sky-600 bg-sky-50' : 'border-slate-300 hover:bg-slate-50'}`}
                  onClick={() => { onChange(opt); setOpen(false); }}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}

function DetailDrawer({ lead, onClose, onSave }: { lead: any; onClose: ()=>void; onSave: (l:any)=>void }) {
  const [draft, setDraft] = useState({ ...lead });
  return (
    <motion.div className="fixed inset-0 z-30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <motion.div
        initial={{ x: 420 }}
        animate={{ x: 0 }}
        exit={{ x: 420 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        className="absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl border-l border-slate-200 flex flex-col"
      >
        <div className="p-5 border-b border-slate-200 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-semibold">Müşteri Detayı</h3>
          <button className="px-3 py-1.5 rounded-lg border border-slate-300" onClick={onClose}>Kapat</button>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          <Field label="Instagram"><input className="w-full px-3 py-2 border rounded-xl" value={draft.instagram||''} onChange={(e)=>setDraft({...draft, instagram:e.target.value})}/></Field>
          <Field label="Kişi İsmi"><input className="w-full px-3 py-2 border rounded-xl" value={draft.contactName||''} onChange={(e)=>setDraft({...draft, contactName:e.target.value})}/></Field>
          <Field label="Telefon"><input className="w-full px-3 py-2 border rounded-xl" value={draft.phone||''} onChange={(e)=>setDraft({...draft, phone:e.target.value})}/></Field>
          <Field label="İşletme İsmi"><input className="w-full px-3 py-2 border rounded-xl" value={draft.businessName||''} onChange={(e)=>setDraft({...draft, businessName:e.target.value})}/></Field>
          <Field label="İşletme Türü"><input className="w-full px-3 py-2 border rounded-xl" value={draft.businessType||''} onChange={(e)=>setDraft({...draft, businessType:e.target.value})}/></Field>
          <Field label="Giriş Sorusu"><input className="w-full px-3 py-2 border rounded-xl" value={draft.entryQuestion||''} onChange={(e)=>setDraft({...draft, entryQuestion:e.target.value})}/></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Teklif (6000/5500/Diğer)"><input className="w-full px-3 py-2 border rounded-xl" value={draft.priceOffer||''} onChange={(e)=>setDraft({...draft, priceOffer:e.target.value})}/></Field>
            <Field label="Diğer Tutar"><input type="number" className="w-full px-3 py-2 border rounded-xl" value={draft.priceOther||''} onChange={(e)=>setDraft({...draft, priceOther:e.target.value})}/></Field>
          </div>
          <Field label="Değer Nedeni"><input className="w-full px-3 py-2 border rounded-xl" value={draft.valueReason||''} onChange={(e)=>setDraft({...draft, valueReason:e.target.value})}/></Field>
          <Field label="Engel"><input className="w-full px-3 py-2 border rounded-xl" value={draft.objection||''} onChange={(e)=>setDraft({...draft, objection:e.target.value})}/></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Satış Gerçekleşti mi?"><input className="w-full px-3 py-2 border rounded-xl" value={draft.saleHappened||''} onChange={(e)=>setDraft({...draft, saleHappened:e.target.value})}/></Field>
            <Field label="Ödeme Türü"><input className="w-full px-3 py-2 border rounded-xl" value={draft.paymentType||''} onChange={(e)=>setDraft({...draft, paymentType:e.target.value})}/></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Segment"><input className="w-full px-3 py-2 border rounded-xl" value={draft.segment||''} onChange={(e)=>setDraft({...draft, segment:e.target.value})}/></Field>
            <Field label="Churn Risk"><input className="w-full px-3 py-2 border rounded-xl" value={draft.churnRisk||''} onChange={(e)=>setDraft({...draft, churnRisk:e.target.value})}/></Field>
          </div>
          <Field label="Pipeline"><input className="w-full px-3 py-2 border rounded-xl" value={draft.pipeline||''} onChange={(e)=>setDraft({...draft, pipeline:e.target.value})}/></Field>
        </div>
        <div className="p-4 border-t border-slate-200 flex items-center justify-end gap-2 shrink-0">
          <button className="px-4 py-2 rounded-xl border" onClick={onClose}>Vazgeç</button>
          <button
            className="px-4 py-2 rounded-xl text-white bg-sky-600 hover:bg-sky-700"
            onClick={() => onSave({
              ...draft,
              segment: deriveSegment(draft.businessType||''),
              churnRisk: deriveChurnRisk(draft),
            })}
          >Kaydet</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="text-xs text-slate-500 mb-1">{label}</div>
      {children}
    </label>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="text-left font-semibold px-3 py-2">{children}</th>;
}
function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2 align-top">{children}</td>;
}

function Badge({ children, tone = "gray" }: { children: React.ReactNode; tone?: "gray" | "emerald" | "amber" | "red" | "blue" }) {
  const tones: Record<string, string> = {
    gray: "bg-slate-100 text-slate-700 border-slate-200",
    emerald: "bg-emerald-100 text-emerald-800 border-emerald-200",
    amber: "bg-amber-100 text-amber-900 border-amber-200",
    red: "bg-red-100 text-red-800 border-red-200",
    blue: "bg-blue-100 text-blue-800 border-blue-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-lg border text-xs ${tones[tone] || tones.gray}`}>
      {children}
    </span>
  );
}

function ExportButtonJSON({ data }: { data: any[] }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <button onClick={copy} className="px-3 py-2 text-sm rounded-2xl border border-slate-300 hover:bg-slate-50">
      {copied ? "JSON kopyalandı" : "JSON kopyala"}
    </button>
  );
}

function ExportButtonCSV({ data }: { data: any[] }) {
  function download() {
    const csv = toCSV(data);
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sayac-makinesi-crm-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  return (
    <button onClick={download} className="px-3 py-2 text-sm rounded-2xl border border-slate-300 hover:bg-slate-50">
      CSV indir
    </button>
  );
}

function NotesPanel() {
  const KEY = "sm_crm_notes";
  const [txt, setTxt] = useState("");
  useEffect(() => {
    const r = localStorage.getItem(KEY);
    if (r) setTxt(r);
  }, []);
  useEffect(() => {
    localStorage.setItem(KEY, txt);
  }, [txt]);
  return (
    <div className="bg-white/90 border border-slate-200 rounded-2xl p-4 shadow-sm backdrop-blur">
      <h3 className="text-lg font-semibold mb-2">Hızlı Notlar</h3>
      <textarea
        value={txt}
        onChange={(e) => setTxt(e.target.value)}
        rows={10}
        className="w-full px-3 py-2 border border-slate-300 rounded-2xl"
        placeholder="Saha içgörüleri, engel cümleleri, referans linkleri…"
      />
      <div className="text-xs text-slate-500 mt-2">Otomatik kaydedilir.</div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="max-w-5xl mx-auto px-4 py-10 text-xs text-slate-500">
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span>© {new Date().getFullYear()} Sayaç Makinesi CRM MVP</span>
        <span>•</span>
        <span>Animated intake · Pipeline · CSV</span>
      </div>
    </footer>
  );
}

/***************************
 * Mini Testler (çalıştırılır)
 ***************************/
(function DEV_TESTS() {
  try {
    // 1) CSV kaçış testi – virgül, çift tırnak ve newline
    const rows = [
      {
        instagram: "@test,kisi",
        contactName: 'Alihan "AA"',
        phone: "+90 555 555 55 55",
        businessName: "Satır\nAtlayan",
        businessType: "Kafe",
        entryQuestion: "Fiyat nedir?",
        priceOffer: "6000",
        priceOther: "",
        valueReason: "Reklam",
        objection: "Pahalı",
        saleHappened: "Hayır",
        paymentType: "Direkt",
        segment: "Kafe",
        churnRisk: "Orta",
        pipeline: "Aday Cari",
        createdAt: new Date(0).toISOString(),
        priceNumeric: 6000,
      },
    ];
    const csv = toCSV(rows);
    console.assert(csv.includes('\n'), "CSV newline yok");
    console.assert(csv.split('\n').length >= 2, "CSV beklenen satır sayısı en az 2 olmalı");
    console.assert(/"Alihan \"AA\""/.test(csv), "Çift tırnak kaçışı başarısız");
    console.assert(/"Satır\nAtlayan"/.test(csv), "Newline kaçışı başarısız");

    // 2) Segment fonksiyonu
    console.assert(deriveSegment("Hızlı Tüketim (Fastfood)") === "Fastfood", "Segment: Fastfood beklenirdi");
    console.assert(deriveSegment("Kafe") === "Kafe", "Segment: Kafe beklenirdi");
    console.assert(deriveSegment("Oto Yıkama") === "Oto", "Segment: Oto beklenirdi");

    // 3) Churn skoru temel kontrol
    const riskLow = deriveChurnRisk({ objection: "", entryQuestion: "", saleHappened: "Evet", paymentType: "Direkt", priceOffer: "5500" });
    const riskHigh = deriveChurnRisk({ objection: "Daha ucuza yapan var", entryQuestion: "Fiyat nedir?", saleHappened: "Hayır", paymentType: "Direkt", priceOffer: "6000" });
    console.assert(riskLow === "Düşük", "Churn: Düşük beklenirdi");
    console.assert(riskHigh === "Yüksek", "Churn: Yüksek beklenirdi");

    // 4) CSV başlık sırası korunuyor mu?
    const headerLine = csv.split('\n')[0];
    console.assert(headerLine === CSV_HEADERS.join(','), "CSV başlık sırası bozulmamalı");

    // 5) TRY formatlayıcı
    console.assert(formatPriceTRY(6000).includes("₺"), "TRY formatı beklenirdi");
  } catch (e) {
    console.warn("DEV_TESTS hata:", e);
  }
})();
