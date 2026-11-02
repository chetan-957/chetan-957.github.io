// Interactive 3D polyhedron — dodecahedron + inner icosahedron + particles.
// Pure canvas 2D math, no dependencies. Drag to spin, auto-rotates at rest.
(function () {
  var canvas = document.getElementById('poly');
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext('2d');

  // Theme palette: night (cyan) vs day (amber). Read live so toggling repaints.
  function themeColors() {
    if (document.documentElement.getAttribute('data-theme') === 'light') {
      return { particle: 'rgba(217,119,6,', inner: 'rgba(234,88,12,A)', outer: 'rgba(245,158,11,A)' };
    }
    return { particle: 'rgba(56,189,248,', inner: 'rgba(59,130,246,A)', outer: 'rgba(34,211,238,A)' };
  }

  var PHI = (1 + Math.sqrt(5)) / 2;

  // ---- geometry ----
  function dodecahedron() {
    var v = [];
    var p = PHI, ip = 1 / PHI;
    [[1,1,1],[1,1,-1],[1,-1,1],[1,-1,-1],[-1,1,1],[-1,1,-1],[-1,-1,1],[-1,-1,-1]].forEach(function (a) { v.push(a); });
    [[0,ip,p],[0,ip,-p],[0,-ip,p],[0,-ip,-p]].forEach(function (a) { v.push(a); });
    [[ip,p,0],[ip,-p,0],[-ip,p,0],[-ip,-p,0]].forEach(function (a) { v.push(a); });
    [[p,0,ip],[p,0,-ip],[-p,0,ip],[-p,0,-ip]].forEach(function (a) { v.push(a); });
    return v;
  }
  function icosahedron() {
    var v = [], p = PHI;
    [[0,1,p],[0,1,-p],[0,-1,p],[0,-1,-p]].forEach(function (a) { v.push(a); });
    [[1,p,0],[1,-p,0],[-1,p,0],[-1,-p,0]].forEach(function (a) { v.push(a); });
    [[p,0,1],[p,0,-1],[-p,0,1],[-p,0,-1]].forEach(function (a) { v.push(a); });
    return v;
  }
  function edgesFor(verts, target) {
    var edges = [];
    for (var i = 0; i < verts.length; i++) {
      for (var j = i + 1; j < verts.length; j++) {
        var d = Math.hypot(verts[i][0]-verts[j][0], verts[i][1]-verts[j][1], verts[i][2]-verts[j][2]);
        if (Math.abs(d - target) < 0.15) edges.push([i, j]);
      }
    }
    return edges;
  }

  var outer = dodecahedron();
  var outerEdges = edgesFor(outer, 2 / PHI);
  var inner = icosahedron().map(function (v) { return [v[0]*0.55, v[1]*0.55, v[2]*0.55]; });
  var innerEdges = edgesFor(inner, 2 * 0.55);

  // particles on a shell
  var particles = [];
  for (var i = 0; i < 90; i++) {
    var t = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1), r = 2.1 + Math.random() * 0.9;
    particles.push([r * Math.sin(ph) * Math.cos(t), r * Math.sin(ph) * Math.sin(t), r * Math.cos(ph)]);
  }

  // ---- state ----
  var rotX = 0.5, rotY = 0.6, velX = 0, velY = 0.0035;
  var dragging = false, lastX = 0, lastY = 0;
  var tiltX = 0, tiltY = 0;
  var running = true;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var size = canvas.clientWidth;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);

  function rot(v, rx, ry) {
    var x = v[0], y = v[1], z = v[2];
    var c = Math.cos(rx), s = Math.sin(rx);
    var y1 = y * c - z * s, z1 = y * s + z * c;
    c = Math.cos(ry); s = Math.sin(ry);
    var x2 = x * c + z1 * s, z2 = -x * s + z1 * c;
    return [x2, y1, z2];
  }
  function project(v, w, h) {
    var f = 4.2;
    var s = f / (f - v[2] * 0.55);
    var R = Math.min(w, h) * 0.26;
    return [w / 2 + v[0] * R * s, h / 2 + v[1] * R * s, v[2]];
  }

  function drawShape(verts, edges, color, width, glow) {
    var w = canvas.clientWidth, h = canvas.clientHeight;
    var pts = verts.map(function (v) { return project(rot(v, rotX, rotY), w, h); });
    var items = edges.map(function (e) {
      return { a: pts[e[0]], b: pts[e[1]], z: (pts[e[0]][2] + pts[e[1]][2]) / 2 };
    }).sort(function (a, b) { return a.z - b.z; });
    ctx.lineCap = 'round';
    items.forEach(function (e) {
      var alpha = 0.18 + 0.62 * ((e.z + 2.2) / 4.4);
      ctx.strokeStyle = color.replace('A', Math.max(0.08, Math.min(0.85, alpha)).toFixed(2));
      ctx.lineWidth = width * (0.6 + 0.6 * ((e.z + 2.2) / 4.4));
      ctx.beginPath();
      ctx.moveTo(e.a[0], e.a[1]);
      ctx.lineTo(e.b[0], e.b[1]);
      ctx.stroke();
    });
    pts.forEach(function (p) {
      var a = 0.35 + 0.65 * ((p[2] + 2.2) / 4.4);
      ctx.fillStyle = color.replace('A', a.toFixed(2));
      ctx.shadowColor = color.replace('A', '0.9');
      ctx.shadowBlur = glow;
      ctx.beginPath();
      ctx.arc(p[0], p[1], 2.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    });
  }

  function frame() {
    if (!running) { requestAnimationFrame(frame); return; }
    var w = canvas.clientWidth, h = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);
    if (!dragging) {
      rotY += velY;
      rotX += velX;
      velX *= 0.96;
    }
    // particles
    particles.forEach(function (p, i) {
      var q = project(rot(p, rotX * 0.7, rotY * 0.7), w, h);
      var a = 0.12 + 0.4 * ((q[2] + 3) / 6);
      ctx.fillStyle = themeColors().particle + a.toFixed(2) + ')';
      ctx.beginPath();
      ctx.arc(q[0], q[1], 1.3, 0, Math.PI * 2);
      ctx.fill();
    });
    // inner first (behind), then outer
    drawShape(inner, innerEdges, themeColors().inner, 1, 8);
    drawShape(outer, outerEdges, themeColors().outer, 1.4, 12);
    requestAnimationFrame(frame);
  }

  function pos(e) {
    var r = canvas.getBoundingClientRect();
    var p = e.touches ? e.touches[0] : e;
    return { x: p.clientX - r.left, y: p.clientY - r.top };
  }
  canvas.addEventListener('pointerdown', function (e) {
    dragging = true;
    var p = pos(e); lastX = p.x; lastY = p.y;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', function (e) {
    var p = pos(e);
    if (dragging) {
      velY = (p.x - lastX) * 0.005;
      velX = (p.y - lastY) * 0.005;
      rotY += velY;
      rotX += velX;
      lastX = p.x; lastY = p.y;
    }
  });
  function endDrag() { dragging = false; }
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      running = entries[0].isIntersecting;
    }).observe(canvas);
  }

  if (reduced) {
    // static render, no animation
    var w = canvas.clientWidth, h = canvas.clientHeight;
    ctx.clearRect(0, 0, w, h);
    drawShape(inner, innerEdges, themeColors().inner, 1, 8);
    drawShape(outer, outerEdges, themeColors().outer, 1.4, 12);
  } else {
    requestAnimationFrame(frame);
  }
})();
