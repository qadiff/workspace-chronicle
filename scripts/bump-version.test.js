const assert = require('assert');
const {
	validateVersionFormat,
	parseVersion,
	formatVersion,
	bumpPatch,
	tagExists,
} = require('./bump-version');

describe('bump-version', function () {
	describe('validateVersionFormat', function () {
		it('should accept valid semver versions', function () {
			assert.doesNotThrow(() => validateVersionFormat('0.0.1'));
			assert.doesNotThrow(() => validateVersionFormat('1.2.3'));
			assert.doesNotThrow(() => validateVersionFormat('10.20.30'));
			assert.doesNotThrow(() => validateVersionFormat('999.999.999'));
		});

		it('should reject versions with non-numeric characters', function () {
			assert.throws(
				() => validateVersionFormat('0.0.x'),
				/Invalid version format/
			);
			assert.throws(
				() => validateVersionFormat('1.2.3-beta'),
				/Invalid version format/
			);
			assert.throws(
				() => validateVersionFormat('1.2.3-alpha.1'),
				/Invalid version format/
			);
		});

		it('should reject versions with shell metacharacters (command injection)', function () {
			assert.throws(
				() => validateVersionFormat('1.0.0; rm -rf /'),
				/Invalid version format/
			);
			assert.throws(
				() => validateVersionFormat('1.0.0 && echo pwned'),
				/Invalid version format/
			);
			assert.throws(
				() => validateVersionFormat('1.0.0`whoami`'),
				/Invalid version format/
			);
			assert.throws(
				() => validateVersionFormat('$(cat /etc/passwd)'),
				/Invalid version format/
			);
		});

		it('should reject incomplete versions', function () {
			assert.throws(() => validateVersionFormat('1'), /Invalid version format/);
			assert.throws(
				() => validateVersionFormat('1.2'),
				/Invalid version format/
			);
			assert.throws(
				() => validateVersionFormat('1.2.'),
				/Invalid version format/
			);
			assert.throws(
				() => validateVersionFormat('.1.2'),
				/Invalid version format/
			);
		});

		it('should reject empty or invalid input', function () {
			assert.throws(() => validateVersionFormat(''), /Invalid version format/);
			assert.throws(
				() => validateVersionFormat('...'),
				/Invalid version format/
			);
			assert.throws(
				() => validateVersionFormat('abc'),
				/Invalid version format/
			);
		});
	});

	describe('parseVersion', function () {
		it('should parse valid versions correctly', function () {
			const result = parseVersion('1.2.3');
			assert.strictEqual(result.major, '1');
			assert.strictEqual(result.minor, '2');
			assert.strictEqual(result.patch, 3);
		});

		it('should parse zero version', function () {
			const result = parseVersion('0.0.0');
			assert.strictEqual(result.major, '0');
			assert.strictEqual(result.minor, '0');
			assert.strictEqual(result.patch, 0);
		});

		it('should parse large version numbers', function () {
			const result = parseVersion('100.200.300');
			assert.strictEqual(result.major, '100');
			assert.strictEqual(result.minor, '200');
			assert.strictEqual(result.patch, 300);
		});

		it('should throw for invalid version formats', function () {
			assert.throws(() => parseVersion('1.2.x'), /Invalid version format/);
			assert.throws(
				() => parseVersion('1.2.3-beta'),
				/Invalid version format/
			);
		});
	});

	describe('formatVersion', function () {
		it('should format version object to string', function () {
			assert.strictEqual(
				formatVersion({ major: '1', minor: '2', patch: 3 }),
				'1.2.3'
			);
		});

		it('should handle zero values', function () {
			assert.strictEqual(
				formatVersion({ major: '0', minor: '0', patch: 0 }),
				'0.0.0'
			);
		});

		it('should handle large numbers', function () {
			assert.strictEqual(
				formatVersion({ major: '100', minor: '200', patch: 300 }),
				'100.200.300'
			);
		});
	});

	describe('bumpPatch', function () {
		it('should increment patch version', function () {
			assert.strictEqual(bumpPatch(0, 'up'), 1);
			assert.strictEqual(bumpPatch(5, 'up'), 6);
			assert.strictEqual(bumpPatch(99, 'up'), 100);
		});

		it('should decrement patch version', function () {
			assert.strictEqual(bumpPatch(1, 'down'), 0);
			assert.strictEqual(bumpPatch(10, 'down'), 9);
			assert.strictEqual(bumpPatch(100, 'down'), 99);
		});

		it('should throw when decrementing from zero', function () {
			assert.throws(() => bumpPatch(0, 'down'), /Cannot decrement/);
		});

		it('should return unchanged for unknown direction', function () {
			assert.strictEqual(bumpPatch(5, 'unknown'), 5);
			assert.strictEqual(bumpPatch(5, ''), 5);
		});
	});

	describe('round-trip parsing', function () {
		it('should parse and format back to original', function () {
			const versions = ['0.0.1', '1.2.3', '10.20.30'];
			for (const version of versions) {
				const parsed = parseVersion(version);
				const formatted = formatVersion(parsed);
				assert.strictEqual(formatted, version);
			}
		});

		it('should correctly bump and format', function () {
			const parsed = parseVersion('1.2.3');
			parsed.patch = bumpPatch(parsed.patch, 'up');
			assert.strictEqual(formatVersion(parsed), '1.2.4');
		});
	});

	describe('tagExists', function () {
		it('should accept valid tag format', function () {
			// Note: These will return false since the tags don't exist,
			// but they should not throw due to format validation
			assert.strictEqual(tagExists('v0.0.1'), false);
			assert.strictEqual(tagExists('v1.2.3'), false);
			assert.strictEqual(tagExists('v10.20.30'), false);
		});

		it('should reject tags with shell metacharacters (command injection)', function () {
			assert.throws(
				() => tagExists('v1.0.0; rm -rf /'),
				/Invalid tag format/
			);
			assert.throws(
				() => tagExists('v1.0.0 && echo pwned'),
				/Invalid tag format/
			);
			assert.throws(
				() => tagExists('v1.0.0`whoami`'),
				/Invalid tag format/
			);
			assert.throws(
				() => tagExists('$(cat /etc/passwd)'),
				/Invalid tag format/
			);
		});

		it('should reject tags without v prefix', function () {
			assert.throws(() => tagExists('1.2.3'), /Invalid tag format/);
			assert.throws(() => tagExists('0.0.1'), /Invalid tag format/);
		});

		it('should reject tags with invalid version format', function () {
			assert.throws(() => tagExists('v1.2.x'), /Invalid tag format/);
			assert.throws(() => tagExists('v1.2'), /Invalid tag format/);
			assert.throws(() => tagExists('v1'), /Invalid tag format/);
			assert.throws(() => tagExists('vx.y.z'), /Invalid tag format/);
		});

		it('should reject non-string input', function () {
			assert.throws(() => tagExists(null), /Invalid tag format/);
			assert.throws(() => tagExists(undefined), /Invalid tag format/);
			assert.throws(() => tagExists(123), /Invalid tag format/);
			assert.throws(() => tagExists({}), /Invalid tag format/);
		});

		it('should reject empty or invalid strings', function () {
			assert.throws(() => tagExists(''), /Invalid tag format/);
			assert.throws(() => tagExists('v'), /Invalid tag format/);
			assert.throws(() => tagExists('version'), /Invalid tag format/);
		});
	});
});
