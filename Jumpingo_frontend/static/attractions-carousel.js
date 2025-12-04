document.addEventListener("DOMContentLoaded", () => {
  const testimonialsCarousel = document.querySelector(".testimonials-carousel")
  const testimonialCards = document.querySelectorAll(".testimonial-card")
  const dots = document.querySelectorAll(".carousel-dots .dot")
  const prevBtn = document.querySelector(".arrow-btn.prev")
  const nextBtn = document.querySelector(".arrow-btn.next")

  if (!testimonialsCarousel || !testimonialCards.length || !dots.length) return

  let currentSlide = 0
  let cardsPerView = 3
  let autoPlayInterval = null

  // Calculate cards per view based on screen size
  function updateCardsPerView() {
    const width = window.innerWidth
    if (width <= 768) {
      cardsPerView = 1
    } else if (width <= 1024) {
      cardsPerView = 2
    } else {
      cardsPerView = 3
    }
  }

  // Get max slides based on cards and cards per view
  function getMaxSlides() {
    return Math.max(0, testimonialCards.length - cardsPerView)
  }

  // Update carousel position
  function updateCarousel() {
    const cardWidth = testimonialCards[0].offsetWidth
    const gap = Number.parseInt(window.getComputedStyle(testimonialsCarousel).gap) || 40
    const offset = currentSlide * (cardWidth + gap)
    testimonialsCarousel.style.transform = `translateX(-${offset}px)`

    // Update active dot
    dots.forEach((dot, index) => {
      dot.classList.toggle("active", index === currentSlide)
    })

    const maxSlides = getMaxSlides()
    if (prevBtn) {
      prevBtn.style.opacity = maxSlides === 0 ? "0.3" : "1"
      prevBtn.style.pointerEvents = maxSlides === 0 ? "none" : "auto"
    }
    if (nextBtn) {
      nextBtn.style.opacity = maxSlides === 0 ? "0.3" : "1"
      nextBtn.style.pointerEvents = maxSlides === 0 ? "none" : "auto"
    }
  }

  // Handle dot clicks
  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      if (getMaxSlides() === 0) return
      currentSlide = Math.min(index, getMaxSlides())
      updateCarousel()
    })
  })

  // Handle prev button
  if (prevBtn) {
    prevBtn.addEventListener("click", () => {
      const maxSlides = getMaxSlides()
      if (maxSlides === 0) return
      if (currentSlide > 0) {
        currentSlide = currentSlide - 1
        updateCarousel()
      }
    })
  }

  // Handle next button
  if (nextBtn) {
    nextBtn.addEventListener("click", () => {
      const maxSlides = getMaxSlides()
      if (maxSlides === 0) return
      if (currentSlide < maxSlides) {
        currentSlide = currentSlide + 1
        updateCarousel()
      }
    })
  }

  // Handle window resize
  window.addEventListener("resize", () => {
    updateCardsPerView()
    currentSlide = Math.min(currentSlide, getMaxSlides())
    updateCarousel()
    stopAutoPlay()
    startAutoPlay()
  })

  // Initialize
  updateCardsPerView()
  updateCarousel()

  function startAutoPlay() {
    const maxSlides = getMaxSlides()
    // Don't auto-play if all cards are visible
    if (maxSlides === 0) return

    autoPlayInterval = setInterval(() => {
      const maxSlides = getMaxSlides()
      if (maxSlides === 0) {
        stopAutoPlay()
        return
      }
      if (currentSlide >= maxSlides) {
        currentSlide = 0
      } else {
        currentSlide = currentSlide + 1
      }
      updateCarousel()
    }, 5000)
  }

  function stopAutoPlay() {
    if (autoPlayInterval) {
      clearInterval(autoPlayInterval)
      autoPlayInterval = null
    }
  }

  startAutoPlay()

  // Pause auto-play on hover
  testimonialsCarousel.addEventListener("mouseenter", stopAutoPlay)
  testimonialsCarousel.addEventListener("mouseleave", startAutoPlay)
})
