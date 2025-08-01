import { sanitizeString } from '../../utils/inputSanitizer';

export const deployServiceSchema = {
  service: {
    sanitizer: sanitizeString,
    validator: (value: string) => ({
      isValid: ['credex-core', 'vimbiso-chatserver'].includes(value),
      message: 'Service must be either "credex-core" or "vimbiso-chatserver"'
    }),
    required: true
  },
  deploy_token: {
    sanitizer: sanitizeString,
    validator: (value: string) => ({
      isValid: !!value && value.length >= 32,
      message: 'Deploy token is required and must be at least 32 characters'
    }),
    required: true
  },
  branch: {
    sanitizer: sanitizeString,
    validator: (value: string) => ({
      isValid: !value || ['prod', 'main'].includes(value),
      message: 'Branch must be either "prod" or "main" if provided'
    }),
    required: false
  },
  commit_sha: {
    sanitizer: sanitizeString,
    validator: (value: string) => ({
      isValid: !value || /^[a-f0-9]{40}$/i.test(value),
      message: 'Commit SHA must be a valid 40-character hex string if provided'
    }),
    required: false
  }
};

export const uploadApkSchema = {
  version: {
    sanitizer: sanitizeString,
    validator: (value: string) => ({
      isValid: /^\d+\.\d+\.\d+(\+\d+)?$/.test(value),
      message: 'Version must be in format x.y.z or x.y.z+build'
    }),
    required: true
  },
  update_required: {
    sanitizer: (value: any) => Boolean(value),
    validator: (value: boolean) => ({
      isValid: typeof value === 'boolean',
      message: 'update_required must be a boolean'
    }),
    required: true
  },
  release_notes: {
    sanitizer: sanitizeString,
    validator: (value: string) => ({
      isValid: !!value && value.length <= 1000,
      message: 'Release notes are required and must be less than 1000 characters'
    }),
    required: true
  },
  deploy_token: {
    sanitizer: sanitizeString,
    validator: (value: string) => ({
      isValid: !!value && value.length >= 32,
      message: 'Deploy token is required and must be at least 32 characters'
    }),
    required: true
  }
};

export const updateAppVersionSchema = {
  app_id: {
    sanitizer: sanitizeString,
    validator: (value: string) => ({
      isValid: !!value,
      message: 'App ID is required'
    }),
    required: true
  },
  version: {
    sanitizer: sanitizeString,
    validator: (value: string) => ({
      isValid: /^\d+\.\d+\.\d+(\+\d+)?$/.test(value),
      message: 'Version must be in format x.y.z or x.y.z+build'
    }),
    required: true
  },
  update_required: {
    sanitizer: (value: any) => Boolean(value),
    validator: (value: boolean) => ({
      isValid: typeof value === 'boolean',
      message: 'update_required must be a boolean'
    }),
    required: true
  },
  release_notes: {
    sanitizer: sanitizeString,
    validator: (value: string) => ({
      isValid: !!value,
      message: 'Release notes are required'
    }),
    required: true
  },
  download_url: {
    sanitizer: sanitizeString,
    validator: (value: string) => ({
      isValid: !!value && (value.startsWith('http://') || value.startsWith('https://')),
      message: 'Download URL is required and must be a valid HTTP/HTTPS URL'
    }),
    required: true
  },
  file_size_bytes: {
    sanitizer: (value: any) => parseInt(value, 10),
    validator: (value: number) => ({
      isValid: !isNaN(value) && value > 0,
      message: 'File size must be a positive number'
    }),
    required: true
  },
  deploy_token: {
    sanitizer: sanitizeString,
    validator: (value: string) => ({
      isValid: !!value && value.length >= 32,
      message: 'Deploy token is required and must be at least 32 characters'
    }),
    required: true
  }
};
