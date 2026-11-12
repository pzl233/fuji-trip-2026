/* Japan itinerary: render the plan independently of the optional map library. */
(() => {
  'use strict';
  const trip = window.TRIP_DATA;
  const content = document.getElementById('content');
  if (!trip || !content) return;
  const days = Array.isArray(trip.days) ? trip.days : [];
  const stays = Array.isArray(trip.stays) ? trip.stays : [];
  const openItems = Array.isArray(trip.openItems) ? trip.openItems : [];
  const sections = [{ id: 'summary', label: '总结', range: trip.dateRange }, ...(trip.sections || []).filter(s => s.id !== 'summary')];
  const sectionNav = document.getElementById('section-nav');
  const dayTabs = document.getElementById('day-tabs');
  const mapNode = document.getElementById('map');
  const mapStatus = document.getElementById('map-status');
  const mapToggle = document.getElementById('map-toggle-button');
  const locateButton = document.getElementById('locate-button');
  const printButton = document.getElementById('print-button');
  const state = { section: 'summary', day: null, collapsed: false, filters: [] };
  const mapState = { map: null, layers: [], markers: new Map(), groups: new Map(), ready: false, tileLoaded: false, tileFailed: false, userMarker: null };
  const statusText = { confirmed: '已确认', planned: '计划安排', pending: '待确认', optional: '可选', cancelled: '已取消' };
  const typeText = { hotel: '住宿', spot: '景点', food: '用餐', drink: '休息', transport: '交通' };
  const markerCategories = {
    food: { label: '餐饮', drawing: '<path d="M4 3v5a3 3 0 0 0 6 0V3M7 3v18M18 3c-3 3-4 6-4 9h4M18 3v18"/>' },
    spot: { label: '游玩', drawing: '<path d="M9 4h6l2 3h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3z"/><circle cx="12" cy="13" r="4"/>' },
    hotel: { label: '住宿', drawing: '<path d="M3 18v3M21 18v3M3 10V5h18v5M3 14v-4h18v4M2 14h20v4H2zM12 5v5"/>' },
    transport: { label: '交通', drawing: '<rect x="5" y="2" width="14" height="17" rx="4"/><path d="M5 10h14M12 2v8M8 22l2-3M16 22l-2-3"/><path d="M8 15h1M15 15h1"/>' }
  };
  const categoryKeys = Object.keys(markerCategories);
  const validCategory = category => categoryKeys.includes(category);
  const markerCategory = stop => stop.type === 'food' || stop.type === 'drink' ? 'food' : stop.type === 'hotel' ? 'hotel' : stop.type === 'transport' ? 'transport' : 'spot';
  const categoriesOf = stop => {
    const categories = (Array.isArray(stop.categories) ? stop.categories : []).filter(validCategory);
    return categories.length ? [...new Set(categories)] : [markerCategory(stop)];
  };
  const matchesFilters = categories => !state.filters.length || categories.some(category => state.filters.includes(category));
  const categoryIcon = category => `<svg class="map-place-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${markerCategories[category].drawing}</svg>`;
  const esc = value => String(value == null ? '' : value).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const safeId = value => String(value || '').replace(/[^a-zA-Z0-9_-]/g, '-');
  const paragraph = value => esc(value).replace(/\n/g, '<br>');
  const validCoord = place => place && typeof place.lat === 'number' && typeof place.lng === 'number' && Number.isFinite(place.lat) && Number.isFinite(place.lng) && Math.abs(place.lat) <= 90 && Math.abs(place.lng) <= 180;
  const validUrl = value => { try { const url = new URL(value); return /^https?:$/.test(url.protocol) ? url.href : null; } catch (_) { return null; } };
  const statusOf = place => Object.prototype.hasOwnProperty.call(statusText, place?.status) ? place.status : /取消/.test(place?.status || '') ? 'cancelled' : /待|未|核对/.test(place?.status || '') ? 'pending' : /已订|已确认/.test(place?.status || '') ? 'confirmed' : 'planned';
  const statusLabel = place => place?.statusLabel || (Object.prototype.hasOwnProperty.call(statusText, place?.status) ? statusText[place.status] : place?.status) || statusText[statusOf(place)];
  const statusBadge = place => `<span class="trip-status ${statusOf(place)}">${esc(statusLabel(place))}</span>`;
  const dayInSection = (day, section) => section === 'summary' || day.section === section || (day.alsoSections || []).includes(section);
  const visibleDays = () => state.day ? days.filter(d => d.id === state.day) : days.filter(d => dayInSection(d, state.section));
  const stopAnchor = (day, stop) => `stop-${safeId(day.id)}-${safeId(stop.id)}`;
  const stopTarget = stop => stop.query || stop.address || (validCoord(stop) ? `${stop.lat},${stop.lng}` : stop.name);
  function placeUrl(stop) {
    const explicit = validUrl(stop.mapUrl);
    if (explicit) return explicit;
    const vague = /待确认|待定|未指定|未确定|待补|自由活动/.test(`${stop.name || ''} ${stop.query || ''} ${stop.address || ''}`);
    if (validCoord(stop) || (!vague && stop.address) || (!vague && stop.query && statusOf(stop) !== 'pending')) return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(stopTarget(stop))}`;
    return null;
  }
  function link(label, url, primary = false) {
    const href = validUrl(url);
    return href ? `<a class="trip-link${primary ? ' primary' : ''}" href="${esc(href)}" target="_blank" rel="noopener noreferrer">${esc(label)}<span class="sr-only">（新窗口打开）</span></a>` : '';
  }
  function modeKind(mode) {
    const text = String(mode || '').toLowerCase();
    if (!text || /待安排|待确认|待定|未定|unknown|pending/.test(text)) return null;
    if (/jr|地铁|阪急|新干线|银座线|御堂筋线|四桥线|haruka|nozomi|巴士|接驳|缆车|嵯峨野/.test(text)) return 'transit';
    if (/步行|walking|walk/.test(text) && !/出租|taxi|driv|自驾/.test(text)) return 'walking';
    if (/自驾|驾车|driving|drive|出租|打车|taxi/.test(text) && !/jr|新干线|地铁|阪急/.test(text)) return 'driving';
    return 'transit';
  }
  function legEndpoint(day, leg, side) {
    const stop = (day.stops || []).find(s => s.id === leg[side]);
    if (stop) return { ...stop, endpointIsStop: true };
    return { name: leg[`${side}Name`] || leg[`${side}Query`] || '地点待确认', query: leg[`${side}Query`] || '', lat: leg[`${side}Lat`], lng: leg[`${side}Lng`], endpointIsStop: false };
  }
  function legUrl(day, leg) {
    if (validUrl(leg.url)) return leg.url;
    const kind = modeKind(leg.mode);
    if (!kind) return null;
    const from = legEndpoint(day, leg, 'from'), to = legEndpoint(day, leg, 'to');
    const known = endpoint => endpoint.endpointIsStop ? !!placeUrl(endpoint) : !!endpoint.query && !/待确认|待定|未指定|未确定|待补/.test(endpoint.query);
    if (!known(from) || !known(to)) return null;
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(stopTarget(from))}&destination=${encodeURIComponent(stopTarget(to))}&travelmode=${kind}`;
  }
  function legName(day, leg, side) { return legEndpoint(day, leg, side).name; }
  function transportCard(day, leg) {
    const status = statusOf(leg);
    return `<li class="trip-leg"><div class="leg-label">${esc(leg.mode || '交通方式待确认')}${leg.participants ? `<span>${esc(leg.participants)}</span>` : ''}</div><div class="leg-route">${esc(legName(day, leg, 'from'))}<span aria-hidden="true"> → </span>${esc(legName(day, leg, 'to'))}</div><div class="leg-meta">${leg.departure ? `<span>出发${status === 'confirmed' ? '' : '（计划）'}：${esc(leg.departure)}</span>` : ''}${leg.duration ? `<span>预计用时：${esc(leg.duration)}</span>` : ''}${status === 'pending' ? '<span class="leg-pending">班次／安排待确认</span>' : ''}</div>${leg.details ? `<p>${paragraph(leg.details)}</p>` : ''}${legUrl(day, leg) ? `<div class="trip-links">${link(leg.url ? '路线／时刻' : modeKind(leg.mode) === 'walking' ? '步行导航' : modeKind(leg.mode) === 'driving' ? '驾车／打车导航' : '公共交通导航', legUrl(day, leg))}</div>` : ''}</li>`;
  }
  function stopCard(day, stop, number) {
    const status = statusOf(stop), mapUrl = placeUrl(stop), known = validCoord(stop);
    const detail = Array.isArray(stop.details) ? stop.details.join('\n') : stop.details;
    return `<li class="trip-stop" id="${stopAnchor(day, stop)}" data-stop-id="${esc(stop.id)}"><span class="stop-number ${status}" aria-hidden="true">${status === 'optional' ? '选' : number}</span><article class="stop-card"><div class="stop-top"><span class="stop-time">${esc(stop.time || '时间待确认')}</span><span class="stop-type">${esc(typeText[stop.type] || stop.type || '安排')}</span></div><div class="stop-heading"><h3>${esc(stop.name)}</h3>${statusBadge(stop)}</div>${stop.participants ? `<p class="participant-label">${esc(stop.participants)}</p>` : ''}${stop.description ? `<p class="stop-description">${paragraph(stop.description)}</p>` : ''}${stop.address ? `<p class="stop-address">${esc(stop.address)}</p>` : ''}${stop.cost ? `<p class="stop-cost">${esc(stop.cost)}</p>` : ''}${detail ? `<details class="stop-details"><summary>查看安排详情</summary><p>${paragraph(detail)}</p></details>` : ''}<div class="trip-links">${mapUrl ? link(stop.mapLabel || 'Google地图', mapUrl, true) : '<span class="location-pending">具体地址待确认，暂不提供定位</span>'}${known ? `<button type="button" class="trip-link" data-action="focus-stop" data-day="${esc(day.id)}" data-stop="${esc(stop.id)}">地图定位</button>` : ''}${link(stop.bookingLabel || (stop.type === 'hotel' ? '预订管理' : status === 'confirmed' ? '预订入口' : '预约／购票'), stop.bookingUrl)}${link('资料来源', stop.sourceUrl)}</div>${!known && mapUrl ? '<p class="small-note">地图坐标待核实，可先打开外部地图查询。</p>' : ''}</article></li>`;
  }
  function dayIssues(day) { return openItems.filter(item => item.relatedDay === day.id || (Array.isArray(item.relatedDay) && item.relatedDay.includes(day.id))); }
  function openItemsHtml(items, heading = '待确认与出发前待办') {
    if (!items.length) return '';
    return `<section class="open-items-section"><div class="section-heading"><h2>${esc(heading)}</h2><span>${items.length}项</span></div><ul class="open-items">${items.map(item => `<li><div class="open-item-top"><h3>${esc(item.title)}</h3>${item.priority === 'high' || item.priority === 1 ? '<span class="priority-label">优先确认</span>' : ''}</div>${item.date ? `<p class="open-item-date">${esc(item.date)}</p>` : ''}${item.detail ? `<p>${paragraph(item.detail)}</p>` : ''}${item.relatedDay && !Array.isArray(item.relatedDay) && days.some(d => d.id === item.relatedDay) ? `<button class="inline-button" type="button" data-action="day" data-day="${esc(item.relatedDay)}">查看当天安排 →</button>` : ''}</li>`).join('')}</ul></section>`;
  }
  function stayHtml(stay, compact = false) {
    const detail = Array.isArray(stay.details) ? stay.details.join('\n') : stay.details;
    return `<article class="stay-card"><div class="stay-top"><div><span class="small-label">${compact ? '当晚住宿' : esc(stay.dates || '')}${stay.nights ? ` · ${esc(stay.nights)}晚` : ''}</span><h3>${esc(stay.name)}</h3></div>${statusBadge(stay)}</div>${stay.room ? `<p>${esc(stay.room)}</p>` : ''}${stay.cost ? `<p class="stay-cost">${esc(stay.cost)}</p>` : ''}${stay.paymentNote ? `<p class="payment-note">${paragraph(stay.paymentNote)}</p>` : ''}${stay.address ? `<p class="stop-address">${esc(stay.address)}</p>` : ''}${detail ? `<details class="stop-details"><summary>住宿／订单详情</summary><p>${paragraph(detail)}</p></details>` : ''}<div class="trip-links">${link('酒店地图', stay.mapUrl || placeUrl(stay), true)}${link('预订管理', stay.manageUrl)}</div></article>`;
  }
  function staysHtml(selectedStays, heading = '住宿与费用') {
    if (!selectedStays.length) return '';
    return `<section><div class="section-heading"><h2>${esc(heading)}</h2></div><p class="section-caption">费用按整笔订单记录；已预订与已付款分别标注。</p><div class="stays-table-wrap"><table class="stays-table"><thead><tr><th scope="col">日期／住宿</th><th scope="col">房型与订单费用</th><th scope="col">状态与付款</th></tr></thead><tbody>${selectedStays.map(stay => { const details = Array.isArray(stay.details) ? stay.details.join('\n') : stay.details; return `<tr><td><span class="stay-dates">${esc(stay.dates || '')}${stay.nights ? ` · ${esc(stay.nights)}晚` : ''}</span><strong>${esc(stay.name)}</strong>${stay.address ? `<p class="stop-address">${esc(stay.address)}</p>` : ''}<div class="trip-links">${link('地图', stay.mapUrl || placeUrl(stay))}${link('预订管理', stay.manageUrl)}</div>${details ? `<details class="stop-details"><summary>订单详情</summary><p>${paragraph(details)}</p></details>` : ''}</td><td>${stay.room ? `<p>${esc(stay.room)}</p>` : ''}${stay.cost ? `<p class="stay-table-cost">${esc(stay.cost)}</p>` : ''}</td><td>${statusBadge(stay)}${stay.paymentNote ? `<p class="payment-note">${paragraph(stay.paymentNote)}</p>` : '<p class="payment-note">付款状态以订单为准</p>'}</td></tr>`; }).join('')}</tbody></table></div></section>`;
  }
  function renderDay(day, forPrint = false) {
    if (!day) return '<div class="empty-state">没有找到这个日期，请从日期栏选择行程。</div>';
    const stops = day.stops || [], main = stops.filter(s => !['optional', 'cancelled'].includes(statusOf(s))), optional = stops.filter(s => statusOf(s) === 'optional'), cancelled = stops.filter(s => statusOf(s) === 'cancelled');
    const transport = (day.transport || []).filter(leg => statusOf(leg) !== 'cancelled'), renderedLegs = new Set();
    const mainIndex = new Map(main.map((stop, index) => [stop.id, index]));
    const timeline = main.map((stop, index) => {
      const preceding = transport.map((leg, i) => ({ leg, i })).filter(x => x.leg.to === stop.id && statusOf(x.leg) !== 'optional' && !renderedLegs.has(x.i) && (!mainIndex.has(x.leg.from) || mainIndex.get(x.leg.from) < index));
      preceding.forEach(x => renderedLegs.add(x.i));
      const following = transport.map((leg, i) => ({ leg, i })).filter(x => x.leg.from === stop.id && statusOf(x.leg) !== 'optional' && !mainIndex.has(x.leg.to) && !renderedLegs.has(x.i));
      following.forEach(x => renderedLegs.add(x.i));
      return preceding.map(x => transportCard(day, x.leg)).join('') + stopCard(day, stop, index + 1) + following.map(x => transportCard(day, x.leg)).join('');
    }).join('');
    const extraLegs = transport.filter((_, index) => !renderedLegs.has(index));
    const stayIds = Array.isArray(day.lodgingId) ? day.lodgingId : day.lodgingId ? [day.lodgingId] : [];
    const lodging = stays.filter(stay => stayIds.includes(stay.id) && statusOf(stay) !== 'cancelled');
    return `<div class="day-view${forPrint ? ' print-day' : ''}" data-day-view="${esc(day.id)}"><header class="day-heading"><p class="eyebrow">${esc(day.label || day.date || day.id)}</p><h1>${esc(day.title)}</h1>${day.summary ? `<p class="day-summary">${paragraph(day.summary)}</p>` : ''}</header>${day.notes?.length ? `<ul class="day-notes">${day.notes.map(note => `<li>${paragraph(note)}</li>`).join('')}</ul>` : ''}${day.id === '2026-12-10' ? '<p class="branch-note">这天分开行动：机场与voco为两条独立路线，请按各自标注看交通。</p>' : ''}<section><div class="section-heading"><h2>当天安排</h2><span>${main.length}项主线</span></div><ol class="trip-timeline">${timeline || '<li class="empty-state">活动尚未确定，保留弹性。</li>'}</ol></section>${extraLegs.length ? `<section><div class="section-heading"><h2>其他交通、备选与返程</h2></div><ul class="extra-transport">${extraLegs.map(leg => transportCard(day, leg)).join('')}</ul></section>` : ''}${optional.length ? `<section><div class="section-heading"><h2>按当天情况选择</h2><span>不计入主线连线</span></div><ol class="trip-timeline optional-list">${optional.map((stop, index) => stopCard(day, stop, index + 1)).join('')}</ol></section>` : ''}${day.meals ? `<section class="meal-note"><h2>当天用餐</h2><p>${paragraph(day.meals)}</p></section>` : ''}${lodging.length ? `<section><div class="section-heading"><h2>当晚住宿</h2></div>${lodging.map(stay => stayHtml(stay, true)).join('')}</section>` : ''}${openItemsHtml(dayIssues(day), '这天待确认')}${cancelled.length ? `<details class="cancelled-records"><summary>已取消／历史记录（${cancelled.length}项）</summary><ul>${cancelled.map(stop => `<li><strong>${esc(stop.name)}</strong>${statusBadge(stop)}<p>${paragraph(stop.description || stop.details || '')}</p></li>`).join('')}</ul></details>` : ''}<p class="route-disclaimer">${esc(day.routeNote || '地图虚线仅表示已列交通段的起终点，不是实际道路；出发时间与交通用时均为规划预留。')}</p></div>`;
  }
  function daysList(list) {
    return `<div class="day-list">${list.map(day => {
      const confirmed = (day.stops || []).filter(s => statusOf(s) === 'confirmed').length;
      const pending = (day.stops || []).filter(s => statusOf(s) === 'pending').length;
      return `<button type="button" class="day-select-card" data-action="day" data-day="${esc(day.id)}"><span class="day-card-date">${esc(day.label || day.date || day.id)}</span><span class="day-card-title">${esc(day.title)}<span aria-hidden="true">↗</span></span>${day.summary ? `<span class="day-card-summary">${esc(day.summary)}</span>` : ''}<span class="day-card-status">${confirmed ? `<span>${confirmed}项已确认</span>` : ''}${pending ? `<span>${pending}项待确认</span>` : ''}${!confirmed && !pending ? '<span>计划安排</span>' : ''}</span></button>`;
    }).join('')}</div>`;
  }
  function overviewHtml() {
    const section = sections.find(s => s.id === state.section) || sections[0], selectedDays = days.filter(day => dayInSection(day, state.section));
    const stayIds = new Set(selectedDays.flatMap(day => Array.isArray(day.lodgingId) ? day.lodgingId : day.lodgingId ? [day.lodgingId] : []));
    const selectedStays = state.section === 'summary' ? stays.filter(s => statusOf(s) !== 'cancelled') : stays.filter(s => stayIds.has(s.id) && statusOf(s) !== 'cancelled');
    const selectedIssues = state.section === 'summary' ? openItems : openItems.filter(item => selectedDays.some(day => item.relatedDay === day.id || (Array.isArray(item.relatedDay) && item.relatedDay.includes(day.id))));
    const cancelledStays = state.section === 'summary' ? stays.filter(s => statusOf(s) === 'cancelled') : [];
    return `<header class="overview-heading"><p class="eyebrow">JAPAN · 2026</p><h1>${esc(state.section === 'summary' ? trip.title || '日本行程地图' : `${section.label}行程`)}</h1><p>${esc(section.range || trip.dateRange || '')}</p>${trip.travellers ? `<p class="travellers">${esc(trip.travellers)}</p>` : ''}<p class="update-note">更新：${esc(trip.updatedAt || '以最新记录为准')} · 行程时间均为日本当地时间</p></header><div class="status-legend" aria-label="行程状态说明">${['confirmed', 'planned', 'pending', 'optional'].map(status => statusBadge({ status })).join('')}<span>已确认不等于已付款</span></div>${state.section === 'summary' ? '<p class="summary-intro">按日期查看每天的地点、交通和住宿；待定活动也已保留。12月10日开始分开行动。</p>' : ''}<section><div class="section-heading"><h2>每天怎么走</h2><span>${selectedDays.length}天</span></div>${daysList(selectedDays)}</section>${openItemsHtml(selectedIssues)}${staysHtml(selectedStays)}${cancelledStays.length ? `<details class="cancelled-records"><summary>已取消住宿记录（${cancelledStays.length}项）</summary>${cancelledStays.map(stay => stayHtml(stay)).join('')}</details>` : ''}<p class="route-disclaimer">地点顺序与交通时间是参考安排，按当天路况、天气和体力调整。无可靠坐标的待定活动保留在时间轴，不放置猜测地图点。</p>`;
  }
  function renderNav() {
    if (sectionNav) sectionNav.innerHTML = sections.map(section => `<button type="button" class="section-button${section.id === state.section ? ' active' : ''}" data-section="${esc(section.id)}" aria-pressed="${section.id === state.section}">${esc(section.label)}</button>`).join('');
    sectionNav?.querySelector('.section-button.active')?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
    if (!dayTabs) return;
    dayTabs.hidden = state.section === 'summary';
    dayTabs.innerHTML = `<button type="button" class="day-tab${state.day ? '' : ' active'}" data-overview="true" aria-pressed="${!state.day}">该段总览</button>` + days.filter(day => dayInSection(day, state.section)).map(day => `<button type="button" class="day-tab${day.id === state.day ? ' active' : ''}" data-day="${esc(day.id)}" aria-pressed="${day.id === state.day}" aria-label="${esc(day.label || day.id)}行程">${esc(day.label || day.date || day.id)}</button>`).join('');
    dayTabs.querySelector('.day-tab.active')?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
  }
  function render(scroll = false) {
    renderNav();
    updateFilterUi();
    content.innerHTML = state.day ? renderDay(days.find(day => day.id === state.day)) : overviewHtml();
    content.setAttribute('aria-label', state.day ? `${state.day}行程` : `${sections.find(s => s.id === state.section)?.label || '总结'}行程`);
    document.title = `${state.day ? days.find(d => d.id === state.day)?.label + ' · ' : ''}${trip.title || '日本行程地图'}`;
    drawMap();
    if (scroll) content.scrollIntoView({ block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }
  function updateHash(replace = false) {
    const params = new URLSearchParams({ section: state.section });
    if (state.day) params.set('date', state.day);
    if (state.filters.length) params.set('types', state.filters.join(','));
    try { history[replace ? 'replaceState' : 'pushState'](null, '', `#${params.toString()}`); } catch (_) { /* Local-file previews may not permit history changes. */ }
  }
  function readHash() {
    const params = new URLSearchParams(location.hash.slice(1));
    let day = days.find(d => d.id === (params.get('date') || params.get('day')));
    if (!day && /^\d+$/.test(params.get('day') || '')) day = days.find(d => Number(d.legacyId) === Number(params.get('day')));
    const wantedSection = params.get('section');
    state.section = sections.some(s => s.id === wantedSection) ? wantedSection : day?.section || 'summary';
    if (day && (state.section === 'summary' || !dayInSection(day, state.section))) state.section = day.section;
    state.day = day?.id || null;
    const filters = [...new Set((params.get('types') || '').split(',').filter(validCategory))];
    state.filters = filters.length === Object.keys(markerCategories).length ? [] : filters;
  }
  function selectDay(id, scroll = true) {
    const day = days.find(d => d.id === id);
    if (!day) return;
    if (state.section === 'summary' || !dayInSection(day, state.section)) state.section = day.section;
    state.day = day.id; updateHash(); render(scroll);
  }
  function clearMap() { closePlacePopup(); mapState.layers.forEach(layer => mapState.map.removeLayer(layer)); mapState.layers = []; mapState.markers.clear(); mapState.groups.clear(); }
  function mapMessage(text, warning = false) { if (mapStatus) { mapStatus.textContent = text; mapStatus.classList.toggle('is-warning', warning); } }
  function installMapLegend() {
    const panel = mapNode?.closest('.map-panel');
    if (!panel || panel.querySelector('.map-category-legend')) return;
    const legend = document.createElement('div');
    legend.className = 'map-category-legend';
    legend.setAttribute('role', 'group');
    legend.setAttribute('aria-label', '地图类别筛选，可多选；显示匹配任一类别的地点，完整行程保留');
    legend.innerHTML = `<div class="map-filter-items"><button type="button" class="map-filter-button" data-category-filter="all">全部</button>${Object.entries(markerCategories).map(([category, info]) => `<button type="button" class="map-filter-button" data-category-filter="${category}" title="筛选${info.label}，可多选">${categoryIcon(category)}<span>${info.label}</span></button>`).join('')}</div>`;
    legend.addEventListener('click', event => {
      const button = event.target.closest('[data-category-filter]');
      if (!button) return;
      const category = button.dataset.categoryFilter;
      if (category === 'all') state.filters = [];
      else if (validCategory(category)) {
        state.filters = state.filters.includes(category) ? state.filters.filter(value => value !== category) : [...state.filters, category];
        if (state.filters.length === Object.keys(markerCategories).length) state.filters = [];
      }
      updateHash(); updateFilterUi(); drawMap();
    });
    panel.appendChild(legend);
    updateFilterUi();
  }
  function updateFilterUi() {
    const legend = mapNode?.closest('.map-panel')?.querySelector('.map-category-legend');
    legend?.querySelectorAll('[data-category-filter]').forEach(button => {
      const category = button.dataset.categoryFilter;
      const active = category === 'all' ? !state.filters.length : state.filters.includes(category);
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', String(active));
    });
  }
  function popupHtml(day, stop, number) {
    const url = placeUrl(stop);
    return `<div class="trip-popup"><p class="popup-date">${esc(day.label || day.id)} · ${number ? `${number}号地点` : esc(typeText[stop.type] || '地点')}</p><strong>${esc(stop.name)}</strong><p>${esc(stop.time || '时间待确认')}</p>${statusBadge(stop)}${stop.participants ? `<p>${esc(stop.participants)}</p>` : ''}${stop.description ? `<p>${esc(stop.description)}</p>` : ''}${url ? link(stop.mapLabel || 'Google地图', url, true) : ''}</div>`;
  }
  function placeIdentity(stop) {
    if (stop.placeId) return `place:${String(stop.placeId)}`;
    const name = String(stop.query || stop.address || stop.name).normalize('NFKC').replace(/\s+/g, ' ').trim().toLowerCase();
    return `exact:${stop.lat.toFixed(6)}|${stop.lng.toFixed(6)}|${name}`;
  }
  function mapGroups(selected) {
    const groups = new Map();
    let unknown = 0;
    for (const day of selected) {
      let mainNumber = 0;
      for (const stop of day.stops || []) {
        if (statusOf(stop) === 'cancelled') continue;
        const optional = statusOf(stop) === 'optional', categories = categoriesOf(stop);
        if (!optional) mainNumber += 1;
        if (!validCoord(stop)) { if (matchesFilters(categories)) unknown += 1; continue; }
        const key = placeIdentity(stop);
        if (!groups.has(key)) groups.set(key, { key, name: stop.placeName || stop.name, lat: stop.lat, lng: stop.lng, categories: new Set(), entries: [] });
        const group = groups.get(key);
        categories.forEach(category => group.categories.add(category));
        group.entries.push({ day, stop, number: optional ? null : mainNumber, optional });
      }
    }
    return { groups: [...groups.values()], unknown };
  }
  function groupStatus(group) {
    const statuses = group.entries.map(entry => statusOf(entry.stop));
    if (statuses.includes('pending')) return 'pending';
    if (statuses.every(status => status === 'optional')) return 'optional';
    if (statuses.every(status => status === 'confirmed')) return 'confirmed';
    return 'planned';
  }
  function groupBadge(group) {
    if (!state.day) return group.entries.every(entry => entry.optional) ? '选' : null;
    const numbers = [...new Set(group.entries.map(entry => entry.number).filter(Boolean))].sort((a, b) => a - b);
    if (!numbers.length) return '选';
    if (numbers.length === 1) return String(numbers[0]);
    if (numbers.at(-1) - numbers[0] + 1 === numbers.length) return `${numbers[0]}–${numbers.at(-1)}`;
    return numbers.length <= 3 ? numbers.join('·') : `${numbers[0]}…${numbers.at(-1)}`;
  }
  function groupPopupHtml(group) {
    const categories = Object.keys(markerCategories).filter(category => group.categories.has(category));
    const first = group.entries[0].stop;
    return `<div class="trip-popup trip-popup-group"><strong>${esc(group.name)}</strong><p class="popup-categories">${categories.map(category => `<span>${categoryIcon(category)}${esc(markerCategories[category].label)}</span>`).join('')}</p><p class="small-note">${group.entries.length}项安排 · 各项预订状态分别列出</p><div class="trip-popup-entries">${group.entries.map(({ day, stop, number, optional }) => `<article class="trip-popup-entry"><p class="popup-date">${esc(day.label || day.id)} · ${optional ? '可选' : `${number}号安排`}</p><strong>${esc(stop.name)}</strong><p>${esc(stop.time || '时间待确认')}</p>${statusBadge(stop)}${stop.description ? `<p>${paragraph(stop.description)}</p>` : ''}<button type="button" class="trip-link" data-popup-day="${esc(day.id)}" data-popup-stop="${esc(stop.id)}">查看当天安排</button></article>`).join('')}</div>${placeUrl(first) ? link(first.mapLabel || 'Google地图', placeUrl(first), true) : ''}</div>`;
  }
  function closePlacePopup() {
    const panel = mapNode?.closest('.map-panel');
    panel?.querySelector('.map-place-popup')?.remove();
    panel?.classList.remove('popup-open');
  }
  function showPlacePopup(group) {
    if (!group) return;
    closePlacePopup();
    const panel = mapNode.closest('.map-panel'), popup = document.createElement('section');
    popup.className = 'map-place-popup';
    popup.setAttribute('role', 'region');
    popup.setAttribute('aria-label', `${group.name}的行程安排`);
    popup.innerHTML = `<button type="button" class="map-popup-close" data-map-popup-close aria-label="关闭地点详情">×</button><div class="map-place-popup-body">${groupPopupHtml(group)}</div>`;
    panel.appendChild(popup); panel.classList.add('popup-open');
  }
  function drawMap() {
    if (!mapState.ready) { mapMessage('底图暂未载入；下方行程与Google导航仍可使用。', true); return; }
    clearMap();
    const selected = visibleDays(), bounds = [];
    const { groups, unknown } = mapGroups(selected);
    const shown = groups.filter(group => matchesFilters([...group.categories]));
    const optionalCount = shown.filter(group => group.entries.some(entry => entry.optional)).length;
    for (const group of shown) {
      const categories = Object.keys(markerCategories).filter(category => group.categories.has(category));
      const badge = groupBadge(group), status = groupStatus(group), width = categories.length <= 3 ? 36 + 20 * (categories.length - 1) : 56, height = categories.length === 4 ? 52 : 36;
      const marker = window.L.marker([group.lat, group.lng], { riseOnHover: true, riseOffset: 1000, icon: window.L.divIcon({ className: 'trip-pin-wrap', html: `<span class="trip-pin ${status}${categories.length > 1 ? ' trip-pin-multi' : ''}" style="width:${width}px;height:${height}px" data-marker-categories="${esc(categories.join(' '))}" data-place-key="${esc(group.key)}" data-entry-count="${group.entries.length}"><span class="trip-pin-icons">${categories.map(categoryIcon).join('')}</span>${badge != null ? `<span class="trip-pin-index" aria-hidden="true">${esc(badge)}</span>` : ''}</span>`, iconSize: [width, height], iconAnchor: [width / 2, height / 2] }), title: `${group.name} · ${categories.map(category => markerCategories[category].label).join('／')} · ${group.entries.length}项安排${state.day && badge ? ` · ${badge === '选' ? '可选' : `${badge}号`}` : ''}` }).addTo(mapState.map);
      const openGroup = () => { showPlacePopup(group); if (state.day && group.entries.length === 1) highlightStop(group.entries[0].day, group.entries[0].stop); };
      marker.on('click', openGroup);
      marker.getElement()?.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); event.stopPropagation(); openGroup(); } });
      mapState.layers.push(marker);
      group.entries.forEach(({ day, stop }) => { mapState.markers.set(`${day.id}|${stop.id}`, marker); mapState.groups.set(`${day.id}|${stop.id}`, group); });
      bounds.push([group.lat, group.lng]);
    }
    if (state.day && !state.filters.length) {
      for (const day of selected) {
        for (const leg of day.transport || []) {
          if (['optional', 'cancelled'].includes(statusOf(leg))) continue;
          const from = legEndpoint(day, leg, 'from'), to = legEndpoint(day, leg, 'to');
          if (!validCoord(from) || !validCoord(to) || [from, to].some(s => ['optional', 'cancelled'].includes(statusOf(s)))) continue;
          if (from.lat === to.lat && from.lng === to.lng) continue;
          // Draw each transport leg separately: split-traveller days never become one airport-to-hotel route.
          const line = window.L.polyline([[from.lat, from.lng], [to.lat, to.lng]], { color: '#3f7870', weight: 2, opacity: 0.65, dashArray: '5 7' }).addTo(mapState.map).bindTooltip(`${esc(leg.participants || to.participants || '')} ${esc(leg.mode || '交通')} · ${esc(leg.duration || '用时待确认')}（起终点示意）`);
          mapState.layers.push(line); bounds.push([from.lat, from.lng], [to.lat, to.lng]);
        }
      }
    }
    if (bounds.length) mapState.map.fitBounds(bounds, { paddingTopLeft: [52, 32], paddingBottomRight: [52, 88], maxZoom: state.day ? 14 : 12 });
    const filterText = state.filters.map(category => markerCategories[category].label).join('、');
    const parts = [state.filters.length ? `显示${shown.length}/${groups.length}个地点 · 筛选：${filterText}` : `${shown.length}个地点`, optionalCount ? `${optionalCount}处含可选安排` : '', unknown ? `${unknown}项未定位，仍保留在行程` : '', !shown.length ? '此筛选暂无可定位地点，可选“全部”' : state.filters.length ? '完整行程保留；同点展示全部用途' : state.day ? '虚线仅示交通起终点' : '点选查看这处地点的全部安排'].filter(Boolean);
    mapMessage(mapState.tileFailed && !mapState.tileLoaded ? `底图加载异常；${parts.join(' · ')}` : parts.join(' · '), mapState.tileFailed && !mapState.tileLoaded);
  }
  function initMap() {
    if (mapState.ready || !mapNode || !window.L) return;
    try {
      mapNode.replaceChildren();
      const map = window.L.map(mapNode, { center: [35.1, 137.4], zoom: 6, zoomControl: false });
      window.L.control.zoom({ position: 'topright' }).addTo(map);
      const tiles = window.L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' }).addTo(map);
      tiles.on('tileload', () => { if (!mapState.tileLoaded) { mapState.tileLoaded = true; drawMap(); } });
      tiles.on('tileerror', () => { if (!mapState.tileFailed) { mapState.tileFailed = true; mapMessage('部分底图暂时加载失败；地点、行程与外部导航仍可使用。', true); } });
      mapState.map = map; mapState.ready = true; drawMap();
    } catch (_) { mapMessage('地图暂时不可用；行程与Google导航仍可使用。', true); }
  }
  function highlightStop(day, stop) {
    content.querySelectorAll('.trip-stop.is-focused').forEach(el => el.classList.remove('is-focused'));
    const card = document.getElementById(stopAnchor(day, stop));
    if (card) { card.classList.add('is-focused'); card.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  }
  function setMapCollapsed(collapsed) {
    state.collapsed = collapsed; document.body.classList.toggle('map-collapsed', collapsed);
    if (mapToggle) { mapToggle.textContent = collapsed ? '展开地图' : '收起地图'; mapToggle.setAttribute('aria-expanded', String(!collapsed)); }
    if (!collapsed && mapState.map) requestAnimationFrame(() => mapState.map.invalidateSize());
  }
  function focusStop(dayId, stopId, scrollMap = true) {
    const day = days.find(d => d.id === dayId), stop = day?.stops?.find(s => s.id === stopId);
    if (!validCoord(stop) || !mapState.ready) { mapMessage('该地点暂时不能在底图定位，可使用地点卡里的Google地图。', true); return; }
    if (state.day !== day.id) selectDay(day.id, false);
    if (!mapState.markers.has(`${day.id}|${stop.id}`)) {
      state.filters = []; updateHash(true); updateFilterUi(); drawMap();
    }
    setMapCollapsed(false); highlightStop(day, stop);
    mapState.map.setView([stop.lat, stop.lng], 15);
    showPlacePopup(mapState.groups.get(`${day.id}|${stop.id}`));
    if (scrollMap && window.matchMedia('(max-width: 800px)').matches) mapNode.closest('.map-panel')?.scrollIntoView({ block: 'start', behavior: 'smooth' });
  }
  sectionNav?.addEventListener('click', event => { const button = event.target.closest('[data-section]'); if (!button) return; state.section = button.dataset.section; state.day = null; updateHash(); render(true); });
  dayTabs?.addEventListener('click', event => { const button = event.target.closest('button'); if (!button) return; if (button.dataset.overview) { state.day = null; updateHash(); render(true); } else selectDay(button.dataset.day); });
  content.addEventListener('click', event => { const button = event.target.closest('[data-action]'); if (!button) return; if (button.dataset.action === 'day') selectDay(button.dataset.day); else if (button.dataset.action === 'focus-stop') focusStop(button.dataset.day, button.dataset.stop); });
  mapNode?.closest('.map-panel')?.addEventListener('click', event => {
    if (event.target.closest('[data-map-popup-close]')) { closePlacePopup(); return; }
    const button = event.target.closest('[data-popup-day]');
    if (!button) return;
    const day = days.find(item => item.id === button.dataset.popupDay), stop = day?.stops?.find(item => item.id === button.dataset.popupStop);
    if (stop) focusStop(day.id, stop.id, false);
  });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closePlacePopup(); });
  mapToggle?.addEventListener('click', () => setMapCollapsed(!state.collapsed));
  mapToggle?.setAttribute('aria-expanded', 'true');
  locateButton?.addEventListener('click', () => {
    if (!navigator.geolocation || !mapState.ready) { mapMessage('目前无法定位，可直接使用地点卡里的Google导航。', true); return; }
    locateButton.disabled = true; mapMessage('正在获取你的位置…');
    navigator.geolocation.getCurrentPosition(position => {
      const lat = position.coords.latitude, lng = position.coords.longitude;
      if (mapState.userMarker) mapState.map.removeLayer(mapState.userMarker);
      mapState.userMarker = window.L.circleMarker([lat, lng], { radius: 7, color: '#ffffff', weight: 3, fillColor: '#176764', fillOpacity: 1 }).addTo(mapState.map).bindPopup('你的位置');
      setMapCollapsed(false); mapState.map.setView([lat, lng], 13); locateButton.disabled = false; mapMessage('已显示你的位置；导航请打开Google地图。');
    }, () => { locateButton.disabled = false; mapMessage('无法取得位置。可允许浏览器定位，或直接打开地点导航。', true); }, { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 });
  });
  let printing = false;
  function startPrint() { if (printing) return; printing = true; content.innerHTML = `<header class="overview-heading"><h1>${esc(trip.title || '日本行程')}</h1><p>${esc(trip.dateRange)} · 日本当地时间</p></header>` + days.map(day => renderDay(day, true)).join('') + staysHtml(stays.filter(stay => statusOf(stay) !== 'cancelled')) + openItemsHtml(openItems); content.querySelectorAll('details').forEach(detail => { detail.open = true; }); }
  function endPrint() { if (!printing) return; printing = false; render(); }
  printButton?.addEventListener('click', () => { startPrint(); window.print(); });
  window.addEventListener('beforeprint', startPrint); window.addEventListener('afterprint', endPrint);
  window.addEventListener('hashchange', () => { readHash(); render(); });
  window.addEventListener('popstate', () => { readHash(); render(); });
  window.addEventListener('load', initMap);
  installMapLegend(); readHash(); render(); initMap();
})();
