.PHONY: diff apidoc

diff:
	@bash projects/merge/getDiff.sh $(filter-out $@,$(MAKECMDGOALS))

apidoc:
	@echo "Generating API documentation..."
	@npx ts-node src/utils/generateApiDocs.ts

%:
	@:
