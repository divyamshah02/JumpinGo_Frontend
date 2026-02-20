// Check-In Page State
let checkin_url = null
let csrf_token = null

// Initialize Check-In Page
async function initCheckin(checkin_url_param, csrf_token_param) {
  checkin_url = checkin_url_param
  csrf_token = csrf_token_param

  setupCheckinForm()
  setupLastFourDigitsInput()
}

// Setup Check-In Form
function setupCheckinForm() {
  const checkinForm = document.getElementById("checkinForm")

  checkinForm.addEventListener("submit", async (e) => {
    e.preventDefault()
    await performCheckin()
  })
}

// Setup Last Four Digits Input (only allow numbers)
function setupLastFourDigitsInput() {
  const lastFourDigitsInput = document.getElementById("lastFourDigits")

  lastFourDigitsInput.addEventListener("input", (e) => {
    e.target.value = e.target.value.replace(/[^0-9]/g, "")
  })
}

// Perform Check-In
async function performCheckin() {
  const bookingId = document.getElementById("bookingId").value.trim()
  const lastFourDigits = document.getElementById("lastFourDigits").value.trim()

  if (!bookingId || !lastFourDigits) {
    showError("Please fill in all fields")
    return
  }

  if (lastFourDigits.length !== 4) {
    showError("Please enter exactly 4 digits")
    return
  }

  const checkinBtn = document.getElementById("checkinBtn")
  setButtonLoading(checkinBtn, true)
  hideError()
  hideSuccess()

  const requestData = {
    booking_id: bookingId,
    last_four_digits: lastFourDigits,
  }

  const [success, response] = await callApi("POST", checkin_url, requestData, csrf_token)

  setButtonLoading(checkinBtn, false)

  if (success && response.success) {
    const data = response.data
    showSuccess("Check-in successful! Your QR pass has been generated.")
    displayQRCode(data)
  } else {
    showError(response.error || "Check-in failed. Please verify your booking details.")
  }
}

// Display QR Code and Booking Details
function displayQRCode(data) {
  const qrCard = document.getElementById("qrCard")
  const checkinCard = document.getElementById("checkinCard")
  const qrImage = document.getElementById("qrImage")
  const downloadBtn = document.getElementById("downloadBtn")

  // Hide check-in form
  checkinCard.classList.add("d-none")

  // Set QR image
  qrImage.src = data.qr_url

  // Set download link
  downloadBtn.href = data.qr_url
  downloadBtn.download = `${data.booking.booking_id}_QR_Pass.png`

  // Display booking details
  document.getElementById("displayBookingId").textContent = data.booking.booking_id
  document.getElementById("displayCustomerName").textContent = data.booking.customer_name || "N/A"
  document.getElementById("displayNumPeople").textContent = data.booking.num_people
  document.getElementById("displayVisitDate").textContent = data.booking.visit_date

  // Show QR card
  qrCard.classList.remove("d-none")
}

// Reset Form for New Check-In
function resetForm() {
  const qrCard = document.getElementById("qrCard")
  const checkinCard = document.getElementById("checkinCard")
  const checkinForm = document.getElementById("checkinForm")

  // Hide QR card
  qrCard.classList.add("d-none")

  // Show check-in form
  checkinCard.classList.remove("d-none")

  // Reset form fields
  checkinForm.reset()

  // Clear alerts
  hideError()
  hideSuccess()
}

// UI Helper Functions
function setButtonLoading(button, isLoading) {
  const btnText = document.getElementById("checkinBtnText")
  const btnLoader = document.getElementById("checkinBtnLoader")

  if (isLoading) {
    btnText.classList.add("d-none")
    btnLoader.classList.remove("d-none")
    button.disabled = true
  } else {
    btnText.classList.remove("d-none")
    btnLoader.classList.add("d-none")
    button.disabled = false
  }
}

function showError(message) {
  const errorAlert = document.getElementById("errorAlert")
  errorAlert.textContent = message
  errorAlert.classList.remove("d-none")

  setTimeout(() => {
    hideError()
  }, 5000)
}

function hideError() {
  const errorAlert = document.getElementById("errorAlert")
  errorAlert.classList.add("d-none")
}

function showSuccess(message) {
  const successAlert = document.getElementById("successAlert")
  successAlert.textContent = message
  successAlert.classList.remove("d-none")

  setTimeout(() => {
    hideSuccess()
  }, 3000)
}

function hideSuccess() {
  const successAlert = document.getElementById("successAlert")
  successAlert.classList.add("d-none")
}
