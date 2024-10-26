# Client App Developer README
This quick reference guide for developers working on client apps for the credex-core API contains common processes, commands and links.

## Development Process
1. Create a codespace on `prod` or pull the latest from that branch to your local to run a dev server on the latest stable code.
2. `npm run docker:dev` fires up a dev server in an isolated Docker environment on your machine/codespace and exposes the API on port 3000.
3. You can now hit the server using localhost:3000 or at the codespace url with the Github Token in the header.
   - The codespace url is available in the PORT window, and the Github Token can be printed with `echo $GITHUB_TOKEN` and sent in the request header as `X-Github-Token`.
4. Use the codebase you are developing to hit the dev server endpoints and process the results.

These endpoints can be used to wipe, initialize, and progress your development databases. They are not active in the production deployment.
- `v1/dev/clearDevDBs` to clear the databases
- `v1/dev/forceDCO` to run the DCO and advance the day state, including new exchange rates.
  - If the database has been wiped or is new, this will first create initialization nodes and relationship then run the first DCO, bringing the credex ecosystem online.

## Resources

### Getting Started
- [Environment Setup](../environment_setup.md)

### Member Modules
- [Account](../developerClient/module/Account.md)
- [Avatar](../developerClient/module/Avatar.md)
- [Credex](../developerClient/module/Credex.md)
- [Member](../developerClient/module/Member.md)

### Admin Modules
- [AdminDashboard](../developerClient/module/AdminDashboard.md)
- [DevAdmin](../developerClient/module/DevAdmin.md)

### Development Guides
- [Endpoint Security and Authorization](../auth_security.md)
- [Swagger for AI-assisted client app dev](../developerClient/swagger.md)
