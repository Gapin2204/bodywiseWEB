const registerForm = document.getElementById("registerForm");
const registerStatus = document.getElementById("registerStatus");
const fullNameInput = document.getElementById("fullName");
const emailInput = document.getElementById("registerEmail");
const focusInput = document.getElementById("healthFocus");
const passwordInput = document.getElementById("registerPassword");
const confirmPasswordInput = document.getElementById("confirmPassword");
const consentInput = document.getElementById("registerConsent");

function setError(input, message) {
	const error = document.getElementById(`${input.id}Error`);
	if (error) error.textContent = message;
	input.setAttribute("aria-invalid", String(Boolean(message)));
}

function validateForm() {
	const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value.trim());
	const checks = [
		[fullNameInput, fullNameInput.value.trim() ? "" : "Isi nama panggilanmu."],
		[emailInput, validEmail ? "" : "Masukkan alamat email yang valid."],
		[focusInput, focusInput.value ? "" : "Pilih fokus kesehatanmu."],
		[passwordInput, passwordInput.value.length >= 8 ? "" : "Password harus minimal 8 karakter."],
		[confirmPasswordInput, confirmPasswordInput.value === passwordInput.value && confirmPasswordInput.value ? "" : "Konfirmasi password belum cocok."],
	];

	checks.forEach(([input, message]) => setError(input, message));
	const consentError = document.getElementById("consentError");
	consentError.textContent = consentInput.checked ? "" : "Persetujuan diperlukan untuk melanjutkan.";
	consentInput.setAttribute("aria-invalid", String(!consentInput.checked));

	return checks.every(([, message]) => !message) && consentInput.checked;
}

registerForm.querySelectorAll(".password-toggle").forEach(button => {
	button.addEventListener("click", () => {
		const input = document.getElementById(button.dataset.passwordTarget);
		const isHidden = input.type === "password";
		input.type = isHidden ? "text" : "password";
		button.textContent = isHidden ? "Sembunyi" : "Lihat";
		button.setAttribute("aria-label", `${isHidden ? "Sembunyikan" : "Tampilkan"} ${input.id === "registerPassword" ? "password" : "konfirmasi password"}`);
	});
});

registerForm.addEventListener("submit", event => {
	event.preventDefault();
	registerStatus.textContent = "";
	if (!validateForm()) {
		registerForm.querySelector('[aria-invalid="true"]')?.focus();
		return;
	}

	const submit = registerForm.querySelector('[type="submit"]');
	submit.disabled = true;
	window.bodywiseApi.post("/auth/register", {
		name: fullNameInput.value.trim(),
		email: emailInput.value.trim().toLowerCase(),
		healthFocus: focusInput.value,
		password: passwordInput.value,
		confirmPassword: confirmPasswordInput.value,
	}).then(() => {
		registerStatus.textContent = "Akun berhasil dibuat. Mengarahkan ke dashboard...";
		window.location.href = "dashboard.html";
	}).catch(error => {
		registerStatus.textContent = error.message;
		window.bodywiseApi.toast(error.message, "error");
	}).finally(() => { submit.disabled = false; });
});

[fullNameInput, emailInput, focusInput, passwordInput, confirmPasswordInput].forEach(input => {
	input.addEventListener("input", () => {
		setError(input, "");
		if (input === passwordInput && confirmPasswordInput.value) setError(confirmPasswordInput, "Password dan konfirmasi harus sama.");
		registerStatus.textContent = "";
	});
});

consentInput.addEventListener("change", () => {
	document.getElementById("consentError").textContent = consentInput.checked ? "" : "Persetujuan diperlukan untuk melanjutkan.";
	consentInput.setAttribute("aria-invalid", String(!consentInput.checked));
});
