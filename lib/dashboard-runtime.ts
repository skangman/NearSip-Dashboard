// @ts-nocheck

import type { Viewer } from "@/lib/auth-types";

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
) {
const PROVINCES={
  "กรุงเทพมหานคร":["Siam Social Demo","Thonglor Pulse Demo","RCA Connect Demo","Silom Afterdark Demo"],
  "ชลบุรี":["Pattaya Harbor Demo","Waves & Beats Demo","Na Klua Night Demo","Bangsaen Vibe Demo"],
  "เชียงใหม่":["Lanna Glow Demo","Night Bazaar Hub Demo","Ping River Mood Demo","Nimman Afterdark Demo"],
  "ภูเก็ต":["Patong Pulse Demo","Andaman Lounge Demo","Old Town Nights Demo","Kata Rhythm Demo"],
  "ขอนแก่น":["Kaen Pulse Demo","Ton Koon Loft Demo","Mor Lam Mood Demo","Isan Beat Demo"],
  "อุดรธานี":["UD Twilight Demo","Rim Nong Bar Demo","Soda Lane Demo","North Moon Demo"]
};
const OVERALL_NAV=[
  ["executive","Executive Overview"],["partners","Partners & Geography"],["users","Users & Demographics"],
  ["engagement","Engagement & Retention"],["time","Time & Night Pattern"],["nsc","NSC & Revenue"],["merchant","Merchant Success"]
];
const COMPARES={
  tonight:[["lastnight","คืนก่อน"],["avg7","ค่าเฉลี่ย 7 วัน"],["avg30","ค่าเฉลี่ย 30 วัน"]],
  today:[["lastnight","คืนก่อน"],["lastweek","สัปดาห์ก่อน"],["avg7","ค่าเฉลี่ย 7 วัน"]],
  "7d":[["lastweek","สัปดาห์ก่อน"],["avg30","ค่าเฉลี่ย 30 วัน"]],
  "30d":[["lastmonth","เดือนก่อน"],["lastyear","ปีก่อน"]],
  month:[["lastmonth","เดือนก่อน"],["lastyear","ปีก่อน"]],
  quarter:[["lastmonth","เดือนก่อน"],["lastyear","ปีก่อน"]],
  year:[["lastyear","ปีก่อน"]],
  custom:[["lastmonth","เดือนก่อน"],["lastyear","ปีก่อน"],["avg30","ค่าเฉลี่ย 30 วัน"]]
};
const initialMode=document.getElementById("realtimeBtn")?.getAttribute("aria-pressed")==="true"?"realtime":"overall";
const authorizedProvince=viewer.province&&PROVINCES[viewer.province]?viewer.province:"กรุงเทพมหานคร";
const authorizedVenue=viewer.venue&&PROVINCES[authorizedProvince].includes(viewer.venue)?viewer.venue:PROVINCES[authorizedProvince][0];
const initialScope=viewer.role==="admin"?{level:"country",province:"กรุงเทพมหานคร",venue:"Siam Social Demo"}:viewer.role==="province"?{level:"province",province:authorizedProvince,venue:authorizedVenue}:{level:"venue",province:authorizedProvince,venue:authorizedVenue};
const state={
  mode:initialMode,page:"executive",...initialScope,
  period:"month",compare:"lastmonth",businessNight:"18:00–02:00",
  execTrend:"users",topMetric:"users",provinceMetric:"users",segmentMetric:"frequent",
  engageTab:"cheers",timeMetric:"users",granularity:"30m",nscTab:"nsc",
  revenueTrend:"daily",revenueRank:"feature",merchantSort:"lastAccess"
};
function enforceViewerScope(){
  if(viewer.role==="admin")return;
  state.province=authorizedProvince;
  if(viewer.role==="owner"){
    state.level="venue";state.venue=authorizedVenue;return
  }
  if(state.level!=="province"&&state.level!=="venue")state.level="province";
  if(!PROVINCES[authorizedProvince].includes(state.venue))state.venue=authorizedVenue
}
function hash(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h+=(h<<1)+(h<<4)+(h<<7)+(h<<8)+(h<<24)}return Math.abs(h>>>0)}
function rng(seed){let t=seed>>>0;return()=>{t+=0x6D2B79F5;let r=Math.imul(t^t>>>15,1|t);r^=r+Math.imul(r^r>>>7,61|r);return((r^r>>>14)>>>0)/4294967296}}
function fmt(n){return new Intl.NumberFormat("th-TH").format(Math.round(Number(n)||0))}
function money(n){return "฿"+new Intl.NumberFormat("th-TH",{maximumFractionDigits:1,notation:Math.abs(n)>=1000000?"compact":"standard"}).format(Number(n)||0)}
function pct(n){return (n>=0?"+":"")+Number(n).toFixed(1)+"%"}
function pp(n){return (n>=0?"+":"")+Number(n).toFixed(1)+" pp"}
function scale(){return {tonight:1,today:1.15,"7d":5.3,"30d":22,month:22,quarter:66,year:255,custom:35}[state.period]}
function allVenues(){return Object.entries(PROVINCES).flatMap(([province,venues])=>venues.map(venue=>({province,venue})))}
function entities(){if(state.level==="country")return allVenues();if(state.level==="province")return PROVINCES[state.province].map(venue=>({province:state.province,venue}));return[{province:state.province,venue:state.venue}]}
function scopeName(){if(state.level==="country")return"ประเทศไทย";if(state.level==="province")return"จังหวัด"+state.province;return state.venue+" · "+state.province}
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
function card(title,subtitle,body,tag=""){return`<section class="card"><div class="card-head"><div><h3>${title}</h3><p>${subtitle}</p></div>${tag}</div>${body}</section>`}
function hero(title,desc,note=""){return`<div class="hero"><div><h2>${title}</h2><p>${desc}</p></div>${note?`<div class="hero-note">${note}</div>`:""}</div>`}
function barRows(items){const max=Math.max(...items.map(x=>x[1]),1);return items.map(([n,v,l])=>`<div class="driver"><span>${n}</span><div class="track"><div class="fill" style="width:${v/max*100}%"></div></div><strong>${l||fmt(v)}</strong></div>`).join("")}
function stacked(items,total){const colors=["#2bd9f7","#8c6cff","#ef78bd","#3fd49b"];return`<div class="stack">${items.map((x,i)=>`<span style="width:${x[1]/Math.max(1,total)*100}%;background:${colors[i]}"></span>`).join("")}</div><div class="stack-legend">${items.map((x,i)=>`<span><i style="display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:5px;background:${colors[i]}"></i>${x[0]}<b>${fmt(x[1])} · ${(x[1]/Math.max(1,total)*100).toFixed(1)}%</b></span>`).join("")}</div>`}

function pieChart(items,total,centerLabel){
  const colors=["#2bd9f7","#8c6cff","#ef78bd","#3fd49b","#ff9d55","#7fd4ff"];
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
    <div class="rt-night-label">รวมทั้งคืนจนถึงตอนนี้</div>
    <div class="rt-night-value">${opts.tonight}</div>
    ${opts.note?`<div class="rt-subtle">${opts.note}</div>`:''}
    ${opts.footer?`<div class="rt-split-note">${opts.footer}</div>`:''}
  </article>`
}
function combinedInteractionCard(vals){
  return `<article class="rt-focus-card triple hot">
    <div class="rt-pill">Current Interaction</div>
    <div class="rt-title">Cheers / Match / Chat</div>
    <div class="rt-three">
      <div class="rt-metric">
        <div class="m-name">Cheers</div>
        <div class="m-current-label">Real-time ตอนนี้</div>
        <div class="m-current">${fmt(vals.cheersNow)}</div>
        <div class="m-night-label">รวมทั้งคืน</div>
        <div class="m-night">${fmt(vals.cheersNight)}</div>
      </div>
      <div class="rt-metric">
        <div class="m-name">Match</div>
        <div class="m-current-label">Real-time ตอนนี้</div>
        <div class="m-current">${fmt(vals.matchNow)}</div>
        <div class="m-night-label">รวมทั้งคืน</div>
        <div class="m-night">${fmt(vals.matchNight)}</div>
      </div>
      <div class="rt-metric">
        <div class="m-name">Chat</div>
        <div class="m-current-label">Real-time ตอนนี้</div>
        <div class="m-current">${fmt(vals.chatNow)}</div>
        <div class="m-night-label">รวมทั้งคืน</div>
        <div class="m-night">${fmt(vals.chatNight)}</div>
      </div>
    </div>
    <div class="rt-split-note"><span>ตัวเลขใหญ่ = Real-time</span><span>ตัวเลขเล็ก = สะสมคืนนี้</span></div>
  </article>`
}
function timeSeries(total,points,seed){const r=rng(hash(scopeName()+seed+state.period));let cur=total/(points*.9)*(.75+r()*.2);return Array.from({length:points},(_,i)=>{const peak=1+Math.exp(-Math.pow(i-points*.62,2)/(points*1.7))*.9;cur=Math.max(0,cur*(.82+r()*.28)+total/points*.22*peak);return Math.round(cur)})}
function lineChart(series,labels,title="แนวโน้ม",unit="จำนวน"){
  const w=780,h=250,ml=52,mr=18,mt=18,mb=38,vals=series.flatMap(s=>s.values),max=Math.max(...vals,1)*1.12,step=(w-ml-mr)/Math.max(1,labels.length-1),x=i=>ml+i*step,y=v=>h-mb-v/max*(h-mt-mb);
  let grid="",yt="";for(let i=0;i<5;i++){const gy=mt+(h-mt-mb)/4*i,val=max*(1-i/4);grid+=`<line x1="${ml}" y1="${gy}" x2="${w-mr}" y2="${gy}" stroke="rgba(255,255,255,.08)"/>`;yt+=`<text x="${ml-8}" y="${gy+4}" text-anchor="end" fill="#aebbd5" font-size="10">${fmt(val)}</text>`}
  const colors=["#2bd9f7","#8c6cff","#ef78bd","#ff9d55"],xl=labels.map((l,i)=>`<text x="${x(i)}" y="${h-12}" text-anchor="middle" fill="#aebbd5" font-size="10">${l}</text>`).join("");
  const lines=series.map((s,si)=>{const pts=s.values.map((v,i)=>`${x(i)},${y(v)}`).join(" ");const dots=s.values.map((v,i)=>`<circle class="chart-dot" data-series="${s.name}" data-label="${labels[i]}" data-value="${v}" cx="${x(i)}" cy="${y(v)}" r="${si===0?5:4}" fill="${colors[si]}" tabindex="0"><title>${s.name} · ${labels[i]} · ${fmt(v)} ${unit}</title></circle>`).join("");return`<polyline fill="none" stroke="${colors[si]}" stroke-width="${si===0?4:2.5}" ${si>0?'stroke-dasharray="6 5"':""} points="${pts}"/>${dots}`}).join("");
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
  const rank=rankingData(d,state.topMetric),top=rank.rows[0],prov=provinceData(),topProvince=prov.slice().sort((a,b)=>b.growth-a.growth)[0];
  return`${hero("Executive Overview","ภาพรวม NearSip ที่ CEO เข้าใจได้ภายในประมาณ 10 วินาที","Headline 6 KPI · Progressive Disclosure")}
  <div class="grid kpis">
    ${kpi("ร้านพาร์ทเนอร์ทั้งหมด",fmt(d.partnerStores),"Scope ปัจจุบัน","ร้านพาร์ทเนอร์ในระบบ","neutral")}
    ${kpi("ผู้ใช้ NearSip แบบ Unique",fmt(d.unique),pct(change(d.unique,p.unique)),periodLabel(),"good")}
    ${kpi("ผู้ใช้ใหม่",fmt(d.newUsers),pct(change(d.newUsers,p.newUsers)),periodLabel(),"good")}
    ${kpi("ผู้ใช้เดิม",fmt(d.existing),pct(change(d.existing,p.existing)),periodLabel(),"good")}
    ${kpi("Engagement Rate รวม",d.engagementRate.toFixed(1)+"%",pp(d.engagementRate-p.engagementRate),"Engaged users / Unique users","good")}
    ${kpi("รายได้ที่รับรู้ทั้งหมด",money(d.recognizedRevenue),pct(change(d.recognizedRevenue,p.recognizedRevenue)),periodLabel(),"good")}
  </div>
  <div class="grid two">
    ${card("แนวโน้มภาพรวม","สลับระหว่างผู้ใช้ NearSip และรายได้ที่รับรู้",`<div class="metric-toolbar"><div class="field"><label for="execTrendSelect">Metric</label><select id="execTrendSelect"><option value="users">ผู้ใช้ NearSip</option><option value="revenue">รายได้ที่รับรู้</option></select></div></div>${lineChart([{name:periodLabel(),values:current},{name:compareLabel(),values:prior}],labels,state.execTrend==="users"?"แนวโน้มผู้ใช้ NearSip":"แนวโน้มรายได้ที่รับรู้",state.execTrend==="users"?"คน":"บาท")}`)}
    ${card("Summary ที่โดดเด่น","แสดงเฉพาะประเด็นจาก Approved Requirements",`<div class="stat-list"><div class="stat"><b>จังหวัดเติบโตสูงสุด</b><p>${topProvince.province} · ${pct(topProvince.growth)}</p></div><div class="stat"><b>ร้านอันดับหนึ่งตาม ${rank.label}</b><p>${top.venue} · ${state.topMetric==="revenue"?money(top.value):state.topMetric.includes("Per")||state.topMetric==="repeat"?top.value.toFixed(1):fmt(top.value)}</p></div><div class="stat"><b>ร้านออนไลน์คืนนี้</b><p>${fmt(d.onlineTonight)} จาก ${fmt(d.partnerStores)} ร้านใน Scope</p></div></div>`)}
  </div>
  ${card("Top Performer","Ranking table เดียว เปลี่ยน Metric ได้",`<div class="metric-toolbar"><div class="field"><label for="topMetricSelect">จัดอันดับตาม</label><select id="topMetricSelect"><option value="users">ผู้ใช้ NearSip สูงสุด</option><option value="engagement">Engagement สูงสุด</option><option value="engPerUser">Engagement ต่อผู้ใช้สูงสุด</option><option value="repeat">Repeat Rate สูงสุด</option><option value="newUsers">ผู้ใช้ใหม่สูงสุด</option><option value="nsc">NSC Usage สูงสุด</option><option value="nscPerUser">NSC Usage ต่อผู้ใช้สูงสุด</option><option value="revenue">รายได้สูงสุด</option></select></div></div>${desktopAndMobileTable(["#","ร้าน","จังหวัด",rank.label,"ผู้ใช้","Engagement","Repeat","NSC","รายได้"],rank.rows.map((r,i)=>[i+1,r.venue,r.province,state.topMetric==="revenue"?money(r.value):state.topMetric.includes("Per")||state.topMetric==="repeat"?r.value.toFixed(1):fmt(r.value),fmt(r.unique),fmt(r.engagement),(r.repeat30/r.unique*100).toFixed(1)+"%",fmt(r.nscConsumed),money(r.rev)]),rank.rows.map((r,i)=>mobileCard((i+1)+". "+r.venue,r.province,state.topMetric==="revenue"?money(r.value):state.topMetric.includes("Per")||state.topMetric==="repeat"?r.value.toFixed(1):fmt(r.value),"",[["ผู้ใช้",fmt(r.unique)],["Engagement",fmt(r.engagement)],["Repeat",(r.repeat30/r.unique*100).toFixed(1)+"%"],["NSC",fmt(r.nscConsumed)],["รายได้",money(r.rev)]])))}`)}
  `
}
function partnersPage(d,p){
  const prov=provinceData(),metricLabels={users:"ผู้ใช้ NearSip",growth:"Growth",engagement:"Engagement",nsc:"NSC Purchased",revenue:"รายได้",revPerActive:"Revenue / Active Venue"};
  const sorted=prov.map(x=>({...x,value:{users:x.unique,growth:x.growth,engagement:x.engagement,nsc:x.nscPurchased,revenue:x.revenue,revPerActive:x.revPerActive}[state.provinceMetric]})).sort((a,b)=>b.value-a.value);
  const rank=rankingData(d,state.topMetric);
  return`${hero("Partners & Geography","ร้านพาร์ทเนอร์ จังหวัด และการเปรียบเทียบเชิงพื้นที่","Province users = ผู้ใช้ NearSip ในร้านพาร์ทเนอร์")}
  <div class="grid kpis">
    ${kpi("ร้านพาร์ทเนอร์ทั้งหมด",fmt(d.partnerStores),"Scope ปัจจุบัน","ร้านพาร์ทเนอร์เท่านั้น","neutral")}
    ${kpi("ร้านออนไลน์อยู่ในคืนนี้",fmt(d.onlineTonight),pct(change(d.onlineTonight,p.onlineTonight)),"Online in current Business Night","good")}
    ${kpi("ร้านใหม่ที่เพิ่มเข้ามา",fmt(d.newPartner),pct(change(d.newPartner,p.newPartner)),periodLabel(),"good")}
    ${kpi("ผู้ใช้ NearSip ใน Scope",fmt(d.unique),pct(change(d.unique,p.unique)),"ไม่ใช่ Total Footfall","good")}
    ${kpi("ผู้ใช้เฉลี่ยต่อร้าน",fmt(d.unique/Math.max(1,d.partnerStores)),pct(change(d.unique/d.partnerStores,p.unique/p.partnerStores)),periodLabel(),"good")}
    ${kpi("Revenue / Active Venue",money(d.avgRevenuePerActiveVenue),pct(change(d.avgRevenuePerActiveVenue,p.avgRevenuePerActiveVenue)),periodLabel(),"good")}
  </div>
  <div class="grid two-even">
    ${card("จำนวนร้านแยกตามจังหวัด","Bar chart อ่านการเปรียบเทียบได้ตรงกว่า Map",barRows(prov.map(x=>[x.province,x.stores,fmt(x.stores)])))}
    ${card("Province Profile","เพศ อายุ และ Interaction ของ Scope จังหวัด",`<h4 style="margin:0 0 8px">สัดส่วนเพศ</h4>${stacked([["ชาย",d.male],["หญิง",d.female],["LGBTQ",d.lgbtq]],d.unique)}<h4 style="margin:18px 0 8px">ช่วงอายุ</h4>${barRows([["20–30",d.a20,fmt(d.a20)],["31–40",d.a31,fmt(d.a31)],["41–50",d.a41,fmt(d.a41)],["51–60",d.a51,fmt(d.a51)],["61–70",d.a61,fmt(d.a61)]])}`)}
  </div>
  ${card("Province Comparison","ตารางเดียว เปลี่ยน Metric ที่ใช้จัดอันดับ",`<div class="metric-toolbar"><div class="field"><label for="provinceMetricSelect">จัดอันดับจังหวัดตาม</label><select id="provinceMetricSelect"><option value="users">ผู้ใช้ NearSip</option><option value="growth">Growth</option><option value="engagement">Engagement</option><option value="nsc">NSC Purchased</option><option value="revenue">รายได้</option><option value="revPerActive">Revenue / Active Venue</option></select></div></div>${desktopAndMobileTable(["#","จังหวัด","ร้าน","Unique Users","ผู้ใช้ใหม่","ผู้ใช้เดิม","Engagement","NSC Purchased","รายได้","Revenue / Active Venue"],sorted.map((x,i)=>[i+1,x.province,x.stores,fmt(x.unique),fmt(x.newUsers),fmt(x.existing),fmt(x.engagement),fmt(x.nscPurchased),money(x.revenue),money(x.revPerActive)]),sorted.map((x,i)=>mobileCard((i+1)+". "+x.province,x.stores+" ร้าน",state.provinceMetric==="revenue"||state.provinceMetric==="revPerActive"?money(x.value):state.provinceMetric==="growth"?pct(x.value):fmt(x.value),"",[["Unique Users",fmt(x.unique)],["ผู้ใช้ใหม่",fmt(x.newUsers)],["Engagement",fmt(x.engagement)],["NSC Purchased",fmt(x.nscPurchased)],["รายได้",money(x.revenue)]])))}`)}
  <div class="grid two-even" style="margin-top:14px">
    ${card("ร้านใน Scope","เมื่อ Scope เป็นจังหวัดหรือร้าน ตารางจะลดตาม Scope โดยอัตโนมัติ",desktopAndMobileTable(["ร้าน","จังหวัด","Users","Engagement","Repeat","NSC","รายได้"],rank.rows.map(r=>[r.venue,r.province,fmt(r.unique),fmt(r.engagement),(r.repeat30/r.unique*100).toFixed(1)+"%",fmt(r.nscConsumed),money(r.rev)]),rank.rows.map(r=>mobileCard(r.venue,r.province,fmt(r.unique)+" users","",[["Engagement",fmt(r.engagement)],["Repeat",(r.repeat30/r.unique*100).toFixed(1)+"%"],["NSC",fmt(r.nscConsumed)],["รายได้",money(r.rev)]]))))}
    ${card("แนวโน้มจังหวัด","รายวัน รายสัปดาห์ และรายเดือน ใช้กราฟเดียวแบบสรุป",lineChart([{name:"รายวัน",values:timeSeries(d.unique,7,"pd")},{name:"รายสัปดาห์",values:timeSeries(d.unique*.8,7,"pw")}],["จ","อ","พ","พฤ","ศ","ส","อา"],"แนวโน้มผู้ใช้ NearSip ในร้านพาร์ทเนอร์ของจังหวัด","คน"))}
  </div>`
}
function usersPage(d,p){
  const genders=[["ชาย",d.male],["หญิง",d.female],["LGBTQ",d.lgbtq]],ages=[["20–30",d.a20],["31–40",d.a31],["41–50",d.a41],["51–60",d.a51],["61–70",d.a61]];
  const segmentMap={frequent:"มาบ่อยที่สุด",engagement:"Engagement สูงสุด",repeat:"Repeat สูงสุด",nsc:"NSC Usage สูงสุด"};
  const g=genders[hash(scopeName()+state.segmentMetric)%3][0],a=ages[hash(scopeName()+"age"+state.segmentMetric)%5][0];
  return`${hero("Users & Demographics","ผู้ใช้ NearSip, Visit Frequency, Demographic, Login และ Device","เพศ 3 กลุ่ม: ชาย / หญิง / LGBTQ")}
  <div class="grid kpis">
    ${kpi("ผู้ใช้ Unique",fmt(d.unique),pct(change(d.unique,p.unique)),periodLabel(),"good")}
    ${kpi("ผู้ใช้ใหม่",fmt(d.newUsers),pct(change(d.newUsers,p.newUsers)),periodLabel(),"good")}
    ${kpi("ผู้ใช้เดิม",fmt(d.existing),pct(change(d.existing,p.existing)),periodLabel(),"good")}
    ${kpi("กลับมาร้านเดิม",fmt(d.sameVenue),pct(change(d.sameVenue,p.sameVenue)),"Same-venue return","good")}
    ${kpi("กลับมา NearSip แต่เปลี่ยนร้าน",fmt(d.crossVenue),pct(change(d.crossVenue,p.crossVenue)),"Cross-venue return","good")}
  </div>
  <div class="grid two-even">
    ${card("Visit Frequency","แสดง 1 ครั้งและ 4 ครั้งขึ้นไปเป็น Headline พร้อมรายละเอียด 2–3 ครั้ง",barRows([["1 ครั้ง",d.oneTime,fmt(d.oneTime)],["2 ครั้ง",d.twoTimes,fmt(d.twoTimes)],["3 ครั้ง",d.threeTimes,fmt(d.threeTimes)],["4 ครั้งขึ้นไป",d.fourPlus,fmt(d.fourPlus)]]))}
    ${card("Segment Insight","ใช้ Selector แทนการแสดงทุก Segment พร้อมกัน",`<div class="metric-toolbar"><div class="field"><label for="segmentSelect">กลุ่มที่ต้องการดู</label><select id="segmentSelect"><option value="frequent">มาบ่อยที่สุด</option><option value="engagement">Engagement สูงสุด</option><option value="repeat">Repeat สูงสุด</option><option value="nsc">NSC Usage สูงสุด</option></select></div></div><div class="stat" style="margin-top:14px"><b>${segmentMap[state.segmentMetric]}</b><p>${g} · อายุ ${a}</p></div>`)}
  </div>
  <div class="grid two-even">
    ${card("สัดส่วนเพศ","ชาย / หญิง / LGBTQ",stacked(genders,d.unique))}
    ${card("ช่วงอายุ","20–30 / 31–40 / 41–50 / 51–60 / 61–70",barRows(ages.map(x=>[x[0],x[1],fmt(x[1])])))}
  </div>
  <div class="grid two-even">
    ${card("ช่องทาง Login","LINE และ Email",stacked([["LINE",d.lineLogin],["Email",d.emailLogin]],d.unique))}
    ${card("ระบบอุปกรณ์","iOS และ Android",stacked([["iOS",d.ios],["Android",d.android]],d.unique))}
  </div>`
}
function engagementPage(d,p){
  const summary=`${card("Engagement Summary","Summary 3 metrics โดยไม่เพิ่ม Headline KPI Cards",`<div class="summary-strip"><div class="stat"><b>Engagement Rate รวม</b><strong>${d.engagementRate.toFixed(1)}%</strong><p>${pp(d.engagementRate-p.engagementRate)} เทียบ ${compareLabel()}</p></div><div class="stat"><b>Engagement ต่อผู้ใช้</b><strong>${d.engagementPerUser.toFixed(1)}</strong><p>${pct(change(d.engagementPerUser,p.engagementPerUser))} เทียบ ${compareLabel()}</p></div><div class="stat"><b>Engagement ต่อ Session</b><strong>${d.engagementPerSession.toFixed(1)}</strong><p>${pct(change(d.engagementPerSession,p.engagementPerSession))} เทียบ ${compareLabel()}</p></div></div>`)}`;
  let body="";
  if(state.engageTab==="cheers")body=`<div class="grid kpis">${kpi("Cheers ที่ส่งทั้งหมด",fmt(d.cheersSent),pct(change(d.cheersSent,p.cheersSent)),periodLabel(),"good")}${kpi("ผู้ส่ง Cheers แบบ Unique",fmt(d.cheersSenders),pct(change(d.cheersSenders,p.cheersSenders)),periodLabel(),"good")}${kpi("ผู้ได้รับ Cheers แบบ Unique",fmt(d.cheersReceivers),pct(change(d.cheersReceivers,p.cheersReceivers)),periodLabel(),"good")}${kpi("Cheers Acceptance Rate",d.cheersAcceptance.toFixed(1)+"%",pp(d.cheersAcceptance-p.cheersAcceptance),"Accepted / Sent","good")}</div><div class="grid two-even">${card("ผลลัพธ์ของ Cheers","ตอบรับ ปฏิเสธ และหมดอายุ",barRows([["ตอบรับ",d.accepted,fmt(d.accepted)],["ปฏิเสธ",d.rejected,fmt(d.rejected)],["หมดอายุ / ไม่มีการตอบ",d.expired,fmt(d.expired)]]))}${card("Cheers per Active User","จำนวน Cheers ต่อผู้ใช้ NearSip ที่ Active",`<div class="k-value">${d.cheersPerActive.toFixed(1)}</div><p>${pct(change(d.cheersPerActive,p.cheersPerActive))} เทียบ ${compareLabel()}</p>`)}</div>`;
  if(state.engageTab==="match")body=`<div class="grid kpis">${kpi("Match ทั้งหมด",fmt(d.matches),pct(change(d.matches,p.matches)),periodLabel(),"good")}${kpi("ผู้ใช้เกิด Match ≥1 ครั้ง",fmt(d.matchedUsers),pct(change(d.matchedUsers,p.matchedUsers)),periodLabel(),"good")}${kpi("Match Rate",d.matchRate.toFixed(1)+"%",pp(d.matchRate-p.matchRate),"Matched users / Unique users","good")}${kpi("Match มากกว่าหนึ่งครั้ง",fmt(d.multiMatch),pct(change(d.multiMatch,p.multiMatch)),periodLabel(),"good")}</div>`;
  if(state.engageTab==="chat")body=`<div class="grid kpis">${kpi("Chat เริ่มต้นสำเร็จ",fmt(d.chats),pct(change(d.chats,p.chats)),periodLabel(),"good")}${kpi("Meaningful Chat",fmt(d.meaningfulChats),pct(change(d.meaningfulChats,p.meaningfulChats)),periodLabel(),"good")}${kpi("Chat Activation Rate",d.chatActivation.toFixed(1)+"%",pp(d.chatActivation-p.chatActivation),"Chats / Matches","good")}</div>`;
  if(state.engageTab==="retention"){
    body=`<div class="grid kpis">${kpi("Repeat 7 วัน",fmt(d.repeat7),pct(change(d.repeat7,p.repeat7)),periodLabel(),"good")}${kpi("Repeat 30 วัน",fmt(d.repeat30),pct(change(d.repeat30,p.repeat30)),periodLabel(),"good")}${kpi("Repeat 60 วัน",fmt(d.repeat60),pct(change(d.repeat60,p.repeat60)),periodLabel(),"good")}${kpi("Repeat 90 วัน",fmt(d.repeat90),pct(change(d.repeat90,p.repeat90)),periodLabel(),"good")}${kpi("กลับมาร้านเดิม 7 วัน",fmt(d.same7),pct(change(d.same7,p.same7)),periodLabel(),"good")}${kpi("กลับมาร้านเดิม 30 วัน",fmt(d.same30),pct(change(d.same30,p.same30)),periodLabel(),"good")}</div>
    <div class="grid two-even">${card("Cross-venue Repeat","กลับมา NearSip ซ้ำแต่ไปร้านอื่น",barRows([["ร้านอื่น",d.crossVenue,fmt(d.crossVenue)],["ร้านอื่นในจังหวัดเดิม",d.sameProvinceOther,fmt(d.sameProvinceOther)]]))}${card("Visit Frequency","ผู้ใช้ที่มา 1 / 2 / 3 / 4+ ครั้ง",barRows([["1 ครั้ง",d.oneTime,fmt(d.oneTime)],["2 ครั้ง",d.twoTimes,fmt(d.twoTimes)],["3 ครั้ง",d.threeTimes,fmt(d.threeTimes)],["4+ ครั้ง",d.fourPlus,fmt(d.fourPlus)]]))}</div>
    ${card("Retention Cohort","แยกตามเดือนที่เริ่มใช้ · Observation window ไม่ครบแสดง —",`<div class="heatmap-wrap"><div class="heatmap"><div class="h">Cohort</div><div class="h">M0</div><div class="h">M1</div><div class="h">M2</div><div class="h">M3</div><div class="h">M4</div><div class="h">M5</div><div class="h">M6</div>${["Jan","Feb","Mar","Apr","May","Jun"].map((m,ri)=>`<div class="r">${m}</div>${[100,58-ri,48-ri,41-ri,36-ri,31-ri,28-ri].map((v,ci)=>`<div class="${ci===0?"c4":v>=48?"c3":v>=36?"c2":"c1"}">${ri+ci>8?"—":v+"%"}</div>`).join("")}`).join("")}</div></div>`)}
    <div class="grid two-even" style="margin-top:14px">${card("Retention แยกร้าน","Top venues",barRows(rankingData(d,"repeat").rows.slice(0,6).map(r=>[r.venue,r.value,r.value.toFixed(1)+"%"])))}${card("Retention แยกจังหวัด","Partner-venue users",barRows(provinceData().map(x=>[x.province,32+(hash(x.province+"ret")%180)/10,(32+(hash(x.province+"ret")%180)/10).toFixed(1)+"%"])))} </div>`;
  }
  return`${hero("Engagement & Retention","Cheers, Match, Chat และ Repeat/Retention ผ่าน Sub-tabs","ไม่แสดงทุก Metric พร้อมกัน")}
  <div class="seg" style="width:max-content;margin-bottom:14px"><button data-engage="cheers" class="${state.engageTab==="cheers"?"active":""}">Cheers</button><button data-engage="match" class="${state.engageTab==="match"?"active":""}">Match</button><button data-engage="chat" class="${state.engageTab==="chat"?"active":""}">Chat</button><button data-engage="retention" class="${state.engageTab==="retention"?"active":""}">Retention</button></div>
  ${summary}${body}`
}
function timePage(d,p,realtime=false){
  const points=state.granularity==="15m"?24:state.granularity==="30m"?12:8;
  const labels=Array.from({length:points},(_,i)=>state.granularity==="15m"?`${18+Math.floor(i/4)}:${String((i%4)*15).padStart(2,"0")}`:state.granularity==="30m"?`${18+Math.floor(i/2)}:${i%2?"30":"00"}`:`${18+i}:00`);
  const totals={users:realtime?d.activeNow*5:d.unique,cheers:realtime?d.activeNow*8:d.cheersSent,match:realtime?d.activeNow*2:d.matches,chat:realtime?d.activeChatsNow*4:d.chats,nsc:realtime?d.activeNow*20:d.nscConsumed,topup:realtime?d.activeNow*25:d.nscPurchased};
  const current=timeSeries(totals[state.timeMetric],points,"time-"+state.timeMetric),compare=current.map((x,i)=>Math.round(x*(.82+(i%3)*.05)));
  const metrics={users:"ผู้ใช้ NearSip",cheers:"Cheers",match:"Match",chat:"Chat",nsc:"NSC Usage",topup:"Top-up"};
  const peakMetric=(m)=>{const arr=timeSeries(totals[m],points,"peak-"+m);return labels[arr.indexOf(Math.max(...arr))]};
  return`${hero(realtime?"Tonight Timeline & Peak":"Time & Night Pattern","กราฟ Timeline เดียว เปลี่ยน Metric และ Granularity ได้",realtime?"Mock Real-time Data":state.businessNight)}
  <div class="grid kpis">
    ${kpi("Peak Users Time",peakMetric("users"),"ช่วงเวลาสูงสุด","Business Night","neutral")}
    ${kpi("Peak Cheers Time",peakMetric("cheers"),"ช่วงเวลาสูงสุด","Business Night","neutral")}
    ${kpi("Peak Match Time",peakMetric("match"),"ช่วงเวลาสูงสุด","Business Night","neutral")}
    ${kpi("Peak NSC Usage Time",peakMetric("nsc"),"ช่วงเวลาสูงสุด","Business Night","neutral")}
    ${kpi("Peak Top-up Time",peakMetric("topup"),"ช่วงเวลาสูงสุด","Business Night","neutral")}
  </div>
  ${card("Timeline","Metric selector และ Time granularity",`<div class="metric-toolbar"><div class="field"><label for="timeMetricSelect">Metric</label><select id="timeMetricSelect"><option value="users">ผู้ใช้ NearSip</option><option value="cheers">Cheers</option><option value="match">Match</option><option value="chat">Chat</option><option value="nsc">NSC Usage</option><option value="topup">Top-up</option></select></div><div class="seg"><button data-gran="15m" class="${state.granularity==="15m"?"active":""}">15 นาที</button><button data-gran="30m" class="${state.granularity==="30m"?"active":""}">30 นาที</button><button data-gran="1h" class="${state.granularity==="1h"?"active":""}">1 ชั่วโมง</button></div></div>${lineChart([{name:realtime?"คืนนี้":periodLabel(),values:current},{name:realtime?"คืนเทียบเคียง":compareLabel(),values:compare}],labels,metrics[state.timeMetric]+" ตามเวลา",state.timeMetric==="nsc"||state.timeMetric==="topup"?"NSC":"จำนวน")}`)}
  <div class="grid two-even" style="margin-top:14px">
    ${card("รูปแบบเวลาในแต่ละวันของสัปดาห์","Heatmap สรุป ไม่เพิ่มกราฟแยกทุกวัน",`<div class="heatmap-wrap"><div class="heatmap"><div class="h">เวลา</div>${["จ","อ","พ","พฤ","ศ","ส","อา"].map(x=>`<div class="h">${x}</div>`).join("")}${["18–20","20–22","22–00","00–02"].map((t,ri)=>`<div class="r">${t}</div>${[0,1,2,3,4,5,6].map(di=>{const v=45+hash(t+di+scopeName())%50;return`<div class="${v>80?"c4":v>68?"c3":v>55?"c2":"c1"}">${v}</div>`}).join("")}`).join("")}</div></div>`)}
    ${card("Peak Comparison","ร้าน จังหวัด และประเทศ",desktopAndMobileTable(["ระดับ","Peak Users","Peak Cheers","Peak Match","Peak NSC","Peak Top-up"],[["ร้าน","22:30","23:00","23:15","23:30","23:45"],["จังหวัด","22:45","23:15","23:30","23:45","00:00"],["ประเทศไทย","23:00","23:15","23:45","00:00","00:15"]],[mobileCard("ร้าน","Scope ระดับร้าน","22:30","",[["Cheers","23:00"],["Match","23:15"],["NSC","23:30"],["Top-up","23:45"]]),mobileCard("จังหวัด","Scope ระดับจังหวัด","22:45","",[["Cheers","23:15"],["Match","23:30"],["NSC","23:45"],["Top-up","00:00"]]),mobileCard("ประเทศไทย","Scope ระดับประเทศ","23:00","",[["Cheers","23:15"],["Match","23:45"],["NSC","00:00"],["Top-up","00:15"]])]))}
  </div>`
}
function nscRevenuePage(d,p){
  let body="";
  if(state.nscTab==="nsc"){
    const topStore=rankingData(d,"nsc").rows[0],topProvince=provinceData().sort((a,b)=>b.nscConsumed-a.nscConsumed)[0],topFeature=["Premium Cheers","Spotlight Profile","VIP Match","Dashboard Insight"][hash(scopeName()+"feature")%4];
    body=`<div class="grid kpis">${kpi("NSC Purchased",fmt(d.nscPurchased),pct(change(d.nscPurchased,p.nscPurchased)),periodLabel(),"good")}${kpi("รายการ Top-up",fmt(d.topupTx),pct(change(d.topupTx,p.topupTx)),periodLabel(),"good")}${kpi("ผู้เติม NSC แบบ Unique",fmt(d.uniqueTopup),pct(change(d.uniqueTopup,p.uniqueTopup)),periodLabel(),"good")}${kpi("ผู้เติมซ้ำ",fmt(d.repeatTopup),pct(change(d.repeatTopup,p.repeatTopup)),periodLabel(),"good")}${kpi("NSC Consumed",fmt(d.nscConsumed),pct(change(d.nscConsumed,p.nscConsumed)),periodLabel(),"good")}${kpi("NSC Outstanding",fmt(d.outstanding),pct(change(d.outstanding,p.outstanding)),periodLabel(),"neutral")}</div>
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
    body=`<div class="grid kpis">${kpi("เงินรับจากการซื้อ NSC",money(d.cashReceived),pct(change(d.cashReceived,p.cashReceived)),periodLabel(),"good")}${kpi("รายได้ Dashboard Unlock",money(d.merchantRevenue),pct(change(d.merchantRevenue,p.merchantRevenue)),periodLabel(),"good")}${kpi("รายได้ Feature Unlock",money(d.featureRevenue),pct(change(d.featureRevenue,p.featureRevenue)),periodLabel(),"good")}${kpi("รายได้ที่รับรู้ทั้งหมด",money(d.recognizedRevenue),pct(change(d.recognizedRevenue,p.recognizedRevenue)),periodLabel(),"good")}${kpi("รายได้เฉลี่ยต่อร้าน",money(d.avgRevenuePerVenue),pct(change(d.avgRevenuePerVenue,p.avgRevenuePerVenue)),periodLabel(),"good")}${kpi("รายได้เฉลี่ยต่อ Active Venue",money(d.avgRevenuePerActiveVenue),pct(change(d.avgRevenuePerActiveVenue,p.avgRevenuePerActiveVenue)),periodLabel(),"good")}</div>
    <div class="grid two">${card("Revenue Trend","รายวัน / รายสัปดาห์ / รายเดือน",`<div class="seg" style="width:max-content"><button data-revtrend="daily" class="${state.revenueTrend==="daily"?"active":""}">รายวัน</button><button data-revtrend="weekly" class="${state.revenueTrend==="weekly"?"active":""}">รายสัปดาห์</button><button data-revtrend="monthly" class="${state.revenueTrend==="monthly"?"active":""}">รายเดือน</button></div>${lineChart([{name:periodLabel(),values:series},{name:compareLabel(),values:prior}],labels,"แนวโน้มรายได้ที่รับรู้","บาท")}`)}${card("Revenue Separation","เงินรับ เครดิต และรายได้ที่รับรู้",`<div class="table-wrap"><table><tbody><tr><td>NSC Purchased</td><td>${fmt(d.nscPurchased)} NSC</td></tr><tr><td>NSC Consumed</td><td>${fmt(d.nscConsumed)} NSC</td></tr><tr><td>NSC Transfer</td><td>${fmt(d.transfer)} NSC</td></tr><tr><td>เงินรับจาก NSC</td><td>${money(d.cashReceived)}</td></tr><tr><td>รายได้ที่รับรู้</td><td>${money(d.recognizedRevenue)}</td></tr></tbody></table></div>`)} </div>
    ${card("Revenue Ranking","ตารางเดียว เปลี่ยน Feature / Province / Venue",`<div class="metric-toolbar"><div class="field"><label for="revenueRankSelect">จัดอันดับตาม</label><select id="revenueRankSelect"><option value="feature">ฟีเจอร์</option><option value="province">จังหวัด</option><option value="venue">ร้าน</option></select></div></div>${desktopAndMobileTable(["#","รายการ","รายได้"],rankRows.map((x,i)=>[i+1,x[0],money(x[1])]),rankRows.map((x,i)=>mobileCard((i+1)+". "+x[0],"Revenue ranking",money(x[1]),"",[])))}`)}`;
  }
  return`${hero("NSC & Revenue","แยก NSC Economy ออกจาก Revenue อย่างชัดเจน","Transfer ≠ New Revenue")}
  <div class="seg" style="width:max-content;margin-bottom:14px"><button data-nsctab="nsc" class="${state.nscTab==="nsc"?"active":""}">NSC Economy</button><button data-nsctab="revenue" class="${state.nscTab==="revenue"?"active":""}">Revenue</button></div>${body}`
}
function merchantPage(d,p){
  const rows=d.rows.slice().sort((a,b)=>{if(state.merchantSort==="lastAccess")return a.lastAccessMinutes-b.lastAccessMinutes;if(state.merchantSort==="nsc")return b.dashboardUnlock-a.dashboardUnlock;if(state.merchantSort==="unlock")return b.unlockFrequency-a.unlockFrequency;return b.dashMonthly-a.dashMonthly});
  return`${hero("Merchant Success","NMB และ Merchant Dashboard Usage","ตารางร้านเพียงชุดเดียว")}
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
  const labels=state.granularity==="15m"?Array.from({length:24},(_,i)=>`${18+Math.floor(i/4)}:${String((i%4)*15).padStart(2,"0")}`):state.granularity==="30m"?Array.from({length:12},(_,i)=>`${18+Math.floor(i/2)}:${i%2?"30":"00"}`):["18:00","19:00","20:00","21:00","22:00","23:00","00:00","01:00"];
  const points=labels.length;
  const metricTotals={users:d.unique,cheers:d.cheersSent,match:d.matches,chat:d.chats,nsc:d.nscConsumed,topup:d.nscPurchased};
  const current=timeSeries(metricTotals[state.timeMetric],points,"rt-"+state.timeMetric),prev=current.map((x,i)=>Math.round(x*(.82+(i%3)*.05)));
  const peakMetric=(m)=>{const arr=timeSeries(metricTotals[m],points,"peak-"+m);return labels[arr.indexOf(Math.max(...arr))]};
  return `${hero("สถานะตอนนี้","รวมข้อมูล Real-time สำคัญทั้งหมดไว้ในหน้าเดียวสำหรับเฝ้าดูแบบสด","MOCK REAL-TIME DATA · NOT PRODUCTION DATA")}

  <section class="card" style="padding:18px;margin-bottom:16px">
    <div class="card-head"><div><h3>Focus Cards — Real-time ที่ต้องเห็นก่อน</h3><p>ตัวเลขใหญ่คือ Real-time ตอนนี้ และตัวเลขเล็กสีทองด้านล่างคือยอดรวมทั้งคืนจนถึงปัจจุบัน</p></div><span class="tag warn">TV Monitoring Ready</span></div>
    <div class="rt-focus-grid">
      ${focusCard({span:"double",tone:"primary",pill:"Critical KPI",title:"จำนวนร้านที่ออนไลน์ตอนนี้",current:fmt(d.onlineNow),tonight:fmt(d.onlineTonight),note:"ร้านที่ยัง Online ใน current moment เทียบกับร้านที่เคย Online ตลอดคืนนี้",footer:`<span>ณ ตอนนี้: ${d.onlineNow} ร้าน</span><span>คืนนี้สะสม: ${d.onlineTonight} ร้าน</span>`})}
      ${focusCard({span:"double",tone:"secondary",pill:"Critical KPI",title:"ผู้ใช้ NearSip ที่ Active ตอนนี้",current:fmt(d.activeNow),tonight:fmt(d.unique),note:"ใช้เพื่อเฝ้าดูปริมาณผู้ใช้ที่กำลัง Active เทียบกับยอดผู้ใช้สะสมคืนนี้",footer:`<span>ผู้ใช้ใหม่ตอนนี้: ${fmt(d.newNow)}</span><span>ผู้ใช้เดิมตอนนี้: ${fmt(d.returningNow)}</span>`})}
      ${focusCard({span:"double",tone:"tertiary",pill:"Critical KPI",title:"NSC Usage ตอนนี้",current:fmt(d.nscNow),tonight:fmt(d.nscConsumed),note:"เฝ้าดูแรงใช้ NSC แบบสด พร้อมเทียบยอด NSC Used ทั้งคืน",footer:`<span>Top-up ตอนนี้: ${fmt(Math.round(d.nscNow*1.3))}</span><span>Top-up คืนนี้: ${fmt(d.nscPurchased)}</span>`})}
      ${combinedInteractionCard({cheersNow,cheersNight:d.cheersSent,matchNow,matchNight:d.matches,chatNow,chatNight:d.chats})}
    </div>
  </section>

  ${card("เพศของผู้ใช้ ณ ตอนนี้","แสดงทั้งตัวเลขและ Pie Chart โดยมีตัวเลขสะสมคืนนี้ใต้ทุกกรอบ",`
    <div class="grid kpis" style="grid-template-columns:repeat(3,1fr);margin-bottom:12px">
      ${kpi("ชาย ณ ตอนนี้",fmt(d.mNow),`รวมทั้งคืน ${fmt(d.male)}`,"ตัวเลขใหญ่ = Real-time · ตัวเลขล่าง = สะสมคืนนี้","good")}
      ${kpi("หญิง ณ ตอนนี้",fmt(d.fNow),`รวมทั้งคืน ${fmt(d.female)}`,"ตัวเลขใหญ่ = Real-time · ตัวเลขล่าง = สะสมคืนนี้","good")}
      ${kpi("LGBTQ ณ ตอนนี้",fmt(d.lNow),`รวมทั้งคืน ${fmt(d.lgbtq)}`,"ตัวเลขใหญ่ = Real-time · ตัวเลขล่าง = สะสมคืนนี้","good")}
    </div>
    <div class="pie-grid">
      ${card("Gender Pie","สัดส่วนผู้ใช้ NearSip ที่ Active ตอนนี้",pieChart(genderNow,d.activeNow,"Active\\n"+fmt(d.activeNow)),"<span class='tag info'>Current State</span>")}
      ${card("Login Breakdown","LINE และ Email พร้อมยอดรวมคืนนี้",`
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
      ${kpi("อายุ 20–30",fmt(d.a20Now),`รวมทั้งคืน ${fmt(d.a20)}`,"Real-time vs tonight-to-date","good")}
      ${kpi("อายุ 31–40",fmt(d.a31Now),`รวมทั้งคืน ${fmt(d.a31)}`,"Real-time vs tonight-to-date","good")}
      ${kpi("อายุ 41–50",fmt(d.a41Now),`รวมทั้งคืน ${fmt(d.a41)}`,"Real-time vs tonight-to-date","good")}
      ${kpi("อายุ 51–60",fmt(d.a51Now),`รวมทั้งคืน ${fmt(d.a51)}`,"Real-time vs tonight-to-date","good")}
      ${kpi("อายุ 61–70",fmt(d.a61Now),`รวมทั้งคืน ${fmt(d.a61)}`,"Real-time vs tonight-to-date","good")}
    </div>
    <div class="pie-grid">
      ${card("Age Pie","สัดส่วนผู้ใช้ Active ตอนนี้แยกตามช่วงอายุ",pieChart(ageNow,d.activeNow,"Active\\n"+fmt(d.activeNow)),"<span class='tag info'>Current State</span>")}
      ${card("Current Snapshot","สรุปข้อมูลสดที่ต้องเห็นในหน้าจอเดียว",`
        <div class="mini-grid">
          <div class="mini-stat"><b>Scope</b><strong>${scopeName()}</strong></div>
          <div class="mini-stat"><b>Business Night</b><strong>${state.businessNight}</strong></div>
          <div class="mini-stat"><b>Last Updated</b><strong>15:53</strong></div>
          <div class="mini-stat"><b>Peak Users</b><strong>${peakMetric("users")}</strong></div>
          <div class="mini-stat"><b>Peak NSC</b><strong>${peakMetric("nsc")}</strong></div>
        </div>
      `,"<span class='tag info'>Always-visible Summary</span>")}
    </div>
  `)}

  ${card("Tonight-to-date — สะสมของคืนนี้","รวมไว้ในหน้าเดียว ไม่ต้องสลับหน้าเพื่อดูยอดสะสมคืนนี้",`
    <div class="grid kpis">
      ${kpi("Unique Users สะสมคืนนี้",fmt(d.unique),pct(change(d.unique,p.unique)),"คืนเทียบเคียง","good")}
      ${kpi("ผู้ใช้ใหม่สะสมคืนนี้",fmt(d.newUsers),pct(change(d.newUsers,p.newUsers)),"คืนเทียบเคียง","good")}
      ${kpi("ผู้ใช้เดิมสะสมคืนนี้",fmt(d.existing),pct(change(d.existing,p.existing)),"คืนเทียบเคียง","good")}
      ${kpi("ผู้ใช้เฉลี่ยต่อชั่วโมง",fmt(d.unique/8),pct(change(d.unique/8,p.unique/8)),"8-hour mock window","good")}
      ${kpi("ผู้ใช้เฉลี่ยต่อร้าน",fmt(d.unique/Math.max(1,d.onlineTonight)),pct(change(d.unique/Math.max(1,d.onlineTonight),p.unique/Math.max(1,p.onlineTonight))),"Online venues tonight","good")}
      ${kpi("NSC Used คืนนี้",fmt(d.nscConsumed),pct(change(d.nscConsumed,p.nscConsumed)),"Tonight-to-date","good")}
    </div>
  `)}

  ${card("Timeline Real-time","กราฟเดียว เปลี่ยน Metric และ Granularity ได้ โดยยังอยู่ในหน้าสถานะตอนนี้หน้าเดียว",`
    <div class="metric-toolbar">
      <div class="field"><label for="timeMetricSelect">Metric</label><select id="timeMetricSelect"><option value="users">ผู้ใช้ NearSip</option><option value="cheers">Cheers</option><option value="match">Match</option><option value="chat">Chat</option><option value="nsc">NSC Usage</option><option value="topup">Top-up</option></select></div>
      <div class="seg"><button data-gran="15m" class="${state.granularity==="15m"?"active":""}">15 นาที</button><button data-gran="30m" class="${state.granularity==="30m"?"active":""}">30 นาที</button><button data-gran="1h" class="${state.granularity==="1h"?"active":""}">1 ชั่วโมง</button></div>
    </div>
    ${lineChart([{name:"คืนนี้",values:current},{name:"คืนเทียบเคียง",values:prev}],labels,"Real-time timeline","จำนวน")}
  `)}

  ${card("Peak Time Summary","สรุปช่วงเวลาสูงสุดที่ควรเห็นในหน้าเดียวเช่นกัน",`
    <div class="mini-grid">
      <div class="mini-stat"><b>Peak Users</b><strong>${peakMetric("users")}</strong></div>
      <div class="mini-stat"><b>Peak Cheers</b><strong>${peakMetric("cheers")}</strong></div>
      <div class="mini-stat"><b>Peak Match</b><strong>${peakMetric("match")}</strong></div>
      <div class="mini-stat"><b>Peak NSC</b><strong>${peakMetric("nsc")}</strong></div>
      <div class="mini-stat"><b>Peak Top-up</b><strong>${peakMetric("topup")}</strong></div>
    </div>
  `)}
  `
}
function renderNav(){
  if(state.mode==="realtime"){document.getElementById("mainNav").innerHTML="";return}
  document.getElementById("mainNav").innerHTML=OVERALL_NAV.map(x=>`<button data-page="${x[0]}" class="${state.page===x[0]?"active":""}">${x[1]}</button>`).join("");
  document.querySelectorAll("#mainNav button").forEach(b=>b.onclick=()=>{state.page=b.dataset.page;render()})
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
  document.querySelectorAll("[data-nsctab]").forEach(b=>b.onclick=()=>{state.nscTab=b.dataset.nsctab;render()});
  document.querySelectorAll("[data-revtrend]").forEach(b=>b.onclick=()=>{state.revenueTrend=b.dataset.revtrend;render()});
  document.querySelectorAll(".chart-dot").forEach(dot=>{
    const show=()=>{const wrap=dot.closest(".chart-wrap"),box=wrap.querySelector(".chart-value");if(box)box.textContent=`${dot.dataset.series} · ${dot.dataset.label}: ${fmt(dot.dataset.value)}`};
    dot.addEventListener("click",show);dot.addEventListener("focus",show)
  })
}
function render(){
  const content=document.getElementById("content");
  try{
    enforceViewerScope();
    const d=aggregate("current"),p=aggregate("prior");renderNav();
    if(!d.rows||d.rows.length===0){
      content.innerHTML=`<div class="empty-state"><h3>ไม่มีข้อมูลสำหรับ Scope นี้</h3><p>ลองเปลี่ยนจังหวัด ร้าน หรือช่วงเวลา โดยค่าตัวกรองเดิมจะยังคงอยู่</p></div>`;
      return
    }
    const pages={executive:execPage,partners:partnersPage,users:usersPage,engagement:engagementPage,time:(a,b)=>timePage(a,b,false),nsc:nscRevenuePage,merchant:merchantPage};
    content.innerHTML=state.mode==="realtime"?realtimePage(d,p):pages[state.page](d,p);
    document.getElementById("contextLine").innerHTML=`<span><strong>${scopeName()}</strong></span><span>Mode: <strong>${state.mode==="overall"?"Overall":"Real-time"}</strong></span><span>Period: <strong>${state.mode==="realtime"?"Current Business Night":periodLabel()}</strong></span><span>Comparison: <strong>${state.mode==="realtime"?"คืนเทียบเคียง":compareLabel()}</strong></span><span>Business Night: <strong>${state.businessNight}</strong></span><span><span class="status-dot"></span>Last Updated: <strong>3 ส.ค. 2026 15:53 ICT</strong></span><span><strong></strong></span>`;
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
  const venues=viewer.role==="owner"?[authorizedVenue]:PROVINCES[state.province];
  ls.querySelector('[value="country"]').disabled=viewer.role!=="admin";ls.querySelector('[value="country"]').hidden=viewer.role!=="admin";
  ls.querySelector('[value="province"]').disabled=viewer.role==="owner";ls.querySelector('[value="province"]').hidden=viewer.role==="owner";
  ls.value=state.level;ls.disabled=viewer.role==="owner";
  ps.innerHTML=provinces.map(p=>`<option ${p===state.province?"selected":""}>${p}</option>`).join("");
  vs.innerHTML=venues.map(v=>`<option ${v===state.venue?"selected":""}>${v}</option>`).join("");
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
function syncModeControls(){const realtime=state.mode==="realtime";document.getElementById("overallBtn").classList.toggle("active",!realtime);document.getElementById("overallBtn").setAttribute("aria-pressed",String(!realtime));document.getElementById("realtimeBtn").classList.toggle("active",realtime);document.getElementById("realtimeBtn").setAttribute("aria-pressed",String(realtime));document.getElementById("periodSelect").disabled=realtime;document.getElementById("compareSelect").disabled=realtime}
function showOverall(){state.mode="overall";state.page="executive";syncModeControls();onModeChange("overall");render()}
function showRealtime(){state.mode="realtime";syncModeControls();onModeChange("realtime");render()}
const controller={showOverall,showRealtime};
activeController=controller;
document.getElementById("filterOpen").onclick=openDrawer;document.getElementById("filterClose").onclick=closeDrawer;document.getElementById("overlay").onclick=closeDrawer;
document.getElementById("levelSelect").onchange=e=>loadingUpdate(()=>{state.level=e.target.value})
document.getElementById("provinceSelect").onchange=e=>loadingUpdate(()=>{state.province=e.target.value;state.venue=PROVINCES[state.province][0]})
document.getElementById("venueSelect").onchange=e=>loadingUpdate(()=>{state.venue=e.target.value})
document.getElementById("periodSelect").onchange=e=>{state.period=e.target.value;state.compare=COMPARES[state.period][0][0];populate();render()}
document.getElementById("compareSelect").onchange=e=>{state.compare=e.target.value;render()}
document.getElementById("nightSelect").onchange=e=>{state.businessNight=e.target.value;render()}
document.getElementById("resetBtn").onclick=()=>{Object.assign(state,{mode:"overall",page:"executive",...initialScope,period:"month",compare:"lastmonth",businessNight:"18:00–02:00"});document.getElementById("levelSelect").value=initialScope.level;document.getElementById("periodSelect").value="month";document.getElementById("nightSelect").value="18:00–02:00";syncModeControls();onModeChange("overall");populate();render();closeDrawer()}
document.getElementById("exportBtn").onclick=()=>{const t=document.getElementById("toast");t.textContent="แสดงปุ่ม Export ตามสิทธิ์ แต่ยังไม่ทำ Export จริง";t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2200)}
const handleOrientationChange=()=>setTimeout(()=>render(),120);
const handleKeyDown=e=>{if(e.key==="Escape")closeDrawer()};
window.addEventListener("orientationchange",handleOrientationChange);
window.addEventListener("keydown",handleKeyDown);
syncModeControls();onModeChange(state.mode);
populate();render();

return()=>{
  window.removeEventListener("orientationchange",handleOrientationChange);
  window.removeEventListener("keydown",handleKeyDown);
  if(activeController===controller)activeController=null;
};
}
