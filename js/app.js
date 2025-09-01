const API_USUARIOS_BASE = "http://localhost:8001";
const API_COOP_BASE     = "http://localhost:8002";

// --- Auth helpers ---
function token(){ return localStorage.getItem("token"); }
function auth(){ return { Authorization: "Bearer " + token() }; }
function ensureAuth(){
  if (!token()) { window.location.href = "../LANDING_PAGE/login.html"; }
}
function setMsg(el, text){ if(el) el.textContent = text || ""; }

// --- Dashboard: últimas horas ---
(function loadUltimasHoras(){
  const el = document.getElementById("ultimasHoras");
  if (!el) return;
  ensureAuth();
  fetch(`${API_COOP_BASE}/api/horas/mias`, { headers: auth() })
    .then(r => r.json().then(d => ({ok:r.ok, data:d})))
    .then(({ok, data}) => {
      if (!ok){ el.textContent = (data && data.message) || "No se pudieron cargar las horas."; return; }
      el.innerHTML = (data || []).slice(0,5).map(h => `
        <div style="border:1px solid #3D3D42;padding:.75rem;border-radius:6px;margin:.5rem 0;background:#232329;color:#E0E0E0">
          <strong>${h.fecha}</strong> — ${h.cantidad} hs — ${h.descripcion || ""}
        </div>
      `).join("");
    })
    .catch(() => el.textContent = "Error de red.");
})();

// --- Form: horas ---
(function hookHoras(){
  const form = document.getElementById("formHoras");
  if (!form) return;
  ensureAuth();
  const msg = form.querySelector('[data-form-msg]');
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const payload = Object.fromEntries(fd.entries());
    try{
      const res = await fetch(`${API_COOP_BASE}/api/horas`, {
        method: "POST",
        headers: { "Content-Type":"application/json", ...auth() },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(()=>({}));
      setMsg(msg, res.ok ? "Guardado ✔" : (data.message || "No se pudo guardar"));
      if (res.ok) form.reset();
    }catch{ setMsg(msg, "Error de red."); }
  });
})();

// --- Form: comprobantes ---
(function hookComprobantes(){
  const form = document.getElementById("formComprobante");
  if (!form) return;
  ensureAuth();
  const msg = form.querySelector('[data-form-msg]');
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    try{
      const res = await fetch(`${API_COOP_BASE}/api/comprobantes`, {
        method: "POST",
        headers: auth(),
        body: fd
      });
      const data = await res.json().catch(()=>({}));
      setMsg(msg, res.ok ? "Subido ✔" : (data.message || "No se pudo subir"));
      if (res.ok) form.reset();
    }catch{ setMsg(msg, "Error de red."); }
  });
})();

// --- Logout ---
document.addEventListener("click", (e)=>{
  if (e.target && e.target.id === "logout"){
    e.preventDefault();
    localStorage.removeItem("token");
    localStorage.removeItem("rol");
    window.location.href = "../LANDING_PAGE/login.html";
  }
});