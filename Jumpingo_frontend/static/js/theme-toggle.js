// Theme Toggle Functionality
;(() => {
  const THEME_KEY = "dashboard-theme"
  const DEFAULT_THEME = "light"

  // Initialize theme on page load
  function initTheme() {
    const savedTheme = localStorage.getItem(THEME_KEY) || DEFAULT_THEME
    setTheme(savedTheme)
  }

  // Set theme
  function setTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme)
    localStorage.setItem(THEME_KEY, theme)
    updateToggleButton(theme)
  }

  // Toggle theme
  function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute("data-theme") || DEFAULT_THEME
    const newTheme = currentTheme === "light" ? "dark" : "light"
    setTheme(newTheme)
  }

  // Update toggle button appearance
  function updateToggleButton(theme) {
    const button = document.querySelector(".theme-toggle")
    if (button) {
      if (theme === "dark") {
        button.innerHTML = '<i class="fas fa-sun"></i> Light'
      } else {
        button.innerHTML = '<i class="fas fa-moon"></i> Dark'
      }
    }
  }

  // Add event listener to toggle button
  document.addEventListener("DOMContentLoaded", () => {
    initTheme()
    const toggleButton = document.querySelector(".theme-toggle")
    if (toggleButton) {
      toggleButton.addEventListener("click", toggleTheme)
    }
  })

  // Expose functions globally if needed
  window.themeToggle = {
    setTheme,
    toggleTheme,
    initTheme,
  }
})()
