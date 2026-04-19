function switchTab(tab) {
  document
    .querySelectorAll(".tab-btn")
    .forEach((b, i) =>
      b.classList.toggle(
        "active",
        (i === 0 && tab === "login") || (i === 1 && tab === "register"),
      ),
    );
  document
    .getElementById("tab-login")
    .classList.toggle("active", tab === "login");
  document
    .getElementById("tab-register")
    .classList.toggle("active", tab === "register");
}

// Toggle password visibility
document.getElementById("togglePass").addEventListener("click", function () {
  const inp = document.getElementById("loginPass");
  inp.type = inp.type === "password" ? "text" : "password";
  this.classList.toggle("fa-eye");
  this.classList.toggle("fa-eye-slash");
});

// Enter key for login
document.getElementById("loginPass").addEventListener("keypress", (e) => {
  if (e.key === "Enter") doLogin();
});

async function doLogin() {
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPass").value.trim();
  const btn = document.getElementById("loginBtn");
  const errDiv = document.getElementById("loginError");
  const sucDiv = document.getElementById("loginSuccess");
  errDiv.classList.remove("show");
  sucDiv.classList.remove("show");
  if (!email || !password) {
    document.getElementById("loginErrMsg").textContent =
      "Please fill all fields";
    errDiv.classList.add("show");
    return;
  }
  btn.disabled = true;
  btn.textContent = "SIGNING IN...";
  try {
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (data.success) {
      sucDiv.classList.add("show");
      setTimeout(() => (window.location.href = data.redirectUrl), 1000);
    } else {
      document.getElementById("loginErrMsg").textContent = data.message;
      errDiv.classList.add("show");
      btn.disabled = false;
      btn.textContent = "LOGIN";
    }
  } catch {
    document.getElementById("loginErrMsg").textContent =
      "Network error. Try again.";
    errDiv.classList.add("show");
    btn.disabled = false;
    btn.textContent = "LOGIN";
  }
}

async function doRegister() {
  const name = document.getElementById("regName").value.trim();
  const email = document.getElementById("regEmail").value.trim();
  const password = document.getElementById("regPass").value.trim();
  const phone = document.getElementById("regPhone").value.trim();
  const btn = document.getElementById("regBtn");
  const errDiv = document.getElementById("regError");
  const sucDiv = document.getElementById("regSuccess");
  errDiv.classList.remove("show");
  sucDiv.classList.remove("show");
  if (!name || !email || !password) {
    document.getElementById("regErrMsg").textContent =
      "Name, email and password are required";
    errDiv.classList.add("show");
    return;
  }
  btn.disabled = true;
  btn.textContent = "CREATING...";
  try {
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, phone }),
    });
    const data = await res.json();
    if (data.success) {
      sucDiv.classList.add("show");
      setTimeout(() => switchTab("login"), 1500);
    } else {
      document.getElementById("regErrMsg").textContent = data.message;
      errDiv.classList.add("show");
    }
  } catch {
    document.getElementById("regErrMsg").textContent = "Network error.";
    errDiv.classList.add("show");
  }
  btn.disabled = false;
  btn.textContent = "CREATE ACCOUNT";
}
