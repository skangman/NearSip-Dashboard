// อ่านอย่างเดียว — ประกอบผลจาก repository ย่อยเป็น UserStats / ActiveNowStats
//
// `storeId` (optional): กรองข้อมูลให้เหลือเฉพาะร้านนั้น เมื่อไม่ส่ง (null) = รวมทุกร้าน
// ตารางที่มี store_id ตรงๆ (cheers/chats/login_log/set_location) กรองได้ตรงๆ ส่วน "user"
// กรองทางอ้อมผ่าน "user ที่เคย login ที่ร้านนี้" (ดู userInStoreFilter ใน ./sql)
// `activeSessions` (ตาราง session) กรองตามร้านไม่ได้ เป็นยอดรวมทั้งระบบเสมอ

import type { ActiveNowStats, UserStats } from "@/lib/domain/user-stats";
import { countCheers, countCheersByStatus, countCheersParticipants, countEngagedUsers, listCheerTimes } from "./cheers.repository";
import { countChats, countMessages, listChatTimes } from "./chat.repository";
import { listLoginLogs } from "./login-log.repository";
import { withClient } from "./pool";
import { countNewStores } from "./store.repository";
import {
  countActiveSessions,
  countByAgeBand,
  countByGender,
  countByLoginChannel,
  countUniqueUsers,
  countUsers,
  listUserCreatedTimes,
} from "./user.repository";

export async function fetchUserStats(
  days: number,
  storeId: string | null,
  range: { from: string | null; to: string | null },
  tonight: string,
): Promise<UserStats> {
  // รันทีละ query บน client เดียวกัน (ไม่ใช้ Promise.all) — pg client รันได้ทีละ query เท่านั้น
  return withClient(async (db) => {
    const { uniqueUsers, newUsers, existingUsers, newUsersTonight, existingUsersTonight } =
      await countUsers(db, range, tonight, storeId);
    const engagedUsers = await countEngagedUsers(db, storeId);
    const activeSessions = await countActiveSessions(db);
    const cheersTotal = await countCheers(db, storeId);
    const chatsTotal = await countChats(db, storeId);
    const genderBreakdown = await countByGender(db, storeId);
    const ageBreakdown = await countByAgeBand(db, storeId);
    const cheersTimes = await listCheerTimes(db, storeId);
    const chatsTimes = await listChatTimes(db, storeId);
    const usersTimes = await listUserCreatedTimes(db, storeId);
    const cheersByStatus = await countCheersByStatus(db, storeId);
    const { senders: cheersSenders, receivers: cheersReceivers } =
      await countCheersParticipants(db, storeId);
    const messagesTotal = await countMessages(db, storeId);
    const newStores = await countNewStores(db, days, storeId);
    const loginLogs = await listLoginLogs(db, storeId);
    const loginChannel = await countByLoginChannel(db, storeId);

    return {
      uniqueUsers,
      newUsers,
      existingUsers,
      newUsersTonight,
      existingUsersTonight,
      engagedUsers,
      engagementRate: uniqueUsers > 0 ? (engagedUsers / uniqueUsers) * 100 : 0,
      activeSessions,
      cheersTotal,
      chatsTotal,
      genderBreakdown,
      ageBreakdown,
      activityTimestamps: { cheersTimes, chatsTimes, usersTimes },
      cheersByStatus,
      cheersSenders,
      cheersReceivers,
      messagesTotal,
      newStores,
      loginLogs,
      loginChannel,
    };
  });
}

/**
 * เวอร์ชันเบาของ fetchUserStats() — ใช้กับ poll ความถี่สูงของการ์ด "ผู้ใช้ NearSip ที่ Active ตอนนี้"
 * ดึงแค่ 2 query แทน ~16 query + raw rows หลักหมื่นแถวที่การ์ดนี้ไม่ได้ใช้
 */
export async function fetchActiveNowStats(storeId: string | null): Promise<ActiveNowStats> {
  return withClient(async (db) => {
    const activeSessions = await countActiveSessions(db);
    const uniqueUsers = await countUniqueUsers(db, storeId);
    return { activeSessions, uniqueUsers };
  });
}
