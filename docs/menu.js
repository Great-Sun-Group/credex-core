// Menu state
let isMenuOpen = false;

// Menu data structure
const menuData = {
    "Credex in the World": {
        title: "The plausible promise of the credex ecosystem",
        items: {} // To be filled later
    },
    "Member Guides": {
        title: "How to use the credex ecosystem",
        items: {} // To be filled later
    },
    "Developer Guides": {
        title: "How to deploy and develop the credex ecosystem",
        items: {
            "README References": [
                { text: "Development of the credex-core API", link: "developerAPI/index.html" },
                { text: "Development of Client Apps", link: "developerClient/index.html" }
            ],
            "Getting Started": [
                { text: "Environment Setup", link: "environment_setup.html" },
                { text: "Connectors Workflow and Terraform Module", link: "deployment/connectors_workflow.html" },
                { text: "Databases Workflow and Terraform Module", link: "deployment/databases_workflow.html" },
                { text: "Application Workflow and Terraform Module", link: "deployment/app_workflow.html" }
            ],
            "Deployment": [
                { text: "Neo4j License Management", link: "deployment/neo4j_license.html" },
                { text: "Infrastructure Scaling Report", link: "deployment/instance_size_first200k.html" }
            ],
            "Member Modules": [
                { text: "Account", link: "developerClient/module/Account.html" },
                { text: "Avatar", link: "developerClient/module/Avatar.html" },
                { text: "Credex", link: "developerClient/module/Credex.html" },
                { text: "Member", link: "developerClient/module/Member.html" }
            ],
            "Admin Modules": [
                { text: "AdminDashboard", link: "developerClient/module/AdminDashboard.html" },
                { text: "DevAdmin", link: "developerClient/module/DevAdmin.html" }
            ],
            "Core Cronjobs": [
                { text: "Daily Credcoin Offering", link: "DCO.html" },
                { text: "Minute Transaction Queue", link: "MTQ.html" }
            ],
            "Database Schemas": [
                { text: "ledgerSpace Schema", link: "developerAPI/ledgerSpace_schema.html" },
                { text: "searchSpace Schema", link: "developerAPI/searchSpace_schema.html" }
            ],
            "Development Guides": [
                { text: "Endpoint Security and Authorization", link: "auth_security.html" },
                { text: "Swagger for AI-assisted client app dev", link: "developerClient/swagger.html" },
                { text: "Logging Best Practices", link: "developerAPI/logging_best_practices.html" }
            ],
            "Testing": [
                { text: "Testing Guide", link: "tests/testing_guide.html" }
            ]
        }
    },
    "Technical Auditing": {
        title: "Mathematical logic and patent presentation",
        items: {} // To be filled later
    },
    "Trust Again": {
        title: "How peer-to-peer trust between sovereign humans changes everything",
        items: {} // To be filled later
    }
};

// Create menu button
function createMenuButton() {
    const button = document.createElement('button');
    button.id = 'menuButton';
    button.innerHTML = '☰';
    button.onclick = toggleMenu;
    document.body.appendChild(button);
}

// Create menu overlay
function createMenuOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'menuOverlay';
    overlay.style.display = 'none';
    document.body.appendChild(overlay);
    
    const menuContent = document.createElement('div');
    menuContent.id = 'menuContent';
    overlay.appendChild(menuContent);
    
    // Add close button
    const closeButton = document.createElement('button');
    closeButton.id = 'closeMenuButton';
    closeButton.innerHTML = '×';
    closeButton.onclick = toggleMenu;
    menuContent.appendChild(closeButton);
    
    // Create main menu
    const mainMenu = document.createElement('div');
    mainMenu.id = 'mainMenu';
    menuContent.appendChild(mainMenu);
    
    // Add menu items
    Object.entries(menuData).forEach(([category, data]) => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'menuCategory';
        
        const categoryButton = document.createElement('button');
        categoryButton.className = 'categoryButton';
        categoryButton.innerHTML = `${category}<span class="subtitle">${data.title}</span>`;
        categoryButton.onclick = () => toggleCategory(categoryDiv);
        categoryDiv.appendChild(categoryButton);
        
        const submenu = document.createElement('div');
        submenu.className = 'submenu';
        
        // Add subcategories
        Object.entries(data.items).forEach(([subcategory, items]) => {
            const subcategoryDiv = document.createElement('div');
            subcategoryDiv.className = 'subcategory';
            
            const subcategoryButton = document.createElement('button');
            subcategoryButton.className = 'subcategoryButton';
            subcategoryButton.innerHTML = subcategory;
            subcategoryButton.onclick = () => toggleSubcategory(subcategoryDiv);
            subcategoryDiv.appendChild(subcategoryButton);
            
            const itemsList = document.createElement('div');
            itemsList.className = 'itemsList';
            
            items.forEach(item => {
                const link = document.createElement('a');
                link.href = item.link;
                link.textContent = item.text;
                itemsList.appendChild(link);
            });
            
            subcategoryDiv.appendChild(itemsList);
            submenu.appendChild(subcategoryDiv);
        });
        
        categoryDiv.appendChild(submenu);
        mainMenu.appendChild(categoryDiv);
    });
}

// Toggle menu visibility
function toggleMenu() {
    isMenuOpen = !isMenuOpen;
    const overlay = document.getElementById('menuOverlay');
    overlay.style.display = isMenuOpen ? 'flex' : 'none';
    document.body.style.overflow = isMenuOpen ? 'hidden' : 'auto';
}

// Toggle category expansion
function toggleCategory(categoryDiv) {
    const submenu = categoryDiv.querySelector('.submenu');
    const isExpanded = submenu.style.display === 'block';
    
    // Close all submenus first
    document.querySelectorAll('.submenu').forEach(menu => {
        menu.style.display = 'none';
    });
    
    if (!isExpanded) {
        submenu.style.display = 'block';
    }
}

// Toggle subcategory expansion
function toggleSubcategory(subcategoryDiv) {
    const itemsList = subcategoryDiv.querySelector('.itemsList');
    const isExpanded = itemsList.style.display === 'block';
    
    // Close all items lists in the same submenu first
    const submenu = subcategoryDiv.parentElement;
    submenu.querySelectorAll('.itemsList').forEach(list => {
        list.style.display = 'none';
    });
    
    if (!isExpanded) {
        itemsList.style.display = 'block';
    }
}

// Initialize menu
function initMenu() {
    createMenuButton();
    createMenuOverlay();
}

// Call initMenu when the DOM is loaded
document.addEventListener('DOMContentLoaded', initMenu);
