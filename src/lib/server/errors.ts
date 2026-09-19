import "server-only";

/**
 * One failure shape for every route.
 *
 * `message` is written to be shown to a person — the API is called from our own
 * UI and nowhere else, so a message that only a developer could act on is a
 * message the user will end up reading. `code` is what the UI branches on.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export const unauthorized = (message = "Sign in and try again.") =>
  new ApiError(401, "unauthorized", message);

export const forbidden = (code: string, message: string) =>
  new ApiError(403, code, message);

export const badRequest = (code: string, message: string) =>
  new ApiError(400, code, message);

export const conflict = (code: string, message: string) =>
  new ApiError(409, code, message);

/**
 * Turn anything thrown inside a route into a response.
 *
 * Only `ApiError` messages reach the browser. Everything else becomes a flat
 * 500: an unexpected error's message is as likely to name a service account or
 * a document path as it is to help.
 */
export function toResponse(error: unknown): Response {
  if (error instanceof ApiError) {
    return Response.json(
      { error: { code: error.code, message: error.message } },
      { status: error.status },
    );
  }
  console.error("[api] unhandled", error);
  return Response.json(
    {
      error: {
        code: "internal",
        message: "Something went wrong at our end. Try again in a moment?",
      },
    },
    { status: 500 },
  );
}
