export type ValidationSeverity =
  | 'ERROR'
  | 'WARNING';

export interface ValidationIssue {
  code: string;
  message: string;
  field?: string;
  lineIndex?: number;
  severity: ValidationSeverity;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export interface ValidationContext {
  operation?: 'CREATE' | 'UPDATE' | 'ISSUE' | 'CREDIT_NOTE' | 'DEBIT_NOTE';
  currency?: string;
}