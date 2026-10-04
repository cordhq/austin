/* SunergyX v3 - storefront (tile editor + payment settings live in admin.html) */
(() => {
  'use strict';

  const CONFIG = {
    CART_KEY: 'sunergyx_cart_v3',
    CUSTOMER_KEY: 'sunergyx_customer',
    PAYSTACK_KEY: 'thq_paystack_key',
    PAYSTACK_KEY_V2: 'sunergyx_paystack_key',
    WA_WEBHOOK: 'sunergyx_whatsapp_webhook',
    WA_NUMBER: 'sunergyx_whatsapp_number',
    CATEGORY_TILES_KEY: 'sunergyx_category_tiles_v3',
    DEFAULT_WA: '2347084441471',
    PER_PAGE: 8,
    FALLBACK_IMG: 'https://images.unsplash.com/photo-1509391365360-2e959784a276?q=80&w=400&auto=format&fit=crop',
    SECTIONS: [
      {key:'Combos', title:'Combo Deals'},
      {key:'Panels', title:'Solar Panels'},
      {key:'Inverters', title:'Inverters'},
      {key:'Batteries', title:'Batteries'},
      {key:'Controllers', title:'Charge Controllers'},
      {key:'Breakers', title:'Breakers & Protection'},
      {key:'Appliances', title:'Energy Saving Appliances'},
      {key:'Accessories', title:'Accessories'}
    ],
    CATEGORY_IMAGES: {
      Combos:'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20200%20150%22%3E%3Cg%20fill%3D%22none%22%20stroke%3D%22%2310A75F%22%20stroke-width%3D%225%22%20stroke-linejoin%3D%22round%22%20stroke-linecap%3D%22round%22%3E%3Cpath%20d%3D%22M100%2038l42%2018v38l-42%2018-42-18V56z%22%2F%3E%3Cpath%20d%3D%22M58%2056l42%2018%2042-18M100%2074v38%22%2F%3E%3C%2Fg%3E%3Ccircle%20cx%3D%22152%22%20cy%3D%2238%22%20r%3D%2216%22%20fill%3D%22%23D4A017%22%2F%3E%3Cpath%20d%3D%22M152%2030v16M144%2038h16%22%20stroke%3D%22%23fff%22%20stroke-width%3D%224%22%20stroke-linecap%3D%22round%22%2F%3E%3C%2Fsvg%3E',
      Appliances:'data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20200%20150%22%3E%3Cg%20fill%3D%22none%22%20stroke%3D%22%2310A75F%22%20stroke-width%3D%225%22%20stroke-linejoin%3D%22round%22%20stroke-linecap%3D%22round%22%3E%3Cpath%20d%3D%22M100%2028a32%2032%200%200%200-18%2058c4%203%206%207%206%2012h24c0-5%202-9%206-12a32%2032%200%200%200-18-58z%22%2F%3E%3Cpath%20d%3D%22M90%20110h20M93%20120h14%22%2F%3E%3Cpath%20d%3D%22M100%2052v26M92%2062l8%208%208-8%22%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E',
      Panels:'https://images.unsplash.com/photo-1509391365360-2e959784a276?q=80&w=800&auto=format&fit=crop',
      Inverters:'https://images.unsplash.com/photo-1613665813446-82a78c468a1d?q=80&w=800&auto=format&fit=crop',
      Batteries:'https://res.cloudinary.com/ny0or3ln/image/upload/v1790635769/10KWhg_fmpy4h.png',
      Controllers:'https://images.unsplash.com/photo-1544724569-5f546fd6f2b5?q=80&w=800&auto=format&fit=crop',
      Breakers:'https://images.unsplash.com/photo-1581092160607-ee22621dd758?q=80&w=800&auto=format&fit=crop',
      Accessories:'https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?q=80&w=800&auto=format&fit=crop'
    }
  };

  let products = [], searchIndex = [], cart = [], currentList = [], sectionPage = {};
  let paystackKey = '', waWebhook = '', waNumber = CONFIG.DEFAULT_WA;
  let categoryTiles = [];

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
    if(url.startsWith('data:')) return url;
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

  function getDefaultCategoryTiles(){
    return CONFIG.SECTIONS.map((s,i)=>({
      key: s.key,
      title: s.title,
      image: CONFIG.CATEGORY_IMAGES[s.key] || CONFIG.FALLBACK_IMG,
      visible: true,
      order: i
    }));
  }
  function loadCategoryTiles(){
    const saved = Array.isArray(window.SUNERGYX_TILES) ? window.SUNERGYX_TILES : null;
    const defaults = getDefaultCategoryTiles();
    if(saved && Array.isArray(saved) && saved.length){
      const map = new Map(saved.map(t=>[t.key, t]));
      const merged = defaults.map(d=>{
        const ex = map.get(d.key);
        if(ex){
          return {
            key: d.key,
            title: (ex.title||d.title).trim() || d.title,
            image: ex.image || d.image,
            visible: ex.visible !== false,
            order: typeof ex.order === 'number' ? ex.order : d.order
          };
        }
        return d;
      });
      saved.forEach(s=>{ if(!defaults.find(d=>d.key===s.key)){ merged.push(s); } });
      return merged.sort((a,b)=>a.order-b.order);
    }
    return defaults;
  }
  function loadSettings(){
    try{
      paystackKey = localStorage.getItem(CONFIG.PAYSTACK_KEY_V2) || localStorage.getItem(CONFIG.PAYSTACK_KEY) || '';
      waWebhook = localStorage.getItem(CONFIG.WA_WEBHOOK) || '';
      waNumber = localStorage.getItem(CONFIG.WA_NUMBER) || CONFIG.DEFAULT_WA;
    }catch{}
    categoryTiles = loadCategoryTiles();
  }
  /* ---------- Delivery zones (from shipping.js) ---------- */
  let zones = [];
  function loadZones(){
    const raw = Array.isArray(window.SUNERGYX_SHIPPING) ? window.SUNERGYX_SHIPPING : [];
    zones = raw.filter(z=>z && z.label).map(z=>({ group: z.group||'Delivery', label: z.label, fee: Math.max(0, Number(z.fee)||0), note: z.note||'' }));
    if(!zones.length) zones = [{ group:'Delivery', label:'Delivery (fee confirmed on WhatsApp)', fee:0, note:'We will confirm the delivery fee with you on WhatsApp.' }];
  }
  function renderShippingOptions(){
    const sel = document.querySelector('#custShipping'); if(!sel) return;
    loadZones();
    const groups = []; zones.forEach((z,i)=>{ let g = groups.find(x=>x.name===z.group); if(!g){ g={name:z.group, items:[]}; groups.push(g); } g.items.push({z,i}); });
    const esc = t => String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
    sel.innerHTML = '<option value="">Select delivery location *</option>' + groups.map(g=>`<optgroup label="${esc(g.name)}">${g.items.map(({z,i})=>`<option value="${i}">${esc(z.label)} — ${z.fee>0?formatNaira(z.fee):'Free'}</option>`).join('')}</optgroup>`).join('');
  }
  function currentZone(){ const sel=document.querySelector('#custShipping'); if(!sel||sel.value==='') return null; return zones[Number(sel.value)]||null; }
  const cartShipFee = () => currentZone()?.fee || 0;
  function updateShippingNote(){ const el=document.querySelector('#shippingNote'); if(!el) return; const z=currentZone(); if(z&&z.note){ el.textContent=z.note; el.style.display='block'; } else el.style.display='none'; }

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
    const badge = document.querySelector('#cartCountBadge'); if(badge){ badge.style.transform='scale(1.3)'; setTimeout(()=>badge.style.transform='scale(1)',180); }
  }
  function updateCartQty(id, delta){ const it = cart.find(i=>i.id===id); if(!it) return; it.qty += delta; if(it.qty <=0){ cart = cart.filter(i=>i.id!==id); showToast('Item removed','info'); } else if(it.qty > (it.stock||10)){ it.qty = it.stock||10; showToast(`Max stock: ${it.stock}`,'warning'); } saveCart(); renderCart(); }
  function removeCartItem(id){ cart = cart.filter(i=>i.id!==id); saveCart(); renderCart(); showToast('Removed','info'); }
  function clearCart(){ if(!cart.length) return; if(!confirm('Clear cart?')) return; cart=[]; saveCart(); renderCart(); showToast('Cart cleared','info'); }

  function renderCart(){
    const badge=document.querySelector('#cartCountBadge'), subEl=document.querySelector('#cartSubtotal'), totalEl=document.querySelector('#cartTotal'), box=document.querySelector('#cartItemsContainer'); if(!box) return;
    const count=cartCount(), sub=cartSubtotal(); if(badge) badge.textContent=count; if(subEl) subEl.textContent=formatNaira(sub); if(totalEl) totalEl.textContent=formatNaira(sub+cartShipFee()); const shipEl=document.querySelector('#cartShipping'); if(shipEl){ const z=currentZone(); shipEl.textContent = z ? (z.fee>0 ? formatNaira(z.fee) : 'Free') : 'Select delivery'; }
    if(!cart.length){ box.innerHTML=`<div style="text-align:center;padding:40px 20px"><div style="font-size:40px;opacity:.3;margin-bottom:12px">🛒</div><p class="landing-note" style="margin:0">Your cart is empty.</p></div>`; return; }
    box.innerHTML = cart.map(i=>`<div class="cart-item"><img src="${thumb(i.image,96)}" alt="${i.title}" width="48" height="48" loading="lazy"><div style="flex:1;min-width:0"><h4>${i.title}</h4><div style="display:flex;gap:6px;align-items:center;margin-top:4px"><b>${formatNaira(i.price)}</b><small style="color:#9CA3AF">x ${i.qty} = ${formatNaira(i.price*i.qty)}</small></div></div><div class="qty"><button onclick="SunergyX.updateCartQty('${i.id}',-1)">−</button><span>${i.qty}</span><button onclick="SunergyX.updateCartQty('${i.id}',1)">+</button></div><button onclick="SunergyX.removeCartItem('${i.id}')" style="background:none;border:none;cursor:pointer;opacity:.5">✕</button></div>`).join('') + `<button onclick="SunergyX.clearCart()" style="margin:8px auto 0;display:block;background:none;border:none;font-size:11px;color:#9CA3AF;cursor:pointer;text-decoration:underline">Clear Cart</button>`;
  }
  function toggleCart(show){ const drawer=document.querySelector('#cartDrawer'); if(!drawer) return; const shouldShow = typeof show==='boolean' ? show : drawer.classList.contains('hidden'); drawer.classList.toggle('hidden', !shouldShow); document.body.style.overflow = shouldShow ? 'hidden' : ''; if(shouldShow) renderCart(); }

  function buildSearchIndex(){ searchIndex = products.map(p=> (p.title+' '+(p.brand||'')+' '+(p.type||'')+' '+(p.desc||'')+' '+(p.category||'')).toLowerCase()); }
  const uniqBy = (arr,key)=> [...new Set(arr.map(p=>p[key]).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  function setSelectOptions(id, values, allLabel, keepValue){ const el=document.getElementById(id); if(!el) return; const current=keepValue ?? el.value; el.innerHTML=''; const all=document.createElement('option'); all.value='ALL'; all.textContent=allLabel; el.appendChild(all); values.forEach(v=>{ const o=document.createElement('option'); o.value=v; o.textContent=v; el.appendChild(o); }); el.value = (current && values.includes(current)) ? current : 'ALL'; }
  function refreshDropdowns(resetType=false){ const catEl=document.querySelector('#categoryFilter'), typeEl=document.querySelector('#typeFilter'), brandEl=document.querySelector('#brandFilter'); if(!catEl||!typeEl||!brandEl) return; const isAll=catEl.value==='ALL'; typeEl.disabled=brandEl.disabled=isAll; if(isAll){ setSelectOptions('typeFilter',[],'② All Types'); setSelectOptions('brandFilter',[],'③ All Brands'); return; } const pool=products.filter(p=>p.category===catEl.value); setSelectOptions('typeFilter', uniqBy(pool,'type'), '② All Types', resetType?null:typeEl.value); const t=typeEl.value; const brandPool=pool.filter(p=> t==='ALL'||p.type===t); setSelectOptions('brandFilter', uniqBy(brandPool,'brand'), '③ All Brands', brandEl.value); }
  function fillFilters(){ const sel=document.querySelector('#categoryFilter'); if(!sel) return; sel.innerHTML='<option value="ALL">① Select Category</option>'+CONFIG.SECTIONS.map(x=>`<option value="${x.key}">${x.title}</option>`).join(''); refreshDropdowns(true); }
  function getFilterValues(){ return { query: (document.querySelector('#searchInput')?.value||'').trim().toLowerCase(), cat: document.querySelector('#categoryFilter')?.value||'ALL', brand: document.querySelector('#brandFilter')?.value||'ALL', type: document.querySelector('#typeFilter')?.value||'ALL', promoOnly: document.querySelector('#promoOnly')?.checked||false }; }
  function filterProducts(){ sectionPage={}; const {query,cat,brand,type,promoOnly}=getFilterValues(); if(cat==='ALL'&&!query&&!promoOnly){ renderLanding(); return; } const filtered=products.filter((p,idx)=>{ if(cat!=='ALL'&&p.category!==cat) return false; if(brand!=='ALL'&&p.brand!==brand) return false; if(type!=='ALL'&&p.type!==type) return false; if(promoOnly && !(p.promo||effPrice(p)<p.price)) return false; if(query && !searchIndex[idx].includes(query)) return false; return true; }); renderProducts(filtered); }
  
  function renderLanding(){
    const root=document.querySelector('#productGrid'); if(!root) return;
    if(!categoryTiles.length) categoryTiles = loadCategoryTiles();
    const visibleTiles = categoryTiles.filter(t=>t.visible).sort((a,b)=>a.order-b.order);
    root.innerHTML=`<div class="tile-grid">${visibleTiles.map(t=>{
        const items=products.filter(p=>p.category===t.key);
        const types=new Set(items.map(p=>p.type).filter(Boolean)).size;
        const meta = items.length ? `${items.length} product${items.length>1?'s':''}${types>1?' · '+types+' types':''}` : 'Coming soon';
        return `<button class="tile" onclick="SunergyX.pickCategory('${t.key}')" aria-label="${t.title}">
          <div class="tile-img"><img src="${thumb(t.image,500)}" alt="" loading="lazy" decoding="async"></div>
          <div class="tile-txt"><div><h3>${t.title}</h3><p>${meta}</p></div><i class="tile-go" aria-hidden="true">›</i></div>
        </button>`;
      }).join('')}</div>`;
  }
  function cardHTML(p){ const sale=effPrice(p)<p.price, price=effPrice(p); return `<div class="pimg"><img src="${thumb(p.image,400)}" alt="${p.title}" width="400" height="180" loading="lazy"><span class="pbadge">${p.brand? p.brand+' · ' : ''}${p.type||p.category}</span>${(p.promo||sale)?`<span class="ppromo">${p.promo||'SALE'}</span>`:''}</div><div class="pbody"><h3>${p.title}</h3><p>${cleanDesc(p.desc)}</p></div><div class="pfoot"><div><small>Price</small>${sale?`<s>${formatNaira(p.price)}</s>`:''}<b>${formatNaira(price)}</b></div><button onclick="SunergyX.addToCart('${p.id}')">+ Add</button></div>`; }
  function pagerHTML(key,page,pages){ if(pages<=1) return ''; const btn=(l,n,a,d)=>`<button ${d?'disabled':''} onclick="SunergyX.goPage('${key}',${n})" class="${a?'active':''}">${l}</button>`; const nums=[]; for(let i=1;i<=pages;i++){ if(i===1||i===pages||Math.abs(i-page)<=1) nums.push(i); else if(nums[nums.length-1]!=='…') nums.push('…'); } return `<div class="pager">${btn('‹',page-1,false,page===1)}${nums.map(n=> n==='…' ? '<span style="padding:8px">…</span>' : btn(n,n,n===page,false)).join('')}${btn('›',page+1,false,page===pages)}</div>`; }
  function renderProducts(list){ currentList=list; const root=document.querySelector('#productGrid'); if(!root) return; root.innerHTML=''; if(!list.length){ { const c=getFilterValues().cat, sec=CONFIG.SECTIONS.find(x=>x.key===c); root.innerHTML = (sec && !getFilterValues().query) ? `<div style="text-align:center;padding:40px"><p class="landing-note" style="padding-bottom:12px">No ${sec.title} listed yet.</p><a class="calc-cta" style="display:inline-block;padding:12px 24px" target="_blank" rel="noopener" href="https://wa.me/${waNumber}?text=${encodeURIComponent('Hello SunergyX, I am interested in '+sec.title)}">Ask us on WhatsApp</a></div>` : `<div style="text-align:center;padding:40px"><p class="landing-note">No equipment found.</p></div>`; return; } } const groups=CONFIG.SECTIONS.map(s=>({...s, items:list.filter(p=>p.category===s.key)})).filter(g=>g.items.length); const nav=document.createElement('div'); nav.className='jump-nav'; nav.innerHTML=groups.map(g=>`<a href="#sec-${g.key}" onclick="event.preventDefault();document.getElementById('sec-${g.key}').scrollIntoView({behavior:'smooth'})">${g.title} <span>(${g.items.length})</span></a>`).join(''); root.appendChild(nav); const frag=document.createDocumentFragment(); groups.forEach(g=>{ const pages=Math.ceil(g.items.length/CONFIG.PER_PAGE), page=Math.min(Math.max(sectionPage[g.key]||1,1),pages); sectionPage[g.key]=page; const slice=g.items.slice((page-1)*CONFIG.PER_PAGE, page*CONFIG.PER_PAGE); const sec=document.createElement('div'); sec.id='sec-'+g.key; sec.className='psection'; sec.innerHTML=`<div class="psec-head"><h3>${g.title}</h3><span>Showing ${(page-1)*CONFIG.PER_PAGE+1}–${(page-1)*CONFIG.PER_PAGE+slice.length} of ${g.items.length}</span></div>`; const grid=document.createElement('div'); grid.className='pgrid'; slice.forEach(p=>{ const card=document.createElement('div'); card.className='pcard'; card.innerHTML=cardHTML(p); grid.appendChild(card); }); sec.appendChild(grid); const pagerWrap=document.createElement('div'); pagerWrap.innerHTML=pagerHTML(g.key,page,pages); sec.appendChild(pagerWrap); frag.appendChild(sec); }); root.appendChild(frag); }
  const goPage = (key,n)=>{ sectionPage[key]=n; renderProducts(currentList); document.getElementById('sec-'+key)?.scrollIntoView({behavior:'smooth'}); };
  const pickCategory = (key)=>{ const c=document.querySelector('#categoryFilter'); if(c){ c.value=key; refreshDropdowns(true); filterProducts(); } document.querySelector('#productGrid')?.scrollIntoView({behavior:'smooth'}); };
  const clearFilters = ()=>{ const s=document.querySelector('#searchInput'); if(s) s.value=''; const c=document.querySelector('#categoryFilter'); if(c) c.value='ALL'; const p=document.querySelector('#promoOnly'); if(p) p.checked=false; refreshDropdowns(true); renderLanding(); };

  function buildWhatsAppMessage(order){ const lines = [`*🔋 NEW SUNERGYX ORDER*`, `Ref: ${order.ref}`, `Time: ${new Date(order.timestamp).toLocaleString('en-NG')}`, ``, `*Customer:* ${order.customer.name}`, `Phone: ${order.customer.phone||'N/A'}`, `Email: ${order.customer.email}`, `State: ${order.customer.state}`, ``, `*Items (${order.items.length}):*`, ...order.items.map(i=> `• ${i.title} x${i.qty} = ${formatNaira(i.price*i.qty)}`), ``, `Subtotal: ${formatNaira(order.subtotal ?? order.total)}`, `Delivery: ${order.shipping ? order.shipping.label+' — '+(order.shipping.fee>0?formatNaira(order.shipping.fee):'Free') : 'N/A'}`, `*Total: ${formatNaira(order.total)}*`, `Payment: ${order.paymentMode}`, ``, `---`]; return lines.join('\n'); }
  async function sendOrderToWebhook(order){
    const message = buildWhatsAppMessage(order);
    const payload = { event: 'sunergyx_new_order', shop: 'SunergyX', ref: order.ref, timestamp: order.timestamp, customer: order.customer, items: order.items, subtotal: order.subtotal, shipping: order.shipping, total: order.total, total_formatted: formatNaira(order.total), payment_mode: order.paymentMode, payment_ref: order.paymentRef, whatsapp_message: message, wa_number: waNumber, source: location.href };
    if(waWebhook){
      try{ showToast('📤 Sending to webhook...','info'); const res = await fetch(waWebhook, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) }); if(res.ok){ showToast('✅ Order sent to webhook','success'); return true; } else throw new Error(`Webhook ${res.status}`); }catch(e){ showToast(`Webhook failed - opening wa.me`, 'warning'); }
    }
    const ownerMsg = encodeURIComponent(message); window.open(`https://wa.me/${waNumber}?text=${ownerMsg}`, '_blank'); return false;
  }

  const validateEmail = email => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  function loadCustomer(){ const data=safeJSON(CONFIG.CUSTOMER_KEY, {}); if(data.name&&document.querySelector('#custName')) document.querySelector('#custName').value=data.name; if(data.email&&document.querySelector('#custEmail')) document.querySelector('#custEmail').value=data.email; if(data.phone&&document.querySelector('#custPhone')) document.querySelector('#custPhone').value=data.phone; if(data.shipLabel&&document.querySelector('#custShipping')){ const i=zones.findIndex(z=>z.label===data.shipLabel); if(i>=0){ document.querySelector('#custShipping').value=String(i); updateShippingNote(); } } }
  function saveCustomer(){ const data={ name:document.querySelector('#custName')?.value.trim()||'', email:document.querySelector('#custEmail')?.value.trim()||'', phone:document.querySelector('#custPhone')?.value.trim()||'', shipLabel:currentZone()?.label||'' }; try{ localStorage.setItem(CONFIG.CUSTOMER_KEY, JSON.stringify(data)); }catch{} }

  async function initiatePaystackCheckout(){
    if(!cart.length){ showToast('Cart empty','error'); return; }
    const email=document.querySelector('#custEmail')?.value.trim()||'', name=document.querySelector('#custName')?.value.trim()||'', phone=document.querySelector('#custPhone')?.value.trim()||'', zone=currentZone(), state=zone?zone.group:'';
    if(!name){ showToast('Enter Full Name','error'); document.querySelector('#custName')?.focus(); return; }
    if(!email||!validateEmail(email)){ showToast('Enter valid Email','error'); document.querySelector('#custEmail')?.focus(); return; }
    if(!zone){ showToast('Select a delivery location','error'); document.querySelector('#custShipping')?.focus(); return; }
    saveCustomer();
    const subtotal=cartSubtotal(), shipFee=zone.fee, total=subtotal+shipFee; const key=(paystackKey||'').trim();
    const makeOrder = (mode, ref) => ({ ref: ref || 'SUNERGYX_'+Date.now(), timestamp: new Date().toISOString(), customer:{name,email,phone,state}, items: cart.map(i=>({...i})), subtotal, shipping:{label:zone.label, fee:shipFee}, total, paymentMode:mode, paymentRef:ref });
    const finalizeOrder = async (order, msg) => { await sendOrderToWebhook(order); cart=[]; saveCart(); renderCart(); toggleCart(false); showToast(msg,'success'); };
    if(!key || typeof PaystackPop==='undefined'){
      showToast('Paystack not configured - simulating','warning');
      const btn=document.querySelector('.pay-btn'); if(btn){ const orig=btn.textContent; btn.textContent='Processing...'; btn.disabled=true; setTimeout(async()=>{ btn.textContent=orig; btn.disabled=false; const order=makeOrder('SIMULATED','SIM_'+Math.floor(Math.random()*1e9)); await finalizeOrder(order, `Simulated order for ${name}. Total ${formatNaira(total)}`); },1200); }
      return;
    }
    const handler = PaystackPop.setup({
      key, email, amount: total*100, currency:'NGN', ref: 'SUNERGYX_'+Math.floor(Math.random()*1000000000+1),
      metadata:{ custom_fields:[
        {display_name:'Customer Name', variable_name:'customer_name', value:name},
        {display_name:'Phone', variable_name:'phone_number', value:phone},
        {display_name:'State', variable_name:'delivery_state', value:state},
        {display_name:'Delivery', variable_name:'delivery_option', value:zone.label},
        {display_name:'Items', variable_name:'cart_items', value: cart.map(i=>`${i.title} x${i.qty}`).join(', ').slice(0,300)}
      ]},
      callback: async r=>{ const order=makeOrder(isLiveKey(key)?'PAYSTACK_LIVE':'PAYSTACK_TEST', r.reference); await finalizeOrder(order, `Payment successful! Ref: ${r.reference}`); },
      onClose: ()=> showToast('Checkout closed - cart saved','warning')
    });
    handler.openIframe();
  }

  function calculateSolarLoad(){
    const v=id=>Number(document.querySelector('#'+id)?.value)||0; const total=v('load_lights')*10 + v('load_fans')*75 + v('load_tvs')*120 + v('load_fridges')*250 + v('load_acs')*1200 + v('load_pumps')*750;
    const el=document.querySelector('#calcTotalWatts'); if(el) el.textContent=total.toLocaleString()+' W';
    let inverter='1.5 kVA Pure Sine Wave', battery='2.5kWh Lithium (24V)', panels='2x 550W Mono Panels';
    if(total>4000){ inverter='7.5 kVA to 10 kVA Hybrid'; battery='20kWh Lithium Bank (48V)'; panels='12x 550W Mono Panels'; }
    else if(total>2200){ inverter='5 kVA Hybrid 48V'; battery='10kWh Lithium Wall (48V)'; panels='8x 550W Mono Panels'; }
    else if(total>1000){ inverter='3.5 kVA Hybrid'; battery='5kWh Lithium (48V)'; panels='4x 550W Mono Panels'; }
    const inv=document.querySelector('#calcInverterRating'); if(inv) inv.textContent=inverter; const bat=document.querySelector('#calcBatteryCapacity'); if(bat) bat.textContent=battery; const pan=document.querySelector('#calcPanelsCount'); if(pan) pan.textContent=panels;
  }

  function initApp(){
    products=window.THQ_PRODUCTS||[]; if(!products.length){ document.querySelector('#productGrid')&&( document.querySelector('#productGrid').innerHTML='<p class="landing-note">Products could not be loaded.</p>'); return; }
    buildSearchIndex(); loadCart(); loadSettings(); renderCart(); fillFilters(); renderLanding(); calculateSolarLoad(); renderShippingOptions(); loadCustomer(); renderCart();
    document.querySelector('#searchInput')?.addEventListener('input', debounce(()=>filterProducts(),250));
    document.querySelector('#categoryFilter')?.addEventListener('change', ()=>{ refreshDropdowns(true); filterProducts(); });
    document.querySelector('#typeFilter')?.addEventListener('change', ()=>{ refreshDropdowns(false); filterProducts(); });
    document.querySelector('#brandFilter')?.addEventListener('change', ()=>filterProducts());
    document.querySelector('#promoOnly')?.addEventListener('change', ()=>filterProducts());
    document.querySelector('#custShipping')?.addEventListener('change', ()=>{ updateShippingNote(); renderCart(); saveCustomer(); });
    document.querySelector('#cartDrawer')?.addEventListener('click', e=>{ if(e.target.id==='cartDrawer') toggleCart(false); });
    document.addEventListener('keydown', e=>{ if(e.key==='Escape' && !document.querySelector('#cartDrawer')?.classList.contains('hidden')) toggleCart(false); });
    document.querySelectorAll('.calc-item input').forEach(inp=> inp.addEventListener('input', calculateSolarLoad));
  }

  window.SunergyX = { addToCart, updateCartQty, removeCartItem, toggleCart, pickCategory, goPage, clearFilters, filterProducts: debounce(filterProducts,150), calculateSolarLoad, initiatePaystackCheckout, clearCart };
  const boot=()=>{ if('requestIdleCallback' in window) requestIdleCallback(initApp,{timeout:1000}); else setTimeout(initApp,50); };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
