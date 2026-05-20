const get = (key) => JSON.parse(localStorage.getItem(key) || "[]");
const set = (key, val) => localStorage.setItem(key, JSON.stringify(val));
const uid = () => Date.now() + Math.random().toString(36).slice(2, 6);

export const store = {
  getAssets:   () => get("ho_assets"),
  saveAsset:   (a) => { const l = get("ho_assets"); l.push({ ...a, id: uid(), created_at: new Date().toISOString() }); set("ho_assets", l); },
  updateAsset: (id, patch) => set("ho_assets", get("ho_assets").map(a => a.id === id ? { ...a, ...patch } : a)),
  deleteAsset: (id) => set("ho_assets", get("ho_assets").filter(a => a.id !== id)),

  getUtils:   () => get("ho_utils"),
  saveUtil:   (u) => { const l = get("ho_utils"); l.push({ ...u, id: uid(), created_at: new Date().toISOString() }); set("ho_utils", l); },
  deleteUtil: (id) => set("ho_utils", get("ho_utils").filter(u => u.id !== id)),

  getGroups:   () => get("ho_groups"),
  saveGroup:   (g) => { const l = get("ho_groups"); l.push({ ...g, id: uid(), created_at: new Date().toISOString() }); set("ho_groups", l); },
  deleteGroup: (id) => set("ho_groups", get("ho_groups").filter(g => g.id !== id)),

  getTasks:   () => get("ho_tasks"),
  saveTask:   (t) => { const l = get("ho_tasks"); l.push({ ...t, id: uid(), created_at: new Date().toISOString() }); set("ho_tasks", l); },
  updateTask: (id, patch) => set("ho_tasks", get("ho_tasks").map(t => t.id === id ? { ...t, ...patch } : t)),
  deleteTask: (id) => set("ho_tasks", get("ho_tasks").filter(t => t.id !== id)),
};

export function daysUntil(dateStr) {
  if (!dateStr) return null;
  return Math.ceil((new Date(dateStr) - new Date()) / 86400000);
}

export function urgencyColor(days) {
  if (days === null) return "#666";
  if (days < 0)  return "#c85a5a";
  if (days < 30) return "#c8954a";
  if (days < 90) return "#c8b84a";
  return "#4a8f5a";
}

export function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export const ASSET_CATEGORIES = [
  "Ogrevanje & Hlajenje","Kuhinja","Kopalnica","Streha & Fasada",
  "Vrt & Zunanjost","Varnost","Elektrika","Vodovodna napeljava","Ostalo",
];

export const UTILITY_TYPES = [
  { id: "elektrika", label: "Elektrika", icon: "⚡", color: "#C8A84B" },
  { id: "plin",      label: "Plin",      icon: "🔥", color: "#E07B4A" },
  { id: "voda",      label: "Voda",      icon: "💧", color: "#4A8FE0" },
  { id: "internet",  label: "Internet",  icon: "📡", color: "#7B6CE0" },
  { id: "odpadki",   label: "Odpadki",   icon: "♻️", color: "#4AAE6E" },
  { id: "ostalo",    label: "Ostalo",    icon: "📄", color: "#888"    },
];

export const TASK_TEMPLATES = {
  "Bazen": [
    { group: "Filtracija",  tasks: ["Speri peščeni filter","Preveri tlak filtra","Očisti koš črpalke"] },
    { group: "Kemija vode", tasks: ["Izmeri pH vrednost","Dodaj klor","Preveri alkalnost"] },
    { group: "Zimovanje",   tasks: ["Znizi nivo vode","Dodaj zimsko kemijo","Pokrij bazen"] },
  ],
  "Klimatska naprava": [
    { group: "Servis",  tasks: ["Očisti filter","Preveri hladivo","Servis pri pooblaščenem serviserju"] },
    { group: "Sezona",  tasks: ["Zagon pred poletjem","Izklop po sezoni"] },
  ],
  "Toplotna črpalka": [
    { group: "Letni servis", tasks: ["Preveri delovanje","Očisti izmenjeval toplote","Kontrola hladiva"] },
  ],
  "Streha": [
    { group: "Vzdrževanje", tasks: ["Pregled po zimi","Čiščenje žlebov","Kontrola strešnikov"] },
  ],
  "Kamin": [
    { group: "Letno", tasks: ["Čiščenje dimnika","Pregled inoks dimnika","Kontrola vrat in tesnila"] },
  ],
};
