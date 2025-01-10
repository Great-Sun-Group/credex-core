import { EventEmitter } from 'events';

interface LoadTestConfig {
  endpoint: string;
  rampUpPeriod: number;
  duration: number;
  targetRPS: number;
  scenarios: Array<{
    name: string;
    weight: number;
    flow: (context: TestContext) => Promise<void>;
  }>;
}

interface TestContext {
  post: (path: string, data: any) => Promise<any>;
  fixtures: {
    validId: Buffer;
    validSelfie: Buffer;
  };
}

export class LoadTest extends EventEmitter {
  constructor(private config: LoadTestConfig) {
    super();
  }

  async run() {
    // Load test implementation
    console.log('Running load test with config:', this.config);
  }
} 