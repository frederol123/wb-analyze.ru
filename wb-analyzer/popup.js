const analyzeBtn = document.getElementById('analyzeBtn');
const statusEl = document.getElementById('status');
const summaryEl = document.getElementById('summary');
const tableWrap = document.getElementById('tableWrap');
const countEl = document.getElementById('count');
const tbody = document.querySelector('#resultTable tbody');
const downloadBtn = document.getElementById('downloadBtn');
const paywall = document.getElementById('paywall');
const buyBtn = document.getElementById('buyBtn');
const licenseInput = document.getElementById('licenseInput');
const proBadge = document.getElementById('proBadge');

let currentData = null;
let isPro = false;

async function checkLicense(license){
  try{
    const r = await fetch(`${CONFIG.API_BASE}/licenses/check`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({license_key: license})
    });
    const j = await r.json();
    return j.success && j.data.is_valid;
  }catch{ return false; }
}

chrome.storage.local.get(['isPro','license'], async v => {
  isPro = !!v.isPro;
  if (v.license) {
    const valid = await checkLicense(v.license);
    if (valid) {
      isPro = true;
      proBadge.classList.remove('hidden'); paywall.classList.add('hidden');
    } else {
      chrome.storage.local.remove(['isPro','license']);
      isPro = false;
    }
  } else if (isPro) {
    proBadge.classList.remove('hidden'); paywall.classList.add('hidden');
  }
});

function setStatus(t){ statusEl.textContent = t; }

function csvEscape(v){
  const s = String(v ?? '').replace(/"/g,'""');
  return `"${s}"`;
}

function toCSV(items){
  const header = ['#','Название','Бренд','Цена','Цена без скидки','Отзывы','Рейтинг','Продавец','Выгодность','Причина','Ссылка'];
  const rows = items.map((it,i)=>[
    i+1, it.name, it.brand, it.price, it.basicPrice, it.feedbacks, it.rating, it.supplier, it.label, it.reason, it.url
  ].map(csvEscape).join(','));
  return [header.map(csvEscape).join(','), ...rows].join('\n');
}

function render(data){
  currentData = data;
  const s = data.summary;
  if (!s) { setStatus('Товары не найдены'); return; }
  summaryEl.innerHTML = `
    <b>Запрос:</b> ${data.query || '—'} &nbsp; <b>Товаров:</b> ${s.count}<br>
    <b>Цена:</b> min ${s.min}₽ · медиана ${s.median}₽ · средн ${s.avg}₽ · max ${s.max}₽<br>
    <b>Рейтинг средн:</b> ${s.avgRating} &nbsp; <b>Градация:</b> <span style="color:#22c55e">🟢 ${s.green} выгодно</span> · <span style="color:#eab308">🟡 ${s.yellow} средне</span> · <span style="color:#ef4444">🔴 ${s.red} сложно</span>
    <div style="margin-top:6px;color:#9aa3b2">PRO открывает выгрузку всех строк и полный анализ. Бесплатно — первые 20.</div>
  `;
  summaryEl.classList.remove('hidden');

  const itemsToShow = isPro ? data.items : data.items.slice(0,20);
  countEl.textContent = `Показано ${itemsToShow.length} из ${data.items.length}`;
  tbody.innerHTML = '';
  itemsToShow.forEach((it,i)=>{
    const tr = document.createElement('tr');
    const cls = it.level === 'green' ? 'green' : it.level === 'red' ? 'red' : 'yellow';
    tr.innerHTML = `<td>${i+1}</td><td title="${it.name}">${it.name}</td><td>${it.price}₽</td><td>${it.feedbacks}</td><td>${it.rating}</td><td>${it.supplier || it.brand}</td><td><span class="badge ${cls}">${it.label}</span></td>`;
    tbody.appendChild(tr);
  });
  tableWrap.classList.remove('hidden');
  if (!isPro && data.items.length > 20) paywall.classList.remove('hidden');
  else if (isPro) paywall.classList.add('hidden');
}

analyzeBtn.addEventListener('click', async ()=>{
  setStatus('Анализирую...');
  analyzeBtn.disabled = true;
  summaryEl.classList.add('hidden');
  tableWrap.classList.add('hidden');
  try{
    const [tab] = await chrome.tabs.query({active:true, currentWindow:true});
    if (!tab?.id) throw new Error('Нет активной вкладки');
    const isWB = tab.url && tab.url.includes('wildberries');
    if (!isWB) { setStatus('Открой wildberries.ru (поиск или каталог)'); analyzeBtn.disabled=false; return; }
    const res = await chrome.tabs.sendMessage(tab.id, {type:'ANALYZE'});
    if (!res?.ok) throw new Error(res?.error || 'Ошибка анализа');
    if (!res.items?.length) { setStatus('Ничего не найдено. Попробуй обновить страницу.'); }
    else { setStatus('Готово — ' + res.items.length + ' товаров'); render(res); }
  }catch(e){
    setStatus('Ошибка: ' + e.message);
  }finally{ analyzeBtn.disabled=false; }
});

downloadBtn.addEventListener('click', ()=>{
  if (!currentData) return;
  const items = isPro ? currentData.items : currentData.items.slice(0,20);
  const csv = toCSV(items);
  const blob = new Blob(['\ufeff' + csv], {type:'text/csv;charset=utf-8;'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `wb-analyzer-${(currentData.query||'export').replace(/\s+/g,'_')}.csv`;
  a.click();
  URL.revokeObjectURL(url);
});

buyBtn.addEventListener('click', async ()=>{
  const code = licenseInput.value.trim();
  if (code) {
    setStatus('Проверяю лицензию...');
    const valid = await checkLicense(code);
    if (valid) {
      chrome.storage.local.set({isPro:true, license:code}, ()=>{
        isPro=true;
        proBadge.classList.remove('hidden');
        paywall.classList.add('hidden');
        setStatus('PRO активирован');
        if (currentData) render(currentData);
      });
      return;
    } else {
      setStatus('Ключ не найден, создаю оплату...');
    }
  }
  try{
    setStatus('Создаю платеж ЮKassa...');
    const r = await fetch(`${CONFIG.API_BASE}/licenses`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({amount: CONFIG.PRICE_RUB})
    });
    const j = await r.json();
    if (!j.success) throw new Error(j.error || 'Ошибка создания платежа');
    chrome.tabs.create({url: j.data.confirmation_url});
    licenseInput.value = j.data.license_key;
    licenseInput.placeholder = 'Скопируй ключ, после оплаты нажми Активировать';
    setStatus('Оплати на открывшейся странице, затем вставь ключ и нажми Активировать');
  }catch(e){
    setStatus('Демо-режим: введи любой код для теста');
    const fallback = code || ('WB-DEMO-' + Date.now().toString(36).toUpperCase());
    chrome.storage.local.set({isPro:true, license:fallback}, ()=>{
      isPro=true;
      proBadge.classList.remove('hidden');
      paywall.classList.add('hidden');
      setStatus('PRO активирован (демо, ЮKassa недоступна)');
      if (currentData) render(currentData);
    });
  }
});
