import { useState } from "react";
import { store, daysUntil, urgencyColor, TASK_TEMPLATES } from "../store/index.js";
import { Input, Btn, Card, Badge } from "../components/ui.jsx";

const REPEAT_OPTIONS = ["enkrat","tedensko","mesečno","letno","sezonsko","custom"];
const STATUS_MAP = {
  pending:     ["#555",    "Čaka"],
  in_progress: ["#4A8FE0", "V teku"],
  done:        ["#4a8f5a", "Opravljeno"],
  skipped:     ["#666",    "Preskočeno"],
};

function TaskRow({ task, onUpdate, onDelete }) {
  const [c, l] = STATUS_MAP[task.status] || STATUS_MAP.pending;
  const due = daysUntil(task.rok);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid #1a1a18" }}>
      <button onClick={() => onUpdate(task.id, { status: task.status === "done" ? "pending" : "done" })} style={{
        width: 20, height: 20, borderRadius: 4, border: `1px solid ${c}`,
        background: task.status === "done" ? c : "transparent",
        cursor: "pointer", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {task.status === "done" && <span style={{ color: "#fff", fontSize: 11 }}>✓</span>}
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: task.status === "done" ? "#555" : "#e8e4dc", textDecoration: task.status === "done" ? "line-through" : "none" }}>
          {task.naziv}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 3 }}>
          {task.ponavljanje && <span style={{ fontSize: 10, color: "#666" }}>{task.ponavljanje}</span>}
          {task.rok && <span style={{ fontSize: 10, color: urgencyColor(due) }}>{due < 0 ? "Zamujeno" : due === 0 ? "Danes" : `čez ${due} dni`}</span>}
        </div>
      </div>
      <button onClick={() => onDelete(task.id)} style={{ background: "none", border: "none", color: "#444", cursor: "pointer", fontSize: 16, padding: "2px 6px" }}>×</button>
    </div>
  );
}

function AddTaskForm({ groupId, assetId, onSave, onCancel }) {
  const [naziv, setNaziv]             = useState("");
  const [ponavljanje, setPonavljanje] = useState("letno");
  const [rok, setRok]                 = useState("");

  return (
    <div style={{ background: "#0d0d0c", borderRadius: 8, padding: "12px", display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
      <Input placeholder="Naziv taska..." value={naziv} onChange={setNaziv} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Input label="Ponavljanje" value={ponavljanje} onChange={setPonavljanje} options={REPEAT_OPTIONS} />
        <Input label="Rok" value={rok} onChange={setRok} type="date" />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <Btn onClick={() => { if (naziv) { store.saveTask({ naziv, ponavljanje, rok: rok || null, asset_id: assetId, group_id: groupId, status: "pending" }); onSave(); } }} small>Shrani</Btn>
        <Btn onClick={onCancel} variant="ghost" small>Prekliči</Btn>
      </div>
    </div>
  );
}

function TaskGroup({ group, assetId, onRefresh }) {
  const [open, setOpen]       = useState(true);
  const [adding, setAdding]   = useState(false);
  const tasks = store.getTasks().filter(t => t.group_id === group.id);

  const handleUpdate = (id, patch) => { store.updateTask(id, patch); onRefresh(); };
  const handleDelete = (id)        => { store.deleteTask(id); onRefresh(); };

  return (
    <div style={{ background: "#111", border: "1px solid #1e1e1c", borderRadius: 10, overflow: "hidden" }}>
      <div onClick={() => setOpen(!open)} style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "12px 16px", cursor: "pointer", background: "#141412",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 12, fontStyle: "italic", color: "#e8e4dc" }}>{group.naziv}</span>
          <span style={{ fontSize: 10, color: "#555" }}>{tasks.length} taskov</span>
        </div>
        <span style={{ color: "#555", fontSize: 12 }}>{open ? "▲" : "▼"}</span>
      </div>

      {open && (
        <div style={{ padding: "0 16px 12px" }}>
          {tasks.length === 0 && !adding && (
            <div style={{ fontSize: 12, color: "#444", fontStyle: "italic", padding: "10px 0" }}>Ni taskov.</div>
          )}
          {tasks.map(t => <TaskRow key={t.id} task={t} onUpdate={handleUpdate} onDelete={handleDelete} />)}
          {adding
            ? <AddTaskForm groupId={group.id} assetId={assetId} onSave={() => { setAdding(false); onRefresh(); }} onCancel={() => setAdding(false)} />
            : <button onClick={() => setAdding(true)} style={{ marginTop: 8, background: "none", border: "1px dashed #333", borderRadius: 6, color: "#666", padding: "6px 14px", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>+ Dodaj task</button>
          }
        </div>
      )}
    </div>
  );
}

export default function AssetDetail({ asset, onBack, onRefresh }) {
  const [tab, setTab]           = useState("tasks");
  const [addingGroup, setAddingGroup] = useState(false);
  const [groupName, setGroupName]     = useState("");
  const [tick, setTick]         = useState(0);

  const refresh = () => { setTick(t => t + 1); onRefresh(); };
  const groups  = store.getGroups().filter(g => g.asset_id === asset.id);
  const wDays   = daysUntil(asset.warranty_expires);

  const applyTemplate = () => {
    const tpl = TASK_TEMPLATES[asset.name] || TASK_TEMPLATES[asset.category];
    if (!tpl) return alert("Ni predloge za ta tip asseta.");
    tpl.forEach(({ group, tasks }) => {
      const g = { naziv: group, asset_id: asset.id };
      store.saveGroup(g);
      const savedGroups = store.getGroups().filter(gr => gr.asset_id === asset.id && gr.naziv === group);
      const gid = savedGroups[savedGroups.length - 1]?.id;
      tasks.forEach(naziv => store.saveTask({ naziv, group_id: gid, asset_id: asset.id, status: "pending", ponavljanje: "letno" }));
    });
    refresh();
  };

  const addGroup = () => {
    if (!groupName) return;
    store.saveGroup({ naziv: groupName, asset_id: asset.id });
    setGroupName(""); setAddingGroup(false); refresh();
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, minHeight: "100%" }}>
      {/* Back + header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "#a09880", cursor: "pointer", fontSize: 18, padding: "4px 8px 4px 0" }}>←</button>
        <div>
          <div style={{ fontSize: 20, fontStyle: "italic" }}>{asset.name}</div>
          <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>{asset.brand && `${asset.brand} · `}{asset.category}</div>
        </div>
      </div>

      {/* Info strip */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
        {asset.purchase_date && <Badge color="#555">Nakup: {asset.purchase_date}</Badge>}
        {asset.price && <Badge color="#555">{asset.price} €</Badge>}
        {asset.warranty_expires && <Badge color={urgencyColor(wDays)}>{wDays < 0 ? "Garancija potekla" : `Garancija: ${wDays} dni`}</Badge>}
        {asset.model && <Badge color="#444">{asset.model}</Badge>}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid #1a1a18", marginBottom: 20 }}>
        {[["tasks","Taski"],["info","Info"]].map(([id, l]) => (
          <button key={id} onClick={() => setTab(id)} style={{
            background: "none", border: "none",
            borderBottom: tab === id ? "2px solid #8B7355" : "2px solid transparent",
            color: tab === id ? "#e8e4dc" : "#555",
            padding: "10px 20px 8px", fontSize: 13,
            fontFamily: "inherit", cursor: "pointer",
          }}>{l}</button>
        ))}
      </div>

      {/* Tasks tab */}
      {tab === "tasks" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {groups.length === 0 && (
            <div style={{ textAlign: "center", padding: "30px 0" }}>
              <div style={{ fontSize: 13, color: "#555", marginBottom: 16, fontStyle: "italic" }}>Ni skupin taskov.</div>
              <Btn onClick={applyTemplate} variant="accent" small>✨ Naloži predlogo</Btn>
            </div>
          )}
          {groups.map(g => <TaskGroup key={g.id + tick} group={g} assetId={asset.id} onRefresh={refresh} />)}

          {addingGroup
            ? <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <Input value={groupName} onChange={setGroupName} placeholder="Ime grupe..." />
                <Btn onClick={addGroup} small>+</Btn>
                <Btn onClick={() => setAddingGroup(false)} variant="ghost" small>×</Btn>
              </div>
            : <button onClick={() => setAddingGroup(true)} style={{ background: "none", border: "1px dashed #252525", borderRadius: 8, color: "#555", padding: "10px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>
                + Nova grupa taskov
              </button>
          }
        </div>
      )}

      {/* Info tab */}
      {tab === "info" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              ["Ime", asset.name],
              ["Znamka", asset.brand],
              ["Model", asset.model],
              ["Kategorija", asset.category],
              ["Datum nakupa", asset.purchase_date],
              ["Cena", asset.price ? asset.price + " €" : null],
              ["Dobavitelj", asset.supplier],
              ["Garancija (leta)", asset.warranty_years],
              ["Garancija poteče", asset.warranty_expires],
              ["Opomba", asset.notes],
            ].filter(([, v]) => v).map(([label, value]) => (
              <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #1a1a18" }}>
                <span style={{ fontSize: 12, color: "#666" }}>{label}</span>
                <span style={{ fontSize: 13, color: "#e8e4dc" }}>{value}</span>
              </div>
            ))}
          </div>

          {asset.specs && Object.keys(asset.specs).length > 0 && (
            <div>
              <div style={{ fontSize: 10, letterSpacing: 2, color: "#666", textTransform: "uppercase", marginBottom: 10, marginTop: 8 }}>
                Specifikacije
              </div>
              <div style={{ background: "#111", border: "1px solid #1e1e1c", borderRadius: 8, padding: "8px 14px" }}>
                {Object.entries(asset.specs).map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid #1a1a18" }}>
                    <span style={{ fontSize: 12, color: "#a09880" }}>{k}</span>
                    <span style={{ fontSize: 13, color: "#e8e4dc" }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
