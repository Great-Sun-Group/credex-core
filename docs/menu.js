// Menu state
let isMenuOpen = false;

// Get relative path to docs root
function getBasePath() {
  const path = window.location.pathname;
  const parts = path.split("/");
  const depth = parts.slice(parts.indexOf("docs") + 1).filter(Boolean).length;
  return "../".repeat(depth - 1);
}

// Menu data structure
const menuData = {
  "Credex in the World": {
    title: "The plausible promise of the credex ecosystem",
    items: {
      "Strategic Orientation": [
        {
          text: "Our Campaign",
          link: "strategic-orientation/our_campaign.html",
        },
        {
          text: "African Heart",
          link: "strategic-orientation/african_heart.html",
        },
        {
          text: "Walk the Talk",
          link: "strategic-orientation/walk_the_talk.html",
        },
      ],
      Business: [
        {
          text: "COMING SOON",
          link: "",
        },
      ],
      "Political Impact": [
        {
          text: "COMING SOON",
          link: "",
        },
      ],
    }, // To be filled later
  },
  "Member Guides": {
    title: "How to use the credex ecosystem **COMING SOON**",
    items: [
      { text: "Glossary", link: "member-guides/glossary.html" },
    ]
  },
  "Developer Guides": {
    title: "How to deploy and develop the credex ecosystem",
    items: {
      "README References": [
        { text: "Development README", link: "develop/index.html" },
        {
          text: "Credex-core API Developer Reference",
          link: "develop/developerAPI/index.html",
        },
        {
          text: "Client App Developer Reference",
          link: "develop/developerClient/index.html",
        },
        {
          text: "Credex-Core Software License",
          link: "develop/license.html",
        },
      ],
      "Getting Started": [
        {
          text: "Development Environment Setup",
          link: "develop/dev_env_setup.html",
        },
        {
          text: "Deployed Environments Setup",
          link: "develop/deployed_env_setup.html",
        },
      ],
      Deployment: [
        {
          text: "Connectors Workflow and Terraform Module",
          link: "develop/deployment/connectors_workflow.html",
        },
        {
          text: "Databases Workflow and Terraform Module",
          link: "develop/deployment/databases_workflow.html",
        },
        {
          text: "Application Workflow and Terraform Module",
          link: "develop/deployment/app_workflow.html",
        },
        {
          text: "Neo4j License Management",
          link: "develop/deployment/neo4j_license.html",
        },
        {
          text: "Infrastructure Scaling Report",
          link: "develop/deployment/instance_sizing.html",
        },
      ],
      "Member Modules": [
        /*
        {
          text: "Account",
          link: "develop/developerClient/module/Account.html",
        },
        { text: "Avatar", link: "develop/developerClient/module/Avatar.html" },
        { text: "Credex", link: "develop/developerClient/module/Credex.html" },
        { text: "Member", link: "develop/developerClient/module/Member.html" },
      ],
      "Admin Modules": [
        {
          text: "AdminDashboard",
          link: "develop/developerClient/module/AdminDashboard.html",
        },
        {
          text: "DevAdmin",
          link: "develop/developerClient/module/DevAdmin.html",
        },
      */
      ],
      "Core Cronjobs": [
        { text: "Daily Credcoin Offering", link: "full-audit/DCO.html" },
        { text: "Minute Transaction Queue", link: "full-audit/MTQ.html" },
      ],
      "Database Schemas": [
        {
          text: "ledgerSpace Schema",
          link: "develop/developerAPI/ledgerSpace_schema.html",
        },
        {
          text: "searchSpace Schema",
          link: "develop/developerAPI/searchSpace_schema.html",
        },
      ],
      "Development Guides": [
        {
          text: "Endpoint Security and Authorization",
          link: "develop/auth_security.html",
        },
        {
          text: "Swagger for AI-assisted client app dev",
          link: "develop/developerClient/swagger.html",
        },
        {
          text: "Logging Best Practices",
          link: "develop/developerAPI/logging_best_practices.html",
        },
      ],
      Testing: [
        { text: "Testing Guide", link: "develop/tests/testing_guide.html" },
      ],
    },
  },
  "Technical Auditing": {
    title: "Mathematical logic and conceptual specifics",
    items: {
      "Core Cronjobs": [
        { text: "Daily Credcoin Offering", link: "full-audit/DCO.html" },
        { text: "Minute Transaction Queue", link: "full-audit/MTQ.html" },
      ],
    },
  },
  "Trust Again": {
    title: "How peer-to-peer trust between sovereign humans changes everything",
    items: [
      { text: "Credex", link: "trust-again/01-credex.html" },
      {
        text: "Credcoin: Foundations",
        link: "trust-again/02-credcoin_foundations.html",
      },
      {
        text: "Credcoin: Markets",
        link: "trust-again/03-credcoin_markets.html",
      },
      {
        text: "Credcoin: Economic Reality",
        link: "trust-again/04-credcoin_economic_reality.html",
      },
      {
        text: "Corporations & Compliance",
        link: "trust-again/05-corporations_and_compliance.html",
      },
      {
        text: "Trusted Intermediary",
        link: "trust-again/06-trusted_intermediary.html",
      },
      {
        text: "Organic Economics",
        link: "trust-again/07-organic_economics.html",
      },
      {
        text: "Societal Impact",
        link: "trust-again/08-societal_impact.html",
      },
      {
        text: "Utilitarian Value",
        link: "trust-again/09-utilitarian_value.html",
      },
    ],
  },
};

// Create menu button
function createMenuButton() {
  const button = document.createElement("div");
  button.id = "menuButton";
  button.onclick = toggleMenu;

  // Add logo
  const logo = document.createElement("img");
  logo.src = getBasePath() + "images/logo.png";
  logo.alt = "Credex Logo";
  logo.className = "menu-logo";
  button.appendChild(logo);

  // Add menu text
  const menuText = document.createElement("span");
  menuText.className = "menu-text";
  menuText.textContent = "MENU";
  button.appendChild(menuText);

  document.body.appendChild(button);
}

// Create menu overlay
function createMenuOverlay() {
  const overlay = document.createElement("div");
  overlay.id = "menuOverlay";
  overlay.style.display = "none";
  document.body.appendChild(overlay);

  const menuContent = document.createElement("div");
  menuContent.id = "menuContent";
  overlay.appendChild(menuContent);

  // Add logo to menu overlay
  const overlayLogo = document.createElement("div");
  overlayLogo.className = "overlay-logo";
  const logoImg = document.createElement("img");
  logoImg.src = getBasePath() + "images/logo.png";
  logoImg.alt = "Credex Logo";
  overlayLogo.appendChild(logoImg);
  menuContent.appendChild(overlayLogo);

  // Add close button
  const closeButton = document.createElement("button");
  closeButton.id = "closeMenuButton";
  closeButton.innerHTML = "×";
  closeButton.onclick = toggleMenu;
  menuContent.appendChild(closeButton);

  // Create main menu
  const mainMenu = document.createElement("div");
  mainMenu.id = "mainMenu";
  menuContent.appendChild(mainMenu);

  // Add HOME link at the top
  const homeLink = document.createElement("a");
  homeLink.href = getBasePath() + "index.html";
  homeLink.style.display = "block";
  homeLink.style.padding = "10px 20px";
  homeLink.style.fontSize = "18px";
  homeLink.style.fontWeight = "bold";
  homeLink.style.color = "#FBB016";
  homeLink.style.textDecoration = "none";
  homeLink.style.borderBottom = "1px solid #eee";
  homeLink.style.marginBottom = "10px";
  homeLink.textContent = "MyCredex.app: Our portal to the credex ecosystem";
  mainMenu.appendChild(homeLink);

  // Add menu items
  Object.entries(menuData).forEach(([category, data]) => {
    const categoryDiv = document.createElement("div");
    categoryDiv.className = "menuCategory";

    const categoryButton = document.createElement("button");
    categoryButton.className = "categoryButton";
    categoryButton.innerHTML = `${category}<span class="subtitleButton">${data.title}</span>`;
    categoryButton.onclick = () => toggleCategory(categoryDiv);
    categoryDiv.appendChild(categoryButton);

    const submenu = document.createElement("div");
    submenu.className = "submenu";

    // Handle both array and object items
    if (Array.isArray(data.items)) {
      // Direct array of items
      const itemsList = document.createElement("div");
      itemsList.className = "itemsList";
      itemsList.style.display = "none"; // Initially hidden

      data.items.forEach((item) => {
        const link = document.createElement("a");
        link.href = getBasePath() + item.link;
        link.textContent = item.text;
        itemsList.appendChild(link);
      });

      submenu.appendChild(itemsList);
    } else {
      // Object with subcategories
      Object.entries(data.items).forEach(([subcategory, items]) => {
        const subcategoryDiv = document.createElement("div");
        subcategoryDiv.className = "subcategory";

        const subcategoryButton = document.createElement("button");
        subcategoryButton.className = "subcategoryButton";
        subcategoryButton.innerHTML = subcategory;
        subcategoryButton.onclick = () => toggleSubcategory(subcategoryDiv);
        subcategoryDiv.appendChild(subcategoryButton);

        const itemsList = document.createElement("div");
        itemsList.className = "itemsList";

        items.forEach((item) => {
          const link = document.createElement("a");
          link.href = getBasePath() + item.link;
          link.textContent = item.text;
          itemsList.appendChild(link);
        });

        subcategoryDiv.appendChild(itemsList);
        submenu.appendChild(subcategoryDiv);
      });
    }

    categoryDiv.appendChild(submenu);
    mainMenu.appendChild(categoryDiv);
  });
}

// Toggle menu visibility
function toggleMenu() {
  isMenuOpen = !isMenuOpen;
  const overlay = document.getElementById("menuOverlay");
  overlay.style.display = isMenuOpen ? "flex" : "none";
  document.body.style.overflow = isMenuOpen ? "hidden" : "auto";
}

// Toggle category expansion
function toggleCategory(categoryDiv) {
  const submenu = categoryDiv.querySelector(".submenu");
  const isExpanded = submenu.style.display === "block";

  // Close all submenus first
  document.querySelectorAll(".submenu").forEach((menu) => {
    menu.style.display = "none";
  });

  if (!isExpanded) {
    submenu.style.display = "block";
  }

  // For categories with direct items (no subcategories)
  const itemsList = submenu.querySelector(".itemsList");
  if (itemsList && !isExpanded) {
    itemsList.style.display = "block";
  }
}

// Toggle subcategory expansion
function toggleSubcategory(subcategoryDiv) {
  const itemsList = subcategoryDiv.querySelector(".itemsList");
  const isExpanded = itemsList.style.display === "block";

  // Close all items lists in the same submenu first
  const submenu = subcategoryDiv.parentElement;
  submenu.querySelectorAll(".itemsList").forEach((list) => {
    list.style.display = "none";
  });

  if (!isExpanded) {
    itemsList.style.display = "block";
  }
}

// Initialize menu
function initMenu() {
  createMenuButton();
  createMenuOverlay();
}

// Call initMenu when the DOM is loaded
document.addEventListener("DOMContentLoaded", initMenu);
