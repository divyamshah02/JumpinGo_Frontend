// Floating Items Reveal Effect
document.addEventListener("DOMContentLoaded", () => {
  const heroSection = document.querySelector(".about-hero")
  const floatingElements = document.querySelectorAll("[data-reveal]")
  const revealRadius = 180

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
  const carousel = document.getElementById("testimonialsCarousel")
  const dots = document.querySelectorAll(".carousel-indicators-custom .dot")
  let currentSlide = 0

  dots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
      currentSlide = index
      updateCarousel()
    })
  })

  function updateCarousel() {
    const slideWidth = carousel.querySelector(".testimonial-card-green").offsetWidth + 30
    carousel.style.transform = `translateX(-${currentSlide * slideWidth}px)`

    dots.forEach((dot, index) => {
      dot.classList.toggle("active", index === currentSlide)
    })
  }

  // Auto-play carousel
  setInterval(() => {
    currentSlide = (currentSlide + 1) % dots.length
    updateCarousel()
  }, 5000)
})
