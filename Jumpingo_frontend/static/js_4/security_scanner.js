// Security Scanner State
let qr_verify_url = null
let record_arrival_url = null
let csrf_token = null
let scanning = false
let currentStream = null
let jsQR = null // Declare jsQR variable
let currentBookingData = null // Store current booking data for arrival confirmation

function showErrorScreen(message) {
  const errorOverlay = document.createElement("div")
  errorOverlay.className = "error-overlay"

  errorOverlay.innerHTML = `
        <div class="error-content">
            <div class="error-icon">
                <i class="fas fa-exclamation-circle" style="font-size: 64px;"></i>
            </div>
            <div class="error-message">
                <h2>Error</h2>
                <p>${message}</p>
            </div>
        </div>
    `

  document.body.appendChild(errorOverlay)

  setTimeout(() => {
    errorOverlay.classList.add("show")
  }, 10)

  setTimeout(() => {
    errorOverlay.classList.remove("show")
    setTimeout(() => {
      document.body.removeChild(errorOverlay)
      resetScanner()
    }, 500)
  }, 4000)
}

// Initialize Scanner
async function initScanner(qr_verify_url_param, record_arrival_url_param, csrf_token_param) {
  qr_verify_url = qr_verify_url_param
  record_arrival_url = record_arrival_url_param
  csrf_token = csrf_token_param

  jsQR = window.jsQR // Assuming jsQR is available globally

  setupScanner()
}

function setupScanner() {
  const startButton = document.getElementById("startButton")

  startButton.addEventListener("click", () => {
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

      // Verify the booking
      verifyBooking(code.data)
      return
    }
  }

  if (scanning) {
    requestAnimationFrame(tick)
  }
}

async function verifyBooking(bookingData) {
  updateStatus("scanning", "Validating booking...")
  const bookingDataJsonStr = bookingData.replace(/'/g, '"')
  const booking_data_obj = JSON.parse(bookingDataJsonStr)
  const requestData = {
    booking_id: booking_data_obj["booking_id"],
  }

  const [success, response] = await callApi("POST", qr_verify_url, requestData, csrf_token)

  if (success && response.success) {
    const data = response.data
    console.log("Booking verification data:", data)
    if (data.verified) {
      if (data.all_arrived) {
        showAlreadyEnteredScreen(data)
      } else {
        currentBookingData = data
        showEntryForm(data)
      }
    } else {
      showErrorScreen(data.message || "Invalid booking")
    }
  } else {
    showErrorScreen(response.error || "Failed to verify booking")
  }
}

function showEntryForm(data) {
  const overlay = document.getElementById("entryFormOverlay")
  const bookingInfo = document.getElementById("bookingInfo")
  const numArrivingInput = document.getElementById("numArrivingInput")

  // Populate booking information
  bookingInfo.innerHTML = `
        <div class="info-row">
            <span class="info-label">Booking ID:</span>
            <span class="info-value">${data.booking_id}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Customer:</span>
            <span class="info-value">${data.customer_name}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Total People:</span>
            <span class="info-value">${data.num_people}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Already Arrived:</span>
            <span class="info-value">${data.total_arrived}</span>
        </div>
        <div class="info-row">
            <span class="info-label">Remaining:</span>
            <span class="info-value" style="color: var(--secondary-color); font-weight: 600;">${data.remaining}</span>
        </div>
    `

  // Set max value for input
  numArrivingInput.value = ""
  numArrivingInput.max = data.remaining
  numArrivingInput.placeholder = `Max: ${data.remaining}`

  // Show overlay
  overlay.classList.add("show")
  updateStatus("success", "Booking verified - Enter arrival count")
}

function hideEntryForm() {
  const overlay = document.getElementById("entryFormOverlay")
  overlay.classList.remove("show")
  currentBookingData = null
  resetScanner()
}

async function confirmArrival() {
  if (!currentBookingData) return

  const numArrivingInput = document.getElementById("numArrivingInput")
  const numArriving = Number.parseInt(numArrivingInput.value)

  // Validate input
  if (!numArriving || numArriving <= 0) {
    alert("Please enter a valid number of people")
    return
  }

  if (numArriving > currentBookingData.remaining) {
    alert(`Only ${currentBookingData.remaining} people can enter`)
    return
  }

  console.log(currentBookingData)
  const requestData = {
    booking_id: currentBookingData.booking_id,
    num_arriving: numArriving,
  }

  console.log("[v0] Calling record_arrival API with URL:", record_arrival_url)
  console.log("[v0] Request data:", requestData)

  const [success, response] = await callApi("POST", record_arrival_url, requestData, csrf_token)

  console.log("[v0] API Response - Success:", success, "Response:", response)
  // Hide form
  hideEntryForm()
  updateStatus("scanning", "Recording arrival...")
  if (success && response.success) {
    const data = response.data
    showArrivalSuccessScreen(data, numArriving)
  } else {
    const errorMessage = response.error || response.data?.message || "Failed to record arrival"
    console.error("[v0] Error recording arrival:", errorMessage)
    showErrorScreen(errorMessage)
  }
}

function showArrivalSuccessScreen(data, numArriving) {
  const successOverlay = document.createElement("div")
  successOverlay.className = "success-overlay"

  successOverlay.innerHTML = `
        <div class="success-content">
            <div class="success-icon">
                <i class="fas fa-check-circle" style="font-size: 64px;"></i>
            </div>
            <div class="success-message">
                <h2>Entry Recorded</h2>
                <p class="customer-name">${data.customer_name}</p>
                <p class="detail-text">${numArriving} ${numArriving > 1 ? "People" : "Person"} Entered</p>
                <p class="detail-text">Total Arrived: ${data.total_arrived}/${data.num_people}</p>
                <p class="detail-text">Remaining: ${data.remaining}</p>
            </div>
        </div>
    `

  document.body.appendChild(successOverlay)

  setTimeout(() => {
    successOverlay.classList.add("show")
  }, 10)

  updateStatus("success", "Entry recorded successfully")

  setTimeout(() => {
    successOverlay.classList.remove("show")
    setTimeout(() => {
      document.body.removeChild(successOverlay)
      resetScanner()
    }, 500)
  }, 4000)
}

function showAlreadyEnteredScreen(data) {
  const errorOverlay = document.createElement("div")
  errorOverlay.className = "error-overlay"

  errorOverlay.innerHTML = `
        <div class="error-content">
            <div class="error-icon">
                <i class="fas fa-exclamation-circle" style="font-size: 64px;"></i>
            </div>
            <div class="error-message">
                <h2>All People Arrived</h2>
                <p class="customer-name">${data.customer_name}</p>
                <p class="detail-text">Total: ${data.total_arrived}/${data.num_people} people</p>
                <p class="detail-text">All group members have entered</p>
            </div>
        </div>
    `

  document.body.appendChild(errorOverlay)

  setTimeout(() => {
    errorOverlay.classList.add("show")
  }, 10)

  updateStatus("error", "All people already arrived")

  setTimeout(() => {
    errorOverlay.classList.remove("show")
    setTimeout(() => {
      document.body.removeChild(errorOverlay)
      resetScanner()
    }, 500)
  }, 4000)
}

function showSuccessScreen(data) {
  const successOverlay = document.createElement("div")
  successOverlay.className = "success-overlay"

  successOverlay.innerHTML = `
        <div class="success-content">
            <div class="success-icon">
                <i class="fas fa-check-circle" style="font-size: 64px;"></i>
            </div>
            <div class="success-message">
                <h2>Entry Verified</h2>
                <p class="customer-name">${data.customer_name}</p>
                <p class="detail-text">${data.num_people} ${data.num_people > 1 ? "People" : "Person"}</p>
                <p class="detail-text">Booking: ${data.booking_id}</p>
            </div>
        </div>
    `

  document.body.appendChild(successOverlay)

  setTimeout(() => {
    successOverlay.classList.add("show")
  }, 10)

  updateStatus("success", "Entry verified successfully")

  setTimeout(() => {
    successOverlay.classList.remove("show")
    setTimeout(() => {
      document.body.removeChild(successOverlay)
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
