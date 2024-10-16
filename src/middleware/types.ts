export interface SchemaItem {
  sanitizer?: (input: any) => any;
  validator: (input: any) => boolean | { isValid: boolean; message: string };
}

export interface ValidationSchema {
  [key: string]: SchemaItem | ValidationSchema;
}