// Login Page State
let login_url = null
let csrf_token = null

// Initialize Login Page
async function initLogin(login_url_param, csrf_token_param) {
  login_url = login_url_param
  csrf_token = csrf_token_param

  setupLoginForm()
}

function setupLoginForm() {
  const loginForm = document.getElementById("loginForm")

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault()
    await performLogin()
  })
}

// Perform Login
async function performLogin() {
  const emailInput = document.getElementById("email")
  const passwordInput = document.getElementById("password")
  const email = emailInput.value.trim()
  const password = passwordInput.value.trim()

  if (!email) {
    showAlert("Please enter your email", "danger")
    return
  }

  if (!password) {
    showAlert("Please enter your password", "danger")
    return
  }

  const loginBtn = document.getElementById("loginBtn")
  setButtonLoading(loginBtn, true)
  hideAlert()

  const requestData = {
    email: email,
    password: password,
  }

  const [success, response] = await callApi("POST", login_url, requestData, csrf_token)

  setButtonLoading(loginBtn, false)

  if (success && response.success) {
    const data = response.data

    if (data.login_success) {
      showAlert("Login successful! Redirecting...", "success")

      setTimeout(() => {
        redirectBasedOnRole(data.user_id, data.role)
      }, 1500)
    } else {
      showAlert(data.message || "Login failed", "danger")
      passwordInput.value = ""
      passwordInput.focus()
    }
  } else {
    showAlert(response.error || "Failed to login. Please try again.", "danger")
    passwordInput.value = ""
    passwordInput.focus()
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
