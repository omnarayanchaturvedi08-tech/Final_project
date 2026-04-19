let currentFilter = "";
let allAppointments = [];

// ── INIT ──
async function init() {
  const auth = await fetch("/api/check-auth").then((r) => r.json());
  if (!auth.authenticated || auth.role !== "admin") {
    window.location.href = "/login";
    return;
  }
  document.getElementById("adminEmail").textContent = auth.email || "Admin";
  loadDashboard();
}

// ── PANELS ──
function switchPanel(name) {
  document
    .querySelectorAll(".panel")
    .forEach((p) => p.classList.remove("active"));
  document.getElementById("panel-" + name).classList.add("active");
  document
    .querySelectorAll(".nav-item")
    .forEach((n) => n.classList.remove("active"));
  event.currentTarget.classList.add("active");
  document.getElementById("panelTitle").textContent =
    name.charAt(0).toUpperCase() + name.slice(1);
  if (name === "appointments") loadAppointments();
  if (name === "members") loadMembers();
  if (name === "messages") loadMessages();
  document.getElementById("sidebar").classList.remove("open");
}

// ── DASHBOARD ──
async function loadDashboard() {
  const data = await fetch("/api/dashboard-stats").then((r) => r.json());
  if (data.success) {
    const s = data.stats;
    document.getElementById("sTotal").textContent = s.total;
    document.getElementById("sPending").textContent = s.pending;
    document.getElementById("sConfirmed").textContent = s.confirmed;
    document.getElementById("sCancelled").textContent = s.cancelled;
    document.getElementById("sToday").textContent = s.today;
    document.getElementById("sUsers").textContent = s.total_users;
    document.getElementById("pendingBadge").textContent = s.pending;
    renderWeeklyChart(data.weekly);
    renderDonut(data.services);
  }
  loadRecentAppointments();
}

function renderWeeklyChart(weekly) {
  const chart = document.getElementById("weeklyChart");
  const max = Math.max(...weekly.map((w) => w.count), 1);
  chart.innerHTML = weekly.length
    ? weekly
        .map((w) => {
          const h = Math.max((w.count / max) * 100, 4);
          const d = new Date(w.date);
          const lbl = d.toLocaleDateString("en", { weekday: "short" });
          return `<div style="display:flex;flex-direction:column;align-items:center;flex:1">
      <div class="bar" style="height:${h}px" title="${w.count} on ${w.date}"></div>
      <div class="bar-label">${lbl}<br>${w.count}</div>
    </div>`;
        })
        .join("")
    : '<p style="font-family:var(--mono);font-size:0.75rem;color:var(--text-muted)">No data this week</p>';
}

const COLORS = [
  "#1f6feb",
  "#238636",
  "#e3b341",
  "#8957e5",
  "#da3633",
  "#3fb950",
];
function renderDonut(services) {
  if (!services.length) return;
  const total = services.reduce((a, s) => a + s.count, 0);
  let offset = 25;
  const circles = services
    .slice(0, 5)
    .map((s, i) => {
      const pct = (s.count / total) * 100;
      const c = `<circle r="15.9155" cx="18" cy="18" fill="none" stroke="${COLORS[i]}" stroke-width="3" stroke-dasharray="${pct} ${100 - pct}" stroke-dashoffset="${-offset + 25}" opacity="0.85"/>`;
      offset += pct;
      return c;
    })
    .join("");
  document.getElementById("donutSvg").innerHTML =
    `<circle r="15.9155" cx="18" cy="18" fill="none" stroke="#30363d" stroke-width="3"/>${circles}`;
  document.getElementById("donutLegend").innerHTML = services
    .slice(0, 5)
    .map(
      (s, i) =>
        `<div class="legend-item"><div class="legend-dot" style="background:${COLORS[i]}"></div><span style="font-size:0.78rem">${s.service.split(" ")[0]} <span style="color:var(--text-muted)">${s.count}</span></span></div>`,
    )
    .join("");
}

async function loadRecentAppointments() {
  const data = await fetch("/api/appointments").then((r) => r.json());
  const tbody = document.getElementById("recentTbody");
  if (!data.success || !data.appointments.length) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:2rem;color:var(--text-muted);font-family:var(--mono);font-size:0.8rem">No appointments yet</td></tr>`;
    return;
  }
  allAppointments = data.appointments;
  tbody.innerHTML = data.appointments
    .slice(0, 5)
    .map((a) => rowHTML(a, false))
    .join("");
}

// ── APPOINTMENTS ──
async function loadAppointments() {
  const tbody = document.getElementById("aptTbody");
  tbody.innerHTML = `<tr class="loading-row"><td colspan="10">Loading...</td></tr>`;
  let url = "/api/appointments";
  if (currentFilter) url += "?status=" + currentFilter;
  const data = await fetch(url).then((r) => r.json());
  allAppointments = data.appointments || [];
  renderAptTable(allAppointments);
}

function renderAptTable(apts) {
  const tbody = document.getElementById("aptTbody");
  if (!apts.length) {
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center;padding:2rem;color:var(--text-muted);font-family:var(--mono);font-size:0.8rem">No appointments found</td></tr>`;
    return;
  }
  tbody.innerHTML = apts.map((a) => rowHTML(a, true)).join("");
}

function rowHTML(a, full = true) {
  const date = new Date(a.appointment_date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const actions = `<div class="action-cell">
    ${a.status !== "confirmed" ? `<button class="act-btn confirm" onclick="updateStatus(${a.id},'confirmed')">✓ Confirm</button>` : ""}
    ${a.status !== "cancelled" ? `<button class="act-btn cancel" onclick="updateStatus(${a.id},'cancelled')">✕ Cancel</button>` : ""}
    <button class="act-btn delete" onclick="deleteApt(${a.id})"><i class="fas fa-trash"></i></button>
  </div>`;
  if (!full)
    return `<tr>
    <td class="td-mono">#${a.id}</td>
    <td><strong>${a.name}</strong></td>
    <td class="td-muted">${a.email}</td>
    <td>${a.service}</td>
    <td class="td-mono">${date}</td>
    <td class="td-mono">${a.appointment_time}</td>
    <td><span class="badge badge-${a.status}">${a.status}</span></td>
    <td>${actions}</td>
  </tr>`;
  return `<tr>
    <td class="td-mono">#${a.id}</td>
    <td><strong>${a.name}</strong></td>
    <td class="td-muted">${a.email}</td>
    <td class="td-muted">${a.phone}</td>
    <td>${a.service}</td>
    <td class="td-mono">${date}</td>
    <td class="td-mono">${a.appointment_time}</td>
    <td class="td-muted" style="max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${a.message || "—"}</td>
    <td><span class="badge badge-${a.status}">${a.status}</span></td>
    <td>${actions}</td>
  </tr>`;
}

function setStatusFilter(status) {
  currentFilter = status;
  document
    .querySelectorAll(".filter-btn")
    .forEach((b) => b.classList.remove("active"));
  event.currentTarget.classList.add("active");
  loadAppointments();
}

function filterTable() {
  const q = document.getElementById("searchInput").value.toLowerCase();
  const filtered = allAppointments.filter(
    (a) =>
      a.name.toLowerCase().includes(q) ||
      a.email.toLowerCase().includes(q) ||
      a.phone.includes(q) ||
      a.service.toLowerCase().includes(q),
  );
  renderAptTable(filtered);
}

async function updateStatus(id, status) {
  await fetch(`/api/appointments/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  showToast(`Appointment ${status}`, false);
  loadDashboard();
  if (
    document.getElementById("panel-appointments").classList.contains("active")
  )
    loadAppointments();
}

async function deleteApt(id) {
  if (!confirm("Delete this appointment?")) return;
  await fetch(`/api/appointments/${id}`, { method: "DELETE" });
  showToast("Appointment deleted", true);
  loadDashboard();
  if (
    document.getElementById("panel-appointments").classList.contains("active")
  )
    loadAppointments();
}

// ── MEMBERS ──
async function loadMembers() {
  const data = await fetch("/api/members").then((r) => r.json());
  const tbody = document.getElementById("memberTbody");
  if (!data.members.length) {
    tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:2rem;color:var(--text-muted);font-family:var(--mono);font-size:0.8rem">No members added yet</td></tr>`;
    return;
  }
  tbody.innerHTML = data.members
    .map(
      (m) => `<tr>
    <td class="td-mono">#${m.id}</td>
    <td><strong>${m.name}</strong></td>
    <td class="td-muted">${m.email}</td>
    <td class="td-muted">${m.phone || "—"}</td>
    <td>${m.plan || "—"}</td>
    <td class="td-mono">${m.start_date || "—"}</td>
    <td class="td-mono">${m.end_date || "—"}</td>
    <td><span class="badge badge-${m.status}">${m.status}</span></td>
    <td><button class="act-btn delete" onclick="deleteMember(${m.id})"><i class="fas fa-trash"></i></button></td>
  </tr>`,
    )
    .join("");
}

function openMemberModal() {
  document.getElementById("memberModal").classList.add("open");
  // Default start/end dates
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("mStart").value = today;
}
function closeMemberModal() {
  document.getElementById("memberModal").classList.remove("open");
}

async function saveMember() {
  const data = {
    name: document.getElementById("mName").value,
    email: document.getElementById("mEmail").value,
    phone: document.getElementById("mPhone").value,
    plan: document.getElementById("mPlan").value,
    start_date: document.getElementById("mStart").value,
    end_date: document.getElementById("mEnd").value,
  };
  if (!data.name || !data.email) {
    showToast("Name and email required", true);
    return;
  }
  const res = await fetch("/api/members", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).then((r) => r.json());
  if (res.success) {
    showToast("Member added!", false);
    closeMemberModal();
    loadMembers();
  } else showToast(res.message, true);
}

async function deleteMember(id) {
  if (!confirm("Remove this member?")) return;
  await fetch(`/api/members/${id}`, { method: "DELETE" });
  showToast("Member removed", false);
  loadMembers();
}

async function loadMessages() {
  const data = await fetch("/api/messages").then((r) => r.json());
  const tbody = document.getElementById("messageTbody");
  if (!data.success || !data.messages.length) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:2rem;color:var(--text-muted);font-family:var(--mono);font-size:0.8rem">No messages received yet</td></tr>`;
    return;
  }
  tbody.innerHTML = data.messages
    .map(
      (m) => `<tr>
      <td class="td-mono">#${m.id}</td>
      <td><strong>${m.name}</strong></td>
      <td class="td-muted">${m.email}</td>
      <td>${m.subject || "—"}</td>
      <td class="td-muted" style="max-width:230px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${m.message}</td>
      <td class="td-mono">${new Date(m.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</td>
    </tr>`,
    )
    .join("");
}

// ── TOAST ──
function showToast(msg, isError = false) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.className = "toast show" + (isError ? " error" : "");
  setTimeout(() => t.classList.remove("show"), 3000);
}

window.addEventListener("DOMContentLoaded", init);
