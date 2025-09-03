/* ========= Frontend Usuarios – JS =========
   Usa el token almacenado por login (landing.js)
   Endpoints:
   - api-usuarios      -> /api/me
   - api-cooperativa   -> /api/horas/mias  (GET)
   - api-cooperativa   -> /api/horas       (POST)
   - api-cooperativa   -> /api/comprobantes (POST)
   - api-cooperativa   -> /api/comprobantes/mios (GET)
*/

const API_USUARIOS_BASE = "http://localhost:8001";
const API_COOP_BASE     = "http://localhost:8002";

// ---------- utils ----------
const $ = (sel, ctx = document) => ctx.querySelector(sel);

function token() {
  try { return localStorage.getItem("token") || ""; } catch { return ""; }
}
function authHeaders() {
  const t = token();
  return t ? { Authorization: "Bearer " + t } : {};
}
function logout(e) {
  if (e) e.preventDefault();
  try {
    localStorage.removeItem("token");
    localStorage.removeItem("rol");
  } catch {}
  // AJUSTA si tu login está en otra carpeta
  window.location.href = "../landing_page/login.html";
}
function mustBeLogged() {
  if (!token()) { logout(); return false; }
  return true;
}

// safety net: aunque no se haya inicializado, esto SIEMPRE captura el click
document.addEventListener("click", (ev) => {
  const el = ev.target.closest("#logout, [data-logout]");
  if (el) logout(ev);
});

async function getJSON(url) {
  const res  = await fetch(url, { headers: { Accept:"application/json", ...authHeaders() } });
  // sesión vencida / inválida
  if ([401,403,419].includes(res.status)) { logout(); throw { message: "No autorizado" }; }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw data;
  return data;
}
async function postJSON(url, body) {
  const res  = await fetch(url, {
    method: "POST",
    headers: { "Accept":"application/json","Content-Type":"application/json", ...authHeaders() },
    body: JSON.stringify(body)
  });
  if ([401,403,419].includes(res.status)) { logout(); throw { message: "No autorizado" }; }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw data;
  return data;
}
async function postForm(url, formData) {
  const res  = await fetch(url, { method:"POST", headers: { ...authHeaders() }, body: formData });
  if ([401,403,419].includes(res.status)) { logout(); throw { message: "No autorizado" }; }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw data;
  return data;
}

// ---------- perfil ----------
async function loadMe() {
  const me = await getJSON(`${API_USUARIOS_BASE}/api/me`);
  const top = $("#topbarUser");
  if (top) {
    const nombre = `${me.primer_nombre ?? ""} ${me.primer_apellido ?? ""}`.trim();
    top.textContent = `${nombre || me.ci_usuario || ""} · ${me.rol ?? ""}`;
  }
  return me;
}

// ---------- horas ----------
function renderHoras(boxState, listEl, sumEl, horasData) {
  if (!horasData || !horasData.entradas || horasData.entradas.length === 0) {
    if (boxState) boxState.textContent = "Sin datos.";
    if (listEl) listEl.innerHTML = "";
    if (sumEl) sumEl.textContent = "";
    return;
  }
  if (boxState) boxState.textContent = "";
  if (listEl) {
    listEl.innerHTML = horasData.entradas
      .slice(0, 8)
      .map(h => `<li><strong>${h.fecha}</strong> – ${h.actividad || h.descripcion || "—"} <span class="tag">${h.horas ?? h.cantidad} h</span></li>`)
      .join("");
  }
  const total = horasData.total_horas ?? horasData.entradas.reduce((a,b)=> a + (+b.horas || +b.cantidad || 0), 0);
  if (sumEl) sumEl.textContent = `Total mostrado: ${total} h · Registros: ${horasData.cantidad_registros ?? horasData.entradas.length}`;
}

async function loadHorasInto(stateSel, listSel, sumSel) {
  const boxState = $(stateSel), listEl = $(listSel), sumEl = $(sumSel);
  if (!boxState || !listEl || !sumEl) return;
  try {
    boxState.textContent = "Cargando…";
    const horas = await getJSON(`${API_COOP_BASE}/api/horas/mias`);
    renderHoras(boxState, listEl, sumEl, horas);
  } catch(e) {
    boxState.textContent = e?.message || "Error de red.";
    listEl.innerHTML = "";
    sumEl.textContent = "";
  }
}

// ---------- comprobantes (opcional listado si existen contenedores) ----------
function renderComprobantes(stateEl, listEl, items) {
  if (!listEl || !stateEl) return;
  if (!items || items.length === 0) {
    stateEl.textContent = "Sin comprobantes.";
    listEl.innerHTML = "";
    return;
  }
  stateEl.textContent = "";
  listEl.innerHTML = items
    .map(c => {
      const meta = [
        c.fecha ? `Fecha: ${c.fecha}` : "",
        c.concepto ? `Concepto: ${c.concepto}` : "",
        c.descripcion ? `Desc.: ${c.descripcion}` : "",
        c.estado ? `Estado: ${c.estado}` : ""
      ].filter(Boolean).join(" · ");
      return `<li>
        <a href="${c.url}" target="_blank" rel="noopener">Archivo</a>
        ${meta ? `<small> — ${meta}</small>` : ""}
      </li>`;
    })
    .join("");
}

async function loadComprobantesInto(stateSel, listSel) {
  const stateEl = $(stateSel), listEl = $(listSel);
  if (!stateEl || !listEl) return; // si tu HTML no tiene contenedores, no hace nada
  try {
    stateEl.textContent = "Cargando…";
    const j = await getJSON(`${API_COOP_BASE}/api/comprobantes/mios`);
    renderComprobantes(stateEl, listEl, j.data || []);
  } catch (err) {
    stateEl.textContent = err?.message || "No se pudo cargar.";
    listEl.innerHTML = "";
  }
}

/* ========== Inits ========== */
const Panel = {
  initDashboard() {
    if (!mustBeLogged()) return;
    loadMe().catch(()=>{});
    loadHorasInto("#hoursState", "#hoursList", "#hoursSummary");
    this.bindLogout(); // sigue existiendo, pero ya tenemos el safety net global
  },

  initHoras() {
    if (!mustBeLogged()) return;
    loadMe().catch(()=>{});
    loadHorasInto("#hoursState", "#hoursList", "#hoursSummary");
    this.bindLogout();

    const f = $("#formHoras");
    const msg = $("#msgHoras");
    f?.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (msg){ msg.style.color = "#A0AEC0"; msg.textContent = "Guardando…"; }

      const body = {
        fecha: $("#fecha")?.value,
        cantidad: +($("#cantidad")?.value || 0),
        descripcion: $("#descripcion")?.value || null
      };

      try {
        await postJSON(`${API_COOP_BASE}/api/horas`, body);
        if (msg){ msg.style.color = "limegreen"; msg.textContent = "Horas registradas."; }
        f.reset();
        loadHorasInto("#hoursState", "#hoursList", "#hoursSummary");
      } catch (err) {
        if (msg){ msg.style.color = "#ff6b6b"; msg.textContent = err?.message || "No se pudo guardar."; }
      }
    });
  },

  initComprobantes() {
    if (!mustBeLogged()) return;
    loadMe().catch(()=>{});
    this.bindLogout();

    // Si tu HTML tiene estos contenedores, se cargan automáticamente.
    loadComprobantesInto("#compState", "#compList");

    const f = $("#formComprobantes");
    const msg = $("#msgComp");

    f?.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (msg){ msg.style.color = "#A0AEC0"; msg.textContent = "Subiendo…"; }

      const fd = new FormData(f); // debe incluir <input name="archivo" type="file" …>
      try {
        await postForm(`${API_COOP_BASE}/api/comprobantes`, fd);
        if (msg){ msg.style.color = "limegreen"; msg.textContent = "Comprobante enviado para revisión."; }
        f.reset();
        // Refresca listado si existe en tu página
        loadComprobantesInto("#compState", "#compList");
      } catch (err) {
        if (msg){ msg.style.color = "#ff6b6b"; msg.textContent = err?.message || "No se pudo subir."; }
      }
    });
  },

  bindLogout() {
    $("#logout")?.addEventListener("click", logout);
  }
};

window.Panel = Panel;