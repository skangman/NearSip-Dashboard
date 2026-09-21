export type ActivityTimestamps = {
  /** cheers.create_at ทั้งหมด (ISO string) ใช้ทำ Timeline/Peak Time ของ Real-time page */
  cheersTimes: string[];
  /** chats.create_at ทั้งหมด (ISO string) */
  chatsTimes: string[];
  /** user.create_at ทั้งหมด — ใช้เป็นตัวแทน "ผู้ใช้ NearSip" timeline (ไม่มี timestamp อื่นบอกว่า user online ตอนไหน) */
  usersTimes: string[];
};

export type LoginLogEntry = {
  userId: string | null;
  storeId: string | null;
  createAt: string;
  /**
   * user_id นี้มีอยู่จริงในตาราง "user" — login_log มี id ที่ไม่มีในตาราง user (เช่น บัญชีที่ถูกลบ, id ทดสอบ, ค่าว่าง)
   * การนับ "จำนวนผู้ใช้" ต้องนับเฉพาะ registered=true จึงจะตรงกับ KPI "ผู้ใช้ NearSip" (ที่นับจากตาราง user)
   */
  registered: boolean;
};

export type UserStats = {
  /** จำนวนผู้ใช้ทั้งหมดในระบบ (all-time COUNT(*) จากตาราง user) */
  uniqueUsers: number;
  /**
   * ผู้ใช้ใหม่ = สมัคร (user.create_at) ตั้งแต่ต้นช่วงที่เลือก (?from&to = คืนธุรกิจ ตัด 06:00 น. เวลาไทย)
   * null = ไม่ได้ระบุ from (เช่น "ทั้งหมด") ซึ่งแยกใหม่/เดิมไม่ได้ เพราะทุกคนสมัครหลังวันเริ่มระบบ
   */
  newUsers: number | null;
  /** ผู้ใช้เดิม = สมัครก่อนต้นช่วงที่เลือก (null เมื่อไม่ได้ระบุ from) */
  existingUsers: number | null;
  /** ผู้ใช้ใหม่ของคืนธุรกิจปัจจุบัน (สมัครตั้งแต่ 06:00 น. ล่าสุด) — ไม่ขึ้นกับช่วงที่เลือก ใช้กับโหมด Real-time */
  newUsersTonight: number;
  /** ผู้ใช้ที่สมัครก่อนคืนธุรกิจปัจจุบัน */
  existingUsersTonight: number;
  /** จำนวนผู้ใช้ distinct ที่เคยส่ง/รับ cheers อย่างน้อย 1 ครั้ง (all-time) */
  engagedUsers: number;
  /** engagedUsers / uniqueUsers * 100 */
  engagementRate: number;
  /** จำนวน session ที่ยังไม่หมดอายุ (expires > now()) — ใช้เป็นตัวแทน "ผู้ใช้ Active ตอนนี้" */
  activeSessions: number;
  /** จำนวนแถวทั้งหมดในตาราง cheers (all-time) */
  cheersTotal: number;
  /** จำนวนแถวทั้งหมดในตาราง chats (all-time) */
  chatsTotal: number;
  /** จำนวนผู้ใช้แยกตามเพศ (all-time, จาก user.gender) */
  genderBreakdown: { male: number; female: number; lgbtq: number };
  /** จำนวนผู้ใช้แยกตามช่วงอายุ (all-time, จาก user.age) */
  ageBreakdown: { a20: number; a31: number; a41: number; a51: number; a61: number };
  /** timestamp ดิบ (ISO string) สำหรับ bucket เป็น Timeline/Peak Time ฝั่ง dashboard */
  activityTimestamps: ActivityTimestamps;
  /** cheers แยกตาม status จริง (all-time) — ใช้ทำ Engagement & Retention หน้า Cheers tab */
  cheersByStatus: { pending: number; accepted: number; refused: number };
  /** จำนวนผู้ส่ง cheers แบบ distinct (all-time) */
  cheersSenders: number;
  /** จำนวนผู้รับ cheers แบบ distinct (all-time) */
  cheersReceivers: number;
  /** จำนวนแถวทั้งหมดในตาราง messages (all-time) */
  messagesTotal: number;
  /** จำนวนร้านที่ set_location.create_date อยู่ภายใน `days` วันล่าสุด */
  newStores: number;
  /** login_log ดิบ — ใช้คำนวณ Visit Frequency / Repeat / Heatmap ฝั่ง JS (ไม่ bucket ใน SQL) */
  loginLogs: LoginLogEntry[];
  /**
   * ช่องทาง Login โดยประมาณจาก user.email — ไม่ใช่ field login-method ตรงๆ (ไม่มีใน DB)
   * แต่เป็น heuristic จริง: LINE OAuth ไม่บังคับให้มี email เสมอ ส่วน credentials login ต้องมี email
   * ดังนั้น email IS NULL ≈ LINE, email IS NOT NULL ≈ Email/Credentials
   */
  loginChannel: { email: number; line: number };
};

export type ActiveNowStats = {
  activeSessions: number;
  uniqueUsers: number;
};
