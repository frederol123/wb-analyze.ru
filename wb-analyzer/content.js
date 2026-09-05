(() => {
  const WB_API = 'https://search.wb.ru/exactmatch/ru/common/v4/search';

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
    return (data.products || []).map(p => ({
      id: p.id,
      name: p.name,
      brand: p.brand || '',
      supplier: p.supplier || '',
      price: parsePrice(p.sizes?.[0]?.price?.product),
      basicPrice: parsePrice(p.sizes?.[0]?.price?.basic),
      rating: p.rating || p.reviewRating || 0,
      feedbacks: p.feedbacks || 0,
      url: 'https://www.wildberries.ru/catalog/' + p.id + '/detail.aspx'
    }));
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
        if (id && name) items.push({ id, name, brand: '', supplier: '', price, basicPrice: price, rating, feedbacks, url: 'https://www.wildberries.ru/catalog/' + id + '/detail.aspx' });
      } catch {}
    });
    return items;
  }

  function analyze(items) {
    if (!items.length) return { items, summary: null };
    const prices = items.map(i => i.price).filter(Boolean).sort((a, b) => a - b);
    const avg = Math.round(prices.reduce((s, v) => s + v, 0) / prices.length);
    const median = prices[Math.floor(prices.length / 2)];
    const min = prices[0];
    const max = prices[prices.length - 1];
    const avgRating = (items.reduce((s, v) => s + (v.rating || 0), 0) / items.length).toFixed(2);

    const scored = items.map(it => {
      let level = 'yellow';
      let reason = '';
      const f = it.feedbacks;
      const pr = it.price;
      if (f < 100 && pr >= median * 0.9) { level = 'green'; reason = 'мало отзывов, цена выше медианы'; }
      else if (f > 500 || (it.rating >= 4.9 && f > 300)) { level = 'red'; reason = 'высокая конкуренция'; }
      else if (f >= 100 && f <= 500) { level = 'yellow'; reason = 'средняя конкуренция'; }
      if (pr < median * 0.7 && f > 200) { level = 'red'; reason = 'демпинг + конкуренция'; }
      const label = level === 'green' ? 'Выгодно' : level === 'yellow' ? 'Средне' : 'Сложно';
      return { ...it, level, label, reason };
    });

    const green = scored.filter(s => s.level === 'green').length;
    const yellow = scored.filter(s => s.level === 'yellow').length;
    const red = scored.filter(s => s.level === 'red').length;

    return {
      items: scored,
      summary: { count: items.length, min, max, avg, median, avgRating, green, yellow, red }
    };
  }

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.type === 'ANALYZE') {
      (async () => {
        try {
          const q = getQueryFromUrl();
          let items = [];
          if (q) {
            try { items = await fetchViaApi(q, 1); } catch (e) {}
          }
          if (!items.length) items = scrapeDom();
          if (!items.length) {
            try { items = await fetchViaApi(q || 'чехол', 1); } catch {}
          }
          const result = analyze(items);
          sendResponse({ ok: true, query: q, ...result });
        } catch (e) {
          sendResponse({ ok: false, error: e.message });
        }
      })();
      return true;
    }
  });
})();
