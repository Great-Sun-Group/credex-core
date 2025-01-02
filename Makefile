.PHONY: diff apidoc dev test

diff:
	@bash projects/merge/getDiff.sh $(filter-out $@,$(MAKECMDGOALS))

apidoc:
	@echo "Generating API documentation..."
	@npx ts-node src/utils/generateApiDocs.ts

dev:
	npm run docker:dev

test:
	npm run docker:test

%:
	@:
