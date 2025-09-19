const {
  validateFileLocation,
  DEFAULT_LOCATION_RULES,
} = require('./dist/src/utils/location-filter.js');
const { basename, dirname } = require('path');

const filePath = 'src/debug_output.py';
const fileName = basename(filePath);
const dirPath = dirname(filePath);

console.log('Input:', { filePath, fileName, dirPath });

// Find the debug rule
const debugRule = DEFAULT_LOCATION_RULES.find(r => r.name === 'debug-scripts');
console.log('Debug rule found:', debugRule ? true : false);

if (debugRule) {
  console.log('Rule details:');
  console.log('  filePattern:', debugRule.filePattern);
  console.log('  contentPattern:', debugRule.contentPattern);
  console.log('  hasContentPattern:', debugRule.contentPattern ? true : false);

  const fileMatches = debugRule.filePattern.test(fileName);
  const hasContentPattern = debugRule.contentPattern ? true : false;
  const content = undefined;
  const contentMatches =
    hasContentPattern && content ? debugRule.contentPattern.test(content) : false;

  console.log('Matching logic:');
  console.log('  fileMatches:', fileMatches);
  console.log('  hasContentPattern:', hasContentPattern);
  console.log('  contentMatches:', contentMatches);

  const ruleApplies =
    (fileMatches && !hasContentPattern) ||
    (fileMatches && contentMatches) ||
    (!fileMatches && contentMatches);
  console.log('  ruleApplies:', ruleApplies);
  console.log(
    '  Expected ruleApplies: fileMatches && !hasContentPattern =',
    fileMatches && !hasContentPattern
  );
}
