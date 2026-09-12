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
            ภาพรวมข้อมูล
            <span>พาร์ทเนอร์ทั้งหมด</span>
          </h1>
          <p className="login-intro-description">
            ติดตามภาพรวม ผู้ใช้งาน และกิจกรรม Real-time
          </p>
          <div className="login-capabilities" aria-label="ความสามารถหลัก">
            <span>ภาพรวมธุรกิจ</span>
            <span>ข้อมูล Real-time</span>
          </div>
        </div>
      </section>

      <LoginForm accounts={getPublicMockAccounts()} />
    </main>
  );
}
