import { DocumentType, FieldMapping, ValidationResult } from '../types';

const fieldMappings: Record<DocumentType, FieldMapping> = {
  DRIVERS_LICENSE: {
    required: ['licenseNumber', 'fullName', 'dateOfBirth', 'expiryDate'],
    sensitive: ['licenseNumber', 'dateOfBirth'],
    mapping: {
      'License No': 'licenseNumber',
      'Name': 'fullName',
      'DOB': 'dateOfBirth',
      'Expiry': 'expiryDate'
    }
  },
  PASSPORT: {
    required: ['passportNumber', 'surname', 'givenNames', 'nationality'],
    sensitive: ['passportNumber', 'dateOfBirth'],
    mapping: {
      'Passport No': 'passportNumber',
      'Surname': 'surname',
      'Given Names': 'givenNames',
      'Nationality': 'nationality'
    }
  },
  NATIONAL_ID: {
    required: ['idNumber', 'fullName', 'dateOfBirth'],
    sensitive: ['idNumber', 'dateOfBirth'],
    mapping: {
      'ID Number': 'idNumber',
      'Name': 'fullName',
      'Date of Birth': 'dateOfBirth'
    }
  }
};

const fieldValidationRules: Record<string, RegExp> = {
  licenseNumber: /^[A-Z0-9]{5,12}$/,
  passportNumber: /^[A-Z0-9]{6,9}$/,
  idNumber: /^[A-Z0-9]{8,12}$/,
  dateOfBirth: /^\d{4}-\d{2}-\d{2}$/,
  expiryDate: /^\d{4}-\d{2}-\d{2}$/
};

export const validateFieldFormat = (field: string, value: string): boolean => {
  const rule = fieldValidationRules[field];
  if (!rule) return true; // No specific validation rule
  return rule.test(value);
};

export const validateFields = (documentType: DocumentType, mappedData: Record<string, any>): ValidationResult => {
  const requiredFields = fieldMappings[documentType].required;
  const missingFields = requiredFields.filter(field => !mappedData[field]);
  const invalidFields = Object.entries(mappedData)
    .filter(([field, value]) => !validateFieldFormat(field, value));

  if (missingFields.length > 0) {
    return {
      isValid: false,
      error: `Missing required fields: ${missingFields.join(', ')}`
    };
  }

  if (invalidFields.length > 0) {
    return {
      isValid: false,
      error: `Invalid format for fields: ${invalidFields.map(([field]) => field).join(', ')}`
    };
  }

  return { isValid: true };
};

export const mapFields = (documentType: DocumentType, extractedData: Record<string, string>): Record<string, any> => {
  const mapping = fieldMappings[documentType];
  return Object.entries(mapping.mapping).reduce((result, [rawKey, mappedKey]) => {
    if (extractedData[rawKey]) {
      result[mappedKey] = extractedData[rawKey];
    }
    return result;
  }, {} as Record<string, any>);
};

export const getSensitiveFields = (documentType: DocumentType): string[] => 
  fieldMappings[documentType].sensitive; 