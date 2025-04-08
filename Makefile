diff:
	@bash projects/merge/getDiff.sh $(filter-out $@,$(MAKECMDGOALS))

api_ref_docs:
	npx ts-node src/utils/generateApiDocs.ts

%:
	@:
