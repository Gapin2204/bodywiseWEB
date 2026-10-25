(function () {
  const configuredBase = window.BODYWISE_API_BASE || "";
  let redirecting = false;

  async function request(path, options = {}) {
    const headers = new Headers(options.headers || {});
    const hasBody = options.body !== undefined;
    if (hasBody && !(options.body instanceof FormData)) headers.set("Content-Type", "application/json");
    const response = await fetch(`${configuredBase}/api${path}`, {
      ...options,
      credentials: "include",
      headers,
      body: hasBody && typeof options.body !== "string" && !(options.body instanceof FormData)
        ? JSON.stringify(options.body)
        : options.body
    });
    let payload;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }
    if (!response.ok || !payload?.success) {
      const error = new Error(payload?.error?.message || `Permintaan gagal (${response.status}).`);
      error.status = response.status;
      error.code = payload?.error?.code;
      if (response.status === 401 && document.body.classList.contains("app-page") && !redirecting) {
        redirecting = true;
        const returnTo = `${location.pathname}${location.search}`;
        location.replace(`login.html?returnTo=${encodeURIComponent(returnTo)}`);
      }
      throw error;
    }
    return payload.data;
  }

  function toast(message, kind = "info") {
    let element = document.getElementById("bodywiseToast");
    if (!element) {
      element = document.createElement("div");
      element.id = "bodywiseToast";
      element.className = "toast";
      element.setAttribute("role", "status");
      element.setAttribute("aria-live", "polite");
      document.body.append(element);
    }
    element.textContent = message;
    element.dataset.kind = kind;
    element.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => element.classList.remove("show"), 3500);
  }

  const api = {
    request,
    get: path => request(path),
    post: (path, body) => request(path, { method: "POST", body }),
    put: (path, body) => request(path, { method: "PUT", body }),
    patch: (path, body) => request(path, { method: "PATCH", body }),
    delete: path => request(path, { method: "DELETE" }),
    toast,
    today() {
      return new Date().toISOString().slice(0, 10);
    },
    formatDate(value, options = { weekday: "long", day: "numeric", month: "long" }) {
      return new Intl.DateTimeFormat("id-ID", options).format(new Date(`${value}T00:00:00`));
    }
  };

  window.bodywiseApi = api;
  if (document.body.classList.contains("app-page")) {
    api.get("/auth/me").catch(() => {});
  }
})();
