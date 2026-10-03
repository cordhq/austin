/* SunergyX v2 - Paystack Live + WhatsApp Webhook - Fast Cart */
(() => {
  'use strict';

  const CONFIG = {
    CART_KEY: 'sunergyx_cart_v3',
    CUSTOMER_KEY: 'sunergyx_customer',
    PAYSTACK_KEY: 'thq_paystack_key',
    PAYSTACK_KEY_V2: 'sunergyx_paystack_key',
    WA_WEBHOOK: 'sunergyx_whatsapp_webhook',
    WA_NUMBER: 'sunergyx_whatsapp_number',
    DEFAULT_WA: '2347084441471',
    PER_PAGE: 8,
    FALLBACK_IMG: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?q=80&w=400&auto=format&fit=crop',
    SECTIONS: [
      {key:'Panels', title:'Solar Panels'},
      {key:'Inverters', title:'Inverters'},
      {key:'Batteries', title:'Batteries'},
      {key:'Controllers', title:'Charge Controllers'},
      {key:'Breakers', title:'Breakers & Protection'},
      {key:'Cables', title:'Cables'},
      {key:'Accessories', title:'Accessories'}
    ],
    CATEGORY_IMAGES: {
      Panels:'https://images.unsplash.com/photo-1509391365360-2e959784a276?q=80&w=800&auto=format&fit=crop',
      Inverters:'https://images.unsplash.com/photo-1613665813446-82a78c468a1d?q=80&w=800&auto=format&fit=crop',
      Batteries:'https://res.cloudinary.com/ny0or3ln/image/upload/v1790635769/10KWhg_fmpy4h.png',
      Controllers:'https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?q=80&w=800&auto=format&fit=crop',
      Breakers:'https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=800&auto=format&fit=crop',
      Cables:'https://images.unsplash.com/photo-1611365892117-00ac5ef43c90?q=80&w=800&auto=format&fit=crop',
      Accessories:'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?q=80&w=800&auto=format&fit=crop'
    }
  };

  let products = [], searchIndex = [], cart = [], currentList = [], sectionPage = {};
  let paystackKey = '', waWebhook = '', waNumber = CONFIG.DEFAULT_WA;

  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const formatNaira = n => '₦' + Number(n||0).toLocaleString('en-NG');
  const effPrice = p => (p.salePrice && p.salePrice < p.price) ? p.salePrice : p.price;
  const cleanDesc = d => (d||'').replace(/THQ Solar/g,'SunergyX');
  const debounce = (fn, ms=300) => { let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), ms); }; };
  const safeJSON = (k, fallback) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; } catch { return fallback; } };
  const isLiveKey = k => /^pk_live_/i.test(k);
  const isTestKey = k => /^pk_test_/i.test(k);
  const isValidPaystackKey = k => isLiveKey(k) || isTestKey(k);

  function thumb(url, w=400){
    if(!url) return CONFIG.FALLBACK_IMG;
    try{
      if(url.includes('images.unsplash.com')) return /[?&]w=\d+/.test(url) ? url.replace(/([?&])w=\d+/, `$1w=${w}`) : url + `&w=${w}`;
      if(url.includes('res.cloudinary.com') && url.includes('/upload/') && !/\/upload\/[a-z]{1,2}_/.test(url)) return url.replace('/upload/', `/upload/w_${w},q_auto,f_auto/`);
    }catch{}
    return url;
  }

  function showToast(msg, type='info'){
    const container = $('#toastContainer'); if(!container) return;
    const el = document.createElement('div'); el.className = `toast ${type}`; el.textContent = msg;
    el.style.opacity='0'; el.style.transform='translateY(10px)'; el.style.transition='all .25s ease';
    container.appendChild(el);
    requestAnimationFrame(()=>{ el.style.opacity='1'; el.style.transform='translateY(0)'; });
    setTimeout(()=>{ el.style.opacity='0'; el.style.transform='translateY(10px)'; setTimeout(()=>el.remove(),250); }, 4500);
  }

  function loadSettings(){
    try{
      paystackKey = localStorage.getItem(CONFIG.PAYSTACK_KEY_V2) || localStorage.getItem(CONFIG.PAYSTACK_KEY) || '';
      waWebhook = localStorage.getItem(CONFIG.WA_WEBHOOK) || '';
      waNumber = localStorage.getItem(CONFIG.WA_NUMBER) || CONFIG.DEFAULT_WA;
    }catch{}
  }
  function savePaystackKey(key){
    key = (key||'').trim();
    if(key && !isValidPaystackKey(key)){ showToast('Invalid key. Must start with pk_live_ or pk_test_', 'error'); return false; }
    try{
      localStorage.setItem(CONFIG.PAYSTACK_KEY_V2, key); localStorage.setItem(CONFIG.PAYSTACK_KEY, key);
      paystackKey = key; renderSettingsUI();
      showToast(key ? (isLiveKey(key) ? '✅ Live key saved - LIVE payments active!' : '🧪 Test key saved - test mode') : 'Paystack key cleared - simulation mode', key ? 'info' : 'warning');
      return true;
    }catch(e){ showToast('Could not save key','error'); return false; }
  }
  function saveWhatsAppSettings(number, webhook){
    number = (number||'').replace(/\D/g,''); webhook = (webhook||'').trim();
    if(number && !/^\d{10,15}$/.test(number)){ showToast('WhatsApp number must be 10-15 digits, e.g. 2347084441471','error'); return false; }
    if(webhook && !/^https:\/\//i.test(webhook)){ showToast('Webhook must be https:// URL','error'); return false; }
    try{
      if(number) localStorage.setItem(CONFIG.WA_NUMBER, number); else localStorage.removeItem(CONFIG.WA_NUMBER);
      if(webhook) localStorage.setItem(CONFIG.WA_WEBHOOK, webhook); else localStorage.removeItem(CONFIG.WA_WEBHOOK);
      waNumber = number || CONFIG.DEFAULT_WA; waWebhook = webhook || '';
      renderSettingsUI(); showToast('WhatsApp settings saved','info'); return true;
    }catch{ showToast('Could not save','error'); return false; }
  }
  function renderSettingsUI(){
    const payEl = $('#settingPaystackKey'), modeEl = $('#paystackModeBadge'), waNumEl = $('#settingWaNumber'), waHookEl = $('#settingWaWebhook'), statusEl = $('#webhookStatus');
    if(payEl) payEl.value = paystackKey;
    if(modeEl){
      if(!paystackKey){ modeEl.textContent='SIMULATION MODE - no real charge'; modeEl.className='mode-badge sim'; }
      else if(isLiveKey(paystackKey)){ modeEl.textContent='● LIVE MODE - real money'; modeEl.className='mode-badge live'; }
      else { modeEl.textContent='● TEST MODE - use test cards'; modeEl.className='mode-badge test'; }
    }
    if(waNumEl) waNumEl.value = waNumber;
    if(waHookEl) waHookEl.value = waWebhook;
    if(statusEl) statusEl.textContent = waWebhook ? `Webhook active: ${waWebhook.slice(0,42)}...` : `Direct wa.me to ${waNumber} (no webhook)`;
  }

  function saveCart(){ try{ localStorage.setItem(CONFIG.CART_KEY, JSON.stringify(cart)); localStorage.setItem('thq_solar_cart', JSON.stringify(cart)); }catch{} }
  function loadCart(){ cart = safeJSON(CONFIG.CART_KEY, null) || safeJSON('thq_solar_cart', []); if(!Array.isArray(cart)) cart=[]; cart = cart.map(i=>({ ...i, price: i.price ?? effPrice(i), qty: Math.max(1, Number(i.qty)||1) })); }
  const cartCount = () => cart.reduce((s,i)=>s+i.qty,0);
  const cartSubtotal = () => cart.reduce((s,i)=>s+i.price*i.qty,0);

  function addToCart(id){
    const p = products.find(x=>x.id===id); if(!p){ showToast('Product not found','error'); return; }
    const existing = cart.find(i=>i.id===id);
    if(existing){ if(existing.qty >= (p.stock||10)){ showToast(`Only ${p.stock||10} in stock`,'warning'); return; } existing.qty++; }
    else{ cart.push({ id:p.id, title:p.title, image:p.image, price:effPrice(p), brand:p.brand, type:p.type, qty:1, stock:p.stock||10 }); }
    saveCart(); renderCart(); showToast(`${p.title} added`);
    const badge = $('#cartCountBadge'); if(badge){ badge.style.transform='scale(1.3)'; setTimeout(()=>badge.style.transform='scale(1)',180); }
  }
  function updateCartQty(id, delta){ const it = cart.find(i=>i.id===id); if(!it) return; it.qty += delta; if(it.qty <=0){ cart = cart.filter(i=>i.id!==id); showToast('Item removed','info'); } else if(it.qty > (it.stock||10)){ it.qty = it.stock||10; showToast(`Max stock: ${it.stock}`,'warning'); } saveCart(); renderCart(); }
  function removeCartItem(id){ cart = cart.filter(i=>i.id!==id); saveCart(); renderCart(); showToast('Removed','info'); }
  function clearCart(){ if(!cart.length) return; if(!confirm('Clear cart?')) return; cart=[]; saveCart(); renderCart(); showToast('Cart cleared','info'); }

  function renderCart(){
    const badge=$('#cartCountBadge'), subEl=$('#cartSubtotal'), totalEl=$('#cartTotal'), box=$('#cartItemsContainer'); if(!box) return;
    const count=cartCount(), sub=cartSubtotal(); if(badge) badge.textContent=count; if(subEl) subEl.textContent=formatNaira(sub); if(totalEl) totalEl.textContent=formatNaira(sub);
    if(!cart.length){ box.innerHTML=`<div style="text-align:center;padding:40px 20px"><div style="font-size:40px;opacity:.3;margin-bottom:12px">🛒</div><p class="landing-note" style="margin:0">Your cart is empty.</p><a href="#shop" onclick="SunergyX.toggleCart(false)" style="display:inline-block;margin-top:16px;background:#F0FAF4;border:1px solid #D6EEDF;padding:8px 16px;font-size:11px;font-weight:800">Browse Products</a></div>`; return; }
    box.innerHTML = cart.map(i=>`<div class="cart-item"><img src="${thumb(i.image,96)}" alt="${i.title}" width="48" height="48" loading="lazy" onerror="this.src='${CONFIG.FALLBACK_IMG}'"><div style="flex:1;min-width:0"><h4 title="${i.title}">${i.title}</h4><div style="display:flex;gap:6px;align-items:center;margin-top:4px"><b>${formatNaira(i.price)}</b><small style="color:#9CA3AF">x ${i.qty} = ${formatNaira(i.price*i.qty)}</small></div></div><div class="qty"><button onclick="SunergyX.updateCartQty('${i.id}',-1)">−</button><span>${i.qty}</span><button onclick="SunergyX.updateCartQty('${i.id}',1)">+</button></div><button onclick="SunergyX.removeCartItem('${i.id}')" style="background:none;border:none;cursor:pointer;font-size:14px;opacity:.5;margin-left:4px">✕</button></div>`).join('') + `<button id="clearCartBtn" onclick="SunergyX.clearCart()" style="margin:8px auto 0;display:block;background:none;border:none;font-size:11px;color:#9CA3AF;cursor:pointer;text-decoration:underline">Clear Cart</button>`;
  }
  function toggleCart(show){ const drawer=$('#cartDrawer'); if(!drawer) return; const shouldShow = typeof show==='boolean' ? show : drawer.classList.contains('hidden'); drawer.classList.toggle('hidden', !shouldShow); document.body.style.overflow = shouldShow ? 'hidden' : ''; if(shouldShow) renderCart(); }

  function buildSearchIndex(){ searchIndex = products.map(p=> (p.title+' '+(p.brand||'')+' '+(p.type||'')+' '+(p.desc||'')+' '+(p.category||'')).toLowerCase()); }
  const uniqBy = (arr,key)=> [...new Set(arr.map(p=>p[key]).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  function setSelectOptions(id, values, allLabel, keepValue){ const el=document.getElementById(id); if(!el) return; const current=keepValue ?? el.value; el.innerHTML=''; const all=document.createElement('option'); all.value='ALL'; all.textContent=allLabel; el.appendChild(all); values.forEach(v=>{ const o=document.createElement('option'); o.value=v; o.textContent=v; el.appendChild(o); }); el.value = (current && values.includes(current)) ? current : 'ALL'; }
  function refreshDropdowns(resetType=false){ const catEl=$('#categoryFilter'), typeEl=$('#typeFilter'), brandEl=$('#brandFilter'); if(!catEl||!typeEl||!brandEl) return; const isAll=catEl.value==='ALL'; typeEl.disabled=brandEl.disabled=isAll; if(isAll){ setSelectOptions('typeFilter',[],'② All Types'); setSelectOptions('brandFilter',[],'③ All Brands'); return; } const pool=products.filter(p=>p.category===catEl.value); setSelectOptions('typeFilter', uniqBy(pool,'type'), '② All Types', resetType?null:typeEl.value); const t=typeEl.value; const brandPool=pool.filter(p=> t==='ALL'||p.type===t); setSelectOptions('brandFilter', uniqBy(brandPool,'brand'), '③ All Brands', brandEl.value); }
  function fillFilters(){ const sel=$('#categoryFilter'); if(!sel) return; [...sel.options].forEach(o=>{ if(o.value!=='ALL' && !products.some(p=>p.category===o.value)) o.remove(); }); refreshDropdowns(true); }
  function getFilterValues(){ return { query: ($('#searchInput')?.value||'').trim().toLowerCase(), cat: $('#categoryFilter')?.value||'ALL', brand: $('#brandFilter')?.value||'ALL', type: $('#typeFilter')?.value||'ALL', promoOnly: $('#promoOnly')?.checked||false }; }
  function filterProducts(){ sectionPage={}; const {query,cat,brand,type,promoOnly}=getFilterValues(); if(cat==='ALL'&&!query&&!promoOnly){ renderLanding(); return; } const filtered=products.filter((p,idx)=>{ if(cat!=='ALL'&&p.category!==cat) return false; if(brand!=='ALL'&&p.brand!==brand) return false; if(type!=='ALL'&&p.type!==type) return false; if(promoOnly && !(p.promo||effPrice(p)<p.price)) return false; if(query && !searchIndex[idx].includes(query)) return false; return true; }); renderProducts(filtered); }
  function renderLanding(){ const root=$('#productGrid'); if(!root) return; root.innerHTML=`<p class="landing-note">Choose a category from menu (then narrow by type & brand), or tap a tile below.</p><div class="tile-grid">${CONFIG.SECTIONS.map(g=>{ const items=products.filter(p=>p.category===g.key); if(!items.length) return ''; const brands=new Set(items.map(p=>p.brand)).size; return `<button class="tile" onclick="SunergyX.pickCategory('${g.key}')"><img src="${thumb(CONFIG.CATEGORY_IMAGES[g.key],500)}" alt="${g.title}" loading="lazy" onerror="this.style.display='none'"><div class="tile-ov"></div><div class="tile-txt"><h3>${g.title}</h3><p>${items.length} products · ${brands} brands</p><span>Browse →</span></div></button>`; }).join('')}</div>`; }
  function cardHTML(p){ const sale=effPrice(p)<p.price, price=effPrice(p); return `<div class="pimg"><img src="${thumb(p.image,400)}" alt="${p.title}" width="400" height="180" loading="lazy" onerror="this.onerror=null;this.src='${CONFIG.FALLBACK_IMG}'"><span class="pbadge">${p.brand? p.brand+' · ' : ''}${p.type||p.category}</span>${(p.promo||sale)?`<span class="ppromo">${p.promo||'SALE'}</span>`:''}</div><div class="pbody"><h3 title="${p.title}">${p.title}</h3><p>${cleanDesc(p.desc)}</p></div><div class="pfoot"><div><small>Price</small>${sale?`<s>${formatNaira(p.price)}</s>`:''}<b>${formatNaira(price)}</b></div><button onclick="SunergyX.addToCart('${p.id}')">+ Add</button></div>`; }
  function pagerHTML(key,page,pages){ if(pages<=1) return ''; const btn=(l,n,a,d)=>`<button ${d?'disabled':''} onclick="SunergyX.goPage('${key}',${n})" class="${a?'active':''}">${l}</button>`; const nums=[]; for(let i=1;i<=pages;i++){ if(i===1||i===pages||Math.abs(i-page)<=1) nums.push(i); else if(nums[nums.length-1]!=='…') nums.push('…'); } return `<div class="pager">${btn('‹',page-1,false,page===1)}${nums.map(n=> n==='…' ? '<span style="padding:8px">…</span>' : btn(n,n,n===page,false)).join('')}${btn('›',page+1,false,page===pages)}</div>`; }
  function renderProducts(list){ currentList=list; const root=$('#productGrid'); if(!root) return; root.innerHTML=''; if(!list.length){ root.innerHTML=`<div style="text-align:center;padding:40px"><p class="landing-note">No equipment found.</p><button onclick="SunergyX.clearFilters()" style="margin-top:12px;padding:8px 16px;border:1px solid #D6EEDF;background:#F0FAF4;font-size:12px;font-weight:700;cursor:pointer">Clear Filters</button></div>`; return; } const groups=CONFIG.SECTIONS.map(s=>({...s, items:list.filter(p=>p.category===s.key)})).filter(g=>g.items.length); const nav=document.createElement('div'); nav.className='jump-nav'; nav.innerHTML=groups.map(g=>`<a href="#sec-${g.key}" onclick="event.preventDefault();document.getElementById('sec-${g.key}').scrollIntoView({behavior:'smooth'})">${g.title} <span>(${g.items.length})</span></a>`).join(''); root.appendChild(nav); const frag=document.createDocumentFragment(); groups.forEach(g=>{ const pages=Math.ceil(g.items.length/CONFIG.PER_PAGE), page=Math.min(Math.max(sectionPage[g.key]||1,1),pages); sectionPage[g.key]=page; const slice=g.items.slice((page-1)*CONFIG.PER_PAGE, page*CONFIG.PER_PAGE); const sec=document.createElement('div'); sec.id='sec-'+g.key; sec.className='psection'; sec.innerHTML=`<div class="psec-head"><h3>${g.title}</h3><span>Showing ${(page-1)*CONFIG.PER_PAGE+1}–${(page-1)*CONFIG.PER_PAGE+slice.length} of ${g.items.length}</span></div>`; const grid=document.createElement('div'); grid.className='pgrid'; slice.forEach(p=>{ const card=document.createElement('div'); card.className='pcard'; card.innerHTML=cardHTML(p); grid.appendChild(card); }); sec.appendChild(grid); const pagerWrap=document.createElement('div'); pagerWrap.innerHTML=pagerHTML(g.key,page,pages); sec.appendChild(pagerWrap); frag.appendChild(sec); }); root.appendChild(frag); }
  const goPage = (key,n)=>{ sectionPage[key]=n; renderProducts(currentList); document.getElementById('sec-'+key)?.scrollIntoView({behavior:'smooth'}); };
  const pickCategory = (key)=>{ const c=$('#categoryFilter'); if(c){ c.value=key; refreshDropdowns(true); filterProducts(); } $('#productGrid')?.scrollIntoView({behavior:'smooth'}); };
  const clearFilters = ()=>{ const s=$('#searchInput'); if(s) s.value=''; const c=$('#categoryFilter'); if(c) c.value='ALL'; const p=$('#promoOnly'); if(p) p.checked=false; refreshDropdowns(true); renderLanding(); };

  function buildWhatsAppMessage(order){
    const lines = [
      `*🔋 NEW SUNERGYX ORDER*`, `Ref: ${order.ref}`, `Time: ${new Date(order.timestamp).toLocaleString('en-NG')}`, ``,
      `*Customer:* ${order.customer.name}`, `Phone: ${order.customer.phone||'N/A'}`, `Email: ${order.customer.email}`, `State: ${order.customer.state}`, ``,
      `*Items (${order.items.length}):*`, ...order.items.map(i=> `• ${i.title} x${i.qty} = ${formatNaira(i.price*i.qty)}`), ``,
      `*Total: ${formatNaira(order.total)}*`, `Payment: ${order.paymentMode}`, ``, `---`
    ];
    return lines.join('\n');
  }
  async function sendOrderToWebhook(order){
    const message = buildWhatsAppMessage(order);
    const payload = {
      event: 'sunergyx_new_order', shop: 'SunergyX', ref: order.ref, timestamp: order.timestamp,
      customer: order.customer, items: order.items, total: order.total, total_formatted: formatNaira(order.total),
      payment_mode: order.paymentMode, payment_ref: order.paymentRef, whatsapp_message: message, wa_number: waNumber, source: location.href
    };
    if(waWebhook){
      try{
        showToast('📤 Sending order to webhook...','info');
        const res = await fetch(waWebhook, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
        if(res.ok){ showToast('✅ Order sent to WhatsApp webhook','success'); return true; }
        else throw new Error(`Webhook ${res.status}`);
      }catch(e){ console.error('Webhook failed', e); showToast(`Webhook failed - opening wa.me`, 'warning'); }
    }
    const ownerMsg = encodeURIComponent(message);
    window.open(`https://wa.me/${waNumber}?text=${ownerMsg}`, '_blank');
    return false;
  }

  const validateEmail = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  function loadCustomer(){ const data=safeJSON(CONFIG.CUSTOMER_KEY, {}); if(data.name&&$('#custName')) $('#custName').value=data.name; if(data.email&&$('#custEmail')) $('#custEmail').value=data.email; if(data.phone&&$('#custPhone')) $('#custPhone').value=data.phone; if(data.state&&$('#custState')) $('#custState').value=data.state; }
  function saveCustomer(){ const data={ name:$('#custName')?.value.trim()||'', email:$('#custEmail')?.value.trim()||'', phone:$('#custPhone')?.value.trim()||'', state:$('#custState')?.value||'' }; try{ localStorage.setItem(CONFIG.CUSTOMER_KEY, JSON.stringify(data)); }catch{} }

  async function initiatePaystackCheckout(){
    if(!cart.length){ showToast('Cart empty','error'); return; }
    const email=$('#custEmail')?.value.trim()||'', name=$('#custName')?.value.trim()||'', phone=$('#custPhone')?.value.trim()||'', state=$('#custState')?.value||'Lagos';
    if(!name){ showToast('Enter Full Name','error'); $('#custName')?.focus(); return; }
    if(!email||!validateEmail(email)){ showToast('Enter valid Email','error'); $('#custEmail')?.focus(); return; }
    saveCustomer();
    const total=cartSubtotal(); const key=(paystackKey||'').trim();
    const makeOrder = (mode, ref) => ({ ref: ref || 'SUNERGYX_'+Date.now(), timestamp: new Date().toISOString(), customer:{name,email,phone,state}, items: cart.map(i=>({...i})), total, paymentMode:mode, paymentRef:ref });
    const finalizeOrder = async (order, msg) => { await sendOrderToWebhook(order); cart=[]; saveCart(); renderCart(); toggleCart(false); showToast(msg,'success'); };

    if(!key || typeof PaystackPop==='undefined'){
      showToast('Paystack not configured - simulating (no charge)','warning');
      const btn=$('.pay-btn'); if(btn){ const orig=btn.textContent; btn.textContent='Processing...'; btn.disabled=true; setTimeout(async()=>{ btn.textContent=orig; btn.disabled=false; const order=makeOrder('SIMULATED','SIM_'+Math.floor(Math.random()*1e9)); await finalizeOrder(order, `Simulated order for ${name}. Total ${formatNaira(total)} - check WhatsApp`); },1200); }
      return;
    }
    const handler = PaystackPop.setup({
      key, email, amount: total*100, currency:'NGN', ref: 'SUNERGYX_'+Math.floor(Math.random()*1000000000+1),
      metadata:{ custom_fields:[
        {display_name:'Customer Name', variable_name:'customer_name', value:name},
        {display_name:'Phone', variable_name:'phone_number', value:phone},
        {display_name:'State', variable_name:'delivery_state', value:state},
        {display_name:'Items', variable_name:'cart_items', value: cart.map(i=>`${i.title} x${i.qty}`).join(', ').slice(0,300)}
      ]},
      callback: async r=>{ const order=makeOrder(isLiveKey(key)?'PAYSTACK_LIVE':'PAYSTACK_TEST', r.reference); await finalizeOrder(order, `Payment successful! Ref: ${r.reference}`); },
      onClose: ()=> showToast('Checkout closed - cart saved','warning')
    });
    handler.openIframe();
  }

  function calculateSolarLoad(){
    const v=id=>Number($('#'+id)?.value)||0; const total=v('load_lights')*10 + v('load_fans')*75 + v('load_tvs')*120 + v('load_fridges')*250 + v('load_acs')*1200 + v('load_pumps')*750;
    const el=$('#calcTotalWatts'); if(el) el.textContent=total.toLocaleString()+' W';
    let inverter='1.5 kVA Pure Sine Wave', battery='2.5kWh Lithium (24V)', panels='2x 550W Mono Panels';
    if(total>4000){ inverter='7.5 kVA to 10 kVA Hybrid'; battery='20kWh Lithium Bank (48V)'; panels='12x 550W Mono Panels'; }
    else if(total>2200){ inverter='5 kVA Hybrid 48V'; battery='10kWh Lithium Wall (48V)'; panels='8x 550W Mono Panels'; }
    else if(total>1000){ inverter='3.5 kVA Hybrid'; battery='5kWh Lithium (48V)'; panels='4x 550W Mono Panels'; }
    const inv=$('#calcInverterRating'); if(inv) inv.textContent=inverter; const bat=$('#calcBatteryCapacity'); if(bat) bat.textContent=battery; const pan=$('#calcPanelsCount'); if(pan) pan.textContent=panels;
  }

  function initApp(){
    products=window.THQ_PRODUCTS||[]; if(!products.length){ $('#productGrid')&&( $('#productGrid').innerHTML='<p class="landing-note">Products could not be loaded.</p>'); return; }
    buildSearchIndex(); loadCart(); loadSettings(); renderCart(); fillFilters(); renderLanding(); calculateSolarLoad(); loadCustomer(); renderSettingsUI();
    $('#searchInput')?.addEventListener('input', debounce(()=>filterProducts(),250));
    $('#categoryFilter')?.addEventListener('change', ()=>{ refreshDropdowns(true); filterProducts(); });
    $('#typeFilter')?.addEventListener('change', ()=>{ refreshDropdowns(false); filterProducts(); });
    $('#brandFilter')?.addEventListener('change', ()=>filterProducts());
    $('#promoOnly')?.addEventListener('change', ()=>filterProducts());
    $('#cartDrawer')?.addEventListener('click', e=>{ if(e.target.id==='cartDrawer') toggleCart(false); });
    document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !$('#cartDrawer')?.classList.contains('hidden')) toggleCart(false); });
    $$('.calc-item input').forEach(inp=> inp.addEventListener('input', calculateSolarLoad));
    $('#savePaystackBtn')?.addEventListener('click', ()=> savePaystackKey($('#settingPaystackKey')?.value||''));
    $('#saveWaBtn')?.addEventListener('click', ()=> saveWhatsAppSettings($('#settingWaNumber')?.value||'', $('#settingWaWebhook')?.value||''));
    $('#testWebhookBtn')?.addEventListener('click', async()=>{ const testOrder = { ref:'TEST_'+Date.now(), timestamp:new Date().toISOString(), customer:{name:'Test Customer', email:'test@test.com', phone:'08000000000', state:'Lagos'}, items:[{title:'Test 550W Panel', qty:1, price:100000}], total:100000, paymentMode:'TEST', paymentRef:'TEST_REF' }; await sendOrderToWebhook(testOrder); });
    showToast(`Loaded ${products.length} products • ${paystackKey ? (isLiveKey(paystackKey)?'LIVE':'TEST') : 'SIM'} mode`,'info');
  }

  window.SunergyX = { addToCart, updateCartQty, removeCartItem, toggleCart, pickCategory, goPage, clearFilters, filterProducts: debounce(filterProducts,150), calculateSolarLoad, initiatePaystackCheckout, clearCart, savePaystackKey, saveWhatsAppSettings, renderSettingsUI };
  const boot=()=>{ if('requestIdleCallback' in window) requestIdleCallback(initApp,{timeout:1000}); else setTimeout(initApp,50); };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
