import swaggerJsdoc from "swagger-jsdoc";
import fs from "fs";
import path from "path";
import logger from "./logger";

// Import the same swagger config we use in the API
import { generateSwaggerSpec } from "../../config/swagger";

export async function generateApiDocs(): Promise<void> {
  try {
    // Get the full Swagger spec
    const swaggerSpec = await generateSwaggerSpec();

    // Create the static HTML with embedded Swagger spec
    const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="Credex API Reference Documentation" />
    <title>API Reference</title>
    <link rel="stylesheet" href="../style.css" />
    <script src="../menu.js"></script>
    
    <style>
      :root {
        --primary-color: #fbb016;
        --background-color: #06151f;
        --text-color: #ffffff;
        --muted-color: #04a0b2;
        --code-background: #000000;
        --scrollbar-width: 8px;
        --scrollbar-track: rgba(255, 255, 255, 0.1);
        --scrollbar-thumb: rgba(255, 255, 255, 0.3);
        --scrollbar-thumb-hover: rgba(255, 255, 255, 0.5);
        --topbar-height: 60px;
        --sidebar-width: 280px;
      }

      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
        scrollbar-width: thin;
        scrollbar-color: var(--scrollbar-thumb) var(--scrollbar-track);
      }

      *::-webkit-scrollbar {
        width: var(--scrollbar-width);
        height: var(--scrollbar-width);
      }

      *::-webkit-scrollbar-track {
        background: var(--scrollbar-track);
        border-radius: var(--scrollbar-width);
      }

      *::-webkit-scrollbar-thumb {
        background-color: var(--scrollbar-thumb);
        border-radius: var(--scrollbar-width);
        border: 2px solid var(--scrollbar-track);
      }

      *::-webkit-scrollbar-thumb:hover {
        background-color: var(--scrollbar-thumb-hover);
      }

      html, body {
        height: 100vh;
        margin: 0;
        padding: 0;
        overflow: hidden;
      }

      body {
        background: var(--background-color);
        color: var(--text-color);
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        line-height: 1.5;
        display: flex;
        flex-direction: column;
      }

      .topbar {
        height: var(--topbar-height);
        background: var(--background-color);
        border-bottom: 1px solid var(--muted-color);
        display: flex;
        align-items: center;
        padding: 0 20px;
        flex-shrink: 0;
        gap: 20px;
        position: relative;
        z-index: 100;
      }

      .topbar-logo {
        display: flex;
        align-items: center;
      }

      .topbar-logo img {
        height: 30px;
        width: auto;
      }

      .topbar-title {
        flex: 1;
        font-size: 1.5rem;
        font-weight: 500;
      }

      .topbar-menu {
        display: flex;
        gap: 10px;
      }

      .main-container {
        display: flex;
        height: calc(100vh - var(--topbar-height));
        overflow: hidden;
      }

      .sidebar {
        width: var(--sidebar-width);
        border-right: 1px solid var(--muted-color);
        overflow-y: auto;
        padding: 20px;
        flex-shrink: 0;
        background: var(--background-color);
      }

      .main-content {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
        min-width: 0;
      }

      .module-section {
        margin-bottom: 30px;
      }

      .module-title {
        color: var(--primary-color);
        font-size: 1.1em;
        margin-bottom: 15px;
        padding-bottom: 5px;
        border-bottom: 1px solid var(--muted-color);
        font-weight: 500;
      }

      .nav-item {
        margin-bottom: 8px;
      }

      .nav-link {
        color: var(--text-color);
        text-decoration: none;
        display: block;
        padding: 8px 12px;
        border-radius: 4px;
        transition: all 0.2s ease;
        font-size: 0.9rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .nav-link:hover {
        background: rgba(255, 255, 255, 0.1);
      }

      .nav-link.active {
        background: var(--primary-color);
        color: var(--background-color);
      }

      .endpoint {
        margin-bottom: 40px;
        padding: 20px;
        border: 1px solid var(--muted-color);
        border-radius: 8px;
        background: rgba(255, 255, 255, 0.05);
      }

      .endpoint-header {
        display: flex;
        align-items: center;
        gap: 15px;
        margin-bottom: 20px;
      }

      .method {
        display: inline-block;
        padding: 6px 12px;
        border-radius: 4px;
        font-weight: 500;
        min-width: 80px;
        text-align: center;
        font-size: 0.9rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        background: var(--muted-color);
        color: var(--background-color);
      }

      .path {
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
        font-size: 1.1em;
        word-break: break-all;
      }

      .description {
        margin: 1rem 0;
        line-height: 1.6;
      }

      .section {
        margin: 2rem 0;
      }

      .section-title {
        color: var(--primary-color);
        margin-bottom: 1rem;
        font-size: 1.1em;
        font-weight: 500;
      }

      pre {
        background: var(--code-background);
        padding: 15px;
        overflow-x: auto;
        border-radius: 4px;
        margin: 10px 0;
        border: 1px solid rgba(255, 255, 255, 0.1);
      }

      code {
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
        font-size: 0.9em;
        line-height: 1.5;
      }

      .response {
        margin: 1rem 0;
        padding: 15px;
        border-radius: 4px;
        background: rgba(255, 255, 255, 0.05);
      }

      .response.success { border-left: 4px solid var(--muted-color); }
      .response.error { border-left: 4px solid #f93e3e; }
      .response.warning { border-left: 4px solid var(--primary-color); }

      @media (max-width: 768px) {
        .main-container {
          flex-direction: column;
        }

        .sidebar {
          width: 100%;
          max-height: 300px;
        }

        .topbar {
          padding: 0 10px;
        }

        .topbar-title {
          font-size: 1.2rem;
        }
      }
    </style>
  </head>
  <body>
    <header class="topbar">
      <div class="topbar-logo">
        <img src="../images/logo_symbol.png" alt="Credex Logo" />
      </div>
      <div class="topbar-title">API Reference</div>
      <div class="topbar-menu">
        <div id="menuButton" onclick="window.location.href='../menu.html'">
          <img src="../images/logo_symbol.png" alt="Menu" class="menu-logo">
          <span class="menu-text">MENU</span>
        </div>
        </div>
      </div>
    </header>

    <div class="main-container">
      <nav class="sidebar" id="sidebar"></nav>
      <main class="main-content">
        <div id="endpoint-content"></div>
      </main>
    </div>

    <script>
      // API Specification
      const apiSpec = ${JSON.stringify(swaggerSpec, null, 2)};

      // Module order
      const moduleOrder = ['Member', 'Account', 'Credex', 'AccountInternal', 'AssetMarker', 'Recurring', 'Admin', 'DevAdmin'];

      function escapeHtml(unsafe) {
        return unsafe
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;")
          .replace(/'/g, "&#039;");
      }

      function getModuleForPath(path) {
        // Use the tags from the swagger spec to determine the module
        const pathObj = apiSpec.paths[path];
        if (!pathObj) return 'Other';
        
        // Get the first method (e.g. post, get, etc)
        const method = Object.values(pathObj)[0];
        if (!method || !method.tags || !method.tags.length) return 'Other';
        
        // Get the first tag
        const tag = method.tags[0];
        
        // Map tags to modules
        const tagToModule = {
          'Members': 'Member',
          'Accounts': 'Account',
          'Credex': 'Credex',
          'AccountsInternal': 'AccountInternal',
          'AssetMarker': 'AssetMarker',
          'Recurring': 'Recurring',
          'Admin': 'Admin',
          'DevAdmin': 'DevAdmin'
        };
        
        return tagToModule[tag] || 'Other';
      }

      function generateNavigation() {
        const sidebar = document.getElementById('sidebar');
        const paths = Object.keys(apiSpec.paths).sort();
        
        // Group paths by module
        const moduleGroups = {};
        paths.forEach(path => {
          const module = getModuleForPath(path);
          if (!moduleGroups[module]) {
            moduleGroups[module] = [];
          }
          moduleGroups[module].push(path);
        });

        // Generate HTML for each module section
        const navHtml = moduleOrder.map(module => {
          if (!moduleGroups[module]) return '';
          
          const pathsHtml = moduleGroups[module].map(path => {
            const id = path.replace(/[^a-zA-Z0-9]/g, '_');
            return \`
              <div class="nav-item">
                <a href="#\${id}" class="nav-link" data-path="\${path}">\${path}</a>
              </div>
            \`;
          }).join('');

          return \`
            <div class="module-section">
              <div class="module-title">\${module}</div>
              \${pathsHtml}
            </div>
          \`;
        }).join('');
        
        sidebar.innerHTML = navHtml;
      }

      function generateEndpointDocs(path) {
        const methods = apiSpec.paths[path];
        return Object.entries(methods).map(([method, details]) => {
          const responses = Object.entries(details.responses || {}).map(([code, response]) => {
            const className = code.startsWith('2') ? 'success' : 
                            code.startsWith('4') ? 'error' : 'warning';
            return \`
              <div class="response \${className}">
                <div class="section-title">Status \${code}: \${response.description}</div>
                <pre><code>\${escapeHtml(JSON.stringify(response.content?.['application/json']?.schema || {}, null, 2))}</code></pre>
              </div>
            \`;
          }).join('');

          const parameters = details.parameters ? \`
            <div class="section">
              <div class="section-title">Parameters</div>
              <pre><code>\${escapeHtml(JSON.stringify(details.parameters, null, 2))}</code></pre>
            </div>
          \` : '';

          const requestBody = details.requestBody ? \`
            <div class="section">
              <div class="section-title">Request Body</div>
              <pre><code>\${escapeHtml(JSON.stringify(details.requestBody.content?.['application/json']?.schema || {}, null, 2))}</code></pre>
            </div>
          \` : '';

          return \`
            <div class="endpoint" id="\${path.replace(/[^a-zA-Z0-9]/g, '_')}">
              <div class="endpoint-header">
                <span class="method \${method.toLowerCase()}">\${method.toUpperCase()}</span>
                <span class="path">\${path}</span>
              </div>
              <div class="description">\${details.description || details.summary || ''}</div>
              \${parameters}
              \${requestBody}
              <div class="section">
                <div class="section-title">Responses</div>
                \${responses}
              </div>
            </div>
          \`;
        }).join('');
      }

      // Handle navigation
      document.addEventListener('click', (e) => {
        if (e.target.classList.contains('nav-link')) {
          e.preventDefault();
          const links = document.querySelectorAll('.nav-link');
          links.forEach(link => link.classList.remove('active'));
          e.target.classList.add('active');
          
          const path = e.target.getAttribute('data-path');
          const endpointContent = document.getElementById('endpoint-content');
          endpointContent.innerHTML = generateEndpointDocs(path);
          
          // Update URL hash without scrolling
          history.pushState(null, null, e.target.getAttribute('href'));
        }
      });

      // Initialize documentation
      document.addEventListener('DOMContentLoaded', () => {
        try {
          generateNavigation();
          
          // Load initial endpoint if hash exists
          const hash = window.location.hash.substring(1);
          if (hash) {
            const link = document.querySelector(\`[href="#\${hash}"]\`);
            if (link) {
              link.classList.add('active');
              const path = link.getAttribute('data-path');
              document.getElementById('endpoint-content').innerHTML = generateEndpointDocs(path);
            }
          }
        } catch (err) {
          console.error('Failed to generate documentation:', err);
          document.getElementById('endpoint-content').innerHTML = 
            '<p style="color: red; padding: 1rem;">Error generating documentation: ' + err.message + '</p>';
        }
      });

      // Handle hash changes
      window.addEventListener('hashchange', () => {
        const links = document.querySelectorAll('.nav-link');
        links.forEach(link => link.classList.remove('active'));
        const hash = window.location.hash;
        if (hash) {
          const activeLink = document.querySelector(\`[href="\${hash}"]\`);
          if (activeLink) {
            activeLink.classList.add('active');
            const path = activeLink.getAttribute('data-path');
            document.getElementById('endpoint-content').innerHTML = generateEndpointDocs(path);
          }
        }
      });
    </script>
  </body>
</html>`;

    // Ensure the docs/develop directory exists
    const docsDir = path.join(process.cwd(), "docs/develop");
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
      logger.debug(`Created directory: ${docsDir}`);
    }

    // Write the HTML documentation
    const htmlOutputPath = path.join(docsDir, "api_reference.html");
    await fs.promises.writeFile(htmlOutputPath, html);
    logger.info(`Generated API documentation at: ${htmlOutputPath}`);

    // Write the raw Swagger specification
    const swaggerOutputPath = path.join(docsDir, "swagger.json");
    await fs.promises.writeFile(
      swaggerOutputPath,
      JSON.stringify(swaggerSpec, null, 2)
    );
    logger.info(`Generated Swagger specification at: ${swaggerOutputPath}`);
  } catch (error) {
    logger.error(
      "Failed to generate API documentation:",
      error instanceof Error ? error.message : String(error)
    );
    throw error;
  }
}

// Allow running directly
if (require.main === module) {
  generateApiDocs().catch((error) => {
    logger.error(
      "Documentation generation failed:",
      error instanceof Error ? error.message : String(error)
    );
    process.exit(1);
  });
}
