// Category tabs functionality
document.addEventListener("DOMContentLoaded", () => {
  const categoryTabs = document.querySelectorAll(".category-tab")

  categoryTabs.forEach((tab) => {
    tab.addEventListener("click", function () {
      categoryTabs.forEach((t) => t.classList.remove("active"))
      this.classList.add("active")
    })
  })

  // Wishlist functionality
  const wishlistIcons = document.querySelectorAll(".wishlist-icon")

  wishlistIcons.forEach((icon) => {
    icon.addEventListener("click", function () {
      if (this.classList.contains("far")) {
        this.classList.remove("far")
        this.classList.add("fas")
      } else {
        this.classList.remove("fas")
        this.classList.add("far")
      }
    })
  })

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

  // Smooth scroll for navigation
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault()
      const target = document.querySelector(this.getAttribute("href"))
      if (target) {
        target.scrollIntoView({
          behavior: "smooth",
          block: "start",
        })
      }
    })
  })

  // Add animation on scroll
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px",
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = "1"
        entry.target.style.transform = "translateY(0)"
      }
    })
  }, observerOptions)

  // Observe product cards
  document.querySelectorAll(".product-card").forEach((card) => {
    card.style.opacity = "0"
    card.style.transform = "translateY(20px)"
    card.style.transition = "opacity 0.5s ease, transform 0.5s ease"
    observer.observe(card)
  })

  document.querySelectorAll(".feature-item").forEach((item) => {
    item.style.opacity = "0"
    item.style.transform = "translateX(-20px)"
    item.style.transition = "opacity 0.5s ease, transform 0.5s ease"
    observer.observe(item)
  })

  // Observe testimonial cards
  document.querySelectorAll(".testimonial-card").forEach((card) => {
    card.style.opacity = "0"
    card.style.transform = "translateY(20px)"
    card.style.transition = "opacity 0.5s ease, transform 0.5s ease"
    observer.observe(card)
  })

  window.addEventListener("scroll", () => {
    const heroSection = document.querySelector(".hero-section")
    const catalogueSection = document.querySelector(".catalogue-section")

    // Catalogue images parallax - faster movement
    if (catalogueSection) {
      const catalogueRect = catalogueSection.getBoundingClientRect()
      const catalogueTop = catalogueRect.top
      const catalogueBottom = catalogueRect.bottom
      const windowHeight = window.innerHeight

      // Apply parallax when catalogue section is in view
      if (catalogueBottom > 0 && catalogueTop < windowHeight) {
        const scrollProgress = (windowHeight - catalogueTop) / (windowHeight + catalogueRect.height)
        const leftImage = document.querySelector(".catalogue-item-left")
        const rightImage = document.querySelector(".catalogue-item-right")

        if (leftImage && rightImage) {
          // Parallax speeds - images move upward as you scroll down
          const leftSpeed = 220
          const rightSpeed = 300

          // Calculate vertical movement - negative to move up
          const leftY = -(scrollProgress * leftSpeed - 40)
          const rightY = -(scrollProgress * rightSpeed - 50)

          // Apply transforms maintaining the original rotation
          leftImage.style.transform = `rotate(19deg) translateY(${leftY}px)`
          rightImage.style.transform = `rotate(-21deg) translateY(${rightY}px)`
        }
      }
    }
  })

  let currentSubtitleIndex = 0
  const subtitles = document.querySelectorAll(".hero-subtitle")

  function flipSubtitle() {
    if (subtitles.length === 0) return

    // Remove flip-in from current and add flip-out
    subtitles[currentSubtitleIndex].classList.remove("flip-in")
    subtitles[currentSubtitleIndex].classList.add("flip-out")

    // Move to next subtitle
    currentSubtitleIndex = (currentSubtitleIndex + 1) % subtitles.length

    // After flip-out animation completes, add flip-in to next
    setTimeout(() => {
      // Remove all flip classes first
      subtitles.forEach((subtitle) => {
        subtitle.classList.remove("flip-in", "flip-out")
      })

      // Add flip-in to current subtitle
      subtitles[currentSubtitleIndex].classList.add("flip-in")
    }, 400) // Half of the animation duration
  }

  // Start the flip animation every 5 seconds
  setInterval(flipSubtitle, 3000)

})
