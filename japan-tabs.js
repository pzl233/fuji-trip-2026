/* 区域切换和后续行程；订单编号与个人身份信息不放在公开网页中。 */
const osakaPlaces = {
  ana: {name:'东京 ANA 洲际', lat:35.6682139, lng:139.7408331, type:'hotel', query:'ANA InterContinental Tokyo 1-12-33 Akasaka', source:'https://anaintercontinental-tokyo.jp/location/', reserve:'https://www.ihg.com/hotels/us/en/stay-mgmt/ManageYourStay'},
  rihga: {name:'大阪理嘉皇家酒店', lat:34.690307, lng:135.487277, type:'hotel', query:'RIHGA Royal Hotel Osaka 5-3-68 Nakanoshima Kita-ku', source:'https://www.rihga.com/zh-hans/osaka/location', reserve:'https://www.ihg.com/hotels/us/en/stay-mgmt/ManageYourStay'},
  station: {name:'THE OSAKA STATION HOTEL', lat:34.70037, lng:135.49374, type:'hotel', query:'THE OSAKA STATION HOTEL 3-2-2 Umeda Osaka', source:'https://osakastation-hotel.jp/en/access/', reserve:'https://www.marriott.com/reservation/lookupReservation.mi'},
  voco: {name:'voco Osaka Central', lat:34.6879724, lng:135.4965335, type:'hotel', query:'voco Osaka Central 1-7-1 Kyomachibori Osaka', source:'https://www.ihg.com/voco/hotels/us/en/osaka/osakn/hoteldetail/directions', reserve:'https://www.ihg.com/hotels/us/en/stay-mgmt/ManageYourStay'},
  usj: {name:'日本环球影城', lat:34.66472, lng:135.43306, type:'spot', query:'Universal Studios Japan Osaka', source:'https://www.usj.co.jp/web/en/us/park-guide/schedule/park-hour', reserve:'https://www.usj.co.jp/web/en/us/tickets?lang=en'}
};
const hotelCard = (key,time,desc,detail,budget) => ({...osakaPlaces[key],time,desc,detail,budget,status:'已订 · 请核对订单'});
const osakaDays = [
 {id:7,label:'12/2 周三',title:'东京自由活动',date:'2026年12月2日 · 东京',color:'#63716b',route:'东京 ANA 洲际酒店',drive:'两张酒店订单的连住安排待确认。',meal:'自由安排。',noLine:true,locations:[hotelCard('ana','继续入住','两张订单为同房型，是否连续使用同一间房需确认。','12/2–4 两晚：1 King Classic，2位成人。与12/1订单衔接待确认。','¥73,980 / 2晚 · 付款状态待确认')]},
 {id:8,label:'12/3 周四',title:'东京自由活动',date:'2026年12月3日 · 东京',color:'#63716b',route:'东京 ANA 洲际酒店',drive:'活动尚未安排，保留弹性。',meal:'自由安排。',noLine:true,locations:[hotelCard('ana','继续入住','酒店已订，活动留待安排。','次日11:00前退房。','¥73,980 / 2晚 · 付款状态待确认')]},
 {id:9,label:'12/4 周五',title:'东京 → 大阪',date:'2026年12月4日 · 东京 → 大阪',color:'#987050',route:'东京 ANA 洲际 → 大阪理嘉皇家酒店',drive:'东京至大阪的交通方式及车次待确认；两地不表示已预订交通。',meal:'自由安排。',noLine:true,locations:[hotelCard('ana','11:00前退房','从东京酒店退房后前往大阪。','前往大阪的交通待确认。',''),hotelCard('rihga','15:00后入住','理嘉皇家为大阪主要住宿，至12/8退房。','1 King Standard、2位成人，4晚87,000积分；当地税费可能另计。同日期有重复确认及新大阪假日重叠订单，请核对状态。免费取消截止日本时间12/3 18:00，具体以订单为准。','87,000积分 / 4晚')]},
 {id:10,label:'12/5 周六',title:'大阪自由活动',date:'2026年12月5日 · 大阪',color:'#987050',route:'大阪理嘉皇家酒店 · 自由活动',drive:'当天景点待安排。',meal:'自由安排。',noLine:true,locations:[hotelCard('rihga','继续入住','留一天自由活动。','入住12/4，12/8 11:00前退房。','87,000积分 / 4晚')]},
 {id:11,label:'12/6 周日',title:'大阪自由活动',date:'2026年12月6日 · 大阪',color:'#987050',route:'大阪理嘉皇家酒店 · 自由活动',drive:'当天景点待安排。',meal:'自由安排。',noLine:true,locations:[hotelCard('rihga','继续入住','留一天自由活动。','12/7环球影城门票与酒店去程接驳均待确认。','87,000积分 / 4晚')]},
 {id:12,label:'12/7 周一',title:'日本环球影城 · 暂定',date:'2026年12月7日 · 大阪',color:'#48759b',route:'理嘉皇家酒店 → 日本环球影城',drive:'酒店去程接驳需提前预约；两人座位、营业时间和门票均待确认。',meal:'园区内自由安排。',noLine:true,locations:[hotelCard('rihga','出发前','酒店至环球影城的去程接驳车需预约。','已向酒店询问两人座位；尚未确认。酒店官网说明须提前预约，返程交通另行安排。',''),{...osakaPlaces.usj,time:'全天 · 暂定',desc:'计划当天前往，营业时间、门票及接驳车座位均待确认。',status:'待确认 · 尚未确认门票',detail:'当天安排以官方营业时间、门票及酒店接驳回复为准。'}]},
 {id:13,label:'12/8 周二',title:'转住大阪站酒店',date:'2026年12月8日 · 大阪',color:'#826a92',route:'理嘉皇家酒店 → THE OSAKA STATION HOTEL',drive:'酒店间交通自由选择。',meal:'自由安排。',noLine:true,locations:[hotelCard('rihga','11:00前退房','从理嘉皇家退房。','已确认订单，重复订单状态仍需核对。',''),hotelCard('station','15:00后入住','入住两晚至12/10。','Scenic Allure King、2位成人，¥109,525含税费及服务费。确认原发往另一邮箱，需核对后续变更。日本时间12/7 23:59前免费取消，具体以订单为准。','¥109,525 / 2晚')]},
 {id:14,label:'12/9 周三',title:'大阪自由活动',date:'2026年12月9日 · 大阪',color:'#826a92',route:'大阪站酒店 · 自由活动',drive:'当天景点待安排。',meal:'自由安排。',noLine:true,locations:[hotelCard('station','继续入住','自由活动，次日12:00前退房。','Scenic Allure King、2位成人。','¥109,525 / 2晚')]},
 {id:15,label:'12/10 周四',title:'转住 voco Osaka Central',date:'2026年12月10日 · 大阪',color:'#3c8290',route:'大阪站酒店 → voco Osaka Central',drive:'酒店间交通自由选择。',meal:'自由安排。',noLine:true,locations:[hotelCard('station','12:00前退房','从大阪站酒店退房。','入住及后续变更以原邮箱或万豪账户记录为准。',''),hotelCard('voco','15:00后入住','12/10–11订单仅登记1位成人，需确认增加至2位。','Standard Room，1晚¥19,550，可能另有当地税费；付款状态待确认。免费取消截止日本时间12/9 18:00，具体以订单为准。','¥19,550 / 1晚')]}
];
DAYS.push(...osakaDays);

const osakaStays = [
 ['12/2—4','东京 ANA 洲际','1 King Classic','¥73,980 / 2晚','连住待确认'],
 ['12/4—8','大阪理嘉皇家','1 King Standard · 2位','87,000积分 / 4晚','重复订单待核对'],
 ['12/8—10','大阪站酒店','Scenic Allure King · 2位','¥109,525 / 2晚','另邮箱核对变更'],
 ['12/10','voco Osaka Central','Standard Room','¥19,550 / 1晚','入住人数待确认']
];
function tripSummary(){return `<div class="hero"><p class="eyebrow">JAPAN · 2026</p><h1>日本行程总览</h1><p class="subtitle">2026.11.26 — 12.10 · 两位成人</p></div>
<div class="info-grid"><div class="info-card"><div class="label">11/26—12/1</div><div class="value">富士山自驾、御殿场奥莱、十国峠与小田原</div></div><div class="info-card"><div class="label">12/2—10</div><div class="value">东京 → 大阪；12/7 环球影城暂定</div></div></div>
<div class="section-head">住宿顺序</div><div class="table-wrap"><table><thead><tr><th>日期 / 酒店</th><th>房型与费用</th><th>状态</th></tr></thead><tbody>${STAYS.concat(osakaStays).map(s=>`<tr><td>${esc(s[0])}<br><b>${esc(s[1])}</b></td><td>${esc(s[2])}<br><b>${esc(s[3])}</b></td><td>${esc(s[4])}</td></tr>`).join('')}</tbody></table></div>
<div class="section-head">出发前与途中确认</div><div class="pay-summary">航班最终安排与成田取车衔接；TOKI 和东京 ANA 洲际分开订单的连住；东京至大阪交通；理嘉皇家重复及重叠订单；环球影城门票、营业时间与两人去程接驳；大阪站酒店另一邮箱的后续变更；voco 12/10订单登记人数。</div>
<p class="small-note">点击上方「富士山」或「东京・大阪」查看每日安排。所有时间为当地时间，日期和订单状态以最新记录为准。</p>`;}
function osakaContent(){return `<div class="hero"><p class="eyebrow">TOKYO · OSAKA</p><h1>东京与大阪</h1><p class="subtitle">2026.12.02 — 12.10 · 两位成人</p></div><div class="info-grid"><div class="info-card"><div class="label">12/4—8</div><div class="value">大阪理嘉皇家酒店<br>4晚 · 87,000积分</div></div><div class="info-card"><div class="label">12/7</div><div class="value">环球影城暂定<br>门票和酒店接驳待确认</div></div><div class="info-card"><div class="label">12/8—10</div><div class="value">THE OSAKA STATION HOTEL<br>2晚 · ¥109,525</div></div><div class="info-card"><div class="label">12/10</div><div class="value">voco Osaka Central<br>订单登记人数待确认</div></div></div>
<div class="section-head">每天怎么走</div><div class="day-list">${osakaDays.map(d=>`<button class="card day-button" onclick="go(${d.id})"><div class="name"><span class="dot" style="background:${d.color}"></span>${d.label} · ${d.title}</div><div class="desc">${d.route}</div></button>`).join('')}</div>
<div class="section-head">住宿与已知费用</div><div class="table-wrap"><table><thead><tr><th>日期 / 酒店</th><th>房型与费用</th><th>状态</th></tr></thead><tbody>${osakaStays.map(s=>`<tr><td>${esc(s[0])}<br><b>${esc(s[1])}</b></td><td>${esc(s[2])}<br><b>${esc(s[3])}</b></td><td>${esc(s[4])}</td></tr>`).join('')}</tbody></table></div>
<div class="section-head">待确认</div><div class="pay-summary">东京至大阪交通未确定；理嘉皇家存在同日期重复确认，新大阪假日酒店有重叠记录。12/7环球影城门票和酒店去程接驳尚待确认。大阪站酒店确认发往另一邮箱，请核对变更；voco 12/10订单目前只登记一位成人，需确认增加至两位。</div><p class="small-note">大阪住宿不计入富士山自驾段的费用合计；未注明已付的金额不代表已付款。</p>`;}

const sectionNav = document.createElement('nav');
sectionNav.className='section-nav'; sectionNav.setAttribute('aria-label','行程区域');
tabs.parentNode.insertBefore(sectionNav,tabs);
let activeSection='summary';
const sections=[['summary','总结'],['fuji','富士山'],['osaka','东京・大阪']];
for(const [id,label] of sections){const b=document.createElement('button');b.className='tab';b.dataset.section=id;b.textContent=label;b.addEventListener('click',()=>selectSection(id));sectionNav.appendChild(b);}
function rebuildDays(){
 tabs.innerHTML='';tabs.hidden=activeSection==='summary';
 const ids=activeSection==='fuji'?DAYS.filter(d=>d.id>0&&d.id<=6):osakaDays;
 const overview=document.createElement('button');overview.className='tab';overview.dataset.id='0';overview.textContent='该段总览';overview.addEventListener('click',()=>go(0));tabs.appendChild(overview);
 for(const d of ids){const b=document.createElement('button');b.className='tab';b.dataset.id=d.id;b.textContent=d.label;b.setAttribute('aria-label',d.label+'行程');b.addEventListener('click',()=>go(d.id));tabs.appendChild(b);}
}
function selectSection(section,id=0){
 activeSection=sections.some(s=>s[0]===section)?section:'summary';
 sectionNav.querySelectorAll('button').forEach(b=>{const selected=b.dataset.section===activeSection;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected));});
 rebuildDays();go(id);
}
go=function(id){
 if(id>0){const wanted=id<=6?'fuji':'osaka';if(wanted!==activeSection){selectSection(wanted,id);return;}}
 document.getElementById('content').innerHTML=id?renderDay(id):(activeSection==='summary'?tripSummary():activeSection==='fuji'?overviewContent():osakaContent());
 tabs.querySelectorAll('button').forEach(b=>{const selected=+b.dataset.id===id;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected));});
 showDay(id||({summary:-1,fuji:0,osaka:-2}[activeSection]));
 try{history.replaceState(null,'','#section='+activeSection+(id?'&day='+id:''));}catch(e){}
};
printPlan=function(){const oldSection=activeSection;const selected=Number(location.hash.match(/day=(\d+)/)?.[1]||0);document.getElementById('content').innerHTML=tripSummary()+overviewContent()+DAYS.filter(d=>d.id>0).map(d=>renderDay(d.id)).join('');window.print();selectSection(oldSection,selected);};
const sectionMatch=location.hash.match(/section=(summary|fuji|osaka)/), dayMatch=location.hash.match(/day=(\d+)/);
const initialDay=dayMatch?Number(dayMatch[1]):0;
selectSection(sectionMatch?sectionMatch[1]:(initialDay?(initialDay<=6?'fuji':'osaka'):'summary'),initialDay);
