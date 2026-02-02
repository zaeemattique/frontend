/**
 * Error Parser Utilities
 *
 * Parse Step Function error messages and extract user-friendly error text
 *
 * Step Function errors come in this structure:
 * {"error":"Exception","cause":"{\"errorMessage\": \"...\", \"errorType\": \"...\", ...}"}
 *
 * This function extracts the errorMessage and formats it for display to users.
 */

/**
 * Parse Step Function error messages and extract user-friendly error text
 */
export function parseStepFunctionError(errorMessage: string): string {
  if (!errorMessage) {
    return 'Generation failed';
  }

  try {
    // Try to parse as JSON
    const parsed = JSON.parse(errorMessage);

    // Check if it's a Step Function error structure
    if (parsed.error && parsed.cause) {
      // Parse the nested "cause" field which is a JSON string
      const cause = JSON.parse(parsed.cause);

      if (cause.errorMessage) {
        return formatErrorForUser(cause.errorMessage);
      }
    }

    // If it has errorMessage directly
    if (parsed.errorMessage) {
      return formatErrorForUser(parsed.errorMessage);
    }

    // If it has a message field
    if (parsed.message) {
      return formatErrorForUser(parsed.message);
    }
  } catch (e) {
    // Not JSON or parsing failed, return the original message
    // but check if it looks like JSON and clean it up
    if (
      errorMessage.includes('errorMessage') &&
      errorMessage.includes('errorType')
    ) {
      // Try to extract just the error message using regex
      const match = errorMessage.match(/"errorMessage":\s*"([^"]+)"/);
      if (match && match[1]) {
        return formatErrorForUser(match[1]);
      }
    }
  }

  // Return the original message, but truncate if too long
  return formatErrorForUser(errorMessage);
}

/**
 * Format error messages to be more user-friendly
 */
function formatErrorForUser(message: string): string {
  // Truncate very long messages
  if (message.length > 500) {
    message = message.substring(0, 500) + '...';
  }

  // Add specific guidance for common errors
  if (message.includes('Template') && message.includes('not found')) {
    return (
      message + '\n\nPlease ensure a valid template is assigned to this deal.'
    );
  }

  if (
    message.includes('no defaultPrompt') ||
    message.includes('no templateVariables')
  ) {
    return (
      message +
      '\n\nThe assigned template may be incomplete. Please contact support.'
    );
  }

  return message;
}

/**
 * Parse API error response
 * Handles various error formats from the backend
 */
export function parseApiError(
  error: unknown
): { message: string; code?: string } {
  // RTK Query error format
  if (typeof error === 'object' && error !== null) {
    const err = error as {
      status?: number | string;
      data?: { error?: string; message?: string };
      error?: string;
      message?: string;
    };

    // Check for data.error or data.message
    if (err.data) {
      if (err.data.error) {
        return { message: err.data.error, code: String(err.status) };
      }
      if (err.data.message) {
        return { message: err.data.message, code: String(err.status) };
      }
    }

    // Check for error or message at root level
    if (err.error && typeof err.error === 'string') {
      return { message: err.error, code: String(err.status) };
    }
    if (err.message) {
      return { message: err.message, code: String(err.status) };
    }

    // If status exists, provide generic message
    if (err.status) {
      const statusMessages: Record<number, string> = {
        400: 'Bad request - please check your input',
        401: 'Unauthorized - please log in again',
        403: 'Forbidden - you do not have permission',
        404: 'Not found - the requested resource does not exist',
        500: 'Internal server error - please try again later',
        503: 'Service unavailable - please try again later',
      };

      const status = typeof err.status === 'number' ? err.status : 500;
      return {
        message: statusMessages[status] || 'An error occurred',
        code: String(status),
      };
    }
  }

  // String error
  if (typeof error === 'string') {
    return { message: error };
  }

  // Unknown error format
  return { message: 'An unexpected error occurred' };
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (typeof error === 'object' && error !== null) {
    const err = error as { status?: string | number };
    return err.status === 'FETCH_ERROR' || err.status === 0;
  }
  return false;
}

/**
 * Check if error is an authentication error
 */
export function isAuthError(error: unknown): boolean {
  if (typeof error === 'object' && error !== null) {
    const err = error as { status?: string | number };
    return err.status === 401 || err.status === '401';
  }
  return false;
}
