# API Refactor Workplan

## Objective
Update the entire application to use GET and POST methods appropriately, addressing the issue of request variables being passed in the body for both GET and POST queries.

## Steps

1. Analyze Current Route Structure:
   - Review all route files (e.g., memberRoutes.ts, credexRoutes.ts) to identify GET and POST usage.
   - Identify routes that are using POST for data retrieval.
   - List all routes that are passing request variables in the body for GET requests.

2. Establish New API Design Principles:
   - Define clear guidelines for using GET and POST methods:
     - GET: For retrieving data (no body, use query parameters)
     - POST: For creating new resources
     - PUT: For updating existing resources
     - PATCH: For making minor changes to existing resources
     - DELETE: For removing resources
   - Standardize error responses and status codes across all routes.

3. Update Route Definitions:
   - Modify routes to adhere to RESTful principles:
     - Change data retrieval operations from POST to GET where appropriate.
     - Move request variables from body to query parameters for GET requests.
   - Update route documentation (e.g., Swagger/OpenAPI) to reflect changes.

4. Refactor Controllers and Services:
   - Update controller functions to handle data from query parameters instead of request body for GET requests.
   - Modify service layer functions to accommodate these changes.

5. Update Validation Middleware:
   - Adjust validation schemas to validate query parameters for GET requests.
   - Ensure proper error handling for invalid query parameters.

6. Documentation:
   - Update API documentation to reflect the new route structures and request formats.
   - Provide migration guides for any breaking changes.

## Next Steps
1. Begin with a detailed analysis of the current route structure across all files.
2. Draft the new API design principles.
3. Set up a development branch for the changes and begin implementation, following the steps outlined above.
4. Regular code reviews and testing throughout the process to ensure quality and consistency.

## Progress Tracking
- [ ] Current route structure analysis completed
- [ ] New API design principles drafted and approved
- [ ] Development branch set up
- [ ] Route updates implemented
- [ ] Controller and service refactoring completed
- [ ] Validation middleware updated
- [ ] Documentation updated
