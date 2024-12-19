.PHONY: diff

diff:
	@bash projects/merge/getDiff.sh $(filter-out $@,$(MAKECMDGOALS))

%:
	@:
