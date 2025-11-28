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

  // Book Now button functionality
  const bookNowBtn = document.querySelector(".btn-book-now")

  if (bookNowBtn) {
    bookNowBtn.addEventListener("click", () => {
      const quantity = qtyInput.value
      alert(`Booking ${quantity} ticket(s)!`)
      // Here you would typically send this data to your booking system
    })
  }


   const carousel = document.querySelector(".info-cards-carousel")
  const dots = document.querySelectorAll(".nav-dot")
  const cards = document.querySelectorAll(".info-card")

  if (!carousel || !dots.length || !cards.length) return

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
})
