import { z } from 'zod';

export interface AuthConfig {
  otp: {
    expiry: number;
    maxDailyRequests: number;
    cooldownMinutes: number;
    maxAttempts: number;
  };
  password: {
    bcryptCost: number;
    requirePassword: boolean;
    validation: {
      minLength: number;
      maxLength: number;
      requireUppercase: boolean;
      requireLowercase: boolean;
      requireNumber: boolean;
      requireSpecial: boolean;
    };
  };
}

const defaultConfig: AuthConfig = {
  otp: {
    expiry: 300, // 5 minutes
    maxDailyRequests: 5,
    cooldownMinutes: 5,
    maxAttempts: 3
  },
  password: {
    bcryptCost: 12,
    requirePassword: false,
    validation: {
      minLength: 10,
      maxLength: 128,
      requireUppercase: true,
      requireLowercase: true,
      requireNumber: true,
      requireSpecial: true
    }
  }
};

// Environment-specific overrides
const configs: Record<string, Partial<AuthConfig>> = {
  development: {
    password: {
      ...defaultConfig.password,
      bcryptCost: 4 // Lower cost for faster development
    }
  },
  test: {
    password: {
      ...defaultConfig.password,
      bcryptCost: 4 // Lower cost for faster tests
    }
  },
  staging: defaultConfig,
  production: defaultConfig
};

// Get environment-specific config with fallback to development
export const authConfig = {
  ...defaultConfig,
  ...(configs[process.env.NODE_ENV || 'development'] || {})
};

// Zod schema for runtime validation of the configuration
export const authConfigSchema = z.object({
  otp: z.object({
    expiry: z.number().min(30).max(3600),
    maxDailyRequests: z.number().min(1).max(100),
    cooldownMinutes: z.number().min(0).max(60),
    maxAttempts: z.number().min(1).max(10)
  }),
  password: z.object({
    bcryptCost: z.number().min(4).max(14),
    requirePassword: z.boolean(),
    validation: z.object({
      minLength: z.number().min(8).max(256),
      maxLength: z.number().min(8).max(256),
      requireUppercase: z.boolean(),
      requireLowercase: z.boolean(),
      requireNumber: z.boolean(),
      requireSpecial: z.boolean()
    })
  })
});

// Validate configuration at runtime
const validationResult = authConfigSchema.safeParse(authConfig);
if (!validationResult.success) {
  throw new Error(`Invalid auth configuration: ${validationResult.error.message}`);
}
