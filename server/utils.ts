import { log } from './vite';

// Custom error types
export class DatabaseError extends Error {
  constructor(message: string, public operation: string, public table?: string, public originalError?: any) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class ValidationError extends Error {
  constructor(message: string, public fields?: string[]) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(message: string, public resourceType?: string, public resourceId?: string | number) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class SyncError extends Error {
  constructor(message: string, public operation?: string, public endpoint?: string, public statusCode?: number) {
    super(message);
    this.name = 'SyncError';
  }
}

// Error logger function with severity levels
type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export function logError(error: Error | unknown, context: string, level: LogLevel = 'error'): void {
  let errorObject: any;
  
  if (error instanceof Error) {
    errorObject = {
      message: error.message,
      name: error.name,
      stack: error.stack,
    };
    
    // Add additional properties for custom error types
    if (error instanceof DatabaseError) {
      errorObject.operation = error.operation;
      errorObject.table = error.table;
      errorObject.originalError = error.originalError;
    } else if (error instanceof ValidationError) {
      errorObject.fields = error.fields;
    } else if (error instanceof NotFoundError) {
      errorObject.resourceType = error.resourceType;
      errorObject.resourceId = error.resourceId;
    } else if (error instanceof SyncError) {
      errorObject.operation = error.operation;
      errorObject.endpoint = error.endpoint;
      errorObject.statusCode = error.statusCode;
    }
  } else {
    // Handle non-Error objects
    errorObject = {
      message: String(error),
      type: typeof error
    };
  }

  // Format the error message for logging
  const errorMessage = `${level.toUpperCase()} [${context}]: ${JSON.stringify(errorObject, null, 2)}`;
  
  // Log to server logs using the vite logger
  log(errorMessage, context);
  
  // For errors, also log to console for immediate visibility during development
  if (level === 'error') {
    console.error(errorMessage);
  } else if (level === 'warn') {
    console.warn(errorMessage);
  }
  
  // TODO: In the future, this could be expanded to:
  // - Send critical errors to an error monitoring service
  // - Log to a file in production
  // - Send alerts for critical errors
}

/**
 * Safely execute a database operation with proper error handling
 * @param operation Description of the operation being performed
 * @param table The database table being operated on
 * @param fn The database operation function to execute
 * @returns The result of the database operation
 * @throws DatabaseError if the operation fails
 */
export async function safeDbOperation<T>(operation: string, table: string, fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    // Handle specific error types first
    if (error instanceof NotFoundError) {
      // Resource not found errors should be propagated as is
      logError(error, 'database', 'warn');
      throw error;
    } 
    
    // Check for specific SQLite/Drizzle errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    // Check for constraint violations
    if (errorMessage.includes('UNIQUE constraint failed') || 
        errorMessage.includes('violates unique constraint')) {
      const constraintError = new DatabaseError(
        `Database constraint violation in operation: ${operation} on ${table}`,
        operation,
        table,
        error
      );
      logError(constraintError, 'database', 'error');
      throw constraintError;
    }
    
    // Check for foreign key violations
    if (errorMessage.includes('FOREIGN KEY constraint failed') ||
        errorMessage.includes('violates foreign key constraint')) {
      const fkError = new DatabaseError(
        `Foreign key constraint violation in operation: ${operation} on ${table}`,
        operation,
        table,
        error
      );
      logError(fkError, 'database', 'error');
      throw fkError;
    }
    
    // Check for syntax errors
    if (errorMessage.includes('syntax error') || 
        errorMessage.includes('near')) {
      const syntaxError = new DatabaseError(
        `SQL syntax error in operation: ${operation} on ${table}`,
        operation,
        table,
        error
      );
      logError(syntaxError, 'database', 'error');
      throw syntaxError;
    }
    
    // Generic database error
    const genericError = new DatabaseError(
      `Database operation failed: ${operation} on ${table}`,
      operation,
      table,
      error
    );
    logError(genericError, 'database', 'error');
    throw genericError;
  }
}

/**
 * Format and standardize API error responses
 */
export function formatErrorResponse(error: Error | unknown): {
  message: string;
  errorType?: string;
  details?: any;
  statusCode: number;
} {
  if (error instanceof ValidationError) {
    return {
      message: error.message,
      errorType: 'validation_error',
      details: { 
        fields: error.fields,
        validationFailed: true
      },
      statusCode: 400
    };
  } else if (error instanceof NotFoundError) {
    return {
      message: error.message,
      errorType: 'not_found',
      details: {
        resourceType: error.resourceType,
        resourceId: error.resourceId
      },
      statusCode: 404
    };
  } else if (error instanceof AuthorizationError) {
    return {
      message: error.message,
      errorType: 'authorization_error',
      details: {
        requiresAuthentication: true
      },
      statusCode: 403
    };
  } else if (error instanceof DatabaseError) {
    const errorMessage = error.message;
    let errorDetails: any = { 
      operation: error.operation,
      table: error.table 
    };
    
    // Add more specific information for different database error types
    if (errorMessage.includes('constraint violation')) {
      if (errorMessage.includes('UNIQUE constraint')) {
        return {
          message: 'The record already exists or would create a duplicate entry',
          errorType: 'database_unique_constraint',
          details: errorDetails,
          statusCode: 409 // Conflict
        };
      }
      
      if (errorMessage.includes('FOREIGN KEY constraint')) {
        return {
          message: 'The operation references a record that does not exist',
          errorType: 'database_foreign_key_constraint',
          details: errorDetails,
          statusCode: 400
        };
      }
    }
    
    // Generic database error
    return {
      message: `Database operation failed: ${error.operation}`,
      errorType: 'database_error',
      details: errorDetails,
      statusCode: 500
    };
  } else if (error instanceof SyncError) {
    // Make sync errors more descriptive
    let statusCode = error.statusCode || 500;
    let errorMessage = error.message;
    
    // Add more context based on status code
    if (error.statusCode === 401 || error.statusCode === 403) {
      errorMessage = `Authentication error during sync: ${errorMessage}`;
      statusCode = 403;
    } else if (error.statusCode === 404) {
      errorMessage = `Resource not found during sync: ${errorMessage}`;
    } else if (error.statusCode && error.statusCode >= 500) {
      errorMessage = `Remote server error during sync: ${errorMessage}`;
    }
    
    return {
      message: errorMessage,
      errorType: 'sync_error',
      details: {
        operation: error.operation,
        endpoint: error.endpoint,
        statusCode: error.statusCode
      },
      statusCode
    };
  } else if (error instanceof Error) {
    return {
      message: error.message,
      errorType: 'general_error',
      details: {
        name: error.name
      },
      statusCode: 500
    };
  } else {
    return {
      message: 'An unknown error occurred',
      errorType: 'unknown_error',
      statusCode: 500
    };
  }
}