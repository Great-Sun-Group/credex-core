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
    const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="description" content="Credex API Reference Documentation" />
    <title>API Reference</title>
    <link rel="stylesheet" href="../style.css" />
  </head>
  <body>
    <!-- Navigation Component -->
    <div id="nav-container"></div>

    <!-- Page Content -->

    <div class="api-container">
      <div class="api-sidebar" id="sidebar"></div>
      <div class="api-content" id="endpoint-content"></div>
    </div>

    <!-- Footer Component -->
    <div id="footer-develop"></div>

    <!-- Template System JavaScript -->
    <script src="../js/template.js"></script>
    <script src="../js/dropdown.js"></script>

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
          'AccountInternal': 'AccountInternal',
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
