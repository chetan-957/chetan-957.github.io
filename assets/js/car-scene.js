// Wireframe hologram GT3 RS inside a SINGLE globe cage.
// Style matches the reference image: neon mesh car, cyan-blue only.
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

  // ---- lights (for the solid platform) ----
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

  // ---- materials: cyan-blue wireframe family + faint hologram fill ----
  function wire(color, opacity) {
    return new THREE.MeshBasicMaterial({ color: color, wireframe: true, transparent: true, opacity: opacity, side: THREE.DoubleSide });
  }
  var wireCyan = wire(0x22d3ee, 0.85);
  var wireSky = wire(0x67e8f9, 0.9);
  var wireBlue = wire(0x3b82f6, 0.7);
  var glowMat = new THREE.MeshBasicMaterial({ color: 0x67e8f9 });
  var fillMat = new THREE.MeshBasicMaterial({ color: 0x0a2530, transparent: true, opacity: 0.10, depthWrite: false });
  var platformMat = new THREE.MeshStandardMaterial({ color: 0x0a1220, metalness: 0.7, roughness: 0.35 });

  function hologram(geo, mat) {
    var g = new THREE.Group();
    var fill = new THREE.Mesh(geo, fillMat);
    fill.renderOrder = 0;
    var mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 1;
    g.add(fill, mesh);
    return g;
  }

  // ---- loft helpers (smooth sculpted body) ----
  function catmull(p0, p1, p2, p3, t) {
    var t2 = t * t, t3 = t2 * t;
    return 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3);
  }
  function loftStations(ctrl, per) {
    var out = [];
    for (var i = 0; i < ctrl.length - 1; i++) {
      var p0 = ctrl[Math.max(0, i - 1)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(ctrl.length - 1, i + 2)];
      for (var s = 0; s < per; s++) {
        var t = s / per;
        out.push({
          x: p1.x + (p2.x - p1.x) * t,
          top: catmull(p0.top, p1.top, p2.top, p3.top, t),
          w: catmull(p0.w, p1.w, p2.w, p3.w, t),
          bottom: catmull(p0.bottom, p1.bottom, p2.bottom, p3.bottom, t)
        });
      }
    }
    out.push(ctrl[ctrl.length - 1]);
    return out;
  }
  function crossSection(st, arcSegs) {
    var B = st.bottom, T = st.top, W = st.w;
    var sideH = B + (T - B) * 0.55;
    var pts = [[-W, B], [-W, sideH]];
    for (var k = 1; k < arcSegs; k++) {
      var a = Math.PI * (1 - k / arcSegs);
      pts.push([W * Math.cos(a), sideH + (T - sideH) * Math.sin(a)]);
    }
    pts.push([W, sideH], [W, B]);
    return pts;
  }
  function buildLoft(ctrl, per, arcSegs) {
    var slices = loftStations(ctrl, per);
    var loop = slices.map(function (st) { return crossSection(st, arcSegs); });
    var P = loop[0].length;
    var positions = [], indices = [];
    slices.forEach(function (st, i) {
      loop[i].forEach(function (pt) { positions.push(st.x, pt[1], pt[0]); });
    });
    for (var i = 0; i < slices.length - 1; i++) {
      for (var j = 0; j < P; j++) {
        var j2 = (j + 1) % P;
        var a = i * P + j, b = i * P + j2, c = (i + 1) * P + j2, d = (i + 1) * P + j;
        indices.push(a, b, d, b, c, d);
      }
    }
    function cap(sliceIdx, flip) {
      var base = positions.length / 3, cx = 0, cy = 0, cz = 0;
      loop[sliceIdx].forEach(function (pt) { cx += slices[sliceIdx].x; cy += pt[1]; cz += pt[0]; });
      var n = loop[sliceIdx].length;
      positions.push(cx / n, cy / n, cz / n);
      for (var j = 0; j < n; j++) {
        var j2 = (j + 1) % n;
        if (flip) indices.push(base, sliceIdx * P + j2, sliceIdx * P + j);
        else indices.push(base, sliceIdx * P + j, sliceIdx * P + j2);
      }
    }
    cap(0, true);
    cap(slices.length - 1, false);
    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  var car = new THREE.Group();

  // ---- body + glasshouse: dense mesh so the wireframe reads like the image ----
  var bodyCtrl = [
    { x: -2.35, top: 0.70, w: 0.78, bottom: 0.30 },
    { x: -2.20, top: 0.86, w: 0.88, bottom: 0.30 },
    { x: -1.60, top: 0.88, w: 0.92, bottom: 0.30 },
    { x: -1.00, top: 0.88, w: 0.88, bottom: 0.30 },
    { x: -0.30, top: 0.88, w: 0.86, bottom: 0.30 },
    { x: 0.40, top: 0.88, w: 0.86, bottom: 0.30 },
    { x: 0.90, top: 0.84, w: 0.88, bottom: 0.30 },
    { x: 1.45, top: 0.82, w: 0.88, bottom: 0.30 },
    { x: 2.10, top: 0.78, w: 0.86, bottom: 0.30 },
    { x: 2.35, top: 0.70, w: 0.78, bottom: 0.30 }
  ];
  car.add(hologram(buildLoft(bodyCtrl, 8, 18), wireCyan));
  var glassCtrl = [
    { x: -1.45, top: 0.90, w: 0.66, bottom: 0.80 },
    { x: -1.10, top: 1.10, w: 0.73, bottom: 0.80 },
    { x: -0.30, top: 1.16, w: 0.75, bottom: 0.80 },
    { x: 0.40, top: 1.14, w: 0.73, bottom: 0.80 },
    { x: 0.90, top: 0.94, w: 0.70, bottom: 0.80 },
    { x: 1.00, top: 0.88, w: 0.66, bottom: 0.80 }
  ];
  car.add(hologram(buildLoft(glassCtrl, 8, 18), wireSky));

  // ---- widebody fender flares (wireframe) ----
  [[1.45, 0.92], [1.45, -0.92], [-1.45, 0.92], [-1.45, -0.92]].forEach(function (f) {
    var flare = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.1, 10, 24, Math.PI), wireCyan);
    flare.position.set(f[0], 0.4, f[1]);
    car.add(flare);
  });

  // ---- GT3 RS wing: rounded blade, supports, end plates (all wireframe) ----
  function roundedRect(w, h, r) {
    var s = new THREE.Shape();
    s.moveTo(-w / 2 + r, -h / 2);
    s.lineTo(w / 2 - r, -h / 2);
    s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
    s.lineTo(w / 2, h / 2 - r);
    s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
    s.lineTo(-w / 2 + r, h / 2);
    s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
    s.lineTo(-w / 2, -h / 2 + r);
    s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
    return s;
  }
  var wingGeo = new THREE.ExtrudeGeometry(roundedRect(0.7, 0.08, 0.035), {
    depth: 2.05, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2, steps: 1
  });
  wingGeo.translate(0, 0, -1.025);
  var wing = new THREE.Mesh(wingGeo, wireCyan);
  wing.position.set(-2.05, 1.48, 0);
  wing.rotation.z = 0.12;
  car.add(wing);
  [-0.6, 0.6].forEach(function (z) {
    var support = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.58, 0.28), wireBlue);
    support.position.set(-2.05, 1.16, z);
    car.add(support);
    var plate = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.3, 0.05), wireCyan);
    plate.position.set(-2.05, 1.48, z + (z > 0 ? 0.42 : -0.42));
    car.add(plate);
  });

  // ---- front dive planes (canards) ----
  [-0.88, 0.88].forEach(function (z) {
    var canard = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.04, 0.3), wireCyan);
    canard.position.set(2.18, 0.52, z);
    canard.rotation.y = z > 0 ? -0.25 : 0.25;
    car.add(canard);
  });

  // ---- splitter, skirts, diffuser + fins, side intakes, grille ----
  var splitter = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 1.9), wireBlue);
  splitter.position.set(2.15, 0.28, 0);
  car.add(splitter);
  [-0.86, 0.86].forEach(function (z) {
    var skirt = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.08, 0.08), wireBlue);
    skirt.position.set(0, 0.3, z);
    car.add(skirt);
  });
  var diffuser = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 1.4), wireBlue);
  diffuser.position.set(-2.28, 0.34, 0);
  car.add(diffuser);
  [-0.5, -0.17, 0.17, 0.5].forEach(function (z) {
    var fin = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 0.04), wireBlue);
    fin.position.set(-2.3, 0.34, z);
    car.add(fin);
  });
  [-0.9, 0.9].forEach(function (z) {
    var intake = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.28, 0.06), wireBlue);
    intake.position.set(-1.15, 0.62, z);
    car.add(intake);
  });
  var grille = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.22, 1.2), wireBlue);
  grille.position.set(2.32, 0.45, 0);
  car.add(grille);

  // ---- glowing headlight rings + full-width taillight bar ----
  [-0.6, 0.6].forEach(function (z) {
    var hl = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.02, 8, 24), glowMat);
    hl.position.set(2.06, 0.8, z);
    hl.rotation.y = Math.PI / 2;
    hl.scale.set(1, 1.4, 1);
    car.add(hl);
  });
  var tl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, 1.5), glowMat);
  tl.position.set(-2.36, 0.74, 0);
  car.add(tl);

  // ---- mirrors + center twin exhausts ----
  [-0.92, 0.92].forEach(function (z) {
    var stalk = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.18), wireBlue);
    stalk.position.set(0.55, 1.02, z > 0 ? 0.82 : -0.82);
    car.add(stalk);
    var mirror = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.09, 0.06), wireCyan);
    mirror.position.set(0.55, 1.02, z);
    car.add(mirror);
  });
  [-0.28, 0.28].forEach(function (z) {
    var ex = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.15, 16), wireBlue);
    ex.rotation.z = Math.PI / 2;
    ex.position.set(-2.38, 0.36, z);
    car.add(ex);
  });

  // ---- wireframe wheels: tire, hub, spokes ----
  function wheel(x, z, side) {
    var g = new THREE.Group();
    var tire = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.32, 28), wireCyan);
    tire.rotation.x = Math.PI / 2;
    g.add(tire);
    var hub = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.34, 20), wireSky);
    hub.rotation.x = Math.PI / 2;
    g.add(hub);
    for (var k = 0; k < 5; k++) {
      var spoke = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.09, 0.06), wireSky);
      spoke.rotation.z = k * (Math.PI * 2 / 5);
      spoke.position.z = side * 0.17;
      g.add(spoke);
    }
    g.position.set(x, 0.4, z);
    return g;
  }
  car.add(wheel(1.45, 0.82, 1));
  car.add(wheel(1.45, -0.82, -1));
  car.add(wheel(-1.45, 0.82, 1));
  car.add(wheel(-1.45, -0.82, -1));

  // bigger presence in the cage
  car.scale.setScalar(1.12);

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
