/* =========================================================
   Configurator 3D – Dulap, Comodă și Comodă TV
   Necesită: three.js r128 + OrbitControls (încărcate înainte)
   și site.js (pentru setările din window.SITE).
   ========================================================= */
(function () {
  'use strict';

  const SITE = window.SITE || { whatsapp: '37360605409', delivery: 500, assemblyRate: 0.15, wardrobeAssemblyRate: 0.07 };
  const root = document.querySelector('[data-product]');
  if (!root) return;
  const stage = document.getElementById('stage');
  const panel = document.getElementById('panel');
  const loading = stage.querySelector('.cfg-loading');

  if (!window.THREE || !THREE.OrbitControls) {
    loading.textContent = 'Modelul 3D nu s-a putut încărca. Verifică conexiunea la internet.';
    return;
  }

  /* ---------- Culori disponibile ---------- */
  // [culoare, nume, decor lemn]
  const PALETTE = [
    ['#a69a8b', 'Bej închis U702 Egger'], ['#f2efe9', 'Alb mat'], ['#ebe2d2', 'Crem'], ['#dccab0', 'Bej nisip'], ['#c9b8a3', 'Cașmir'],
    ['#a8998a', 'Taupe'], ['#c9a299', 'Roz pudrat'], ['#b8714f', 'Teracotă'], ['#c8a57c', 'Stejar deschis', true],
    ['#a47b52', 'Stejar natural', true], ['#b08a5e', 'Stejar Halifax', true], ['#7a5a3e', 'Stejar tutun', true],
    ['#6e4e37', 'Nuc', true], ['#3f322b', 'Wenge', true], ['#a9b59c', 'Verde salvie'],
    ['#6f7556', 'Verde măsliniu'], ['#3f5446', 'Verde pădure'], ['#8fa5b2', 'Albastru ceață'], ['#637886', 'Albastru gri'],
    ['#2f3d4f', 'Bleumarin'], ['#c4c3be', 'Gri perlă'], ['#4b4d4f', 'Grafit'], ['#262626', 'Negru mat'], ['#5e2a2e', 'Vișiniu']
  ];

  const T = 1.8; // grosimea plăcii PAL, cm

  /* ---------- Definiția produselor ---------- */
  const PRODUCTS = {
    wardrobe: {
      title: 'Dulap la comandă',
      file: 'dulap.png',
      dims: { w: [60, 400, 150], h: [180, 280, 240], d: [40, 65, 60] },
      color: '#a69a8b',
      colLabel: 'Coloana',
      colsUI: 'stepper',
      colRange: w => [Math.max(1, Math.ceil(w / 100)), Math.max(1, Math.floor(w / 40))],
      defaultCols: w => Math.max(1, Math.round(w / 75)),
      fills: [
        { id: 'H', name: 'Bară', price: 300, items: [['shelf', .12], ['rod', .17, .85]] },
        { id: 'S', name: 'Rafturi', price: 450, items: [['shelf', .2], ['shelf', .4], ['shelf', .6], ['shelf', .8]] },
        { id: 'D', name: 'Bară dublă', price: 600, items: [['shelf', .1], ['rod', .15, .46], ['shelf', .5], ['rod', .55, .94]] },
        { id: 'M', name: 'Bară + rafturi', price: 550, items: [['shelf', .12], ['rod', .17, .58], ['shelf', .62], ['shelf', .81]] },
        { id: 'X', name: 'Sertare', price: 2300, items: [['shelf', .2], ['shelf', .4], ['drawers', .62, 3]] },
        { id: 'HX', name: 'Bară + 2 sertare', price: 1700, items: [['shelf', .1], ['rod', .15, .66], ['shelf', .7], ['drawers', .72, 2]] },
        { id: 'SX', name: 'Rafturi + 2 sertare', price: 1800, items: [['shelf', .18], ['shelf', .36], ['shelf', .54], ['shelf', .7], ['drawers', .72, 2]] },
        { id: 'DX', name: '2 bare + sertar', price: 1400, items: [['shelf', .08], ['rod', .13, .43], ['shelf', .47], ['rod', .52, .82], ['shelf', .86], ['drawers', .88, 1]] },
        { id: 'SH', name: 'Rafturi pentru pantofi', price: 850, items: [['shoe', .12], ['shoe', .27], ['shoe', .42], ['shoe', .57], ['shoe', .72], ['shoe', .87]] },
        { id: 'C', name: 'Compartimente mici', price: 950, items: [['shelf', .2], ['shelf', .4], ['shelf', .6], ['shelf', .8], ['divider', .2, 1]] }
      ],
      defaultFill: i => (i % 2 ? 'S' : 'H'),
      options: [
        { key: 'handle', label: 'Mânere', def: 'bar', choices: [['bar', 'Mâner'], ['profile', 'Profil'], ['push', 'Push-to-open']] },
        { key: 'side', label: 'Deschidere uși', def: 'left', choices: [['left', 'Stânga'], ['right', 'Dreapta']] }
      ],
      price(s) {
        const doors = countDoors(s);
        let p = (s.w * s.h / 10000) * 3800 * (0.75 + 0.25 * s.d / 60);
        p += s.fills.reduce((a, f) => a + fillById(f).price, 0);
        p += doors * ({ profile: 180, bar: 120, push: 250 }[s.opts.handle]);
        if (storage(s)) p += s.w * 8;
        const baseHeight = s.opts.base === 'none' ? 0 : s.structure.baseHeight;
        if (s.opts.base === 'legs') p += (s.cols + 1) * 2 * 65;
        else if (s.opts.base !== 'none') p += s.w * (baseHeight - 8) * 0.3;
        else p -= s.w * 8 * 0.3;
        if (s.opts.roof !== 'standard') p += s.w * s.structure.roofHeight * (s.opts.roof === 'rim' ? 0.35 : 0.65);
        return round10(p);
      }
    },
    tv: {
      title: 'Comodă TV',
      file: 'comoda-tv.png',
      dims: { w: [80, 300, 180], h: [30, 70, 45], d: [30, 50, 40] },
      color: '#a47b52',
      colsUI: 'buttons',
      colLabel: 'Secțiunea',
      colRange: w => [Math.max(1, Math.ceil(w / 100)), Math.min(5, Math.max(1, Math.floor(w / 35)))],
      defaultCols: w => Math.min(4, Math.max(1, Math.round(w / 60))),
      fills: [
        { id: 'flap', name: 'Ușă rabatabilă', price: 400 },
        { id: 'drawers2', name: '2 sertare', price: 1200 },
        { id: 'drawer', name: 'Sertar', price: 650 },
        { id: 'door', name: 'Ușă', price: 350 },
        { id: 'glass', name: 'Ușă din sticlă', price: 650 },
        { id: 'open', name: 'Nișă deschisă', price: 0 }
      ],
      defaultFill: i => ['flap', 'drawers2', 'open', 'drawer', 'door'][i % 5],
      options: [
        { key: 'mount', label: 'Montare', def: 'legs', choices: [['legs', 'Pe picioare'], ['plinth', 'Pe soclu'], ['wall', 'Suspendată']] },
        { key: 'handle', label: 'Mânere', def: 'push', choices: [['push', 'Fără (push)'], ['bar', 'Mâner'], ['profile', 'Profil']] }
      ],
      price(s) {
        let p = (s.w / 100) * (s.h / 45) * 2600 * (0.8 + 0.2 * s.d / 40);
        p += s.fills.reduce((a, f) => a + fillById(f).price, 0);
        const fronts = s.fills.filter(f => f !== 'open').length;
        if (s.opts.handle === 'bar') p += fronts * 100;
        if (s.opts.handle === 'profile') p += fronts * 140;
        p += { legs: 400, plinth: 250 + s.w * 1.2, wall: 300 }[s.opts.mount];
        return round10(p);
      }
    },
    dresser: {
      title: 'Comodă',
      file: 'comoda.png',
      dims: { w: [40, 240, 120], h: [50, 120, 85], d: [35, 55, 45] },
      color: '#b08a5e',
      colsUI: 'buttons',
      colLabel: 'Secțiunea',
      colRange: w => [Math.max(1, Math.ceil(w / 90)), Math.min(4, Math.max(1, Math.floor(w / 35)))],
      defaultCols: w => Math.min(3, Math.max(1, Math.round(w / 55))),
      fills: [
        { id: 'd3', name: '3 sertare', price: 1650, n: 3 },
        { id: 'd4', name: '4 sertare', price: 2100, n: 4 },
        { id: 'd5', name: '5 sertare', price: 2500, n: 5 },
        { id: 'd2', name: '2 sertare mari', price: 1200, n: 2 },
        { id: 'dd', name: 'Sertar + ușă', price: 1000 },
        { id: 'door', name: 'Ușă + rafturi', price: 450 },
        { id: 'open', name: 'Rafturi deschise', price: 150 }
      ],
      defaultFill: i => (i % 2 ? 'd3' : 'd4'),
      options: [
        { key: 'base', label: 'Bază', def: 'legs', choices: [['legs', 'Picioare'], ['plinth', 'Soclu'], ['frame', 'Cadru metalic']] },
        { key: 'handle', label: 'Mânere', def: 'bar', choices: [['bar', 'Mâner'], ['profile', 'Profil'], ['push', 'Push-to-open']] }
      ],
      price(s) {
        let p = (s.w / 100) * (s.h / 85) * 2900 * (0.8 + 0.2 * s.d / 45);
        p += s.fills.reduce((a, f) => a + fillById(f).price, 0);
        const fronts = s.fills.reduce((a, f) => a + (fillById(f).n || (f === 'dd' ? 2 : f === 'open' ? 0 : 1)), 0);
        p += fronts * ({ bar: 90, profile: 130, push: 160 }[s.opts.handle]);
        p += { legs: 350, plinth: s.w * 1.5, frame: 700 + s.w * 3 }[s.opts.base];
        return round10(p);
      }
    }
  };

  const key = root.dataset.product;
  const P = PRODUCTS[key];
  const fillById = id => P.fills.find(f => f.id === id) || P.fills[0];
  const round10 = v => Math.round(v / 10) * 10;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const fmt = v => v.toLocaleString('ro-RO').replace(/\./g, ' ');
  const STRUCTURE_OPTIONS = [
    { key: 'base', label: 'Soclu', def: 'flush', choices: [['recessed', 'Retras'], ['flush', 'La nivel'], ['legs', 'Picioare'], ['none', 'Fără soclu']] },
    { key: 'roof', label: 'Partea superioară', def: 'standard', choices: [['standard', 'Standard'], ['rim', 'Laterale înălțate'], ['fascia', 'Bandă frontală'], ['inset', 'Bandă retrasă']] },
    { key: 'mezz', label: 'Uși depozitar sus', def: 'full', choices: [['full', 'Uși întregi'], ['split', 'Uși separate']] }
  ];
  const STRUCTURE_DIMS = {
    baseHeight: [4, 20, 8], setback: [0, 10, 4], roofHeight: [4, 20, 6],
    handleLength: [10, 120, 120]
  };
  const allOptions = key === 'wardrobe' ? P.options.concat(STRUCTURE_OPTIONS) : P.options;
  const bodyHeight = s => s.h - (s.opts.roof === 'standard' ? 0 : s.structure.roofHeight);
  const ROD_Y = 200;        // înălțimea barei de umerașe de la podea (cu soclu), cm
  const STORAGE_FROM = 220; // peste această înălțime dulapul primește depozitar sus
  const DOOR_MAX = 60;      // o coloană mai lată de atât are 2 uși, cm
  const HANDLE_TOP = 122;   // capătul de sus al mânerului, de la marginea de jos a ușii, cm
  // Înălțimea interioară a depozitarului de sus (0 = fără depozitar)
  const storage = s => {
    if (key !== 'wardrobe' || s.h <= STORAGE_FROM) return 0;
    const room = bodyHeight(s) - T - (ROD_Y + 2 + T);
    return room >= 10 ? room : 0;
  };
  const splitDoors = s => storage(s) > 0 && s.opts.mezz === 'split';
  function countDoors(s) {
    const per = columns(s.w, s.cols).reduce((a, c) => a + (c.right - c.left > DOOR_MAX ? 2 : 1), 0);
    return per * (splitDoors(s) ? 2 : 1);
  }

  /* ---------- Starea (citită din link) ---------- */
  // Culoarea și mânerele se păstrează între dulap, comodă și comoda TV
  const PAGES = [['wardrobe', 'dulap.html', 'Dulap'], ['dresser', 'comoda.html', 'Comodă'], ['tv', 'comoda-tv.html', 'Comodă TV']];
  let shared = {};
  try { shared = JSON.parse(localStorage.getItem('mobis-cfg')) || {}; } catch (e) { shared = {}; }
  const q = new URLSearchParams(location.search);
  if (!q.has('c') && shared.c) q.set('c', shared.c);
  if (!q.has('handle') && shared.handle) q.set('handle', shared.handle);
  const qNum = (k, r) => { const v = parseInt(q.get(k), 10); return isNaN(v) ? r[2] : clamp(v, r[0], r[1]); };
  const state = {
    w: qNum('w', P.dims.w), h: qNum('h', P.dims.h), d: qNum('d', P.dims.d),
    color: PALETTE.some(c => c[0] === '#' + q.get('c')) ? '#' + q.get('c') : P.color,
    cols: parseInt(q.get('n'), 10) || 0,
    fills: (q.get('cfg') || '').split(',').filter(f => P.fills.some(x => x.id === f)),
    opts: {},
    structure: {},
    svc: { delivery: false, assembly: false },
    sel: 0,
    open: false,
    room: ['warm', 'dark', 'light'].includes(q.get('room')) ? q.get('room') : 'off'
  };
  allOptions.forEach(o => {
    const v = q.get(o.key);
    state.opts[o.key] = o.choices.some(c => c[0] === v) ? v : o.def;
  });
  if (key === 'wardrobe') Object.entries(STRUCTURE_DIMS).forEach(([field, range]) => {
    state.structure[field] = qNum(field, range);
  });
  if (!state.cols) state.cols = P.defaultCols(state.w);

  function normalize() {
    const [mn, mx] = P.colRange(state.w);
    state.cols = clamp(state.cols, mn, mx);
    while (state.fills.length < state.cols) state.fills.push(P.defaultFill(state.fills.length));
    state.fills.length = state.cols;
    state.sel = clamp(state.sel, 0, state.cols - 1);
  }

  /* =======================================================
     SCENA 3D
     ======================================================= */
  const lin = hex => new THREE.Color(hex).convertSRGBToLinear();
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.className = 'cfg-canvas';
  stage.prepend(renderer.domElement);

  const scene = new THREE.Scene();
  scene.background = lin('#d9cfc3');
  const camera = new THREE.PerspectiveCamera(32, 1, 1, 10000);
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = false;
  controls.minAzimuthAngle = -1.1;
  controls.maxAzimuthAngle = 1.1;
  controls.minPolarAngle = 0.6;
  controls.maxPolarAngle = Math.PI / 2 - 0.04;

  scene.add(new THREE.HemisphereLight(0xffffff, lin('#cdbfae'), 0.7));
  const sun = new THREE.DirectionalLight(lin('#fff3e2'), 0.95);
  sun.position.set(-260, 420, 380);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -420, right: 420, top: 420, bottom: -120, near: 10, far: 1600 });
  sun.shadow.bias = -0.0004;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0xffffff, 0.25);
  fill.position.set(300, 200, 500);
  scene.add(fill);

  // Camera: podea, perete, covor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000),
    new THREE.MeshStandardMaterial({ color: lin('#c9b9a4'), roughness: 0.95 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(4000, 1400),
    new THREE.MeshStandardMaterial({ color: lin('#e6ddd1'), roughness: 1 }));
  wall.position.set(0, 700, -0.5);
  wall.receiveShadow = true;
  scene.add(wall);
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
    new THREE.MeshStandardMaterial({ color: lin('#ebe4d9'), roughness: 1 }));
  rug.rotation.x = -Math.PI / 2;
  rug.position.y = 0.2;
  rug.receiveShadow = true;
  scene.add(rug);

  // Materiale
  const M = {
    body: new THREE.MeshStandardMaterial({ roughness: 0.62, metalness: 0 }),
    inner: new THREE.MeshStandardMaterial({ roughness: 0.7 }),
    metal: new THREE.MeshStandardMaterial({ color: lin('#b9bdc0'), metalness: 0.85, roughness: 0.3 }),
    dark: new THREE.MeshStandardMaterial({ color: lin('#2a2a2a'), metalness: 0.5, roughness: 0.4 }),
    screen: new THREE.MeshStandardMaterial({ color: lin('#2a3034'), roughness: 0.18, metalness: 0.3 }),
    vase: new THREE.MeshStandardMaterial({ color: lin('#e9e1d4'), roughness: 0.8 }),
    glass: new THREE.MeshStandardMaterial({ color: lin('#5d6466'), roughness: 0.08, metalness: 0.2, transparent: true, opacity: 0.42 }),
    shade: new THREE.MeshStandardMaterial({ color: lin('#f3e6cf'), emissive: lin('#ffcf8a'), emissiveIntensity: 0.55, roughness: 0.9, side: THREE.DoubleSide }),
    slat: new THREE.MeshStandardMaterial({ map: null, color: lin('#ffffff'), roughness: 0.7 }),
    brass: new THREE.MeshStandardMaterial({ color: lin('#b48a4e'), metalness: 0.8, roughness: 0.35 }),
    books: ['#7b4b3a', '#d8cdb9', '#46564d', '#a8763f', '#2f3a45', '#bfae95'].map(c =>
      new THREE.MeshStandardMaterial({ color: lin(c), roughness: 0.85 })),
    clothes: ['#d9cfc0', '#8fa5b2', '#f2eee8', '#6f7556', '#c9a299', '#3f4a55'].map(c =>
      new THREE.MeshStandardMaterial({ color: lin(c), roughness: 0.95 }))
  };
  const sel = new THREE.LineBasicMaterial({ color: lin('#2f5d57') });

  const BOX = new THREE.BoxGeometry(1, 1, 1);
  const ROD = new THREE.CylinderGeometry(1, 1, 1, 16);

  function box(w, h, d, x, y, z, mat, parent) {
    const m = new THREE.Mesh(BOX, mat);
    m.scale.set(w, h, d);
    m.position.set(x, y, z);
    m.castShadow = m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function cyl(r, len, x, y, z, mat, parent, horizontal) {
    const m = new THREE.Mesh(ROD, mat);
    m.scale.set(r, len, r);
    if (horizontal) m.rotation.z = Math.PI / 2;
    m.position.set(x, y, z);
    m.castShadow = true;
    parent.add(m);
    return m;
  }

  /* ---------- Texturi desenate (lemn, parchet, tablou) ---------- */
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const seeded = n => { let v = n % 2147483646 + 1; return () => (v = v * 16807 % 2147483647) / 2147483647; };
  function canvasTex(c, repeat) {
    const t = new THREE.CanvasTexture(c);
    t.encoding = THREE.sRGBEncoding;
    t.anisotropy = maxAniso;
    if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
    return t;
  }
  function grain(x, rnd, x0, y0, w, h, lines) {
    // benzi largi de nuanță, apoi fibre fine
    for (let i = 0; i < lines / 8; i++) {
      x.fillStyle = rnd() < 0.5 ? `rgba(60,35,15,${0.03 + rnd() * 0.06})` : `rgba(255,240,220,${0.03 + rnd() * 0.05})`;
      x.fillRect(x0 + rnd() * w, y0, 4 + rnd() * 22, h);
    }
    for (let i = 0; i < lines; i++) {
      const px = x0 + rnd() * w, amp = 0.3 + rnd() * 1.6, fr = 0.002 + rnd() * 0.006, ph = rnd() * 6;
      x.strokeStyle = rnd() < 0.7 ? `rgba(45,26,10,${0.04 + rnd() * 0.12})` : `rgba(255,238,215,${0.03 + rnd() * 0.06})`;
      x.lineWidth = 0.3 + rnd() * 1.4;
      x.beginPath();
      for (let y = 0; y <= h; y += 12) {
        const xx = px + Math.sin((y0 + y) * fr + ph) * amp;
        if (y) x.lineTo(xx, y0 + y); else x.moveTo(xx, y0 + y);
      }
      x.stroke();
    }
  }
  const woodCache = {};
  function woodTexture(hex) {
    if (woodCache[hex]) return woodCache[hex];
    const c = document.createElement('canvas');
    c.width = 256; c.height = 1024;
    const x = c.getContext('2d'), rnd = seeded(parseInt(hex.slice(1), 16));
    x.fillStyle = hex;
    x.fillRect(0, 0, 256, 1024);
    grain(x, rnd, -10, 0, 276, 1024, 170);
    return (woodCache[hex] = canvasTex(c));
  }
  function parquetTexture(hex) {
    const key2 = 'p' + hex;
    if (woodCache[key2]) return woodCache[key2];
    const c = document.createElement('canvas');
    c.width = 512; c.height = 512;
    const x = c.getContext('2d'), rnd = seeded(parseInt(hex.slice(1), 16) + 7), base = new THREE.Color(hex);
    for (let row = 0; row < 8; row++) {
      let px = -rnd() * 300;
      while (px < 512) {
        const len = 220 + rnd() * 200, tone = base.clone().offsetHSL(0, (rnd() - .5) * .06, (rnd() - .5) * .08);
        x.save();
        x.translate(0, 0);
        x.beginPath(); x.rect(px, row * 64, len, 64); x.clip();
        x.fillStyle = '#' + tone.getHexString();
        x.fillRect(px, row * 64, len, 64);
        x.translate(px, row * 64 + 64); x.rotate(-Math.PI / 2);
        grain(x, rnd, 0, 0, 64, len, 22);
        x.restore();
        x.fillStyle = 'rgba(30,18,8,.35)';
        x.fillRect(px, row * 64, 1.5, 64);
        px += len;
      }
      x.fillStyle = 'rgba(30,18,8,.3)';
      x.fillRect(0, row * 64, 512, 1.2);
    }
    return (woodCache[key2] = canvasTex(c, [30, 30]));
  }
  let artTex = null;
  function artTexture() {
    if (artTex) return artTex;
    const c = document.createElement('canvas');
    c.width = 384; c.height = 512;
    const x = c.getContext('2d');
    x.fillStyle = '#e8dccb'; x.fillRect(0, 0, 384, 512);
    x.fillStyle = '#b8714f'; x.beginPath(); x.arc(150, 230, 95, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#6f7556'; x.fillRect(190, 260, 130, 170);
    x.strokeStyle = '#3f322b'; x.lineWidth = 5; x.beginPath(); x.arc(250, 160, 70, Math.PI, Math.PI * 2); x.stroke();
    x.fillStyle = '#c8a57c'; x.fillRect(60, 380, 110, 50);
    return (artTex = canvasTex(c));
  }
  const isWood = hex => !!(PALETTE.find(c => c[0] === hex) || [])[2];

  // Cărți / obiecte într-o nișă deschisă
  function books(g, x0, x1, y, z, seed) {
    const rnd = seeded(seed * 97 + 13);
    let x = x0 + 2;
    const end = x0 + (x1 - x0) * (0.45 + rnd() * 0.3);
    while (x < end) {
      const bw = 1.8 + rnd() * 2.2, bh = 14 + rnd() * 8;
      box(bw, bh, 14 + rnd() * 6, x + bw / 2, y + bh / 2, z, M.books[Math.floor(rnd() * M.books.length)], g);
      x += bw + 0.2;
    }
  }

  // Lampă de masă
  function tableLamp(g, x, y, z, h) {
    cyl(5, 1.5, x, y + 0.75, z, M.brass, g);
    cyl(0.6, h * 0.62, x, y + h * 0.31, z, M.brass, g);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(7, 11, h * 0.42, 32, 1, true), M.shade);
    shade.position.set(x, y + h * 0.72, z);
    g.add(shade);
  }

  let model = null;   // { group, movers, hits, outline }

  // Geometria coloanelor (comună)
  function columns(W, n) {
    const cw = (W - 2 * T - (n - 1) * T) / n;
    return Array.from({ length: n }, (_, i) => {
      const x0 = T + i * (cw + T);
      return {
        x0, cw, cx: x0 + cw / 2,
        left: i === 0 ? 0 : x0 - T / 2,
        right: i === n - 1 ? W : x0 + cw + T / 2
      };
    });
  }

  // Ușă cu balama verticală
  // handleLen: mâner lung, iar handleY este capătul lui de jos
  function addDoor(o, x0, x1, y0, y1, z, hinge, handle, handleY, mat, handleLen) {
    const dw = x1 - x0, dh = y1 - y0, sg = hinge === 'left' ? 1 : -1;
    const piv = new THREE.Group();
    piv.position.set(hinge === 'left' ? x0 : x1, y0, z);
    box(dw, dh, mat ? 0.6 : T, sg * dw / 2, dh / 2, T / 2, mat || M.body, piv);
    if (mat) [[dw, 2.2, sg * dw / 2, 1.1], [dw, 2.2, sg * dw / 2, dh - 1.1]].forEach(r => box(r[0], r[1], T, r[2], r[3], T / 2, M.dark, piv));
    if (handle === 'bar') {
      const hl = handleLen ? Math.min(handleLen, dh - 4) : Math.min(32, dh * 0.4);
      const hy = handleLen ? clamp(handleY - y0 + hl / 2, hl / 2 + 2, dh - hl / 2 - 2)
        : handleY != null ? clamp(handleY - y0, hl / 2 + 4, dh - hl / 2 - 4) : dh / 2;
      box(1.2, hl, 1.2, sg * (dw - 4), hy, T + 1.6, M.metal, piv);
      box(1, 1, 1.6, sg * (dw - 4), hy + hl / 2 - 3, T + 0.8, M.metal, piv);
      box(1, 1, 1.6, sg * (dw - 4), hy - hl / 2 + 3, T + 0.8, M.metal, piv);
    } else if (handle === 'profile') {
      box(1.4, dh, 1, sg * (dw - 0.7), dh / 2, T + 0.5, M.metal, piv);
    }
    piv.userData = { axis: 'y', open: -sg * 1.7, cur: 0 };
    o.group.add(piv);
    o.movers.push(piv);
  }

  // Ușă rabatabilă (balama jos)
  function addFlap(o, x0, x1, y0, y1, z, handle) {
    const dw = x1 - x0, dh = y1 - y0;
    const piv = new THREE.Group();
    piv.position.set(x0, y0, z);
    box(dw, dh, T, dw / 2, dh / 2, T / 2, M.body, piv);
    if (handle === 'bar') box(Math.min(20, dw * 0.4), 1.2, 1.2, dw / 2, dh - 4, T + 1.4, M.metal, piv);
    piv.userData = { axis: 'x', open: 1.35, cur: 0 };
    o.group.add(piv);
    o.movers.push(piv);
  }

  // Sertar (front + corp), glisează în față
  function addDrawer(o, x0, x1, y0, y1, zFront, depth, handle, inner) {
    const dw = x1 - x0, dh = y1 - y0;
    const g = new THREE.Group();
    g.position.set(0, 0, 0);
    box(dw, dh, T, x0 + dw / 2, y0 + dh / 2, zFront + T / 2, M.body, g);
    const bodyH = Math.max(6, dh - 6);
    box(dw - (inner ? 3 : 5), bodyH, depth, x0 + dw / 2, y0 + 1 + bodyH / 2, zFront - depth / 2, M.inner, g);
    if (handle === 'bar') box(Math.min(18, dw * 0.35), 1.2, 1.2, x0 + dw / 2, y0 + dh - Math.min(5, dh / 3), zFront + T + 1.4, M.metal, g);
    else if (handle === 'profile') box(dw - 1, 1.2, 1, x0 + dw / 2, y0 + dh - 0.6, zFront + T + 0.5, M.metal, g);
    else if (inner) box(Math.min(14, dw * 0.3), 0.8, 0.4, x0 + dw / 2, y0 + dh - 2.5, zFront + T + 0.1, M.dark, g);
    g.userData = { axis: 'z', open: Math.min(depth * 0.7, 35), cur: 0 };
    o.group.add(g);
    o.movers.push(g);
  }

  function hitBox(o, c, i, y0, y1, D) {
    const m = new THREE.Mesh(BOX, M.body);
    m.visible = false;
    m.scale.set(c.cw, y1 - y0, D);
    m.position.set(c.cx, (y0 + y1) / 2, D / 2);
    m.userData.col = i;
    o.group.add(m);
    o.hits.push(m);
  }

  /* ---------- Dulap ---------- */
  function buildWardrobe(s) {
    const o = { group: new THREE.Group(), movers: [], hits: [], cols: [], top: s.h };
    const { w: W, d: D } = s, H = bodyHeight(s), g = o.group;
    const PL = s.opts.base === 'none' ? 0 : s.structure.baseHeight;
    const sideBottom = s.opts.base === 'legs' ? PL : 0;
    const mz = storage(s);

    box(T, H - sideBottom, D, T / 2, (H + sideBottom) / 2, D / 2, M.body, g);
    box(T, H - sideBottom, D, W - T / 2, (H + sideBottom) / 2, D / 2, M.body, g);
    box(W - 2 * T, T, D, W / 2, H - T / 2, D / 2, M.body, g);
    box(W - 2 * T, T, D, W / 2, PL + T / 2, D / 2, M.body, g);
    if (s.opts.base === 'recessed' || s.opts.base === 'flush') {
      const setback = s.opts.base === 'recessed' ? s.structure.setback : 0;
      box(W - 2 * T, PL, T, W / 2, PL / 2, D - setback - T / 2, M.body, g);
      box(W - 2 * T, PL, T, W / 2, PL / 2, T / 2, M.body, g);
    } else if (s.opts.base === 'legs') {
      Array.from({ length: s.cols + 1 }, (_, index) => 4 + index * (W - 8) / s.cols).forEach(x => {
        [4, D - 4].forEach(z => cyl(1.4, PL, x, PL / 2, z, M.dark, g));
      });
    }
    box(W - 2 * T, H - PL - 2 * T, 0.6, W / 2, (H + PL) / 2, 0.8, M.inner, g);

    if (s.opts.roof !== 'standard') {
      const roofHeight = s.structure.roofHeight;
      box(T, roofHeight, D, T / 2, H + roofHeight / 2, D / 2, M.body, g);
      box(T, roofHeight, D, W - T / 2, H + roofHeight / 2, D / 2, M.body, g);
      if (s.opts.roof === 'rim') {
        box(W - 2 * T, roofHeight, T, W / 2, H + roofHeight / 2, T / 2, M.body, g);
      } else {
        const front = s.opts.roof === 'inset' ? D - 4 : D;
        box(W - 2 * T, roofHeight, T, W / 2, H + roofHeight / 2, front - T / 2, M.body, g);
      }
    }

    const yb = PL + T;
    const yt = mz ? ROD_Y + 2 : H - T;
    const ih = yt - yb;
    const cols = columns(W, s.cols);
    o.cols = cols.map(c => ({ ...c, y0: yb, y1: yt }));

    cols.forEach((c, i) => {
      if (i > 0) box(T, H - PL - 2 * T, D - 1.5, c.x0 - T / 2, (H + PL) / 2, (D - 1.5) / 2 + 1, M.body, g);
      if (mz) box(c.cw, T, D - 1.5, c.cx, yt + T / 2, (D - 1.5) / 2 + 1, M.body, g);

      const f = fillById(s.fills[i]);
      // Bara de sus stă la ROD_Y de la podea; restul se așază proporțional sub ea
      const rod = f.items.find(it => it[0] === 'rod');
      const r0 = rod && yt >= ROD_Y + 2 ? rod[1] : 0, top = r0 ? ROD_Y + 2 : yt;
      const at = v => (v < r0 ? top + 2 + T : top - (v - r0) / (1 - r0) * (top - yb));
      f.items.forEach(it => {
        const y = at(it[1]);
        if (it[1] < r0 && y > yt - 12) return; // nu încape raftul de deasupra barei
        if (it[0] === 'shelf') {
          box(c.cw, T, D - 4, c.cx, y - T / 2, (D - 4) / 2 + 1, M.body, g);
        } else if (it[0] === 'shoe') {
          const shelf = box(c.cw, T, D - 8, c.cx, y - T / 2, D / 2, M.body, g);
          shelf.rotation.x = 0.12;
          box(c.cw, 2.4, T, c.cx, y - (D - 8) * 0.06 + 0.6, D - 4, M.body, g);
        } else if (it[0] === 'divider') {
          const bottom = at(it[2]);
          box(T, y - bottom, D - 4, c.cx, (y + bottom) / 2, (D - 4) / 2 + 1, M.body, g);
        } else if (it[0] === 'rod') {
          cyl(1.2, c.cw, c.cx, y - 2, D / 2, M.metal, g, true);
          const len = Math.max(20, y - at(it[2]) - 6);
          const count = Math.max(1, Math.floor((c.cw - 4) / 7));
          const step = (c.cw - 4) / count;
          for (let k = 0; k < count; k++) {
            const l = len * (0.78 + 0.22 * (((k * 7) % 5) / 4));
            box(2.4, l, D * 0.62, c.x0 + 2 + step * (k + 0.5), y - 3 - l / 2, D / 2, M.clothes[(k + i) % M.clothes.length], g);
          }
        } else if (it[0] === 'drawers') {
          const y0 = yb, y1 = y, dh = (y1 - y0) / it[2];
          for (let k = 0; k < it[2]; k++) {
            addDrawer(o, c.x0 + 0.3, c.x0 + c.cw - 0.3, y0 + k * dh + 0.3, y0 + (k + 1) * dh - 0.3, D - 2.5 - T, D - 8, null, true);
          }
        }
      });
      hitBox(o, c, i, yb, yt, D);
    });

    // Uși (suprapuse pe toată fața)
    const zf = D + 0.15;
    const split = yt + T / 2;
    const bottomDoor = splitDoors(s) ? [PL + 0.2, split - 0.15] : [PL + 0.2, H - 0.2];
    // Capătul de sus al mânerului rămâne la HANDLE_TOP de la marginea de jos a ușii; scurtarea se face de jos
    const handleBottom = PL + 0.2 + HANDLE_TOP - s.structure.handleLength;
    const rows = [bottomDoor.concat(handleBottom, s.structure.handleLength)];
    if (splitDoors(s)) rows.push([split + 0.15, H - 0.2, null, null]);
    cols.forEach((c, i) => {
      const span = c.right - c.left, k = span > DOOR_MAX ? 2 : 1;
      for (let j = 0; j < k; j++) {
        const x0 = c.left + j * span / k + 0.15, x1 = c.left + (j + 1) * span / k - 0.15;
        let hinge;
        if (k === 2) hinge = j === 0 ? 'left' : 'right';
        else hinge = ((i % 2 === 0) === (s.opts.side === 'left')) ? 'left' : 'right';
        rows.forEach(r => addDoor(o, x0, x1, r[0], r[1], zf, hinge, s.opts.handle, r[2], null, r[3]));
      }
    });
    return o;
  }

  /* ---------- Comodă TV ---------- */
  function buildTv(s) {
    const o = { group: new THREE.Group(), movers: [], hits: [], cols: [] };
    const { w: W, h: H, d: D } = s, g = o.group;
    const y0 = { legs: 12, plinth: 7, wall: 34 }[s.opts.mount];
    const handle = s.opts.handle;

    box(W, T, D, W / 2, y0 + H - T / 2, D / 2, M.body, g);
    box(T, H - T, D, T / 2, y0 + (H - T) / 2, D / 2, M.body, g);
    box(T, H - T, D, W - T / 2, y0 + (H - T) / 2, D / 2, M.body, g);
    box(W - 2 * T, T, D, W / 2, y0 + T / 2, D / 2, M.body, g);
    box(W - 2 * T, H - 2 * T, 0.6, W / 2, y0 + H / 2, 0.8, M.inner, g);

    if (s.opts.mount === 'legs') {
      [[5, 5], [W - 5, 5], [5, D - 5], [W - 5, D - 5]].forEach(p => cyl(1.4, y0, p[0], y0 / 2, p[1], M.dark, g));
    } else if (s.opts.mount === 'plinth') {
      box(W - 2 * T, y0, T, W / 2, y0 / 2, D - 4 - T / 2, M.body, g);
    }

    const yb = y0 + T, yt = y0 + H - T, ih = yt - yb;
    const cols = columns(W, s.cols);
    o.cols = cols.map(c => ({ ...c, y0: yb, y1: yt }));
    const zf = D + 0.15;

    cols.forEach((c, i) => {
      if (i > 0) box(T, H - 2 * T, D - 1.5, c.x0 - T / 2, y0 + H / 2, (D - 1.5) / 2 + 1, M.body, g);
      const id = s.fills[i];
      const fx0 = c.left + 0.15, fx1 = c.right - 0.15, fy0 = y0 + 0.2, fy1 = y0 + H - T - 0.15;
      if (['door', 'flap', 'open', 'glass'].includes(id) && ih > 22) {
        box(c.cw, T, D - 4, c.cx, yb + ih / 2, (D - 4) / 2 + 1, M.body, g);
      }
      if (id === 'open' || id === 'glass') books(g, c.x0, c.x0 + c.cw, yb, D / 2, i + 1);
      if (id === 'door') addDoor(o, fx0, fx1, fy0, fy1, zf, i % 2 ? 'right' : 'left', handle, null);
      if (id === 'glass') addDoor(o, fx0, fx1, fy0, fy1, zf, i % 2 ? 'right' : 'left', handle === 'push' ? 'push' : 'profile', null, M.glass);
      if (id === 'flap') addFlap(o, fx0, fx1, fy0, fy1, zf, handle);
      if (id === 'drawer') addDrawer(o, fx0, fx1, fy0, fy1, zf, D - 6, handle, false);
      if (id === 'drawers2') {
        const mid = (fy0 + fy1) / 2;
        addDrawer(o, fx0, fx1, fy0, mid - 0.15, zf, D - 6, handle, false);
        addDrawer(o, fx0, fx1, mid + 0.15, fy1, zf, D - 6, handle, false);
      }
      hitBox(o, c, i, yb, yt, D);
    });

    // Televizor pe perete + decor (în camera amenajată: perete cu lamele de lemn)
    const tvW = clamp(W * 0.6, 70, 140), tvH = tvW * 9 / 16, tvY = y0 + H + 22 + tvH / 2;
    const slats = state.room !== 'off', tz = slats ? 4.2 : 1.6;
    if (slats) {
      const sw = 3.4, gap = 1.6, n = Math.floor((W + 60) / (sw + gap));
      for (let k = 0; k < n; k++) box(sw, 250, 2, -30 + k * (sw + gap) + sw / 2, 125, 1.2, M.slat, g);
    }
    box(tvW, tvH, 2.6, W / 2, tvY, tz, M.dark, g);
    box(tvW - 1.6, tvH - 1.6, 0.2, W / 2, tvY, tz + 1.4, M.screen, g);
    if (W > 110) {
      const v = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 3.5, 20, 24), M.vase);
      v.position.set(W - 16, y0 + H + 10, D / 2);
      v.castShadow = true;
      g.add(v);
    }
    o.top = tvY + tvH / 2;
    return o;
  }

  /* ---------- Comodă ---------- */
  function buildDresser(s) {
    const o = { group: new THREE.Group(), movers: [], hits: [], cols: [] };
    const { w: W, h: H, d: D } = s, g = o.group;
    const base = s.opts.base, handle = s.opts.handle;
    const y0 = { legs: 14, plinth: 8, frame: 16 }[base];
    const bh = H - y0; // corpul, fără bază

    box(W, T, D, W / 2, H - T / 2, D / 2, M.body, g);
    box(T, bh - T, D, T / 2, y0 + (bh - T) / 2, D / 2, M.body, g);
    box(T, bh - T, D, W - T / 2, y0 + (bh - T) / 2, D / 2, M.body, g);
    box(W - 2 * T, T, D, W / 2, y0 + T / 2, D / 2, M.body, g);
    box(W - 2 * T, bh - 2 * T, 0.6, W / 2, y0 + bh / 2, 0.8, M.inner, g);

    if (base === 'legs') {
      [[6, 6], [W - 6, 6], [6, D - 6], [W - 6, D - 6]].forEach(p => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.1, y0, 16), M.brass);
        leg.position.set(p[0], y0 / 2, p[1]);
        leg.castShadow = true;
        g.add(leg);
      });
    } else if (base === 'plinth') {
      box(W - 2 * T, y0, T, W / 2, y0 / 2, D - 4 - T / 2, M.body, g);
      box(T, y0, D - 4, T / 2, y0 / 2, (D - 4) / 2, M.body, g);
      box(T, y0, D - 4, W - T / 2, y0 / 2, (D - 4) / 2, M.body, g);
    } else {
      // cadru metalic negru
      [[1.5, 1.5], [W - 1.5, 1.5], [1.5, D - 1.5], [W - 1.5, D - 1.5]].forEach(p => box(2, y0, 2, p[0], y0 / 2, p[1], M.dark, g));
      [3, y0 - 1].forEach(y => {
        box(W, 2, 2, W / 2, y, 1.5, M.dark, g);
        box(W, 2, 2, W / 2, y, D - 1.5, M.dark, g);
        box(2, 2, D, 1.5, y, D / 2, M.dark, g);
        box(2, 2, D, W - 1.5, y, D / 2, M.dark, g);
      });
    }

    const yb = y0 + T, yt = H - T, ih = yt - yb;
    const cols = columns(W, s.cols);
    o.cols = cols.map(c => ({ ...c, y0: yb, y1: yt }));
    const zf = D + 0.15;

    cols.forEach((c, i) => {
      if (i > 0) box(T, bh - 2 * T, D - 1.5, c.x0 - T / 2, y0 + bh / 2, (D - 1.5) / 2 + 1, M.body, g);
      const f = fillById(s.fills[i]);
      const fx0 = c.left + 0.15, fx1 = c.right - 0.15, fy0 = y0 + 0.2, fy1 = H - T - 0.15;
      const hinge = i % 2 ? 'right' : 'left';
      if (f.n) {
        const dh = (fy1 - fy0) / f.n;
        for (let k = 0; k < f.n; k++) addDrawer(o, fx0, fx1, fy0 + k * dh + 0.15, fy0 + (k + 1) * dh - 0.15, zf, D - 6, handle, false);
      } else if (f.id === 'dd') {
        const split = fy1 - Math.min(20, (fy1 - fy0) * 0.3);
        box(c.cw, T, D - 2, c.cx, split - T / 2, (D - 2) / 2, M.body, g);
        if (ih > 50) box(c.cw, T, D - 4, c.cx, (yb + split) / 2, (D - 4) / 2 + 1, M.body, g);
        addDrawer(o, fx0, fx1, split + 0.15, fy1, zf, D - 6, handle, false);
        addDoor(o, fx0, fx1, fy0, split - 0.15, zf, hinge, handle, split - 8);
      } else {
        const shelves = Math.max(1, Math.floor(ih / 30));
        for (let k = 1; k <= shelves; k++) box(c.cw, T, D - 4, c.cx, yb + k * ih / (shelves + 1), (D - 4) / 2 + 1, M.body, g);
        if (f.id === 'open') books(g, c.x0, c.x0 + c.cw, yb, D / 2, i + 3);
        else addDoor(o, fx0, fx1, fy0, fy1, zf, hinge, handle, fy1 - 10);
      }
      hitBox(o, c, i, yb, yt, D);
    });

    // Decor: tablou pe perete, lampă și vază pe blat
    const artW = clamp(W * 0.42, 40, 80), artH = artW * 1.3, artY = H + 24 + artH / 2;
    box(artW + 4, artH + 4, 2.4, W / 2, artY, 1.4, M.slat, g);
    const art = new THREE.Mesh(new THREE.PlaneGeometry(artW, artH), new THREE.MeshStandardMaterial({ map: artTexture(), roughness: 0.9 }));
    art.position.set(W / 2, artY, 2.7);
    g.add(art);
    if (W >= 70) tableLamp(g, 16, H, D / 2, 42);
    const v = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 5, 18, 24), M.vase);
    v.position.set(W - 14, H + 9, D / 2);
    v.castShadow = true;
    g.add(v);
    o.top = artY + artH / 2;
    return o;
  }

  /* ---------- Camera amenajată ---------- */
  M.slat.map = woodTexture('#6e4e37');
  const ROOMS = {
    warm: { label: 'Living cald', wall: '#cbbba7', floor: '#a07a55', rug: '#e4d8c6', exposure: 1.05 },
    dark: { label: 'Seară', wall: '#6a5d51', floor: '#6b4b33', rug: '#a69a8b', exposure: 0.95 },
    light: { label: 'Luminos', wall: '#ece6dc', floor: '#c8a77f', rug: '#f1ebe1', exposure: 1.08 }
  };
  const STUDIO = { wall: '#e6ddd1', floor: '#c9b9a4', rug: '#ebe4d9', exposure: 1.05 };
  const room = new THREE.Group();
  scene.add(room);
  const R = {
    fabric: new THREE.MeshStandardMaterial({ color: lin('#8c7f70'), roughness: 1 }),
    leaf: new THREE.MeshStandardMaterial({ color: lin('#55684a'), roughness: 0.8 }),
    pot: new THREE.MeshStandardMaterial({ color: lin('#c9b8a3'), roughness: 0.9 }),
    sky: new THREE.MeshBasicMaterial({ color: lin('#fff6e6') }),
    frame: new THREE.MeshStandardMaterial({ color: lin('#f4efe8'), roughness: 0.6 }),
    curtain: new THREE.MeshStandardMaterial({ color: lin('#efe6d8'), roughness: 1, side: THREE.DoubleSide })
  };
  const sideWall = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1400), wall.material);
  sideWall.rotation.y = Math.PI / 2;
  sideWall.receiveShadow = true;
  const lampLight = new THREE.PointLight(lin('#ffd39a'), 0.5, 420, 2);

  function plant(x, z, h) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(14, 10, 30, 24), R.pot);
    p.position.set(x, 15, z);
    p.castShadow = true;
    room.add(p);
    const rnd = seeded(Math.round(h));
    for (let k = 0; k < 9; k++) {
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(10 + rnd() * 10, 12, 10), R.leaf);
      leaf.scale.set(1, 1.5, 0.5 + rnd() * .5);
      leaf.position.set(x + (rnd() - .5) * 34, 40 + (k / 9) * h + rnd() * 10, z + (rnd() - .5) * 26);
      leaf.rotation.set(rnd(), rnd() * 3, rnd());
      leaf.castShadow = true;
      room.add(leaf);
    }
    box(1.6, h * 0.7, 1.6, x, 30 + h * 0.35, z, M.inner, room);
  }

  function armchair(x, z, rot) {
    const a = new THREE.Group();
    box(78, 22, 74, 0, 30, 0, R.fabric, a);
    box(78, 46, 16, 0, 64, -29, R.fabric, a);
    box(12, 26, 70, -33, 52, 2, R.fabric, a);
    box(12, 26, 70, 33, 52, 2, R.fabric, a);
    box(54, 10, 54, 0, 46, 6, R.fabric, a);
    [[-32, -30], [32, -30], [-32, 30], [32, 30]].forEach(p => cyl(1.4, 19, p[0], 9.5, p[1], M.brass, a));
    a.position.set(x, 0, z);
    a.rotation.y = rot;
    room.add(a);
  }

  function floorLamp(x, z) {
    cyl(14, 2, x, 1, z, M.brass, room);
    cyl(1, 150, x, 76, z, M.brass, room);
    const sh = new THREE.Mesh(new THREE.CylinderGeometry(16, 24, 30, 32, 1, true), M.shade);
    sh.position.set(x, 160, z);
    room.add(sh);
    lampLight.position.set(x, 150, z);
    room.add(lampLight);
  }

  function windowOn(x, z, w, h, y) {
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(w, h), R.sky);
    glass.rotation.y = Math.PI / 2;
    glass.position.set(x + 0.3, y, z);
    room.add(glass);
    box(5, h + 8, 5, x + 2, y, z - w / 2, R.frame, room);
    box(5, h + 8, 5, x + 2, y, z + w / 2, R.frame, room);
    box(5, 5, w, x + 2, y + h / 2, z, R.frame, room);
    box(10, 5, w + 12, x + 4, y - h / 2, z, R.frame, room);
    box(5, h, 3, x + 2, y, z, R.frame, room);
    [-1, 1].forEach(sg => {
      const c = new THREE.Mesh(new THREE.PlaneGeometry(32, h + 60), R.curtain);
      c.rotation.y = Math.PI / 2;
      c.position.set(x + 8, y + 10, z + sg * (w / 2 + 14));
      room.add(c);
    });
  }

  function buildRoom() {
    room.clear();
    const st = ROOMS[state.room] || STUDIO, on = state.room !== 'off';
    wall.material.color.copy(lin(st.wall));
    floor.material.map = on ? parquetTexture(st.floor) : null;
    floor.material.color.copy(on ? lin('#ffffff') : lin(st.floor));
    floor.material.needsUpdate = true;
    rug.material.color.copy(lin(st.rug));
    renderer.toneMappingExposure = st.exposure;
    scene.background = lin(on ? st.wall : '#d9cfc3');
    if (!on) return;
    const hw = state.w / 2, D = state.d;
    // plintă pe perete
    box(4000, 9, 1.4, 0, 4.5, 0.7, R.frame, room);
    // perete lateral cu fereastră
    const sx = -hw - 175;
    sideWall.position.set(sx, 700, 800);
    room.add(sideWall);
    box(1.4, 9, 1600, sx + 0.7, 4.5, 800, R.frame, room);
    windowOn(sx, D + 150, 120, 150, 155);
    plant(-hw - 70, Math.max(30, D * 0.6), key === 'tv' ? 90 : 120);
    armchair(hw + 105, D + 70, -0.55);
    floorLamp(hw + 160, Math.max(28, D * 0.4));
    lampLight.intensity = state.room === 'dark' ? 0.9 : 0.45;
  }

  function rebuild() {
    if (model) {
      scene.remove(model.group);
      if (model.outline) model.outline.geometry.dispose();
    }
    const wood = isWood(state.color);
    M.body.map = M.inner.map = wood ? woodTexture(state.color) : null;
    M.body.color.copy(wood ? lin('#ffffff') : lin(state.color));
    M.inner.color.copy(wood ? lin('#f3ece4') : lin(state.color).lerp(lin('#ffffff'), 0.18));
    M.body.needsUpdate = M.inner.needsUpdate = true;
    model = ({ wardrobe: buildWardrobe, tv: buildTv, dresser: buildDresser })[key](state);
    model.group.position.x = -state.w / 2;
    model.movers.forEach(m => { m.userData.cur = state.open ? m.userData.open : 0; applyMover(m); });
    scene.add(model.group);
    const roomOn = state.room !== 'off';
    rug.scale.set(state.w + (roomOn ? 60 : 120), 1, roomOn ? 220 : 170);
    rug.position.z = state.d + (roomOn ? 120 : 85);
    buildRoom();
    updateOutline();
  }

  function updateOutline() {
    if (!model) return;
    if (model.outline) { model.group.remove(model.outline); model.outline.geometry.dispose(); }
    const c = model.cols[state.sel];
    if (!c) return;
    const geo = new THREE.EdgesGeometry(new THREE.BoxGeometry(c.cw - 0.4, c.y1 - c.y0 - 0.4, state.d - 2));
    model.outline = new THREE.LineSegments(geo, sel);
    model.outline.position.set(c.cx, (c.y0 + c.y1) / 2, state.d / 2);
    model.outline.visible = state.open;
    model.group.add(model.outline);
  }

  function applyMover(m) {
    const u = m.userData;
    if (u.axis === 'y') m.rotation.y = u.cur;
    else if (u.axis === 'x') m.rotation.x = u.cur;
    else m.position.z = u.cur;
  }

  /* ---------- Cameră și dimensiune ---------- */
  let panelSpace = 0;
  let camDist = 500;
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    renderer.setSize(w, h, false);
    panelSpace = window.matchMedia('(min-width: 981px)').matches ? Math.min(panel.offsetWidth + 48, w * 0.5) : 0;
    camera.aspect = w / h;
    if (panelSpace) camera.setViewOffset(w, h, panelSpace / 2, 0, w, h);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }

  function fitCamera() {
    if (!model) return;
    const w = stage.clientWidth, h = stage.clientHeight;
    const visAspect = (w - panelSpace) / h;
    const roomOn = state.room !== 'off';
    const top = roomOn ? Math.max(model.top + 20, 190) : model.top;
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    const distH = (top * 1.25) / 2 / t;
    const distW = ((roomOn ? state.w + 300 : state.w) * 1.35) / 2 / t / visAspect;
    camDist = Math.max(distH, distW, 160) + state.d;
    const cy = top / 2;
    controls.target.set(0, cy, state.d / 2);
    camera.position.set(camDist * 0.22, cy + camDist * 0.1, state.d / 2 + camDist);
    controls.minDistance = camDist * 0.35;
    controls.maxDistance = camDist * 1.8;
    controls.update();
  }

  function zoom(f) {
    const off = camera.position.clone().sub(controls.target);
    const len = clamp(off.length() * f, controls.minDistance, controls.maxDistance);
    camera.position.copy(controls.target).add(off.setLength(len));
  }

  function loop() {
    requestAnimationFrame(loop);
    if (model) {
      model.movers.forEach(m => {
        const u = m.userData, tgt = state.open ? u.open : 0;
        if (Math.abs(tgt - u.cur) > 0.001) { u.cur += (tgt - u.cur) * 0.12; applyMover(m); }
      });
    }
    controls.update();
    renderer.render(scene, camera);
  }

  /* ---------- Click pe coloană ---------- */
  const ray = new THREE.Raycaster();
  let down = null;
  renderer.domElement.addEventListener('pointerdown', e => { down = [e.clientX, e.clientY]; });
  renderer.domElement.addEventListener('pointerup', e => {
    if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5 || !model) return;
    const r = renderer.domElement.getBoundingClientRect();
    ray.setFromCamera({ x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -((e.clientY - r.top) / r.height) * 2 + 1 }, camera);
    const hit = ray.intersectObjects(model.hits)[0];
    if (hit) {
      state.sel = hit.object.userData.col;
      if (!state.open) setOpen(true);
      updateOutline();
      renderDynamic();
      panel.querySelector('#cpConfig').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  });

  /* =======================================================
     PANOUL DE OPȚIUNI
     ======================================================= */
  const WA_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.3 0-.5l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.8-1.2.2-.6.2-1.1.1-1.2l-.5-.3Z"/></svg>';

  function dimRow(k, label) {
    const r = P.dims[k];
    return `<div class="cp-dim">
      <label for="in-${k}">${label}</label>
      <div class="cp-num"><input type="number" id="in-${k}" data-dim="${k}" min="${r[0]}" max="${r[1]}" step="1" inputmode="numeric"><span>cm</span></div>
      <input type="range" data-dim="${k}" min="${r[0]}" max="${r[1]}" step="1" aria-label="${label}">
    </div>`;
  }

  function structureRow(field, label) {
    const range = STRUCTURE_DIMS[field];
    return `<div class="cp-dim" data-structure-row="${field}">
      <label for="in-${field}">${label}</label>
      <div class="cp-num"><input type="number" id="in-${field}" data-structure="${field}" min="${range[0]}" max="${range[1]}" step="1" inputmode="numeric"><span>cm</span></div>
      <input type="range" data-structure="${field}" min="${range[0]}" max="${range[1]}" step="1" aria-label="${label} — ${field === 'roofHeight' ? 'partea superioară' : field.startsWith('handle') ? 'mâner' : 'soclu'}">
    </div>`;
  }

  function structureCards(option) {
    return `<div class="cp-structure-choices" data-opt="${option.key}">${option.choices.map(([value, label]) => {
      let drawing = '';
      if (option.key === 'base') {
        drawing = '<rect x="8" y="5" width="48" height="29" class="i-frame"/>';
        if (value === 'legs') drawing += '<path d="M12 34v10m40-10v10" class="i-rod"/>';
        else if (value !== 'none') drawing += `<rect x="${value === 'flush' ? 8 : 13}" y="34" width="${value === 'flush' ? 48 : 38}" height="10" class="i-box"/>`;
      } else {
        drawing = '<rect x="8" y="16" width="48" height="28" class="i-frame"/>';
        if (value === 'rim') drawing += '<path d="M8 16V5m48 11V5M8 5h48" class="i-line"/>';
        else if (value !== 'standard') drawing += `<rect x="${value === 'inset' ? 13 : 8}" y="5" width="${value === 'inset' ? 38 : 48}" height="11" class="i-box"/>`;
      }
      return `<button type="button" class="fill cp-structure-choice" data-val="${value}"><svg viewBox="0 0 64 48" aria-hidden="true">${drawing}</svg><span>${label}</span></button>`;
    }).join('')}</div>`;
  }

  panel.innerHTML = `
    <div class="cp-head">
      <nav class="cp-switch" aria-label="Alege produsul">${PAGES.map(([k, href, label]) =>
        `<a href="${href}" data-switch="${k}"${k === key ? ' class="is-active" aria-current="page"' : ''}>${label}</a>`).join('')}</nav>
      <h1 class="cp-title">${P.title}</h1>
      <div class="cp-buy">
        <div class="cp-price"><span id="cpPrice">0</span> lei
          <button type="button" class="cp-help" id="cpHelp" aria-expanded="false" aria-label="Despre preț">?</button>
        </div>
        <a class="btn btn--wa" id="cpWa" target="_blank" rel="noopener">${WA_ICON}<span>Comandă pe WhatsApp</span></a>
      </div>
      <p class="cp-helpbox" id="cpHelpBox" hidden>Prețul este estimativ și include materialele și feroneria. Prețul final îl confirmăm după măsurarea gratuită la domiciliu.</p>
    </div>

    <section class="cp-sec" data-sec="services">
      <h3>Servicii</h3>
      <div class="cp-services">
        <label class="svc"><input type="checkbox" data-svc="delivery"><span>Livrare</span><b>+${fmt(SITE.delivery)} lei</b></label>
        <label class="svc"><input type="checkbox" data-svc="assembly"><span>Asamblare</span><b id="cpAsm"></b></label>
      </div>
    </section>

    <section class="cp-sec" data-sec="dims">
      <h3>Dimensiuni</h3>
      ${dimRow('w', 'Lățime')}${dimRow('h', 'Înălțime')}${dimRow('d', 'Adâncime')}
      <a class="cp-link" href="index.html#contact">Solicită măsurarea gratuită la domiciliu</a>
    </section>

    <section class="cp-sec">
      <h3>Culori <span class="cp-sub" id="cpColorName"></span></h3>
      <div class="cp-swatches" id="cpSwatches">
        ${PALETTE.map(c => `<button type="button" class="sw${c[2] ? ' sw--wood' : ''}" data-color="${c[0]}" style="--c:${c[0]}" title="${c[1]}" aria-label="${c[1]}"></button>`).join('')}
      </div>
      <a class="cp-link" href="index.html#contact">Nu ești sigur? Comandă mostre de culori</a>
    </section>

    <section class="cp-sec" data-sec="options">
      <h3>Opțiuni</h3>
      <div class="cp-opt"><span>${key === 'wardrobe' ? 'Coloane' : 'Secțiuni'}</span><div id="cpCols"></div></div>
      ${P.options.map(o => `<div class="cp-opt"><span>${o.label}</span><div class="seg" data-opt="${o.key}">
        ${o.choices.map(c => `<button type="button" data-val="${c[0]}">${c[1]}</button>`).join('')}</div></div>` +
        (key === 'wardrobe' && o.key === 'handle' ? structureRow('handleLength', 'Lungime mâner') : '')).join('')}
    </section>

    <section class="cp-sec" id="cpConfig" data-sec="config">
      <h3>${key === 'wardrobe' ? 'Compartimentare interioară' : 'Configurează'}</h3>
      <p class="cp-note">${key === 'wardrobe' ? 'Alege o variantă pentru fiecare coloană. Ușile se deschid pentru a vedea interiorul.' : 'Alege sertare, uși sau nișe pentru fiecare secțiune.'}</p>
      <div class="cp-tabs" id="cpTabs"></div>
      <div class="cp-fills" id="cpFills"></div>
    </section>
    ${key === 'wardrobe' ? `
    <section class="cp-sec">
      <h3>Bază (soclu)</h3>
      ${structureCards(STRUCTURE_OPTIONS[0])}
      ${structureRow('baseHeight', 'Înălțime')}${structureRow('setback', 'Retragere')}
    </section>
    <section class="cp-sec">
      <h3>Partea superioară</h3>
      ${structureCards(STRUCTURE_OPTIONS[1])}
      ${structureRow('roofHeight', 'Înălțime')}
      <p class="cp-note">Înălțimea totală a dulapului include soclul și partea superioară.</p>
      <div class="cp-opt cp-opt--stack" id="cpMezzOpt"><span>Uși depozitar sus</span><div class="seg" data-opt="mezz">
        ${STRUCTURE_OPTIONS[2].choices.map(([value, label]) => `<button type="button" data-val="${value}">${label}</button>`).join('')}
      </div></div>
      <p class="cp-note" id="cpMezzNote"></p>
    </section>` : ''}
    <section class="cp-sec cp-room" id="cpRoom">
      <h3>Vezi-l într-o cameră amenajată</h3>
      <p class="cp-note">Plasăm piesa configurată într-un interior decorat, cu parchet, fereastră și mobilier, ca să-ți imaginezi cum arată acasă.</p>
      <div class="cp-rooms">
        <button type="button" data-room="off">Studio</button>
        ${Object.entries(ROOMS).map(([k, r]) => `<button type="button" data-room="${k}" style="--wall:${r.wall};--floor:${r.floor}">${r.label}</button>`).join('')}
      </div>
      <button type="button" class="btn btn--small btn--full cp-shot" data-action="download">Descarcă imaginea</button>
    </section>`;
  // La dulap: Dimensiuni, Compartimentare, Opțiuni, Servicii, apoi restul
  if (key === 'wardrobe') {
    const head = panel.querySelector('.cp-head');
    ['services', 'options', 'config', 'dims'].forEach(k => head.after(panel.querySelector(`[data-sec="${k}"]`)));
  }

  const $ = s => panel.querySelector(s);

  /* Icoane pentru umpluturi (desenate din aceleași date ca modelul 3D) */
  function fillIcon(f) {
    if (key === 'wardrobe') {
      const y = fr => 6 + fr * 52;
      let s = '<rect x="4" y="4" width="32" height="56" rx="1.5" class="i-frame"/>';
      f.items.forEach(it => {
        if (it[0] === 'shelf') s += `<line x1="4" x2="36" y1="${y(it[1])}" y2="${y(it[1])}" class="i-line"/>`;
        if (it[0] === 'shoe') s += `<path d="M5 ${y(it[1]) - 1}l30 3v-3" class="i-line"/>`;
        if (it[0] === 'divider') s += `<line x1="20" x2="20" y1="${y(it[1])}" y2="${y(it[2])}" class="i-line"/>`;
        if (it[0] === 'rod') {
          s += `<line x1="7" x2="33" y1="${y(it[1]) + 1}" y2="${y(it[1]) + 1}" class="i-rod"/>`;
          const l = (it[2] - it[1]) * 52 - 4;
          [10, 15, 20, 25, 30].forEach((x, k) => { s += `<rect x="${x - 1.6}" y="${y(it[1]) + 3}" width="3.2" height="${l * (0.75 + 0.25 * (k % 2))}" rx="1" class="i-cloth"/>`; });
        }
        if (it[0] === 'drawers') {
          const top = y(it[1]), dh = (58 - top) / it[2];
          for (let k = 0; k < it[2]; k++) s += `<rect x="6" y="${top + k * dh + 1}" width="28" height="${dh - 2}" rx="1" class="i-box"/><line x1="17" x2="23" y1="${top + k * dh + 3.5}" y2="${top + k * dh + 3.5}" class="i-line"/>`;
        }
      });
      return `<svg viewBox="0 0 40 64">${s}</svg>`;
    }
    if (key === 'dresser') {
      let s = '<rect x="4" y="3" width="32" height="46" rx="1.5" class="i-frame"/>';
      const front = (y, h, k) => `<rect x="6" y="${y}" width="28" height="${h}" rx="1" class="i-box"/>` +
        (k ? `<line x1="16" x2="24" y1="${y + 3}" y2="${y + 3}" class="i-rod"/>` : `<line x1="30" x2="30" y1="${y + 4}" y2="${y + 10}" class="i-rod"/>`);
      if (f.n) { const dh = 42 / f.n; for (let k = 0; k < f.n; k++) s += front(5 + k * dh, dh - 1.5, true); }
      if (f.id === 'dd') s += front(5, 11, true) + front(18, 29, false);
      if (f.id === 'door') s += front(5, 42, false);
      if (f.id === 'open') s += '<line x1="4" x2="36" y1="19" y2="19" class="i-line"/><line x1="4" x2="36" y1="34" y2="34" class="i-line"/><rect x="8" y="38" width="3" height="11" class="i-cloth"/><rect x="12" y="40" width="3" height="9" class="i-box"/>';
      return `<svg viewBox="0 0 40 52">${s}</svg>`;
    }
    let s = '<rect x="3" y="4" width="42" height="30" rx="1.5" class="i-frame"/>';
    if (f.id === 'door') s += '<rect x="5" y="6" width="38" height="26" rx="1" class="i-box"/><line x1="38" x2="38" y1="15" y2="23" class="i-rod"/>';
    if (f.id === 'flap') s += '<rect x="5" y="6" width="38" height="26" rx="1" class="i-box"/><line x1="19" x2="29" y1="10" y2="10" class="i-rod"/><path d="M8 29h32" class="i-line" stroke-dasharray="2 2"/>';
    if (f.id === 'drawer') s += '<rect x="5" y="6" width="38" height="26" rx="1" class="i-box"/><line x1="19" x2="29" y1="10" y2="10" class="i-rod"/>';
    if (f.id === 'glass') s += '<rect x="5" y="6" width="38" height="26" rx="1" class="i-glass"/><line x1="5" x2="43" y1="19" y2="19" class="i-line"/>';
    if (f.id === 'drawers2') s += '<rect x="5" y="6" width="38" height="12" rx="1" class="i-box"/><rect x="5" y="20" width="38" height="12" rx="1" class="i-box"/><line x1="19" x2="29" y1="9" y2="9" class="i-rod"/><line x1="19" x2="29" y1="23" y2="23" class="i-rod"/>';
    if (f.id === 'open') s += '<line x1="3" x2="45" y1="19" y2="19" class="i-line"/>';
    return `<svg viewBox="0 0 48 38">${s}</svg>`;
  }

  function renderDynamic() {
    normalize();
    // dimensiuni
    ['w', 'h', 'd'].forEach(k => panel.querySelectorAll(`[data-dim="${k}"]`).forEach(el => {
      if (document.activeElement !== el) el.value = state[k];
    }));
    // culori
    panel.querySelectorAll('.sw').forEach(b => b.classList.toggle('is-active', b.dataset.color === state.color));
    $('#cpColorName').textContent = (PALETTE.find(c => c[0] === state.color) || [])[1] || '';
    // opțiuni
    panel.querySelectorAll('[data-opt]').forEach(seg => seg.querySelectorAll('button').forEach(b => {
      const active = b.dataset.val === state.opts[seg.dataset.opt];
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-pressed', String(active));
    }));
    if (key === 'wardrobe') {
      Object.keys(STRUCTURE_DIMS).forEach(field => {
        const row = panel.querySelector(`[data-structure-row="${field}"]`);
        row.hidden = (field === 'baseHeight' && state.opts.base === 'none') ||
          (field === 'setback' && state.opts.base !== 'recessed') ||
          (field === 'roofHeight' && state.opts.roof === 'standard') ||
          (field.startsWith('handle') && state.opts.handle !== 'bar');
        row.querySelectorAll('input').forEach(input => {
          input.value = state.structure[field];
          input.disabled = row.hidden;
        });
      });
      const height = Math.round(storage(state));
      $('#cpMezzOpt').hidden = !height;
      $('#cpMezzNote').textContent = `Bara de umerașe este la ${ROD_Y} cm de la podea. ` +
        (height ? `Deasupra ei ai un depozitar de ${height} cm, cu uși întregi sau separate, la alegere.`
          : `Dulapurile mai înalte de ${STORAGE_FROM} cm primesc deasupra un depozitar.`);
    }
    // coloane
    const [mn, mx] = P.colRange(state.w);
    if (P.colsUI === 'stepper') {
      $('#cpCols').innerHTML = `<div class="stepper"><button type="button" data-cols="-1" ${state.cols <= mn ? 'disabled' : ''} aria-label="Mai puține coloane">−</button><b>${state.cols}</b><button type="button" data-cols="1" ${state.cols >= mx ? 'disabled' : ''} aria-label="Mai multe coloane">+</button></div>`;
    } else {
      let h = '<div class="seg">';
      for (let n = 1; n <= 5; n++) {
        if (n < mn || n > mx) continue;
        h += `<button type="button" data-setcols="${n}" class="${n === state.cols ? 'is-active' : ''}">${n}</button>`;
      }
      $('#cpCols').innerHTML = h + '</div>';
    }
    // tab-uri coloane + umpluturi
    $('#cpTabs').innerHTML = state.fills.map((f, i) =>
      `<button type="button" data-sel="${i}" class="${i === state.sel ? 'is-active' : ''}">${P.colLabel} ${i + 1}</button>`).join('');
    $('#cpFills').innerHTML = P.fills.map(f =>
      `<button type="button" class="fill${state.fills[state.sel] === f.id ? ' is-active' : ''}" data-fill="${f.id}" aria-pressed="${state.fills[state.sel] === f.id}">
        ${fillIcon(f)}<span>${f.name}</span></button>`).join('');
    // preț
    const base = P.price(state);
    const asm = round10(base * (key === 'wardrobe' ? SITE.wardrobeAssemblyRate : SITE.assemblyRate));
    const total = base + (state.svc.delivery ? SITE.delivery : 0) + (state.svc.assembly ? asm : 0);
    $('#cpAsm').textContent = '+' + fmt(asm) + ' lei';
    $('#cpPrice').textContent = fmt(total);
    document.querySelectorAll('[data-price-mirror]').forEach(el => { el.textContent = fmt(total) + ' lei'; });
    // WhatsApp + link
    syncUrl();
    const wa = 'https://wa.me/' + SITE.whatsapp + '?text=' + encodeURIComponent(summary(total));
    $('#cpWa').href = wa;
    document.querySelectorAll('[data-wa-mirror]').forEach(el => { el.href = wa; });
    // camera amenajată
    panel.querySelectorAll('[data-room]').forEach(b => {
      const active = b.dataset.room === state.room;
      b.classList.toggle('is-active', active);
      b.setAttribute('aria-pressed', String(active));
    });
    document.querySelectorAll('[data-action="room"]').forEach(b => b.classList.toggle('is-active', state.room !== 'off'));
    // sincronizare cu celelalte configuratoare
    try { localStorage.setItem('mobis-cfg', JSON.stringify({ c: state.color.slice(1), handle: state.opts.handle })); } catch (e) { /* mod privat */ }
    panel.querySelectorAll('[data-switch]').forEach(a => {
      const page = PAGES.find(x => x[0] === a.dataset.switch);
      a.href = page[1] + '?' + new URLSearchParams({ c: state.color.slice(1), handle: state.opts.handle, ...(state.room !== 'off' ? { room: state.room } : {}) });
    });
    // butonul uși
    document.querySelectorAll('[data-action="toggle"]').forEach(b => {
      b.classList.toggle('is-active', state.open);
      b.querySelector('span').textContent = state.open ? 'Închide' : 'Deschide';
    });
  }

  function summary(total) {
    const color = (PALETTE.find(c => c[0] === state.color) || [])[1];
    const lines = [
      'Bună ziua! Doresc să comand:',
      `${P.title}: ${state.w} × ${state.h} × ${state.d} cm`,
      `Culoare: ${color}`,
      `Coloane: ${state.cols} (${state.fills.map((f, i) => (i + 1) + ': ' + fillById(f).name).join('; ')})`
    ];
    allOptions.filter(o => o.key !== 'mezz' || storage(state)).forEach(o => lines.push(`${o.label}: ${o.choices.find(c => c[0] === state.opts[o.key])[1]}`));
    if (key === 'wardrobe') {
      if (state.opts.base !== 'none') lines.push(`Înălțime soclu / picioare: ${state.structure.baseHeight} cm`);
      if (state.opts.base === 'recessed') lines.push(`Retragere soclu: ${state.structure.setback} cm`);
      if (state.opts.roof !== 'standard') lines.push(`Înălțime parte superioară: ${state.structure.roofHeight} cm`);
      if (state.opts.handle === 'bar') lines.push(`Lungime mâner: ${state.structure.handleLength} cm`);
      if (storage(state)) lines.push(`Depozitar sus: ${Math.round(storage(state))} cm`);
    }
    const svc = [state.svc.delivery && 'livrare', state.svc.assembly && 'asamblare'].filter(Boolean);
    if (svc.length) lines.push('Servicii: ' + svc.join(', '));
    lines.push(`Preț estimativ: ${fmt(total)} lei`, '', 'Configurația: ' + location.href);
    return lines.join('\n');
  }

  function syncUrl() {
    const p = new URLSearchParams({ w: state.w, h: state.h, d: state.d, c: state.color.slice(1), n: state.cols, cfg: state.fills.join(',') });
    allOptions.forEach(o => p.set(o.key, state.opts[o.key]));
    if (key === 'wardrobe') Object.keys(STRUCTURE_DIMS).forEach(field => p.set(field, state.structure[field]));
    if (state.room !== 'off') p.set('room', state.room);
    history.replaceState(null, '', location.pathname + '?' + p.toString());
  }

  function setOpen(v) {
    state.open = v;
    if (model && model.outline) model.outline.visible = v;
    renderDynamic();
  }

  let fitTimer;
  let lastRoom = state.room === 'off' ? 'warm' : state.room;
  function changed(refit) {
    normalize();
    rebuild();
    renderDynamic();
    if (refit) { clearTimeout(fitTimer); fitTimer = setTimeout(fitCamera, 250); }
  }

  /* ---------- Evenimente panou ---------- */
  panel.addEventListener('input', e => {
    const field = e.target.dataset.structure;
    if (field && e.target.type === 'range') {
      state.structure[field] = +e.target.value;
      changed(false);
    }
    const k = e.target.dataset.dim;
    if (k && e.target.type === 'range') {
      state[k] = +e.target.value;
      changed(true);
    }
  });
  panel.addEventListener('change', e => {
    const field = e.target.dataset.structure;
    if (field) {
      const range = STRUCTURE_DIMS[field];
      const value = parseInt(e.target.value, 10);
      state.structure[field] = clamp(isNaN(value) ? range[2] : value, range[0], range[1]);
      e.target.value = state.structure[field];
      changed(false);
    }
    const k = e.target.dataset.dim;
    if (k) {
      const r = P.dims[k];
      state[k] = clamp(parseInt(e.target.value, 10) || r[2], r[0], r[1]);
      e.target.value = state[k];
      changed(true);
    }
    if (e.target.dataset.svc) { state.svc[e.target.dataset.svc] = e.target.checked; renderDynamic(); }
  });
  panel.addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.target.dataset.dim || e.target.dataset.structure)) e.target.blur();
  });
  panel.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.color) { state.color = b.dataset.color; changed(false); }
    else if (b.dataset.cols) { state.cols += +b.dataset.cols; changed(true); }
    else if (b.dataset.setcols) { state.cols = +b.dataset.setcols; changed(true); }
    else if (b.dataset.sel) { state.sel = +b.dataset.sel; if (!state.open) setOpen(true); updateOutline(); renderDynamic(); }
    else if (b.dataset.fill) { state.fills[state.sel] = b.dataset.fill; if (!state.open) state.open = true; changed(false); }
    else if (b.dataset.room) { state.room = b.dataset.room; lastRoom = state.room === 'off' ? lastRoom : state.room; state.open = false; changed(true); }
    else if (b.dataset.val) { state.opts[b.parentElement.dataset.opt] = b.dataset.val; state.open = false; changed(false); }
    else if (b.id === 'cpHelp') {
      const box = $('#cpHelpBox');
      box.hidden = !box.hidden;
      b.setAttribute('aria-expanded', String(!box.hidden));
    }
  });

  /* ---------- Bara de unelte de pe scenă ---------- */
  function toast(msg) {
    let t = document.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); document.body.append(t); }
    t.textContent = msg;
    t.classList.add('is-on');
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove('is-on'), 2200);
  }

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-action]');
    if (!b) return;
    const a = b.dataset.action;
    if (a === 'zoom-in') zoom(0.85);
    if (a === 'zoom-out') zoom(1.18);
    if (a === 'toggle') setOpen(!state.open);
    if (a === 'room') {
      state.room = state.room === 'off' ? lastRoom : 'off';
      state.open = false;
      changed(true);
      if (state.room !== 'off' && window.matchMedia('(max-width: 980px)').matches) stage.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    if (a === 'reset') fitCamera();
    if (a === 'download') {
      renderer.render(scene, camera);
      const link = document.createElement('a');
      link.download = P.file;
      link.href = renderer.domElement.toDataURL('image/png');
      link.click();
    }
    if (a === 'share') {
      const url = location.href;
      if (navigator.share) navigator.share({ title: P.title, url }).catch(() => {});
      else if (navigator.clipboard) navigator.clipboard.writeText(url).then(() => toast('Linkul configurației a fost copiat'));
      else prompt('Copiază linkul:', url);
    }
  });

  /* ---------- Pornire ---------- */
  new ResizeObserver(() => { resize(); }).observe(stage);
  normalize();
  resize();
  rebuild();
  renderDynamic();
  fitCamera();
  loop();
  loading.remove();
  window.addEventListener('resize', () => { clearTimeout(fitTimer); fitTimer = setTimeout(fitCamera, 200); });
})();
