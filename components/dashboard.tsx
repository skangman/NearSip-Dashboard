"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  mountDashboard,
  showOverallDashboard,
  showRealtimeDashboard,
} from "@/lib/dashboard-runtime";
import {
  getViewerScopeLabel,
  ROLE_LABELS,
  type ManagedUser,
  type Viewer,
} from "@/lib/auth-types";

type DashboardProps = {
  viewer: Viewer;
  managedUsers: ManagedUser[];
};

export function Dashboard({ viewer, managedUsers }: DashboardProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"overall" | "realtime">("overall");
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    return mountDashboard(setMode, viewer, managedUsers);
  }, [viewer, managedUsers]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <>
      <div className="app">
        <header className="shell">
          <div className="top">
            <div className="brand">
              <div className="logo" aria-hidden="true">
                <img src="/nearsip-logo.png" alt="" />
              </div>
              <div>
                <h1>NearSip Dashboard</h1>
                <p>
                  Partner Requirement MVP · Thailand → Province → Partner Venue
                </p>
              </div>
            </div>
            {/* <div className="mock-badge">
              MOCK DATA · DESIGN PROTOTYPE · NOT PRODUCTION DATA
            </div> */}
            <div
              className="mode"
              role="group"
              aria-label="โหมดข้อมูล"
              data-testid="mode-switcher"
            >
              <button
                id="overallBtn"
                className={mode === "overall" ? "active" : undefined}
                aria-pressed={mode === "overall"}
                type="button"
                onClick={showOverallDashboard}
              >
                Overall
              </button>
              <button
                id="realtimeBtn"
                className={mode === "realtime" ? "active" : undefined}
                aria-pressed={mode === "realtime"}
                type="button"
                onClick={showRealtimeDashboard}
              >
                Real-time
              </button>
            </div>
            <div className="viewer-menu">
              <div className="viewer-copy">
                <span>{ROLE_LABELS[viewer.role]}</span>
                <strong>{viewer.displayName}</strong>
                <small>{getViewerScopeLabel(viewer)}</small>
              </div>
              <button
                className="logout-button"
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
              >
                {loggingOut ? "กำลังออก…" : "ออกจากระบบ"}
              </button>
            </div>
            <div className="mobile-row">
              <div className="scope-summary">
                <span>Scope:</span>
                <strong id="mobileScope">ประเทศไทย</strong>
              </div>
              <button
                className="filter-button"
                id="filterOpen"
                aria-controls="controlsPanel"
                aria-expanded="false"
                type="button"
              >
                ตัวกรอง{" "}
                <span className="filter-count" id="filterCount">
                  4
                </span>
              </button>
            </div>
          </div>

          <div className="overlay" id="overlay" />
          <div className="controls-panel" id="controlsPanel">
            <div className="controls">
              <div className="drawer-head">
                <h3>ตัวกรอง Dashboard</h3>
                <button className="drawer-close" id="filterClose" type="button">
                  ปิด
                </button>
              </div>
              <div className="field">
                <label htmlFor="levelSelect">ระดับข้อมูล</label>
                <select id="levelSelect" defaultValue="country">
                  <option value="country">ประเทศไทย</option>
                  <option value="province">จังหวัด</option>
                  <option value="venue">ร้านพาร์ทเนอร์</option>
                </select>
              </div>
              {/* ซ่อน dropdown จังหวัดไว้ก่อน — backend ยังไม่มีฟิลด์จังหวัดผูกร้าน (ข้อมูลเป็น mock)
                  element ยังอยู่เหมือนเดิมเพราะ lib/dashboard-runtime.ts ยังอ้างอิง #provinceSelect อยู่ */}
              <div className="field" style={{ display: "none" }}>
                <label htmlFor="provinceSelect">จังหวัด</label>
                <select id="provinceSelect" />
              </div>
              <div className="field">
                <label htmlFor="venueSelect">ร้านพาร์ทเนอร์</label>
                <select id="venueSelect" />
              </div>
              <div className="field">
                <label htmlFor="periodSelect">ช่วงเวลา</label>
                <select id="periodSelect" defaultValue="alltime">
                  <option value="tonight">คืนนี้</option>
                  <option value="today">วันนี้</option>
                  <option value="7d">7 วัน</option>
                  <option value="30d">30 วัน</option>
                  <option value="month">เดือนนี้</option>
                  <option value="quarter">ไตรมาส</option>
                  <option value="year">ปีนี้</option>
                  <option value="custom">กำหนดเอง</option>
                  <option value="alltime">ทั้งหมด</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="compareSelect">เปรียบเทียบ</label>
                <select id="compareSelect" />
              </div>
              <div className="field">
                <label htmlFor="nightSelect">Business Night</label>
                {/* เดิม defaultValue="18:00–02:00" พร้อม option 18:00–00:00, 18:00–02:00 — เอาออกตามที่ขอ เหลือแค่ช่วงรายชั่วโมง
                <select id="nightSelect" defaultValue="18:00–02:00">
                  <option>18:00–00:00</option>
                  <option>18:00–02:00</option>
                </select>
                */}
                <select id="nightSelect" defaultValue="18:00–19:00">
                  {/* เดิม: <option>18:00–05:00</option> — แทนที่ด้วยช่วงรายชั่วโมงจนถึงตี 5 ตามที่ขอ */}
                  <option>18:00–19:00</option>
                  <option>19:00–20:00</option>
                  <option>20:00–21:00</option>
                  <option>21:00–22:00</option>
                  <option>22:00–23:00</option>
                  <option>23:00–00:00</option>
                  <option>00:00–01:00</option>
                  <option>01:00–02:00</option>
                  <option>02:00–03:00</option>
                  <option>03:00–04:00</option>
                  <option>04:00–05:00</option>
                </select>
              </div>
              <button className="export" id="exportBtn" type="button">
                Export
              </button>
              <button className="reset" id="resetBtn" type="button">
                Reset Filters
              </button>
              <div className="custom-dates" id="customDates">
                <div className="field">
                  <label htmlFor="dateFrom">วันที่เริ่มต้น</label>
                  <input id="dateFrom" type="date" defaultValue="2026-07-01" />
                </div>
                <div className="field">
                  <label htmlFor="dateTo">วันที่สิ้นสุด</label>
                  <input id="dateTo" type="date" defaultValue="2026-07-31" />
                </div>
              </div>
            </div>
          </div>

          <div className="context" id="contextLine" />
          <nav
            className="nav"
            id="mainNav"
            aria-label="หน้าหลักของ Dashboard"
          />
        </header>

        <main id="content" aria-live="polite" />
        <div className="footer">
          {/* NearSip Dashboard · MOCK DATA · DESIGN PROTOTYPE · NOT PRODUCTION DATA
          · ผู้ใช้ NearSip ไม่ใช่ Total Footfall */}
        </div>
      </div>

      <div
        className="loading-overlay"
        id="loadingOverlay"
        role="status"
        aria-live="polite"
      >
        <div className="loader-card">
          <strong>กำลังอัปเดตข้อมูลตาม Scope</strong>
          <div className="skeleton wide" />
          <div className="skeleton mid" />
          <div className="skeleton short" />
        </div>
      </div>
      <div className="toast" id="toast" />
    </>
  );
}
