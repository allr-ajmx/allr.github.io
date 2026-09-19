import { readAppConfig } from "@/lib/server/app-config";
import { toResponse } from "@/lib/server/errors";

/** Public: /download and the account shell both render this for anyone. */
export async function GET() {
  try {
    const config = await readAppConfig();
    return Response.json(config, {
      // A version pointer changes rarely and is not worth a round trip per
      // visitor, but a rollback should reach people in minutes, not hours.
      headers: { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300" },
    });
  } catch (error) {
    return toResponse(error);
  }
}
