import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getCurrentViewer, getPublicMockAccounts } from "@/lib/mock-auth";

export const metadata: Metadata = {
  title: "เข้าสู่ระบบ | NearSip Dashboard",
};

export default async function LoginPage() {
  if (await getCurrentViewer()) redirect("/");

  return (
    <main className="login-page">
      <section className="login-intro" aria-labelledby="login-title">
        <div className="login-intro-aura" aria-hidden="true" />
        <div className="login-brand">
          <div className="login-logo" aria-hidden="true">
            <img src="/nearsip-logo.png" alt="" />
          </div>
          <div className="login-brand-copy">
            <span>NearSip</span>
            <small>Partner Intelligence</small>
          </div>
        </div>
        <div className="login-intro-copy">
          <p className="login-eyebrow">PARTNER ANALYTICS</p>
          <h1 id="login-title">
            มองเห็นทุกข้อมูล
            <span>ในขอบเขตที่ใช่</span>
          </h1>
          <p className="login-intro-description">
            ติดตามภาพรวม ผู้ใช้งาน และกิจกรรม Real-time
            ตามสิทธิ์ที่คุณได้รับในหน้าจอเดียว
          </p>
          <div className="login-capabilities" aria-label="ความสามารถหลัก">
            <span>ภาพรวมธุรกิจ</span>
            <span>ข้อมูล Real-time</span>
            <span>สิทธิ์ตามบทบาท</span>
          </div>
        </div>
        {/* <div className="login-insight-card">
          <div className="login-insight-head">
            <span>
              <i aria-hidden="true" />
              LIVE INSIGHT
            </span>
            <small>พร้อมใช้งาน</small>
          </div>
          <div className="login-insight-grid">
            <div>
              <strong>24</strong>
              <span>ร้านพาร์ทเนอร์</span>
            </div>
            <div>
              <strong>3 ระดับ</strong>
              <span>สิทธิ์การเข้าถึง</span>
            </div>
            <div>
              <strong>Real-time</strong>
              <span>ข้อมูลล่าสุด</span>
            </div>
          </div>
        </div> */}
        {/* <p className="login-lead">
          ติดตามภาพรวม ผู้ใช้งาน และกิจกรรม Real-time ของร้านพาร์ทเนอร์
          ตามสิทธิ์ที่ได้รับ
        </p> */}
        {/* <div className="login-role-list">
          <div>
            <b>Admin</b>
            <span>ดูข้อมูลได้ทุกจังหวัดและทุกร้าน</span>
          </div>
          <div>
            <b>Province</b>
            <span>ดูภาพรวมและร้านภายในจังหวัดที่รับผิดชอบ</span>
          </div>
          <div>
            <b>Owner</b>
            <span>ดูข้อมูลเฉพาะร้านของตัวเอง</span>
          </div>
        </div> */}
        {/* <p className="login-mock-note">MOCK AUTHENTICATION · NOT FOR PRODUCTION</p> */}
      </section>

      <LoginForm accounts={getPublicMockAccounts()} />
    </main>
  );
}
