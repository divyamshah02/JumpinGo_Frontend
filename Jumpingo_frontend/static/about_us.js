// Floating Items Reveal Effect
document.addEventListener("DOMContentLoaded", () => {
  const heroSection = document.querySelector(".about-hero")
  const floatingElements = document.querySelectorAll("[data-reveal]")
  // const revealRadius = 320
  const revealRadius = window.innerWidth * 0.25 // 25% of screen width

  heroSection.addEventListener("mousemove", (e) => {
    const mouseX = e.clientX
    const mouseY = e.clientY

    floatingElements.forEach((element) => {
      const rect = element.getBoundingClientRect()
      const elementX = rect.left + rect.width / 2
      const elementY = rect.top + rect.height / 2

      const distance = Math.sqrt(Math.pow(mouseX - elementX, 2) + Math.pow(mouseY - elementY, 2))

      if (distance < revealRadius) {
        element.classList.add("revealed")
      } else {
        element.classList.remove("revealed")
      }
    })
  })

  heroSection.addEventListener("mouseleave", () => {
    floatingElements.forEach((element) => {
      element.classList.remove("revealed")
    })
  })

  // Testimonials Carousel
  const testimonialsGrid = document.querySelector(".testimonials-grid")
  const dots = document.querySelectorAll(".dot")
  const prevBtn = document.querySelector(".prev-btn")
  const nextBtn = document.querySelector(".next-btn")

  let currentSlide = 0
  let cardsPerView = 3

  // Calculate cards per view based on screen size
  function updateCardsPerView() {
    const width = window.innerWidth
    if (width <= 768) {
      cardsPerView = 1
    } else if (width <= 992) {
      cardsPerView = 2
    } else {
      cardsPerView = 3
    }
  }

  // Update carousel position
  function updateCarousel() {
    if (!testimonialsGrid) return

    const cards = document.querySelectorAll(".testimonial-card")
    if (!cards.length) return

    const cardWidth = cards[0].offsetWidth
    const gap = 30
    const offset = currentSlide * (cardWidth + gap)

    testimonialsGrid.style.transform = `translateX(-${offset}px)`

    // Update active dot
    dots.forEach((dot, index) => {
      dot.classList.toggle("active", index === currentSlide)
    })
  }

  // Handle dot clicks
  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      currentSlide = index
      updateCarousel()
    })
  })

  // Handle next button
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      currentSlide = (currentSlide + 1) % dots.length
      updateCarousel()
    })
  }

  // Handle prev button
  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      currentSlide = (currentSlide - 1 + dots.length) % dots.length
      updateCarousel()
    })
  }

  // Handle window resize
  window.addEventListener("resize", () => {
    updateCardsPerView()
    updateCarousel()
  })

  // Initialize
  updateCardsPerView()
  updateCarousel()

  // Optional: Auto-play carousel
  let autoPlayInterval

  function startAutoPlay() {
    autoPlayInterval = setInterval(() => {
      currentSlide = (currentSlide + 1) % dots.length
      updateCarousel()
    }, 5000)
  }

  function stopAutoPlay() {
    clearInterval(autoPlayInterval)
  }

  // Start auto-play
  startAutoPlay()

  // Pause auto-play on hover
  if (testimonialsGrid) {
    testimonialsGrid.addEventListener("mouseenter", stopAutoPlay)
    testimonialsGrid.addEventListener("mouseleave", startAutoPlay)
  }

  // Interactive Map Enhancement
  const rideHotspots = document.querySelectorAll(".ride-hotspot")
  const mapOverlay = document.querySelector(".map-overlay")
  const ridePopup = document.getElementById("ridePopup")
  const ridePopupImg = document.getElementById("ridePopupImg")
  const ridePopupName = document.getElementById("ridePopupName")

  function showRidePopup(hotspot) {
    const rideName = hotspot.getAttribute("data-ride")
    const rideImg = hotspot.getAttribute("data-img")

    if (ridePopupImg && ridePopupName && ridePopup && mapOverlay) {
      ridePopupImg.src = rideImg
      ridePopupImg.alt = rideName
      ridePopupName.textContent = rideName

      mapOverlay.classList.add("active")
      ridePopup.classList.add("active")
    }
  }

  function hideRidePopup() {
    if (ridePopup && mapOverlay) {
      mapOverlay.classList.remove("active")
      ridePopup.classList.remove("active")
    }
  }

  rideHotspots.forEach((hotspot) => {
    // Mouse hover for desktop
    hotspot.addEventListener("mouseenter", () => {
      showRidePopup(hotspot)
    })

    hotspot.addEventListener("mouseleave", () => {
      hideRidePopup()
    })

    // Touch support for mobile
    hotspot.addEventListener("touchstart", (e) => {
      e.preventDefault()
      // Remove active class from all other hotspots
      rideHotspots.forEach((h) => h.classList.remove("touch-active"))
      // Add active class to current hotspot
      hotspot.classList.add("touch-active")
      showRidePopup(hotspot)
    })
  })

  // Close popup when tapping outside on mobile
  document.addEventListener("touchstart", (e) => {
    if (!e.target.closest(".ride-hotspot")) {
      rideHotspots.forEach((h) => h.classList.remove("touch-active"))
      hideRidePopup()
    }
  })
})
