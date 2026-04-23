import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";

function DashboardLayout() {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "var(--bg-base)" }}>
      <div className="grid-overlay" />
      <Sidebar />
      <main style={{ flex: 1, padding: "28px 32px", minWidth: 0, position: "relative", zIndex: 1 }}>
        <Outlet />
      </main>
    </div>
  );
}

export default DashboardLayout;