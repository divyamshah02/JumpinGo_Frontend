// Account Page State
let account_url = null
let otp_url = null
let addon_url = null
let is_logged_in_url = null
let csrf_token = null
let currentOtpId = null
let currentMobile = null
let currentAddonBookingId = null
let currentRidePrice = 0
let paidRides = []
let currentUser = null

// Bootstrap Modal Library
const bootstrap = window.bootstrap

// Initialize Account Page
async function initAccount(
  account_url_param,
  otp_url_param,
  addon_url_param,
  is_logged_in_url_param,
  csrf_token_param,
) {
  account_url = account_url_param
  otp_url = otp_url_param
  addon_url = addon_url_param
  is_logged_in_url = is_logged_in_url_param
  csrf_token = csrf_token_param

  // Check if user is logged in via API
  const isLoggedIn = await checkUserLoggedIn()

  if (!isLoggedIn) {
    showLoginModal()
    return
  }

  await loadProfile()
  await loadBookings()
  await loadPaidRides()
  setupProfileForm()
  setupLoginForms()
}

async function checkUserLoggedIn() {
  const [success, response] = await callApi("GET", is_logged_in_url, null, csrf_token)

  if (success && response.success) {
    currentUser = response.data
    return true
  }

  return false
}

function showLoginModal() {
  const mobileModal = new bootstrap.Modal(document.getElementById("mobileModal"))
  mobileModal.show()
  setupLoginForms()
}

function setupLoginForms() {
  const mobileForm = document.getElementById("mobileForm")
  const otpForm = document.getElementById("otpForm")

  if (mobileForm) {
    mobileForm.addEventListener("submit", async (e) => {
      e.preventDefault()
      await sendOtp()
    })
  }

  if (otpForm) {
    otpForm.addEventListener("submit", async (e) => {
      e.preventDefault()
      await verifyOtp()
    })
  }
}

async function sendOtp() {
  const mobile = document.getElementById("loginMobile").value.trim()

  if (!mobile || mobile.length !== 10) {
    showAlert("Please enter a valid 10-digit mobile number", "warning")
    return
  }

  currentMobile = mobile

  const sendOtpBtn = document.getElementById("sendOtpBtn")
  setButtonLoading(sendOtpBtn, true)

  const requestData = { mobile: mobile }
  const [success, response] = await callApi("POST", otp_url, requestData, csrf_token)

  setButtonLoading(sendOtpBtn, false)

  if (success && response.success) {
    currentOtpId = response.data.otp_id

    // Auto-fill OTP for testing
    if (response.data.otp) {
      document.getElementById("otpInput").value = response.data.otp
    }

    // Show OTP modal
    const mobileModal = bootstrap.Modal.getInstance(document.getElementById("mobileModal"))
    mobileModal.hide()

    const otpModal = new bootstrap.Modal(document.getElementById("otpModal"))
    document.getElementById("displayMobile").textContent = `+91 ${mobile}`
    otpModal.show()
  } else {
    showAlert(response.error || "Failed to send OTP", "danger")
  }
}

async function verifyOtp() {
  const otp = document.getElementById("otpInput").value.trim()

  if (!otp || otp.length !== 6) {
    showAlert("Please enter a valid 6-digit OTP", "warning")
    return
  }

  if (!currentOtpId) {
    showAlert("Invalid session. Please request a new OTP.", "danger")
    return
  }

  const verifyOtpBtn = document.getElementById("verifyOtpBtn")
  setButtonLoading(verifyOtpBtn, true)

  const requestData = { otp: otp }
  const [success, response] = await callApi("PUT", `${otp_url}${currentOtpId}/`, requestData, csrf_token)

  setButtonLoading(verifyOtpBtn, false)

  if (success && response.success && response.data.otp_verified) {
    showAlert("Login successful! Redirecting...", "success")

    // Refresh page after successful login (session is now set on server)
    setTimeout(() => {
      window.location.reload()
    }, 1000)
  } else {
    showAlert(response.data?.message || "OTP verification failed", "danger")
    document.getElementById("otpInput").value = ""
  }
}

function backToMobile() {
  const otpModal = bootstrap.Modal.getInstance(document.getElementById("otpModal"))
  otpModal.hide()

  const mobileModal = new bootstrap.Modal(document.getElementById("mobileModal"))
  mobileModal.show()
}

// Load Profile Information
async function loadProfile() {
  if (!currentUser) {
    showAlert("Failed to load profile information", "danger")
    return
  }

  document.getElementById("name").value = currentUser.name || ""
  document.getElementById("email").value = currentUser.email || ""
  document.getElementById("mobile").value = currentUser.contact_number || ""
}

// Load Bookings
async function loadBookings() {
  const bookingsUrl = account_url.replace("/account-api/", "/account-api/bookings/")
  const [success, response] = await callApi("GET", bookingsUrl, null, csrf_token)

  document.getElementById("loadingBookings").classList.add("d-none")
  document.getElementById("bookingsContainer").classList.remove("d-none")

  if (success && response.success) {
    const bookings = response.data

    if (bookings.length === 0) {
      document.getElementById("noBookings").classList.remove("d-none")
      return
    }

    renderBookings(bookings)
  } else {
    showAlert("Failed to load bookings", "danger")
  }
}

async function loadPaidRides() {
  const ridesUrl = addon_url.replace("/addon-api/", "/addon-api/paid_rides/")
  const [success, response] = await callApi("GET", ridesUrl, null, csrf_token)

  if (success && response.success) {
    paidRides = response.data
  }
}

// Render Bookings Table
function renderBookings(bookings) {
  const tbody = document.getElementById("bookingsTable")
  tbody.innerHTML = ""

  const today = new Date().toISOString().split("T")[0]

  bookings.forEach((booking) => {
    const row = document.createElement("tr")

    const statusBadge = booking.checked_in
      ? '<span class="badge bg-success">Checked In</span>'
      : '<span class="badge bg-warning">Pending</span>'

    const paymentBadge =
      booking.payment_status === "success"
        ? '<span class="badge bg-success">Paid</span>'
        : '<span class="badge bg-danger">Pending</span>'

    const visitDate = booking.visit_date
    const showAddonBtn = visitDate === today && booking.checked_in
    const addonButton = showAddonBtn
      ? `<button class="btn btn-sm btn-success" onclick="openAddonModal('${booking.booking_id}')">
           <i class="fas fa-plus"></i> Add-On
         </button>`
      : "-"

    row.innerHTML = `
            <td><strong>${booking.booking_id}</strong></td>
            <td>${new Date(booking.visit_date).toLocaleDateString()}</td>
            <td>${booking.num_people}</td>
            <td>₹${booking.total_amount}</td>
            <td>${paymentBadge}</td>
            <td>${statusBadge}</td>
            <td>${new Date(booking.created_at).toLocaleDateString()}</td>
            <td>${addonButton}</td>
        `

    tbody.appendChild(row)
  })
}

// Setup Profile Form
function setupProfileForm() {
  const form = document.getElementById("profileForm")
  form.addEventListener("submit", async (e) => {
    e.preventDefault()
    await updateProfile()
  })
}

// Update Profile
async function updateProfile() {
  const name = document.getElementById("name").value.trim()
  const email = document.getElementById("email").value.trim()

  if (!name || !email) {
    showAlert("Please fill in all fields", "warning")
    return
  }

  const updateBtn = document.getElementById("updateBtn")
  setButtonLoading(updateBtn, true)

  const updateUrl = account_url.replace("/account-api/", "/account-api/update_profile/")
  const data = { name, email }

  const [success, response] = await callApi("PUT", updateUrl, data, csrf_token)

  setButtonLoading(updateBtn, false)

  if (success && response.success) {
    showAlert("Profile updated successfully!", "success")
    // Update currentUser
    currentUser.name = name
    currentUser.email = email
  } else {
    showAlert(response.error || "Failed to update profile", "danger")
  }
}

// Show Alert
function showAlert(message, type) {
  const alertContainer = document.getElementById("alertContainer")
  const alert = document.createElement("div")
  alert.className = `alert alert-${type} alert-dismissible fade show`
  alert.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `
  alertContainer.appendChild(alert)

  setTimeout(() => {
    alert.remove()
  }, 5000)
}

// Set Button Loading State
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

// Logout Function
function logout() {
  if (confirm("Are you sure you want to logout?")) {
    window.location.href = "/login/"
  }
}

function openAddonModal(bookingId) {
  currentAddonBookingId = bookingId
  document.getElementById("addonBookingId").value = bookingId

  // Populate rides dropdown
  const rideSelect = document.getElementById("addonRideSelect")
  rideSelect.innerHTML = '<option value="">-- Select a Ride --</option>'

  paidRides.forEach((ride) => {
    const option = document.createElement("option")
    option.value = ride.id
    option.textContent = `${ride.name} - ₹${ride.price}`
    option.dataset.price = ride.price
    rideSelect.appendChild(option)
  })

  // Reset form
  document.getElementById("rideAccessInfo").classList.add("d-none")
  document.getElementById("additionalEntries").value = ""
  document.getElementById("addonAlertContainer").innerHTML = ""

  const modal = new bootstrap.Modal(document.getElementById("addonModal"))
  modal.show()
}

async function checkRideAccess() {
  const rideSelect = document.getElementById("addonRideSelect")
  const rideId = rideSelect.value

  if (!rideId) {
    document.getElementById("rideAccessInfo").classList.add("d-none")
    return
  }

  const selectedOption = rideSelect.options[rideSelect.selectedIndex]
  currentRidePrice = Number.parseFloat(selectedOption.dataset.price)

  const checkUrl = addon_url.replace("/addon-api/", "/addon-api/get_ride_access/")
  const [success, response] = await callApi(
    "GET",
    `${checkUrl}?booking_id=${currentAddonBookingId}&ride_id=${rideId}`,
    null,
    csrf_token,
  )

  if (success && response.success) {
    const data = response.data
    document.getElementById("currentAccess").textContent = data.total_allowed
    document.getElementById("usedAccess").textContent = data.used_count
    document.getElementById("availableAccess").textContent = data.remaining
    document.getElementById("ridePrice").textContent = currentRidePrice
    document.getElementById("rideAccessInfo").classList.remove("d-none")
  } else {
    showAddonAlert(response.error || "Failed to check ride access", "danger")
  }
}

function calculateAddonPrice() {
  const additionalEntries = Number.parseInt(document.getElementById("additionalEntries").value) || 0
  const totalPrice = additionalEntries * currentRidePrice
  document.getElementById("totalAddonPrice").textContent = totalPrice
}

async function purchaseAddon() {
  const rideId = document.getElementById("addonRideSelect").value
  const additionalEntries = Number.parseInt(document.getElementById("additionalEntries").value)

  if (!rideId) {
    showAddonAlert("Please select a ride", "warning")
    return
  }

  if (!additionalEntries || additionalEntries < 1) {
    showAddonAlert("Please enter a valid number of entries", "warning")
    return
  }

  const purchaseUrl = addon_url
  const data = {
    booking_id: currentAddonBookingId,
    ride_id: rideId,
    additional_entries: additionalEntries,
    source: "website",
  }

  const [success, response] = await callApi("POST", purchaseUrl, data, csrf_token)

  if (success && response.success) {
    showAddonAlert("Add-on purchased successfully!", "success")
    setTimeout(() => {
      const modal = bootstrap.Modal.getInstance(document.getElementById("addonModal"))
      modal.hide()
      loadBookings() // Refresh bookings
    }, 1500)
  } else {
    showAddonAlert(response.error || "Failed to purchase add-on", "danger")
  }
}

function showAddonAlert(message, type) {
  const alertContainer = document.getElementById("addonAlertContainer")
  const alert = document.createElement("div")
  alert.className = `alert alert-${type} alert-dismissible fade show`
  alert.innerHTML = `
    ${message}
    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
  `
  alertContainer.appendChild(alert)

  setTimeout(() => {
    alert.remove()
  }, 5000)
}
