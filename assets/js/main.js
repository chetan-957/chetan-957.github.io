// Mobile nav toggle
(function () {
  var toggle = document.querySelector('.nav-toggle');
  var links = document.querySelector('.nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', function () {
      links.classList.toggle('open');
    });
    links.querySelectorAll('a').forEach(function (a) {
      a.addEventListener('click', function () { links.classList.remove('open'); });
    });
  }

  // Active nav link
  var path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(function (a) {
    var href = a.getAttribute('href');
    if (href === path || (path === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });

  // Scroll spy: highlight the nav button for the section currently in view (main page).
  // The active section is the last one whose top has passed a line just below the fixed nav.
  var spyIds = ['top', 'about', 'experience', 'work', 'skills', 'certifications', 'contact'];
  var spySections = spyIds.map(function (id) { return document.getElementById(id); }).filter(Boolean);
  var navById = {};
  document.querySelectorAll('.nav-links a').forEach(function (a) {
    var href = a.getAttribute('href');
    if (href && href.charAt(0) === '#') navById[href.slice(1)] = a;
  });
  if (spySections.length > 1) {
    var setActiveSection = function () {
      var line = window.scrollY + 120;
      var current = null;
      spySections.forEach(function (sec) {
        var top = sec.getBoundingClientRect().top + window.scrollY;
        if (top <= line) current = sec.id;
      });
      document.querySelectorAll('.nav-links a.active').forEach(function (a) { a.classList.remove('active'); });
      if (current && navById[current]) navById[current].classList.add('active');
    };
    window.addEventListener('scroll', setActiveSection, { passive: true });
    window.addEventListener('resize', setActiveSection);
    setActiveSection();
  }

  // Reveal on scroll
  var revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && revealEls.length) {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(function (el) { obs.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('visible'); });
  }

  // Project filter (projects page)
  var filterBtns = document.querySelectorAll('.filter-btn');
  var cards = document.querySelectorAll('[data-cats]');
  if (filterBtns.length && cards.length) {
    filterBtns.forEach(function (btn) {
      btn.addEventListener('click', function () {
        filterBtns.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        var f = btn.getAttribute('data-filter');
        cards.forEach(function (card) {
          var cats = (card.getAttribute('data-cats') || '').split(' ');
          var show = f === 'all' || cats.indexOf(f) !== -1;
          card.classList.toggle('hidden', !show);
        });
      });
    });
  }

  // Footer year
  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();
})();
