# API Developer README
This quick reference guide for developers working on the credex-core API contains common processes, commands and links.

## Development Process
1. Create a branch from `dev` or an active project branch.
2. Make and test your changes.
3. Push changes and request merge back to your source branch with a detailed pull request.
4. Expect your remote branch and any codespaces on it with no uncommited changes to be deleted once the merge has been approved and completed.

## Running a local dev server
You have two options to start a local server for development:

1. `npm run docker:dev` fires up a dev server in an isolated Docker environment on your machine/codespace. As a virtual machine, this environment is nearly identical to the deployed production environment.
2. `npm run dev` fires up a dev server on your local machine/codespace using nodemon. Run directly on your machine, this is slightly more resource efficient than the above, and seems to have slightly better hot-reload functionality and error messaging, but might introduce irregularities vs the deployed environments.

## Testing Code
Assuming your code passes all automatic checks and can be compiled by the server, testing will usually be done by hitting an endpoint or a series of endpoints, and can be conducted using the commands outlined in the [Testing Guide](../tests/testing_guide.md).

These two critical "test" commands can be used to wipe, initialize, and progress your development databases:

Test commands:
- `npm test "cleardbs"` to clear the databases
- `npm test "forcedco"` to run the DCO and advance the day state, including new exchange rates.
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

### Cronjobs
- [Daily Credcoin Offering](../DCO.md)
- [Minute Transaction Queue](../MTQ.md)

### Development Guides
- [Endpoint Security and Authorization](../auth_security.md)
- [Logging Best Practices](../developerAPI/logging_best_practices.md)

### Database Schemas
- [ledgerSpace Schema](../developerAPI/ledgerSpace_schema.md)
- [searchSpace Schema](../developerAPI/searchSpace_schema.md)

### Testing
- [Testing Guide](../tests/testing_guide.md)
