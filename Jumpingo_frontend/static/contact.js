// Carousel functionality
let currentSlide = 0
const dots = document.querySelectorAll(".dot")
const prevBtn = document.querySelector(".arrow-btn.prev")
const nextBtn = document.querySelector(".arrow-btn.next")

function updateCarousel(index) {
  dots.forEach((dot, i) => {
    dot.classList.toggle("active", i === index)
  })
  currentSlide = index
}

dots.forEach((dot, index) => {
  dot.addEventListener("click", () => {
    updateCarousel(index)
  })
})

prevBtn.addEventListener("click", () => {
  const newIndex = currentSlide === 0 ? dots.length - 1 : currentSlide - 1
  updateCarousel(newIndex)
})

nextBtn.addEventListener("click", () => {
  const newIndex = currentSlide === dots.length - 1 ? 0 : currentSlide + 1
  updateCarousel(newIndex)
})
