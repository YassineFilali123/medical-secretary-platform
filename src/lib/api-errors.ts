import type { AxiosError } from "axios";

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export class NetworkError extends Error {
  constructor(message = "Network error. Please check your connection.") {
    super(message);
    this.name = "NetworkError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message = "Session expired. Please log in again.") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "You do not have permission to perform this action.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends Error {
  constructor(message = "The requested resource was not found.") {
    super(message);
    this.name = "NotFoundError";
  }
}

export function handleApiError(error: unknown): never {
  if (error instanceof Error && "isAxiosError" in error) {
    const axiosError = error as AxiosError<{ message?: string }>;

    if (!axiosError.response) {
      throw new NetworkError();
    }

    const status = axiosError.response.status;
    const message = axiosError.response.data?.message || axiosError.message;

    switch (status) {
      case 401:
        throw new UnauthorizedError(message);
      case 403:
        throw new ForbiddenError(message);
      case 404:
        throw new NotFoundError(message);
      default:
        throw new ApiError(message, status, axiosError.response.data);
    }
  }

  if (error instanceof ApiError) {
    throw error;
  }

  if (error instanceof Error) {
    throw new ApiError(error.message, 500);
  }

  throw new ApiError("An unexpected error occurred", 500);
}
