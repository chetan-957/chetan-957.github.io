// GT3 RS-style showroom car inside the glowing dodecahedron cage.
// Three.js (UMD r128 from CDN). If THREE fails to load, the caller
// falls back to the canvas polyhedron engine instead.
(function () {
  var canvas = document.getElementById('poly');
  if (!canvas) return;
  if (!window.THREE) { window.__polyFallback && window.__polyFallback(); return; }
  var THREE = window.THREE;

  var renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.setClearColor(0x000000, 0);

  var scene = new THREE.Scene();
  var camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  camera.position.set(6.2, 3.4, 8.4);
  camera.lookAt(0, 0.75, 0);

  // ---- lights ----
  scene.add(new THREE.AmbientLight(0x8fa3c8, 0.55));
  var dir = new THREE.DirectionalLight(0xffffff, 1.1);
  dir.position.set(5, 9, 6);
  scene.add(dir);
  var pCyan = new THREE.PointLight(0x22d3ee, 1.4, 30);
  pCyan.position.set(-5, 3, 4);
  scene.add(pCyan);
  var pBlue = new THREE.PointLight(0x3b82f6, 1.1, 30);
  pBlue.position.set(5, 2, -4);
  scene.add(pBlue);

  // ---- materials ----
  var paint = new THREE.MeshStandardMaterial({ color: 0x06b6d4, metalness: 0.5, roughness: 0.3 });
  var glass = new THREE.MeshStandardMaterial({ color: 0x050a14, metalness: 0.9, roughness: 0.08 });
  var trim = new THREE.MeshStandardMaterial({ color: 0x0d1420, metalness: 0.6, roughness: 0.4 });
  var tireMat = new THREE.MeshStandardMaterial({ color: 0x0a0d12, metalness: 0.1, roughness: 0.95 });
  var hubMat = new THREE.MeshStandardMaterial({ color: 0x22d3ee, metalness: 0.85, roughness: 0.25 });
  var lightMat = new THREE.MeshBasicMaterial({ color: 0x67e8f9 });
  var platformMat = new THREE.MeshStandardMaterial({ color: 0x0a1220, metalness: 0.7, roughness: 0.35 });

  var car = new THREE.Group();

  // ---- body: side profile extruded (with wheel-arch holes) ----
  var body = new THREE.Shape();
  body.moveTo(-2.3, 0.42);
  body.lineTo(-2.3, 0.82);
  body.lineTo(-1.7, 0.86);
  body.quadraticCurveTo(-1.0, 1.18, -0.2, 1.18);
  body.lineTo(0.45, 1.18);
  body.quadraticCurveTo(1.15, 0.9, 1.7, 0.8);
  body.lineTo(2.28, 0.74);
  body.quadraticCurveTo(2.34, 0.55, 2.28, 0.4);
  body.lineTo(2.0, 0.3);
  body.lineTo(-2.0, 0.3);
  body.quadraticCurveTo(-2.3, 0.32, -2.3, 0.42);
  [1.45, -1.45].forEach(function (wx) {
    var hole = new THREE.Path();
    hole.absarc(wx, 0.4, 0.46, 0, Math.PI * 2, true);
    body.holes.push(hole);
  });
  var bodyGeo = new THREE.ExtrudeGeometry(body, {
    depth: 1.6, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.08, bevelSegments: 3, steps: 1
  });
  bodyGeo.translate(0, 0, -0.8);
  car.add(new THREE.Mesh(bodyGeo, paint));

  // ---- glasshouse ----
  var glassShape = new THREE.Shape();
  glassShape.moveTo(-1.5, 0.86);
  glassShape.lineTo(-0.95, 1.14);
  glassShape.lineTo(0.35, 1.14);
  glassShape.lineTo(1.0, 0.86);
  glassShape.closePath();
  var glassGeo = new THREE.ExtrudeGeometry(glassShape, {
    depth: 1.5, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 2, steps: 1
  });
  glassGeo.translate(0, 0, -0.75);
  car.add(new THREE.Mesh(glassGeo, glass));

  // ---- GT3 RS wing: big blade, swan-neck supports, end plates ----
  var wing = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 1.95), trim);
  wing.position.set(-2.05, 1.32, 0);
  wing.rotation.z = 0.1;
  car.add(wing);
  [-0.6, 0.6].forEach(function (z) {
    var support = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.3), trim);
    support.position.set(-2.05, 1.08, z);
    car.add(support);
    var plate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.05), trim);
    plate.position.set(-2.05, 1.32, z + (z > 0 ? 0.38 : -0.38));
    car.add(plate);
  });

  // ---- splitter, skirts ----
  var splitter = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 1.9), trim);
  splitter.position.set(2.15, 0.28, 0);
  car.add(splitter);
  [-0.86, 0.86].forEach(function (z) {
    var skirt = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.08, 0.08), trim);
    skirt.position.set(0, 0.3, z);
    car.add(skirt);
  });

  // ---- wheels ----
  function wheel(x, z) {
    var g = new THREE.Group();
    var tire = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.32, 28), tireMat);
    tire.rotation.x = Math.PI / 2;
    g.add(tire);
    var hub = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.34, 20), hubMat);
    hub.rotation.x = Math.PI / 2;
    g.add(hub);
    g.position.set(x, 0.4, z);
    return g;
  }
  [[1.45, 0.82], [1.45, -0.82], [-1.45, 0.82], [-1.45, -0.82]].forEach(function (w) {
    car.add(wheel(w[0], w[1]));
  });

  // ---- lights ----
  [-0.5, 0.5].forEach(function (z) {
    var hl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 0.5), lightMat);
    hl.position.set(2.29, 0.68, z);
    car.add(hl);
  });
  var tl = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, 1.5), lightMat);
  tl.position.set(-2.31, 0.72, 0);
  car.add(tl);

  // ---- showroom platform + glow rings ----
  var carGroup = new THREE.Group();
  carGroup.add(car);
  var platform = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 0.08, 64), platformMat);
  platform.position.y = -0.02;
  carGroup.add(platform);
  var ring1 = new THREE.Mesh(new THREE.TorusGeometry(3.4, 0.02, 8, 100),
    new THREE.MeshBasicMaterial({ color: 0x22d3ee }));
  ring1.rotation.x = Math.PI / 2;
  ring1.position.y = 0.03;
  carGroup.add(ring1);
  var ring2 = new THREE.Mesh(new THREE.TorusGeometry(3.75, 0.012, 8, 100),
    new THREE.MeshBasicMaterial({ color: 0x3b82f6, transparent: true, opacity: 0.5 }));
  ring2.rotation.x = Math.PI / 2;
  ring2.position.y = 0.03;
  carGroup.add(ring2);
  scene.add(carGroup);

  // ---- dodecahedron cage + vertices ----
  var cageGroup = new THREE.Group();
  var cageGeo = new THREE.DodecahedronGeometry(4.0, 0);
  var cageEdges = new THREE.EdgesGeometry(cageGeo);
  var cage = new THREE.LineSegments(cageEdges,
    new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.5 }));
  cageGroup.add(cage);
  var posAttr = cageGeo.attributes.position;
  var vCount = posAttr.count;
  var vPos = new Float32Array(vCount * 3);
  for (var i = 0; i < vCount; i++) {
    vPos[i * 3] = posAttr.getX(i);
    vPos[i * 3 + 1] = posAttr.getY(i);
    vPos[i * 3 + 2] = posAttr.getZ(i);
  }
  var vGeo = new THREE.BufferGeometry();
  vGeo.setAttribute('position', new THREE.BufferAttribute(vPos, 3));

  // soft round sprite for points
  function makeSprite() {
    var c = document.createElement('canvas');
    c.width = c.height = 64;
    var g = c.getContext('2d');
    var grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.4, 'rgba(255,255,255,0.6)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }
  var sprite = makeSprite();
  var cagePts = new THREE.Points(vGeo, new THREE.PointsMaterial({
    color: 0x67e8f9, size: 0.12, map: sprite, transparent: true, depthWrite: false
  }));
  cageGroup.add(cagePts);
  scene.add(cageGroup);

  // ---- particles ----
  var pCount = 220;
  var pPos = new Float32Array(pCount * 3);
  for (var j = 0; j < pCount; j++) {
    var t = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1), r = 4.8 + Math.random() * 1.7;
    pPos[j * 3] = r * Math.sin(ph) * Math.cos(t);
    pPos[j * 3 + 1] = r * Math.sin(ph) * Math.sin(t);
    pPos[j * 3 + 2] = r * Math.cos(ph);
  }
  var pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  var particles = new THREE.Points(pGeo, new THREE.PointsMaterial({
    color: 0x38bdf8, size: 0.07, map: sprite, transparent: true, opacity: 0.8, depthWrite: false
  }));
  scene.add(particles);

  // ---- sizing ----
  function resize() {
    var w = canvas.clientWidth;
    renderer.setSize(w, w, false);
    camera.aspect = 1;
    camera.updateProjectionMatrix();
  }
  resize();
  window.addEventListener('resize', resize);

  // ---- interaction: drag to spin ----
  var dragging = false, lastX = 0, vel = 0, running = true;
  canvas.addEventListener('pointerdown', function (e) {
    dragging = true;
    lastX = e.clientX;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', function (e) {
    if (!dragging) return;
    var dx = e.clientX - lastX;
    lastX = e.clientX;
    vel = dx * 0.005;
    carGroup.rotation.y += vel;
  });
  function endDrag() { dragging = false; }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      running = entries[0].isIntersecting;
    }).observe(canvas);
  }

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var clock = new THREE.Clock();

  function render() {
    renderer.render(scene, camera);
  }
  if (reduced) { render(); return; }

  (function animate() {
    requestAnimationFrame(animate);
    if (!running) return;
    var dt = Math.min(clock.getDelta(), 0.05);
    if (!dragging) {
      carGroup.rotation.y += dt * 0.25 + vel;
      vel *= 0.95;
    }
    cageGroup.rotation.y -= dt * 0.12;
    cageGroup.rotation.x = Math.sin(Date.now() * 0.0002) * 0.08;
    particles.rotation.y += dt * 0.03;
    render();
  })();
})();
