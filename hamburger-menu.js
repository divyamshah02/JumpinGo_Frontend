// Hamburger Menu Functionality
document.addEventListener("DOMContentLoaded", () => {
  const hamburger = document.querySelector(".hamburger-menu")
  const mobileMenu = document.querySelector(".mobile-menu-overlay")
  const menuBackdrop = document.querySelector(".menu-backdrop")
  const body = document.body

  // Create mobile menu if it doesn't exist
  if (!mobileMenu) {
    createMobileMenu()
  }

  // Toggle menu
  if (hamburger) {
    hamburger.addEventListener("click", () => {
      toggleMenu()
    })
  }

  // Close menu when clicking backdrop
  if (menuBackdrop) {
    menuBackdrop.addEventListener("click", () => {
      closeMenu()
    })
  }

  // Close menu when clicking a link
  const menuLinks = document.querySelectorAll(".mobile-menu-nav a, .mobile-menu-book-btn")
  menuLinks.forEach((link) => {
    link.addEventListener("click", () => {
      closeMenu()
    })
  })

  function createMobileMenu() {
    // Create backdrop
    const backdrop = document.createElement("div")
    backdrop.className = "menu-backdrop"
    document.body.appendChild(backdrop)

    // Create mobile menu overlay
    const overlay = document.createElement("div")
    overlay.className = "mobile-menu-overlay"
    overlay.innerHTML = `
            <div class="mobile-menu-content">
                <ul class="mobile-menu-nav">
                    <li><a href="index.html">Home</a></li>
                    <li><a href="about_us.html">About Us</a></li>
                    <li><a href="contact.html">Contact Us</a></li>
                    <li><a href="attractions.html">Attractions</a></li>
                    <li><a href="ticket.html">Ticket</a></li>
                </ul>
                <button class="mobile-menu-book-btn" onclick="window.location='ticket.html'">Book A Ticket</button>
            </div>
        `
    document.body.appendChild(overlay)
  }

  function toggleMenu() {
    const hamburger = document.querySelector(".hamburger-menu")
    const mobileMenu = document.querySelector(".mobile-menu-overlay")
    const menuBackdrop = document.querySelector(".menu-backdrop")

    hamburger.classList.toggle("active")
    mobileMenu.classList.toggle("active")
    menuBackdrop.classList.toggle("active")
    body.classList.toggle("menu-open")
  }

  function closeMenu() {
    const hamburger = document.querySelector(".hamburger-menu")
    const mobileMenu = document.querySelector(".mobile-menu-overlay")
    const menuBackdrop = document.querySelector(".menu-backdrop")

    hamburger.classList.remove("active")
    mobileMenu.classList.remove("active")
    menuBackdrop.classList.remove("active")
    body.classList.remove("menu-open")
  }

  // Close menu on escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeMenu()
    }
  })
})
