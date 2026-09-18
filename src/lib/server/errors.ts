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
        cause: describeError(error),
      },
    },
    { status: 500 },
  );
}

/**
 * What actually went wrong, for the network tab.
 *
 * Temporary. Only `ApiError` messages are meant to reach the browser, for the
 * reason given above — but a 500 on a deployment whose runtime logs are
 * awkward to reach is otherwise indistinguishable from any other 500, and the
 * name and code of a Firebase error (`5 NOT_FOUND`, `7 PERMISSION_DENIED`)
 * say precisely which piece of the project is not set up. It never reaches the
 * page; nothing renders `cause`. Take it out once the deployment is settled.
 *
 * Shared with `/api/account/health`, which reports its probes the same way.
 */
export function describeError(error: unknown) {
  if (!(error instanceof Error)) {
    return { name: typeof error, message: String(error).slice(0, 300) };
  }
  const code = (error as { code?: unknown }).code;
  return {
    name: error.name,
    code: typeof code === "string" || typeof code === "number" ? code : undefined,
    message: error.message.slice(0, 300),
  };
}
