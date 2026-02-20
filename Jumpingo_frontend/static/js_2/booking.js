// Booking Page State
const PARK_ID = 1
const PRICE_PER_PERSON = 500 // Static price for now

let otp_url = null
let booking_url = null
let csrf_token = null
let currentOtpId = null
let resendTimerInterval = null
let currentMobile = null
let isMobileVerified = false
let otpModal = null
let user_id = null

// Initialize Booking Page
async function initBooking(otp_url_param, booking_url_param, csrf_token_param) {
  otp_url = otp_url_param
  booking_url = booking_url_param
  csrf_token = csrf_token_param

  otpModal = new bootstrap.Modal(document.getElementById("otpModal"))

  setupBookingForm()
  setupMobileVerification()
  setupOtpModal()
  setupNumberInputs()
  setMinDate()
  calculatePrice() // Initial price calculation
}

// Set minimum date to today
function setMinDate() {
  const visitDateInput = document.getElementById("visitDate")
  const today = new Date().toISOString().split("T")[0]
  visitDateInput.min = today
  visitDateInput.addEventListener("change", calculatePrice)
}

// Setup Number Inputs (Increase/Decrease)
function setupNumberInputs() {
  const numPeopleInput = document.getElementById("numPeople")
  const decreaseBtn = document.getElementById("decreaseBtn")
  const increaseBtn = document.getElementById("increaseBtn")

  decreaseBtn.addEventListener("click", () => {
    const value = Number.parseInt(numPeopleInput.value)
    if (value > 1) {
      numPeopleInput.value = value - 1
      calculatePrice()
    }
  })

  increaseBtn.addEventListener("click", () => {
    const value = Number.parseInt(numPeopleInput.value)
    if (value < 20) {
      numPeopleInput.value = value + 1
      calculatePrice()
    }
  })

  numPeopleInput.addEventListener("change", calculatePrice)
}

// Calculate Total Price
function calculatePrice() {
  const numPeople = Number.parseInt(document.getElementById("numPeople").value)
  const totalAmountSpan = document.getElementById("totalAmount")

  if (numPeople) {
    const totalAmount = PRICE_PER_PERSON * numPeople
    totalAmountSpan.textContent = totalAmount.toFixed(0)
  } else {
    totalAmountSpan.textContent = "0"
  }
}

// Setup Booking Form
function setupBookingForm() {
  const bookingForm = document.getElementById("bookingForm")

  bookingForm.addEventListener("submit", async (e) => {
    e.preventDefault()

    if (!isMobileVerified) {
      showError("Please verify your mobile number first")
      return
    }

    await createBooking()
  })
}

// Setup Mobile Verification
function setupMobileVerification() {
  const mobileInput = document.getElementById("mobileNumber")
  const verifyBtn = document.getElementById("verifyMobileBtn")

  mobileInput.addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/[^0-9]/g, "")

    if (e.target.value.length === 10) {
      verifyBtn.disabled = false
      verifyBtn.classList.add("active")
    } else {
      verifyBtn.disabled = true
      verifyBtn.classList.remove("active")
      isMobileVerified = false
      verifyBtn.classList.remove("verified")
      document.getElementById("bookNowBtn").disabled = true
    }
  })

  verifyBtn.addEventListener("click", async () => {
    const mobile = mobileInput.value.trim()
    if (mobile.length === 10) {
      await sendOtp(mobile)
    }
  })
}

// Send OTP
async function sendOtp(mobile) {
  currentMobile = mobile
  hideError()
  hideSuccess()

  const requestData = { mobile: mobile }
  const [success, response] = await callApi("POST", otp_url, requestData, csrf_token)

  if (success && response.success) {
    currentOtpId = response.data.otp_id

    showSuccess("OTP sent successfully!")

    if (response.data.otp) {
      console.log("OTP for testing:", response.data.otp)
      setTimeout(() => {
        fillOtpForTesting(response.data.otp)
      }, 500)
    }

    const displayMobile = document.getElementById("displayMobile")
    displayMobile.textContent = `+91 ${mobile.slice(0, 5)} ${mobile.slice(5)}`
    otpModal.show()

    setTimeout(() => {
      document.querySelector(".otp-input").focus()
    }, 500)

    startResendTimer()
  } else {
    showError(response.error || "Failed to send OTP. Please try again.")
  }
}

// Setup OTP Modal
function setupOtpModal() {
  const otpForm = document.getElementById("otpForm")
  const resendBtn = document.getElementById("resendOtpLink")

  setupOtpInputs()

  otpForm.addEventListener("submit", async (e) => {
    e.preventDefault()
    await verifyOtp()
  })

  resendBtn.addEventListener("click", async (e) => {
    e.preventDefault()
    if (!resendBtn.disabled && currentMobile) {
      clearOtpInputs()
      await sendOtp(currentMobile)
    }
  })
}

// Setup OTP Inputs
function setupOtpInputs() {
  const otpInputs = document.querySelectorAll(".otp-input")

  otpInputs.forEach((input, index) => {
    input.addEventListener("input", (e) => {
      const value = e.target.value.replace(/[^0-9]/g, "")
      e.target.value = value

      if (value.length === 1) {
        e.target.classList.add("filled")
        if (navigator.vibrate) {
          navigator.vibrate(30)
        }

        if (index < otpInputs.length - 1) {
          otpInputs[index + 1].focus()
        }
      } else {
        e.target.classList.remove("filled")
      }
    })

    input.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && !e.target.value && index > 0) {
        otpInputs[index - 1].focus()
        otpInputs[index - 1].value = ""
        otpInputs[index - 1].classList.remove("filled")
      }
    })

    input.addEventListener("paste", (e) => {
      e.preventDefault()
      const pastedData = e.clipboardData.getData("text").replace(/[^0-9]/g, "")

      if (pastedData.length === 6) {
        otpInputs.forEach((inp, idx) => {
          inp.value = pastedData[idx] || ""
          if (pastedData[idx]) {
            inp.classList.add("filled")
          }
        })
        otpInputs[5].focus()
      }
    })
  })
}

// Verify OTP
async function verifyOtp() {
  const otpInputs = document.querySelectorAll(".otp-input")
  const otp = Array.from(otpInputs)
    .map((input) => input.value)
    .join("")

  if (otp.length !== 6) {
    showOtpError("Please enter the complete 6-digit OTP")
    return
  }

  if (!currentOtpId) {
    showOtpError("Invalid session. Please request a new OTP.")
    return
  }

  const verifyOtpBtn = document.getElementById("verifyOtpBtn")
  setButtonLoading(verifyOtpBtn, true, "verifyOtpBtnText", "verifyOtpBtnLoader")
  hideOtpError()
  hideOtpSuccess()

  const requestData = { otp: otp }
  const [success, response] = await callApi("PUT", `${otp_url}${currentOtpId}/`, requestData, csrf_token)

  setButtonLoading(verifyOtpBtn, false, "verifyOtpBtnText", "verifyOtpBtnLoader")

  if (success && response.success) {
    const data = response.data

    if (data.otp_verified) {
      csrf_token = getCSRFToken()
      user_id = data.user_id

      showOtpSuccess("Mobile verified successfully!")

      isMobileVerified = true
      const verifyBtn = document.getElementById("verifyMobileBtn")
      verifyBtn.classList.remove("btn-outline-primary")
      verifyBtn.classList.add("btn-success")
      document.getElementById("verifyBtnText").innerHTML = '<i class="fas fa-check-circle"></i> Verified'
      verifyBtn.disabled = true

      document.getElementById("bookNowBtn").disabled = false

      setTimeout(() => {
        otpModal.hide()
      }, 1500)

      stopResendTimer()
    } else {
      showOtpError(data.message || "OTP verification failed")
      clearOtpInputs()
      document.querySelector(".otp-input").focus()
    }
  } else {
    showOtpError(response.error || "Failed to verify OTP. Please try again.")
    clearOtpInputs()
    document.querySelector(".otp-input").focus()
  }
}

// Create Booking
async function createBooking() {
  const customerName = document.getElementById("customerName").value.trim()
  const customerEmail = document.getElementById("customerEmail").value.trim()
  const visitDate = document.getElementById("visitDate").value
  const numPeople = document.getElementById("numPeople").value
  const mobile = document.getElementById("mobileNumber").value
  const totalAmount = document.getElementById("totalAmount").textContent

  if (!customerName || !customerEmail || !visitDate || !numPeople || !mobile) {
    showError("Please fill all required fields")
    return
  }

  const bookNowBtn = document.getElementById("bookNowBtn")
  setButtonLoading(bookNowBtn, true, "bookBtnText", "bookBtnLoader")
  hideError()
  hideSuccess()

  const bookingData = {
    park: PARK_ID,
    visit_date: visitDate,
    num_people: Number.parseInt(numPeople),
    total_amount: Number.parseFloat(totalAmount),
    payment_method: "online",
    payment_status: "success",
    customer: user_id,
    customer_name: customerName,
    customer_email: customerEmail,
  }

  const [success, response] = await callApi("POST", booking_url, bookingData, csrf_token)

  setButtonLoading(bookNowBtn, false, "bookBtnText", "bookBtnLoader")

  if (success && response.success) {
    showSuccess("Booking created successfully!")

    const bookingId = response.data.booking_id

    setTimeout(() => {
      window.location.href = `/account/`
    }, 2000)
  } else {
    showError(response.error || "Failed to create booking. Please try again.")
  }
}

// UI Helper Functions
function clearOtpInputs() {
  const otpInputs = document.querySelectorAll(".otp-input")
  otpInputs.forEach((input) => {
    input.value = ""
  })
}

function setButtonLoading(button, isLoading, textId, loaderId) {
  const textElement = document.getElementById(textId)
  const loaderElement = document.getElementById(loaderId)

  if (isLoading) {
    textElement.classList.add("d-none")
    loaderElement.classList.remove("d-none")
    button.disabled = true
  } else {
    textElement.classList.remove("d-none")
    loaderElement.classList.add("d-none")
    button.disabled = false
  }
}

function showError(message) {
  const errorDiv = document.getElementById("errorMessage")
  errorDiv.textContent = message
  errorDiv.classList.remove("d-none")

  setTimeout(() => {
    hideError()
  }, 5000)
}

function hideError() {
  const errorDiv = document.getElementById("errorMessage")
  errorDiv.classList.add("d-none")
}

function showSuccess(message) {
  const successDiv = document.getElementById("successMessage")
  successDiv.textContent = message
  successDiv.classList.remove("d-none")

  setTimeout(() => {
    hideSuccess()
  }, 3000)
}

function hideSuccess() {
  const successDiv = document.getElementById("successMessage")
  successDiv.classList.add("d-none")
}

function showOtpError(message) {
  const errorDiv = document.getElementById("otpErrorMessage")
  errorDiv.textContent = message
  errorDiv.classList.remove("d-none")

  setTimeout(() => {
    hideOtpError()
  }, 5000)
}

function hideOtpError() {
  const errorDiv = document.getElementById("otpErrorMessage")
  errorDiv.classList.add("d-none")
}

function showOtpSuccess(message) {
  const successDiv = document.getElementById("otpSuccessMessage")
  successDiv.textContent = message
  successDiv.classList.remove("d-none")

  setTimeout(() => {
    hideOtpSuccess()
  }, 3000)
}

function hideOtpSuccess() {
  const successDiv = document.getElementById("otpSuccessMessage")
  successDiv.classList.remove("show")
}

function getCSRFToken() {
  const name = "csrftoken"
  const cookies = document.cookie.split(";")

  for (let cookie of cookies) {
    cookie = cookie.trim()
    if (cookie.startsWith(name + "=")) {
      return decodeURIComponent(cookie.substring(name.length + 1))
    }
  }
  return null
}

function startResendTimer() {
  const resendBtn = document.getElementById("resendOtpLink")
  const resendTimer = document.getElementById("resendTimer")
  const timerCount = document.getElementById("timerCount")

  let timeLeft = 30

  resendBtn.disabled = true
  resendTimer.classList.remove("d-none")

  stopResendTimer()

  resendTimerInterval = setInterval(() => {
    timeLeft--
    timerCount.textContent = timeLeft

    if (timeLeft <= 0) {
      stopResendTimer()
      resendBtn.disabled = false
      resendTimer.classList.add("d-none")
    }
  }, 1000)
}

function stopResendTimer() {
  if (resendTimerInterval) {
    clearInterval(resendTimerInterval)
    resendTimerInterval = null
  }
}

function fillOtpForTesting(otp) {
  if (otp && otp.length === 6) {
    const otpInputs = document.querySelectorAll(".otp-input")
    otpInputs.forEach((input, index) => {
      input.value = otp[index]
    })
    console.log("Auto-filled OTP for testing:", otp)
  }
}
