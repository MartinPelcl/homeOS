import { useState } from "react";
import { store } from "./store/index.js";
import ScannerScreen from "./screens/Scanner.jsx";
import AssetsScreen  from "./screens/Assets.jsx";
import AssetDetail   from "./screens/AssetDetail.jsx";
import UtilitiesScreen from "./screens/Utilities.jsx";
import "./index.css";

const TABS = [
  { id: "scan",      label: "Skeniraj", icon: "⬆" },
  { id: "assets",    label: "Naprave",  icon: "◈" },
  { id: "utilities", label: "Utilities",icon: "⚡" },
];

export default function App() {
  const [tab, setTab]                     = useState("scan");
  const [selectedAsset, setSelectedAsset] = useState(null);
  const [tick, setTick]                   = useState(0);

  const refresh = () => setTick(t => t + 1);
  const assets  = store.getAssets();
  const utils   = store.getUtils();

  if (selectedAsset) {
    return (
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "24px 20px", minHeight: "100vh" }}>
        <AssetDetail
          asset={selectedAsset}
          onBack={() => setSelectedAsset(null)}
          onRefresh={refresh}
        />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{
        padding: "18px 20px 14px",
        borderBottom: "1px solid #1a1a18",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        position: "sticky", top: 0, background: "#0d0d0c", zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
          <span style={{ fontSize: 10, letterSpacing: 4, color: "#444", textTransform: "uppercase" }}>HomeOS</span>
          <span style={{ fontSize: 15, fontStyle: "italic", color: "#a09880" }}>Moja hiša</span>
        </div>
        <span style={{ fontSize: 11, color: "#444" }}>{assets.length} naprav · {utils.length} računov</span>
      </div>

      <div style={{ display: "flex", borderBottom: "1px solid #1a1a18", background: "#0d0d0c", position: "sticky", top: 55, zIndex: 10 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            flex: 1, background: "none", border: "none",
            borderBottom: tab === t.id ? "2px solid #8B7355" : "2px solid transparent",
            color: tab === t.id ? "#e8e4dc" : "#555",
            padding: "12px 0 10px", fontSize: 12, fontFamily: "inherit",
            cursor: "pointer", transition: "all 0.15s",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
          }}>
            <span style={{ fontSize: 16 }}>{t.icon}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </div>

      <div style={{ flex: 1, padding: "24px 20px", overflowY: "auto" }} key={tick}>
        {tab === "scan"      && <ScannerScreen onSaved={refresh} />}
        {tab === "assets"    && <AssetsScreen onSelect={setSelectedAsset} />}
        {tab === "utilities" && <UtilitiesScreen onRefresh={refresh} />}
      </div>
    </div>
  );
}
