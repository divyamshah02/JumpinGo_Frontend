// Sock Scanner State
let sock_scanner_url = null
let csrf_token = null
let scanning = false
let currentStream = null
let jsQR = null
let currentVerificationData = null

// Initialize Sock Scanner
async function initSockScanner(sock_scanner_url_param, csrf_token_param) {
  sock_scanner_url = sock_scanner_url_param
  csrf_token = csrf_token_param
  jsQR = window.jsQR

  setupScanner()
  setupSocksForm()
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

      verifySocksCollection(code.data)
      return
    }
  }

  if (scanning) {
    requestAnimationFrame(tick)
  }
}

function setupSocksForm() {
  const cancelBtn = document.getElementById("cancelSocksBtn")
  const confirmBtn = document.getElementById("confirmSocksBtn")
  const sizeInputs = ["socksSmall", "socksMedium", "socksLarge", "socksXLarge"]

  cancelBtn.addEventListener("click", () => {
    hideSocksForm()
    resetScanner()
  })

  confirmBtn.addEventListener("click", async () => {
    await confirmSocksDistribution()
  })

  sizeInputs.forEach((inputId) => {
    const input = document.getElementById(inputId)
    input.addEventListener("input", () => {
      updateTotalDistributing()
      clearSocksError()
    })
  })
}

function updateTotalDistributing() {
  const small = Number.parseInt(document.getElementById("socksSmall").value) || 0
  const medium = Number.parseInt(document.getElementById("socksMedium").value) || 0
  const large = Number.parseInt(document.getElementById("socksLarge").value) || 0
  const xlarge = Number.parseInt(document.getElementById("socksXLarge").value) || 0

  const total = small + medium + large + xlarge
  document.getElementById("totalDistributing").textContent = total
}

function showSocksForm(data) {
  currentVerificationData = data

  document.getElementById("formCustomerName").textContent = data.customer_name
  document.getElementById("formBookingId").textContent = `Booking: ${data.booking_id}`
  document.getElementById("availableCount").textContent = data.remaining

  // Reset inputs
  document.getElementById("socksSmall").value = 0
  document.getElementById("socksMedium").value = 0
  document.getElementById("socksLarge").value = 0
  document.getElementById("socksXLarge").value = 0
  updateTotalDistributing()
  clearSocksError()

  const overlay = document.getElementById("socksFormOverlay")
  overlay.style.display = "flex"
  setTimeout(() => {
    overlay.classList.add("show")
  }, 10)
}

function hideSocksForm() {
  const overlay = document.getElementById("socksFormOverlay")
  overlay.classList.remove("show")
  setTimeout(() => {
    overlay.style.display = "none"
    currentVerificationData = null
  }, 300)
}

function showSocksError(message) {
  const error = document.getElementById("socksError")
  error.textContent = message
  error.style.display = "block"
}

function clearSocksError() {
  const error = document.getElementById("socksError")
  error.textContent = ""
  error.style.display = "none"
}

async function verifySocksCollection(bookingData) {
  updateStatus("scanning", "Validating booking...")

  const bookingDataJsonStr = bookingData.replace(/'/g, '"')
  const booking_data_obj = JSON.parse(bookingDataJsonStr)

  const requestData = {
    booking_id: booking_data_obj["booking_id"],
  }

  const [success, response] = await callApi("POST", sock_scanner_url, requestData, csrf_token)

  if (success && response.success) {
    const data = response.data

    if (data.verified) {
      stopScanner()
      showSocksForm(data)
      updateStatus("success", "Ready to distribute socks")
    } else {
      showErrorScreen(data.message || "Cannot distribute socks")
    }
  } else {
    showErrorScreen(response.error || "Failed to verify booking")
  }
}

async function confirmSocksDistribution() {
  const small = Number.parseInt(document.getElementById("socksSmall").value) || 0
  const medium = Number.parseInt(document.getElementById("socksMedium").value) || 0
  const large = Number.parseInt(document.getElementById("socksLarge").value) || 0
  const xlarge = Number.parseInt(document.getElementById("socksXLarge").value) || 0

  const total = small + medium + large + xlarge

  if (total <= 0) {
    showSocksError("Please enter at least one sock to distribute")
    return
  }

  if (total > currentVerificationData.remaining) {
    showSocksError(`Only ${currentVerificationData.remaining} socks available`)
    return
  }

  const confirmBtn = document.getElementById("confirmSocksBtn")
  confirmBtn.disabled = true
  confirmBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Processing...'

  const requestData = {
    booking_id: currentVerificationData.booking_id,
    socks_small: small,
    socks_medium: medium,
    socks_large: large,
    socks_xlarge: xlarge,
  }

  const [success, response] = await callApi("POST", `${sock_scanner_url}distribute_socks/`, requestData, csrf_token)

  confirmBtn.disabled = false
  confirmBtn.innerHTML = '<i class="fas fa-check"></i> Confirm'

  if (success && response.success) {
    const data = response.data
    hideSocksForm()
    showSuccessScreen(data)
  } else {
    if (response.data && response.data.message) {
      showSocksError(response.data.message)
    } else {
      hideSocksForm()
      showErrorScreen(response.error || "Failed to distribute socks")
    }
  }
}

function showSuccessScreen(data) {
  const successOverlay = document.createElement("div")
  successOverlay.className = "success-overlay"

  const distribution = data.distribution
  const distributionText = []
  if (distribution.small > 0) distributionText.push(`${distribution.small} Small`)
  if (distribution.medium > 0) distributionText.push(`${distribution.medium} Medium`)
  if (distribution.large > 0) distributionText.push(`${distribution.large} Large`)
  if (distribution.xlarge > 0) distributionText.push(`${distribution.xlarge} XL`)

  successOverlay.innerHTML = `
    <div class="success-content" style="color: white; text-align: center; padding: 2rem;">
        <div class="success-icon">
            <i class="fas fa-check-circle" style="font-size: 64px;"></i>
        </div>
        <div class="success-message">
            <h2>Socks Distributed</h2>
            <p class="customer-name" style="font-size: 1.5rem; margin-top: 1rem;">${data.customer_name}</p>
            <p class="detail-text" style="font-size: 1.1rem; margin-top: 0.5rem;">${data.socks_distributed} socks distributed</p>
            <p class="detail-text" style="font-size: 1rem;">${distributionText.join(", ")}</p>
            <p class="detail-text" style="font-size: 1rem; margin-top: 1rem;">Remaining: ${data.remaining} of ${data.total_people}</p>
            <p class="detail-text" style="font-size: 0.9rem;">Booking: ${data.booking_id}</p>
        </div>
    </div>
  `

  document.body.appendChild(successOverlay)

  setTimeout(() => {
    successOverlay.classList.add("show")
  }, 10)

  updateStatus("success", "Socks distributed successfully")

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
    <div class="error-content" style="color: white; text-align: center; padding: 2rem;">
        <div class="error-icon">
            <i class="fas fa-times-circle" style="font-size: 64px;"></i>
        </div>
        <div class="error-message">
            <h2>Cannot Distribute</h2>
            <p class="detail-text" style="font-size: 1.1rem; margin-top: 1rem;">${message}</p>
        </div>
    </div>
  `

  document.body.appendChild(errorOverlay)

  setTimeout(() => {
    errorOverlay.classList.add("show")
  }, 10)

  updateStatus("error", "Distribution denied")

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

