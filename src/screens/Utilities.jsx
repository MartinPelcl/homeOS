import { store, daysUntil, urgencyColor } from "../store/index.js";
import { UTILITY_TYPES } from "../store/index.js";

function UtilityCard({ util, onDelete }) {
  const utype = UTILITY_TYPES.find(u => u.id === util.utility_type) || UTILITY_TYPES[5];
  const dueDays      = daysUntil(util.due_date);
  const contractDays = daysUntil(util.contract_expires);

  return (
    <div style={{
      background: "#111", borderLeft: `3px solid ${utype.color}`,
      border: `1px solid ${utype.color}33`, borderRadius: 10, padding: "14px 16px",
      display: "flex", flexDirection: "column", gap: 8,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ fontSize: 20 }}>{utype.icon}</span>
          <div>
            <div style={{ fontSize: 14, fontStyle: "italic", color: "#e8e4dc" }}>{util.provider || utype.label}</div>
            <div style={{ fontSize: 11, color: "#555", display: "flex", gap: 10, marginTop: 2 }}>
              {util.billing_period_start && <span>{util.billing_period_start} → {util.billing_period_end || "?"}</span>}
              {util.consumption && <span>{util.consumption}</span>}
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {util.amount && <span style={{ fontSize: 18, color: utype.color, fontStyle: "italic" }}>{util.amount} €</span>}
          <button onClick={() => onDelete(util.id)} style={{ background: "none", border: "none", color: "#444", cursor: "pointer", fontSize: 16 }}>×</button>
        </div>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {util.due_date && (
          <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, background: urgencyColor(dueDays) + "18", color: urgencyColor(dueDays), border: `1px solid ${urgencyColor(dueDays)}33` }}>
            {dueDays < 0 ? "⚠ Zamujeno" : `Plačilo: ${util.due_date}`}{dueDays !== null && dueDays >= 0 && dueDays < 14 ? ` (${dueDays} dni)` : ""}
          </span>
        )}
        {util.contract_expires && (
          <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 6, background: urgencyColor(contractDays) + "18", color: urgencyColor(contractDays), border: `1px solid ${urgencyColor(contractDays)}33` }}>
            Pogodba: {util.contract_expires}{contractDays !== null && contractDays < 90 ? ` (${contractDays} dni)` : ""}
          </span>
        )}
      </div>
    </div>
  );
}

export default function UtilitiesScreen({ onRefresh }) {
  const utils = store.getUtils();
  const deleteUtil = (id) => { store.deleteUtil(id); onRefresh(); };

  const grouped = {};
  UTILITY_TYPES.forEach(u => { grouped[u.id] = []; });
  utils.forEach(u => grouped[u.utility_type]?.push(u));

  const totalYear = utils
    .filter(u => u.amount && new Date(u.billing_period_start || u.created_at) > new Date(Date.now() - 365 * 86400000))
    .reduce((s, u) => s + (parseFloat(u.amount) || 0), 0);

  const expiring = utils.filter(u => { const d = daysUntil(u.contract_expires); return d !== null && d >= 0 && d < 90; });
  const overdue  = utils.filter(u => { const d = daysUntil(u.due_date); return d !== null && d < 0; });
  const maxSpend = Math.max(...UTILITY_TYPES.map(t => grouped[t.id].reduce((s, u) => s + (parseFloat(u.amount) || 0), 0)), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Summary */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
        {[
          ["Skupaj letos", totalYear.toFixed(0) + " €", "#c8b84a"],
          ["Potekajoče", expiring.length, expiring.length > 0 ? "#c8954a" : "#4a8f5a"],
          ["Zamujeni", overdue.length, overdue.length > 0 ? "#c85a5a" : "#4a8f5a"],
        ].map(([l, v, c]) => (
          <div key={l} style={{ background: "#111", border: "1px solid #1e1e1c", borderRadius: 10, padding: "14px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 20, color: c, fontStyle: "italic", marginBottom: 4 }}>{v}</div>
            <div style={{ fontSize: 10, color: "#555", letterSpacing: 1, textTransform: "uppercase" }}>{l}</div>
          </div>
        ))}
      </div>

      {/* Alerts */}
      {[...overdue.map(u => ({ u, type: "overdue" })), ...expiring.map(u => ({ u, type: "expiring" }))].map(({ u, type }) => {
        const ut = UTILITY_TYPES.find(t => t.id === u.utility_type) || UTILITY_TYPES[5];
        return (
          <div key={u.id + type} style={{ background: type === "overdue" ? "#1a1010" : "#141008", border: `1px solid ${type === "overdue" ? "#c85a5a" : "#c8954a"}44`, borderRadius: 8, padding: "10px 14px", display: "flex", gap: 10, alignItems: "center" }}>
            <span style={{ color: type === "overdue" ? "#c85a5a" : "#c8954a" }}>{type === "overdue" ? "⚠" : "📋"}</span>
            <span style={{ fontSize: 13, color: type === "overdue" ? "#c8a0a0" : "#c8b090" }}>
              {type === "overdue"
                ? `Zamujeno plačilo: ${u.provider || ut.label} — ${u.amount} €`
                : `Pogodba poteče čez ${daysUntil(u.contract_expires)} dni: ${u.provider || ut.label}`}
            </span>
          </div>
        );
      })}

      {/* Spend by category */}
      {utils.length > 0 && (
        <div>
          <div style={{ fontSize: 10, letterSpacing: 2, color: "#555", textTransform: "uppercase", marginBottom: 12 }}>Po kategorijah</div>
          {UTILITY_TYPES.filter(u => grouped[u.id].length > 0).map(ut => {
            const total = grouped[ut.id].reduce((s, u) => s + (parseFloat(u.amount) || 0), 0);
            return (
              <div key={ut.id} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 16, width: 24 }}>{ut.icon}</span>
                <span style={{ fontSize: 12, color: "#a09880", width: 76 }}>{ut.label}</span>
                <div style={{ flex: 1, background: "#1a1a18", borderRadius: 4, height: 5 }}>
                  <div style={{ width: `${(total / maxSpend) * 100}%`, height: "100%", background: ut.color, borderRadius: 4, transition: "width 0.5s" }} />
                </div>
                <span style={{ fontSize: 12, color: ut.color, width: 56, textAlign: "right" }}>{total.toFixed(0)} €</span>
              </div>
            );
          })}
        </div>
      )}

      {/* All entries */}
      <div>
        <div style={{ fontSize: 10, letterSpacing: 2, color: "#555", textTransform: "uppercase", marginBottom: 12 }}>Vsi računi</div>
        {utils.length === 0
          ? <div style={{ color: "#444", fontSize: 13, fontStyle: "italic", textAlign: "center", padding: "30px 0" }}>Še ni računov. Skeniraj prvega →</div>
          : [...utils].reverse().map(u => <UtilityCard key={u.id} util={u} onDelete={deleteUtil} />)
        }
      </div>
    </div>
  );
}
