let selectedService = "";

// Set min date
document.getElementById("fDate").min = new Date().toISOString().split("T")[0];

function selectService(name, el) {
  document
    .querySelectorAll(".service-opt")
    .forEach((s) => s.classList.remove("selected"));
  el.classList.add("selected");
  selectedService = name;
  document.getElementById("fService").value = name;
}

async function bookAppointment() {
  const errDiv = document.getElementById("errAlert");
  const sucDiv = document.getElementById("sucAlert");
  const btn = document.getElementById("submitBtn");
  errDiv.classList.remove("show");
  sucDiv.classList.remove("show");

  const name = document.getElementById("fName").value.trim();
  const phone = document.getElementById("fPhone").value.trim();
  const email = document.getElementById("fEmail").value.trim();
  const date = document.getElementById("fDate").value;
  const time = document.getElementById("fTime").value;
  const message = document.getElementById("fMessage").value;

  if (!name || !phone || !email || !date || !time || !selectedService) {
    document.getElementById("errMsg").textContent =
      "Please fill all required fields and select a service.";
    errDiv.classList.add("show");
    return;
  }

  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> BOOKING...';

  try {
    const res = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        phone,
        email,
        date,
        time,
        service: selectedService,
        message,
      }),
    });
    const data = await res.json();
    if (data.success) {
      sucDiv.classList.add("show");
      document.getElementById("fName").value = "";
      document.getElementById("fPhone").value = "";
      document.getElementById("fEmail").value = "";
      document.getElementById("fDate").value = "";
      document.getElementById("fTime").value = "";
      document.getElementById("fMessage").value = "";
      selectedService = "";
      document
        .querySelectorAll(".service-opt")
        .forEach((s) => s.classList.remove("selected"));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      document.getElementById("errMsg").textContent = data.message;
      errDiv.classList.add("show");
    }
  } catch {
    document.getElementById("errMsg").textContent =
      "Network error. Please try again.";
    errDiv.classList.add("show");
  }
  btn.disabled = false;
  btn.innerHTML = '<i class="fas fa-calendar-check"></i> CONFIRM BOOKING';
}
