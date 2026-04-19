window.isAdmin = document.body.dataset.isAdmin === "true";

// Navbar scroll effect
const navbar = document.getElementById("navbar");
window.addEventListener("scroll", () => {
  if (window.scrollY > 50) navbar.classList.add("scrolled");
  else navbar.classList.remove("scrolled");
});

// Hamburger
const hamburger = document.getElementById("hamburger");
const mobileNav = document.getElementById("mobileNav");
hamburger.addEventListener("click", () => mobileNav.classList.toggle("open"));
mobileNav
  .querySelectorAll("a")
  .forEach((a) =>
    a.addEventListener("click", () => mobileNav.classList.remove("open")),
  );

// Scroll reveal
const reveals = document.querySelectorAll(".reveal");
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) e.target.classList.add("visible");
    });
  },
  { threshold: 0.1 },
);
reveals.forEach((r) => observer.observe(r));

// Toast
function showToast(title, msg, type = "") {
  const toast = document.getElementById("toast");
  document.getElementById("toastTitle").textContent = title;
  document.getElementById("toastMsg").textContent = msg;
  toast.className = "toast show" + (type ? " " + type : "");
  setTimeout(() => toast.classList.remove("show"), 4000);
}

// Contact form
document.getElementById("contactForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = {
    name: document.getElementById("cName").value,
    email: document.getElementById("cEmail").value,
    subject: document.getElementById("cSubject").value,
    message: document.getElementById("cMessage").value,
  };
  try {
    const res = await fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (result.success) {
      showToast("Message Sent!", "We will get back to you shortly.", "success");
      e.target.reset();
    }
  } catch {
    showToast("Error", "Something went wrong. Please try again.");
  }
});

// ── AUTH STATE: show logout / admin link when logged in ──
(async () => {
  const cta = document.getElementById("navCta");
  const mobileAuthLink = document.getElementById("mobileAuthLink");
  try {
    const res = await fetch("/api/check-auth", { credentials: "same-origin" });
    const auth = await res.json();

    if (auth.authenticated) {
      // Logged in — show greeting + logout
      const username = auth.name || auth.email.split("@")[0];
      const adminBtn =
        auth.role === "admin"
          ? `<a href="/admin" class="btn-outline" style="border-color:var(--gold);color:var(--gold);">⚡ Admin</a>`
          : "";
      cta.innerHTML = `
        <span style="font-family:'Barlow Condensed',sans-serif;font-size:0.8rem;letter-spacing:1.5px;color:var(--gray);text-transform:uppercase;">
          Hi, ${username}
        </span>
        ${adminBtn}
        <a href="/logout" class="btn-outline" style="border-color:var(--red);color:var(--red);">
          <i class="fas fa-sign-out-alt"></i> Logout
        </a>
        ${window.isAdmin === true ? "" : '<a href="/appointment" class="btn-red">Book Free Class</a>'}
      `;
      if (mobileAuthLink) {
        mobileAuthLink.textContent = "🚪 Logout";
        mobileAuthLink.href = "/logout";
        mobileAuthLink.style.color = "var(--red)";
      }
    } else {
      // Not logged in — show login button (default HTML already has this)
      cta.innerHTML = `
        <a href="/login" class="btn-outline">Login</a>
        ${window.isAdmin === true ? "" : '<a href="/appointment" class="btn-red">Book Free Class</a>'}
      `;
      if (mobileAuthLink) {
        mobileAuthLink.textContent = "Login / Register";
        mobileAuthLink.href = "/login";
        mobileAuthLink.style.color = "";
      }
    }
  } catch (e) {
    // On error, always fall back to showing login
    cta.innerHTML = `
      <a href="/login" class="btn-outline">Login</a>
      ${window.isAdmin === true ? "" : '<a href="/appointment" class="btn-red">Book Free Class</a>'}
    `;
  }
  // Reveal nav buttons after auth check completes
  cta.style.visibility = "visible";
})();
