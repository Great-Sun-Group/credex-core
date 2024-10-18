const { execSync } = require('child_process');

function runTest(args) {
  const jestArgs = ['jest'];
  const env = args.includes('dev') ? 'dev' : args.includes('stage') ? 'stage' : 'local';
  
  if (env !== 'local') {
    jestArgs.push('--runInBand', env);
    args = args.filter(arg => arg !== env);
  }

  if (args.length > 0) {
    const moduleName = args.find(arg => !arg.startsWith('"') && !arg.startsWith("'"));
    const testName = args.find(arg => arg.startsWith('"') || arg.startsWith("'"));

    if (moduleName) {
      jestArgs.push(`--testPathPattern=tests/api/${moduleName}`);
    }

    if (testName) {
      jestArgs.push('-t', testName);
    }
  }

  try {
    execSync(`npx ${jestArgs.join(' ')}`, { stdio: 'inherit' });
  } catch (error) {
    console.error('Test execution failed:', error);
    process.exit(1);
  }
}

runTest(process.argv.slice(2));
