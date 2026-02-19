// Pre-Booking Dashboard State
let prebooking_api_url = null
let csrf_token = null
const PARK_ID = 1 // Static park ID for now

// Initialize Pre-Booking Dashboard
async function initPrebooking(prebooking_url, csrf) {
  prebooking_api_url = prebooking_url
  csrf_token = csrf

  await loadPrebookingStats()
  await searchPrebookings()
  setupPrebookingEventListeners()
  toggle_loader()
}

// Setup Event Listeners
function setupPrebookingEventListeners() {
  // Create form
  document.getElementById("createPrebookingForm").addEventListener("submit", createPrebooking)

  // Confirm form
  document.getElementById("confirmPrebookingForm").addEventListener("submit", async (e) => {
    e.preventDefault()
    const prebookingId = document.getElementById("confirmPrebookingForm").dataset.prebookingId
    await confirmPrebooking(prebookingId)
  })

  // Set minimum date to today
  const today = new Date().toISOString().split("T")[0]
  document.getElementById("prebookingVisitDate").setAttribute("min", today)
  document.getElementById("prebookingVisitDate").value = today
}

// Load Pre-Booking Statistics
async function loadPrebookingStats() {
  const [success, response] = await callApi("GET", prebooking_api_url, null, csrf_token)

  if (success && response.success) {
    const data = response.data

    // Calculate stats
    const total = data.length
    const confirmed = data.filter(pb => pb.status === "confirmed").length
    const pending = data.filter(pb => pb.status === "pending").length
    const cancelled = data.filter(pb => pb.status === "cancelled").length

    // Update UI
    const firstItem = data[0]
    if (firstItem) {
      document.getElementById("userName").textContent = firstItem.confirmed_by_name || "Admin"
    }
    document.getElementById("userRole").textContent = "Pre-Booker"

    document.getElementById("totalPrebookings").textContent = total
    document.getElementById("confirmedPrebookings").textContent = confirmed
    document.getElementById("pendingPrebookings").textContent = pending
    document.getElementById("cancelledPrebookings").textContent = cancelled
  } else {
    console.error("Failed to load pre-booking stats:", response?.error)
  }
}

// Search Pre-Bookings
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
    console.error("Failed to load pre-bookings:", response?.error)
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
    tbody.innerHTML = '<tr><td colspan="10" class="text-center">No pre-bookings found</td></tr>'
    return
  }

  tbody.innerHTML = prebookings
    .map((pb) => {
      let actionButtons = ""
      
      // For approved invite pre-bookings, show confirmation button
      if (pb.is_an_invite && pb.approval_status === "approved" && pb.status === "approved") {
        actionButtons = `
          <button class="btn btn-sm btn-success" onclick="confirmApprovedPreBooking(${pb.id}, '${pb.prebooking_id}', '${pb.customer_name}')">
            <i class="fas fa-check me-1"></i>Confirm
          </button>
          <button class="btn btn-sm btn-info" onclick="viewApprovalStatus(${pb.id})">
            <i class="fas fa-info-circle me-1"></i>Status
          </button>
        `
      }
      // For pending non-invite pre-bookings, show confirm and cancel
      else if (!pb.is_an_invite && pb.status === "pending") {
        actionButtons = `
          <button class="btn btn-sm btn-success" onclick="openConfirmPrebookingModal(${pb.id}, '${pb.prebooking_id}', '${pb.customer_name}', ${pb.num_people}, '${pb.visit_date}')">
            <i class="fas fa-check me-1"></i>Confirm
          </button>
          <button class="btn btn-sm btn-danger" onclick="cancelPrebooking(${pb.id})">
            <i class="fas fa-times me-1"></i>Cancel
          </button>
        `
      }
      // For pending invite pre-bookings, show status view
      else if (pb.is_an_invite && pb.approval_status === "pending") {
        actionButtons = `
          <button class="btn btn-sm btn-info" onclick="viewApprovalStatus(${pb.id})">
            <i class="fas fa-clock me-1"></i>Pending
          </button>
        `
      }
      // For rejected invite pre-bookings, show status view
      else if (pb.is_an_invite && pb.approval_status === "rejected") {
        actionButtons = `
          <button class="btn btn-sm btn-danger" onclick="viewApprovalStatus(${pb.id})">
            <i class="fas fa-times-circle me-1"></i>Rejected
          </button>
        `
      }
      // For confirmed pre-bookings, show badge
      else {
        actionButtons = `<span class="badge bg-${pb.status === "confirmed" ? "success" : "danger"}">${pb.status}</span>`
      }

      return `
            <tr>
                <td><strong>${pb.prebooking_id}</strong></td>
                <td>${pb.customer_name}</td>
                <td>${pb.customer_number}</td>
                <td>${pb.num_people}</td>
                <td>${new Date(pb.visit_date).toLocaleDateString()}</td>
                <td><span class="badge bg-${pb.status === "pending" || pb.status === "approved" ? "warning" : pb.status === "confirmed" ? "success" : "danger"}">${pb.status}</span></td>
                <td><span class="badge bg-${pb.approval_status === "pending" ? "secondary" : pb.approval_status === "approved" ? "success" : "danger"}">${pb.approval_status}</span></td>
                <td>${pb.approved_amount !== null ? `₹${pb.approved_amount}` : '-'}</td>
                <td>${new Date(pb.created_at).toLocaleDateString()}</td>
                <td>${actionButtons}</td>
            </tr>
        `
    })
    .join("")
}

// Create Pre-Booking
async function createPrebooking(e) {
  e.preventDefault()

  const name = document.getElementById("prebookingName").value.trim()
  const phone = document.getElementById("prebookingPhone").value.trim()
  const numPeople = parseInt(document.getElementById("prebookingPeople").value)
  const visitDate = document.getElementById("prebookingVisitDate").value
  const reference = document.getElementById("prebookingReference").value
  const otherReference = document.getElementById("otherPrebookingReference").value || null
  const notes = document.getElementById("prebookingNotes").value || null

  if (!name || !phone || !numPeople || !visitDate) {
    alert("Please fill all required fields")
    return
  }

  const prebookingData = {
    park: PARK_ID,
    customer_name: name,
    customer_number: phone,
    num_people: numPeople,
    visit_date: visitDate,
    notes: notes,
    status: "pending",
    is_an_invite: true, // Mark as invite pre-booking
    reference: reference,
    other_reference: otherReference
  }

  const btn = document.getElementById("createPrebookingBtn")
  btn.disabled = true
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Creating...'

  const [success, response] = await callApi("POST", prebooking_api_url, prebookingData, csrf_token)

  btn.disabled = false
  btn.innerHTML = '<i class="fas fa-save me-2"></i>Create Pre-Booking'

  if (success && response.success) {
    alert(`Pre-booking created successfully!\nPre-Booking ID: ${response.data.prebooking_id}`)
    document.getElementById("createPrebookingForm").reset()
    document.getElementById("prebookingVisitDate").value = new Date().toISOString().split("T")[0]
    await searchPrebookings()
    await loadPrebookingStats()
  } else {
    alert("Failed to create pre-booking: " + (response?.error || "Unknown error"))
  }
}

// Open Confirm Modal
function openConfirmPrebookingModal(prebookingId, prebookingCode, customerName, numPeople, visitDate) {
  const modal = document.getElementById("confirmPrebookingModal")
  if (!modal) {
    alert("Modal not found. Please contact support.")
    return
  }

  document.getElementById("confirmPrebookingCode").textContent = prebookingCode
  document.getElementById("confirmPrebookingCustomer").textContent = customerName
  document.getElementById("confirmPrebookingPeople").textContent = numPeople
  document.getElementById("confirmPrebookingDate").textContent = new Date(visitDate).toLocaleDateString()

  document.getElementById("confirmPrebookingForm").dataset.prebookingId = prebookingId
  modal.style.display = "block"
}

function closeConfirmPrebookingModal() {
  const modal = document.getElementById("confirmPrebookingModal")
  if (modal) {
    modal.style.display = "none"
  }
}

// Confirm Pre-Booking
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

  const btn = document.getElementById("confirmPrebookingSubmitBtn")
  btn.disabled = true
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Processing...'

  const [success, response] = await callApi("POST", `${prebooking_api_url}${prebookingId}/confirm/`, confirmData, csrf_token)

  btn.disabled = false
  btn.innerHTML = '<i class="fas fa-check me-2"></i>Confirm & Create Booking'

  if (success && response.success) {
    alert(`Pre-booking confirmed! Booking ID: ${response.data.booking.booking_id}`)
    closeConfirmPrebookingModal()
    document.getElementById("confirmPrebookingForm").reset()
    await searchPrebookings()
    await loadPrebookingStats()
  } else {
    alert("Failed to confirm pre-booking: " + (response?.error || "Unknown error"))
  }
}

// Cancel Pre-Booking
async function cancelPrebooking(prebookingId) {
  if (!confirm("Are you sure you want to cancel this pre-booking?")) {
    return
  }

  const [success, response] = await callApi("POST", `${prebooking_api_url}${prebookingId}/cancel/`, {}, csrf_token)

  if (success && response.success) {
    alert("Pre-booking cancelled successfully")
    await searchPrebookings()
    await loadPrebookingStats()
  } else {
    alert("Failed to cancel pre-booking: " + (response?.error || "Unknown error"))
  }
}

// ===================== INVITE PRE-BOOKING APPROVAL FUNCTIONS =====================

// View Approval Status of Invite Pre-Booking
async function viewApprovalStatus(prebookingId) {
  try {
    const [success, response] = await callApi(
      "GET",
      `${prebooking_api_url}${prebookingId}/`,
      null,
      csrf_token
    )

    if (success && response.success) {
      const pb = response.data

      // Populate modal fields
      document.getElementById("approvalStatusCode").textContent = pb.prebooking_id
      document.getElementById("approvalStatusCustomer").textContent = pb.customer_name

      document.getElementById("approvalStatusBadge").textContent = pb.status
      document.getElementById("approvalStatusBadge").className = `badge bg-${pb.status === "pending" || pb.status === "approved" ? "warning" : pb.status === "confirmed" ? "success" : "danger"}`

      document.getElementById("approvalApprovalStatusBadge").textContent = pb.approval_status
      document.getElementById("approvalApprovalStatusBadge").className = `badge bg-${pb.approval_status === "pending" ? "secondary" : pb.approval_status === "approved" ? "success" : "danger"}`

      document.getElementById("approvalStatusAmount").textContent = 
        pb.approved_amount !== null ? `₹${pb.approved_amount}` : "-"
      document.getElementById("approvalStatusApprovedBy").textContent = pb.approved_by_name || "-"
      document.getElementById("approvalStatusApprovedAt").textContent = 
        pb.approved_at ? new Date(pb.approved_at).toLocaleDateString() : "-"

      // Show/hide rejection reason
      const rejectionReasonRow = document.getElementById("rejectionReasonRow")
      if (pb.approval_status === "rejected" && pb.rejection_reason) {
        rejectionReasonRow.style.display = "table-row"
        document.getElementById("approvalStatusRejectionReason").textContent = pb.rejection_reason
      } else {
        rejectionReasonRow.style.display = "none"
      }

      // Show confirmation prompt only if approved
      const confirmationPrompt = document.getElementById("confirmationPrompt")
      if (pb.approval_status === "approved" && pb.status === "approved") {
        confirmationPrompt.style.display = "block"
        // Store prebooking ID for confirmation
        document.getElementById("viewApprovalStatusModal").dataset.prebookingId = prebookingId
      } else {
        confirmationPrompt.style.display = "none"
      }

      // Show the modal
      document.getElementById("viewApprovalStatusModal").style.display = "block"
    } else {
      alert("Failed to load approval status: " + (response?.error || "Unknown error"))
    }
  } catch (error) {
    console.error("[v0] Error viewing approval status:", error)
    alert("An error occurred while loading approval status")
  }
}

// Close Approval Status Modal
function closeApprovalStatusModal() {
  document.getElementById("viewApprovalStatusModal").style.display = "none"
}

// Confirm Approved Pre-Booking (from approval status modal)
async function confirmApprovedPreBooking(prebookingId, prebookingCode, customerName) {
  try {
    const [success, response] = await callApi(
      "POST",
      `${prebooking_api_url}${prebookingId}/confirm/`,
      { payment_method: "cash" },
      csrf_token
    )

    if (success && response.success) {
      alert("Invite pre-booking confirmed! Booking created successfully!")
      closeApprovalStatusModal()
      await searchPrebookings()
      await loadPrebookingStats()
    } else {
      alert("Failed to confirm pre-booking: " + (response?.error || "Unknown error"))
    }
  } catch (error) {
    console.error("[v0] Error confirming pre-booking:", error)
    alert("An error occurred while confirming the pre-booking")
  }
}
