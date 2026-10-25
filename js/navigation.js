const navigationBody = document.body;
if (!document.querySelector('script[src="js/main.js"]')) {
  const scrollEffectsScript = document.createElement("script");
  scrollEffectsScript.src = "js/main.js";
  document.body.append(scrollEffectsScript);
}

if (!document.querySelector('link[href="css/bodywise-theme.css"]')) {
  const themeStylesheet = document.createElement("link");
  themeStylesheet.rel = "stylesheet";
  themeStylesheet.href = "css/bodywise-theme.css";
  document.head.append(themeStylesheet);
}
const pageLinks = [
  ["dashboard.html", "⌂", "Beranda"],
  ["assessment.html", "◒", "Asesmen"],
  ["goal.html", "◎", "Tujuan"],
  ["nutrition.html", "⌁", "Nutrisi"],
  ["workout.html", "♧", "Latihan"],
  ["progress.html", "↗", "Progres"],
  ["chatbot.html", "✦", "Asisten BODYWISE"],
];

let navigationDrawer = document.querySelector(".sidebar");

if (navigationDrawer) {
  const sideNav = navigationDrawer.querySelector(".side-nav");
  const currentPage = window.location.pathname.split("/").pop() || "index.html";
  if (sideNav) {
    sideNav.innerHTML = pageLinks.map(([href, icon, label]) =>
      `<a href="${href}"${href === currentPage ? ' class="active" aria-current="page"' : ""}><span>${icon}</span>${label}</a>`
    ).join("");
  }

  navigationDrawer.querySelectorAll('.side-bottom a[href="#"], .side-bottom a[href="settings.html"]').forEach(link => link.remove());
  const homeLink = navigationDrawer.querySelector('.side-bottom a[href="index.html"]');
  if (homeLink) homeLink.innerHTML = '<span>↪</span> Kembali ke beranda';
  const logoutLink = navigationDrawer.querySelector('.side-bottom a[href="index.html"]');
  if (logoutLink && navigationBody.classList.contains("app-page")) {
    logoutLink.addEventListener("click", async event => {
      event.preventDefault();
      try {
        await window.bodywiseApi.post("/auth/logout", {});
        sessionStorage.removeItem("bodywiseDrawerOpen");
        window.location.href = "index.html";
      } catch (error) {
        window.bodywiseApi.toast(error.message, "error");
      }
    });
  }
}

if (!navigationDrawer) {
  navigationDrawer = document.createElement("aside");
  navigationDrawer.className = "site-drawer";
  navigationDrawer.setAttribute("aria-label", "Navigasi BODYWISE");

  const links = navigationBody.classList.contains("landing-page")
    ? [["#features", "◎", "Fitur"], ["#how", "↗", "Cara kerja"], ["#about", "+", "Tentang"], ...pageLinks]
    : pageLinks;
  const currentPage = window.location.pathname.split("/").pop() || "index.html";

  navigationDrawer.innerHTML = `
    <a class="brand sidebar-brand" href="index.html" aria-label="BODYWISE, beranda">
      <span class="logo-box">B</span><span>BODY<span class="green">WISE</span></span>
    </a>
    <div class="side-label">MENU</div>
    <nav class="side-nav" aria-label="Navigasi utama">
      ${links.map(([href, icon, label]) => `<a href="${href}"${href === currentPage ? ' class="active" aria-current="page"' : ""}><span>${icon}</span>${label}</a>`).join("")}
    </nav>
    <div class="side-bottom"><a href="${navigationBody.classList.contains("auth-body") ? "index.html" : "login.html"}"><span>↪</span>${navigationBody.classList.contains("auth-body") ? "Kembali ke beranda" : "Masuk"}</a></div>
  `;
  navigationBody.append(navigationDrawer);
}

navigationDrawer.classList.add("site-drawer");
navigationDrawer.id = "site-drawer";
navigationDrawer.setAttribute("aria-label", "Navigasi BODYWISE");

const closeButton = document.createElement("button");
closeButton.className = "drawer-close";
closeButton.type = "button";
closeButton.setAttribute("aria-label", "Tutup menu");
closeButton.textContent = "×";
navigationDrawer.prepend(closeButton);

const drawerTheme = document.createElement("button");
drawerTheme.className = "drawer-theme-toggle";
drawerTheme.type = "button";
drawerTheme.setAttribute("aria-pressed", "false");
drawerTheme.innerHTML = '<span class="drawer-theme-icon" aria-hidden="true">◐</span><span class="drawer-theme-label">Mode gelap</span>';
const drawerBottom = document.createElement("div");
drawerBottom.className = "drawer-bottom";
drawerBottom.append(drawerTheme);
navigationDrawer.append(drawerBottom);

const drawerOverlay = document.createElement("button");
drawerOverlay.className = "drawer-overlay";
drawerOverlay.type = "button";
drawerOverlay.setAttribute("aria-label", "Tutup menu navigasi");
navigationBody.append(drawerOverlay);

const drawerTrigger = document.createElement("button");
drawerTrigger.className = "drawer-trigger";
drawerTrigger.type = "button";
drawerTrigger.setAttribute("aria-label", "Buka menu navigasi");
drawerTrigger.setAttribute("aria-expanded", "false");
drawerTrigger.setAttribute("aria-controls", "site-drawer");
drawerTrigger.innerHTML = "<span></span><span></span><span></span>";
navigationBody.append(drawerTrigger);

if (navigationBody.classList.contains("app-page")) {
  const appBrand = document.createElement("a");
  appBrand.className = "app-floating-brand";
  appBrand.href = "dashboard.html";
  appBrand.setAttribute("aria-label", "BODYWISE, dashboard");
  appBrand.innerHTML = '<span class="logo-box">B</span><span>BODY<span class="green">WISE</span></span>';
  navigationBody.append(appBrand);
}

function setDrawerOpen(isOpen) {
  navigationDrawer.classList.toggle("is-open", isOpen);
  drawerOverlay.classList.toggle("is-visible", isOpen);
  navigationBody.classList.toggle("drawer-open", isOpen);
  drawerTrigger.setAttribute("aria-expanded", String(isOpen));
  drawerTrigger.setAttribute("aria-label", isOpen ? "Menu terbuka" : "Buka menu navigasi");
  if (isOpen) closeButton.focus();
  else {
    sessionStorage.removeItem("bodywiseDrawerOpen");
    drawerTrigger.focus();
  }
}

drawerTrigger.addEventListener("click", () => setDrawerOpen(true));
closeButton.addEventListener("click", () => setDrawerOpen(false));
drawerOverlay.addEventListener("click", () => setDrawerOpen(false));
navigationDrawer.querySelectorAll("a").forEach(link => {
  link.addEventListener("click", () => {
    const destination = new URL(link.href, window.location.href);
    if (destination.origin === window.location.origin && destination.pathname !== window.location.pathname) {
      sessionStorage.setItem("bodywiseDrawerOpen", "true");
    } else {
      setDrawerOpen(false);
    }
  });
});
document.addEventListener("keydown", event => {
  if (event.key === "Escape" && navigationDrawer.classList.contains("is-open")) {
    setDrawerOpen(false);
  }
});

function applySiteTheme(theme) {
  const isDark = theme === "dark";
  navigationBody.dataset.theme = isDark ? "dark" : "light";
  drawerTheme.setAttribute("aria-pressed", String(isDark));
  drawerTheme.setAttribute("aria-label", isDark ? "Beralih ke mode terang" : "Beralih ke mode gelap");
  drawerTheme.querySelector(".drawer-theme-icon").textContent = isDark ? "☀" : "◐";
  drawerTheme.querySelector(".drawer-theme-label").textContent = isDark ? "Mode terang" : "Mode gelap";
}

applySiteTheme(localStorage.getItem("bodywiseTheme") || "light");
drawerTheme.addEventListener("click", () => {
  const nextTheme = navigationBody.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem("bodywiseTheme", nextTheme);
  applySiteTheme(nextTheme);
});

if (sessionStorage.getItem("bodywiseDrawerOpen") === "true") {
  sessionStorage.removeItem("bodywiseDrawerOpen");
  requestAnimationFrame(() => setDrawerOpen(true));
}

const pageScripts = {
  "nutrition.html": "js/nutrition.js",
  "progress.html": "js/progress.js",
};
const currentDocument = window.location.pathname.split("/").pop();
const pageScript = pageScripts[currentDocument];
if (pageScript && !document.querySelector(`script[src="${pageScript}"]`)) {
  const script = document.createElement("script");
  script.src = pageScript;
  document.body.append(script);
}
