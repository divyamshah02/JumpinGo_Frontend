// Login Page State
let otp_url = null
let csrf_token = null
let currentOtpId = null
let currentMobile = null

// Initialize Login Page
async function initLogin(otp_url_param, csrf_token_param) {
  otp_url = otp_url_param
  csrf_token = csrf_token_param

  setupPhoneForm()
  setupOtpForm()
  setupBackButton()
  setupResendOtp()
}

function setupPhoneForm() {
  const phoneForm = document.getElementById("phoneForm")
  const mobileInput = document.getElementById("mobileNumber")

  mobileInput.addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/[^0-9]/g, "")
  })

  phoneForm.addEventListener("submit", async (e) => {
    e.preventDefault()
    await sendOtp()
  })
}

function setupOtpForm() {
  const otpForm = document.getElementById("otpForm")

  otpForm.addEventListener("submit", async (e) => {
    e.preventDefault()
    await verifyOtp()
  })
}

function setupBackButton() {
  const backButton = document.getElementById("backToPhone")

  backButton.addEventListener("click", (e) => {
    e.preventDefault()
    showPhoneSection()
    clearOtpInput()
    hideAlert()
  })
}

function setupResendOtp() {
  const resendBtn = document.getElementById("resendOtpBtn")

  resendBtn.addEventListener("click", async (e) => {
    e.preventDefault()
    await sendOtp(true)
  })
}

// Send OTP
async function sendOtp(isResend = false) {
  let mobile
  if (isResend && currentMobile) {
    mobile = currentMobile
  } else {
    const mobileInput = document.getElementById("mobileNumber")
    mobile = mobileInput.value.trim()
  }

  if (!mobile || mobile.length !== 10) {
    showAlert("Please enter a valid 10-digit mobile number", "danger")
    return
  }

  currentMobile = mobile

  const sendOtpBtn = document.getElementById("sendOtpBtn")
  setButtonLoading(sendOtpBtn, true)
  hideAlert()

  const requestData = {
    mobile: `${mobile}`,
  }

  const [success, response] = await callApi("POST", otp_url, requestData, csrf_token)

  setButtonLoading(sendOtpBtn, false)

  if (success && response.success) {
    currentOtpId = response.data.otp_id

    if (isResend) {
      showAlert("OTP resent successfully!", "success")
    } else {
      showAlert("OTP sent successfully!", "success")
    }

    if (response.data.otp) {
      fillOtpForTesting(response.data.otp)
    }

    if (!isResend) {
      showOtpSection(mobile)
    }
  } else {
    showAlert(response.error || "Failed to send OTP. Please try again.", "danger")
  }
}

// Verify OTP
async function verifyOtp() {
  const otpInput = document.getElementById("otpInput")
  const otp = otpInput.value.trim()

  if (otp.length !== 6) {
    showAlert("Please enter the complete 6-digit OTP", "danger")
    return
  }

  if (!currentOtpId) {
    showAlert("Invalid session. Please request a new OTP.", "danger")
    return
  }

  const verifyOtpBtn = document.getElementById("verifyOtpBtn")
  setButtonLoading(verifyOtpBtn, true)
  hideAlert()

  const requestData = {
    otp: otp,
  }

  const [success, response] = await callApi("PUT", `${otp_url}${currentOtpId}/`, requestData, csrf_token)

  setButtonLoading(verifyOtpBtn, false)

  if (success && response.success) {
    const data = response.data

    if (data.otp_verified) {
      showAlert("OTP verified successfully! Redirecting...", "success")

      setTimeout(() => {
        redirectBasedOnRole(data.user_id, data.role)
      }, 1500)
    } else {
      showAlert(data.message || "OTP verification failed", "danger")
      clearOtpInput()
      otpInput.focus()
    }
  } else {
    showAlert(response.error || "Failed to verify OTP. Please try again.", "danger")
    clearOtpInput()
    otpInput.focus()
  }
}

function redirectBasedOnRole(user_id, role) {
  console.log("User role:", role)

  // Redirect based on role
  if (role === "super_admin" || role === "park_admin") {
    window.location.href = `/admin_dashboard/`
  } else if (role === "seller" || role === "cash_counter") {
    window.location.href = `/seller_dashboard/?user_id=${user_id}`
  } else if (role === "security") {
    window.location.href = `/security_scanner/`
  } else if (role === "ride_operator") {
    window.location.href = `/ride_scanner/`
  } else if (role === "socks_handler") {
    window.location.href = `/sock_scanner/`
  } else if (role === "pre_booker") {
    window.location.href = `/prebooking/`
  }
   else {
    // Default redirect for customers
    window.location.href = `/booking/?user_id=${user_id}`
  }
}

// UI Helper Functions
function showPhoneSection() {
  document.getElementById("phoneSection").classList.remove("d-none")
  document.getElementById("otpSection").classList.add("d-none")
}

function showOtpSection(mobile) {
  document.getElementById("phoneSection").classList.add("d-none")
  document.getElementById("otpSection").classList.remove("d-none")
  const formattedMobile = `+91 ${mobile.slice(0, 5)} ${mobile.slice(5)}`
  document.getElementById("displayMobile").textContent = formattedMobile

  setTimeout(() => {
    document.getElementById("otpInput").focus()
  }, 300)
}

function clearOtpInput() {
  document.getElementById("otpInput").value = ""
}

function setButtonLoading(button, isLoading) {
  const btnText = button.querySelector(".btn-text")
  const spinner = button.querySelector(".spinner-border")

  if (isLoading) {
    btnText.classList.add("d-none")
    spinner.classList.remove("d-none")
    button.disabled = true
  } else {
    btnText.classList.remove("d-none")
    spinner.classList.add("d-none")
    button.disabled = false
  }
}

function showAlert(message, type) {
  const alertContainer = document.getElementById("alertContainer")
  alertContainer.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>
  `
}

function hideAlert() {
  const alertContainer = document.getElementById("alertContainer")
  alertContainer.innerHTML = ""
}

function fillOtpForTesting(otp) {
  if (otp && otp.length === 6) {
    setTimeout(() => {
      const otpInput = document.getElementById("otpInput")
      otpInput.value = otp
      console.log("Auto-filled OTP for testing:", otp)
    }, 500)
  }
}
