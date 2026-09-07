(() => {
  const WB_API = 'https://search.wb.ru/exactmatch/ru/common/v4/search';
  const MAX_PAGES = 3;

  function getQueryFromUrl() {
    const u = new URL(location.href);
    return u.searchParams.get('search') || u.searchParams.get('query') || u.searchParams.get('text') || document.querySelector('input[type=search]')?.value || '';
  }

  function parsePrice(p) {
    if (!p) return 0;
    return Math.round(p / 100);
  }

  async function fetchViaApi(query, page = 1) {
    const params = new URLSearchParams({
      appType: '1',
      curr: 'rub',
      dest: '-1257786',
      page: String(page),
      query: query,
      resultset: 'catalog',
      sort: 'popular',
      spp: '30'
    });
    const url = WB_API + '?' + params.toString();
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) throw new Error('WB API ' + res.status);
    const data = await res.json();
    return (data.products || []).map(p => {
      const price = parsePrice(p.sizes?.[0]?.price?.product);
      const basicPrice = parsePrice(p.sizes?.[0]?.price?.basic);
      return {
        id: p.id,
        name: p.name,
        brand: p.brand || '',
        supplier: p.supplier || '',
        supplierRating: p.supplierRating || 0,
        price,
        basicPrice,
        discount: basicPrice > price && basicPrice > 0 ? Math.round((1 - price / basicPrice) * 100) : 0,
        rating: p.rating || p.reviewRating || 0,
        feedbacks: p.feedbacks || 0,
        url: 'https://www.wildberries.ru/catalog/' + p.id + '/detail.aspx'
      };
    });
  }

  async function fetchDeep(query, maxPages) {
    const seen = new Map();
    for (let page = 1; page <= maxPages; page++) {
      try {
        const batch = await fetchViaApi(query, page);
        if (!batch.length) break;
        batch.forEach(it => { if (!seen.has(it.id)) seen.set(it.id, it); });
        if (batch.length < 20) break;
        await new Promise(r => setTimeout(r, 250 + Math.random() * 300));
      } catch (e) {
        break;
      }
    }
    return [...seen.values()];
  }

  function scrapeDom() {
    const cards = document.querySelectorAll('[data-nm-id], .product-card');
    const items = [];
    cards.forEach(c => {
      try {
        const id = c.getAttribute('data-nm-id') || c.querySelector('a[href*=\"/catalog/\"]')?.href.match(/\/catalog\/(\d+)\//)?.[1];
        const name = c.querySelector('.product-card__name, .goods-name, [class*=name]')?.textContent?.trim() || '';
        const priceText = c.querySelector('.price__lower-price, .lower-price, [class*=price]')?.textContent || '';
        const price = parseInt(priceText.replace(/\D/g, '')) || 0;
        const ratingText = c.querySelector('[class*=rate], .address-rate-mini')?.textContent || '';
        const rating = parseFloat(ratingText.replace(',', '.')) || 0;
        const feedbacksText = c.querySelector('[class*=feedback], [class*=review]')?.textContent || '';
        const feedbacks = parseInt(feedbacksText.replace(/\D/g, '')) || 0;
        if (id && name) items.push({ id, name, brand: '', supplier: '', supplierRating: 0, price, basicPrice: price, discount: 0, rating, feedbacks, url: 'https://www.wildberries.ru/catalog/' + id + '/detail.aspx' });
      } catch {}
    });
    return items;
  }

  function median(arr) {
    if (!arr.length) return 0;
    const s = [...arr].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  }

  function analyze(items) {
    if (!items.length) return { items, summary: null };
    const prices = items.map(i => i.price).filter(Boolean);
    const avg = prices.length ? Math.round(prices.reduce((s, v) => s + v, 0) / prices.length) : 0;
    const med = median(prices);
    const avgRating = (items.reduce((s, v) => s + (v.rating || 0), 0) / items.length).toFixed(2);
    const totalFb = items.reduce((s, v) => s + (v.feedbacks || 0), 0);
    const avgFb = Math.round(totalFb / items.length);
    const sortedFb = items.map(i => i.feedbacks).sort((a, b) => b - a);
    const saturation = +(items.filter(i => i.feedbacks > 500).length / items.length * 100).toFixed(1);
    const top10 = sortedFb.slice(0, Math.min(10, sortedFb.length));
    const concentration = totalFb ? +(top10.reduce((s, v) => s + v, 0) / totalFb * 100).toFixed(1) : 0;
    const avgDiscount = +(items.filter(i => i.discount > 0).reduce((s, i) => s + i.discount, 0) / Math.max(1, items.filter(i => i.discount > 0).length)).toFixed(1);
    const shareCheap = items.filter(i => i.price && med && i.price < med * 0.7).length / items.length * 100;

    const scored = items.map(it => {
      let level = 'yellow';
      let reason = '';
      const f = it.feedbacks;
      const pr = it.price;
      if (f < 100 && pr >= med * 0.9) { level = 'green'; reason = 'мало отзывов, цена выше медианы'; }
      else if (f > 500 || (it.rating >= 4.9 && f > 300)) { level = 'red'; reason = 'высокая конкуренция'; }
      else if (f >= 100 && f <= 500) { level = 'yellow'; reason = 'средняя конкуренция'; }
      if (pr < med * 0.7 && f > 200) { level = 'red'; reason = 'демпинг + конкуренция'; }
      const label = level === 'green' ? 'Выгодно' : level === 'yellow' ? 'Средне' : 'Сложно';
      return { ...it, level, label, reason };
    });

    const green = scored.filter(s => s.level === 'green').length;
    const yellow = scored.filter(s => s.level === 'yellow').length;
    const red = scored.filter(s => s.level === 'red').length;

    return {
      items: scored,
      summary: {
        count: items.length, min: prices.length ? Math.min(...prices) : 0,
        max: prices.length ? Math.max(...prices) : 0, avg, median: med,
        avgRating, green, yellow, red,
        totalFb, avgFb, saturation, concentration, avgDiscount, shareCheap
      }
    };
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'ANALYZE') {
      (async () => {
        try {
          const q = getQueryFromUrl();
          const deep = msg.deep === true;
          let items = [];
          if (q) {
            try { items = await fetchDeep(q, deep ? MAX_PAGES : 1); } catch (e) {}
          }
          if (!items.length) items = scrapeDom();
          if (!items.length) {
            try { items = await fetchDeep(q || 'чехол', 1); } catch {}
          }
          const result = analyze(items);
          sendResponse({ ok: true, query: q, deep, ...result });
        } catch (e) {
          sendResponse({ ok: false, error: e.message });
        }
      })();
      return true;
    }
  });
})();
