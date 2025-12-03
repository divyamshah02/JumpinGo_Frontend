  class StarParticle {
    constructor(x, y) {
      this.x = x
      this.y = y
      this.size = Math.random() * 20 + 10 // Random size between 10-30px
      this.speedX = (Math.random() - 0.5) * 8 // Random horizontal velocity
      this.speedY = (Math.random() - 0.5) * 8 // Random vertical velocity
      this.life = 1 // Opacity from 0 to 1
      this.decay = Math.random() * 0.02 + 0.01 // How fast it fades
      this.rotation = Math.random() * 360 // Initial rotation
      this.rotationSpeed = (Math.random() - 0.5) * 20 // Rotation speed
      this.orbitAngle = Math.random() * Math.PI * 2 // For orbital motion
      this.orbitSpeed = (Math.random() - 0.5) * 0.3 // How fast it orbits
      this.orbitRadius = Math.random() * 50 + 20 // Orbit radius
      this.targetX = x + Math.cos(this.orbitAngle) * this.orbitRadius
      this.targetY = y + Math.sin(this.orbitAngle) * this.orbitRadius
      this.element = this.createElement()
    }

    createElement() {      
      const star = document.createElement("img")
      const logos = [
        "/static/red_small_logo.png",
        "/static/blue_small_logo.png",
        "/static/green_small_logo.png",
        "/static/small_logo.png"
      ];

      const randomLogo = logos[Math.floor(Math.random() * logos.length)];

      star.src = randomLogo;
      // star.src = "/static/small_logo.png"
      star.className = "cursor-star-particle"
      star.style.cssText = `
        position: fixed;
        pointer-events: none;
        z-index: 9999;
        width: ${this.size}px;
        height: ${this.size}px;
        left: ${this.x}px;
        top: ${this.y}px;
        transform: rotate(${this.rotation}deg);
        opacity: ${this.life};
        transition: none;
      `
      document.body.appendChild(star)
      return star
    }

    update() {
      // Update orbital motion
      this.orbitAngle += this.orbitSpeed
      this.targetX += this.speedX
      this.targetY += this.speedY

      // Move towards target with easing
      this.x += (this.targetX - this.x) * 0.1 + Math.cos(this.orbitAngle) * 2
      this.y += (this.targetY - this.y) * 0.1 + Math.sin(this.orbitAngle) * 2

      // Update rotation
      this.rotation += this.rotationSpeed

      // Fade out
      this.life -= this.decay

      // Apply gravity-like effect
      this.speedY += 0.2

      // Update element
      this.element.style.left = this.x + "px"
      this.element.style.top = this.y + "px"
      this.element.style.transform = `rotate(${this.rotation}deg) scale(${this.life})`
      this.element.style.opacity = this.life

      return this.life > 0
    }

    remove() {
      this.element.remove()
    }
  }

  // Star particle system
  const starParticles = []
  let lastSpawnTime = 0
  const spawnInterval = 30 // Spawn every 30ms when moving

  // Track mouse movement
  let mouseX = 0
  let mouseY = 0
  let lastMouseX = 0
  let lastMouseY = 0

  document.addEventListener("mousemove", (e) => {
    mouseX = e.clientX
    mouseY = e.clientY

    const now = Date.now()
    const mouseSpeed = Math.sqrt(Math.pow(mouseX - lastMouseX, 2) + Math.pow(mouseY - lastMouseY, 2))

    // Spawn more particles when moving fast
    if (now - lastSpawnTime > spawnInterval && mouseSpeed > 2) {
      const particleCount = Math.min(Math.floor(mouseSpeed / 10) + 1, 5)

      for (let i = 0; i < particleCount; i++) {
        // Add some randomness to spawn position for a more organic feel
        const offsetX = (Math.random() - 0.5) * 30
        const offsetY = (Math.random() - 0.5) * 30
        starParticles.push(new StarParticle(mouseX + offsetX, mouseY + offsetY))
      }
      lastSpawnTime = now
    }

    lastMouseX = mouseX
    lastMouseY = mouseY
  })

  // Animation loop for particles
  function animateStars() {
    for (let i = starParticles.length - 1; i >= 0; i--) {
      if (!starParticles[i].update()) {
        starParticles[i].remove()
        starParticles.splice(i, 1)
      }
    }
    requestAnimationFrame(animateStars)
  }

  animateStars()

  // Add a subtle glow cursor effect
  const customCursor = document.createElement("div")
  customCursor.className = "custom-cursor-glow"
  customCursor.style.cssText = `
    position: fixed;
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(255, 215, 0, 0.4), transparent);
    pointer-events: none;
    z-index: 9998;
    transform: translate(-50%, -50%);
    transition: width 0.2s, height 0.2s;
  `
  document.body.appendChild(customCursor)

  document.addEventListener("mousemove", (e) => {
    customCursor.style.left = e.clientX + "px"
    customCursor.style.top = e.clientY + "px"
  })

  // Pulse effect on click
  document.addEventListener("mousedown", () => {
    customCursor.style.width = "60px"
    customCursor.style.height = "60px"

    // Create explosion of stars on click
    for (let i = 0; i < 15; i++) {
      const angle = (Math.PI * 2 * i) / 15
      const star = new StarParticle(mouseX, mouseY)
      star.speedX = Math.cos(angle) * 10
      star.speedY = Math.sin(angle) * 10
      starParticles.push(star)
    }
  })

  document.addEventListener("mouseup", () => {
    customCursor.style.width = "40px"
    customCursor.style.height = "40px"
  })