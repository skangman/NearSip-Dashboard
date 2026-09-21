// @ts-nocheck

import {
  ROLE_LABELS,
  type ManagedUser,
  type Viewer,
} from "@/lib/domain/viewer";
import { renderEngagementPage } from "@/lib/dashboard/pages/engagement-page";
import { fmtDateTime } from "@/lib/dashboard/render/format";
import { barChart } from "@/lib/dashboard/render/bar-chart";
import { buildLoginTrend } from "@/lib/dashboard/analytics/login-trend";
import { nightOf, resolveNightRange } from "@/lib/domain/period";
import {
  DASHBOARD_MENUS,
  OVERALL_DASHBOARD_MENUS,
  loadUserMenuPermissions,
  saveUserMenuPermissions,
} from "@/lib/domain/menu-access";

let activeController = null;

export type DashboardMode = "overall" | "realtime";

export function showOverallDashboard() {
  activeController?.showOverall();
}

export function showRealtimeDashboard() {
  activeController?.showRealtime();
}

export function mountDashboard(
  onModeChange: (mode: DashboardMode) => void,
  viewer: Viewer,
  managedUsers: ManagedUser[],
) {
const PROVINCES={
  "กรุงเทพมหานคร":["Siam Social Demo","Thonglor Pulse Demo","RCA Connect Demo","Silom Afterdark Demo"],
  "ชลบุรี":["Pattaya Harbor Demo","Waves & Beats Demo","Na Klua Night Demo","Bangsaen Vibe Demo"],
  "เชียงใหม่":["Lanna Glow Demo","Night Bazaar Hub Demo","Ping River Mood Demo","Nimman Afterdark Demo"],
  "ภูเก็ต":["Patong Pulse Demo","Andaman Lounge Demo","Old Town Nights Demo","Kata Rhythm Demo"],
  "ขอนแก่น":["Kaen Pulse Demo","Ton Koon Loft Demo","Mor Lam Mood Demo","Isan Beat Demo"],
  "อุดรธานี":["UD Twilight Demo","Rim Nong Bar Demo","Soda Lane Demo","North Moon Demo"]
};
// พาเลตสีชาร์ต — อ้างถึง CSS variable ใน app/globals.css (Design System) เพื่อให้เปลี่ยนตามโหมดสว่าง/มืด
// เส้นกริด/ตัวเลขแกนกำหนดสีผ่านกฎ CSS (.chart-wrap svg line/text) ค่าที่นี่เป็นแค่ fallback
const CHART_COLORS=["var(--chart-1)","var(--chart-2)","var(--chart-3)","var(--chart-4)","var(--chart-5)","var(--chart-6)"];
const CHART_GRID="rgba(16,42,99,.08)",CHART_AXIS_TEXT="#64748B";
const COMPARES={
  tonight:[["lastnight","คืนก่อน"],["avg7","ค่าเฉลี่ย 7 วัน"],["avg30","ค่าเฉลี่ย 30 วัน"]],
  today:[["lastnight","คืนก่อน"],["lastweek","สัปดาห์ก่อน"],["avg7","ค่าเฉลี่ย 7 วัน"]],
  "7d":[["lastweek","สัปดาห์ก่อน"],["avg30","ค่าเฉลี่ย 30 วัน"]],
  "30d":[["lastmonth","เดือนก่อน"],["lastyear","ปีก่อน"]],
  month:[["lastmonth","เดือนก่อน"],["lastyear","ปีก่อน"]],
  quarter:[["lastmonth","เดือนก่อน"],["lastyear","ปีก่อน"]],
  year:[["lastyear","ปีก่อน"]],
  custom:[["lastmonth","เดือนก่อน"],["lastyear","ปีก่อน"],["avg30","ค่าเฉลี่ย 30 วัน"]],
  alltime:[["lastyear","ปีก่อน"]]
};
const initialMode=document.getElementById("realtimeBtn")?.getAttribute("aria-pressed")==="true"?"realtime":"overall";
const authorizedProvince=viewer.province&&PROVINCES[viewer.province]?viewer.province:"กรุงเทพมหานคร";
const authorizedVenue=viewer.venue&&PROVINCES[authorizedProvince].includes(viewer.venue)?viewer.venue:PROVINCES[authorizedProvince][0];
// role "province" ที่ไม่ได้ระบุ viewer.province (เช่น admin01-03 ดู [[nearsip-user-menu-permission-testing]])
// ให้ scope เป็น level:"country" เหมือน admin (เห็นทุกจังหวัด/ทุกร้าน) แต่ยังไม่ใช่ role "admin" จริง
// เลยยังถูกจำกัดเมนูผ่าน userMenuPermissions ได้ตามปกติ ส่วน role "province" ที่ระบุจังหวัดมา (เช่น
// province_bkk เดิม) ยังคงพฤติกรรมเดิมทุกอย่าง ไม่กระทบ
const initialScope=viewer.role==="admin"?{level:"country",province:"กรุงเทพมหานคร",venue:"Siam Social Demo"}:viewer.role==="province"&&!viewer.province?{level:"country",province:"กรุงเทพมหานคร",venue:"Siam Social Demo"}:viewer.role==="province"?{level:"province",province:authorizedProvince,venue:authorizedVenue}:{level:"venue",province:authorizedProvince,venue:authorizedVenue};
const permissionUsers=viewer.role==="admin"?managedUsers:[viewer];
let userMenuPermissions=loadUserMenuPermissions(permissionUsers);
// NOTE: ร้านจริงจาก backend ผ่าน /api/stores (แทน PROVINCES mock เฉพาะ dropdown ร้านของ role admin)
// backend ยังไม่มีฟิลด์จังหวัดผูกร้าน จึงใช้ real store list ได้เฉพาะตอน role==="admin" เท่านั้น
// ดู loadRealStores() และจุดใช้งานใน populate()
let realStores=[];
// สถานะโหลดข้อมูลจริง ใช้ใน realDataGate() — เดิมถ้ายังไม่โหลด/โหลดพลาด ทุกการ์ดตกไปแสดงตัวเลข mock เงียบๆ (มีแค่ console.warn)
// ตอนนี้ render() จะแสดง "กำลังโหลด…" หรือ "โหลดไม่สำเร็จ + ลองใหม่" แทน (โค้ด fallback mock เดิมในแต่ละการ์ดยังอยู่ครบ)
let realStoresLoaded=false,realStoresFailed=false,realStoreStatsFailed=false,realUserStatsFailed=false;
let unmounted=false;
let realtimePollId=null;
async function loadRealStores(){
  try{
    const res=await fetch("/api/stores");
    // เดิม: if(!res.ok)return; — เงียบ ค้าง mock ตลอด
    if(!res.ok){realStoresFailed=true;render();return}
    const json=await res.json();
    if(unmounted)return;
    realStores=(json.stores||[]).filter(s=>s.status==="ACTIVE");
    realStoresLoaded=true;realStoresFailed=false;
    populate();render();
    loadRealStoreStats();
    // ร้านจริงเพิ่งโหลดเสร็จ — ถ้ามีร้านที่เลือกอยู่แล้ว ต้องดึงตัวเลขใหม่ให้ตรงร้าน (ไม่งั้นรอบแรกที่ยิงไปยังไม่รู้ storeId)
    if(engagementStoreId())loadEngagement();
  }catch(err){
    console.warn("Failed to load real store list, falling back to mock PROVINCES",err);
    realStoresFailed=true;render();
  }
}
// สถิติจริงแยกรายร้าน (เรียก /api/user-stats?storeId=... วนทีละร้าน) — ใช้ทำ Top Performer ranking
// จากข้อมูลจริงแทน mock ใน execPage() มีแค่ users/newUsers/engagement เพราะเป็น metric เดียวที่ DB
// รองรับต่อร้านจริง (Repeat/NSC/รายได้ ไม่มี table ให้ query เลย จึงไม่ใส่)
let realStoreStats=[];
async function loadRealStoreStats(){
  if(!realStores.length)return;
  try{
    const days=periodToDays(state.period);
    const results=await Promise.all(realStores.map(async s=>{
      try{
        const res=await fetch(`/api/user-stats?days=${days}${userStatsRangeQuery()}&storeId=${encodeURIComponent(s.storeId)}`);
        if(!res.ok)return null;
        const json=await res.json();
        // เดิม: newUsers:json.newUsers??null — "ทั้งหมด" ได้ null แล้วแสดง "—" (ดู newCell/valueCell ที่คอมเมนต์ไว้ใน execPage)
        // ตอนนี้ "ทั้งหมด" เทียบกับคืนนี้ (แบบ A) จึงใช้ newUsersTonight แทนเมื่อ server ไม่ได้แยกตามช่วง
        return{venue:s.name||s.locationName||s.storeId,uniqueUsers:json.uniqueUsers||0,newUsers:json.newUsers??json.newUsersTonight??null,engagement:(json.cheersTotal||0)+(json.chatsTotal||0)};
      }catch{return null}
    }));
    if(unmounted)return;
    realStoreStats=results.filter(Boolean);
    realStoreStatsFailed=realStoreStats.length===0;
    render();
  }catch(err){
    console.warn("Failed to load per-store real stats",err);
    realStoreStatsFailed=true;render();
  }
}
// ร้านจริง/feed จริงจาก backend ผ่าน /api/feed — เสริมเพิ่ม (ไม่แทนที่ mock อื่นๆ) ดูจุดใช้งานใน execPage()
let realFeed=[];
async function loadRealFeed(){
  try{
    const res=await fetch("/api/feed");
    if(!res.ok)return;
    const json=await res.json();
    if(unmounted)return;
    realFeed=json.items||[];
    if(realFeed.length)render();
  }catch(err){
    console.warn("Failed to load real feed list",err);
  }
}
// ผู้ใช้จริง/ผู้ใช้ใหม่จริงจาก DB ตรง (read-only) ผ่าน /api/user-stats — backend ไม่มี endpoint
// list/count user เลย ดูจุดใช้งานใน execPage() — ประมาณ period ที่เลือกเป็นจำนวนวันคร่าวๆ
let realUserStats=null;
function periodToDays(period){
  // alltime: ไม่มี "ไม่จำกัดวัน" ใน SQL interval เลยใช้เลขใหญ่ๆ (100 ปี) แทนแบบ "ทั้งหมด" ในทางปฏิบัติ
  return {tonight:1,today:1,"7d":7,"30d":30,month:30,quarter:90,year:365,custom:30,alltime:36500}[period]||30;
}
// ช่วงคืนธุรกิจ (ตัด 06:00 น. เวลาไทย) ของ period ที่เลือก — ส่งให้ /api/user-stats แยก ผู้ใช้ใหม่ (สมัครตั้งแต่ต้นช่วง)
// กับ ผู้ใช้เดิม (สมัครก่อนต้นช่วง) "ทั้งหมด" ไม่มี from จึงแยกไม่ได้ (server คืน null) ดู lib/db/user.repository.ts
function userStatsRangeQuery(){
  const from=document.getElementById("dateFrom"),to=document.getElementById("dateTo");
  const range=resolveNightRange(state.period,new Date(),{from:from&&from.value,to:to&&to.value});
  return (range.from?`&from=${range.from}`:"")+(range.to?`&to=${range.to}`:"")
}
// หา storeId ของร้านที่เลือกอยู่ตอนนี้ (ถ้ามี) — ใช้กรองข้อมูลจริงเฉพาะร้านนั้น ดูจุดใช้งานใน loadRealUserStats()
// กรองได้เฉพาะตอน role admin + level="venue" + เลือกร้านจริง (ไม่ใช่ร้าน mock จาก PROVINCES)
function selectedStoreId(){
  if(viewer.role!=="admin"||state.level!=="venue")return null;
  const store=realStores.find(s=>(s.name||s.locationName||s.storeId)===state.venue);
  return store?store.storeId:null;
}
async function loadRealUserStats(){
  try{
    const storeId=selectedStoreId();
    const qs=`?days=${periodToDays(state.period)}${userStatsRangeQuery()}`+(storeId?`&storeId=${encodeURIComponent(storeId)}`:"");
    const res=await fetch(`/api/user-stats${qs}`);
    // เดิม: if(!res.ok)return; — เงียบ ค้าง mock ตลอด
    if(!res.ok){realUserStatsFailed=true;render();return}
    const json=await res.json();
    if(unmounted)return;
    realUserStats=json;realUserStatsFailed=false;
    render();
  }catch(err){
    console.warn("Failed to load real user stats, falling back to mock",err);
    realUserStatsFailed=true;render();
  }
}
// เวอร์ชันเบาของ loadRealUserStats() ด้านบน — ใช้เฉพาะกับ poll ความถี่สูง (ทุก 5 วิ ดูจุดตั้ง interval
// ด้านล่างที่คอมเมนต์ realtimePollId) ยิงแค่ /api/active-count (activeSessions+uniqueUsers) แทนที่จะยิง
// /api/user-stats เต็ม ๆ (14 query + ดึง raw rows หลักหมื่นแถวที่การ์ดนี้ไม่ได้ใช้) merge เข้า realUserStats
// เดิมแค่ 2 field นี้เท่านั้น ไม่แตะ field อื่นที่การ์ด/หน้าอื่นใช้อยู่ (gender/age/timestamps ฯลฯ)
async function loadActiveNow(){
  try{
    const storeId=selectedStoreId();
    const qs=storeId?`?storeId=${encodeURIComponent(storeId)}`:"";
    const res=await fetch(`/api/active-count${qs}`);
    if(!res.ok)return;
    const json=await res.json();
    if(unmounted)return;
    if(!realUserStats)return;
    realUserStats={...realUserStats,activeSessions:json.activeSessions,uniqueUsers:json.uniqueUsers};
    // แก้ทุกหน้า (ไม่ใช่แค่ Real-time) ตามที่ขอ — แต่แก้เฉพาะ element ที่ห่อด้วย class พวกนี้ตรงๆ แทนการ
    // เรียก render() เต็ม กัน scroll/แถวที่ขยายอยู่ของหน้านั้นโดนรีเซ็ต (ดูจุดครอบ class ที่ template แต่ละหน้า)
    document.querySelectorAll(".live-active-sessions").forEach(el=>{el.textContent=fmt(json.activeSessions)});
    document.querySelectorAll(".live-unique-users").forEach(el=>{el.textContent=fmt(json.uniqueUsers)});
  }catch(err){
    console.warn("Failed to load active-now count",err);
  }
}
// Engagement & Retention — ข้อมูลจริงล้วนจาก /api/engagement (ไม่มี mock ปน) ตัวเลขทุกตัวตามร้าน + ช่วงเวลาที่เลือก
// เก็บผลล่าสุดไว้ใน engagementReport (null = กำลังโหลด) engagementFailed = โหลดไม่สำเร็จ (ไม่ fallback เป็นเลขปลอม)
let engagementReport=null,engagementFailed=false,engagementRequestId=0;
// ร้านจริงที่เลือกอยู่ — admin และ role "province" ที่ไม่ผูกจังหวัด (admin01-03) เลือกร้านจริงได้เหมือนกัน
function engagementStoreId(){
  const canPickRealStore=viewer.role==="admin"||(viewer.role==="province"&&!viewer.province);
  if(!canPickRealStore||state.level!=="venue")return null;
  const store=realStores.find(s=>(s.name||s.locationName||s.storeId)===state.venue);
  return store?store.storeId:null
}
async function loadEngagement(){
  const requestId=++engagementRequestId;
  engagementReport=null;engagementFailed=false;
  const from=document.getElementById("dateFrom"),to=document.getElementById("dateTo");
  const range=resolveNightRange(state.period,new Date(),{from:from&&from.value,to:to&&to.value});
  const qs=new URLSearchParams();
  if(range.from)qs.set("from",range.from);
  if(range.to)qs.set("to",range.to);
  const storeId=engagementStoreId();
  if(storeId)qs.set("storeId",storeId);
  render();
  try{
    const res=await fetch(`/api/engagement${qs.size?`?${qs}`:""}`);
    if(!res.ok)throw new Error(`engagement ${res.status}`);
    const json=await res.json();
    if(unmounted||requestId!==engagementRequestId)return;
    engagementReport=json
  }catch(err){
    if(unmounted||requestId!==engagementRequestId)return;
    console.warn("Failed to load engagement report",err);
    engagementFailed=true
  }
  render()
}
// เวลาของข้อมูลจริงล่าสุด (ไม่ใช่เวลาที่เปิด/อัปเดตหน้า Dashboard)
function dataAsOfLabel(){
  if(engagementFailed)return"—";
  if(!engagementReport)return"กำลังโหลด…";
  const latest=engagementReport.dataAsOf.latest;
  return latest?fmtDateTime(latest):"ยังไม่มีข้อมูล"
}
const state={
  mode:initialMode,page:"executive",...initialScope,
  // เดิม: businessNight:"18:00–02:00" — option นี้ถูกเอาออกจาก nightSelect แล้ว (เหลือแค่ช่วงรายชั่วโมง) เปลี่ยน default ให้ตรงกัน
  // เดิม: period:"month",compare:"lastmonth" — เปลี่ยน default ช่วงเวลาเป็น "ทั้งหมด" ตามที่ขอ (compare ต้องตรงกับ COMPARES.alltime)
  // เดิม: businessNight:"18:00–19:00" — เพิ่มตัวเลือก "ทั้งหมด" ใน nightSelect และตั้งเป็นค่าเริ่มต้นตามที่ขอ
  period:"alltime",compare:"lastyear",businessNight:"ทั้งหมด",
  // trendMetric: "users"(คนไม่ซ้ำ)|"logins"(จำนวนครั้ง) · trendGran: "auto"|"night"|"week"|"month" — กราฟแนวโน้มหน้า Executive Overview
  execTrend:"users",trendMetric:"users",trendGran:"auto",topMetric:"users",provinceMetric:"users",segmentMetric:"frequent",
  engageTab:"retention",timeMetric:"users",granularity:"30m",nscTab:"nsc",
  revenueTrend:"daily",revenueRank:"feature",merchantSort:"lastAccess",
  permissionSearch:"",permissionUserId:""
};
function canAccessMenu(menuId){return viewer.role==="admin"||(userMenuPermissions[viewer.id]||[]).includes(menuId)}
function accessibleOverallMenus(){return OVERALL_DASHBOARD_MENUS.filter(menu=>canAccessMenu(menu.id))}
function ensureAccessibleView(){
  const overallMenus=accessibleOverallMenus(),canViewRealtime=canAccessMenu("realtime");
  if(state.mode==="realtime"&&!canViewRealtime){state.mode="overall";state.page=overallMenus[0]?.id||"executive"}
  if(state.mode==="overall"){
    if(state.page==="settings"&&viewer.role==="admin")return;
    if(!canAccessMenu(state.page)){
      if(overallMenus.length)state.page=overallMenus[0].id;
      else if(canViewRealtime)state.mode="realtime"
    }
  }
}
function enforceViewerScope(){
  if(viewer.role==="admin")return;
  // role "province" ที่ไม่มี province ผูกไว้ (เช่น admin01-03) ให้ scope แบบ admin เหมือนกัน — ไม่งั้นโค้ด
  // ด้านล่างจะบังคับ state.level กลับเป็น "province" และ state.venue กลับเป็นร้าน mock ทุกครั้งที่ populate()
  // ทำงาน (ล้าง country level + ร้านจริงที่เพิ่งแก้ให้เลือกได้ทิ้งไปเลย) ตามที่ขอ
  if(viewer.role==="province"&&!viewer.province)return;
  state.province=authorizedProvince;
  if(viewer.role==="owner"){
    state.level="venue";state.venue=authorizedVenue;return
  }
  if(state.level!=="province"&&state.level!=="venue")state.level="province";
  // "ALL" (ตัวเลือก "ทั้งหมด" ใน venueSelect) เป็นค่าที่ถูกต้องด้วย ไม่ต้องรีเซ็ตกลับเป็นร้านเดียว
  if(state.venue!=="ALL"&&!PROVINCES[authorizedProvince].includes(state.venue))state.venue=authorizedVenue
}
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h+=(h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24)}return Math.abs(h>>>0)}
function rng(seed){let t=seed>>>0;return()=>{t+=0x6D2B79F5;let r=Math.imul(t^t>>>15,1|t);r^=r+Math.imul(r^r>>>7,61|r);return((r^r>>>14)>>>0)/4294967296}}
function fmt(n){return new Intl.NumberFormat("th-TH").format(Math.round(Number(n)||0))}
function money(n){return "฿"+new Intl.NumberFormat("th-TH",{maximumFractionDigits:1,notation:Math.abs(n)>=1000000?"compact":"standard"}).format(Number(n)||0)}
function pct(n){return (n>=0?"+":"")+Number(n).toFixed(1)+"%"}
function pp(n){return (n>=0?"+":"")+Number(n).toFixed(1)+" pp"}
function scale(){return {tonight:1,today:1.15,"7d":5.3,"30d":22,month:22,quarter:66,year:255,custom:35,alltime:255}[state.period]}
function allVenues(){return Object.entries(PROVINCES).flatMap(([province,venues])=>venues.map(venue=>({province,venue})))}
// รายชื่อร้านที่ให้เลือกใน venueSelect ตาม role/scope ปัจจุบัน — แยกไว้เป็น helper เพราะ populate() และ
// entities() (ตอนเลือก "ทั้งหมด") ต้องใช้ list เดียวกัน
function venueOptions(){
  const realVenueNames=realStores.map(s=>s.name||s.locationName||s.storeId).filter(Boolean);
  // เดิม: เช็คแค่ viewer.role==="admin" ถึงจะได้รายชื่อร้านจริง — เปลี่ยนเป็น "ไม่ใช่ owner" แทน ตามที่ขอ
  // เพื่อให้ role อื่นที่ต้องเห็นร้านจริงทั้งหมดเหมือน admin (เช่น admin01-03 role "province" ไม่มี province
  // ผูกไว้ ดู [[nearsip-user-menu-permission-testing]]) เห็นรายชื่อร้านจริงด้วย ไม่ใช่ mock — owner ยังคง
  // เห็นแค่ร้านตัวเองเหมือนเดิม ไม่กระทบ
  return viewer.role==="owner"?[authorizedVenue]:realVenueNames.length?realVenueNames:PROVINCES[state.province];
}
function entities(){
  if(state.level==="country")return allVenues();
  if(state.level==="province")return PROVINCES[state.province].map(venue=>({province:state.province,venue}));
  // venue==="ALL": เลือก "ทั้งหมด" ใน venueSelect — รวมข้อมูลทุกร้านในสโคปปัจจุบันแทนร้านเดียว
  if(state.venue==="ALL")return venueOptions().map(venue=>({province:state.province,venue}));
  return[{province:state.province,venue:state.venue}]
}
function scopeName(){if(state.level==="country")return"ประเทศไทย";if(state.level==="province")return"จังหวัด"+state.province;if(state.venue==="ALL")return"ร้านพาร์ทเนอร์ทั้งหมด · "+state.province;return state.venue+" · "+state.province}
function periodLabel(){return document.querySelector("#periodSelect option:checked")?.textContent||"เดือนนี้"}
function compareLabel(){return document.querySelector("#compareSelect option:checked")?.textContent||"เดือนก่อน"}
function change(c,p){return p?((c-p)/p*100):0}
function rowData(province,venue,variant="current"){
  const r=rng(hash(province+"|"+venue+"|"+state.period+"|"+variant));
  const s=scale(),boost={"กรุงเทพมหานคร":1.40,"ชลบุรี":1.18,"ภูเก็ต":1.16,"เชียงใหม่":1.08,"ขอนแก่น":1.0,"อุดรธานี":.90}[province]||1;
  const prior=variant==="prior"?.84+r()*.24:1;
  const unique=Math.round((125+r()*145)*boost*s*prior);
  const newUsers=Math.round(unique*(.28+r()*.15)),existing=unique-newUsers;
  const sameVenue=Math.round(existing*(.42+r()*.16)),crossVenue=Math.round(existing*(.16+r()*.12));
  const oneTime=Math.round(unique*(.29+r()*.14)),fourPlus=Math.round(unique*(.08+r()*.08)),twoTimes=Math.round(unique*(.20+r()*.07)),threeTimes=Math.max(0,unique-oneTime-fourPlus-twoTimes);
  const male=Math.round(unique*(.42+r()*.06)),female=Math.round(unique*(.42+r()*.06)),lgbtq=Math.max(0,unique-male-female);
  const a20=Math.round(unique*(.34+r()*.07)),a31=Math.round(unique*(.27+r()*.07)),a41=Math.round(unique*(.17+r()*.05)),a51=Math.round(unique*(.10+r()*.04)),a61=Math.max(0,unique-a20-a31-a41-a51);
  const lineLogin=Math.round(unique*(.74+r()*.10)),emailLogin=unique-lineLogin,ios=Math.round(unique*(.46+r()*.08)),android=unique-ios;
  const sessions=Math.round(unique*(1.25+r()*.55));
  const cheersSent=Math.round(unique*(2.3+r()*2.1)),cheersSenders=Math.round(unique*(.48+r()*.18)),cheersReceivers=Math.round(unique*(.42+r()*.17));
  const accepted=Math.round(cheersSent*(.32+r()*.19)),rejected=Math.round(cheersSent*(.10+r()*.08)),expired=Math.max(0,cheersSent-accepted-rejected);
  const matches=Math.round(accepted*(.43+r()*.18)),matchedUsers=Math.round(matches*(1.20+r()*.34)),multiMatch=Math.round(matchedUsers*(.18+r()*.12));
  const chats=Math.round(matches*(.72+r()*.19)),meaningfulChats=Math.round(chats*(.48+r()*.22));
  const repeat7=Math.round(unique*(.16+r()*.09)),repeat30=Math.round(unique*(.28+r()*.11)),repeat60=Math.round(unique*(.36+r()*.11)),repeat90=Math.round(unique*(.42+r()*.12));
  const same7=Math.round(repeat7*(.62+r()*.14)),same30=Math.round(repeat30*(.54+r()*.15)),sameProvinceOther=Math.round(crossVenue*(.50+r()*.23));
  const nscPurchased=Math.round(unique*(38+r()*46)),topupTx=Math.max(1,Math.round(unique*(.16+r()*.09))),uniqueTopup=Math.max(1,Math.round(topupTx*(.56+r()*.17))),repeatTopup=Math.round(uniqueTopup*(.30+r()*.20));
  const nscConsumed=Math.round(nscPurchased*(.68+r()*.19)),featureTourist=Math.round(nscConsumed*(.42+r()*.14)),dashboardUnlock=Math.round(nscConsumed*(.10+r()*.08)),outstanding=Math.max(0,nscPurchased-nscConsumed),holdersNeverUsed=Math.round(unique*(.08+r()*.08)),transfer=Math.round(nscConsumed*(.12+r()*.10)),firstUseHours=4+r()*21;
  const cashReceived=Math.round(nscPurchased*(.72+r()*.20)),merchantRevenue=Math.round(dashboardUnlock*(.62+r()*.24)),featureRevenue=Math.round(featureTourist*(.38+r()*.21)),recognizedRevenue=Math.round((cashReceived+merchantRevenue+featureRevenue)*(.52+r()*.18));
  const onlineTonight=(hash(venue+"online")%100)<82?1:0,onlineNow=(hash(venue+"now")%100)<61?1:0,newPartner=(hash(venue+"new")%100)<17?1:0;
  const activeNow=Math.max(2,Math.round((16+r()*48)*boost)),newNow=Math.round(activeNow*(.28+r()*.17)),returningNow=activeNow-newNow,lineNow=Math.round(activeNow*(.74+r()*.10)),emailNow=activeNow-lineNow,activeChatsNow=Math.round(activeNow*(.24+r()*.18));
  const mNow=Math.round(activeNow*(male/unique)),fNow=Math.round(activeNow*(female/unique)),lNow=Math.max(0,activeNow-mNow-fNow);
  const a20Now=Math.round(activeNow*(a20/unique)),a31Now=Math.round(activeNow*(a31/unique)),a41Now=Math.round(activeNow*(a41/unique)),a51Now=Math.round(activeNow*(a51/unique)),a61Now=Math.max(0,activeNow-a20Now-a31Now-a41Now-a51Now);
  const nscNow=Math.max(0,Math.round(activeNow*(14+r()*12)));
  const nmbEligible=1,nmbSent=(hash(venue+"nmb")%100)<92?1:0,nmbClicks=(hash(venue+"click")%100)<53?1:0;
  const dashEver=(hash(venue+"dash")%100)<78?1:0,dashNever=1-dashEver,dashDaily=(hash(venue+"dd")%100)<38?1:0,dashWeekly=(hash(venue+"dw")%100)<62?1:0,dashMonthly=(hash(venue+"dm")%100)<78?1:0,dashUsers=Math.max(dashEver,Math.round(1+r()*3)),repeatUnlock=(hash(venue+"repeatunlock")%100)<44?1:0;
  const lastAccessMinutes=15+(hash(venue+"access")%600),unlockFrequency=1+(hash(venue+"uf")%12);
  return {province,venue,unique,newUsers,existing,sameVenue,crossVenue,oneTime,twoTimes,threeTimes,fourPlus,male,female,lgbtq,a20,a31,a41,a51,a61,lineLogin,emailLogin,ios,android,sessions,cheersSent,cheersSenders,cheersReceivers,accepted,rejected,expired,matches,matchedUsers,multiMatch,chats,meaningfulChats,repeat7,repeat30,repeat60,repeat90,same7,same30,sameProvinceOther,nscPurchased,topupTx,uniqueTopup,repeatTopup,nscConsumed,featureTourist,dashboardUnlock,outstanding,holdersNeverUsed,transfer,firstUseHours,cashReceived,merchantRevenue,featureRevenue,recognizedRevenue,onlineTonight,onlineNow,newPartner,activeNow,newNow,returningNow,lineNow,emailNow,activeChatsNow,mNow,fNow,lNow,a20Now,a31Now,a41Now,a51Now,a61Now,nscNow,nmbEligible,nmbSent,nmbClicks,dashEver,dashNever,dashDaily,dashWeekly,dashMonthly,dashUsers,repeatUnlock,lastAccessMinutes,unlockFrequency}
}
function aggregate(variant="current"){
  const rows=entities().map(e=>rowData(e.province,e.venue,variant)),keys=Object.keys(rows[0]).filter(k=>typeof rows[0][k]==="number"&&k!=="firstUseHours"&&k!=="lastAccessMinutes");
  const o={rows,partnerStores:rows.length};keys.forEach(k=>o[k]=rows.reduce((a,b)=>a+(b[k]||0),0));
  o.firstUseHours=rows.reduce((a,b)=>a+b.firstUseHours,0)/rows.length;
  o.engagement=o.cheersSent+o.matches+o.chats;o.engagementRate=(o.cheersSenders+o.matchedUsers+o.meaningfulChats)/Math.max(1,o.unique)*100;o.engagementPerUser=o.engagement/Math.max(1,o.unique);o.engagementPerSession=o.engagement/Math.max(1,o.sessions);
  o.cheersAcceptance=o.accepted/Math.max(1,o.cheersSent)*100;o.cheersPerActive=o.cheersSent/Math.max(1,o.unique);o.matchRate=o.matchedUsers/Math.max(1,o.unique)*100;o.chatActivation=o.chats/Math.max(1,o.matches)*100;o.repeatRate=o.repeat30/Math.max(1,o.unique)*100;
  o.burnRate=o.nscConsumed/Math.max(1,o.nscPurchased)*100;o.avgTopup=o.nscPurchased/Math.max(1,o.topupTx);o.avgPerTopupper=o.nscPurchased/Math.max(1,o.uniqueTopup);o.nscPerActiveUser=o.nscConsumed/Math.max(1,o.unique);o.nscPerVenue=o.nscConsumed/Math.max(1,o.onlineTonight);o.purchaseConsumedRatio=o.nscPurchased/Math.max(1,o.nscConsumed);o.transferConsumedRatio=o.transfer/Math.max(1,o.nscConsumed)*100;
  o.platformRevenue=o.cashReceived+o.merchantRevenue+o.featureRevenue;o.avgRevenuePerVenue=o.platformRevenue/Math.max(1,o.partnerStores);o.avgRevenuePerActiveVenue=o.platformRevenue/Math.max(1,o.onlineTonight);
  return o
}
function kpi(label,value,deltaText,meta,status="good"){return`<article class="kpi"><div class="k-label">${label}</div><div class="k-value">${value}</div><div class="k-delta ${status}">${deltaText}</div><div class="k-meta">${meta}</div></article>`}
// ผู้ใช้ใหม่ = สมัคร (user.create_at) ตั้งแต่ต้นช่วงที่เลือก (คืนธุรกิจ ตัด 06:00 น.) · ผู้ใช้เดิม = สมัครก่อนต้นช่วง
// null (เลือก "ทั้งหมด") ไม่มีต้นช่วงให้แยก (ทุกคนสมัครหลังวันเริ่มระบบ) จึงเทียบกับคืนนี้แทน (แบบ A) โดยใช้
// newUsersTonight/existingUsersTonight ที่ server ส่งมาอยู่แล้ว (ตัวเลขเดียวกับการ์ดโหมด Real-time) — ดู lib/db/user.repository.ts
// เดิม: null → แสดง "—" พร้อม NO_SPLIT_NOTE (คอมเมนต์ไว้เป็น fallback ไม่ลบ)
// const NO_SPLIT_NOTE="เลือกช่วงเวลาอื่นที่ไม่ใช่ “ทั้งหมด” เพื่อแยกผู้ใช้ใหม่/เดิม";
const ALLTIME_VS_TONIGHT_NOTE="ทั้งหมด → เทียบกับคืนนี้ (ตัดรอบ 06:00 น.)";
function realNewUsersKpi(label){
  const n=realUserStats.newUsers;
  // เดิม: return n===null?kpi(label,"—","",NO_SPLIT_NOTE,"neutral"):kpi(label,fmt(n),"",periodLabel()+" · สมัครใหม่ (ตัดรอบ 06:00 น.)","neutral")
  return n===null?kpi(label,fmt(realUserStats.newUsersTonight),"",ALLTIME_VS_TONIGHT_NOTE+" · สมัครใหม่","neutral"):kpi(label,fmt(n),"",periodLabel()+" · สมัครใหม่ (ตัดรอบ 06:00 น.)","neutral")
}
function realExistingUsersKpi(label){
  const n=realUserStats.existingUsers;
  // เดิม: return n===null?kpi(label,"—","",NO_SPLIT_NOTE,"neutral"):kpi(label,fmt(n),"","สมัครก่อนช่วง "+periodLabel(),"neutral")
  return n===null?kpi(label,fmt(realUserStats.existingUsersTonight),"",ALLTIME_VS_TONIGHT_NOTE+" · สมัครก่อนคืนนี้","neutral"):kpi(label,fmt(n),"","สมัครก่อนช่วง "+periodLabel(),"neutral")
}
function card(title,subtitle,body,tag=""){return`<section class="card"><div class="card-head"><div><h3>${title}</h3><p>${subtitle}</p></div>${tag}</div>${body}</section>`}
function hero(title,desc,note=""){return`<div class="hero"><div><h2>${title}</h2><p>${desc}</p></div>${note?`<div class="hero-note">${note}</div>`:""}</div>`}
function barRows(items){const max=Math.max(...items.map(x=>x[1]),1);return items.map(([n,v,l])=>`<div class="driver"><span>${n}</span><div class="track"><div class="fill" style="width:${v/max*100}%"></div></div><strong>${l||fmt(v)}</strong></div>`).join("")}
function stacked(items,total){const colors=CHART_COLORS;return`<div class="stack">${items.map((x,i)=>`<span style="width:${x[1]/Math.max(1,total)*100}%;background:${colors[i]}"></span>`).join("")}</div><div class="stack-legend">${items.map((x,i)=>`<span><i style="display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:5px;background:${colors[i]}"></i>${x[0]}<b>${fmt(x[1])} · ${(x[1]/Math.max(1,total)*100).toFixed(1)}%</b></span>`).join("")}</div>`}

function pieChart(items,total,centerLabel){
  const colors=CHART_COLORS;
  let acc=0;
  const stops=items.map((x,i)=>{const start=acc/Math.max(1,total)*100;acc+=x[1];const end=acc/Math.max(1,total)*100;return `${colors[i]} ${start}% ${end}%`;}).join(",");
  return `<div class="pie-card"><div class="pie" data-total="${centerLabel.replace(/\n/g,'&#10;')}" style="background:conic-gradient(${stops})"></div><div class="pie-legend">${items.map((x,i)=>`<div><span><i style="background:${colors[i]}"></i>${x[0]}</span><strong>${fmt(x[1])} · ${(x[1]/Math.max(1,total)*100).toFixed(1)}%</strong></div>`).join("")}</div></div>`
}

function focusCard(opts){
  return `<article class="rt-focus-card ${opts.span||'double'} ${opts.tone||'primary'}">
    <div class="rt-pill">${opts.pill||'Current State'}</div>
    <div class="rt-title">${opts.title}</div>
    <div class="rt-current-label">Real-time ตอนนี้</div>
    <div class="rt-current-value">${opts.current}</div>
    ${/* รวมทั้งคืนจนถึงตอนนี้ — คอมเมนต์ไว้ก่อน (เก็บ rt-night-spacer ไว้แทนที่ เพื่อให้ระยะห่างถึง footer ด้านล่าง เช่น "ร้าน ACTIVE: xxx" อยู่ตำแหน่งเดิม)
    <div class="rt-night-label">รวมทั้งคืนจนถึงตอนนี้</div>
    <div class="rt-night-value">${opts.tonight}</div>
    */""}
    <div class="rt-night-spacer"></div>
    ${opts.note?`<div class="rt-subtle">${opts.note}</div>`:''}
    ${opts.footer?`<div class="rt-split-note">${opts.footer}</div>`:''}
  </article>`
}
function combinedInteractionCard(vals){
  // รองรับกรณีค่าเป็น string เช่น "—" (ไม่มีข้อมูลจริง เช่น Match ที่ไม่มี concept นี้ใน DB) — ผ่าน fmt() แค่ตอนเป็นตัวเลขเท่านั้น
  const fmtOrDash=v=>typeof v==="string"?v:fmt(v);
  return `<article class="rt-focus-card triple hot">
    <div class="rt-pill">Current Interaction</div>
    <div class="rt-title">Cheers / Match / Chat</div>
    <div class="rt-three">
      <div class="rt-metric">
        <div class="m-name">Cheers</div>
        <div class="m-current-label">Real-time ตอนนี้</div>
        <div class="m-current">${fmtOrDash(vals.cheersNow)}</div>
        <div class="m-night-label">รวมทั้งคืน</div>
        <div class="m-night">${fmtOrDash(vals.cheersNight)}</div>
      </div>
      <div class="rt-metric">
        <div class="m-name">Match</div>
        <div class="m-current-label">Real-time ตอนนี้</div>
        <div class="m-current">${fmtOrDash(vals.matchNow)}</div>
        <div class="m-night-label">รวมทั้งคืน</div>
        <div class="m-night">${fmtOrDash(vals.matchNight)}</div>
      </div>
      <div class="rt-metric">
        <div class="m-name">Chat</div>
        <div class="m-current-label">Real-time ตอนนี้</div>
        <div class="m-current">${fmtOrDash(vals.chatNow)}</div>
        <div class="m-night-label">รวมทั้งคืน</div>
        <div class="m-night">${fmtOrDash(vals.chatNight)}</div>
      </div>
    </div>
    <div class="rt-split-note"><span>ตัวเลขใหญ่ = Real-time</span><span>ตัวเลขเล็ก = สะสมคืนนี้</span></div>
  </article>`
}
// bucket timestamp จริง (ISO string, UTC) เข้า label ช่วงเวลาของ Real-time Timeline — ดูจุดใช้งานใน realtimePage()
// แปลงเป็นเวลาไทย (UTC+7) เพราะ Business Night อ้างอิงเวลาไทย
// เดิม: มี param legacy1h (label 1h ของ timePage() เดิมไม่ wrap เที่ยงคืน 18:00–25:00) และ 15m/30m ตัดทิ้งนอก 18:00–23:59
// — เอาออกแล้ว เพราะ label ของ timePage() ครอบคลุมทั้ง Business Night 18:00–05:59 (wrap เที่ยงคืนเป็น 00:00) เหมือน realtimePage
// key ที่ไม่มีใน labels (เช่น realtimePage ที่โชว์แค่ 18:00–23:30) ถูกข้ามใน bucketCounts() เอง
function timeToLabelKey(date,granularity){
  const bkk=new Date(date.getTime()+7*60*60*1000);
  const h=bkk.getUTCHours(),m=bkk.getUTCMinutes(),hh=String(h).padStart(2,"0");
  if(granularity==="1h")return `${hh}:00`;
  const step=granularity==="15m"?15:30,mm=Math.floor(m/step)*step;
  return `${hh}:${String(mm).padStart(2,"0")}`;
}
function bucketCounts(timestamps,labels,granularity){
  const idx={};labels.forEach((l,i)=>idx[l]=i);
  const counts=labels.map(()=>0);
  timestamps.forEach(ts=>{const key=timeToLabelKey(new Date(ts),granularity);if(idx[key]!==undefined)counts[idx[key]]++});
  return counts;
}
// นับ Visit Frequency จริงจาก login_log (จำนวนครั้งที่ login ต่อ user_id, all-time) — ดูจุดใช้งานใน usersPage()/engagementPage()
function visitFrequency(loginLogs){
  const counts={};
  loginLogs.forEach(l=>{if(!l.userId)return;counts[l.userId]=(counts[l.userId]||0)+1});
  const vals=Object.values(counts);
  return {one:vals.filter(v=>v===1).length,two:vals.filter(v=>v===2).length,three:vals.filter(v=>v===3).length,fourPlus:vals.filter(v=>v>=4).length};
}
// จำนวนผู้ใช้ distinct ที่ login >=2 ครั้งภายใน `days` วันล่าสุดจริง (จาก login_log) — ตัวแทน Repeat Rate
function repeatUsersWithinDays(loginLogs,days){
  const cutoff=Date.now()-days*24*60*60*1000,counts={};
  loginLogs.forEach(l=>{if(!l.userId)return;if(new Date(l.createAt).getTime()<cutoff)return;counts[l.userId]=(counts[l.userId]||0)+1});
  return Object.values(counts).filter(v=>v>=2).length;
}
// Heatmap วัน(จ..อา)×ช่วงเวลา(18–20,20–22,22–00,00–02) จริงจาก login_log — ดูจุดใช้งานใน timePage()
function loginHeatmap(loginLogs){
  const matrix=Array.from({length:7},()=>[0,0,0,0]);
  loginLogs.forEach(l=>{
    const bkk=new Date(new Date(l.createAt).getTime()+7*60*60*1000);
    const day=(bkk.getUTCDay()+6)%7,h=bkk.getUTCHours();
    let tr=-1;
    if(h>=18&&h<20)tr=0;else if(h>=20&&h<22)tr=1;else if(h>=22&&h<24)tr=2;else if(h>=0&&h<2)tr=3;
    if(tr>=0)matrix[day][tr]++;
  });
  return matrix;
}
// แนวโน้ม Login ต่อวันจริงจาก login_log (all-time) — ใช้แทนกราฟ mock ใน "แนวโน้มภาพรวม" ของ execPage()
// ตอนมีข้อมูลจริง (ดูจุดใช้งานใน execPage()) เอาเฉพาะวันที่มี login จริงเท่านั้น ไม่เติมวันว่างเป็น 0
// เพราะข้อมูลจริงยังน้อย เติมวันว่างจะทำให้กราฟแบนจนดูไม่มีความหมาย
function loginTrendByDay(loginLogs){
  const counts={};
  loginLogs.forEach(l=>{
    const bkk=new Date(new Date(l.createAt).getTime()+7*60*60*1000);
    const key=`${bkk.getUTCFullYear()}-${String(bkk.getUTCMonth()+1).padStart(2,"0")}-${String(bkk.getUTCDate()).padStart(2,"0")}`;
    counts[key]=(counts[key]||0)+1;
  });
  const days=Object.keys(counts).sort();
  const THAI_MONTHS=["ม.ค.","ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค.","ส.ค.","ก.ย.","ต.ค.","พ.ย.","ธ.ค."];
  const labels=days.map(k=>{const[,m,d]=k.split("-").map(Number);return `${d} ${THAI_MONTHS[m-1]}`});
  const values=days.map(k=>counts[k]);
  return{labels,values};
}
function timeSeries(total,points,seed){const r=rng(hash(scopeName()+seed+state.period));let cur=total/(points*.9)*(.75+r()*.2);return Array.from({length:points},(_,i)=>{const peak=1+Math.exp(-Math.pow(i-points*.62,2)/(points*1.7))*.9;cur=Math.max(0,cur*(.82+r()*.28)+total/points*.22*peak);return Math.round(cur)})}
function lineChart(series,labels,title="แนวโน้ม",unit="จำนวน"){
  const w=780,h=250,ml=52,mr=18,mt=18,mb=38,vals=series.flatMap(s=>s.values),max=Math.max(...vals,1)*1.12,step=(w-ml-mr)/Math.max(1,labels.length-1),x=i=>ml+i*step,y=v=>h-mb-v/max*(h-mt-mb);
  let grid="",yt="";for(let i=0;i<5;i++){const gy=mt+(h-mt-mb)/4*i,val=max*(1-i/4);grid+=`<line x1="${ml}" y1="${gy}" x2="${w-mr}" y2="${gy}" stroke="${CHART_GRID}"/>`;yt+=`<text x="${ml-8}" y="${gy+4}" text-anchor="end" fill="${CHART_AXIS_TEXT}" font-size="10">${fmt(val)}</text>`}
  // เดิม: xl=labels.map((l,i)=>`<text ...>${l}</text>`).join("") — วาด label ทุกจุดไม่มีเว้น พอ labels.length
  // เยอะ (เช่น loginTrendByDay() จาก login_log จริงหลายเดือน) label ทับกันอ่านไม่ออก เพิ่ม labelStep คำนวณจาก
  // ความกว้างที่มีจริงหาร ~45px/label แล้วโชว์เฉพาะ index ที่หารลงตัว (บวก index สุดท้ายเสมอกันวันล่าสุดหาย)
  // เส้น/จุดข้อมูล (chart-dot ที่แตะดูค่าได้) ยังมีครบทุกวันเหมือนเดิม ตัดแค่ text ใต้แกน X เท่านั้น
  const labelStep=Math.max(1,Math.ceil(labels.length/Math.floor((w-ml-mr)/45)));
  const colors=CHART_COLORS,xl=labels.map((l,i)=>(i%labelStep===0||i===labels.length-1)?`<text x="${x(i)}" y="${h-12}" text-anchor="middle" fill="${CHART_AXIS_TEXT}" font-size="10">${l}</text>`:"").join("");
  const lines=series.map((s,si)=>{const pts=s.values.map((v,i)=>`${x(i)},${y(v)}`).join(" ");const dots=s.values.map((v,i)=>`<circle class="chart-dot" data-series="${s.name}" data-label="${labels[i]}" data-value="${v}" cx="${x(i)}" cy="${y(v)}" r="${si===0?5:4}" style="fill:${colors[si]}" tabindex="0"><title>${s.name} · ${labels[i]} · ${fmt(v)} ${unit}</title></circle>`).join("");return`<polyline fill="none" style="stroke:${colors[si]}" stroke-width="${si===0?4:2.5}" ${si>0?'stroke-dasharray="6 5"':""} points="${pts}"/>${dots}`}).join("");
  return`<div class="chart-wrap"><svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${title}"><title>${title} · หน่วย ${unit}</title>${grid}${yt}${xl}${lines}</svg><div class="legend">${series.map((s,i)=>`<span><i style="background:${colors[i]}"></i>${s.name}</span>`).join("")}</div><div class="chart-value">แตะจุดข้อมูลเพื่อดูค่า</div></div>`
}
function desktopAndMobileTable(headers,rows,mobileCards){
  const visible=mobileCards.slice(0,8),remaining=mobileCards.slice(8);
  const more=remaining.length?`<details class="mobile-more"><summary>ดูรายการทั้งหมดอีก ${remaining.length} รายการ</summary>${remaining.join("")}</details>`:"";
  return`<div class="table-hint">Tablet และ Mobile แสดงคอลัมน์สำคัญก่อน กดดูรายละเอียดหรือรายการทั้งหมดได้</div><div class="table-wrap desktop-table"><table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(c=>`<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div><div class="mobile-list">${visible.join("")}${more}</div>`
}
function mobileCard(title,subtitle,main,status,details){
  return`<article class="mobile-item"><div class="mobile-item-head"><div><h4>${title}</h4><p>${subtitle}</p></div><strong>${main}</strong></div>${status?`<div style="margin-top:7px">${status}</div>`:""}<details><summary>ดูรายละเอียด</summary><div class="detail-grid">${details.map(x=>`<div><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join("")}</div></details></article>`
}
function rankingData(d,metric){
  const labels={users:"ผู้ใช้ NearSip",engagement:"Engagement",engPerUser:"Engagement / ผู้ใช้",repeat:"Repeat Rate",newUsers:"ผู้ใช้ใหม่",nsc:"NSC Usage",nscPerUser:"NSC / ผู้ใช้",revenue:"รายได้"};
  const rows=d.rows.map(r=>{const engagement=r.cheersSent+r.matches+r.chats,rev=r.cashReceived+r.merchantRevenue+r.featureRevenue;const value={users:r.unique,engagement,engPerUser:engagement/Math.max(1,r.unique),repeat:r.repeat30/Math.max(1,r.unique)*100,newUsers:r.newUsers,nsc:r.nscConsumed,nscPerUser:r.nscConsumed/Math.max(1,r.unique),revenue:rev}[metric];return{...r,value,engagement,rev}}).sort((a,b)=>b.value-a.value);
  return{rows,label:labels[metric]}
}
function provinceData(){
  return Object.entries(PROVINCES).map(([province,venues])=>{const rows=venues.map(v=>rowData(province,v,"current")),sum=k=>rows.reduce((a,b)=>a+b[k],0),unique=sum("unique"),engagement=sum("cheersSent")+sum("matches")+sum("chats"),revenue=sum("cashReceived")+sum("merchantRevenue")+sum("featureRevenue");return{province,stores:rows.length,online:sum("onlineTonight"),unique,newUsers:sum("newUsers"),existing:sum("existing"),avgUsers:unique/rows.length,growth:-2+(hash(province+"g")%170)/10,engagement,crossVenue:sum("crossVenue"),male:sum("male"),female:sum("female"),lgbtq:sum("lgbtq"),a20:sum("a20"),a31:sum("a31"),a41:sum("a41"),a51:sum("a51"),a61:sum("a61"),cheers:sum("cheersSent"),matches:sum("matches"),chats:sum("chats"),nscPurchased:sum("nscPurchased"),nscConsumed:sum("nscConsumed"),revenue,revPerActive:revenue/Math.max(1,sum("onlineTonight"))}})}
function execPage(d,p){
  const labels=state.period==="month"?["W1","W2","W3","W4"]:state.period==="today"?["18","20","22","00","02"]:state.period==="7d"?["จ","อ","พ","พฤ","ศ","ส","อา"]:["P1","P2","P3","P4"];
  const curTotal=state.execTrend==="users"?d.unique:d.recognizedRevenue,prevTotal=state.execTrend==="users"?p.unique:p.recognizedRevenue;
  const current=timeSeries(curTotal,labels.length,"exec"),prior=timeSeries(prevTotal,labels.length,"exec-prev");
  // แนวโน้มภาพรวม: ถ้ามี realUserStats และเลือก metric "ผู้ใช้ NearSip" ใช้ login_log จริงแทน mock
  // (รายได้ยังไม่มีข้อมูลจริงใน DB เลย ต้องคง mock ไว้เสมอ)
  // เดิม: loginTrendByDay() + lineChart รายวัน (ข้ามวันที่ไม่มีข้อมูล, จุดเยอะเมื่อข้อมูลครบทุกวัน) — เปลี่ยนเป็น bar chart
  // รวมตามคืน/สัปดาห์/เดือน (buildLoginTrend ใน lib/dashboard/analytics/login-trend.ts) ใช้ปฏิทินคืนธุรกิจเดียวกับหน้า Engagement
  const realTrend=realUserStats&&state.execTrend==="users"?buildLoginTrend(realUserStats.loginLogs,state.trendMetric,state.trendGran):null;
  const useRealTrend=!!realTrend;
  // มีข้อมูลจริงแล้วแต่ scope นี้ (เช่น ร้านที่เลือก) ยังไม่มี login เลย → แสดงว่า "ยังไม่มีข้อมูล" แทนกราฟ mock เดิม (P1–P4 ตัวเลขสุ่ม)
  const emptyRealTrend=!!realUserStats&&state.execTrend==="users"&&!realTrend;
  const TREND_UNIT={users:"คน",logins:"ครั้ง"},TREND_GRAN_LABEL={night:"รายคืน",week:"รายสัปดาห์",month:"รายเดือน"};
  const trendSeg=(attr,cur,opts)=>`<div class="seg">${opts.map(([v,l])=>`<button type="button" ${attr}="${v}" class="${cur===v?"active":""}">${l}</button>`).join("")}</div>`;
  const trendBlock=realTrend?(()=>{
    const unit=TREND_UNIT[state.trendMetric],per=TREND_GRAN_LABEL[realTrend.granularity];
    const toolbar=`<div class="metric-toolbar" style="margin-top:12px">${trendSeg("data-trendmetric",state.trendMetric,[["users","ผู้ใช้ (คนไม่ซ้ำ)"],["logins","จำนวน Login"]])}${trendSeg("data-trendgran",state.trendGran,[["auto","อัตโนมัติ"],["night","รายคืน"],["week","รายสัปดาห์"],["month","รายเดือน"]])}</div>`;
    const stat=(label,value)=>`<div class="mini-stat"><b>${label}</b><strong>${value}</strong></div>`;
    const summary=`<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin:12px 0 4px">${stat(state.trendMetric==="users"?"ผู้ใช้ไม่ซ้ำทั้งหมด":"Login รวม",`${fmt(realTrend.total)} ${unit}`)}${stat("เฉลี่ย"+per.replace("ราย","ต่อ"),`${realTrend.average.toFixed(1)} ${unit}`)}${stat("สูงสุด",realTrend.peak?`${fmt(realTrend.peak.value)} ${unit}<br><small style="font-size:12px;font-weight:400;color:var(--color-muted)">${escapeHtml(realTrend.peak.label)}</small>`:"—")}</div>`;
    const note=realTrend.truncated?`<div class="table-hint" style="margin-top:6px">แสดงเฉพาะช่วงล่าสุดเพื่อให้อ่านง่าย — เลือกรายสัปดาห์/รายเดือนเพื่อดูช่วงที่ยาวขึ้น</div>`:"";
    const title=`${state.trendMetric==="users"?"ผู้ใช้ที่ใช้งาน":"จำนวน Login"}${per}`;
    return `${toolbar}${summary}${barChart(state.trendMetric==="users"?"ผู้ใช้ที่ใช้งาน":"Login",unit,realTrend.points,"แนวโน้ม"+title)}${note}`
  })():"";
  // Top Performer: ถ้ามี realStoreStats (จริง ต่อร้าน) ใช้ของจริงแทน mock — เหลือแค่ users/newUsers/engagement
  // เพราะเป็น metric เดียวที่มีข้อมูลจริงรองรับต่อร้าน (Repeat/NSC/รายได้ ไม่มีใน DB เลยตัดออก)
  const realTopMetrics={users:"ผู้ใช้ NearSip",newUsers:"ผู้ใช้ใหม่",engagement:"Engagement"};
  // เดิม: ร้านที่ไม่มีค่า newUsers (เลือก "ทั้งหมด") แสดง "—" แทน 0 ผ่าน newCell/valueCell — ไม่ต้องใช้แล้ว เพราะ "ทั้งหมด"
  // เทียบกับคืนนี้ (loadRealStoreStats ใส่ newUsersTonight ให้ทุกร้าน) newUsers จึงไม่เป็น null อีก คอมเมนต์ไว้เป็น fallback
  // const newCell=r=>r.newUsers===null?"—":fmt(r.newUsers);
  // const valueCell=r=>state.topMetric==="newUsers"?newCell(r):fmt(r.value);
  const useRealRank=realStoreStats.length>0;
  const rank=useRealRank
    ?{label:realTopMetrics[state.topMetric]||realTopMetrics.users,rows:realStoreStats.map(r=>({...r,value:{users:r.uniqueUsers,newUsers:r.newUsers??0,engagement:r.engagement}[state.topMetric]??r.uniqueUsers})).sort((a,b)=>b.value-a.value)}
    :rankingData(d,state.topMetric);
  const top=rank.rows[0],prov=provinceData(),topProvince=prov.slice().sort((a,b)=>b.growth-a.growth)[0];
  const topMetricOptions=useRealRank
    ?`<option value="users">ผู้ใช้ NearSip สูงสุด</option><option value="newUsers">ผู้ใช้ใหม่สูงสุด</option><option value="engagement">Engagement สูงสุด</option>`
    :`<option value="users">ผู้ใช้ NearSip สูงสุด</option><option value="engagement">Engagement สูงสุด</option><option value="engPerUser">Engagement ต่อผู้ใช้สูงสุด</option><option value="repeat">Repeat Rate สูงสุด</option><option value="newUsers">ผู้ใช้ใหม่สูงสุด</option><option value="nsc">NSC Usage สูงสุด</option><option value="nscPerUser">NSC Usage ต่อผู้ใช้สูงสุด</option><option value="revenue">รายได้สูงสุด</option>`;
  const topPerformerTable=useRealRank
    ?desktopAndMobileTable(["#","ร้าน",rank.label,"ผู้ใช้ NearSip","ผู้ใช้ใหม่","Engagement"],rank.rows.map((r,i)=>[i+1,r.venue,fmt(r.value),fmt(r.uniqueUsers),fmt(r.newUsers),fmt(r.engagement)]),rank.rows.map((r,i)=>mobileCard((i+1)+". "+r.venue,"",fmt(r.value),"",[["ผู้ใช้ NearSip",fmt(r.uniqueUsers)],["ผู้ใช้ใหม่",fmt(r.newUsers)],["Engagement",fmt(r.engagement)]])))
    :desktopAndMobileTable(["#","ร้าน","จังหวัด",rank.label,"ผู้ใช้","Engagement","Repeat","NSC","รายได้"],rank.rows.map((r,i)=>[i+1,r.venue,r.province,state.topMetric==="revenue"?money(r.value):state.topMetric.includes("Per")||state.topMetric==="repeat"?r.value.toFixed(1):fmt(r.value),fmt(r.unique),fmt(r.engagement),(r.repeat30/r.unique*100).toFixed(1)+"%",fmt(r.nscConsumed),money(r.rev)]),rank.rows.map((r,i)=>mobileCard((i+1)+". "+r.venue,r.province,state.topMetric==="revenue"?money(r.value):state.topMetric.includes("Per")||state.topMetric==="repeat"?r.value.toFixed(1):fmt(r.value),"",[["ผู้ใช้",fmt(r.unique)],["Engagement",fmt(r.engagement)],["Repeat",(r.repeat30/r.unique*100).toFixed(1)+"%"],["NSC",fmt(r.nscConsumed)],["รายได้",money(r.rev)]])));
  return`${hero("Executive Overview","ภาพรวม NearSip ที่ CEO เข้าใจได้ภายในประมาณ 10 วินาที","Headline 6 KPI · Progressive Disclosure")}
  <div class="grid kpis">
    ${/* เดิม: ${kpi("ร้านพาร์ทเนอร์ทั้งหมด",fmt(d.partnerStores),"Scope ปัจจุบัน","ร้านพาร์ทเนอร์ในระบบ","neutral")} — คอมเมนต์ไว้เป็น fallback */""}
    ${realStores.length?kpi("ร้านพาร์ทเนอร์ทั้งหมด",fmt(realStores.length),"","ร้านพาร์ทเนอร์ในระบบ","neutral"):kpi("ร้านพาร์ทเนอร์ทั้งหมด",fmt(d.partnerStores),"Scope ปัจจุบัน","ร้านพาร์ทเนอร์ในระบบ","neutral")}
    ${/* เดิม: ${kpi("ผู้ใช้ NearSip แบบ Unique",fmt(d.unique),pct(change(d.unique,p.unique)),periodLabel(),"good")} — คอมเมนต์ไว้เป็น fallback */""}
    ${realUserStats?kpi("ผู้ใช้ NearSip ทั้งหมด",`<span class="live-unique-users">${fmt(realUserStats.uniqueUsers)}</span>`,"","ทั้งหมด (all-time)","neutral"):kpi("ผู้ใช้ NearSip แบบ Unique",fmt(d.unique),pct(change(d.unique,p.unique)),periodLabel(),"good")}
    ${/* เดิม: ${kpi("ผู้ใช้ใหม่",fmt(d.newUsers),pct(change(d.newUsers,p.newUsers)),periodLabel(),"good")} — คอมเมนต์ไว้เป็น fallback */""}
    ${realUserStats?realNewUsersKpi("ผู้ใช้ใหม่"):kpi("ผู้ใช้ใหม่",fmt(d.newUsers),pct(change(d.newUsers,p.newUsers)),periodLabel(),"good")}
    ${/* เดิม 3 บรรทัดนี้เป็น mock ทั้งหมด — คอมเมนต์ไว้เป็น fallback
    ${kpi("ผู้ใช้เดิม",fmt(d.existing),pct(change(d.existing,p.existing)),periodLabel(),"good")}
    ${kpi("Engagement Rate รวม",d.engagementRate.toFixed(1)+"%",pp(d.engagementRate-p.engagementRate),"Engaged users / Unique users","good")}
    ${kpi("รายได้ที่รับรู้ทั้งหมด",money(d.recognizedRevenue),pct(change(d.recognizedRevenue,p.recognizedRevenue)),periodLabel(),"good")}
    */""}
    ${realUserStats?realExistingUsersKpi("ผู้ใช้เดิม"):kpi("ผู้ใช้เดิม",fmt(d.existing),pct(change(d.existing,p.existing)),periodLabel(),"good")}
    ${realUserStats?kpi("Engagement Rate รวม",realUserStats.engagementRate.toFixed(1)+"%","","Engaged users / Unique users (cheers)","neutral"):kpi("Engagement Rate รวม",d.engagementRate.toFixed(1)+"%",pp(d.engagementRate-p.engagementRate),"Engaged users / Unique users","good")}
    ${kpi("รายได้ที่รับรู้ทั้งหมด","—","ไม่มีข้อมูลนี้ใน DB","ไม่มี table รายได้/NSC ในระบบ","neutral")}
  </div>
  <div class="grid two">
    ${card("แนวโน้มภาพรวม",emptyRealTrend?"จาก login_log จริง — ยังไม่มีข้อมูล Login ใน Scope นี้":useRealTrend?`จาก login_log จริง (all-time) · ${TREND_GRAN_LABEL[realTrend.granularity]} · รอบคืนธุรกิจตัด 06:00 น.`:/* เดิม: "สลับระหว่างผู้ใช้ NearSip และรายได้ที่รับรู้" — คอมเมนต์ไว้ เพราะรายได้ยังไม่มีข้อมูลจริงใน DB เลย ซ่อน option ออกจาก dropdown ด้านล่างแล้วตามที่ขอ */"แนวโน้มผู้ใช้ NearSip",`${/* ข้อมูลจริง: ใช้ปุ่มเลือก Metric/ช่วงใน trendBlock แทน dropdown นี้ (มีตัวเลือกเดียวอยู่แล้ว) */(useRealTrend||emptyRealTrend)?"":`<div class="metric-toolbar"><div class="field"><label for="execTrendSelect">Metric</label><select id="execTrendSelect"><option value="users">ผู้ใช้ NearSip</option><!-- เดิม: <option value="revenue">รายได้ที่รับรู้</option> — คอมเมนต์ไว้ เพราะรายได้ยังไม่มีข้อมูลจริงใน DB เลย ไม่ต้องให้เลือกได้ --></select></div></div>`}${emptyRealTrend?`<div class="empty-state"><h3>ยังไม่มีข้อมูล Login</h3><p>${scopeName()} ยังไม่มีการ Login ในระบบ กราฟจะแสดงเมื่อมีข้อมูล (ไม่แสดงตัวเลขตัวอย่างแทน)</p></div>`:useRealTrend?trendBlock:lineChart([{name:periodLabel(),values:current},{name:compareLabel(),values:prior}],labels,state.execTrend==="users"?"แนวโน้มผู้ใช้ NearSip":"แนวโน้มรายได้ที่รับรู้",state.execTrend==="users"?"คน":"บาท")}`)}
    ${card("Summary ที่โดดเด่น","แสดงเฉพาะประเด็นจาก Approved Requirements",`<div class="stat-list">${/* ร้านจริง: ไม่มีข้อมูลจังหวัดผูกร้าน จึงไม่แสดง "จังหวัดเติบโตสูงสุด" (เดิมเป็นค่า mock จาก provinceData()) และ "ร้านออนไลน์คืนนี้ X จาก Y" (mock จาก rowData()) ใช้จำนวนร้าน ACTIVE จริงแทน */realStores.length?"":`<div class="stat"><b>จังหวัดเติบโตสูงสุด</b><p>${topProvince.province} · ${pct(topProvince.growth)}</p></div>`}<div class="stat"><b>ร้านอันดับหนึ่งตาม ${rank.label}</b><p>${top.venue} · ${state.topMetric==="revenue"?money(top.value):state.topMetric.includes("Per")||state.topMetric==="repeat"?top.value.toFixed(1):fmt(top.value)}</p></div>${realStores.length?`<div class="stat"><b>ร้านพาร์ทเนอร์ที่ ACTIVE</b><p>${fmt(realStores.length)} ร้าน (ยังไม่มี presence tracking รายร้าน)</p></div>`:`<div class="stat"><b>ร้านออนไลน์คืนนี้</b><p>${fmt(d.onlineTonight)} จาก ${fmt(d.partnerStores)} ร้านใน Scope</p></div>`}</div>`)}
  </div>
  ${/* Top Performer: ใช้ realStoreStats (จาก /api/user-stats วนต่อร้าน) เมื่อมีร้านจริง — เหลือแค่ users/
     newUsers/engagement เพราะเป็น metric เดียวที่ DB รองรับต่อร้านจริง ตัด Repeat/NSC/รายได้ออกเพราะไม่มี
     table ให้ query เลย ถ้ายังไม่มีร้านจริง (ยังโหลดไม่เสร็จ/โหลดไม่สำเร็จ) fallback กลับไปใช้ mock เหมือนเดิม */""}
  ${card("Top Performer",useRealRank?"Ranking table ต่อร้าน — Repeat/NSC/รายได้ไม่มีข้อมูลจริงรองรับเลยไม่แสดง":"Ranking table เดียว เปลี่ยน Metric ได้ (ยังเป็น mock — ยังไม่มีร้านจริงให้ดึงข้อมูล)",`<div class="metric-toolbar"><div class="field"><label for="topMetricSelect">จัดอันดับตาม</label><select id="topMetricSelect">${topMetricOptions}</select></div></div>${topPerformerTable}`)}
  ${/* เดิม: การ์ด "Feed จากระบบจริง" ดึงจาก /api/feed ตรงๆ — คอมเมนต์ออกตามที่ขอ
  realFeed.length?card("Feed จากระบบจริง","ดึงจาก /api/feed ตรงๆ (ไม่ใช่ mock)",`<div class="stat-list">${realFeed.map(f=>`<div class="stat"><b>${f.imageTitleText||(f.feedType==="Global"?"ประกาศทั่วไป":"ประกาศร้าน "+f.storeId)}</b><p>${f.description||""}</p></div>`).join("")}</div>`):""
  */""}
  `
}
function partnersPage(d,p){
  const prov=provinceData(),metricLabels={users:"ผู้ใช้ NearSip",growth:"Growth",engagement:"Engagement",nsc:"NSC Purchased",revenue:"รายได้",revPerActive:"Revenue / Active Venue"};
  const sorted=prov.map(x=>({...x,value:{users:x.unique,growth:x.growth,engagement:x.engagement,nsc:x.nscPurchased,revenue:x.revenue,revPerActive:x.revPerActive}[state.provinceMetric]})).sort((a,b)=>b.value-a.value);
  const rank=rankingData(d,state.topMetric);
  return`${hero("Partners & Geography","ร้านพาร์ทเนอร์ จังหวัด และการเปรียบเทียบเชิงพื้นที่","Province users = ผู้ใช้ NearSip ในร้านพาร์ทเนอร์")}
  <div class="grid kpis">
    ${/* เดิม: ${kpi("ร้านพาร์ทเนอร์ทั้งหมด",fmt(d.partnerStores),"Scope ปัจจุบัน","ร้านพาร์ทเนอร์เท่านั้น","neutral")} — คอมเมนต์ไว้เป็น fallback */""}
    ${realStores.length?kpi("ร้านพาร์ทเนอร์ทั้งหมด",fmt(realStores.length),"","ร้านพาร์ทเนอร์เท่านั้น","neutral"):kpi("ร้านพาร์ทเนอร์ทั้งหมด",fmt(d.partnerStores),"Scope ปัจจุบัน","ร้านพาร์ทเนอร์เท่านั้น","neutral")}
    ${/* เดิม 4 บรรทัดนี้เป็น mock ทั้งหมด — คอมเมนต์ไว้เป็น fallback
    ${kpi("ร้านออนไลน์อยู่ในคืนนี้",fmt(d.onlineTonight),pct(change(d.onlineTonight,p.onlineTonight)),"Online in current Business Night","good")}
    ${kpi("ร้านใหม่ที่เพิ่มเข้ามา",fmt(d.newPartner),pct(change(d.newPartner,p.newPartner)),periodLabel(),"good")}
    ${kpi("ผู้ใช้ NearSip ใน Scope",fmt(d.unique),pct(change(d.unique,p.unique)),"ไม่ใช่ Total Footfall","good")}
    ${kpi("ผู้ใช้เฉลี่ยต่อร้าน",fmt(d.unique/Math.max(1,d.partnerStores)),pct(change(d.unique/d.partnerStores,p.unique/p.partnerStores)),periodLabel(),"good")}
    */""}
    ${realStores.length?kpi("ร้านออนไลน์อยู่ในคืนนี้",fmt(realStores.length),"","ไม่มี presence tracking จริง ใช้ยอด ACTIVE ทั้งหมดแทน","neutral"):kpi("ร้านออนไลน์อยู่ในคืนนี้",fmt(d.onlineTonight),pct(change(d.onlineTonight,p.onlineTonight)),"Online in current Business Night","good")}
    ${realUserStats?kpi("ร้านใหม่ที่เพิ่มเข้ามา",fmt(realUserStats.newStores),"",periodLabel()+" (โดยประมาณ)","neutral"):kpi("ร้านใหม่ที่เพิ่มเข้ามา",fmt(d.newPartner),pct(change(d.newPartner,p.newPartner)),periodLabel(),"good")}
    ${realUserStats?kpi("ผู้ใช้ NearSip ใน Scope",`<span class="live-unique-users">${fmt(realUserStats.uniqueUsers)}</span>`,"","all-time (ไม่ใช่ Total Footfall)","neutral"):kpi("ผู้ใช้ NearSip ใน Scope",fmt(d.unique),pct(change(d.unique,p.unique)),"ไม่ใช่ Total Footfall","good")}
    ${realUserStats&&realStores.length?kpi("ผู้ใช้เฉลี่ยต่อร้าน",fmt(realUserStats.uniqueUsers/realStores.length),"","ผู้ใช้ทั้งหมด / ร้าน ACTIVE ทั้งหมด","neutral"):kpi("ผู้ใช้เฉลี่ยต่อร้าน",fmt(d.unique/Math.max(1,d.partnerStores)),pct(change(d.unique/d.partnerStores,p.unique/p.partnerStores)),periodLabel(),"good")}
    ${kpi("Revenue / Active Venue","—","","ไม่มี table รายได้ในระบบ","neutral")}
  </div>
  <div class="grid two-even">
    ${/* ร้านจริง (backend set-location) มีแค่ storeId/name/lat/lng/status ไม่มีฟิลด์จังหวัดผูกร้านเลย
       พอมีร้านจริงแล้วเลยเว้นว่างไว้แทนการโชว์ตัวเลข mock (ตามที่ขอ) */""}
    ${realStores.length
      ?card("จำนวนร้านแยกตามจังหวัด","ไม่มีข้อมูลจริง — ร้านจริงไม่มีฟิลด์จังหวัด (มีแค่ lat/lng)",`<div class="k-value">—</div>`)
      :card("จำนวนร้านแยกตามจังหวัด","Bar chart อ่านการเปรียบเทียบได้ตรงกว่า Map (ยังเป็น mock — DB ไม่มีฟิลด์จังหวัดผูกร้าน)",barRows(prov.map(x=>[x.province,x.stores,fmt(x.stores)])))}
    ${realUserStats?card("User Profile","เพศและอายุของผู้ใช้ทั้งหมด (all-time — ไม่แยกรายจังหวัดเพราะ DB ไม่มีข้อมูลนี้)",`<h4 style="margin:0 0 8px">สัดส่วนเพศ</h4>${stacked([["ชาย",realUserStats.genderBreakdown.male],["หญิง",realUserStats.genderBreakdown.female],["LGBTQ",realUserStats.genderBreakdown.lgbtq]],realUserStats.uniqueUsers)}<h4 style="margin:18px 0 8px">ช่วงอายุ</h4>${barRows([["20–30",realUserStats.ageBreakdown.a20,fmt(realUserStats.ageBreakdown.a20)],["31–40",realUserStats.ageBreakdown.a31,fmt(realUserStats.ageBreakdown.a31)],["41–50",realUserStats.ageBreakdown.a41,fmt(realUserStats.ageBreakdown.a41)],["51–60",realUserStats.ageBreakdown.a51,fmt(realUserStats.ageBreakdown.a51)],["61–70",realUserStats.ageBreakdown.a61,fmt(realUserStats.ageBreakdown.a61)]])}`):card("Province Profile","เพศ อายุ และ Interaction ของ Scope จังหวัด",`<h4 style="margin:0 0 8px">สัดส่วนเพศ</h4>${stacked([["ชาย",d.male],["หญิง",d.female],["LGBTQ",d.lgbtq]],d.unique)}<h4 style="margin:18px 0 8px">ช่วงอายุ</h4>${barRows([["20–30",d.a20,fmt(d.a20)],["31–40",d.a31,fmt(d.a31)],["41–50",d.a41,fmt(d.a41)],["51–60",d.a51,fmt(d.a51)],["61–70",d.a61,fmt(d.a61)]])}`)}
  </div>
  ${realStores.length
    ?card("Province Comparison","ไม่มีข้อมูลจริง — ร้านจริงไม่มีฟิลด์จังหวัด จัดอันดับรายจังหวัดไม่ได้",`<div class="k-value">—</div>`)
    :card("Province Comparison","ตารางเดียว เปลี่ยน Metric ที่ใช้จัดอันดับ (ยังเป็น mock — DB ไม่มีฟิลด์จังหวัด)",`<div class="metric-toolbar"><div class="field"><label for="provinceMetricSelect">จัดอันดับจังหวัดตาม</label><select id="provinceMetricSelect"><option value="users">ผู้ใช้ NearSip</option><option value="growth">Growth</option><option value="engagement">Engagement</option><option value="nsc">NSC Purchased</option><option value="revenue">รายได้</option><option value="revPerActive">Revenue / Active Venue</option></select></div></div>${desktopAndMobileTable(["#","จังหวัด","ร้าน","Unique Users","ผู้ใช้ใหม่","ผู้ใช้เดิม","Engagement","NSC Purchased","รายได้","Revenue / Active Venue"],sorted.map((x,i)=>[i+1,x.province,x.stores,fmt(x.unique),fmt(x.newUsers),fmt(x.existing),fmt(x.engagement),fmt(x.nscPurchased),money(x.revenue),money(x.revPerActive)]),sorted.map((x,i)=>mobileCard((i+1)+". "+x.province,x.stores+" ร้าน",state.provinceMetric==="revenue"||state.provinceMetric==="revPerActive"?money(x.value):state.provinceMetric==="growth"?pct(x.value):fmt(x.value),"",[["Unique Users",fmt(x.unique)],["ผู้ใช้ใหม่",fmt(x.newUsers)],["Engagement",fmt(x.engagement)],["NSC Purchased",fmt(x.nscPurchased)],["รายได้",money(x.revenue)]])))}`)}
  <div class="grid two-even" style="margin-top:14px">
    ${/* ใช้ realStoreStats (จาก /api/user-stats วนต่อร้าน) เมื่อมีร้านจริง เหมือน Top Performer ใน execPage() —
       มีแค่ users/engagement เพราะเป็น metric เดียวที่ DB รองรับต่อร้านจริง ส่วนจังหวัด/Repeat/NSC/รายได้
       ไม่มีข้อมูลจริงรองรับเลยเว้นว่างไว้ (ตามที่ขอ) ไม่มีร้านจริงเลย fallback กลับไปใช้ mock เหมือนเดิม */""}
    ${realStoreStats.length
      ?card("ร้านใน Scope","ต่อร้าน — จังหวัด/Repeat/NSC/รายได้ไม่มีข้อมูลจริงรองรับเลยเว้นว่างไว้",desktopAndMobileTable(["ร้าน","จังหวัด","Users","Engagement","Repeat","NSC","รายได้"],realStoreStats.map(r=>[r.venue,"—",fmt(r.uniqueUsers),fmt(r.engagement),"—","—","—"]),realStoreStats.map(r=>mobileCard(r.venue,"",fmt(r.uniqueUsers)+" users","",[["Engagement",fmt(r.engagement)],["Repeat","—"],["NSC","—"],["รายได้","—"]]))))
      :card("ร้านใน Scope","เมื่อ Scope เป็นจังหวัดหรือร้าน ตารางจะลดตาม Scope โดยอัตโนมัติ (ยังเป็น mock — ยังไม่มีร้านจริงให้ดึงข้อมูล)",desktopAndMobileTable(["ร้าน","จังหวัด","Users","Engagement","Repeat","NSC","รายได้"],rank.rows.map(r=>[r.venue,r.province,fmt(r.unique),fmt(r.engagement),(r.repeat30/r.unique*100).toFixed(1)+"%",fmt(r.nscConsumed),money(r.rev)]),rank.rows.map(r=>mobileCard(r.venue,r.province,fmt(r.unique)+" users","",[["Engagement",fmt(r.engagement)],["Repeat",(r.repeat30/r.unique*100).toFixed(1)+"%"],["NSC",fmt(r.nscConsumed)],["รายได้",money(r.rev)]]))))}
    ${realStores.length
      ?card("แนวโน้มจังหวัด","ไม่มีข้อมูลจริง — ร้านจริงไม่มีฟิลด์จังหวัด แยกแนวโน้มรายจังหวัดไม่ได้",`<div class="k-value">—</div>`)
      :card("แนวโน้มจังหวัด","รายวัน รายสัปดาห์ และรายเดือน ใช้กราฟเดียวแบบสรุป (ยังเป็น mock — ไม่มี timestamp รายวันที่ใช้ได้จริงพอ)",lineChart([{name:"รายวัน",values:timeSeries(d.unique,7,"pd")},{name:"รายสัปดาห์",values:timeSeries(d.unique*.8,7,"pw")}],["จ","อ","พ","พฤ","ศ","ส","อา"],"แนวโน้มผู้ใช้ NearSip ในร้านพาร์ทเนอร์ของจังหวัด","คน"))}
  </div>`
}
function usersPage(d,p){
  const genders=[["ชาย",d.male],["หญิง",d.female],["LGBTQ",d.lgbtq]],ages=[["20–30",d.a20],["31–40",d.a31],["41–50",d.a41],["51–60",d.a51],["61–70",d.a61]];
  const segmentMap={frequent:"มาบ่อยที่สุด",engagement:"Engagement สูงสุด",repeat:"Repeat สูงสุด",nsc:"NSC Usage สูงสุด"};
  const g=genders[hash(scopeName()+state.segmentMetric)%3][0],a=ages[hash(scopeName()+"age"+state.segmentMetric)%5][0];
  const vf=realUserStats?visitFrequency(realUserStats.loginLogs):null;
  return`${hero("Users & Demographics","ผู้ใช้ NearSip, Visit Frequency, Demographic, Login และ Device","เพศ 3 กลุ่ม: ชาย / หญิง / LGBTQ")}
  <div class="grid kpis">
    ${/* เดิม 5 บรรทัดนี้เป็น mock ทั้งหมด — คอมเมนต์ไว้เป็น fallback
    ${kpi("ผู้ใช้ Unique",fmt(d.unique),pct(change(d.unique,p.unique)),periodLabel(),"good")}
    ${kpi("ผู้ใช้ใหม่",fmt(d.newUsers),pct(change(d.newUsers,p.newUsers)),periodLabel(),"good")}
    ${kpi("ผู้ใช้เดิม",fmt(d.existing),pct(change(d.existing,p.existing)),periodLabel(),"good")}
    ${kpi("กลับมาร้านเดิม",fmt(d.sameVenue),pct(change(d.sameVenue,p.sameVenue)),"Same-venue return","good")}
    ${kpi("กลับมา NearSip แต่เปลี่ยนร้าน",fmt(d.crossVenue),pct(change(d.crossVenue,p.crossVenue)),"Cross-venue return","good")}
    */""}
    ${realUserStats?kpi("ผู้ใช้ Unique",`<span class="live-unique-users">${fmt(realUserStats.uniqueUsers)}</span>`,"","all-time","neutral"):kpi("ผู้ใช้ Unique",fmt(d.unique),pct(change(d.unique,p.unique)),periodLabel(),"good")}
    ${realUserStats?realNewUsersKpi("ผู้ใช้ใหม่"):kpi("ผู้ใช้ใหม่",fmt(d.newUsers),pct(change(d.newUsers,p.newUsers)),periodLabel(),"good")}
    ${realUserStats?realExistingUsersKpi("ผู้ใช้เดิม"):kpi("ผู้ใช้เดิม",fmt(d.existing),pct(change(d.existing,p.existing)),periodLabel(),"good")}
    ${kpi("กลับมาร้านเดิม","—","","ไม่มี tracking การเข้าร้านแยกรายครั้ง","neutral")}
    ${kpi("กลับมา NearSip แต่เปลี่ยนร้าน","—","","มีร้านจริงแค่ 1 ร้าน วัด cross-venue ไม่ได้","neutral")}
  </div>
  <div class="grid two-even">
    ${/* เดิม: Visit Frequency mock — คอมเมนต์ไว้เป็น fallback
    ${card("Visit Frequency","แสดง 1 ครั้งและ 4 ครั้งขึ้นไปเป็น Headline พร้อมรายละเอียด 2–3 ครั้ง",barRows([["1 ครั้ง",d.oneTime,fmt(d.oneTime)],["2 ครั้ง",d.twoTimes,fmt(d.twoTimes)],["3 ครั้ง",d.threeTimes,fmt(d.threeTimes)],["4 ครั้งขึ้นไป",d.fourPlus,fmt(d.fourPlus)]]))}
    */""}
    ${vf?card("Visit Frequency","จาก login_log จริง (นับจำนวนครั้ง login ต่อคน, all-time)",barRows([["1 ครั้ง",vf.one,fmt(vf.one)],["2 ครั้ง",vf.two,fmt(vf.two)],["3 ครั้ง",vf.three,fmt(vf.three)],["4 ครั้งขึ้นไป",vf.fourPlus,fmt(vf.fourPlus)]])):card("Visit Frequency","แสดง 1 ครั้งและ 4 ครั้งขึ้นไปเป็น Headline พร้อมรายละเอียด 2–3 ครั้ง",barRows([["1 ครั้ง",d.oneTime,fmt(d.oneTime)],["2 ครั้ง",d.twoTimes,fmt(d.twoTimes)],["3 ครั้ง",d.threeTimes,fmt(d.threeTimes)],["4 ครั้งขึ้นไป",d.fourPlus,fmt(d.fourPlus)]]))}
    ${/* เดิม (mock — สุ่มจาก hash(scopeName()) คอมเมนต์ไว้เป็น fallback ไม่ลบ):
    ${card("Segment Insight","ใช้ Selector แทนการแสดงทุก Segment พร้อมกัน (ยังเป็น mock)",`<div class="metric-toolbar"><div class="field"><label for="segmentSelect">กลุ่มที่ต้องการดู</label><select id="segmentSelect"><option value="frequent">มาบ่อยที่สุด</option><option value="engagement">Engagement สูงสุด</option><option value="repeat">Repeat สูงสุด</option><option value="nsc">NSC Usage สูงสุด</option></select></div></div><div class="stat" style="margin-top:14px"><b>${segmentMap[state.segmentMetric]}</b><p>${g} · อายุ ${a}</p></div>`)}
    */""}
    ${card("Segment Insight","ไม่มีข้อมูลจริง — DB ไม่มีข้อมูลแบ่งกลุ่มผู้ใช้ตามพฤติกรรม (มาบ่อย/Repeat/NSC)",`<div class="k-value">—</div>`)}
  </div>
  <div class="grid two-even">
    ${realUserStats?card("สัดส่วนเพศ","ชาย / หญิง / LGBTQ (all-time)",stacked([["ชาย",realUserStats.genderBreakdown.male],["หญิง",realUserStats.genderBreakdown.female],["LGBTQ",realUserStats.genderBreakdown.lgbtq]],realUserStats.uniqueUsers)):card("สัดส่วนเพศ","ชาย / หญิง / LGBTQ",stacked(genders,d.unique))}
    ${realUserStats?card("ช่วงอายุ","20–30 / 31–40 / 41–50 / 51–60 / 61–70 (all-time)",barRows([["20–30",realUserStats.ageBreakdown.a20,fmt(realUserStats.ageBreakdown.a20)],["31–40",realUserStats.ageBreakdown.a31,fmt(realUserStats.ageBreakdown.a31)],["41–50",realUserStats.ageBreakdown.a41,fmt(realUserStats.ageBreakdown.a41)],["51–60",realUserStats.ageBreakdown.a51,fmt(realUserStats.ageBreakdown.a51)],["61–70",realUserStats.ageBreakdown.a61,fmt(realUserStats.ageBreakdown.a61)]])):card("ช่วงอายุ","20–30 / 31–40 / 41–50 / 51–60 / 61–70",barRows(ages.map(x=>[x[0],x[1],fmt(x[1])])))}
  </div>
  <div class="grid two-even">
    ${/* เดิม: ไม่มีข้อมูลนี้ — คอมเมนต์ไว้เป็น fallback
    ${card("ช่องทาง Login","ไม่มีข้อมูลนี้ใน DB — account.type มีแค่ค่า 'credentials' ค่าเดียว ไม่แยก LINE",`<div class="k-value">—</div>`)}
    */""}
    ${realUserStats?card("ช่องทาง Login","LINE และ Email — ประมาณจาก user.email (LINE ไม่บังคับมี email, credentials ต้องมี)",stacked([["LINE",realUserStats.loginChannel.line],["Email",realUserStats.loginChannel.email]],realUserStats.uniqueUsers)):card("ช่องทาง Login","ไม่มีข้อมูลนี้ใน DB — account.type มีแค่ค่า 'credentials' ค่าเดียว ไม่แยก LINE",`<div class="k-value">—</div>`)}
    ${card("ระบบอุปกรณ์","ไม่มีข้อมูลนี้ใน DB — ไม่มีคอลัมน์เก็บชนิดอุปกรณ์",`<div class="k-value">—</div>`)}
  </div>`
}
// engagementPage() เดิม (ผสม mock + ข้อมูลจริง) ถูกแทนที่ด้วย renderEngagementPage() ใน lib/dashboard/pages/engagement-page.ts
// label ช่วงเวลาของทั้งคืนธุรกิจ 18:00–05:59 (ข้ามเที่ยงคืนเป็น 00:00) ใช้ร่วมกันใน timePage() และ realtimePage()
function nightLabels(granularity){
  const points=granularity==="15m"?48:granularity==="30m"?24:12;
  const hourLabel=h=>String((18+h)%24).padStart(2,"0");
  return Array.from({length:points},(_,i)=>granularity==="15m"?`${hourLabel(Math.floor(i/4))}:${String((i%4)*15).padStart(2,"0")}`:granularity==="30m"?`${hourLabel(Math.floor(i/2))}:${i%2?"30":"00"}`:`${hourLabel(i)}:00`)
}
function timePage(d,p,realtime=false){
  // Business Night = 18:00–06:00 (wrap เที่ยงคืน) — เดิมมีแค่ 18:00–23:30 (30m) / 18:00–25:00 (1h) — ย้ายการสร้าง label ไป nightLabels() ใช้ร่วมกับ realtimePage()
  // (เดิมเขียนในนี้ตรงๆ: const points=...?48:...?24:12; const hourLabel=...; const labels=Array.from({length:points},...) — ผลลัพธ์เหมือนเดิมทุกอย่าง)
  const labels=nightLabels(state.granularity),points=labels.length;
  const totals={users:realtime?d.activeNow*5:d.unique,cheers:realtime?d.activeNow*8:d.cheersSent,match:realtime?d.activeNow*2:d.matches,chat:realtime?d.activeChatsNow*4:d.chats,nsc:realtime?d.activeNow*20:d.nscConsumed,topup:realtime?d.activeNow*25:d.nscPurchased};
  const metrics={users:"ผู้ใช้ NearSip",cheers:"Cheers",match:"Match",chat:"Chat",nsc:"NSC Usage",topup:"Top-up"};
  // เดิม: current/compare/peakMetric จาก timeSeries() mock ทั้งหมด — คอมเมนต์ไว้เป็น fallback
  // const current=timeSeries(totals[state.timeMetric],points,"time-"+state.timeMetric),compare=current.map((x,i)=>Math.round(x*(.82+(i%3)*.05)));
  // const peakMetric=(m)=>{const arr=timeSeries(totals[m],points,"peak-"+m);return labels[arr.indexOf(Math.max(...arr))]};
  // realSeries: bucket จริงจาก login_log (users) / cheers.create_at / chats.create_at
  const realSeries=realUserStats?{
    users:bucketCounts(realUserStats.loginLogs.map(l=>l.createAt),labels,state.granularity),
    cheers:bucketCounts(realUserStats.activityTimestamps.cheersTimes,labels,state.granularity),
    chat:bucketCounts(realUserStats.activityTimestamps.chatsTimes,labels,state.granularity),
    match:labels.map(()=>0),nsc:labels.map(()=>0),topup:labels.map(()=>0),
  }:null;
  const current=realSeries?realSeries[state.timeMetric]:timeSeries(totals[state.timeMetric],points,"time-"+state.timeMetric);
  const compare=realSeries?labels.map(()=>0):current.map((x,i)=>Math.round(x*(.82+(i%3)*.05)));
  // กรองตาม Business Night ที่เลือก (state.businessNight) เฉพาะหน้านี้ — เหลือ 2 ช่วง: 18:00–00:00 และ 00:00–06:00
  // ตัดเฉพาะ bucket ที่ชั่วโมงของ label อยู่ในช่วงที่เลือก ("ทั้งหมด" = ไม่กรอง 18:00–06:00)
  // เดิม: option รายชั่วโมง 18:00–19:00 … 04:00–05:00 + nightFilterUnavailable (ช่วงที่ไม่มี bucket รองรับ) — label ครอบคลุมทั้งคืนแล้วจึงไม่เกิดกรณีนี้
  const nightHourRange={"18:00–00:00":[18,24],"00:00–06:00":[0,6]}[state.businessNight];
  const nightSlice=arr=>nightHourRange?arr.filter((_,i)=>{const h=parseInt(labels[i],10);return h>=nightHourRange[0]&&h<nightHourRange[1]}):arr;
  const viewLabels=nightSlice(labels),viewCurrent=nightSlice(current),viewCompare=nightSlice(compare);
  const peakMetric=(m)=>{
    if(realSeries){const arr=nightSlice(realSeries[m]),max=Math.max(...arr);return max>0?viewLabels[arr.indexOf(max)]:"—"}
    const arr=nightSlice(timeSeries(totals[m],points,"peak-"+m));return viewLabels[arr.indexOf(Math.max(...arr))]
  };
  return`${hero(realtime?"Tonight Timeline & Peak":"Time & Night Pattern",realSeries?"(login_log/cheers/chats) — Match/NSC/Top-up ไม่มี table ใน DB จึงเป็น 0 เสมอ":"กราฟ Timeline เดียว เปลี่ยน Metric และ Granularity ได้",realtime?"Mock Real-time Data":state.businessNight)}
  <div class="grid kpis">
    ${kpi("Peak Users Time",peakMetric("users"),realSeries?"(login_log)":"ช่วงเวลาสูงสุด","Business Night","neutral")}
    ${kpi("Peak Cheers Time",peakMetric("cheers"),realSeries?"":"ช่วงเวลาสูงสุด","Business Night","neutral")}
    ${kpi("Peak Match Time",peakMetric("match"),realSeries?"":"ช่วงเวลาสูงสุด","Business Night","neutral")}
    ${kpi("Peak NSC Usage Time",peakMetric("nsc"),realSeries?"":"ช่วงเวลาสูงสุด","Business Night","neutral")}
    ${kpi("Peak Top-up Time",peakMetric("topup"),realSeries?"":"ช่วงเวลาสูงสุด","Business Night","neutral")}
  </div>
  ${/* Timeline card — คอมเมนต์ไว้ก่อนตามที่ขอ (กราฟดูไม่มีความหมาย ตัวเลขกระโดด 0-1-2 แบบสุ่ม เส้น "ปีก่อน"
  แบนที่ 0 ตลอด) ไม่ลบโค้ดเดิม เก็บไว้เผื่อกลับมาเปิดทีหลัง
  (()=>{
    const toolbar=`<div class="metric-toolbar"><div class="field"><label for="timeMetricSelect">Metric</label><select id="timeMetricSelect"><option value="users">ผู้ใช้ NearSip</option><option value="cheers">Cheers</option><option value="match">Match</option><option value="chat">Chat</option><option value="nsc">NSC Usage</option><option value="topup">Top-up</option></select></div><div class="seg"><button data-gran="15m" class="${state.granularity==="15m"?"active":""}">15 นาที</button><button data-gran="30m" class="${state.granularity==="30m"?"active":""}">30 นาที</button><button data-gran="1h" class="${state.granularity==="1h"?"active":""}">1 ชั่วโมง</button></div></div>`;
    return card("Timeline","Metric selector และ Time granularity",`${toolbar}${lineChart([{name:realtime?"คืนนี้":periodLabel(),values:viewCurrent},{name:realtime?"คืนเทียบเคียง":compareLabel(),values:viewCompare}],viewLabels,metrics[state.timeMetric]+" ตามเวลา",state.timeMetric==="nsc"||state.timeMetric==="topup"?"NSC":"จำนวน")}`)
  })()
  */""}
  <div class="grid two-even" style="margin-top:14px">
    ${/* เดิม: heatmap สุ่มจาก hash() mock — คอมเมนต์ไว้เป็น fallback
    ${card("รูปแบบเวลาในแต่ละวันของสัปดาห์","Heatmap สรุป ไม่เพิ่มกราฟแยกทุกวัน",`<div class="heatmap-wrap">...`)}
    */""}
    ${realUserStats?(()=>{const hm=loginHeatmap(realUserStats.loginLogs);return card("รูปแบบเวลาในแต่ละวันของสัปดาห์","จาก login_log จริง (all-time)",`<div class="heatmap-wrap"><div class="heatmap"><div class="h">เวลา</div>${["จ","อ","พ","พฤ","ศ","ส","อา"].map(x=>`<div class="h">${x}</div>`).join("")}${["18–20","20–22","22–00","00–02"].map((t,ti)=>`<div class="r">${t}</div>${[0,1,2,3,4,5,6].map(di=>{const v=hm[di][ti];return`<div class="${v>=4?"c4":v>=3?"c3":v>=1?"c2":"c1"}">${v}</div>`}).join("")}`).join("")}</div></div>`)})():card("รูปแบบเวลาในแต่ละวันของสัปดาห์","Heatmap สรุป ไม่เพิ่มกราฟแยกทุกวัน",`<div class="heatmap-wrap"><div class="heatmap"><div class="h">เวลา</div>${["จ","อ","พ","พฤ","ศ","ส","อา"].map(x=>`<div class="h">${x}</div>`).join("")}${["18–20","20–22","22–00","00–02"].map((t,ri)=>`<div class="r">${t}</div>${[0,1,2,3,4,5,6].map(di=>{const v=45+hash(t+di+scopeName())%50;return`<div class="${v>80?"c4":v>68?"c3":v>55?"c2":"c1"}">${v}</div>`}).join("")}`).join("")}</div></div>`)}
    ${/* Peak Comparison: ร้าน จังหวัด และประเทศ ยังเป็น mock — มีร้านจริงแค่ 1 ร้าน ไม่มีจังหวัดจริงให้เปรียบเทียบ — คอมเมนต์ไว้ก่อน
    ${card("Peak Comparison","ร้าน จังหวัด และประเทศ (ยังเป็น mock — มีร้านจริงแค่ 1 ร้าน ไม่มีจังหวัดจริงให้เปรียบเทียบ)",desktopAndMobileTable(["ระดับ","Peak Users","Peak Cheers","Peak Match","Peak NSC","Peak Top-up"],[["ร้าน","22:30","23:00","23:15","23:30","23:45"],["จังหวัด","22:45","23:15","23:30","23:45","00:00"],["ประเทศไทย","23:00","23:15","23:45","00:00","00:15"]],[mobileCard("ร้าน","Scope ระดับร้าน","22:30","",[["Cheers","23:00"],["Match","23:15"],["NSC","23:30"],["Top-up","23:45"]]),mobileCard("จังหวัด","Scope ระดับจังหวัด","22:45","",[["Cheers","23:15"],["Match","23:30"],["NSC","23:45"],["Top-up","00:00"]]),mobileCard("ประเทศไทย","Scope ระดับประเทศ","23:00","",[["Cheers","23:15"],["Match","23:45"],["NSC","00:00"],["Top-up","00:15"]])]))}
    */""}
  </div>`
}
function nscRevenuePage(d,p){
  let body="";
  if(state.nscTab==="nsc"){
    const topStore=rankingData(d,"nsc").rows[0],topProvince=provinceData().sort((a,b)=>b.nscConsumed-a.nscConsumed)[0],topFeature=["Premium Cheers","Spotlight Profile","VIP Match","Dashboard Insight"][hash(scopeName()+"feature")%4];
    body=`<div class="banner-note" style="margin-bottom:12px;padding:10px 14px;border-radius:8px">ไม่มี table เกี่ยวกับ NSC/เงินในระบบจริงเลย — KPI ด้านล่างจึงว่างไว้ ส่วนกราฟ/ตารางที่เหลือยังเป็น mock ตัวอย่างประกอบ</div>
    <div class="grid kpis">${kpi("NSC Purchased","—","","","neutral")}${kpi("รายการ Top-up","—","","","neutral")}${kpi("ผู้เติม NSC แบบ Unique","—","","","neutral")}${kpi("ผู้เติมซ้ำ","—","","","neutral")}${kpi("NSC Consumed","—","","","neutral")}${kpi("NSC Outstanding","—","","","neutral")}</div>
    <div class="grid two">${card("Purchased → Consumed → Outstanding","Stock-and-flow Visualization",`<div class="stock-flow"><div class="stock-box"><span>Purchased</span><b>${fmt(d.nscPurchased)}</b></div><div class="arrow">→</div><div class="stock-box"><span>Consumed</span><b>${fmt(d.nscConsumed)}</b></div><div class="arrow">→</div><div class="stock-box"><span>Outstanding</span><b>${fmt(d.outstanding)}</b></div></div><p style="margin-top:12px">NSC Transfer ไม่ถูกนำเสนอเป็นรายได้ใหม่</p>`)}${card("Additional NSC Metrics","รายละเอียดเปิดหลัง Headline",`<div class="table-wrap"><table><tbody><tr><td>ยอดเติมเฉลี่ยต่อรายการ</td><td>${fmt(d.avgTopup)} NSC</td></tr><tr><td>ยอดเติมเฉลี่ยต่อผู้เติม</td><td>${fmt(d.avgPerTopupper)} NSC</td></tr><tr><td>Credit Burn Rate</td><td>${d.burnRate.toFixed(1)}%</td></tr><tr><td>ผู้ถือ NSC แต่ยังไม่เคยใช้</td><td>${fmt(d.holdersNeverUsed)}</td></tr><tr><td>NSC / Active User</td><td>${d.nscPerActiveUser.toFixed(1)}</td></tr><tr><td>NSC / Active Venue</td><td>${fmt(d.nscPerVenue)}</td></tr><tr><td>Purchased / Consumed</td><td>${d.purchaseConsumedRatio.toFixed(2)}x</td></tr><tr><td>Transfer / Consumed</td><td>${d.transferConsumedRatio.toFixed(1)}%</td></tr><tr><td>เติมจนใช้ครั้งแรก</td><td>${d.firstUseHours.toFixed(1)} ชั่วโมง</td></tr></tbody></table></div>`)} </div>
    <div class="grid three">${card("NSC ใช้ปลดล็อก","นักเที่ยวและ Dashboard",barRows([["ฟีเจอร์นักเที่ยว",d.featureTourist,fmt(d.featureTourist)],["ข้อมูล Dashboard",d.dashboardUnlock,fmt(d.dashboardUnlock)],["Transfer",d.transfer,fmt(d.transfer)]]))}${card("ฟีเจอร์ใช้ NSC สูงสุด","Top feature",`<div class="k-value">${topFeature}</div>`)}${card("Top NSC Entity","ร้านและจังหวัด",`<div class="stat-list"><div class="stat"><b>ร้าน</b><p>${topStore.venue} · ${fmt(topStore.nscConsumed)} NSC</p></div><div class="stat"><b>จังหวัด</b><p>${topProvince.province} · ${fmt(topProvince.nscConsumed)} NSC</p></div></div>`)} </div>`;
  }else{
    const labels=state.revenueTrend==="daily"?["จ","อ","พ","พฤ","ศ","ส","อา"]:state.revenueTrend==="weekly"?["W1","W2","W3","W4"]:["ก.พ.","มี.ค.","เม.ย.","พ.ค.","มิ.ย.","ก.ค."];
    const total=d.recognizedRevenue,series=timeSeries(total,labels.length,"revenue-"+state.revenueTrend),prior=timeSeries(p.recognizedRevenue,labels.length,"revenue-prev");
    const prov=provinceData().sort((a,b)=>b.revenue-a.revenue),stores=rankingData(d,"revenue").rows;
    let rankRows=[];
    if(state.revenueRank==="feature")rankRows=[["Premium Cheers",d.featureRevenue*.38],["Spotlight Profile",d.featureRevenue*.29],["VIP Match",d.featureRevenue*.20],["Dashboard Insight",d.featureRevenue*.13]];
    if(state.revenueRank==="province")rankRows=prov.map(x=>[x.province,x.revenue]);
    if(state.revenueRank==="venue")rankRows=stores.map(x=>[x.venue,x.rev]);
    body=`<div class="banner-note" style="margin-bottom:12px;padding:10px 14px;border-radius:8px">ไม่มี table เกี่ยวกับรายได้ในระบบจริงเลย — KPI ด้านล่างจึงว่างไว้ ส่วนกราฟ/ตารางที่เหลือยังเป็น mock ตัวอย่างประกอบ</div>
    <div class="grid kpis">${kpi("เงินรับจากการซื้อ NSC","—","","","neutral")}${kpi("รายได้ Dashboard Unlock","—","","","neutral")}${kpi("รายได้ Feature Unlock","—","","","neutral")}${kpi("รายได้ที่รับรู้ทั้งหมด","—","","","neutral")}${kpi("รายได้เฉลี่ยต่อร้าน","—","","","neutral")}${kpi("รายได้เฉลี่ยต่อ Active Venue","—","","","neutral")}</div>
    <div class="grid two">${card("Revenue Trend","รายวัน / รายสัปดาห์ / รายเดือน",`<div class="seg" style="width:max-content"><button data-revtrend="daily" class="${state.revenueTrend==="daily"?"active":""}">รายวัน</button><button data-revtrend="weekly" class="${state.revenueTrend==="weekly"?"active":""}">รายสัปดาห์</button><button data-revtrend="monthly" class="${state.revenueTrend==="monthly"?"active":""}">รายเดือน</button></div>${lineChart([{name:periodLabel(),values:series},{name:compareLabel(),values:prior}],labels,"แนวโน้มรายได้ที่รับรู้","บาท")}`)}${card("Revenue Separation","เงินรับ เครดิต และรายได้ที่รับรู้",`<div class="table-wrap"><table><tbody><tr><td>NSC Purchased</td><td>${fmt(d.nscPurchased)} NSC</td></tr><tr><td>NSC Consumed</td><td>${fmt(d.nscConsumed)} NSC</td></tr><tr><td>NSC Transfer</td><td>${fmt(d.transfer)} NSC</td></tr><tr><td>เงินรับจาก NSC</td><td>${money(d.cashReceived)}</td></tr><tr><td>รายได้ที่รับรู้</td><td>${money(d.recognizedRevenue)}</td></tr></tbody></table></div>`)} </div>
    ${card("Revenue Ranking","ตารางเดียว เปลี่ยน Feature / Province / Venue",`<div class="metric-toolbar"><div class="field"><label for="revenueRankSelect">จัดอันดับตาม</label><select id="revenueRankSelect"><option value="feature">ฟีเจอร์</option><option value="province">จังหวัด</option><option value="venue">ร้าน</option></select></div></div>${desktopAndMobileTable(["#","รายการ","รายได้"],rankRows.map((x,i)=>[i+1,x[0],money(x[1])]),rankRows.map((x,i)=>mobileCard((i+1)+". "+x[0],"Revenue ranking",money(x[1]),"",[])))}`)}`;
  }
  return`${hero("NSC & Revenue","แยก NSC Economy ออกจาก Revenue อย่างชัดเจน","Transfer ≠ New Revenue")}
  <div class="seg" style="width:max-content;margin-bottom:14px"><button data-nsctab="nsc" class="${state.nscTab==="nsc"?"active":""}">NSC Economy</button><button data-nsctab="revenue" class="${state.nscTab==="revenue"?"active":""}">Revenue</button></div>${body}`
}
function merchantPage(d,p){
  const rows=d.rows.slice().sort((a,b)=>{if(state.merchantSort==="lastAccess")return a.lastAccessMinutes-b.lastAccessMinutes;if(state.merchantSort==="nsc")return b.dashboardUnlock-a.dashboardUnlock;if(state.merchantSort==="unlock")return b.unlockFrequency-a.unlockFrequency;return b.dashMonthly-a.dashMonthly});
  return`${hero("Merchant Success","NMB และ Merchant Dashboard Usage","ตารางร้านเพียงชุดเดียว")}
  <div class="banner-note" style="margin-bottom:12px;padding:10px 14px;border-radius:8px">ทั้งหน้านี้ยังเป็น mock ทั้งหมด — DB ไม่มี table ติดตาม dashboard access/NSC unlock ของร้านค้าเลย (merchant portal เป็นระบบแยกที่ไม่มีอยู่ใน schema นี้)</div>
  <div class="grid two-even">
    ${card("NMB Funnel","Eligible Stores → NMB Sent → Dashboard Click",`<div class="funnel"><div class="f-row"><span>Eligible Stores</span><div class="f-bar"><span style="width:100%"></span></div><strong>${fmt(d.nmbEligible)}</strong><em>ฐาน</em></div><div class="f-row"><span>NMB Sent</span><div class="f-bar"><span style="width:${d.nmbSent/Math.max(1,d.nmbEligible)*100}%"></span></div><strong>${fmt(d.nmbSent)}</strong><em>${(d.nmbSent/Math.max(1,d.nmbEligible)*100).toFixed(1)}%</em></div><div class="f-row"><span>Dashboard Click</span><div class="f-bar"><span style="width:${d.nmbClicks/Math.max(1,d.nmbEligible)*100}%"></span></div><strong>${fmt(d.nmbClicks)}</strong><em>${(d.nmbClicks/Math.max(1,d.nmbSent)*100).toFixed(1)}%</em></div></div>`)}
    ${card("Merchant Dashboard Adoption","เคยเข้า / ยังไม่เคยเข้า และ Active frequency",`<h4 style="margin:0 0 8px">Adoption</h4>${stacked([["เคยเข้า",d.dashEver],["ยังไม่เคยเข้า",d.dashNever]],d.partnerStores)}<h4 style="margin:18px 0 8px">Active Stores</h4>${barRows([["รายวัน",d.dashDaily,fmt(d.dashDaily)],["รายสัปดาห์",d.dashWeekly,fmt(d.dashWeekly)],["รายเดือน",d.dashMonthly,fmt(d.dashMonthly)]])}`)}
  </div>
  <div class="grid kpis">
    ${kpi("Dashboard Users แบบ Unique",fmt(d.dashUsers),pct(change(d.dashUsers,p.dashUsers)),periodLabel(),"good")}
    ${kpi("ร้านเข้า Dashboard ล่าสุด",rows[0]?.venue||"—","ล่าสุดใน Scope",rows[0]?rows[0].lastAccessMinutes+" นาทีที่แล้ว":"ไม่มีข้อมูล","neutral")}
    ${kpi("หัวข้อปลดล็อกบ่อยที่สุด","Customer Profile","Mock ranking","Approved merchant topic","neutral")}
    ${kpi("NSC ร้านใช้เฉลี่ยต่อเดือน",fmt(d.dashboardUnlock/Math.max(1,d.dashEver))+" NSC","Average per adopted venue",periodLabel(),"neutral")}
    ${kpi("ร้านที่ปลดล็อกซ้ำ",fmt(d.repeatUnlock),pct(change(d.repeatUnlock,p.repeatUnlock)),periodLabel(),"good")}
  </div>
  ${card("Merchant Store Table","Sort ตาม Last Access, NSC Usage, Unlock Frequency หรือ Active Status",`<div class="metric-toolbar"><div class="field"><label for="merchantSortSelect">Sort ตาม</label><select id="merchantSortSelect"><option value="lastAccess">Last Dashboard Access</option><option value="nsc">NSC Usage</option><option value="unlock">Unlock Frequency</option><option value="active">Active Status</option></select></div></div>${desktopAndMobileTable(["ร้าน","จังหวัด","Last Access","NSC Usage","Unlock Frequency","Daily","Weekly","Monthly"],rows.map(r=>[r.venue,r.province,r.lastAccessMinutes+" นาที",fmt(r.dashboardUnlock),r.unlockFrequency,r.dashDaily?"Active":"—",r.dashWeekly?"Active":"—",r.dashMonthly?"Active":"—"]),rows.map(r=>mobileCard(r.venue,r.province,r.lastAccessMinutes+" นาที","",[["NSC Usage",fmt(r.dashboardUnlock)],["Unlock",r.unlockFrequency],["Daily",r.dashDaily?"Active":"—"],["Weekly",r.dashWeekly?"Active":"—"],["Monthly",r.dashMonthly?"Active":"—"]])))}`)}
  `
}
function realtimePage(d,p){
  const loginTotal=d.lineNow+d.emailNow;
  const genderNow=[["ชาย",d.mNow],["หญิง",d.fNow],["LGBTQ",d.lNow]];
  const ageNow=[["20–30",d.a20Now],["31–40",d.a31Now],["41–50",d.a41Now],["51–60",d.a51Now],["61–70",d.a61Now]];
  const cheersNow=Math.round(d.activeNow*1.9),matchNow=Math.round(d.activeNow*.62),chatNow=d.activeChatsNow;
  // เดิม: labels ของหน้านี้มีแค่ 18:00–23:45 (1h ถึง 01:00) จึงไม่ครอบคลุมช่วงหลังเที่ยงคืนถึง 06:00 ของคืนธุรกิจ — ใช้ nightLabels() แทน
  // const labels=state.granularity==="15m"?Array.from({length:24},(_,i)=>`${18+Math.floor(i/4)}:${String((i%4)*15).padStart(2,"0")}`):state.granularity==="30m"?Array.from({length:12},(_,i)=>`${18+Math.floor(i/2)}:${i%2?"30":"00"}`):["18:00","19:00","20:00","21:00","22:00","23:00","00:00","01:00"];
  const labels=nightLabels(state.granularity);
  const points=labels.length;
  const metricTotals={users:d.unique,cheers:d.cheersSent,match:d.matches,chat:d.chats,nsc:d.nscConsumed,topup:d.nscPurchased};
  // เดิม: const current=timeSeries(...),prev=...; const peakMetric=(m)=>{...} — คอมเมนต์ไว้เป็น fallback
  // realSeries: bucket timestamp จริงจาก DB ตาม label ช่วงเวลา — Match/NSC/Top-up ไม่มี table เลยจึงเป็น 0 ทุกช่วงตามที่ขอ
  // เดิม: bucket timestamp ทั้งหมด (all-time) เข้าช่องชั่วโมง แล้วแสดงเป็น "คืนนี้" และ users ใช้เวลาสมัคร (usersTimes) —
  // ตอนนี้กรองเฉพาะคืนธุรกิจปัจจุบัน (ตัดรอบ 06:00 น.) และ users ใช้เวลา login จริง (loginLogs) เหมือนหน้า Time & Night Pattern
  //   users:bucketCounts(realUserStats.activityTimestamps.usersTimes,labels,state.granularity),
  //   cheers:bucketCounts(realUserStats.activityTimestamps.cheersTimes,labels,state.granularity),
  //   chat:bucketCounts(realUserStats.activityTimestamps.chatsTimes,labels,state.granularity),
  const tonightKey=nightOf(new Date());
  const tonightOnly=times=>times.filter(t=>nightOf(new Date(t))===tonightKey);
  const tonightLogins=realUserStats?tonightOnly(realUserStats.loginLogs.map(l=>l.createAt)):[];
  const tonightCheers=realUserStats?tonightOnly(realUserStats.activityTimestamps.cheersTimes):[];
  const tonightChats=realUserStats?tonightOnly(realUserStats.activityTimestamps.chatsTimes):[];
  const realSeries=realUserStats?{
    users:bucketCounts(tonightLogins,labels,state.granularity),
    cheers:bucketCounts(tonightCheers,labels,state.granularity),
    chat:bucketCounts(tonightChats,labels,state.granularity),
    match:labels.map(()=>0),
    nsc:labels.map(()=>0),
    topup:labels.map(()=>0),
  }:null;
  const current=realSeries?realSeries[state.timeMetric]:timeSeries(metricTotals[state.timeMetric],points,"rt-"+state.timeMetric);
  const prev=realSeries?labels.map(()=>0):current.map((x,i)=>Math.round(x*(.82+(i%3)*.05))); // ไม่มี "คืนเทียบเคียง" จริงให้เทียบ (ข้อมูลน้อยเกินไป) เลยเป็น 0
  const peakMetric=(m)=>{
    if(realSeries){const arr=realSeries[m],max=Math.max(...arr);return max>0?labels[arr.indexOf(max)]:"—"}
    const arr=timeSeries(metricTotals[m],points,"peak-"+m);return labels[arr.indexOf(Math.max(...arr))]
  };
  // เดิม: hero(..., " ") ส่ง note เป็นช่องว่าง ทำให้กล่อง hero-note โชว์ว่างเปล่า — เอาออกตามที่ขอ
  return `${hero("สถานะตอนนี้","รวมข้อมูล Real-time สำคัญทั้งหมดไว้ในหน้าเดียวสำหรับเฝ้าดูแบบสด")}

  <div class="grid" style="margin-bottom:0">
  <section class="card" style="padding:18px">
    <div class="card-head"><div><h3>Focus Cards — Real-time ที่ต้องเห็นก่อน</h3><p>ตัวเลขใหญ่คือ Real-time ตอนนี้ และตัวเลขเล็กสีทองด้านล่างคือยอดรวมทั้งคืนจนถึงปัจจุบัน</p></div><span class="tag warn">TV Monitoring Ready</span></div>
    <div class="rt-focus-grid">
      ${/* เดิม 4 บรรทัดนี้เป็น mock ทั้งหมด — คอมเมนต์ไว้เป็น fallback
      ${focusCard({span:"double",tone:"primary",pill:"Critical KPI",title:"จำนวนร้านที่ออนไลน์ตอนนี้",current:fmt(d.onlineNow),tonight:fmt(d.onlineTonight),note:"ร้านที่ยัง Online ใน current moment เทียบกับร้านที่เคย Online ตลอดคืนนี้",footer:`<span>ณ ตอนนี้: ${d.onlineNow} ร้าน</span><span>คืนนี้สะสม: ${d.onlineTonight} ร้าน</span>`})}
      ${focusCard({span:"double",tone:"secondary",pill:"Critical KPI",title:"ผู้ใช้ NearSip ที่ Active ตอนนี้",current:fmt(d.activeNow),tonight:fmt(d.unique),note:"ใช้เพื่อเฝ้าดูปริมาณผู้ใช้ที่กำลัง Active เทียบกับยอดผู้ใช้สะสมคืนนี้",footer:`<span>ผู้ใช้ใหม่ตอนนี้: ${fmt(d.newNow)}</span><span>ผู้ใช้เดิมตอนนี้: ${fmt(d.returningNow)}</span>`})}
      ${focusCard({span:"double",tone:"tertiary",pill:"Critical KPI",title:"NSC Usage ตอนนี้",current:fmt(d.nscNow),tonight:fmt(d.nscConsumed),note:"เฝ้าดูแรงใช้ NSC แบบสด พร้อมเทียบยอด NSC Used ทั้งคืน",footer:`<span>Top-up ตอนนี้: ${fmt(Math.round(d.nscNow*1.3))}</span><span>Top-up คืนนี้: ${fmt(d.nscPurchased)}</span>`})}
      ${combinedInteractionCard({cheersNow,cheersNight:d.cheersSent,matchNow,matchNight:d.matches,chatNow,chatNight:d.chats})}
      */""}
      ${realStores.length?focusCard({span:"double",tone:"primary",pill:"Critical KPI",title:"จำนวนร้าน Active ทั้งหมด",current:fmt(realStores.length),tonight:fmt(realStores.length),footer:`<span>ร้าน ACTIVE: ${realStores.length} ร้าน</span>`}):focusCard({span:"double",tone:"primary",pill:"Critical KPI",title:"จำนวนร้านที่ออนไลน์ตอนนี้",current:fmt(d.onlineNow),tonight:fmt(d.onlineTonight),note:"ร้านที่ยัง Online ใน current moment เทียบกับร้านที่เคย Online ตลอดคืนนี้",footer:`<span>ณ ตอนนี้: ${d.onlineNow} ร้าน</span><span>คืนนี้สะสม: ${d.onlineTonight} ร้าน</span>`})}
      ${/* current/footer ของการ์ดนี้ห่อด้วย <span class="live-active-sessions"> ไว้ — loadActiveNow() อัปเดตเลขตรงนี้ทาง DOM
      โดยตรงทุก 5 วิ (ดูจุดเรียกด้านล่าง) แทนที่จะเรียก render() เต็มหน้า กันไม่ให้ state ที่ขยาย/scroll ของหน้าอื่นโดนรีเซ็ต */""}
      ${realUserStats?focusCard({span:"double",tone:"secondary",pill:"Critical KPI",title:"ผู้ใช้ NearSip ที่ Active ตอนนี้",current:`<span class="live-active-sessions">${fmt(realUserStats.activeSessions)}</span>`,tonight:fmt(realUserStats.uniqueUsers) ,footer:`<span>Active session ตอนนี้: <span class="live-active-sessions">${fmt(realUserStats.activeSessions)}</span></span><span>ผู้ใช้ทั้งหมด: <span class="live-unique-users">${fmt(realUserStats.uniqueUsers)}</span></span>`}):focusCard({span:"double",tone:"secondary",pill:"Critical KPI",title:"ผู้ใช้ NearSip ที่ Active ตอนนี้",current:fmt(d.activeNow),tonight:fmt(d.unique),note:"ใช้เพื่อเฝ้าดูปริมาณผู้ใช้ที่กำลัง Active เทียบกับยอดผู้ใช้สะสมคืนนี้",footer:`<span>ผู้ใช้ใหม่ตอนนี้: ${fmt(d.newNow)}</span><span>ผู้ใช้เดิมตอนนี้: ${fmt(d.returningNow)}</span>`})}
      ${focusCard({span:"double",tone:"tertiary",pill:"",title:"NSC Usage ตอนนี้",current:"—",tonight:"—"})}
      ${/* เดิม: cheersNow/cheersNight = cheersTotal และ chatNow/chatNight = chatsTotal (ยอดรวมทั้งหมดใช้เป็นทั้ง "ตอนนี้" และ "ทั้งคืน") — ตอนนี้ "ทั้งคืน" = ของคืนนี้จริง ส่วน "ตอนนี้" ไม่มีข้อมูลรายนาที จึงเป็น — */""}${realUserStats?combinedInteractionCard({cheersNow:"—",cheersNight:tonightCheers.length,matchNow:"—",matchNight:"—",chatNow:"—",chatNight:tonightChats.length}):combinedInteractionCard({cheersNow,cheersNight:d.cheersSent,matchNow,matchNight:d.matches,chatNow,chatNight:d.chats})}
    </div>
  </section>

  ${card("เพศของผู้ใช้ ณ ตอนนี้","แสดงทั้งตัวเลขและ Pie Chart โดยมีตัวเลขสะสมคืนนี้ใต้ทุกกรอบ",`
    <div class="grid kpis" style="grid-template-columns:repeat(3,1fr);margin-bottom:12px">
      ${/* เดิม 3 บรรทัดนี้เป็น mock — คอมเมนต์ไว้เป็น fallback
      ${kpi("ชาย ณ ตอนนี้",fmt(d.mNow),`รวมทั้งคืน ${fmt(d.male)}`,"ตัวเลขใหญ่ = Real-time · ตัวเลขล่าง = สะสมคืนนี้","good")}
      ${kpi("หญิง ณ ตอนนี้",fmt(d.fNow),`รวมทั้งคืน ${fmt(d.female)}`,"ตัวเลขใหญ่ = Real-time · ตัวเลขล่าง = สะสมคืนนี้","good")}
      ${kpi("LGBTQ ณ ตอนนี้",fmt(d.lNow),`รวมทั้งคืน ${fmt(d.lgbtq)}`,"ตัวเลขใหญ่ = Real-time · ตัวเลขล่าง = สะสมคืนนี้","good")}
      */""}
      ${realUserStats?kpi("ชาย (ทั้งหมด)",fmt(realUserStats.genderBreakdown.male),"","all-time (ไม่แยก \"ตอนนี้\" เพราะไม่มี presence tracking)","neutral"):kpi("ชาย ณ ตอนนี้",fmt(d.mNow),`รวมทั้งคืน ${fmt(d.male)}`,"ตัวเลขใหญ่ = Real-time · ตัวเลขล่าง = สะสมคืนนี้","good")}
      ${realUserStats?kpi("หญิง (ทั้งหมด)",fmt(realUserStats.genderBreakdown.female),"","all-time (ไม่แยก \"ตอนนี้\" เพราะไม่มี presence tracking)","neutral"):kpi("หญิง ณ ตอนนี้",fmt(d.fNow),`รวมทั้งคืน ${fmt(d.female)}`,"ตัวเลขใหญ่ = Real-time · ตัวเลขล่าง = สะสมคืนนี้","good")}
      ${realUserStats?kpi("LGBTQ (ทั้งหมด)",fmt(realUserStats.genderBreakdown.lgbtq),"","all-time (ไม่แยก \"ตอนนี้\" เพราะไม่มี presence tracking)","neutral"):kpi("LGBTQ ณ ตอนนี้",fmt(d.lNow),`รวมทั้งคืน ${fmt(d.lgbtq)}`,"ตัวเลขใหญ่ = Real-time · ตัวเลขล่าง = สะสมคืนนี้","good")}
    </div>
    <div class="pie-grid">
      ${realUserStats?card("Gender Pie","สัดส่วนผู้ใช้ทั้งหมด (all-time)",pieChart([["ชาย",realUserStats.genderBreakdown.male],["หญิง",realUserStats.genderBreakdown.female],["LGBTQ",realUserStats.genderBreakdown.lgbtq]],realUserStats.uniqueUsers,"ทั้งหมด\n"+fmt(realUserStats.uniqueUsers)),""):card("Gender Pie","สัดส่วนผู้ใช้ NearSip ที่ Active ตอนนี้",pieChart(genderNow,d.activeNow,"Active\n"+fmt(d.activeNow)),"<span class='tag info'>Current State</span>")}
      ${/* เดิม: Login Breakdown mock ทั้งหมด — คอมเมนต์ไว้เป็น fallback
      ${card("Login Breakdown","LINE และ Email พร้อมยอดรวมคืนนี้",`...`,"<span class='tag info'>Current State</span>")}
      */""}
      ${realUserStats?card("Login Breakdown","LINE/Email ประมาณจาก user.email (ไม่ใช่ field login-method ตรงๆ)",`
        <div class="grid kpis" style="grid-template-columns:repeat(3,1fr);margin-bottom:12px">
          ${kpi("Login ทั้งหมด (login_log)",fmt(realUserStats.loginLogs.length),"","all-time","neutral")}
          ${kpi("LINE Login (ประมาณ)",fmt(realUserStats.loginChannel.line),"","จำนวนผู้ใช้ที่ไม่มี email","neutral")}
          ${kpi("Email Login (ประมาณ)",fmt(realUserStats.loginChannel.email),"","จำนวนผู้ใช้ที่มี email","neutral")}
        </div>
        ${stacked([["LINE",realUserStats.loginChannel.line],["Email",realUserStats.loginChannel.email]],realUserStats.uniqueUsers)}
      `,""):card("Login Breakdown","LINE และ Email พร้อมยอดรวมคืนนี้",`
        <div class="grid kpis" style="grid-template-columns:repeat(3,1fr);margin-bottom:12px">
          ${kpi("Login สำเร็จรวม",fmt(loginTotal),`รวมทั้งคืน ${fmt(d.unique)}`,"Current login success vs tonight total login activity","good")}
          ${kpi("LINE Login",fmt(d.lineNow),`รวมทั้งคืน ${fmt(d.lineLogin)}`,"Current vs tonight total","good")}
          ${kpi("Email Login",fmt(d.emailNow),`รวมทั้งคืน ${fmt(d.emailLogin)}`,"Current vs tonight total","good")}
        </div>
        ${stacked([["LINE",d.lineNow],["Email",d.emailNow]],loginTotal)}
      `,"<span class='tag info'>Current State</span>")}
    </div>
  `)}

  ${card("ช่วงอายุของผู้ใช้ ณ ตอนนี้","ทุกกรอบมีทั้งจำนวน Real-time และจำนวนรวมทั้งคืนจนถึงปัจจุบัน",`
    <div class="grid kpis" style="grid-template-columns:repeat(5,1fr);margin-bottom:12px">
      ${/* เดิม 5 บรรทัดนี้เป็น mock — คอมเมนต์ไว้เป็น fallback
      ${kpi("อายุ 20–30",fmt(d.a20Now),`รวมทั้งคืน ${fmt(d.a20)}`,"Real-time vs tonight-to-date","good")}
      ${kpi("อายุ 31–40",fmt(d.a31Now),`รวมทั้งคืน ${fmt(d.a31)}`,"Real-time vs tonight-to-date","good")}
      ${kpi("อายุ 41–50",fmt(d.a41Now),`รวมทั้งคืน ${fmt(d.a41)}`,"Real-time vs tonight-to-date","good")}
      ${kpi("อายุ 51–60",fmt(d.a51Now),`รวมทั้งคืน ${fmt(d.a51)}`,"Real-time vs tonight-to-date","good")}
      ${kpi("อายุ 61–70",fmt(d.a61Now),`รวมทั้งคืน ${fmt(d.a61)}`,"Real-time vs tonight-to-date","good")}
      */""}
      ${realUserStats?kpi("อายุ 20–30 (ทั้งหมด)",fmt(realUserStats.ageBreakdown.a20),"","all-time","neutral"):kpi("อายุ 20–30",fmt(d.a20Now),`รวมทั้งคืน ${fmt(d.a20)}`,"Real-time vs tonight-to-date","good")}
      ${realUserStats?kpi("อายุ 31–40 (ทั้งหมด)",fmt(realUserStats.ageBreakdown.a31),"","all-time","neutral"):kpi("อายุ 31–40",fmt(d.a31Now),`รวมทั้งคืน ${fmt(d.a31)}`,"Real-time vs tonight-to-date","good")}
      ${realUserStats?kpi("อายุ 41–50 (ทั้งหมด)",fmt(realUserStats.ageBreakdown.a41),"","all-time","neutral"):kpi("อายุ 41–50",fmt(d.a41Now),`รวมทั้งคืน ${fmt(d.a41)}`,"Real-time vs tonight-to-date","good")}
      ${realUserStats?kpi("อายุ 51–60 (ทั้งหมด)",fmt(realUserStats.ageBreakdown.a51),"","all-time","neutral"):kpi("อายุ 51–60",fmt(d.a51Now),`รวมทั้งคืน ${fmt(d.a51)}`,"Real-time vs tonight-to-date","good")}
      ${realUserStats?kpi("อายุ 61–70 (ทั้งหมด)",fmt(realUserStats.ageBreakdown.a61),"","all-time","neutral"):kpi("อายุ 61–70",fmt(d.a61Now),`รวมทั้งคืน ${fmt(d.a61)}`,"Real-time vs tonight-to-date","good")}
    </div>
    <div class="pie-grid">
      ${realUserStats?card("Age Pie","สัดส่วนผู้ใช้ทั้งหมด (all-time) แยกตามช่วงอายุ",pieChart([["20–30",realUserStats.ageBreakdown.a20],["31–40",realUserStats.ageBreakdown.a31],["41–50",realUserStats.ageBreakdown.a41],["51–60",realUserStats.ageBreakdown.a51],["61–70",realUserStats.ageBreakdown.a61]],realUserStats.uniqueUsers,"ทั้งหมด\n"+fmt(realUserStats.uniqueUsers)),""):card("Age Pie","สัดส่วนผู้ใช้ Active ตอนนี้แยกตามช่วงอายุ",pieChart(ageNow,d.activeNow,"Active\n"+fmt(d.activeNow)),"<span class='tag info'>Current State</span>")}
      ${card("Current Snapshot","สรุปข้อมูลสดที่ต้องเห็นในหน้าจอเดียว",`
        <div class="mini-grid">
          <div class="mini-stat"><b>Scope</b><strong>${scopeName()}</strong></div>
          <div class="mini-stat"><b>Business Night</b><strong>${state.businessNight}</strong></div>
          <div class="mini-stat"><b>ข้อมูลล่าสุด</b><strong>${dataAsOfLabel()}</strong></div>
          <div class="mini-stat"><b>Peak Users</b><strong>${peakMetric("users")}</strong></div>
          <div class="mini-stat"><b>Peak NSC</b><strong>${peakMetric("nsc")}</strong></div>
        </div>
      `,"<span class='tag info'>Always-visible Summary</span>")}
    </div>
  `)}

  ${card("Tonight-to-date — สะสมของคืนนี้","รวมไว้ในหน้าเดียว ไม่ต้องสลับหน้าเพื่อดูยอดสะสมคืนนี้",`
    <div class="grid kpis">
      ${/* เดิม 6 บรรทัดนี้เป็น mock ทั้งหมด — คอมเมนต์ไว้เป็น fallback
      ${kpi("Unique Users สะสมคืนนี้",fmt(d.unique),pct(change(d.unique,p.unique)),"คืนเทียบเคียง","good")}
      ${kpi("ผู้ใช้ใหม่สะสมคืนนี้",fmt(d.newUsers),pct(change(d.newUsers,p.newUsers)),"คืนเทียบเคียง","good")}
      ${kpi("ผู้ใช้เดิมสะสมคืนนี้",fmt(d.existing),pct(change(d.existing,p.existing)),"คืนเทียบเคียง","good")}
      ${kpi("ผู้ใช้เฉลี่ยต่อชั่วโมง",fmt(d.unique/8),pct(change(d.unique/8,p.unique/8)),"8-hour mock window","good")}
      ${kpi("ผู้ใช้เฉลี่ยต่อร้าน",fmt(d.unique/Math.max(1,d.onlineTonight)),pct(change(d.unique/Math.max(1,d.onlineTonight),p.unique/Math.max(1,p.onlineTonight))),"Online venues tonight","good")}
      ${kpi("NSC Used คืนนี้",fmt(d.nscConsumed),pct(change(d.nscConsumed,p.nscConsumed)),"Tonight-to-date","good")}
      */""}
      ${realUserStats?kpi("Unique Users สะสมคืนนี้",`<span class="live-unique-users">${fmt(realUserStats.uniqueUsers)}</span>`,"","all-time (ไม่แยกเฉพาะคืนนี้)","neutral"):kpi("Unique Users สะสมคืนนี้",fmt(d.unique),pct(change(d.unique,p.unique)),"คืนเทียบเคียง","good")}
      ${realUserStats?kpi("ผู้ใช้ใหม่สะสมคืนนี้",fmt(realUserStats.newUsersTonight),"","สมัครตั้งแต่ 06:00 น.","neutral"):kpi("ผู้ใช้ใหม่สะสมคืนนี้",fmt(d.newUsers),pct(change(d.newUsers,p.newUsers)),"คืนเทียบเคียง","good")}
      ${realUserStats?kpi("ผู้ใช้เดิมสะสมคืนนี้",fmt(realUserStats.existingUsersTonight),"","สมัครก่อนคืนนี้","neutral"):kpi("ผู้ใช้เดิมสะสมคืนนี้",fmt(d.existing),pct(change(d.existing,p.existing)),"คืนเทียบเคียง","good")}
      ${kpi("ผู้ใช้เฉลี่ยต่อชั่วโมง","—","","ไม่มี timestamp แยกตามชั่วโมงที่ใช้ได้","neutral")}
      ${realUserStats&&realStores.length?kpi("ผู้ใช้เฉลี่ยต่อร้าน",fmt(realUserStats.uniqueUsers/realStores.length),"","ผู้ใช้ทั้งหมด / ร้าน ACTIVE ทั้งหมด","neutral"):kpi("ผู้ใช้เฉลี่ยต่อร้าน",fmt(d.unique/Math.max(1,d.onlineTonight)),pct(change(d.unique/Math.max(1,d.onlineTonight),p.unique/Math.max(1,p.onlineTonight))),"Online venues tonight","good")}
      ${kpi("NSC Used คืนนี้","—","","ไม่มี table รายได้/NSC ในระบบ","neutral")}
    </div>
  `)}

  ${card("Timeline Real-time",realSeries?"เฉพาะคืนนี้ (ตัดรอบ 06:00 น.) · Match/NSC/Top-up ไม่มี table ใน DB จึงเป็น 0 เสมอ":"กราฟเดียว เปลี่ยน Metric และ Granularity ได้ โดยยังอยู่ในหน้าสถานะตอนนี้หน้าเดียว",`
    <div class="metric-toolbar">
      <div class="field"><label for="timeMetricSelect">Metric</label><select id="timeMetricSelect"><option value="users">ผู้ใช้ NearSip</option><option value="cheers">Cheers</option><option value="match">Match</option><option value="chat">Chat</option><option value="nsc">NSC Usage</option><option value="topup">Top-up</option></select></div>
      <div class="seg"><button data-gran="15m" class="${state.granularity==="15m"?"active":""}">15 นาที</button><button data-gran="30m" class="${state.granularity==="30m"?"active":""}">30 นาที</button><button data-gran="1h" class="${state.granularity==="1h"?"active":""}">1 ชั่วโมง</button></div>
    </div>
    ${lineChart([{name:"คืนนี้",values:current},{name:"คืนเทียบเคียง",values:prev}],labels,"Real-time timeline","จำนวน")}
  `)}

  ${card("Peak Time Summary",realSeries?"เฉพาะคืนนี้ — \"—\" หมายถึงยังไม่มีข้อมูลพอจะหา peak ได้":"สรุปช่วงเวลาสูงสุดที่ควรเห็นในหน้าเดียวเช่นกัน",`
    <div class="mini-grid">
      <div class="mini-stat"><b>Peak Users</b><strong>${peakMetric("users")}</strong></div>
      <div class="mini-stat"><b>Peak Cheers</b><strong>${peakMetric("cheers")}</strong></div>
      <div class="mini-stat"><b>Peak Match</b><strong>${peakMetric("match")}</strong></div>
      <div class="mini-stat"><b>Peak NSC</b><strong>${peakMetric("nsc")}</strong></div>
      <div class="mini-stat"><b>Peak Top-up</b><strong>${peakMetric("topup")}</strong></div>
    </div>
  `)}
  </div>
  `
}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"})[char])}
function adminSettingsPage(){
  const configurableUsers=managedUsers.filter(user=>user.role!=="admin"),selectedUser=configurableUsers.find(user=>user.id===state.permissionUserId)||configurableUsers[0];
  if(!selectedUser)return`${hero("Users & Menu Access","ค้นหาและกำหนดเมนูที่แต่ละบัญชีเข้าใช้งานได้","0 บัญชี")}<div class="empty-state access-empty-state"><h3>ยังไม่มี User ที่ตั้งค่าสิทธิ์ได้</h3><p>เมื่อมีบัญชีผู้ใช้ รายชื่อจะแสดงในหน้านี้โดยอัตโนมัติ</p></div>`;
  state.permissionUserId=selectedUser.id;
  const getUserSearchText=user=>[user.displayName,user.username,ROLE_LABELS[user.role],user.scope].join(" ").toLocaleLowerCase("th-TH"),query=state.permissionSearch.trim().toLocaleLowerCase("th-TH"),visibleUsers=configurableUsers.filter(user=>getUserSearchText(user).includes(query));
  const userOptions=configurableUsers.map(user=>{
    const safeUserId=escapeHtml(user.id),searchText=escapeHtml(getUserSearchText(user));
    return`<button type="button" class="permission-user-option ${user.id===selectedUser.id?"active":""}" data-permission-user-select="${safeUserId}" data-search-text="${searchText}" ${visibleUsers.includes(user)?"":"hidden"}>
      <span><strong>${escapeHtml(user.displayName)}</strong><small>@${escapeHtml(user.username)}</small><small>${escapeHtml(user.scope)}</small></span>
      <span class="admin-role-badge role-${user.role}">${ROLE_LABELS[user.role]}</span>
    </button>`
  }).join("");
  const enabledMenus=userMenuPermissions[selectedUser.id]||[],safeUserId=escapeHtml(selectedUser.id);
  return`${hero("Users & Menu Access","ค้นหา เลือก User และกำหนดเมนูที่บัญชีนั้นเข้าใช้งานได้",`${configurableUsers.length} บัญชี`)}
    <div class="permission-section-head"><div><h3>ตั้งค่าสิทธิ์ราย User</h3><p>ค้นหาจากชื่อ Username Role หรือ Scope แล้วเลือกบัญชีที่ต้องการตั้งค่า</p></div></div>
    <div class="permission-manager">
      <section class="permission-user-browser" aria-label="ค้นหา User">
        <div class="permission-search-head"><label for="permissionUserSearch">ค้นหา User</label><small id="permissionSearchCount">${visibleUsers.length} จาก ${configurableUsers.length}</small></div>
        <input id="permissionUserSearch" type="search" value="${escapeHtml(state.permissionSearch)}" placeholder="ชื่อ, Username, Role หรือ Scope" autocomplete="off">
        <div class="permission-user-results" id="permissionUserResults">${userOptions}</div>
        <div class="permission-search-empty" id="permissionSearchEmpty" ${visibleUsers.length?"hidden":""}>ไม่พบ User ที่ตรงกับคำค้นหา</div>
      </section>
      <section class="permission-card permission-selected-user" data-permission-user="${safeUserId}">
      <div class="permission-card-head">
        <div>
          <div class="permission-user-meta"><span class="admin-role-badge role-${selectedUser.role}">${ROLE_LABELS[selectedUser.role]}</span><span>@${escapeHtml(selectedUser.username)}</span></div>
          <h3>${escapeHtml(selectedUser.displayName)}</h3><p>${escapeHtml(selectedUser.scope)}</p>
          <!-- เพิ่มตามที่ขอ — ให้ admin สูงสุดเห็น password ของ user (mock account เท่านั้น) -->
          <p class="permission-user-password">User: <code>${escapeHtml(selectedUser.username)}</code></p>
          <p class="permission-user-password">Pass: <code>${escapeHtml(selectedUser.password)}</code></p>
        </div>
        <strong>${enabledMenus.length}/${DASHBOARD_MENUS.length} เมนู</strong>
      </div>
      <div class="permission-list">
        ${DASHBOARD_MENUS.map(menu=>`<label class="permission-option" for="permission-${safeUserId}-${menu.id}">
          <span><b>${menu.label}</b><small>${menu.mode==="realtime"?"โหมด Real-time":"เมนู Overall"}</small></span>
          <input id="permission-${safeUserId}-${menu.id}" type="checkbox" role="switch" data-menu-permission data-user-id="${safeUserId}" data-menu-id="${menu.id}" ${enabledMenus.includes(menu.id)?"checked":""}>
        </label>`).join("")}
      </div>
      </section>
    </div>`
}
function noMenuAccessPage(){return`${hero("ไม่มีสิทธิ์เข้าถึงเมนู","บัญชีนี้ยังไม่ได้รับสิทธิ์สำหรับ Dashboard","ติดต่อผู้ดูแลระบบ")}
  <div class="empty-state access-empty-state"><h3>ไม่พบเมนูที่ได้รับอนุญาต</h3><p>Admin สามารถเปิดสิทธิ์ให้บัญชี @${escapeHtml(viewer.username)} ได้จากเมนู Users & Menu Access</p></div>`}
function showDashboardToast(message){const toast=document.getElementById("toast");toast.textContent=message;toast.classList.add("show");setTimeout(()=>toast.classList.remove("show"),2200)}
function updateNavOverflow(){const nav=document.getElementById("mainNav");if(!nav)return;const maxScroll=Math.max(0,nav.scrollWidth-nav.clientWidth);nav.classList.toggle("can-scroll-left",nav.scrollLeft>1);nav.classList.toggle("can-scroll-right",nav.scrollLeft<maxScroll-1)}
function renderNav(){
  if(state.mode==="realtime"){document.getElementById("mainNav").innerHTML="";updateNavOverflow();return}
  const navItems=accessibleOverallMenus().map(menu=>[menu.id,menu.label]);
  // เดิม: คอมเมนต์ไว้ก่อนตามที่ขอ — ซ่อนแท็บ "Users & Menu Access" ออกจาก nav ชั่วคราว
  // เปิดกลับมาเพื่อเทส permission (ดู [[nearsip-user-menu-permission-testing]]) — admin ต้องเข้าหน้านี้ได้ถึงจะกำหนดสิทธิ์ราย user ได้
  if(viewer.role==="admin")navItems.push(["settings","Users & Menu Access"]);
  document.getElementById("mainNav").innerHTML=navItems.map(([id,label])=>`<button type="button" data-page="${id}" class="${state.page===id?"active":""}">${label}</button>`).join("");
  document.querySelectorAll("#mainNav button").forEach(b=>b.onclick=()=>{state.page=b.dataset.page;render()});requestAnimationFrame(updateNavOverflow)
}
function bindControls(){
  const ids={
    execTrendSelect:["execTrend"],topMetricSelect:["topMetric"],provinceMetricSelect:["provinceMetric"],
    segmentSelect:["segmentMetric"],timeMetricSelect:["timeMetric"],revenueRankSelect:["revenueRank"],
    merchantSortSelect:["merchantSort"]
  };
  Object.entries(ids).forEach(([id,[key]])=>{const el=document.getElementById(id);if(el){el.value=state[key];el.onchange=e=>{state[key]=e.target.value;render()}}});
  document.querySelectorAll("[data-engage]").forEach(b=>b.onclick=()=>{state.engageTab=b.dataset.engage;render()});
  document.querySelectorAll("[data-gran]").forEach(b=>b.onclick=()=>{state.granularity=b.dataset.gran;render()});
  document.querySelectorAll("[data-trendmetric]").forEach(b=>b.onclick=()=>{state.trendMetric=b.dataset.trendmetric;render()});
  document.querySelectorAll("[data-trendgran]").forEach(b=>b.onclick=()=>{state.trendGran=b.dataset.trendgran;render()});
  document.querySelectorAll("[data-nsctab]").forEach(b=>b.onclick=()=>{state.nscTab=b.dataset.nsctab;render()});
  document.querySelectorAll("[data-revtrend]").forEach(b=>b.onclick=()=>{state.revenueTrend=b.dataset.revtrend;render()});
  const permissionSearch=document.getElementById("permissionUserSearch");
  if(permissionSearch){
    const filterPermissionUsers=()=>{
      const query=permissionSearch.value.trim().toLocaleLowerCase("th-TH"),userOptions=[...document.querySelectorAll("[data-permission-user-select]")];let visibleCount=0;
      state.permissionSearch=permissionSearch.value;
      userOptions.forEach(option=>{const visible=option.dataset.searchText.includes(query);option.hidden=!visible;if(visible)visibleCount++});
      document.getElementById("permissionSearchEmpty").hidden=visibleCount!==0;
      document.getElementById("permissionSearchCount").textContent=`${visibleCount} จาก ${userOptions.length}`
    };
    permissionSearch.oninput=filterPermissionUsers;filterPermissionUsers()
  }
  document.querySelectorAll("[data-permission-user-select]").forEach(button=>button.onclick=()=>{state.permissionUserId=button.dataset.permissionUserSelect;render()});
  document.querySelectorAll("[data-menu-permission]").forEach(input=>input.onchange=()=>{
    const userId=input.dataset.userId,menuId=input.dataset.menuId,nextMenus=new Set(userMenuPermissions[userId]||[]);
    if(input.checked)nextMenus.add(menuId);else nextMenus.delete(menuId);
    userMenuPermissions={...userMenuPermissions,[userId]:DASHBOARD_MENUS.map(menu=>menu.id).filter(id=>nextMenus.has(id))};
    const saved=saveUserMenuPermissions(userMenuPermissions),targetUser=managedUsers.find(user=>user.id===userId);
    render();
    showDashboardToast(saved?`บันทึกสิทธิ์ ${targetUser?.displayName||"ผู้ใช้"} แล้ว`:"อัปเดตสิทธิ์ชั่วคราวแล้ว แต่ browser ไม่อนุญาตให้บันทึก")
  });
  // .chart-bar = แท่งของกราฟรายคืน/สัปดาห์/เดือนในหน้า Engagement (lib/dashboard/render/bar-chart.ts) — ชี้เมาส์ก็แสดงค่า
  // (.chart-dot ของกราฟเส้นหน้าอื่นทำงานเหมือนเดิมทุกอย่าง คือ click/focus เท่านั้น)
  document.querySelectorAll(".chart-dot,.chart-bar").forEach(dot=>{
    const show=()=>{const wrap=dot.closest(".chart-wrap"),box=wrap.querySelector(".chart-value");if(box)box.textContent=`${dot.dataset.series} · ${dot.dataset.label}: ${fmt(dot.dataset.value)}`};
    dot.addEventListener("click",show);dot.addEventListener("focus",show);
    if(dot.classList.contains("chart-bar"))dot.addEventListener("mouseenter",show)
  })
}
// null = ข้อมูลจริงพร้อมแล้ว · {failed:false} = ยังโหลดอยู่ · {failed:true} = โหลดพลาด — ใช้กับหน้าที่ดึงตัวเลขจากข้อมูลจริง
// (executive/partners/users/time/realtime) ส่วน engagement มีสถานะโหลดของตัวเองและ settings ไม่ใช้ข้อมูลนี้
function realDataGate(){
  if(realUserStatsFailed||realStoresFailed||realStoreStatsFailed)return{failed:true};
  if(!realUserStats||!realStoresLoaded)return{failed:false};
  if(realStores.length&&!realStoreStats.length)return{failed:false}; // ร้านจริงมี แต่สถิติรายร้านยังโหลดไม่เสร็จ
  return null
}
function realDataGateHtml(gate){
  return gate.failed
    ?`<div class="error-state"><h3>โหลดข้อมูลจริงไม่สำเร็จ</h3><p>ระบบไม่แสดงตัวเลขตัวอย่างแทน เพื่อไม่ให้สับสนกับข้อมูลจริง — กรุณาลองใหม่อีกครั้ง</p><div class="seg" style="margin:12px auto 0;width:max-content"><button type="button" id="retryRealData" class="active">ลองใหม่</button></div></div>`
    :`<div class="empty-state"><h3>กำลังโหลดข้อมูลจริง…</h3><p>รอสักครู่ ระบบกำลังดึงข้อมูลจากฐานข้อมูล</p></div>`
}
function render(){
  const content=document.getElementById("content");
  try{
    enforceViewerScope();
    const previousMode=state.mode;ensureAccessibleView();renderNav();syncModeControls();
    if(previousMode!==state.mode)onModeChange(state.mode);
    const hasAnyMenu=viewer.role==="admin"||accessibleOverallMenus().length>0||canAccessMenu("realtime");
    if(!hasAnyMenu){
      content.innerHTML=noMenuAccessPage()
    }else if(state.mode==="overall"&&state.page==="settings"&&viewer.role==="admin"){
      content.innerHTML=adminSettingsPage()
    }else{
      const d=aggregate("current"),p=aggregate("prior");
      if(!d.rows||d.rows.length===0){
        content.innerHTML=`<div class="empty-state"><h3>ไม่มีข้อมูลสำหรับ Scope นี้</h3><p>ลองเปลี่ยนจังหวัด ร้าน หรือช่วงเวลา โดยค่าตัวกรองเดิมจะยังคงอยู่</p></div>`;
        return
      }
      const pages={executive:execPage,partners:partnersPage,users:usersPage,engagement:()=>renderEngagementPage({tab:state.engageTab,report:engagementReport,failed:engagementFailed,periodLabel:periodLabel()}),time:(a,b)=>timePage(a,b,false),nsc:nscRevenuePage,merchant:merchantPage};
      // เดิม: content.innerHTML=state.mode==="realtime"?realtimePage(d,p):pages[state.page](d,p) — ตกไป mock เงียบๆ ถ้าข้อมูลจริงยังไม่พร้อม
      const gate=(state.mode==="realtime"||["executive","partners","users","time"].includes(state.page))?realDataGate():null;
      if(gate){
        content.innerHTML=realDataGateHtml(gate);
        const retry=document.getElementById("retryRealData");
        if(retry)retry.onclick=()=>{realUserStatsFailed=realStoresFailed=realStoreStatsFailed=false;render();loadRealStores();loadRealUserStats()}
      }else content.innerHTML=state.mode==="realtime"?realtimePage(d,p):pages[state.page](d,p)
    }
    document.getElementById("contextLine").innerHTML=`<span><strong>${scopeName()}</strong></span><span>Mode: <strong>${state.mode==="overall"?"Overall":"Real-time"}</strong></span><span>Period: <strong>${state.mode==="realtime"?"Current Business Night":periodLabel()}</strong></span><span>Comparison: <strong>${state.mode==="realtime"?"คืนเทียบเคียง":compareLabel()}</strong></span><span>Business Night: <strong>${state.businessNight}</strong></span><span><span class="status-dot"></span>ข้อมูลล่าสุด: <strong>${dataAsOfLabel()}</strong></span><span><strong></strong></span>`;
    document.getElementById("mobileScope").textContent=scopeName();
    document.getElementById("filterCount").textContent=state.level==="country"?4:state.level==="province"?5:6;
    bindControls()
  }catch(error){
    console.error(error);
    content.innerHTML=`<div class="error-state"><h3>ไม่สามารถแสดงข้อมูลได้</h3><p>ตัวกรองและ Scope ยังถูกเก็บไว้ กรุณาลองเปลี่ยนมุมมองหรือรีเฟรช Mockup</p></div>`
  }
}
function populate(){
  enforceViewerScope();
  const ls=document.getElementById("levelSelect"),ps=document.getElementById("provinceSelect"),vs=document.getElementById("venueSelect"),cs=document.getElementById("compareSelect");
  const provinces=viewer.role==="admin"?Object.keys(PROVINCES):[authorizedProvince];
  // เดิม: const venues=viewer.role==="owner"?[authorizedVenue]:PROVINCES[state.province];
  // คอมเมนต์ไว้เป็น fallback — ตอนนี้ role admin ใช้ร้านจริงจาก realStores (loadRealStores) ถ้ามีข้อมูลแล้ว
  // ย้ายไป venueOptions() เพราะ entities() (ตอนเลือก "ทั้งหมด") ต้องใช้ list เดียวกัน
  const venues=venueOptions();
  // เดิม: เช็คแค่ viewer.role!=="admin" ถึงจะซ่อน "ประเทศไทย" — เปลี่ยนเป็นเงื่อนไขเดียวกับ initialScope
  // (ยกเว้น admin กับ role "province" ที่ไม่มี province ผูกไว้ เช่น admin01-03) ให้เห็น/เลือกได้ตามที่ขอ
  const canSeeCountryLevel=viewer.role==="admin"||(viewer.role==="province"&&!viewer.province);
  ls.querySelector('[value="country"]').disabled=!canSeeCountryLevel;ls.querySelector('[value="country"]').hidden=!canSeeCountryLevel;
  // เดิม: ls.querySelector('[value="province"]').disabled=viewer.role==="owner";ls.querySelector('[value="province"]').hidden=viewer.role==="owner";
  // ซ่อน "จังหวัด" ออกจาก dropdown ระดับข้อมูลไว้ก่อนตามที่ขอ (ร้านพาร์ทเนอร์เอากลับมาแล้ว เพราะต้องใช้เลือกร้านจริง)
  ls.querySelector('[value="province"]').disabled=true;ls.querySelector('[value="province"]').hidden=true;
  // เดิมเคยซ่อน [value="venue"] ไว้ด้วย — เอากลับมาแล้วตามที่ขอ (comment เก็บไว้เผื่ออยากซ่อนอีก)
  // ls.querySelector('[value="venue"]').disabled=true;ls.querySelector('[value="venue"]').hidden=true;
  ls.value=state.level;ls.disabled=viewer.role==="owner";
  ps.innerHTML=provinces.map(p=>`<option ${p===state.province?"selected":""}>${p}</option>`).join("");
  // เพิ่มตัวเลือก "ทั้งหมด" (รวมทุกร้านในสโคป) ไว้บนสุด — เว้น owner เพราะมีร้านเดียวอยู่แล้ว ไม่มีอะไรให้รวม
  const allOption=viewer.role==="owner"?"":`<option value="ALL" ${state.venue==="ALL"?"selected":""}>ทั้งหมด</option>`;
  vs.innerHTML=allOption+venues.map(v=>`<option ${v===state.venue?"selected":""}>${v}</option>`).join("");
  ps.disabled=viewer.role!=="admin"||state.level==="country";vs.disabled=viewer.role==="owner"||state.level!=="venue";
  cs.innerHTML=COMPARES[state.period].map(([v,l])=>`<option value="${v}" ${v===state.compare?"selected":""}>${l}</option>`).join("");
  if(!COMPARES[state.period].some(x=>x[0]===state.compare)){state.compare=COMPARES[state.period][0][0];cs.value=state.compare}
  document.getElementById("customDates").classList.toggle("show",state.period==="custom")
}
function loadingUpdate(fn){
  const overlay=document.getElementById("loadingOverlay");overlay.classList.add("show");
  setTimeout(()=>{fn();populate();render();overlay.classList.remove("show")},280)
}
function openDrawer(){document.body.classList.add("drawer-open");document.getElementById("filterOpen").setAttribute("aria-expanded","true")}
function closeDrawer(){document.body.classList.remove("drawer-open");document.getElementById("filterOpen").setAttribute("aria-expanded","false")}
function syncModeControls(){
  const realtime=state.mode==="realtime",canViewOverall=viewer.role==="admin"||accessibleOverallMenus().length>0,canViewRealtime=canAccessMenu("realtime"),overallButton=document.getElementById("overallBtn"),realtimeButton=document.getElementById("realtimeBtn");
  document.querySelector(".mode").classList.toggle("hidden",!canViewOverall&&!canViewRealtime);
  overallButton.hidden=!canViewOverall;overallButton.disabled=!canViewOverall;overallButton.classList.toggle("active",!realtime&&canViewOverall);overallButton.setAttribute("aria-pressed",String(!realtime&&canViewOverall));
  realtimeButton.hidden=!canViewRealtime;realtimeButton.disabled=!canViewRealtime;realtimeButton.classList.toggle("active",realtime&&canViewRealtime);realtimeButton.setAttribute("aria-pressed",String(realtime&&canViewRealtime));
  // เดิม: document.getElementById("periodSelect").disabled=realtime; — ล็อกไว้ตอน Real-time เพราะ mock คิดว่าดูได้แค่ "คืนนี้"
  // ข้อมูลจริงเลือกช่วงวันได้จริง (periodToDays) เลยเปิดให้เลือกได้แม้อยู่โหมด Real-time ตามที่ขอ — compareSelect ยังล็อกไว้เหมือนเดิม (ไม่เกี่ยวกับข้อมูลจริง)
  document.getElementById("compareSelect").disabled=realtime
}
function showOverall(){const firstMenu=accessibleOverallMenus()[0];if(viewer.role!=="admin"&&!firstMenu)return;state.mode="overall";state.page=viewer.role==="admin"?"executive":firstMenu.id;syncModeControls();onModeChange("overall");render()}
// เดิม: ไม่ได้เรียก loadActiveNow() ตรงนี้ — พอ poll ยิงเฉพาะตอน mode==="realtime" แล้ว (ดู interval ด้านล่าง)
// ถ้าเพิ่งกดเข้าหน้านี้ต้องรอ poll รอบถัดไปสูงสุด 15 วิ ตัวเลขถึงจะสด เลยยิงทันทีตอนสลับเข้ามาด้วย
function showRealtime(){if(!canAccessMenu("realtime"))return;state.mode="realtime";syncModeControls();onModeChange("realtime");render();loadActiveNow()}
const controller={showOverall,showRealtime};
activeController=controller;
document.getElementById("filterOpen").onclick=openDrawer;document.getElementById("filterClose").onclick=closeDrawer;document.getElementById("overlay").onclick=closeDrawer;
// เดิม: loadingUpdate(()=>{state.level=e.target.value}) — ไม่ได้ reload ข้อมูลจริงตามระดับที่เปลี่ยน เพิ่ม loadRealUserStats() ต่อท้าย
document.getElementById("levelSelect").onchange=e=>loadingUpdate(()=>{state.level=e.target.value;if(state.level==="venue")state.venue="ALL";loadRealUserStats();loadEngagement()})
document.getElementById("provinceSelect").onchange=e=>loadingUpdate(()=>{state.province=e.target.value;state.venue=PROVINCES[state.province][0]})
// เดิม: loadingUpdate(()=>{state.venue=e.target.value}) — ไม่ได้ reload ข้อมูลจริงตามร้านที่เปลี่ยน เพิ่ม loadRealUserStats() ต่อท้าย
document.getElementById("venueSelect").onchange=e=>loadingUpdate(()=>{state.venue=e.target.value;loadRealUserStats();loadEngagement()})
document.getElementById("periodSelect").onchange=e=>{state.period=e.target.value;state.compare=COMPARES[state.period][0][0];populate();render();loadRealUserStats();loadRealStoreStats();loadEngagement()}
// ช่วง "กำหนดเอง" — เดิมไม่มี handler เลย เปลี่ยนวันที่แล้วไม่มีอะไรเกิดขึ้น
document.getElementById("dateFrom").onchange=()=>{if(state.period==="custom"){loadEngagement();loadRealUserStats();loadRealStoreStats()}}
document.getElementById("dateTo").onchange=()=>{if(state.period==="custom"){loadEngagement();loadRealUserStats();loadRealStoreStats()}}
document.getElementById("compareSelect").onchange=e=>{state.compare=e.target.value;render()}
document.getElementById("nightSelect").onchange=e=>{state.businessNight=e.target.value;render()}
// เดิม: businessNight:"18:00–02:00" และ nightSelect.value="18:00–02:00" — option นั้นถูกเอาออกแล้ว เปลี่ยนให้ตรงกับ option แรกที่เหลือ
// เดิม: businessNight:"18:00–19:00" และ nightSelect.value="18:00–19:00" — เปลี่ยนให้ตรงกับค่าเริ่มต้นใหม่ "ทั้งหมด"
document.getElementById("resetBtn").onclick=()=>{Object.assign(state,{mode:"overall",page:"executive",...initialScope,period:"alltime",compare:"lastyear",businessNight:"ทั้งหมด"});if(state.level==="venue")state.venue="ALL";document.getElementById("levelSelect").value=initialScope.level;document.getElementById("periodSelect").value="alltime";document.getElementById("nightSelect").value="ทั้งหมด";ensureAccessibleView();syncModeControls();onModeChange(state.mode);populate();render();closeDrawer();loadRealUserStats();loadRealStoreStats();loadEngagement()}
document.getElementById("exportBtn").onclick=()=>showDashboardToast("แสดงปุ่ม Export ตามสิทธิ์ แต่ยังไม่ทำ Export จริง")
const handleOrientationChange=()=>setTimeout(()=>render(),120);
const handleKeyDown=e=>{if(e.key==="Escape")closeDrawer()};
const mainNav=document.getElementById("mainNav"),handleNavWheel=event=>{const maxScroll=Math.max(0,mainNav.scrollWidth-mainNav.clientWidth);if(maxScroll<=1)return;const delta=Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY,nextScroll=Math.min(maxScroll,Math.max(0,mainNav.scrollLeft+delta));if(nextScroll!==mainNav.scrollLeft){event.preventDefault();mainNav.scrollLeft=nextScroll;updateNavOverflow()}},handleNavResize=()=>updateNavOverflow();
window.addEventListener("orientationchange",handleOrientationChange);
window.addEventListener("keydown",handleKeyDown);
window.addEventListener("resize",handleNavResize);
mainNav.addEventListener("scroll",updateNavOverflow,{passive:true});mainNav.addEventListener("wheel",handleNavWheel,{passive:false});
ensureAccessibleView();syncModeControls();onModeChange(state.mode);
populate();render();
loadRealStores();
loadRealFeed();
loadRealUserStats();
loadEngagement();
// เดิม: loadRealUserStats() รันแค่ครั้งเดียวตอน mount + ตอนเปลี่ยน filter — "Active ตอนนี้" (activeSessions)
// เลยค้างจนกว่าจะมี action อื่น ไม่ขยับเองแม้มีคนล็อกอินเข้ามาจริง เพิ่ม poll ทุก 15 วิให้ตัวเลขขยับเองแบบ real-time
// (ของเดิม — คอมเมนต์ไว้ ไม่ลบ) เปลี่ยนมาใช้ loadActiveNow() (query เบากว่ามาก ดู lib/db/user-stats.repository.ts
// getActiveNowStats) แทน เลยลด interval เหลือ 5 วิได้โดยไม่เพิ่มภาระ DB เกิน poll เดิมที่ 15 วิ และ
// เพิ่มเช็ค document.hidden กัน poll ตอนไม่ได้เปิดดู tab อยู่
// realtimePollId=setInterval(()=>{if(!unmounted)loadRealUserStats()},15000);
// เดิม: เคยจำกัดให้ยิงเฉพาะตอน state.mode==="realtime" และยืด interval เป็น 15 วิ — ตามที่ขอ อยาก
// ให้ Overall mode ก็ขยับสดเหมือนกัน ไม่ใช่แค่หน้า Real-time เลยเอาเช็ค mode ออก ยิงทุกหน้า และกลับไป
// 5 วิเหมือนเดิม (loadActiveNow() แก้ DOM เฉพาะจุดที่มี class "live-active-sessions"/"live-unique-users"
// ตรงๆ ไม่เรียก render() เต็ม เลยไม่ทำให้หน้าอื่นรีเซ็ต scroll/แถวที่ขยายอยู่เหมือนเมื่อก่อน)
realtimePollId=setInterval(()=>{if(!unmounted&&!document.hidden)loadActiveNow()},5000);

return()=>{
  unmounted=true;
  clearInterval(realtimePollId);
  window.removeEventListener("orientationchange",handleOrientationChange);
  window.removeEventListener("keydown",handleKeyDown);
  window.removeEventListener("resize",handleNavResize);
  mainNav.removeEventListener("scroll",updateNavOverflow);mainNav.removeEventListener("wheel",handleNavWheel);
  if(activeController===controller)activeController=null;
};
}
