import type { Viewer } from "@/lib/domain/viewer";

export type MockAccount = {
  password: string;
  sessionId: string;
  viewer: Viewer;
};

export const MOCK_ACCOUNTS: readonly MockAccount[] = [
  {
    password: "adminP!@ssw0rd",
    sessionId: "nsp_adm_7f5e8c2a91d64b30a4c821f63310e772",
    viewer: {
      id: "viewer-admin",
      username: "admin",
      displayName: "NearSip Admin",
      role: "admin",
    },
  },
  // {
  //   password: "province123",
  //   sessionId: "nsp_prv_4b88d1a7f3164e80a2b21b95ac796e43",
  //   viewer: {
  //     id: "viewer-province-bkk",
  //     username: "province_bkk",
  //     displayName: "Bangkok Province Team",
  //     role: "province",
  //     province: "กรุงเทพมหานคร",
  //   },
  // },
  // เดิม: เปิดไว้เทส permission โดยผูกกับ "เจ้าของร้าน Siam Social Demo" (mock) — คอมเมนต์ไว้ก่อนตามที่ขอ
  // เพราะไม่ผูกกับ user/credential จริงของเจ้าของร้าน (ระบบ login จริงอยู่คนละ auth กับ dashboard นี้
  // ดูรายละเอียดในแชท) แทนที่ด้วย admin01-03 ด้านล่างนี้แทน
  // {
  //   password: "owner123",
  //   sessionId: "nsp_own_96c2452e4f1f45f19dced4167e0c28ca",
  //   viewer: {
  //     id: "viewer-owner-siam",
  //     username: "owner_siam",
  //     displayName: "Siam Social Demo Owner",
  //     role: "owner",
  //     province: "กรุงเทพมหานคร",
  //     venue: "Siam Social Demo",
  //   },
  // },
  // เพิ่มเพื่อเทส permission ตามที่ขอ — username admin01-03 แต่ role ตั้งเป็น "province" ไม่ใช่ "admin"
  // เพราะ canAccessMenu() ที่ dashboard-runtime.ts ให้ role "admin" เห็นทุกเมนูเสมอข้ามการเช็คสิทธิ์
  // (ดูรายละเอียดในแชท) role "province" ถึงจะถูก admin ใหญ่สุดจำกัดเมนูได้จริงในหน้า Users & Menu Access
  // ส่วน default จะเห็นทุกเมนูเหมือน admin จนกว่า admin ใหญ่สุดจะเข้าไปปลดออกทีละเมนู
  // ไม่ระบุ province ให้ตามที่ขอ — role "province" ที่ไม่มี province จะได้ scope "ทุกจังหวัด/ทุกร้าน"
  // ทั่วประเทศแทนจังหวัดเดียว (ดู initialScope ใน dashboard-runtime.ts + getViewerScopeLabel ใน auth-types.ts)
  {
    password: "admin01123",
    sessionId: "nsp_ad1_1a2b3c4d5e6f70819203a4b5c6d7e8f9",
    viewer: {
      id: "viewer-admin01",
      username: "admin01",
      displayName: "Admin 01",
      role: "province",
    },
  },
  {
    password: "admin02123",
    sessionId: "nsp_ad2_2b3c4d5e6f70819203a4b5c6d7e8f9a1",
    viewer: {
      id: "viewer-admin02",
      username: "admin02",
      displayName: "Admin 02",
      role: "province",
    },
  },
  {
    password: "admin03123",
    sessionId: "nsp_ad3_3c4d5e6f70819203a4b5c6d7e8f9a1b2",
    viewer: {
      id: "viewer-admin03",
      username: "admin03",
      displayName: "Admin 03",
      role: "province",
    },
  },
];
