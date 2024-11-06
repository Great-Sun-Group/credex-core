export interface SchemaItem {
  sanitizer?: (input: any) => any;
  validator: (input: any) => boolean | { isValid: boolean; message: string };
  required?: boolean;
}

// Define allowed validation schema properties
type ValidationSchemaFields = {
  [key: string]: SchemaItem | ValidationSchema;
}

// Define special validation properties
type SpecialValidationProps = {
  $atLeastOne?: string[];
}

// Combine regular fields with special properties
export type ValidationSchema = ValidationSchemaFields & SpecialValidationProps;

// Helper type for creating schemas that require at least one field
export type RequireAtLeastOne<T extends ValidationSchemaFields> = T & {
  $atLeastOne: string[];
}
