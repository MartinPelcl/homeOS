import { useState, useRef, useCallback } from "react";
import { store, fileToBase64, ASSET_CATEGORIES, UTILITY_TYPES } from "../store/index.js";
import { Input, Btn, Spinner } from "../components/ui.jsx";

async function extractData(file, mode) {
  const base64 = await fileToBase64(file);
  const contentBlock = file.type === "application/pdf"
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
    : { type: "image",    source: { type: "base64", media_type: file.type, data: base64 } };

  const assetPrompt = `Analiziraj to sliko ali dokument. Vrni IZKLJUČNO veljaven JSON brez markdown ali besedila:
{"name":"kratko ime naprave","brand":"znamka ali null","model":"model ali null","category":"ena od: Ogrevanje & Hlajenje|Kuhinja|Kopalnica|Streha & Fasada|Vrt & Zunanjost|Varnost|Elektrika|Vodovodna napeljava|Ostalo","purchase_date":"YYYY-MM-DD ali null","price":"število ali null","supplier":"prodajalec ali null","warranty_years":"število ali null","warranty_expires":"YYYY-MM-DD ali null","notes":"kratka opomba ali null","confidence":"high|medium|low"}`;

  const utilPrompt = `Analiziraj ta račun za komunalne storitve. Vrni IZKLJUČNO veljaven JSON brez markdown ali besedila:
{"utility_type":"elektrika|plin|voda|internet|odpadki|ostalo","provider":"ime ponudnika","amount":"število ali null","billing_period_start":"YYYY-MM-DD ali null","billing_period_end":"YYYY-MM-DD ali null","due_date":"YYYY-MM-DD ali null","consumption":"npr 234 kWh ali null","contract_expires":"YYYY-MM-DD ali null","account_number":"null ali string","notes":"null ali string","confidence":"high|medium|low"}`;

  const resp = await fetch("/api/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      messages: [{ role: "user", content: [contentBlock, { type: "text", text: mode === "utility" ? utilPrompt : assetPrompt }] }],
    }),
  });
  const data = await resp.json();
  const text = data.content?.find(b => b.type === "text")?.text || "";
  return JSON.parse(text.replace(/```json|```/g, "").trim());
}

function ConfidenceBadge({ level }) {
  const map = { high: ["#4a7c59","Visoka"], medium: ["#7c6a2a","Srednja"], low: ["#7c2a2a","Nizka"] };
  const [c, l] = map[level] || ["#555","—"];
  return <span style={{ fontSize: 10, padding: "2px 9px", borderRadius: 10, background: c+"22", color: c, border: `1px solid ${c}44` }}>{l} zanesljivost</span>;
}

export default function ScannerScreen({ onSaved }) {
  const [mode, setMode]           = useState("asset");
  const [phase, setPhase]         = useState("upload");
  const [dragOver, setDragOver]   = useState(false);
  const [preview, setPreview]     = useState(null);
  const [extracted, setExtracted] = useState(null);
  const [error, setError]         = useState(null);
  const [lastSaved, setLastSaved] = useState(null);
  const fileRef = useRef();

  const handleFile = useCallback(async (f) => {
    if (!f) return;
    setError(null);
    setPreview(f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
    setPhase("scanning");
    try {
      setExtracted(await extractData(f, mode));
      setPhase("confirm");
    } catch (e) {
      setError("Ekstrakcija ni uspela: " + e.message);
      setPhase("upload");
    }
  }, [mode]);

  const handleDrop = useCallback((e) => {
    e.preventDefault(); setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const handleSave = () => {
    if (mode === "utility") store.saveUtil(extracted);
    else store.saveAsset(extracted);
    setLastSaved(extracted);
    onSaved();
    setPhase("saved");
  };

  const reset = () => { setPhase("upload"); setPreview(null); setExtracted(null); setError(null); };
  const utype = UTILITY_TYPES.find(u => u.id === extracted?.utility_type) || UTILITY_TYPES[5];
  const canSave = mode === "utility" ? !!extracted?.provider : !!extracted?.name;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ display: "flex", background: "#0d0d0c", borderRadius: 8, padding: 3, border: "1px solid #1e1e1c", width: "fit-content" }}>
        {[["asset","🔧 Naprava"],["utility","💡 Utility"]].map(([m,l]) => (
          <button key={m} onClick={() => { setMode(m); reset(); }} style={{
            background: mode === m ? "#1e1e1c" : "none",
            border: mode === m ? "1px solid #333" : "1px solid transparent",
            borderRadius: 6, color: mode === m ? "#e8e4dc" : "#666",
            padding: "7px 20px", fontSize: 13, cursor: "pointer",
            fontFamily: "inherit", transition: "all 0.15s",
          }}>{l}</button>
        ))}
      </div>

      {phase === "upload" && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current.click()}
          style={{
            border: `2px dashed ${dragOver ? "#8B7355" : "#252525"}`,
            borderRadius: 16, padding: "56px 32px", textAlign: "center",
            cursor: "pointer", background: dragOver ? "#0f0d08" : "transparent",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
            transition: "all 0.2s",
          }}
        >
          <div style={{ fontSize: 36, opacity: 0.2 }}>⬆</div>
          <div>
            <div style={{ fontSize: 17, fontStyle: "italic", marginBottom: 6 }}>
              {mode === "utility" ? "Naloži račun za komunalne storitve" : "Naloži račun ali fotografijo naprave"}
            </div>
            <div style={{ fontSize: 12, color: "#666", lineHeight: 1.8 }}>JPG · PNG · PDF</div>
          </div>
          {error && <div style={{ color: "#c85a5a", fontSize: 13 }}>{error}</div>}
        </div>
      )}

      {phase === "scanning" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20, padding: "40px 0" }}>
          {preview && <img src={preview} alt="" style={{ maxHeight: 150, borderRadius: 8, border: "1px solid #252525", opacity: 0.5, filter: "grayscale(30%)" }} />}
          <Spinner />
          <div style={{ fontSize: 15, fontStyle: "italic", color: "#a09880", textAlign: "center" }}>
            AI bere dokument…<br />
            <span style={{ fontSize: 12, color: "#555" }}>
              {mode === "utility" ? "Ekstrakcija: ponudnik, znesek, datum poteka..." : "Ekstrakcija: naprava, garancija, cena..."}
            </span>
          </div>
        </div>
      )}

      {phase === "confirm" && extracted && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            {preview && <img src={preview} alt="" style={{ width: 68, height: 68, objectFit: "cover", borderRadius: 8, border: "1px solid #252525", flexShrink: 0 }} />}
            <div>
              <div style={{ fontSize: 15, fontStyle: "italic", marginBottom: 6 }}>
                {mode === "utility" ? `${utype.icon} ${utype.label} račun` : "Potrdi podatke"}
              </div>
              <ConfidenceBadge level={extracted.confidence} />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {mode === "utility" ? <>
              <Input label="Tip" value={extracted.utility_type} onChange={v => setExtracted({ ...extracted, utility_type: v })} options={UTILITY_TYPES} />
              <Input label="Ponudnik *" value={extracted.provider} onChange={v => setExtracted({ ...extracted, provider: v })} />
              <Input label="Znesek (€)" value={extracted.amount} onChange={v => setExtracted({ ...extracted, amount: v })} type="number" />
              <Input label="Rok plačila" value={extracted.due_date} onChange={v => setExtracted({ ...extracted, due_date: v })} type="date" />
              <Input label="Obdobje od" value={extracted.billing_period_start} onChange={v => setExtracted({ ...extracted, billing_period_start: v })} type="date" />
              <Input label="Obdobje do" value={extracted.billing_period_end} onChange={v => setExtracted({ ...extracted, billing_period_end: v })} type="date" />
              <Input label="Poraba" value={extracted.consumption} onChange={v => setExtracted({ ...extracted, consumption: v })} />
              <Input label="Pogodba poteče" value={extracted.contract_expires} onChange={v => setExtracted({ ...extracted, contract_expires: v })} type="date" />
            </> : <>
              <Input label="Ime naprave *" value={extracted.name} onChange={v => setExtracted({ ...extracted, name: v })} />
              <Input label="Kategorija" value={extracted.category} onChange={v => setExtracted({ ...extracted, category: v })} options={ASSET_CATEGORIES} />
              <Input label="Znamka" value={extracted.brand} onChange={v => setExtracted({ ...extracted, brand: v })} />
              <Input label="Model" value={extracted.model} onChange={v => setExtracted({ ...extracted, model: v })} />
              <Input label="Datum nakupa" value={extracted.purchase_date} onChange={v => setExtracted({ ...extracted, purchase_date: v })} type="date" />
              <Input label="Cena (€)" value={extracted.price} onChange={v => setExtracted({ ...extracted, price: v })} type="number" />
              <Input label="Dobavitelj" value={extracted.supplier} onChange={v => setExtracted({ ...extracted, supplier: v })} />
              <Input label="Garancija poteče" value={extracted.warranty_expires} onChange={v => setExtracted({ ...extracted, warranty_expires: v })} type="date" />
            </>}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={handleSave} disabled={!canSave} style={{ flex: 1 }}>
              {mode === "utility" ? "Shrani utility →" : "Shrani napravo →"}
            </Btn>
            <Btn onClick={reset} variant="ghost">Prekliči</Btn>
          </div>
        </div>
      )}

      {phase === "saved" && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 18, padding: "40px 0", textAlign: "center" }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#1a2e1a", border: "1px solid #2D5A27", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>✓</div>
          <div>
            <div style={{ fontSize: 18, fontStyle: "italic", marginBottom: 6 }}>Shranjeno!</div>
            <div style={{ fontSize: 13, color: "#666" }}>
              {mode === "utility"
                ? `${utype.icon} ${lastSaved?.provider || utype.label} dodan`
                : `${lastSaved?.name} dodan v inventar`}
            </div>
          </div>
          <Btn onClick={reset} variant="accent">+ Dodaj naslednji</Btn>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*,.pdf" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
    </div>
  );
}
