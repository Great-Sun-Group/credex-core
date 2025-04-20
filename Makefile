diff:
	@bash projects/merge/getDiff.sh $(filter-out $@,$(MAKECMDGOALS))

api_ref_docs:
	npx ts-node src/utils/generateApiDocs.ts

credex-core:
	sudo BUILD_TARGET=development NODE_ENV=development docker compose -f docker-compose.yml -f docker-compose.dev.yml --profile dev up --build

%:
	@:
