// Reset: simple solid GT3-style car inside a SINGLE globe cage,
// as in the user's screenshot. No wireframe car, no inner globe.
// Three.js (UMD r128 from CDN). If THREE fails, caller falls back to
// the canvas polyhedron engine.
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
  var paint = new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, metalness: 0.4, roughness: 0.25, clearcoat: 0.6, clearcoatRoughness: 0.3 });
  var trim = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.6, roughness: 0.4 });
  var tireMat = new THREE.MeshStandardMaterial({ color: 0x111827, metalness: 0.1, roughness: 0.9 });
  var hubMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.7, roughness: 0.4 });
  var platformMat = new THREE.MeshStandardMaterial({ color: 0x0a1220, metalness: 0.7, roughness: 0.35 });

  var car = new THREE.Group();

  // ---- body: one extruded side silhouette (the simple solid car) ----
  var profile = new THREE.Shape();
  profile.moveTo(2.3, 0.32);
  profile.lineTo(2.35, 0.62);
  profile.lineTo(1.6, 0.72);
  profile.lineTo(0.9, 0.78);
  profile.lineTo(0.5, 1.12);
  profile.lineTo(-0.9, 1.12);
  profile.lineTo(-1.3, 0.82);
  profile.lineTo(-2.0, 0.78);
  profile.lineTo(-2.35, 0.72);
  profile.lineTo(-2.35, 0.32);
  profile.closePath();
  var bodyGeo = new THREE.ExtrudeGeometry(profile, {
    depth: 1.7, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 2, steps: 1
  });
  bodyGeo.translate(0, 0, -0.85);
  car.add(new THREE.Mesh(bodyGeo, paint));

  // ---- thin dark side strip ----
  [-0.88, 0.88].forEach(function (z) {
    var strip = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.06, 0.03), trim);
    strip.position.set(0, 0.45, z);
    car.add(strip);
  });

  // ---- simple rear wing: flat blade + 2 supports + end plates ----
  var blade = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.07, 2.0), trim);
  blade.position.set(-2.05, 1.42, 0);
  blade.rotation.z = 0.08;
  car.add(blade);
  [-0.6, 0.6].forEach(function (z) {
    var support = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.25), trim);
    support.position.set(-2.05, 1.1, z);
    car.add(support);
    var plate = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.05), trim);
    plate.position.set(-2.05, 1.42, z + (z > 0 ? 1.0 : -1.0));
    car.add(plate);
  });

  // ---- plain dark wheels with small hubs ----
  function wheel(x, z) {
    var g = new THREE.Group();
    var tire = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.34, 28), tireMat);
    tire.rotation.x = Math.PI / 2;
    g.add(tire);
    var hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.36, 20), hubMat);
    hub.rotation.x = Math.PI / 2;
    g.add(hub);
    g.position.set(x, 0.42, z);
    return g;
  }
  car.add(wheel(1.45, 0.82));
  car.add(wheel(1.45, -0.82));
  car.add(wheel(-1.45, 0.82));
  car.add(wheel(-1.45, -0.82));

  // ---- showroom platform + glow rings (kept as-is) ----
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

  // ---- SINGLE globe: one dodecahedron cage + vertices + particles ----
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

  var cageGroup = new THREE.Group();
  var cageGeo = new THREE.DodecahedronGeometry(4.0, 0);
  cageGroup.add(new THREE.LineSegments(new THREE.EdgesGeometry(cageGeo),
    new THREE.LineBasicMaterial({ color: 0x22d3ee, transparent: true, opacity: 0.5 })));
  var cagePos = cageGeo.attributes.position;
  var cagePts = new Float32Array(cagePos.count * 3);
  for (var i = 0; i < cagePos.count; i++) {
    cagePts[i * 3] = cagePos.getX(i);
    cagePts[i * 3 + 1] = cagePos.getY(i);
    cagePts[i * 3 + 2] = cagePos.getZ(i);
  }
  var cagePtsGeo = new THREE.BufferGeometry();
  cagePtsGeo.setAttribute('position', new THREE.BufferAttribute(cagePts, 3));
  cageGroup.add(new THREE.Points(cagePtsGeo, new THREE.PointsMaterial({
    color: 0x67e8f9, size: 0.12, map: sprite, transparent: true, depthWrite: false
  })));
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
