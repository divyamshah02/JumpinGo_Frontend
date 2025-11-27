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

  const dots = document.querySelectorAll(".dot")

  dots.forEach((dot, index) => {
    dot.addEventListener("click", function () {
      dots.forEach((d) => d.classList.remove("active"))
      this.classList.add("active")
    })
  })

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
    if (!heroSection) return

    const heroRect = heroSection.getBoundingClientRect()
    const heroTop = heroRect.top
    const heroBottom = heroRect.bottom

    // Only apply parallax when hero section is in view
    if (heroBottom > 0 && heroTop < window.innerHeight) {
      const scrollPosition = window.pageYOffset
      const stars = document.querySelectorAll(".floating-stars .star")

      stars.forEach((star, index) => {
        // Different parallax speeds for different stars
        const speed = 0.05 + index * 0.02
        const yPos = -(scrollPosition * speed)

        // Keep stars within the hero section
        if (heroTop <= 0) {
          star.style.transform = `translateY(${yPos}px)`
        } else {
          star.style.transform = "translateY(0)"
        }
      })
    }
  })
})

// Load more products functionality
document.querySelector(".btn-load-more")?.addEventListener("click", function () {
  this.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Loading...'

  setTimeout(() => {
    this.innerHTML = "Load More"
  }, 1000)
})
