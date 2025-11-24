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

  // Add to cart functionality
  const addToCartBtn = document.querySelector(".btn-add-to-cart")

  if (addToCartBtn) {
    addToCartBtn.addEventListener("click", () => {
      const quantity = qtyInput.value
      alert(`Added ${quantity} ticket(s) to cart!`)
      // Here you would typically send this data to your cart system
    })
  }
})
