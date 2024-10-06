const autocannon = require('autocannon');

const url = process.env.API_URL || 'http://localhost:5000'; // Set this to your deployed API URL

const instance = autocannon({
  url: `${url}/health`, // Change this to the endpoint you want to benchmark
  connections: 10,
  pipelining: 1,
  duration: 10
}, console.log);

// This is used to kill the instance on CTRL-C
process.once('SIGINT', () => {
  instance.stop();
});

autocannon.track(instance, { renderProgressBar: true });

// You can add more specific benchmarks here
// For example:
// autocannon({
//   url: `${url}/api/member/login`,
//   method: 'POST',
//   body: JSON.stringify({ phone: '+1234567890', password: 'testpassword' }),
//   headers: { 'Content-Type': 'application/json' },
//   connections: 10,
//   pipelining: 1,
//   duration: 10
// }, console.log);