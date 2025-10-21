// Utility functions for standardized API responses

class ApiResponse {
  static success(data, message = 'Success', statusCode = 200) {
    return {
      success: true,
      message,
      data,
      statusCode
    };
  }

  static error(message = 'Error occurred', statusCode = 500, errors = null) {
    return {
      success: false,
      message,
      statusCode,
      errors
    };
  }

  static validationError(errors, message = 'Validation failed') {
    return {
      success: false,
      message,
      statusCode: 400,
      errors
    };
  }

  static notFound(message = 'Resource not found') {
    return {
      success: false,
      message,
      statusCode: 404
    };
  }

  static unauthorized(message = 'Unauthorized access') {
    return {
      success: false,
      message,
      statusCode: 401
    };
  }

  static forbidden(message = 'Forbidden access') {
    return {
      success: false,
      message,
      statusCode: 403
    };
  }
}

// Helper function để gửi response
const sendResponse = (res, statusCode, responseData) => {
  return res.status(statusCode).json(responseData);
};

module.exports = {
  ApiResponse,
  sendResponse
};
