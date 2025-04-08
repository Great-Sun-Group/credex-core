// Simple dropdown functionality
document.addEventListener('DOMContentLoaded', function() {
  // Direct event listeners for dropdown toggles
  const dropdownToggles = document.querySelectorAll('.dropdown-toggle');
  
  dropdownToggles.forEach(toggle => {
    toggle.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
      
      const dropdown = this.parentElement;
      
      // Close all other dropdowns
      document.querySelectorAll('.dropdown').forEach(item => {
        if (item !== dropdown) {
          item.classList.remove('active');
        }
      });
      
      // Toggle this dropdown
      dropdown.classList.toggle('active');
    });
  });
  
  // Close dropdowns when clicking outside
  document.addEventListener('click', function(e) {
    if (!e.target.closest('.dropdown')) {
      document.querySelectorAll('.dropdown').forEach(dropdown => {
        dropdown.classList.remove('active');
      });
    }
  });
});
