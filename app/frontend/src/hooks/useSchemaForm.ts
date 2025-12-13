import { useState, useCallback } from 'react';
import { toast } from 'sonner@2.0.3';
import { FormFieldConfig } from '../types/crud';

interface UseSchemaFormOptions {
  fields: FormFieldConfig[];
  initialData?: Record<string, any>;
  onSubmit?: (data: Record<string, any>) => Promise<void> | void;
  validateOnChange?: boolean;
}

interface FormFieldState {
  value: any;
  error: string | null;
  touched: boolean;
}

export function useSchemaForm({
  fields,
  initialData = {},
  onSubmit,
  validateOnChange = true,
}: UseSchemaFormOptions) {
  // Initialize form state
  const [formData, setFormData] = useState<Record<string, FormFieldState>>(() => {
    const initial: Record<string, FormFieldState> = {};
    fields.forEach(field => {
      initial[field.name] = {
        value: initialData[field.name] ?? field.defaultValue ?? '',
        error: null,
        touched: false,
      };
    });
    return initial;
  });

  // Form-level state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValid, setIsValid] = useState(false);

  // Update field value
  const setFieldValue = useCallback((name: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [name]: {
        ...prev[name],
        value,
        touched: true,
      },
    }));

    if (validateOnChange) {
      validateField(name, value);
    }
  }, [validateOnChange]);

  // Set field error
  const setFieldError = useCallback((name: string, error: string | null) => {
    setFormData(prev => ({
      ...prev,
      [name]: {
        ...prev[name],
        error,
      },
    }));
  }, []);

  // Mark field as touched
  const setFieldTouched = useCallback((name: string) => {
    setFormData(prev => ({
      ...prev,
      [name]: {
        ...prev[name],
        touched: true,
      },
    }));
  }, []);

  // Validate single field
  const validateField = useCallback((name: string, value?: any) => {
    const field = fields.find(f => f.name === name);
    if (!field) return;

    const fieldValue = value ?? formData[name]?.value;
    let error: string | null = null;

    // Required validation
    if (field.required && (!fieldValue || fieldValue.toString().trim() === '')) {
      error = `${field.label} is required`;
    }

    // Type-specific validation
    if (!error) {
      switch (field.type) {
        case 'email':
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (fieldValue && !emailRegex.test(fieldValue)) {
            error = 'Please enter a valid email address';
          }
          break;
        case 'number':
          if (fieldValue && isNaN(Number(fieldValue))) {
            error = 'Please enter a valid number';
          }
          break;
      }
    }

    // Length validation
    if (!error && field.validation) {
      const { minLength, maxLength, pattern, custom } = field.validation;

      if (minLength && fieldValue && fieldValue.length < minLength) {
        error = `${field.label} must be at least ${minLength} characters`;
      }

      if (maxLength && fieldValue && fieldValue.length > maxLength) {
        error = `${field.label} must be no more than ${maxLength} characters`;
      }

      if (pattern && fieldValue && !pattern.test(fieldValue)) {
        error = `${field.label} format is invalid`;
      }

      if (custom && fieldValue) {
        error = custom(fieldValue);
      }
    }

    setFieldError(name, error);
    return error;
  }, [fields, formData, setFieldError]);

  // Validate all fields
  const validateForm = useCallback(() => {
    let hasErrors = false;
    fields.forEach(field => {
      const error = validateField(field.name);
      if (error) hasErrors = true;
    });

    setIsValid(!hasErrors);
    return !hasErrors;
  }, [fields, validateField]);

  // Get form values
  const getValues = useCallback(() => {
    const values: Record<string, any> = {};
    Object.entries(formData).forEach(([key, field]) => {
      values[key] = field.value;
    });
    return values;
  }, [formData]);

  // Reset form
  const reset = useCallback((newInitialData?: Record<string, any>) => {
    const resetData: Record<string, FormFieldState> = {};
    fields.forEach(field => {
      resetData[field.name] = {
        value: newInitialData?.[field.name] ?? initialData[field.name] ?? field.defaultValue ?? '',
        error: null,
        touched: false,
      };
    });
    setFormData(resetData);
    setIsSubmitting(false);
    setIsValid(false);
  }, [fields, initialData]);

  // Submit form
  const submit = useCallback(async () => {
    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return false;
    }

    setIsSubmitting(true);
    try {
      const values = getValues();
      if (onSubmit) {
        await onSubmit(values);
      }
      return true;
    } catch (error) {
      toast.error('Failed to submit form');
      console.error('Form submission error:', error);
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [validateForm, getValues, onSubmit]);

  // Get field props for easy binding
  const getFieldProps = useCallback((name: string) => ({
    value: formData[name]?.value ?? '',
    onChange: (value: any) => setFieldValue(name, value),
    onBlur: () => setFieldTouched(name),
    error: formData[name]?.error,
    touched: formData[name]?.touched,
  }), [formData, setFieldValue, setFieldTouched]);

  return {
    // State
    formData,
    isSubmitting,
    isValid,

    // Actions
    setFieldValue,
    setFieldError,
    setFieldTouched,
    validateField,
    validateForm,
    getValues,
    reset,
    submit,
    getFieldProps,
  };
}