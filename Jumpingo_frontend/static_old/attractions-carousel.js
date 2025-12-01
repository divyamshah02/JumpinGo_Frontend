// Testimonial Carousel Functionality
document.addEventListener("DOMContentLoaded", () => {
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
