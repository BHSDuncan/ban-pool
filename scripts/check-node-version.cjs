#!/usr/bin/env node

function fail(message) {
	process.stderr.write(message + '\n');
	process.exit(1);
}

var raw = process.versions && process.versions.node ? process.versions.node : '';
var parts = raw.split('.').map(function (value) {
	return Number(value);
});

var major = parts[0] || 0;
var minor = parts[1] || 0;

var ok = (major === 20 && minor >= 19) || major >= 22;

if (!ok) {
	fail(
		'Node ' +
			raw +
			' is unsupported. Use Node ^20.19.0 or >=22.12.0 (for example: `nvm install 22 && nvm use 22`).'
	);
}
