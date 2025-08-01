/**
 * Credex Documentation Site Template System
 */

document.addEventListener("DOMContentLoaded", function () {
  // Load components
  loadComponent("header-trust-again", "components/header-trust-again.html");
  loadComponent("header-due-diligence", "components/header-due-diligence.html");
  loadComponent("header-dd-business", "components/header-dd-business.html");
  loadComponent("header-develop", "components/header-develop.html");
  loadComponent("nav-container", "components/nav.html");
  loadComponent("footer-trust-again", "components/footer-trust-again.html");
  loadComponent("footer-due-diligence", "components/footer-due-diligence.html");
  loadComponent("footer-develop", "components/footer-develop.html");
});

/**
 * Loads a component into a container element
 */
function loadComponent(containerId, componentPath) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // Adjust path based on current directory
  // For any page in a subdirectory of docs, we need to go up one level
  let basePath = "";

  // Check if templateLevels is defined (for deeper subdirectories)
  if (window.templateLevels) {
    basePath = "../".repeat(window.templateLevels);
  } else if (
    window.location.pathname.includes("/docs/") &&
    window.location.pathname.split("/docs/")[1].includes("/")
  ) {
    basePath = "../";
  }

  const fullPath = basePath + componentPath;

  fetch(fullPath)
    .then((response) => response.text())
    .then((html) => {
      container.innerHTML = html;

      // Adjust image paths if templateLevels is defined
      if (
        window.templateLevels &&
        container.querySelectorAll('img[src^="../"]').length > 0
      ) {
        container.querySelectorAll('img[src^="../"]').forEach((img) => {
          // Remove the initial "../" and add the correct number of "../"
          const srcPath = img.getAttribute("src").substring(3);
          img.setAttribute(
            "src",
            "../".repeat(window.templateLevels) + srcPath
          );
        });
      }

      // Initialize navigation after it's loaded
      if (containerId === "nav-container") {
        setupDropdowns();
      }
    })
    .catch((error) => {
      console.error(`Error loading component ${fullPath}:`, error);
    });
}

/**
 * Sets up dropdown functionality
 */
function setupDropdowns() {
  const dropdowns = document.querySelectorAll(".dropdown");

  dropdowns.forEach((dropdown) => {
    const toggle = dropdown.querySelector(".dropdown-toggle");

    if (toggle) {
      toggle.addEventListener("click", function (e) {
        e.preventDefault();
        e.stopPropagation();

        // Close all other dropdowns
        dropdowns.forEach((other) => {
          if (other !== dropdown) {
            other.classList.remove("active");
          }
        });

        // Toggle this dropdown
        dropdown.classList.toggle("active");
      });
    }
  });

  // Close dropdowns when clicking outside
  document.addEventListener("click", function (e) {
    if (!e.target.closest(".dropdown")) {
      dropdowns.forEach((dropdown) => {
        dropdown.classList.remove("active");
      });
    }
  });

  // Setup mobile menu toggle
  const mobileToggle = document.querySelector(".mobile-menu-toggle");
  const navItems = document.querySelector(".nav-items");

  if (mobileToggle && navItems) {
    mobileToggle.addEventListener("click", function () {
      this.classList.toggle("active");
      navItems.classList.toggle("active");
    });
  }
}
