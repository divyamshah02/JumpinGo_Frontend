// Seller Dashboard State
let seller_api_url = null
let booking_api_url = null
let addon_api_url = null
let prebooking_api_url = null
let user_api_url = null
let csrf_token = null
const PARK_ID = 1 // Static park ID for now
let selectedCustomer = null // Track selected customer

// Initialize Seller Dashboard
async function initSellerDashboard(seller_url, booking_url, user_url, csrf) {
  seller_api_url = seller_url
  booking_api_url = booking_url
  addon_api_url = booking_url.replace("booking-api", "addon-api")
  prebooking_api_url = booking_url.replace("booking-api", "prebooking-api")
  user_api_url = user_url
  csrf_token = csrf

  // await loadDashboardStats()
  // await loadBookings()
  setupEventListeners()
  // await loadPaidRides()
  toggle_loader()
}

// Setup Event Listeners
function setupEventListeners() {
  // Booking form
  document.getElementById("bookingForm").addEventListener("submit", createBooking)
  document.getElementById("numPeople").addEventListener("input", calculateTotalAmount)
  
  // Customer search
  document.getElementById("customerName").addEventListener("input", searchCustomers)

  document.getElementById("addonForm").addEventListener("submit", purchaseAddon)
  
  // Pre-booking listeners
  const prebookingSearchBtn = document.getElementById("prebookingSearchBtn")
  if (prebookingSearchBtn) {
    prebookingSearchBtn.addEventListener("click", searchPrebookings)
  }

  // Set minimum date to today
  const today = new Date().toISOString().split("T")[0]
  document.getElementById("visitDate").setAttribute("min", today)
  document.getElementById("visitDate").value = today

  // Calculate initial amount
  calculateTotalAmount()
}

// Search Customers
async function searchCustomers() {
  const searchValue = document.getElementById("customerName").value.trim()
  const dropdown = document.getElementById("customerSearchDropdown")

  if (!searchValue || searchValue.length < 2) {
    dropdown.style.display = "none"
    return
  }

  const [success, response] = await callApi(
    "GET",
    `${user_api_url}search_customers/?search=${encodeURIComponent(searchValue)}`,
    null,
    csrf_token
  )

  if (success && response.success) {
    const customers = response.data
    
    if (customers.length === 0) {
      dropdown.innerHTML = '<div class="list-group-item text-muted">No customers found</div>'
      dropdown.style.display = "block"
      return
    }

    dropdown.innerHTML = customers
      .map(
        (customer) =>
          `<button type="button" class="list-group-item list-group-item-action" onclick="selectCustomer(${customer.id}, '${customer.name}', '${customer.phone}', '${customer.num_people}', '${customer.visit_date}')">
            <div><strong>${customer.name}</strong></div>
            <small class="text-muted">${customer.phone}</small>
          </button>`
      )
      .join("")
    dropdown.style.display = "block"
  }
}

// Select Customer
function selectCustomer(customerId, name, phone, numPeople, visitDate) {
  selectedCustomer = {
    id: customerId,
    name: name,
    email: null,
    num_people: numPeople,
    visit_date: visitDate,
    phone: phone,
  }

  // Fill in the form
  document.getElementById("customerName").value = name
  // document.getElementById("customerEmail").value = email
  document.getElementById("customerMobile").value = phone
  document.getElementById("numPeople").value = numPeople
  document.getElementById("visitDate").value = visitDate
  
  // Make fields readonly
  document.getElementById("customerEmail").readOnly = true
  document.getElementById("customerMobile").readOnly = true

  // Show status and clear button
  document.getElementById("customerSelectedStatus").textContent = "✓ Customer selected"
  document.getElementById("clearCustomerBtn").style.display = "inline-block"

  // Hide dropdown
  document.getElementById("customerSearchDropdown").style.display = "none"

  // Calculate total amount
  calculateTotalAmount()
}

// Clear Customer Selection
function clearCustomerSelection() {
  selectedCustomer = null
  document.getElementById("customerName").value = ""
  document.getElementById("customerEmail").value = ""
  document.getElementById("customerMobile").value = ""
  
  // Make fields writable
  document.getElementById("customerEmail").readOnly = false
  document.getElementById("customerMobile").readOnly = false

  // Hide status and clear button
  document.getElementById("customerSelectedStatus").textContent = ""
  document.getElementById("clearCustomerBtn").style.display = "none"

  // Hide dropdown
  document.getElementById("customerSearchDropdown").style.display = "none"
}

// Load Dashboard Statistics
async function loadDashboardStats() {
  const [success, response] = await callApi("GET", seller_api_url, null, csrf_token)

  if (success && response.success) {
    const data = response.data

    document.getElementById("totalBookings").textContent = data.total_bookings
    document.getElementById("totalRevenue").textContent = `₹${data.total_revenue.toFixed(2)}`
    document.getElementById("todayBookings").textContent = data.today_bookings
    document.getElementById("userName").textContent = data.user_name
    document.getElementById("userRole").textContent = data.user_role === "seller" ? "External Seller" : "Cash Counter"

    // Show commission card only for sellers
    if (data.user_role === "seller") {
      document.getElementById("commissionCard").style.display = "block"
      document.getElementById("commissionHeader").style.display = "table-cell"
      document.getElementById("commissionEarned").textContent = `₹${data.commission_earned.toFixed(2)}`
    }

    // if (data.user_role === "cash_counter") {
    //   document.getElementById("addon-tab-nav").style.display = "block"
    // }
  } else {
    console.error("Failed to load dashboard stats:", response.error)
  }
}

// Load Bookings
async function loadBookings(filters = {}) {
  const params = new URLSearchParams(filters)
  const url = `${seller_api_url}bookings/?${params.toString()}`

  const [success, response] = await callApi("GET", url, null, csrf_token)

  if (success && response.success) {
    renderBookingsTable(response.data)
  } else {
    console.error("Failed to load bookings:", response.error)
    document.getElementById("bookingsTableBody").innerHTML = `
            <tr><td colspan="9" class="text-center text-danger">Failed to load bookings</td></tr>
        `
  }
}

// Render Bookings Table
function renderBookingsTable(bookings) {
  const tbody = document.getElementById("bookingsTableBody")

  if (bookings.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center">No bookings found</td></tr>'
    return
  }

  tbody.innerHTML = bookings
    .map((booking) => {
      const commissionCell = booking.commission_amount
        ? `<td>₹${Number.parseFloat(booking.commission_amount).toFixed(2)}</td>`
        : ""

      return `
            <tr>
                <td>${booking.booking_id}</td>
                <td>${booking.customer_name || "N/A"}</td>
                <td>${booking.customer_contact || "N/A"}</td>
                <td>${new Date(booking.visit_date).toLocaleDateString()}</td>
                <td>${booking.num_people}</td>
                <td>₹${Number.parseFloat(booking.total_amount).toFixed(2)}</td>
                ${commissionCell}
                <td>
                    <span class="badge bg-${booking.payment_status === "success" ? "success" : booking.payment_status === "pending" ? "warning" : "danger"}">
                        ${booking.payment_status}
                    </span>
                    <br><small>${booking.payment_method}</small>
                </td>
                <td>
                    <span class="badge bg-${booking.checked_in ? "success" : "secondary"}">
                        ${booking.checked_in ? "Checked In" : "Not Checked In"}
                    </span>
                </td>
            </tr>
        `
    })
    .join("")
}

// Apply Booking Filters
function applyBookingFilters() {
  const filters = {
    start_date: document.getElementById("filterStartDate").value,
    end_date: document.getElementById("filterEndDate").value,
    payment_status: document.getElementById("filterPaymentStatus").value,
    search: document.getElementById("searchBookings").value,
  }

  // Remove empty filters
  Object.keys(filters).forEach((key) => {
    if (!filters[key]) delete filters[key]
  })

  loadBookings(filters)
}

// Clear Booking Filters
function clearBookingFilters() {
  document.getElementById("filterStartDate").value = ""
  document.getElementById("filterEndDate").value = ""
  document.getElementById("filterPaymentStatus").value = ""
  document.getElementById("searchBookings").value = ""
  loadBookings()
}

// Calculate Total Amount
function calculateTotalAmount_flat_rate() {
  const numPeople = Number.parseInt(document.getElementById("numPeople").value) || 1
  const pricePerPerson = 500 // Base price, should come from API
  const total = numPeople * pricePerPerson

  document.getElementById("totalAmount").textContent = `₹${total.toFixed(2)}`
}

function calculateTotalAmount() {
  const numPeople = parseInt(document.getElementById("numPeople").value) || 1
  const visitDateValue = document.getElementById("visitDate").value

  if (!visitDateValue) {
    document.getElementById("totalAmount").textContent = "₹0"
    return
  }

  const visitDate = new Date(visitDateValue)
  const day = visitDate.getDay() // 0 = Sunday, 6 = Saturday
  const isWeekend = (day === 0 || day === 6)

  // Pricing structure
  const pricing = {
    weekday: {
      1: 1000,
    },
    weekend: {
      1: 1300,
    }
  }

  const type = isWeekend ? "weekend" : "weekday"

  let total

  if (pricing[type][numPeople]) {
    // Exact match for bundle
    total = pricing[type][numPeople]
  } else {
    // Fallback: per person pricing
    total = pricing[type][1] * numPeople
  }

  document.getElementById("totalAmount").textContent = `₹${total.toFixed(2)}`
}

// Create Booking
async function createBooking(e) {
  e.preventDefault()

  const customerName = document.getElementById("customerName").value.trim()
  const customerEmail = document.getElementById("customerEmail").value.trim()
  const customerMobile = document.getElementById("customerMobile").value.trim()
  const visitDate = document.getElementById("visitDate").value
  const numPeople = Number.parseInt(document.getElementById("numPeople").value)
  // const paymentMethod = document.getElementById("paymentMethod").value
  const paymentMethod = document.querySelector('input[name="paymentMethod"]:checked')?.value;
  const totalAmount = Number.parseFloat(document.getElementById("totalAmount").textContent.replace("₹", ""))

  if (!customerMobile || customerMobile.length !== 10) {
    alert("Please enter a valid 10-digit mobile number")
    return
  }

  const bookingData = {
    park: PARK_ID,
    customer_name: customerName,
    customer_email: customerEmail,
    customer_mobile: customerMobile,
    visit_date: visitDate,
    num_people: numPeople,
    total_amount: totalAmount,
    payment_method: paymentMethod,
    payment_status: "success", // For now static but will be made dynamic when payment gateway is integrated
  }

  const btn = document.getElementById("createBookingBtn")
  btn.disabled = true
  btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Creating...'

  const [success, response] = await callApi("POST", booking_api_url, bookingData, csrf_token)

  btn.disabled = false
  btn.innerHTML = '<i class="fas fa-ticket-alt me-2"></i>Create Booking'

  if (success && response.success) {
    alert("Booking created successfully! Booking ID: " + response.data.booking_id)

    // Reset form
    document.getElementById("bookingForm").reset()

    // Reset date to today
    const today = new Date().toISOString().split("T")[0]
    document.getElementById("visitDate").value = today
    document.getElementById("numPeople").value = 1
    calculateTotalAmount()

    // Refresh bookings and stats
    await loadDashboardStats()
    await loadBookings()

    // Switch to bookings tab
    // const bootstrap = window.bootstrap
    // const bookingsTab = new bootstrap.Tab(document.getElementById("bookings-tab"))
    // bookingsTab.show()
  } else {
    alert("Failed to create booking: " + (response.error || "Unknown error"))
  }
}

async function loadPaidRides() {
  const [success, response] = await callApi(
    "GET",
    `${booking_api_url.replace("booking-api", "ride-scanner-api")}paid_rides/`,
    null,
    csrf_token,
  )

  if (success && response.success) {
    const select = document.getElementById("addonRideId")
    select.innerHTML = '<option value="">-- Select Paid Ride --</option>'

    response.data.forEach((ride) => {
      const option = document.createElement("option")
      option.value = ride.id
      option.textContent = `${ride.name} - ₹${ride.price}`
      option.dataset.price = ride.price
      select.appendChild(option)
    })
  }
}

async function checkRideAccess() {
  const bookingId = document.getElementById("addonBookingId").value.trim()
  const rideId = document.getElementById("addonRideId").value

  if (!bookingId || !rideId) {
    alert("Please enter booking ID and select a ride")
    return
  }

  const url = `${addon_api_url}get_ride_access/?booking_id=${bookingId}&ride_id=${rideId}`
  const [success, response] = await callApi("GET", url, null, csrf_token)

  if (success && response.success) {
    const data = response.data

    // Show current access info
    document.getElementById("currentAccessInfo").style.display = "block"
    document.getElementById("addonCustomerName").textContent = data.customer_name
    document.getElementById("addonRideName").textContent = data.ride_name
    document.getElementById("addonTotalAllowed").textContent = data.total_allowed
    document.getElementById("addonUsedCount").textContent = data.used_count
    document.getElementById("addonRemaining").textContent = data.remaining
    document.getElementById("addonRidePrice").textContent = data.ride_price

    // Setup price calculation
    document.getElementById("additionalEntries").addEventListener("input", calculateAddonAmount)
    calculateAddonAmount()
  } else {
    alert("Failed to get ride access: " + (response.error || "Unknown error"))
    document.getElementById("currentAccessInfo").style.display = "none"
  }
}

function calculateAddonAmount() {
  const additionalEntries = Number.parseInt(document.getElementById("additionalEntries").value) || 1
  const pricePerEntry = Number.parseFloat(document.getElementById("addonRidePrice").textContent) || 0
  const total = additionalEntries * pricePerEntry

  document.getElementById("addonTotalAmount").textContent = `₹${total.toFixed(2)}`
}

async function purchaseAddon(e) {
  e.preventDefault()

  const bookingId = document.getElementById("addonBookingId").value.trim()
  const rideId = document.getElementById("addonRideId").value
  const additionalEntries = Number.parseInt(document.getElementById("additionalEntries").value)
  const paymentMethod = document.getElementById("addonPaymentMethod").value

  if (!bookingId || !rideId || !additionalEntries) {
    alert("Please fill all required fields")
    return
  }

  const addonData = {
    booking_id: bookingId,
    ride_id: rideId,
    additional_entries: additionalEntries,
    payment_method: paymentMethod,
  }

  const btn = document.getElementById("purchaseAddonBtn")
  btn.disabled = true
  btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Processing...'

  const [success, response] = await callApi("POST", addon_api_url, addonData, csrf_token)

  btn.disabled = false
  btn.innerHTML = '<i class="fas fa-shopping-cart me-2"></i>Purchase Add-On'

  if (success && response.success) {
    alert(`Add-on purchased successfully!\nAdd-on ID: ${response.data.addon_id}\n${response.data.message}`)

    // Reset form
    document.getElementById("addonForm").reset()
    document.getElementById("currentAccessInfo").style.display = "none"

    // Refresh stats
    await loadDashboardStats()
  } else {
    alert("Failed to purchase add-on: " + (response.error || "Unknown error"))
  }
}

// ======================== PRE-BOOKING FUNCTIONS ========================

async function searchPrebookings() {  
  const searchValue = document.getElementById("prebookingSearch").value.trim()
  const statusFilter = document.getElementById("prebookingStatusFilter").value

  let url = `${prebooking_api_url}?`
  
  if (searchValue) {
    url += `search=${encodeURIComponent(searchValue)}&`
  }
  if (statusFilter) {
    url += `status=${statusFilter}&`
  }

  const [success, response] = await callApi("GET", url, null, csrf_token)

  if (success && response.success) {
    renderPrebookingsTable(response.data)
  } else {
    console.error("Failed to load pre-bookings:", response.error)
    const tbody = document.getElementById("prebookingsTableBody")
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="8" class="text-center text-danger">Failed to load pre-bookings</td></tr>`
    }
  }
}

function renderPrebookingsTable(prebookings) {
  const tbody = document.getElementById("prebookingsTableBody")
  
  if (!tbody) return

  if (prebookings.length === 0) {
    tbody.innerHTML = '<tr><td colspan="8" class="text-center">No pre-bookings found</td></tr>'
    return
  }

  tbody.innerHTML = prebookings
    .map((pb) => {
      const actionButtons =
        pb.status === "pending"
          ? `
            <button class="btn btn-sm btn-success" onclick="openConfirmPrebookingModal(${pb.id}, '${pb.prebooking_id}', '${pb.customer_name}', ${pb.num_people}, '${pb.visit_date}')">
              Confirm
            </button>
            <button class="btn btn-sm btn-danger" onclick="cancelPrebooking(${pb.id})">
              Cancel
            </button>
          `
          : `<span class="badge bg-secondary">${pb.status}</span>`

      return `
            <tr>
                <td><strong>${pb.prebooking_id}</strong></td>
                <td>${pb.customer_name}</td>
                <td>${pb.customer_number}</td>
                <td>${pb.num_people}</td>
                <td>${new Date(pb.visit_date).toLocaleDateString()}</td>
                <td><span class="badge bg-${pb.status === "pending" ? "warning" : pb.status === "confirmed" ? "success" : "danger"}">${pb.status}</span></td>
                <td>${new Date(pb.created_at).toLocaleDateString()}</td>
                <td>${actionButtons}</td>
            </tr>
        `
    })
    .join("")
}

function openConfirmPrebookingModal(prebookingId, prebookingCode, customerName, numPeople, visitDate) {
  const modal = document.getElementById("confirmPrebookingModal")
  if (!modal) {
    alert("Modal not found. Please contact support.")
    return
  }

  document.getElementById("confirmPrebookingCustomer").textContent = customerName
  document.getElementById("confirmPrebookingCode").textContent = prebookingCode
  document.getElementById("confirmPrebookingPeople").textContent = numPeople
  document.getElementById("confirmPrebookingDate").textContent = new Date(visitDate).toLocaleDateString()

  document.getElementById("confirmPrebookingForm").onsubmit = async (e) => {
    e.preventDefault()
    await confirmPrebooking(prebookingId)
  }

  modal.style.display = "block"
}

function closeConfirmPrebookingModal() {
  const modal = document.getElementById("confirmPrebookingModal")
  if (modal) {
    modal.style.display = "none"
  }
}

async function confirmPrebooking(prebookingId) {
  const totalAmount = document.getElementById("confirmPrebookingAmount").value
  const paymentMethod = document.getElementById("confirmPrebookingPaymentMethod").value

  if (!totalAmount) {
    alert("Please enter total amount")
    return
  }

  const confirmData = {
    total_amount: parseFloat(totalAmount),
    payment_method: paymentMethod,
  }

  const btn = document.querySelector("#confirmPrebookingForm button[type='submit']")
  btn.disabled = true
  btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Processing...'

  const [success, response] = await callApi("POST", `${prebooking_api_url}${prebookingId}/confirm/`, confirmData, csrf_token)

  btn.disabled = false
  btn.innerHTML = 'Confirm & Create Booking'

  if (success && response.success) {
    alert(`Pre-booking confirmed! Booking ID: ${response.data.booking.booking_id}`)
    closeConfirmPrebookingModal()
    searchPrebookings()
    await loadDashboardStats()
  } else {
    alert("Failed to confirm pre-booking: " + (response.error || "Unknown error"))
  }
}

async function cancelPrebooking(prebookingId) {
  if (!confirm("Are you sure you want to cancel this pre-booking?")) {
    return
  }

  const [success, response] = await callApi("POST", `${prebooking_api_url}${prebookingId}/cancel/`, {}, csrf_token)

  if (success && response.success) {
    alert("Pre-booking cancelled successfully")
    searchPrebookings()
  } else {
    alert("Failed to cancel pre-booking: " + (response.error || "Unknown error"))
  }
}
