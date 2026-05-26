import { useState, useRef, useCallback } from "react";
import { store, fileToBase64, ASSET_CATEGORIES, UTILITY_TYPES } from "../store/index.js";
import { Input, Btn, Spinner } from "../components/ui.jsx";

async function extractData(file, mode) {
  const base64 = await fileToBase64(file);
  const contentBlock = file.type === "application/pdf"
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
    : { type: "image",    source: { type: "base64", media_type: file.type, data: base64 } };

  const prompts = {
    receipt: `Analiziraj račun za nakup naprave ali opreme. Vrni IZKLJUČNO veljaven JSON brez markdown ali besedila:
{"name":"kratko ime naprave (npr. Pralni stroj, Pe\u010dica)","brand":"znamka ali null","model":"model ali null","category":"ena od: Ogrevanje & Hlajenje|Kuhinja|Kopalnica|Streha & Fasada|Vrt & Zunanjost|Varnost|Elektrika|Vodovodna napeljava|Ostalo","purchase_date":"YYYY-MM-DD ali null","price":"\u0161tevilo ali null","supplier":"prodajalec ali null","warranty_years":"\u0161tevilo ali null","warranty_expires":"YYYY-MM-DD ali null","specs":{},"notes":"kratka opomba ali null","confidence":"high|medium|low"}`,

    plate: `Analiziraj tehni\u010dno tablico (etiketo) naprave. Tukaj so podatki o napravi (model, serijska \u0161tevilka, napajanje, mo\u010d, itd.).
Vrni IZKLJUČNO veljaven JSON brez markdown ali besedila:
{"name":"kratko ime naprave (npr. Klimatska naprava, Pe\u010dica, Toplotna \u010drpalka)","brand":"znamka","model":"model ali artikel \u0161t.","category":"ena od: Ogrevanje & Hlajenje|Kuhinja|Kopalnica|Streha & Fasada|Vrt & Zunanjost|Varnost|Elektrika|Vodovodna napeljava|Ostalo","specs":{"Serijska \u0161tevilka":"vrednost","Leto izdelave":"vrednost","Napetost":"vrednost","Mo\u010d":"vrednost"},"notes":"npr. Made in...","confidence":"high|medium|low"}

V "specs" objekt VKLJU\u010cI VSA polja ki jih vidi\u0161 na tablici (serijska, leto, napetost, mo\u010d, frekvenca, hladivo/refrigerant, te\u017ca, IP koda, kapaciteta, energetski razred, itd.). Klju\u010di naj bodo v sloven\u0161\u010dini, vrednosti to\u010dno kot na tablici. Ne izpu\u0161\u010daj relevantnih podatkov.`,

    photo: `Analiziraj fotografijo naprave ali opreme (brez tablice). Prepoznaj kaj je naprava in znamko \u010de je vidna.
Vrni IZKLJUČNO veljaven JSON brez markdown ali besedila:
{"name":"kratko ime naprave (npr. Indukcijska plo\u0161\u010da, Hladilnik, Klima)","brand":"znamka \u010de jo vidi\u0161 ali null","model":"null","category":"ena od: Ogrevanje & Hlajenje|Kuhinja|Kopalnica|Streha & Fasada|Vrt & Zunanjost|Varnost|Elektrika|Vodovodna napeljava|Ostalo","specs":{},"notes":"opi\u0161i kar vidi\u0161 (barvo, tip, posebnosti)","confidence":"high|medium|low"}`,

    utility: `Analiziraj ra\u010dun za komunalne storitve. Vrni IZKLJUČNO veljaven JSON brez markdown ali besedila:
{"utility_type":"elektrika|plin|voda|internet|odpadki|ostalo","provider":"ime ponudnika","amount":"\u0161tevilo ali null","billing_period_start":"YYYY-MM-DD ali null","billing_period_end":"YYYY-MM-DD ali null","due_date":"YYYY-MM-DD ali null","consumption":"npr 234 kWh ali null","contract_expires":"YYYY-MM-DD ali null","account_number":"null ali string","notes":"null ali string","confidence":"high|medium|low"}`,
  };

  const resp = await fetch("/api/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-5",
      max_tokens: 1500,
      messages: [{ role: "user", content: [contentBlock, { type: "text", text: prompts[mode] }] }],
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

function SpecsEditor({ specs, onChange }) {
  const entries = Object.entries(specs || {});
  const [newKey, setNewKey] = useState("");
  const [newVal, setNewVal] = useState("");

  const updateKey = (oldKey, newKey) => {
    const next = {};
    Object.entries(specs).forEach(([k, v]) => { next[k === oldKey ? newKey : k] = v; });
    onChange(next);
  };
  const updateVal = (key, val) => onChange({ ...specs, [key]: val });
  const removeKey = (key) => { const next = { ...specs }; delete next[key]; onChange(next); };
  const addRow = () => { if (newKey) { onChange({ ...specs, [newKey]: newVal }); setNewKey(""); setNewVal(""); } };

  return (
    <div style={{ background: "#0d0d0c", border: "1px solid #1e1e1c", borderRadius: 8, padding: 12 }}>
      <div style={{ fontSize: 10, letterSpacing: 2, color: "#666", textTransform: "uppercase", marginBottom: 10 }}>
        Specifikacije ({entries.length})
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {entries.map(([k, v]) => (
          <div key={k} style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input value={k} onChange={e => updateKey(k, e.target.value)} style={{
              background: "#111", border: "1px solid #252525", borderRadius: 5,
              color: "#a09880", padding: "6px 9px", fontSize: 12, fontFamily: "inherit",
              flex: 1, outline: "none", minWidth: 0,
            }}/>
            <span style={{ color: "#444" }}>:</span>
            <input value={v} onChange={e => updateVal(k, e.target.value)} style={{
              background: "#111", border: "1px solid #252525", borderRadius: 5,
              color: "#e8e4dc", padding: "6px 9px", fontSize: 12, fontFamily: "inherit",
              flex: 1.5, outline: "none", minWidth: 0,
            }}/>
            <button onClick={() => removeKey(k)} style={{
              background: "none", border: "none", color: "#444",
              cursor: "pointer", fontSize: 14, padding: "0 4px",
            }}>×</button>
          </div>
        ))}
        <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 4 }}>
          <input value={newKey} onChange={e => setNewKey(e.target.value)}
            placeholder="Lastnost..." onKeyDown={e => e.key === "Enter" && addRow()} style={{
            background: "#0a0a09", border: "1px dashed #252525", borderRadius: 5,
            color: "#a09880", padding: "6px 9px", fontSize: 12, fontFamily: "inherit",
            flex: 1, outline: "none", minWidth: 0,
          }}/>
          <span style={{ color: "#444" }}>:</span>
          <input value={newVal} onChange={e => setNewVal(e.target.value)}
            placeholder="Vrednost..." onKeyDown={e => e.key === "Enter" && addRow()} style={{
            background: "#0a0a09", border: "1px dashed #252525", borderRadius: 5,
            color: "#e8e4dc", padding: "6px 9px", fontSize: 12, fontFamily: "inherit",
            flex: 1.5, outline: "none", minWidth: 0,
          }}/>
          <button onClick={addRow} style={{
            background: "#1a1a18", border: "1px solid #333", borderRadius: 5,
            color: "#c8b89a", cursor: "pointer", padding: "5px 10px",
            fontSize: 12, fontFamily: "inherit",
          }}>+</button>
        </div>
      </div>
    </div>
  );
}

const MODES = [
  { id: "receipt",  label: "🧾 Račun",     hint: "Račun za nakup naprave" },
  { id: "plate",    label: "🏷️ Tablica",   hint: "Tehnična etiketa na napravi" },
  { id: "photo",    label: "📷 Foto",      hint: "Samo fotografija naprave" },
  { id: "utility",  label: "💡 Utility",   hint: "Račun za komunalne storitve" },
];

export default function ScannerScreen({ onSaved }) {
  const [mode, setMode]           = useState("receipt");
  const [phase, setPhase]         = useState("upload");
  const [dragOver, setDragOver]   = useState(false);
  const [preview, setPreview]     = useState(null);
  const [extracted, setExtracted] = useState(null);
  const [error, setError]         = useState(null);
  const [lastSaved, setLastSaved] = useState(null);
  const fileRef = useRef();

  const isUtility = mode === "utility";
  const isAsset   = !isUtility;
  const utype = UTILITY_TYPES.find(u => u.id === extracted?.utility_type) || UTILITY_TYPES[5];
  const canSave = isUtility ? !!extracted?.provider : !!extracted?.name;

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
    if (isUtility) store.saveUtil(extracted);
    else store.saveAsset(extracted);
    setLastSaved(extracted);
    onSaved();
    setPhase("saved");
  };

  const reset = () => { setPhase("upload"); setPreview(null); setExtracted(null); setError(null); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Mode toggle */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {MODES.map(m => (
            <button key={m.id} onClick={() => { setMode(m.id); reset(); }} style={{
              background: mode === m.id ? "#1e1e1c" : "transparent",
              border: mode === m.id ? "1px solid #8B7355" : "1px solid #252525",
              borderRadius: 8, color: mode === m.id ? "#e8e4dc" : "#666",
              padding: "8px 14px", fontSize: 13, cursor: "pointer",
              fontFamily: "inherit", transition: "all 0.15s", flex: "1 0 auto",
              minWidth: 100,
            }}>{m.label}</button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: "#555", fontStyle: "italic" }}>
          {MODES.find(m => m.id === mode)?.hint}
        </div>
      </div>

      {phase === "upload" && (
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current.click()}
          style={{
            border: `2px dashed ${dragOver ? "#8B7355" : "#252525"}`,
            borderRadius: 16, padding: "52px 28px", textAlign: "center",
            cursor: "pointer", background: dragOver ? "#0f0d08" : "transparent",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 14,
            transition: "all 0.2s",
          }}
        >
          <div style={{ fontSize: 36, opacity: 0.2 }}>⬆</div>
          <div>
            <div style={{ fontSize: 16, fontStyle: "italic", marginBottom: 6 }}>
              Naloži ali slikaj
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
            AI bere…<br />
            <span style={{ fontSize: 12, color: "#555" }}>{MODES.find(m => m.id === mode)?.hint}</span>
          </div>
        </div>
      )}

      {phase === "confirm" && extracted && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            {preview && <img src={preview} alt="" style={{ width: 68, height: 68, objectFit: "cover", borderRadius: 8, border: "1px solid #252525", flexShrink: 0 }} />}
            <div>
              <div style={{ fontSize: 15, fontStyle: "italic", marginBottom: 6 }}>
                {isUtility ? `${utype.icon} ${utype.label} račun` : "Potrdi podatke"}
              </div>
              <ConfidenceBadge level={extracted.confidence} />
            </div>
          </div>

          {isUtility ? (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <Input label="Tip" value={extracted.utility_type} onChange={v => setExtracted({ ...extracted, utility_type: v })} options={UTILITY_TYPES} />
              <Input label="Ponudnik *" value={extracted.provider} onChange={v => setExtracted({ ...extracted, provider: v })} />
              <Input label="Znesek (€)" value={extracted.amount} onChange={v => setExtracted({ ...extracted, amount: v })} type="number" />
              <Input label="Rok plačila" value={extracted.due_date} onChange={v => setExtracted({ ...extracted, due_date: v })} type="date" />
              <Input label="Obdobje od" value={extracted.billing_period_start} onChange={v => setExtracted({ ...extracted, billing_period_start: v })} type="date" />
              <Input label="Obdobje do" value={extracted.billing_period_end} onChange={v => setExtracted({ ...extracted, billing_period_end: v })} type="date" />
              <Input label="Poraba" value={extracted.consumption} onChange={v => setExtracted({ ...extracted, consumption: v })} />
              <Input label="Pogodba poteče" value={extracted.contract_expires} onChange={v => setExtracted({ ...extracted, contract_expires: v })} type="date" />
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <Input label="Ime naprave *" value={extracted.name} onChange={v => setExtracted({ ...extracted, name: v })} />
                <Input label="Kategorija" value={extracted.category} onChange={v => setExtracted({ ...extracted, category: v })} options={ASSET_CATEGORIES} />
                <Input label="Znamka" value={extracted.brand} onChange={v => setExtracted({ ...extracted, brand: v })} />
                <Input label="Model" value={extracted.model} onChange={v => setExtracted({ ...extracted, model: v })} />
                {mode === "receipt" && <>
                  <Input label="Datum nakupa" value={extracted.purchase_date} onChange={v => setExtracted({ ...extracted, purchase_date: v })} type="date" />
                  <Input label="Cena (€)" value={extracted.price} onChange={v => setExtracted({ ...extracted, price: v })} type="number" />
                  <Input label="Dobavitelj" value={extracted.supplier} onChange={v => setExtracted({ ...extracted, supplier: v })} />
                  <Input label="Garancija poteče" value={extracted.warranty_expires} onChange={v => setExtracted({ ...extracted, warranty_expires: v })} type="date" />
                </>}
              </div>

              <SpecsEditor
                specs={extracted.specs || {}}
                onChange={s => setExtracted({ ...extracted, specs: s })}
              />

              {extracted.notes && (
                <Input label="Opomba" value={extracted.notes} onChange={v => setExtracted({ ...extracted, notes: v })} />
              )}
            </>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <Btn onClick={handleSave} disabled={!canSave} style={{ flex: 1 }}>
              {isUtility ? "Shrani utility →" : "Shrani napravo →"}
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
              {isUtility
                ? `${utype.icon} ${lastSaved?.provider || utype.label} dodan`
                : `${lastSaved?.name} dodan v inventar`}
            </div>
          </div>
          <Btn onClick={reset} variant="accent">+ Dodaj naslednji</Btn>
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*,.pdf" capture="environment" style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
    </div>
  );
}
