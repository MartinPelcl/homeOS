import { store, daysUntil, urgencyColor } from "../store/index.js";
import { Badge } from "../components/ui.jsx";

export default function AssetsScreen({ onSelect }) {
  const assets = store.getAssets();

  if (assets.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px" }}>
        <div style={{ fontSize: 36, opacity: 0.15, marginBottom: 16 }}>◈</div>
        <div style={{ fontSize: 16, fontStyle: "italic", color: "#a09880", marginBottom: 8 }}>Ni naprav.</div>
        <div style={{ fontSize: 13, color: "#555" }}>Pojdi na Skeniraj in dodaj prvo napravo.</div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ fontSize: 10, letterSpacing: 2, color: "#555", textTransform: "uppercase", marginBottom: 4 }}>
        Inventar · {assets.length} naprav
      </div>
      {[...assets].reverse().map(asset => {
        const wDays = daysUntil(asset.warranty_expires);
        const tasks = store.getTasks().filter(t => t.asset_id === asset.id);
        const overdue = tasks.filter(t => t.status !== "done" && daysUntil(t.rok) < 0).length;
        const pending = tasks.filter(t => t.status === "pending").length;

        return (
          <div key={asset.id} onClick={() => onSelect(asset)} style={{
            background: "#111", border: "1px solid #1e1e1c", borderRadius: 10,
            padding: "14px 16px", cursor: "pointer", transition: "border-color 0.15s",
          }}
          onMouseEnter={e => e.currentTarget.style.borderColor = "#333"}
          onMouseLeave={e => e.currentTarget.style.borderColor = "#1e1e1c"}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ fontSize: 15, fontStyle: "italic", color: "#e8e4dc", marginBottom: 4 }}>
                  {asset.name}
                  {asset.brand && <span style={{ fontSize: 11, color: "#666", marginLeft: 8 }}>{asset.brand}</span>}
                </div>
                <div style={{ fontSize: 11, color: "#555", display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {asset.category && <span>{asset.category}</span>}
                  {asset.purchase_date && <span>Nakup: {asset.purchase_date}</span>}
                </div>
              </div>
              <span style={{ color: "#555", fontSize: 14 }}>›</span>
            </div>

            {(overdue > 0 || wDays !== null) && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                {overdue > 0 && <Badge color="#c85a5a">{overdue} zamujeni task{overdue > 1 ? "i" : ""}</Badge>}
                {pending > 0 && overdue === 0 && <Badge color="#555">{pending} čakajoči</Badge>}
                {asset.warranty_expires && wDays !== null && wDays < 90 &&
                  <Badge color={urgencyColor(wDays)}>Garancija: {wDays < 0 ? "potekla" : `${wDays} dni`}</Badge>
                }
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
