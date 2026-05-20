export function Input({ label, value, onChange, type = "text", options, placeholder }) {
  const s = {
    background: "#111", border: "1px solid #252525", borderRadius: 6,
    color: "#e8e4dc", padding: "9px 12px", fontSize: 14,
    fontFamily: "inherit", width: "100%", outline: "none",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
      {label && <label style={{ fontSize: 10, letterSpacing: 2, color: "#666", textTransform: "uppercase" }}>{label}</label>}
      {options
        ? <select value={value || ""} onChange={e => onChange(e.target.value)} style={{ ...s, cursor: "pointer" }}>
            <option value="">—</option>
            {options.map(o => <option key={o.id || o} value={o.id || o}>{o.label || o}</option>)}
          </select>
        : <input type={type} value={value || ""} onChange={e => onChange(e.target.value)}
            placeholder={placeholder} style={s}
            onFocus={e => e.target.style.borderColor = "#8B7355"}
            onBlur={e => e.target.style.borderColor = "#252525"} />
      }
    </div>
  );
}

export function Btn({ children, onClick, variant = "primary", small, disabled, style: extra }) {
  const base = {
    border: "none", borderRadius: 8, cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "inherit", fontStyle: "italic", transition: "opacity 0.15s",
    padding: small ? "7px 16px" : "11px 22px",
    fontSize: small ? 13 : 14, opacity: disabled ? 0.4 : 1,
  };
  const variants = {
    primary:  { background: "#2D5A27", color: "#e8e4dc" },
    ghost:    { background: "none", border: "1px solid #333", color: "#a09880" },
    danger:   { background: "#3a1010", border: "1px solid #c85a5a44", color: "#c85a5a" },
    accent:   { background: "#1a1a18", border: "1px solid #8B7355", color: "#c8b89a" },
  };
  return <button onClick={disabled ? undefined : onClick} style={{ ...base, ...variants[variant], ...extra }}>{children}</button>;
}

export function Card({ children, style: extra, onClick }) {
  return (
    <div onClick={onClick} style={{
      background: "#111", border: "1px solid #1e1e1c", borderRadius: 10,
      padding: "14px 16px", cursor: onClick ? "pointer" : "default",
      transition: onClick ? "border-color 0.15s" : "none",
      ...extra,
    }}
    onMouseEnter={onClick ? e => e.currentTarget.style.borderColor = "#333" : undefined}
    onMouseLeave={onClick ? e => e.currentTarget.style.borderColor = "#1e1e1c" : undefined}
    >{children}</div>
  );
}

export function Badge({ color, children }) {
  return (
    <span style={{
      fontSize: 10, padding: "2px 9px", borderRadius: 10,
      background: color + "22", color, border: `1px solid ${color}44`,
      letterSpacing: 0.5, whiteSpace: "nowrap",
    }}>{children}</span>
  );
}

export function Spinner() {
  return (
    <>
      <style>{`@keyframes ho-spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{
        width: 28, height: 28, border: "2px solid #252525",
        borderTopColor: "#8B7355", borderRadius: "50%",
        animation: "ho-spin 0.8s linear infinite", margin: "0 auto",
      }} />
    </>
  );
}
