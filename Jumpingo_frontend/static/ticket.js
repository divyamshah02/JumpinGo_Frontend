// Quantity selector functionality
document.addEventListener("DOMContentLoaded", () => {
  const minusBtn = document.querySelector(".qty-minus")
  const plusBtn = document.querySelector(".qty-plus")
  const qtyInput = document.querySelector(".qty-input")

  if (minusBtn && plusBtn && qtyInput) {
    minusBtn.addEventListener("click", () => {
      const currentValue = Number.parseInt(qtyInput.value)
      if (currentValue > 1) {
        qtyInput.value = currentValue - 1
      }
    })

    plusBtn.addEventListener("click", () => {
      const currentValue = Number.parseInt(qtyInput.value)
      qtyInput.value = currentValue + 1
    })
  }

  // Accordion functionality
  const accordionButtons = document.querySelectorAll(".accordion-button")

  accordionButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const accordionItem = this.parentElement
      const accordionContent = accordionItem.querySelector(".accordion-content")
      const isActive = this.classList.contains("active")

      // Close all accordions
      accordionButtons.forEach((btn) => {
        btn.classList.remove("active")
        btn.parentElement.querySelector(".accordion-content").classList.remove("active")
      })

      // Open clicked accordion if it wasn't active
      if (!isActive) {
        this.classList.add("active")
        accordionContent.classList.add("active")
      }
    })
  })

  const thumbnails = document.querySelectorAll(".thumbnail-item")
  const mainImage = document.getElementById("mainImage")

  thumbnails.forEach((thumbnail) => {
    thumbnail.addEventListener("click", function () {
      // Remove active class from all thumbnails
      thumbnails.forEach((thumb) => thumb.classList.remove("active"))

      // Add active class to clicked thumbnail
      this.classList.add("active")

      // Get the full-size image URL from data attribute
      const newImageSrc = this.getAttribute("data-image")

      // Update main image with fade effect
      mainImage.style.opacity = "0.5"

      setTimeout(() => {
        mainImage.src = newImageSrc
        mainImage.style.opacity = "1"
      }, 200)
    })
  })

  const carousel = document.querySelector(".info-cards-carousel")
  const dots = document.querySelectorAll(".nav-dot")
  const cards = document.querySelectorAll(".info-card")

  if (carousel && dots.length && cards.length) {
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
      const cardWidth = cards[0].offsetWidth
      const gap = 40
      const offset = currentSlide * (cardWidth + gap)
      carousel.style.transform = `translateX(-${offset}px)`

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
      }, 5000) // Change slide every 5 seconds
    }

    function stopAutoPlay() {
      clearInterval(autoPlayInterval)
    }

    // Start auto-play
    startAutoPlay()

    // Pause auto-play on hover
    carousel.addEventListener("mouseenter", stopAutoPlay)
    carousel.addEventListener("mouseleave", startAutoPlay)
  }

  const testimonialsCarousel = document.querySelector(".testimonials-carousel")
  const testimonialCards = document.querySelectorAll(".testimonial-card")
  const testimonialDots = document.querySelectorAll(".carousel-dots .dot")
  const prevBtn = document.querySelector(".arrow-btn.prev")
  const nextBtn = document.querySelector(".arrow-btn.next")

  if (testimonialsCarousel && testimonialCards.length && testimonialDots.length) {
    let currentTestimonialSlide = 0
    let testimonialCardsPerView = 3
    let testimonialAutoPlayInterval = null

    // Calculate cards per view based on screen size
    function updateTestimonialCardsPerView() {
      const width = window.innerWidth
      if (width <= 768) {
        testimonialCardsPerView = 1
      } else if (width <= 1024) {
        testimonialCardsPerView = 2
      } else {
        testimonialCardsPerView = 3
      }
    }

    // Get max slides based on cards and cards per view
    function getMaxTestimonialSlides() {
      return Math.max(0, testimonialCards.length - testimonialCardsPerView)
    }

    // Update carousel position
    function updateTestimonialsCarousel() {
      const cardWidth = testimonialCards[0].offsetWidth
      const gap = Number.parseInt(window.getComputedStyle(testimonialsCarousel).gap) || 40
      const offset = currentTestimonialSlide * (cardWidth + gap)
      testimonialsCarousel.style.transform = `translateX(-${offset}px)`

      // Update active dot
      testimonialDots.forEach((dot, index) => {
        dot.classList.toggle("active", index === currentTestimonialSlide)
      })

      const maxSlides = getMaxTestimonialSlides()
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
    testimonialDots.forEach((dot, index) => {
      dot.addEventListener("click", () => {
        if (getMaxTestimonialSlides() === 0) return
        currentTestimonialSlide = Math.min(index, getMaxTestimonialSlides())
        updateTestimonialsCarousel()
      })
    })

    // Handle prev button
    if (prevBtn) {
      prevBtn.addEventListener("click", () => {
        const maxSlides = getMaxTestimonialSlides()
        if (maxSlides === 0) return
        if (currentTestimonialSlide > 0) {
          currentTestimonialSlide = currentTestimonialSlide - 1
          updateTestimonialsCarousel()
        }
      })
    }

    // Handle next button
    if (nextBtn) {
      nextBtn.addEventListener("click", () => {
        const maxSlides = getMaxTestimonialSlides()
        if (maxSlides === 0) return
        if (currentTestimonialSlide < maxSlides) {
          currentTestimonialSlide = currentTestimonialSlide + 1
          updateTestimonialsCarousel()
        }
      })
    }

    // Handle window resize
    window.addEventListener("resize", () => {
      updateTestimonialCardsPerView()
      currentTestimonialSlide = Math.min(currentTestimonialSlide, getMaxTestimonialSlides())
      updateTestimonialsCarousel()
      stopTestimonialAutoPlay()
      startTestimonialAutoPlay()
    })

    // Initialize
    updateTestimonialCardsPerView()
    updateTestimonialsCarousel()

    function startTestimonialAutoPlay() {
      const maxSlides = getMaxTestimonialSlides()
      if (maxSlides === 0) return

      testimonialAutoPlayInterval = setInterval(() => {
        const maxSlides = getMaxTestimonialSlides()
        if (maxSlides === 0) {
          stopTestimonialAutoPlay()
          return
        }
        if (currentTestimonialSlide >= maxSlides) {
          currentTestimonialSlide = 0
        } else {
          currentTestimonialSlide = currentTestimonialSlide + 1
        }
        updateTestimonialsCarousel()
      }, 5000)
    }

    function stopTestimonialAutoPlay() {
      if (testimonialAutoPlayInterval) {
        clearInterval(testimonialAutoPlayInterval)
        testimonialAutoPlayInterval = null
      }
    }

    // Start auto-play
    startTestimonialAutoPlay()

    // Pause auto-play on hover
    testimonialsCarousel.addEventListener("mouseenter", stopTestimonialAutoPlay)
    testimonialsCarousel.addEventListener("mouseleave", startTestimonialAutoPlay)
  }
})
