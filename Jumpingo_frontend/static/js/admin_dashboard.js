// Dashboard State
let admin_api_url = null
let prebooking_api_url = null
let csrf_token = null
const PARK_ID = 1 // Static park ID for now (future multi-park support)
let currentSellerId = null
let currentCashCounterId = null

// Initialize Dashboard
async function initDashboard(api_url, prebooking_url, token) {
  admin_api_url = api_url
  prebooking_api_url = prebooking_url
  csrf_token = token

  // const istDate = new Date(Date.now() + 5.5 * 3600000).toISOString().split("T")[0]
  // document.getElementById("bookingStartDate").value = istDate
  // document.getElementById("bookingEndDate").value = istDate

  document.getElementById("bookingStartDate").value = "2026-02-19";
  document.getElementById("bookingEndDate").value = "2026-03-01";


  // Load initial data
  await loadDashboardStats()
  await loadBookings()
  await loadCustomers()
  await loadUsers()
  // await loadSellers()
  await loadCashCounters()
  // await loadRides()
  // await loadAddOns()
  await loadInvitePreBookings()
}

async function loadDashboardStats() {
  const startDate = document.getElementById("bookingStartDate").value
  const endDate = document.getElementById("bookingEndDate").value

  let url = `${admin_api_url}`
  const params = new URLSearchParams()

  if (startDate) params.append("start_date", startDate)
  if (endDate) params.append("end_date", endDate)

  if (params.toString()) {
    url += `?${params.toString()}`
  }

  const [success, response] = await callApi("GET", url, null, csrf_token)

  if (success && response.success) {
    const data = response.data
    document.getElementById("totalBookings").textContent = data.total_bookings
    document.getElementById("totalRevenue").textContent = `₹${data.total_revenue.toFixed(2)}`
    document.getElementById("todayBookings").textContent = data.today_bookings
    document.getElementById("checkedInToday").textContent = data.checked_in_today
  }
}

// Load Bookings with Filters
async function loadBookings() {
  const startDate = document.getElementById("bookingStartDate").value
  const endDate = document.getElementById("bookingEndDate").value
  const paymentStatus = document.getElementById("bookingPaymentStatus").value
  const search = document.getElementById("bookingSearch").value

  let url = `${admin_api_url}bookings/`
  const params = new URLSearchParams()

  if (startDate) params.append("start_date", startDate)
  if (endDate) params.append("end_date", endDate)
  if (paymentStatus) params.append("payment_status", paymentStatus)
  if (search) params.append("search", search)

  if (params.toString()) {
    url += `?${params.toString()}`
  }

  const [success, response] = await callApi("GET", url, null, csrf_token)

  if (success && response.success) {
    renderBookingsTable(response.data)
  } else {
    document.getElementById("bookingsTableBody").innerHTML =
      '<tr><td colspan="10" class="text-center text-danger">Failed to load bookings</td></tr>'
  }
}

// Render Bookings Table
function renderBookingsTable(bookings) {
  const tbody = document.getElementById("bookingsTableBody")

  if (bookings.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" class="text-center">No bookings found</td></tr>'
    return
  }

  tbody.innerHTML = bookings
    .map(
      (booking) => `
        <tr>
            <td>${booking.booking_id}</td>
            <td>${booking.customer_name || "N/A"}</td>
            <td>${booking.customer_contact || "N/A"}</td>
            <td>${booking.visit_date}</td>
            <td>${booking.num_people}</td>
            <td>₹${Number.parseFloat(booking.total_amount).toFixed(2)}</td>
            <td>
                <span class="badge bg-${booking.payment_status === "success" ? "success" : booking.payment_status === "pending" ? "warning" : "danger"}">
                    ${booking.payment_status}
                </span>
            </td>
            <td>
              ${booking.payment_method}              
            </td>
            <td>${booking.sold_by_name || "Direct"}</td>
            <td>
                <button class="btn btn-sm btn-info" onclick="viewBookingDetails(${booking.id})">
                    <i class="fas fa-info-circle"></i> More Info
                </button>
            </td>
        </tr>
    `,
    )
    .join("")
      // <span class="badge bg-${booking.checked_in ? "success" : "secondary"}">
      //               ${booking.checked_in ? "Checked In" : "Not Checked In"}
      //           </span>
}

// Load Customers with Filters
async function loadCustomers() {
  const search = document.getElementById("customerSearch").value

  let url = `${admin_api_url}users/`
  const params = new URLSearchParams()
  params.append("role", "customer")

  if (search) params.append("search", search)

  url += `?${params.toString()}`

  const [success, response] = await callApi("GET", url, null, csrf_token)

  if (success && response.success) {
    renderCustomersTable(response.data)
  } else {
    document.getElementById("customersTableBody").innerHTML =
      '<tr><td colspan="5" class="text-center text-danger">Failed to load customers</td></tr>'
  }
}

// Render Customers Table
function renderCustomersTable(customers) {
  const tbody = document.getElementById("customersTableBody")

  if (customers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">No customers found</td></tr>'
    return
  }

  tbody.innerHTML = customers
    .map(
      (customer) => `
        <tr>
            <td>${customer.user_id}</td>
            <td>${customer.name || "N/A"}</td>
            <td>${customer.contact_number}</td>
            <td>${customer.email || "N/A"}</td>
            <td>
                <span class="badge bg-${customer.is_active_user ? "success" : "danger"}">
                    ${customer.is_active_user ? "Active" : "Inactive"}
                </span>
            </td>
        </tr>
    `,
    )
    .join("")
}

async function loadUsers() {
  const role = document.getElementById("userRole").value
  const search = document.getElementById("userSearch").value

  let url = `${admin_api_url}users/`
  const params = new URLSearchParams()

  // Exclude customers from users tab
  if (role && role !== "customer") {
    params.append("role", role)
  } else if (!role) {
    // When no specific role is selected, exclude customers
    params.append("exclude_customer", "true")
  }

  if (search) params.append("search", search)

  if (params.toString()) {
    url += `?${params.toString()}`
  }

  const [success, response] = await callApi("GET", url, null, csrf_token)

  if (success && response.success) {
    renderUsersTable(response.data)
  } else {
    document.getElementById("usersTableBody").innerHTML =
      '<tr><td colspan="6" class="text-center text-danger">Failed to load users</td></tr>'
  }
}

// Render Users Table
function renderUsersTable(users) {
  const tbody = document.getElementById("usersTableBody")

  if (users.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center">No users found</td></tr>'
    return
  }

  tbody.innerHTML = users
    .map(
      (user) => `
        <tr>
            <td>${user.user_id}</td>
            <td>${user.name || "N/A"}</td>
            <td>${user.contact_number}</td>
            <td>${user.email || "N/A"}</td>
            <td><span class="badge bg-info">${user.role}</span></td>
            <td>
                <span class="badge bg-${user.is_active_user ? "success" : "danger"}">
                    ${user.is_active_user ? "Active" : "Inactive"}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="openEditUserModal(${user.id}, '${user.name}', '${user.email || ""}', ${user.is_active_user}, '${user.role}', ${user.commission_rate || 0})">
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        </tr>
    `,
    )
    .join("")
}

// Create User
async function createUser() {
  const name = document.getElementById("newUserName").value
  const contact = document.getElementById("newUserContact").value
  const email = document.getElementById("newUserEmail").value
  const role = document.getElementById("newUserRole").value
  const commissionRate = document.getElementById("newUserCommission").value

  if (!name || !contact || !role) {
    alert("Please fill all required fields")
    return
  }

  if (role === "seller" && (!commissionRate || Number.parseFloat(commissionRate) <= 0)) {
    alert("Please enter a valid commission rate for seller")
    return
  }

  const userData = {
    name: name,
    contact_number: contact,
    email: email,
    role: role,
    park: PARK_ID,
  }

  if (role === "seller" && commissionRate) {
    userData.commission_rate = Number.parseFloat(commissionRate)
  }

  const [success, response] = await callApi("POST", `${admin_api_url}create_user/`, userData, csrf_token)

  if (success && response.success) {
    alert("User created successfully!")
    const bootstrap = window.bootstrap // Declare bootstrap variable
    const modal = bootstrap.Modal.getInstance(document.getElementById("createUserModal"))
    modal.hide()
    document.getElementById("createUserForm").reset()
    document.getElementById("newUserCommissionGroup").style.display = "none"
    await loadUsers()
  } else {
    alert("Failed to create user: " + (response.error || "Unknown error"))
  }
}

// Open Edit User Modal
function openEditUserModal(userId, name, email, isActive, role, commissionRate) {
  document.getElementById("editUserId").value = userId
  document.getElementById("editUserName").value = name
  document.getElementById("editUserEmail").value = email
  document.getElementById("editUserStatus").value = isActive.toString()
  document.getElementById("editUserRole").value = role
  document.getElementById("editUserPassword").value = ""
  document.getElementById("editUserConfirmPassword").value = ""

  if (role === "seller") {
    document.getElementById("editUserCommissionGroup").style.display = "block"
    document.getElementById("editUserCommission").value = commissionRate || 0
  } else {
    document.getElementById("editUserCommissionGroup").style.display = "none"
  }

  const bootstrap = window.bootstrap // Declare bootstrap variable
  const modal = new bootstrap.Modal(document.getElementById("editUserModal"))
  modal.show()
}

// Update User
async function updateUser() {
  const userId = document.getElementById("editUserId").value
  const name = document.getElementById("editUserName").value
  const email = document.getElementById("editUserEmail").value
  const isActive = document.getElementById("editUserStatus").value === "true"
  const role = document.getElementById("editUserRole").value
  const commissionRate = document.getElementById("editUserCommission").value
  const newPassword = document.getElementById("editUserPassword").value
  const confirmPassword = document.getElementById("editUserConfirmPassword").value

  const userData = {
    name: name,
    email: email,
    is_active_user: isActive,
    role: role
  }

  if (document.getElementById("editUserCommissionGroup").style.display !== "none" && commissionRate) {
    userData.commission_rate = Number.parseFloat(commissionRate)
  }

  const [success, response] = await callApi("PUT", `${admin_api_url}${userId}/update_user/`, userData, csrf_token)

  if (success && response.success) {
    alert("User updated successfully!")

    // Update password if provided
    if (newPassword && confirmPassword) {
      if (newPassword !== confirmPassword) {
        alert("Password confirmation does not match!")
        return
      }

      if (newPassword.length < 6) {
        alert("Password must be at least 6 characters long!")
        return
      }

      const passwordData = {
        new_password: newPassword,
        confirm_password: confirmPassword
      }

      const [pwSuccess, pwResponse] = await callApi("POST", `${admin_api_url}${userId}/update_password/`, passwordData, csrf_token)

      if (pwSuccess && pwResponse.success) {
        alert("Password updated successfully!")
      } else {
        alert("Failed to update password: " + (pwResponse.error || "Unknown error"))
      }
    }

    const bootstrap = window.bootstrap // Declare bootstrap variable
    const modal = bootstrap.Modal.getInstance(document.getElementById("editUserModal"))
    modal.hide()

    // Clear password fields
    document.getElementById("editUserPassword").value = ""
    document.getElementById("editUserConfirmPassword").value = ""

    await loadUsers()
  } else {
    alert("Failed to update user: " + (response.error || "Unknown error"))
  }
}

async function loadRides() {
  const accessType = document.getElementById("rideAccessType").value
  const search = document.getElementById("rideSearch").value

  let url = `${admin_api_url}rides/`
  const params = new URLSearchParams()

  if (accessType) params.append("access_type", accessType)
  if (search) params.append("search", search)

  if (params.toString()) {
    url += `?${params.toString()}`
  }

  const [success, response] = await callApi("GET", url, null, csrf_token)

  if (success && response.success) {
    renderRidesTable(response.data)
  } else {
    document.getElementById("ridesTableBody").innerHTML =
      '<tr><td colspan="5" class="text-center text-danger">Failed to load rides</td></tr>'
  }
}

// Render Rides Table
function renderRidesTable(rides) {
  const tbody = document.getElementById("ridesTableBody")

  if (rides.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center">No rides found</td></tr>'
    return
  }

  tbody.innerHTML = rides
    .map(
      (ride) => `
        <tr>
            <td>${ride.name}</td>
            <td>${ride.park_name || "N/A"}</td>
            <td>
                <span class="badge bg-${ride.access_type === "free" ? "success" : "warning"}">
                    ${ride.access_type}
                </span>
            </td>
            <td>${ride.access_type === "paid" && ride.price ? "₹" + Number.parseFloat(ride.price).toFixed(2) : "Free"}</td>
            <td>
                <span class="badge bg-${ride.is_active ? "success" : "danger"}">
                    ${ride.is_active ? "Active" : "Inactive"}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-primary" onclick='openEditRideModal(${ride.id}, "${ride.name}", "${ride.access_type}", ${ride.is_active}, ${ride.price || 0})'>
                    <i class="fas fa-edit"></i>
                </button>
            </td>
        </tr>
    `,
    )
    .join("")
}

// Open Edit Ride Modal
function openEditRideModal(rideId, name, accessType, isActive, price) {
  document.getElementById("editRideId").value = rideId
  document.getElementById("editRideName").value = name
  document.getElementById("editRideAccessType").value = accessType
  document.getElementById("editRideStatus").value = isActive.toString()
  document.getElementById("editRidePrice").value = price || 0

  toggleEditRidePrice()

  const bootstrap = window.bootstrap // Declare bootstrap variable
  const modal = new bootstrap.Modal(document.getElementById("editRideModal"))
  modal.show()
}

function toggleEditRidePrice() {
  const accessType = document.getElementById("editRideAccessType").value
  const priceGroup = document.getElementById("editRidePriceGroup")

  if (accessType === "paid") {
    priceGroup.style.display = "block"
  } else {
    priceGroup.style.display = "none"
  }
}

function toggleNewRidePrice() {
  const accessType = document.getElementById("newRideAccessType").value
  const priceGroup = document.getElementById("newRidePriceGroup")

  if (accessType === "paid") {
    priceGroup.style.display = "block"
  } else {
    priceGroup.style.display = "none"
  }
}

// Update Ride
async function updateRide() {
  const rideId = document.getElementById("editRideId").value
  const name = document.getElementById("editRideName").value
  const accessType = document.getElementById("editRideAccessType").value
  const isActive = document.getElementById("editRideStatus").value === "true"
  const price = document.getElementById("editRidePrice").value

  const rideData = {
    name: name,
    access_type: accessType,
    is_active: isActive,
  }

  if (accessType === "paid" && price) {
    rideData.price = Number.parseFloat(price)
  }

  const [success, response] = await callApi("PUT", `${admin_api_url}${rideId}/update_ride/`, rideData, csrf_token)

  if (success && response.success) {
    alert("Ride updated successfully!")
    const bootstrap = window.bootstrap // Declare bootstrap variable
    const modal = bootstrap.Modal.getInstance(document.getElementById("editRideModal"))
    modal.hide()
    await loadRides()
  } else {
    alert("Failed to update ride: " + (response.error || "Unknown error"))
  }
}

async function createRide() {
  const name = document.getElementById("newRideName").value
  const accessType = document.getElementById("newRideAccessType").value
  const price = document.getElementById("newRidePrice").value

  if (!name || !accessType) {
    alert("Please fill all required fields")
    return
  }

  const rideData = {
    name: name,
    access_type: accessType,
    park: PARK_ID,
  }

  if (accessType === "paid") {
    if (!price || Number.parseFloat(price) <= 0) {
      alert("Please enter a valid price for paid ride")
      return
    }
    rideData.price = Number.parseFloat(price)
  }

  const [success, response] = await callApi("POST", `${admin_api_url}create_ride/`, rideData, csrf_token)

  if (success && response.success) {
    alert("Ride created successfully!")
    const bootstrap = window.bootstrap // Declare bootstrap variable
    const modal = bootstrap.Modal.getInstance(document.getElementById("createRideModal"))
    modal.hide()
    document.getElementById("createRideForm").reset()
    document.getElementById("newRidePriceGroup").style.display = "none"
    await loadRides()
  } else {
    alert("Failed to create ride: " + (response.error || "Unknown error"))
  }
}

async function loadSellers() {
  const filterType = document.getElementById("sellerFilterType")?.value || "today"
  const today = new Date()
  let startDate, endDate

  if (filterType === "today") {
    startDate = endDate = today.toISOString().split("T")[0]
  } else if (filterType === "month") {
    startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0]
    endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0]
  } else if (filterType === "year") {
    startDate = new Date(today.getFullYear(), 0, 1).toISOString().split("T")[0]
    endDate = new Date(today.getFullYear(), 11, 31).toISOString().split("T")[0]
  } else if (filterType === "custom") {
    startDate = document.getElementById("sellerFilterStartDate")?.value
    endDate = document.getElementById("sellerFilterEndDate")?.value
  }

  let url = `${admin_api_url}external_sellers/`
  const params = new URLSearchParams()

  if (startDate) params.append("start_date", startDate)
  if (endDate) params.append("end_date", endDate)
  params.append("date_filter", filterType)

  if (params.toString()) {
    url += `?${params.toString()}`
  }

  const [success, response] = await callApi("GET", url, null, csrf_token)

  if (success && response.success) {
    renderSellersTable(response.data)
  } else {
    document.getElementById("sellersTableBody").innerHTML =
      '<tr><td colspan="5" class="text-center text-danger">Failed to load sellers</td></tr>'
  }
}

function renderSellersTable(sellers) {
  const tbody = document.getElementById("sellersTableBody")

  if (sellers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center">No sellers found</td></tr>'
    return
  }

  tbody.innerHTML = sellers
    .map(
      (seller) => `
        <tr>
            <td>${seller.name || "N/A"}</td>
            <td>${seller.contact_number}</td>
            <td>${seller.total_bookings || 0}</td>
            <td>₹${Number.parseFloat(seller.total_revenue || 0).toFixed(2)}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="openSellerBookingsModal(${seller.id}, '${seller.name}')">
                    <i class="fas fa-eye me-1"></i>View Sales
                </button>
            </td>
        </tr>
    `,
    )
    .join("")
}

// Open Seller Bookings Modal
function openSellerBookingsModal(sellerId, sellerName) {
  currentSellerId = sellerId
  document.getElementById("sellerBookingsModalTitle").textContent = `${sellerName} - Sales`
  document.getElementById("sellerDateFilter").value = "today"
  document.getElementById("sellerStartDateGroup").style.display = "none"
  document.getElementById("sellerEndDateGroup").style.display = "none"

  const bootstrap = window.bootstrap // Declare bootstrap variable
  const modal = new bootstrap.Modal(document.getElementById("sellerBookingsModal"))
  modal.show()
  loadSellerBookings()
}

// Load Seller Bookings
async function loadSellerBookings() {
  if (!currentSellerId) return

  const filterType = document.getElementById("sellerDateFilter").value
  const today = new Date()
  let startDate, endDate

  if (filterType === "today") {
    startDate = endDate = today.toISOString().split("T")[0]
  } else if (filterType === "month") {
    startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0]
    endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0]
  } else if (filterType === "year") {
    startDate = new Date(today.getFullYear(), 0, 1).toISOString().split("T")[0]
    endDate = new Date(today.getFullYear(), 11, 31).toISOString().split("T")[0]
  } else if (filterType === "custom") {
    startDate = document.getElementById("sellerStartDate").value
    endDate = document.getElementById("sellerEndDate").value
  }

  let url = `${admin_api_url}${currentSellerId}/seller_bookings/`
  const params = new URLSearchParams()
  params.append("date_filter", filterType)
  if (startDate) params.append("start_date", startDate)
  if (endDate) params.append("end_date", endDate)

  url += `?${params.toString()}`

  const [success, response] = await callApi("GET", url, null, csrf_token)

  if (success && response.success) {
    renderSellerBookingsTable(response.data)
  } else {
    document.getElementById("sellerBookingsTableBody").innerHTML =
      '<tr><td colspan="10" class="text-center text-danger">Failed to load bookings</td></tr>'
  }
}

// Render Seller Bookings Table
function renderSellerBookingsTable(bookings) {
  const tbody = document.getElementById("sellerBookingsTableBody")

  if (bookings.length === 0) {
    tbody.innerHTML = '<tr><td colspan="10" class="text-center">No bookings found</td></tr>'
    return
  }

  tbody.innerHTML = bookings
    .map(
      (booking) => `
        <tr>
            <td><input type="checkbox" class="seller-booking-checkbox" value="${booking.id}" ${booking.commission_paid ? "disabled" : ""}></td>
            <td>${booking.booking_id}</td>
            <td>${booking.customer_name || "N/A"}</td>
            <td>${booking.visit_date}</td>
            <td>${booking.num_people}</td>
            <td>₹${Number.parseFloat(booking.total_amount).toFixed(2)}</td>
            <td>₹${Number.parseFloat(booking.commission_amount || 0).toFixed(2)}</td>
            <td>${new Date(booking.created_at).toLocaleDateString()}</td>
            <td>
                <span class="badge bg-${booking.commission_paid ? "success" : "warning"}">
                    ${booking.commission_paid ? "Paid" : "Pending"}
                </span>
            </td>
            <td>
                ${!booking.commission_paid
          ? `<button class="btn btn-sm btn-success" onclick="markSingleCommissionPaid(${booking.id})">
                    <i class="fas fa-check"></i> Pay
                </button>`
          : '<span class="text-success"><i class="fas fa-check-circle"></i></span>'
        }
            </td>
        </tr>
    `,
    )
    .join("")
}

async function loadCashCounters() {
  const filterType = document.getElementById("cashCounterFilterType")?.value || "today"
  const today = new Date()
  let startDate, endDate

  if (filterType === "today") {
    startDate = endDate = today.toISOString().split("T")[0]
  } else if (filterType === "month") {
    startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0]
    endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0]
  } else if (filterType === "year") {
    startDate = new Date(today.getFullYear(), 0, 1).toISOString().split("T")[0]
    endDate = new Date(today.getFullYear(), 11, 31).toISOString().split("T")[0]
  } else if (filterType === "custom") {
    startDate = document.getElementById("cashCounterFilterStartDate")?.value
    endDate = document.getElementById("cashCounterFilterEndDate")?.value
  }

  let url = `${admin_api_url}cash_counters/`
  const params = new URLSearchParams()

  if (startDate) params.append("start_date", startDate)
  if (endDate) params.append("end_date", endDate)
  params.append("date_filter", filterType)

  if (params.toString()) {
    url += `?${params.toString()}`
  }

  const [success, response] = await callApi("GET", url, null, csrf_token)

  if (success && response.success) {
    renderCashCountersTable(response.data)
  } else {
    document.getElementById("cashCountersTableBody").innerHTML =
      '<tr><td colspan="4" class="text-center text-danger">Failed to load cash counters</td></tr>'
  }
}

function renderCashCountersTable(cashCounters) {
  const tbody = document.getElementById("cashCountersTableBody")

  if (cashCounters.length === 0) {
    tbody.innerHTML = '<tr><td colspan="4" class="text-center">No cash counters found</td></tr>'
    return
  }

  tbody.innerHTML = cashCounters
    .map(
      (counter) => `
        <tr>
            <td>${counter.name || "N/A"}</td>
            <td>${counter.contact_number}</td>
            <td>${counter.total_bookings || 0}</td>
            <td>
                <button class="btn btn-sm btn-primary" onclick="openCashCounterBookingsModal(${counter.id}, '${counter.name}')">
                    <i class="fas fa-eye me-1"></i>View Sales
                </button>
            </td>
        </tr>
    `,
    )
    .join("")
}

// Open Cash Counter Bookings Modal
function openCashCounterBookingsModal(counterId, counterName) {
  currentCashCounterId = counterId
  document.getElementById("cashCounterBookingsModalTitle").textContent = `${counterName} - Sales`
  document.getElementById("cashCounterDateFilter").value = "today"
  document.getElementById("cashCounterStartDateGroup").style.display = "none"
  document.getElementById("cashCounterEndDateGroup").style.display = "none"

  const bootstrap = window.bootstrap // Declare bootstrap variable
  const modal = new bootstrap.Modal(document.getElementById("cashCounterBookingsModal"))
  modal.show()
  loadCashCounterBookings()
}

// Load Cash Counter Bookings
async function loadCashCounterBookings() {
  if (!currentCashCounterId) return

  const filterType = document.getElementById("cashCounterDateFilter").value
  const today = new Date()
  let startDate, endDate

  if (filterType === "today") {
    startDate = endDate = today.toISOString().split("T")[0]
  } else if (filterType === "month") {
    startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0]
    endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0]
  } else if (filterType === "year") {
    startDate = new Date(today.getFullYear(), 0, 1).toISOString().split("T")[0]
    endDate = new Date(today.getFullYear(), 11, 31).toISOString().split("T")[0]
  } else if (filterType === "custom") {
    startDate = document.getElementById("cashCounterStartDate").value
    endDate = document.getElementById("cashCounterEndDate").value
  }

  let url = `${admin_api_url}${currentCashCounterId}/cash_counter_bookings/`
  const params = new URLSearchParams()
  params.append("date_filter", filterType)
  if (startDate) params.append("start_date", startDate)
  if (endDate) params.append("end_date", endDate)

  url += `?${params.toString()}`

  const [success, response] = await callApi("GET", url, null, csrf_token)

  if (success && response.success) {
    renderCashCounterBookingsTable(response.data)
  } else {
    document.getElementById("cashCounterBookingsTableBody").innerHTML =
      '<tr><td colspan="9" class="text-center text-danger">Failed to load bookings</td></tr>'
  }
}

// Render Cash Counter Bookings Table
function renderCashCounterBookingsTable(bookings) {
  const tbody = document.getElementById("cashCounterBookingsTableBody")

  if (bookings.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center">No bookings found</td></tr>'
    return
  }

  tbody.innerHTML = bookings
    .map(
      (booking) => `
        <tr>
            <td><input type="checkbox" class="cash-counter-booking-checkbox" value="${booking.id}" ${booking.sale_confirmed ? "disabled" : ""}></td>
            <td>${booking.booking_id}</td>
            <td>${booking.customer_name || "N/A"}</td>
            <td>${booking.visit_date}</td>
            <td>${booking.num_people}</td>
            <td>₹${Number.parseFloat(booking.total_amount).toFixed(2)}</td>
            <td>${new Date(booking.created_at).toLocaleDateString()}</td>
            <td>
                <span class="badge bg-${booking.sale_confirmed ? "success" : "warning"}">
                    ${booking.sale_confirmed ? "Confirmed" : "Pending"}
                </span>
            </td>
            <td>
                ${!booking.sale_confirmed
          ? `<button class="btn btn-sm btn-success" onclick="markSingleSaleConfirmed(${booking.id})">
                    <i class="fas fa-check"></i> Confirm
                </button>`
          : '<span class="text-success"><i class="fas fa-check-circle"></i></span>'
        }
            </td>
        </tr>
    `,
    )
    .join("")
}

// Confirm Seller Payment
async function confirmSellerPayment() {
  await markAllSellerCommissionPaid()
}

// Confirm Cash Counter Payment
async function confirmCashCounterPayment() {
  await markAllCashCounterSaleConfirmed()
}

function toggleAllSellerCheckboxes() {
  const selectAll = document.getElementById("selectAllSeller")
  const checkboxes = document.querySelectorAll(".seller-booking-checkbox:not(:disabled)")
  checkboxes.forEach((checkbox) => {
    checkbox.checked = selectAll.checked
  })
}

function toggleAllCashCounterCheckboxes() {
  const selectAll = document.getElementById("selectAllCashCounter")
  const checkboxes = document.querySelectorAll(".cash-counter-booking-checkbox:not(:disabled)")
  checkboxes.forEach((checkbox) => {
    checkbox.checked = selectAll.checked
  })
}

async function markSingleCommissionPaid(bookingId) {
  const confirmed = confirm("Mark this commission as paid?")
  if (!confirmed) return

  await markCommissionPaid([bookingId])
}

async function markAllSellerCommissionPaid() {
  const checkboxes = document.querySelectorAll(".seller-booking-checkbox:checked")
  const bookingIds = Array.from(checkboxes).map((cb) => Number.parseInt(cb.value))

  if (bookingIds.length === 0) {
    alert("Please select at least one booking")
    return
  }

  const confirmed = confirm(`Mark ${bookingIds.length} commission(s) as paid?`)
  if (!confirmed) return

  await markCommissionPaid(bookingIds)
}

async function markCommissionPaid(bookingIds) {
  const [success, response] = await callApi(
    "POST",
    `${admin_api_url}mark_commission_paid/`,
    {
      booking_ids: bookingIds,
    },
    csrf_token,
  )

  if (success && response.success) {
    alert(response.data.message || "Commission marked as paid successfully!")
    await loadSellerBookings()
  } else {
    alert("Failed to mark commission as paid: " + (response.error || "Unknown error"))
  }
}

async function markSingleSaleConfirmed(bookingId) {
  const confirmed = confirm("Mark this sale as confirmed?")
  if (!confirmed) return

  await markSaleConfirmed([bookingId])
}

async function markAllCashCounterSaleConfirmed() {
  const checkboxes = document.querySelectorAll(".cash-counter-booking-checkbox:checked")
  const bookingIds = Array.from(checkboxes).map((cb) => Number.parseInt(cb.value))

  if (bookingIds.length === 0) {
    alert("Please select at least one booking")
    return
  }

  const confirmed = confirm(`Mark ${bookingIds.length} sale(s) as confirmed?`)
  if (!confirmed) return

  await markSaleConfirmed(bookingIds)
}

async function markSaleConfirmed(bookingIds) {
  const [success, response] = await callApi(
    "POST",
    `${admin_api_url}mark_sale_confirmed/`,
    {
      booking_ids: bookingIds,
    },
    csrf_token,
  )

  if (success && response.success) {
    alert(response.data.message || "Sale marked as confirmed successfully!")
    await loadCashCounterBookings()
  } else {
    alert("Failed to mark sale as confirmed: " + (response.error || "Unknown error"))
  }
}

function toggleSellerFilterDates() {
  const filterType = document.getElementById("sellerFilterType").value
  const startDateGroup = document.getElementById("sellerFilterStartDateGroup")
  const endDateGroup = document.getElementById("sellerFilterEndDateGroup")

  if (filterType === "custom") {
    startDateGroup.style.display = "block"
    endDateGroup.style.display = "block"
  } else {
    startDateGroup.style.display = "none"
    endDateGroup.style.display = "none"
  }
}

function toggleCashCounterFilterDates() {
  const filterType = document.getElementById("cashCounterFilterType").value
  const startDateGroup = document.getElementById("cashCounterFilterStartDateGroup")
  const endDateGroup = document.getElementById("cashCounterFilterEndDateGroup")

  if (filterType === "custom") {
    startDateGroup.style.display = "block"
    endDateGroup.style.display = "block"
  } else {
    startDateGroup.style.display = "none"
    endDateGroup.style.display = "none"
  }
}

function toggleSellerCustomDates() {
  const filterType = document.getElementById("sellerDateFilter").value
  const startDateGroup = document.getElementById("sellerStartDateGroup")
  const endDateGroup = document.getElementById("sellerEndDateGroup")

  if (filterType === "custom") {
    startDateGroup.style.display = "block"
    endDateGroup.style.display = "block"
  } else {
    startDateGroup.style.display = "none"
    endDateGroup.style.display = "none"
  }
}

function toggleCashCounterCustomDates() {
  const filterType = document.getElementById("cashCounterDateFilter").value
  const startDateGroup = document.getElementById("cashCounterStartDateGroup")
  const endDateGroup = document.getElementById("cashCounterEndDateGroup")

  if (filterType === "custom") {
    startDateGroup.style.display = "block"
    endDateGroup.style.display = "block"
  } else {
    startDateGroup.style.display = "none"
    endDateGroup.style.display = "none"
  }
}

async function loadAddOns() {
  const startDate = document.getElementById("addonStartDate").value
  const endDate = document.getElementById("addonEndDate").value
  const search = document.getElementById("addonSearch").value

  let url = `${admin_api_url}addons/`
  const params = new URLSearchParams()

  if (startDate) params.append("start_date", startDate)
  if (endDate) params.append("end_date", endDate)
  if (search) params.append("search", search)

  if (params.toString()) {
    url += `?${params.toString()}`
  }

  const [success, response] = await callApi("GET", url, null, csrf_token)

  if (success && response.success) {
    renderAddOnsTable(response.data)
  } else {
    document.getElementById("addonsTableBody").innerHTML =
      '<tr><td colspan="11" class="text-center text-danger">Failed to load add-ons</td></tr>'
  }
}

function renderAddOnsTable(addons) {
  const tbody = document.getElementById("addonsTableBody")

  if (addons.length === 0) {
    tbody.innerHTML = '<tr><td colspan="11" class="text-center">No add-ons found</td></tr>'
    return
  }

  tbody.innerHTML = addons
    .map(
      (addon) => `
        <tr>
            <td>${addon.addon_id}</td>
            <td>${addon.booking_id}</td>
            <td>${addon.customer_name || "N/A"}</td>
            <td>${addon.ride_name}</td>
            <td>${addon.additional_entries}</td>
            <td>₹${Number.parseFloat(addon.price_per_entry).toFixed(2)}</td>
            <td>₹${Number.parseFloat(addon.total_amount).toFixed(2)}</td>
            <td><span class="badge bg-info">${addon.source}</span></td>
            <td>${addon.sold_by_name || "N/A"}</td>
            <td>
                <span class="badge bg-${addon.payment_status === "success" ? "success" : addon.payment_status === "pending" ? "warning" : "danger"}">
                    ${addon.payment_status}
                </span>
            </td>
            <td>${new Date(addon.created_at).toLocaleDateString()}</td>
        </tr>
    `,
    )
    .join("")
}

async function viewBookingDetails(bookingId) {
  try {
    // Fetch detailed booking information
    const [success, response] = await callApi("GET", `${admin_api_url}${bookingId}/details/`, null, csrf_token)

    if (success && response.success) {
      const data = response.data

      // Customer Information
      document.getElementById("detailCustomerName").textContent = data.customer_name || "N/A"
      document.getElementById("detailCustomerContact").textContent = data.customer_contact || "N/A"
      document.getElementById("detailCustomerEmail").textContent = data.customer_email || "N/A"

      // Booking Information
      document.getElementById("detailBookingId").textContent = data.booking_id
      document.getElementById("detailVisitDate").textContent = data.visit_date
      document.getElementById("detailNumPeople").textContent = data.num_people
      document.getElementById("detailCreatedAt").textContent = new Date(data.created_at).toLocaleString()

      // Payment Information
      document.getElementById("detailTotalAmount").textContent = `₹${Number.parseFloat(data.total_amount).toFixed(2)}`
      document.getElementById("detailPaymentStatus").innerHTML =
        `<span class="badge bg-${data.payment_status === "success" ? "success" : data.payment_status === "pending" ? "warning" : "danger"}">${data.payment_status}</span>`
      document.getElementById("detailPaymentMethod").textContent = data.payment_method || "N/A"
      document.getElementById("detailSoldFrom").textContent = data.sold_from || "N/A"
      document.getElementById("detailSoldBy").textContent = data.sold_by_name || "Direct"

      // Commission (if applicable)
      if (data.commission_amount && Number.parseFloat(data.commission_amount) > 0) {
        document.getElementById("detailCommissionRow").style.display = "table-row"
        document.getElementById("detailCommission").textContent =
          `₹${Number.parseFloat(data.commission_amount).toFixed(2)}`
      } else {
        document.getElementById("detailCommissionRow").style.display = "none"
      }

      // Status Information
      document.getElementById("detailCheckedIn").innerHTML =
        `<span class="badge bg-${data.checked_in ? "success" : "secondary"}">${data.checked_in ? "Yes" : "No"}</span>`

      if (data.checked_in && data.checked_in_at) {
        document.getElementById("detailCheckedInTimeRow").style.display = "table-row"
        document.getElementById("detailCheckedInTime").textContent = new Date(data.checked_in_at).toLocaleString()
      } else {
        document.getElementById("detailCheckedInTimeRow").style.display = "none"
      }

      // Commission Paid (for sellers)
      if (data.sold_by_role === "seller") {
        document.getElementById("detailCommissionPaidRow").style.display = "table-row"
        document.getElementById("detailCommissionPaid").innerHTML =
          `<span class="badge bg-${data.commission_paid ? "success" : "warning"}">${data.commission_paid ? "Yes" : "No"}</span>`
      } else {
        document.getElementById("detailCommissionPaidRow").style.display = "none"
      }

      // Sale Confirmed (for cash counters)
      if (data.sold_by_role === "cash_counter") {
        document.getElementById("detailSaleConfirmedRow").style.display = "table-row"
        document.getElementById("detailSaleConfirmed").innerHTML =
          `<span class="badge bg-${data.sale_confirmed ? "success" : "warning"}">${data.sale_confirmed ? "Yes" : "No"}</span>`
      } else {
        document.getElementById("detailSaleConfirmedRow").style.display = "none"
      }

      // Socks Distribution
      document.getElementById("detailSocksTotal").textContent = data.socks_collected || 0
      document.getElementById("detailSocksSmall").textContent = data.socks_small || 0
      document.getElementById("detailSocksMedium").textContent = data.socks_medium || 0
      document.getElementById("detailSocksLarge").textContent = data.socks_large || 0
      document.getElementById("detailSocksXL").textContent = data.socks_xlarge || 0

      // Ride Access
      const rideAccessBody = document.getElementById("detailRideAccessBody")
      if (data.ride_access && data.ride_access.length > 0) {
        rideAccessBody.innerHTML = data.ride_access
          .map(
            (ride) => `
            <tr>
              <td>${ride.ride_name}</td>
              <td><span class="badge bg-${ride.access_type === "free" ? "success" : "warning"}">${ride.access_type}</span></td>
              <td>${ride.total_allowed}</td>
              <td>${ride.used_count}</td>
              <td><strong>${ride.total_allowed - ride.used_count}</strong></td>
            </tr>
          `,
          )
          .join("")
      } else {
        rideAccessBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No ride access found</td></tr>'
      }

      // Add-Ons
      const addOnsBody = document.getElementById("detailAddOnsBody")
      if (data.addons && data.addons.length > 0) {
        addOnsBody.innerHTML = data.addons
          .map(
            (addon) => `
            <tr>
              <td>${addon.addon_id}</td>
              <td>${addon.ride_name}</td>
              <td>${addon.additional_entries}</td>
              <td>₹${Number.parseFloat(addon.price_per_entry).toFixed(2)}</td>
              <td>₹${Number.parseFloat(addon.total_amount).toFixed(2)}</td>
              <td><span class="badge bg-info">${addon.source}</span></td>
              <td>${new Date(addon.created_at).toLocaleDateString()}</td>
            </tr>
          `,
          )
          .join("")
      } else {
        addOnsBody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No add-ons purchased</td></tr>'
      }

      // Show modal
      document.getElementById("bookingDetailsModalTitle").textContent = `Booking Details - ${data.booking_id}`
      const bootstrap = window.bootstrap
      const modal = new bootstrap.Modal(document.getElementById("bookingDetailsModal"))
      modal.show()
    } else {
      alert("Failed to load booking details: " + (response.error || "Unknown error"))
    }
  } catch (error) {
    console.error("[v0] Error loading booking details:", error)
    alert("An error occurred while loading booking details")
  }
}

// ===================== INVITE PRE-BOOKINGS FUNCTIONS =====================

// Load Invite Pre-Bookings with Filters
async function loadInvitePreBookings() {
  const statusFilter = document.getElementById("inviteStatus")?.value || ""
  const approvalStatusFilter = document.getElementById("inviteApprovalStatus")?.value || ""
  const search = document.getElementById("inviteSearch")?.value || ""

  let url = `${prebooking_api_url}?is_invite=true`
  const params = new URLSearchParams()

  if (statusFilter) params.append("status", statusFilter)
  if (approvalStatusFilter) params.append("approval_status", approvalStatusFilter)
  if (search) params.append("search", search)

  if (params.toString()) {
    url += `&${params.toString()}`
  }

  const [success, response] = await callApi("GET", url, null, csrf_token)

  if (success && response.success) {
    renderInvitePreBookingsTable(response.data)
  } else {
    document.getElementById("invitePreBookingsTableBody").innerHTML =
      '<tr><td colspan="9" class="text-center text-danger">Failed to load invite pre-bookings</td></tr>'
  }
}

// Render Invite Pre-Bookings Table
function renderInvitePreBookingsTable(prebookings) {
  const tbody = document.getElementById("invitePreBookingsTableBody")

  if (prebookings.length === 0) {
    tbody.innerHTML = '<tr><td colspan="9" class="text-center">No invite pre-bookings found</td></tr>'
    return
  }
  // <td>₹${pb.approved_amount !== null ? pb.approved_amount.toFixed(2) : '-'}</td>
  tbody.innerHTML = prebookings
    .map(
      (pb) => `
        <tr>
            <td>${pb.prebooking_id}</td>
            <td>${pb.customer_name || "N/A"}</td>
            <td>${pb.customer_number || "N/A"}</td>
            <td>${pb.visit_date}</td>
            <td>${pb.num_people}</td>
            <td><span class="badge bg-secondary">${pb.status}</span></td>
            <td><span class="badge ${getApprovalBadgeClass(pb.approval_status)}">${pb.approval_status}</span></td>            
            <td>₹${pb.approved_amount !== null ? pb.approved_amount : '-'}</td>
            <td>
                <button class="btn btn-sm btn-info" onclick="viewInvitePreBookingDetails(${pb.id})">
                    <i class="fas fa-eye"></i>
                </button>
            </td>
        </tr>
      `
    )
    .join("")
}

// Get badge class for approval status
function getApprovalBadgeClass(status) {
  console.log("Determining badge class for approval status:", status)
  switch (status) {
    case "approved":
      return "bg-success"
    case "rejected":
      return "bg-danger"
    case "pending":
      return "bg-warning text-dark"
    default:
      return "bg-secondary"
  }
}

// View Invite Pre-Booking Details
async function viewInvitePreBookingDetails(prebookingId) {
  try {
    const [success, response] = await callApi(
      "GET",
      `${prebooking_api_url}${prebookingId}/`,
      null,
      csrf_token
    )

    if (success && response.success) {
      const pb = response.data

      // Populate detail fields      
      document.getElementById("inviteDetailCustomerName").textContent = pb.customer_name
      document.getElementById("inviteDetailCustomerNumber").textContent = pb.customer_number
      document.getElementById("inviteDetailNumPeople").textContent = pb.num_people
      document.getElementById("inviteDetailVisitDate").textContent = pb.visit_date
      document.getElementById("inviteDetailReference").textContent = pb.reference || "-"
      document.getElementById("inviteDetailOtherReference").textContent = pb.other_reference || "-"
      document.getElementById("inviteDetailCreatedAt").textContent = new Date(pb.created_at).toLocaleDateString()

      // Populate approval fields
      document.getElementById("inviteDetailStatus").textContent = pb.status
      document.getElementById("inviteDetailStatus").className = `badge bg-secondary`

      document.getElementById("inviteDetailApprovalStatus").textContent = pb.approval_status
      document.getElementById("inviteDetailApprovalStatus").className = `badge ${getApprovalBadgeClass(pb.approval_status)}`

      document.getElementById("inviteDetailApprovedAmount").textContent =
        pb.approved_amount !== null ? `₹${pb.approved_amount}` : "-"
      document.getElementById("inviteDetailApprovedBy").textContent = pb.approved_by_name || "-"
      document.getElementById("inviteDetailApprovedAt").textContent =
        pb.approved_at ? new Date(pb.approved_at).toLocaleDateString() : "-"
      document.getElementById("inviteDetailRejectionReason").textContent = pb.rejection_reason || "-"

      // Store ID for later use
      document.getElementById("invitePreBookingDetailModal").dataset.prebookingId = prebookingId

      // Show/hide approval form based on approval status
      const approvalFormContainer = document.getElementById("inviteApprovalFormContainer")
      const confirmationFormContainer = document.getElementById("inviteConfirmationFormContainer")

      if (pb.approval_status === "pending") {
        approvalFormContainer.style.display = "block"
        confirmationFormContainer.style.display = "none"
        document.getElementById("inviteApprovedAmountInput").value = ""
      } else if (pb.approval_status === "approved" && pb.status === "approved") {
        approvalFormContainer.style.display = "none"
        confirmationFormContainer.style.display = "block"
      } else {
        approvalFormContainer.style.display = "none"
        confirmationFormContainer.style.display = "none"
      }

      const modal = new bootstrap.Modal(document.getElementById("invitePreBookingDetailModal"))
      modal.show()
    } else {
      alert("Failed to load invite pre-booking details: " + (response.error || "Unknown error"))
    }
  } catch (error) {
    console.error("[v0] Error loading invite pre-booking details:", error)
    alert("An error occurred while loading invite pre-booking details")
  }
}

// Approve Invite Pre-Booking
async function approveInvitePreBooking() {
  const prebookingId = document.getElementById("invitePreBookingDetailModal").dataset.prebookingId
  const approvedAmount = document.getElementById("inviteApprovedAmountInput").value

  if (!approvedAmount || isNaN(approvedAmount)) {
    alert("Please enter a valid approved amount")
    return
  }

  try {
    const [success, response] = await callApi(
      "POST",
      `${prebooking_api_url}${prebookingId}/approve_invite/`,
      { approved_amount: parseFloat(approvedAmount) },
      csrf_token
    )

    if (success && response.success) {
      alert("Invite pre-booking approved successfully!")
      bootstrap.Modal.getInstance(document.getElementById("invitePreBookingDetailModal")).hide()
      await loadInvitePreBookings()
    } else {
      alert("Failed to approve: " + (response.error || "Unknown error"))
    }
  } catch (error) {
    console.error("[v0] Error approving invite pre-booking:", error)
    alert("An error occurred while approving the invite pre-booking")
  }
}

// Reject Invite Pre-Booking
async function rejectInvitePreBooking() {
  const prebookingId = document.getElementById("invitePreBookingDetailModal").dataset.prebookingId
  const rejectionReason = document.getElementById("inviteRejectionReason").value

  if (!rejectionReason) {
    alert("Please enter a rejection reason")
    return
  }

  try {
    const [success, response] = await callApi(
      "POST",
      `${prebooking_api_url}${prebookingId}/reject_invite/`,
      { rejection_reason: rejectionReason },
      csrf_token
    )

    if (success && response.success) {
      alert("Invite pre-booking rejected successfully!")
      bootstrap.Modal.getInstance(document.getElementById("inviteRejectModal")).hide()
      bootstrap.Modal.getInstance(document.getElementById("invitePreBookingDetailModal")).hide()
      await loadInvitePreBookings()
    } else {
      alert("Failed to reject: " + (response.error || "Unknown error"))
    }
  } catch (error) {
    console.error("[v0] Error rejecting invite pre-booking:", error)
    alert("An error occurred while rejecting the invite pre-booking")
  }
}

// Confirm and Create Booking from Invite Pre-Booking
async function confirmInvitePreBooking() {
  const prebookingId = document.getElementById("invitePreBookingDetailModal").dataset.prebookingId

  try {
    const [success, response] = await callApi(
      "POST",
      `${prebooking_api_url}${prebookingId}/confirm/`,
      { payment_method: "cash" },
      csrf_token
    )

    if (success && response.success) {
      alert("Invite pre-booking confirmed and booking created successfully!")
      bootstrap.Modal.getInstance(document.getElementById("invitePreBookingDetailModal")).hide()
      await loadInvitePreBookings()
    } else {
      alert("Failed to confirm: " + (response.error || "Unknown error"))
    }
  } catch (error) {
    console.error("[v0] Error confirming invite pre-booking:", error)
    alert("An error occurred while confirming the invite pre-booking")
  }
}
