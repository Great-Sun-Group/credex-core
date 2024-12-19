.PHONY: diff

diff:
	@bash projects/merge/getDiff.sh $(filter-out $@,$(MAKECMDGOALS))

%:
	@:
# Documentation targets
.PHONY: docs docs-dev docs-watch

# Generate API documentation
docs:
	@echo "Generating API documentation..."
	npm run build
	node build/src/utils/generateApiDocs.js
	@echo "Documentation generated in docs/develop/"

# Generate documentation in development (without full build)
docs-dev:
	@echo "Generating API documentation in development mode..."
	npx tsc src/utils/generateApiDocs.ts --outDir ./build/src/utils
	node build/src/utils/generateApiDocs.js
	@echo "Documentation generated in docs/develop/"

# Watch for changes and regenerate documentation
docs-watch:
	@echo "Watching for changes to regenerate documentation..."
	npx nodemon --watch src -e ts --exec "make docs-dev"

# Help target
.PHONY: help
help:
	@echo "Available targets:"
	@echo "  docs        - Generate API documentation (full build)"
	@echo "  docs-dev    - Generate API documentation (quick build for development)"
	@echo "  docs-watch  - Watch for changes and regenerate documentation"
	@echo "  help        - Show this help message"

# Default target
.DEFAULT_GOAL := help
