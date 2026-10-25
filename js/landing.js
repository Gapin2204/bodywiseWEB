const landingHeader = document.querySelector(".landing-nav");
const navToggle = document.querySelector(".nav-toggle");
const themeToggle = document.querySelector(".landing-theme-toggle");
const themeIcon = themeToggle.querySelector(".landing-theme-icon");
const themeLabel = themeToggle.querySelector(".landing-theme-label");

function applyLandingTheme(theme) {
  const isDark = theme === "dark";
  document.body.dataset.theme = isDark ? "dark" : "light";
  themeToggle.setAttribute("aria-pressed", String(isDark));
  themeToggle.setAttribute("aria-label", isDark ? "Beralih ke mode terang" : "Beralih ke mode gelap");
  themeIcon.textContent = isDark ? "☀" : "◐";
  themeLabel.textContent = isDark ? "Mode terang" : "Mode gelap";
}

applyLandingTheme(localStorage.getItem("bodywiseTheme") || "light");

themeToggle.addEventListener("click", () => {
  const nextTheme = document.body.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem("bodywiseTheme", nextTheme);
  applyLandingTheme(nextTheme);
});

function closeLandingMenu() {
  landingHeader.classList.remove("menu-open");
  navToggle.setAttribute("aria-expanded", "false");
  navToggle.setAttribute("aria-label", "Buka menu");
}

navToggle.addEventListener("click", () => {
  const isExpanded = navToggle.getAttribute("aria-expanded") === "true";
  navToggle.setAttribute("aria-expanded", String(!isExpanded));
  navToggle.setAttribute("aria-label", isExpanded ? "Buka menu" : "Tutup menu");
  landingHeader.classList.toggle("menu-open", !isExpanded);
});

landingHeader.querySelectorAll(".site-nav a").forEach(link => {
  link.addEventListener("click", closeLandingMenu);
});

document.addEventListener("keydown", event => {
  if (event.key === "Escape") closeLandingMenu();
});
