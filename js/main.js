const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (!prefersReducedMotion && "IntersectionObserver" in window) {
  const revealTargets = document.querySelectorAll(
    "body > header, main > header, main > section, main > article, .app-content > header, .app-content > section, .stats-grid > .stat-card, .dash-grid > .dashboard-card, .app-grid-2 > *, .app-grid-3 > *, .assessment-hero > *, .feature-grid > .feature-card, .steps > article, .goal-content > header, .goal-content > form > section, .auth-layout > section, .register-layout > section, .register-layout > aside"
  );
  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.08, rootMargin: "0px 0px -32px 0px" });

  revealTargets.forEach((element, index) => {
    element.classList.add("scroll-reveal");
    element.style.setProperty("--scroll-reveal-delay", `${Math.min(index % 4, 3) * 55}ms`);
    observer.observe(element);
  });

  requestAnimationFrame(() => {
    revealTargets.forEach(element => {
      const bounds = element.getBoundingClientRect();
      if (bounds.top >= window.innerHeight || bounds.bottom <= 0) return;
      element.classList.add("is-visible");
      observer.unobserve(element);
    });
  });
}
