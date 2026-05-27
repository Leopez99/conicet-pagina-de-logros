const SHEET_ID = '1vOqUm2ODciRkacamfSoJ-bqXkrJtE-JTXphKWxkSrFI';
const GID = '1877176342';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=csv&gid=${GID}`;

let allItems = [];
let activeYear = 'all';

function parseCSV(text) {
  const lines = text.trim().split('\n');
  const items = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const commaIdx = line.indexOf(',');
    if (commaIdx === -1) continue;
    const year = line.slice(0, commaIdx).replace(/"/g, '').trim();
    let url = line.slice(commaIdx + 1).replace(/"/g, '').trim();
    if (!year || !url || isNaN(parseInt(year))) continue;
    items.push({ year: parseInt(year), url });
  }
  return items;
}

function getSource(url) {
  try {
    const h = new URL(url).hostname.replace('www.', '');
    if (h.includes('conicet')) return 'CONICET';
    if (h.includes('gob.ar')) return 'Argentina.gob.ar';
    if (h.includes('lavoz')) return 'La Voz';
    if (h.includes('lateandes')) return 'Los Andes';
    if (h.includes('facebook')) return 'Facebook';
    return h.split('.')[0].charAt(0).toUpperCase() + h.split('.')[0].slice(1);
  } catch { return 'Enlace'; }
}

function buildYearFilters(items) {
  const years = [...new Set(items.map(i => i.year))].sort((a, b) => b - a);
  const container = document.getElementById('yearFilters');
  container.innerHTML = '<button class="year-btn active" data-year="all" onclick="filterYear(\'all\', this)">Todos</button>';
  years.forEach(y => {
    const btn = document.createElement('button');
    btn.className = 'year-btn';
    btn.dataset.year = y;
    btn.textContent = y;
    btn.onclick = () => filterYear(y, btn);
    container.appendChild(btn);
  });
}

function filterYear(year, btn) {
  activeYear = year;
  document.querySelectorAll('.year-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderItems();
}

function renderItems() {
  const filtered = activeYear === 'all' ? allItems : allItems.filter(i => i.year === activeYear);
  const main = document.getElementById('mainContent');
  const countLabel = document.getElementById('countLabel');

  countLabel.textContent = `${filtered.length} entrada${filtered.length !== 1 ? 's' : ''}`;

  if (filtered.length === 0) {
    main.innerHTML = '<div class="state-box"><div class="state-icon">◌</div><p>No hay entradas para este año.</p></div>';
    return;
  }

  const byYear = {};
  filtered.forEach(item => {
    if (!byYear[item.year]) byYear[item.year] = [];
    byYear[item.year].push(item);
  });

  const sortedYears = Object.keys(byYear).sort((a, b) => b - a);
  let delay = 0;

  main.innerHTML = sortedYears.map(year => {
    const entries = byYear[year];
    const items = entries.map(item => {
      const d = delay;
      delay += 30;
      return `<li class="news-item" style="animation-delay:${d}ms">
        <span class="item-dot"></span>
        <div class="item-body">
          <span class="item-source">${getSource(item.url)}</span>
          <a class="item-link" href="${item.url}" target="_blank" rel="noopener">${item.url}</a>
        </div>
      </li>`;
    }).join('');
    return `<div class="year-group">
      <div class="year-label">${year} <span class="year-count-badge">${entries.length}</span></div>
      <ul class="news-list">${items}</ul>
    </div>`;
  }).join('');
}

async function loadData() {
  const btn = document.getElementById('refreshBtn');
  const icon = document.getElementById('spinIcon');
  const errorBox = document.getElementById('errorBox');
  const main = document.getElementById('mainContent');

  btn.disabled = true;
  icon.classList.add('spinning');
  errorBox.innerHTML = '';

  if (allItems.length === 0) {
    main.innerHTML = '<div class="state-box"><div class="state-icon">◌</div><p>Cargando datos…</p></div>';
  }

  try {
    const res = await fetch(CSV_URL + '&cachebust=' + Date.now());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    allItems = parseCSV(text);

    if (allItems.length === 0) throw new Error('No se encontraron datos en el sheet.');

    buildYearFilters(allItems);
    renderItems();

    const now = new Date();
    document.getElementById('lastUpdated').textContent =
      `Actualizado: ${now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`;

  } catch (err) {
    errorBox.innerHTML = `<div class="error-box">
      <strong>Error al cargar:</strong> ${err.message}<br>
      <small>Asegurate de que el sheet esté compartido como "Cualquiera con el link puede ver".</small>
    </div>`;
    if (allItems.length === 0) {
      main.innerHTML = '<div class="state-box"><p>No se pudieron cargar los datos.</p></div>';
    }
  } finally {
    btn.disabled = false;
    icon.classList.remove('spinning');
  }
}

loadData();
