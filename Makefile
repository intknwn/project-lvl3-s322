install: install-deps install-flow-typed

run:
	npx babel-node -- src/bin/page-loader.js --output /var/tmp/mam3 http://might-and-magic.com

install-deps:
	npm install

install-flow-typed:
	npx flow-typed install

build:
	rm -rf dist
	npm run build

test:
	npm test

testwatch:
	npm run testwatch

check-types:
	npx flow

lint:
	npx eslint .

publish:
	npm publish

.PHONY: test