// Ride Scanner State
let ride_scanner_url = null
let csrf_token = null
let scanning = false
let currentStream = null
let jsQR = null
let selectedRideId = null
let currentVerificationData = null

// Initialize Ride Scanner
async function initRideScanner(ride_scanner_url_param, csrf_token_param) {
  ride_scanner_url = ride_scanner_url_param
  csrf_token = csrf_token_param
  jsQR = window.jsQR

  await loadPaidRides()
  setupScanner()
  setupRideSelector()
  setupEntryForm() // Setup entry form handlers
}

async function loadPaidRides() {
  const rideSelect = document.getElementById("rideSelect")

  const [success, response] = await callApi("GET", `${ride_scanner_url}paid_rides/`, null, csrf_token)

  if (success && response.success) {
    const rides = response.data

    if (rides.length === 0) {
      rideSelect.innerHTML = '<option value="">No rides available</option>'
      return
    }

    rideSelect.innerHTML = '<option value="">-- Select a Ride --</option>'
    rides.forEach((ride) => {
      const option = document.createElement("option")
      option.value = ride.id
      const rideType = ride.is_paid ? `₹${ride.price}` : "FREE"
      option.textContent = `${ride.name} (${rideType})`
      option.dataset.isPaid = ride.is_paid
      rideSelect.appendChild(option)
    })
  } else {
    rideSelect.innerHTML = '<option value="">Failed to load rides</option>'
    console.error("Failed to load rides:", response.error)
  }
}

function setupRideSelector() {
  const rideSelect = document.getElementById("rideSelect")

  rideSelect.addEventListener("change", (e) => {
    selectedRideId = e.target.value

    if (selectedRideId) {
      updateStatus("", "Ready to scan")
      document.getElementById("startButton").disabled = false
    } else {
      updateStatus("", "Select a ride to begin")
      document.getElementById("startButton").disabled = true
      if (scanning) {
        stopScanner()
      }
    }
  })
}

function setupScanner() {
  const startButton = document.getElementById("startButton")
  startButton.disabled = true

  startButton.addEventListener("click", () => {
    if (!selectedRideId) {
      updateStatus("error", "Please select a ride first")
      return
    }

    if (scanning) {
      stopScanner()
    } else {
      startScanner()
    }
  })
}

function startScanner() {
  const video = document.getElementById("video")
  const startButton = document.getElementById("startButton")

  updateStatus("scanning", "Accessing camera...")

  const constraints = {
    video: {
      facingMode: "environment",
      width: { ideal: 1280 },
      height: { ideal: 720 },
    },
  }

  navigator.mediaDevices
    .getUserMedia(constraints)
    .then((stream) => {
      currentStream = stream
      video.srcObject = stream
      video.setAttribute("playsinline", true)
      return video.play()
    })
    .then(() => {
      scanning = true
      startButton.innerHTML = '<i class="fas fa-stop"></i><span>Stop</span>'
      startButton.classList.remove("btn-primary")
      startButton.classList.add("btn-danger")

      updateStatus("scanning", "Scanning for QR code...")
      requestAnimationFrame(tick)
    })
    .catch((error) => {
      console.error("Error accessing camera:", error)
      updateStatus("error", "Could not access camera")
    })
}

function stopScanner() {
  const video = document.getElementById("video")
  const startButton = document.getElementById("startButton")

  if (currentStream) {
    currentStream.getTracks().forEach((track) => track.stop())
    video.srcObject = null
    currentStream = null
  }

  scanning = false
  startButton.innerHTML = '<i class="fas fa-camera"></i><span>Start Scan</span>'
  startButton.classList.remove("btn-danger")
  startButton.classList.add("btn-primary")

  updateStatus("", "Ready to scan")
}

function tick() {
  const video = document.getElementById("video")
  const canvas = document.getElementById("canvas")
  const canvasContext = canvas.getContext("2d")

  if (!scanning) return

  if (video.readyState === video.HAVE_ENOUGH_DATA) {
    canvas.height = video.videoHeight
    canvas.width = video.videoWidth
    canvasContext.drawImage(video, 0, 0, canvas.width, canvas.height)

    const imageData = canvasContext.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: "dontInvert",
    })

    if (code) {
      console.log("QR Code detected:", code.data)

      if (navigator.vibrate) {
        navigator.vibrate(200)
      }

      updateStatus("success", "QR code found!")
      scanning = false

      verifyRideAccess(code.data)
      return
    }
  }

  if (scanning) {
    requestAnimationFrame(tick)
  }
}

function setupEntryForm() {
  const cancelBtn = document.getElementById("cancelEntryBtn")
  const confirmBtn = document.getElementById("confirmEntryBtn")
  const numPeopleInput = document.getElementById("numPeopleInput")

  cancelBtn.addEventListener("click", () => {
    hideEntryForm()
    resetScanner()
  })

  confirmBtn.addEventListener("click", async () => {
    const numPeople = Number.parseInt(numPeopleInput.value)

    if (!numPeople || numPeople <= 0) {
      showInputError("Please enter a valid number")
      return
    }

    if (numPeople > currentVerificationData.remaining) {
      showInputError(`Only ${currentVerificationData.remaining} people available`)
      return
    }

    await confirmRideEntry(numPeople)
  })

  numPeopleInput.addEventListener("input", () => {
    clearInputError()
  })
}

function showEntryForm(data) {
  currentVerificationData = data

  document.getElementById("formCustomerName").textContent = data.customer_name
  const rideType = data.is_free_ride ? " (FREE)" : " (PAID)"
  document.getElementById("formRideName").textContent = data.ride_name + rideType
  document.getElementById("availableCount").textContent = data.remaining
  document.getElementById("numPeopleInput").value = ""
  document.getElementById("numPeopleInput").max = data.remaining

  const overlay = document.getElementById("entryFormOverlay")
  overlay.style.display = "flex"
  setTimeout(() => {
    overlay.classList.add("show")
    document.getElementById("numPeopleInput").focus()
  }, 10)
}

function hideEntryForm() {
  const overlay = document.getElementById("entryFormOverlay")
  overlay.classList.remove("show")
  setTimeout(() => {
    overlay.style.display = "none"
    currentVerificationData = null
  }, 300)
}

function showInputError(message) {
  const input = document.getElementById("numPeopleInput")
  const error = document.getElementById("numPeopleError")
  input.classList.add("is-invalid")
  error.textContent = message
}

function clearInputError() {
  const input = document.getElementById("numPeopleInput")
  const error = document.getElementById("numPeopleError")
  input.classList.remove("is-invalid")
  error.textContent = ""
}

async function verifyRideAccess(bookingData) {
  updateStatus("scanning", "Validating ride access...")

  const bookingDataJsonStr = bookingData.replace(/'/g, '"')
  const booking_data_obj = JSON.parse(bookingDataJsonStr)

  const requestData = {
    booking_id: booking_data_obj["booking_id"],
    ride_id: selectedRideId,
  }

  const [success, response] = await callApi("POST", ride_scanner_url, requestData, csrf_token)

  if (success && response.success) {
    const data = response.data

    if (data.verified) {
      // Show entry form instead of success screen
      stopScanner()
      showEntryForm(data)
      updateStatus("success", "Ready to confirm entry")
    } else {
      showErrorScreen(data.message || "Access denied")
    }
  } else {
    showErrorScreen(response.error || "Failed to verify ride access")
  }
}

async function confirmRideEntry(numPeople) {
  const confirmBtn = document.getElementById("confirmEntryBtn")
  confirmBtn.disabled = true
  confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Processing...'

  const requestData = {
    booking_id: currentVerificationData.booking_id,
    ride_id: selectedRideId,
    num_people: numPeople,
  }

  const [success, response] = await callApi("POST", `${ride_scanner_url}use_ride/`, requestData, csrf_token)

  confirmBtn.disabled = false
  confirmBtn.innerHTML = '<i class="fas fa-check"></i> Confirm'

  if (success && response.success) {
    const data = response.data
    hideEntryForm()
    showSuccessScreen(data)
  } else {
    if (response.data && response.data.message) {
      showInputError(response.data.message)
    } else {
      hideEntryForm()
      showErrorScreen(response.error || "Failed to update ride access")
    }
  }
}

function showSuccessScreen(data) {
  const successOverlay = document.createElement("div")
  successOverlay.className = "success-overlay"

  const rideTypeLabel = data.ride_type === "free" ? " (Free Ride)" : ""
  const remainingText =
    data.ride_type === "free"
      ? `Total used: ${data.total_used || data.used_count}`
      : `Remaining: ${data.remaining} of ${data.total_allowed}`

  successOverlay.innerHTML = `
        <div class="success-content">
            <div class="success-icon">
                <i class="fas fa-check-circle" style="font-size: 64px;"></i>
            </div>
            <div class="success-message">
                <h2>Access Granted</h2>
                <p class="customer-name">${data.customer_name}</p>
                <p class="detail-text">${data.ride_name}${rideTypeLabel}</p>
                <p class="detail-text">${data.people_entered} people entered</p>
                <p class="detail-text">${remainingText}</p>
                <p class="detail-text">Booking: ${data.booking_id}</p>
            </div>
        </div>
    `

  document.body.appendChild(successOverlay)

  setTimeout(() => {
    successOverlay.classList.add("show")
  }, 10)

  updateStatus("success", "Access granted successfully")

  setTimeout(() => {
    successOverlay.classList.remove("show")
    setTimeout(() => {
      document.body.removeChild(successOverlay)
      resetScanner()
    }, 500)
  }, 4000)
}

function showErrorScreen(message) {
  const errorOverlay = document.createElement("div")
  errorOverlay.className = "error-overlay"

  errorOverlay.innerHTML = `
        <div class="error-content">
            <div class="error-icon">
                <i class="fas fa-times-circle" style="font-size: 64px;"></i>
            </div>
            <div class="error-message">
                <h2>Access Denied</h2>
                <p class="detail-text">${message}</p>
            </div>
        </div>
    `

  document.body.appendChild(errorOverlay)

  setTimeout(() => {
    errorOverlay.classList.add("show")
  }, 10)

  updateStatus("error", "Access denied")

  setTimeout(() => {
    errorOverlay.classList.remove("show")
    setTimeout(() => {
      document.body.removeChild(errorOverlay)
      resetScanner()
    }, 500)
  }, 4000)
}

function resetScanner() {
  const startButton = document.getElementById("startButton")
  startButton.innerHTML = '<i class="fas fa-camera"></i><span>Start Scan</span>'
  startButton.classList.remove("btn-danger")
  startButton.classList.add("btn-primary")
  updateStatus("", "Ready to scan")
}

function updateStatus(state, message) {
  const statusText = document.getElementById("statusText")
  const statusBar = document.querySelector(".status-bar")

  statusText.textContent = message

  statusBar.classList.remove("scanning", "success", "error")

  if (state) {
    statusBar.classList.add(state)
  }
}
