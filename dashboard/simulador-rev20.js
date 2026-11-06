(async () => {
  const root = document.getElementById('tres-janelas-rev20');
  const q = id => root.querySelector('#' + id);
  let data;
  try {
    const response = await fetch('simulador-rev20-data.json?v=1');
    if (!response.ok) throw new Error('Data request failed');
    data = await response.json();
  } catch (_) {
    root.textContent = 'Não foi possível carregar os dados do simulador.';
    return;
  }
  const city = q('tj-city');
  const month = q('tj-month');
  const rain = [60, 0, 0, 0, 0, 0];
  const cfg = {
    reg: { stage: 'registro', minMax: 300, color: 1, label: 'Chance de registro' },
    count: { stage: 'contagem', minMax: 450, color: 2, label: 'Danos humanos médios' },
    pres: { stage: 'presenca', minMax: 600, color: 3, label: 'Chance de dano humano' }
  };
  const fmt = (v, d = 1) => Number(v).toLocaleString('pt-BR', {
    minimumFractionDigits: d, maximumFractionDigits: d
  });
  const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

  data.municipios.forEach(m => {
    const option = document.createElement('option');
    option.value = m.id;
    option.textContent = m.nome;
    city.append(option);
  });
  months.forEach((name, i) => {
    const option = document.createElement('option');
    option.value = i + 1;
    option.textContent = name;
    month.append(option);
  });
  month.value = '1';

  function setDay(i, value) {
    rain[i] = Math.max(0, Math.min(500, Number(value) || 0));
    q('tj-range' + i).max = Math.max(250, rain[i]);
    q('tj-range' + i).value = rain[i];
    q('tj-number' + i).value = rain[i];
    update();
  }
  ['Hoje', 'Ontem', 'Há 2 dias', 'Há 3 dias', 'Há 4 dias', 'Há 5 dias']
    .forEach((label, i) => {
      const row = document.createElement('div');
      row.className = 'rain-row';
      row.innerHTML = `<label class="form-label" for="tj-range${i}">${label}</label>
        <input class="form-range" id="tj-range${i}" type="range" min="0" max="250" step="1" value="${rain[i]}">
        <input class="form-control tabular-nums" id="tj-number${i}" type="number" min="0" max="500" step="1" value="${rain[i]}" aria-label="${label}: chuva em milímetros">`;
      q('tj-rain-editor').append(row);
      q('tj-range' + i).addEventListener('input', e => setDay(i, e.target.value));
      q('tj-number' + i).addEventListener('change', e => setDay(i, e.target.value));
    });

  const sums = () => ({
    reg: rain[0],
    count: rain[0] + rain[1] + rain[2],
    pres: rain.reduce((a, b) => a + b, 0)
  });
  function select() {
    return [data.municipios.find(m => m.id === city.value) || data.municipios[0],
      Number(month.value)];
  }
  const sigmoid = x => x >= 0 ? 1 / (1 + Math.exp(-x)) : Math.exp(x) / (1 + Math.exp(x));
  function estimate(key, mm, municipality, mo) {
    const b = data.modelos[cfg[key].stage];
    let z = (b['(Intercept)'] || 0) + (b.sovi || 0) * municipality.sovi_z +
      (b.icm || 0) * municipality.icm_z + (b['mes' + mo] || 0);
    z += key === 'count' ? (b.log_chuva || 0) * Math.log1p(mm / 10) :
      (b.chuva || 0) * mm / 10;
    return key === 'count' ? Math.exp(Math.min(z, 30)) : sigmoid(z);
  }
  function distribute(indices, total) {
    const old = indices.reduce((sum, i) => sum + rain[i], 0);
    if (old > 0) {
      indices.forEach(i => { rain[i] = total * rain[i] / old; });
    } else {
      indices.forEach(i => { rain[i] = total / indices.length; });
    }
    indices.forEach(i => {
      q('tj-range' + i).max = Math.max(250, rain[i]);
      q('tj-range' + i).value = rain[i];
      q('tj-number' + i).value = fmt(rain[i], 1).replace(',', '.');
    });
  }
  function setCumulative(key, value) {
    const current = sums();
    const target = Math.max(0, Math.round(value));
    if (key === 'reg') setDay(0, target);
    if (key === 'count') {
      distribute([1, 2], Math.max(0, target - current.reg));
      update();
    }
    if (key === 'pres') {
      distribute([3, 4, 5], Math.max(0, target - current.count));
      update();
    }
  }
  function chart(key, municipality, mo, amount) {
    const holder = q('tj-chart-' + key);
    const width = Math.max(320, Math.round(holder.getBoundingClientRect().width || 700));
    const height = 110, left = 63, right = 18, top = 10, bottom = 31;
    const max = Math.max(cfg[key].minMax, Math.ceil((amount + 10) / 50) * 50);
    const peak = key === 'count' ? Math.max(1, estimate(key, max, municipality, mo) * 1.05) : 1;
    const X = x => left + x / max * (width - left - right);
    const Y = y => height - bottom - y / peak * (height - top - bottom);
    let path = '';
    for (let x = 0; x <= max; x += Math.max(5, max / 100)) {
      path += (x ? 'L' : 'M') + X(x).toFixed(1) + ',' +
        Y(estimate(key, x, municipality, mo)).toFixed(1);
    }
    const value = estimate(key, amount, municipality, mo);
    const display = key === 'count' ? fmt(value) : fmt(value * 100) + '%';
    const ticks = [0, max / 2, max].map(x =>
      `<text x="${X(x)}" y="${height - 11}" text-anchor="middle" fill="var(--foreground)" font-size="12">${fmt(x, 0)}</text>`).join('');
    holder.innerHTML = `<svg viewBox="0 0 ${width} ${height}" data-domain-max="${max}" role="img" aria-label="${cfg[key].label}: ${fmt(amount, 0)} milímetros, ${display}">
      <rect data-chart-frame x="${left}" y="${top}" width="${width - left - right}" height="${height - top - bottom}" fill="none" stroke="var(--border)"/>
      <line x1="${left}" x2="${width - right}" y1="${Y(peak / 2)}" y2="${Y(peak / 2)}" stroke="var(--border)"/>
      <path d="${path}" fill="none" stroke="var(--viz-series-${cfg[key].color})" stroke-width="2.5"/>
      <line x1="${X(amount)}" x2="${X(amount)}" y1="${top}" y2="${height - bottom}" stroke="var(--muted-foreground)" stroke-dasharray="3 4"/>
      <circle cx="${X(amount)}" cy="${Y(value)}" r="7" fill="var(--viz-series-${cfg[key].color})"/>
      ${ticks}<text class="axis-title" data-axis="x" x="${(left + width - right) / 2}" y="${height - 2}" text-anchor="middle" fill="var(--foreground)" font-size="12">Chuva acumulada (mm)</text>
      <text class="axis-title" data-axis="y" transform="translate(13,${height / 2}) rotate(-90)" text-anchor="middle" fill="var(--foreground)" font-size="12">${key === 'count' ? 'Danos humanos' : 'Chance'}</text></svg>`;
  }
  function distance(event, amounts) {
    return Math.abs(event.chuva1 - amounts.reg) / Math.max(15, amounts.reg + 15) +
      Math.abs(event.chuva3 - amounts.count) / Math.max(20, amounts.count + 20) +
      Math.abs(event.chuva6 - amounts.pres) / Math.max(30, amounts.pres + 30);
  }
  function update() {
    const [municipality, mo] = select();
    const amounts = sums();
    for (const key of ['reg', 'count', 'pres']) {
      const value = estimate(key, amounts[key], municipality, mo);
      const display = key === 'count' ? fmt(value) : fmt(value * 100) + '%';
      q('tj-' + key).textContent = display;
      q('tj-label-' + key).textContent = fmt(amounts[key], 1) + ' mm → ' + display;
      chart(key, municipality, mo, amounts[key]);
    }
    const events = data.eventos.filter(e => e.id === municipality.id)
      .sort((a, b) => distance(a, amounts) - distance(b, amounts));
    q('tj-history').innerHTML = events.slice(0, 2).map(e =>
      `<tr><td>${e.data.split('-').reverse().join('/')} · ${e.tipologia}</td><td>${fmt(e.chuva1)} / ${fmt(e.chuva3)} / ${fmt(e.chuva6)} mm</td><td class="text-end">${fmt(e.dano, 0)}</td></tr>`
    ).join('') || '<tr><td colspan="3">Nenhum registro nessa amostra.</td></tr>';
    const beyond = [];
    if (amounts.reg > data.limites.registro) beyond.push('1 dia');
    if (amounts.count > data.limites.contagem) beyond.push('3 dias');
    if (amounts.pres > data.limites.presenca) beyond.push('6 dias');
    const warning = q('tj-warning');
    warning.hidden = !beyond.length;
    if (beyond.length) warning.textContent = 'Acima da maior chuva usada no ajuste para ' +
      beyond.join(', ') + '. Resultado extrapolado.';
  }
  for (const key of ['reg', 'count', 'pres']) {
    const holder = q('tj-chart-' + key);
    function drag(e) {
      const svg = holder.querySelector('svg');
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const width = svg.viewBox.baseVal.width;
      const localX = (e.clientX - rect.left) * width / rect.width;
      const max = Number(svg.dataset.domainMax);
      setCumulative(key, (localX - 63) / (width - 81) * max);
    }
    holder.addEventListener('pointerdown', e => {
      if (!e.target.closest('svg')) return;
      holder.setPointerCapture(e.pointerId);
      drag(e);
      e.preventDefault();
    });
    holder.addEventListener('pointermove', e => {
      if (holder.hasPointerCapture(e.pointerId)) drag(e);
    });
    holder.addEventListener('pointerup', e => {
      if (holder.hasPointerCapture(e.pointerId)) holder.releasePointerCapture(e.pointerId);
    });
  }
  [city, month].forEach(el => el.addEventListener('change', update));
  new ResizeObserver(update).observe(q('tj-chart-reg'));
  update();
})();
