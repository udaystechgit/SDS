type ServerEntry = {
  fetch: (
    request: Request,
    env?: unknown,
    ctx?: unknown
  ) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry
    );
  }

  return serverEntryPromise;
}

export const config = {
  runtime: "nodejs",
};

export default async function handler(req: any) {
  try {
    const protocol =
      req.headers?.["x-forwarded-proto"] ||
      req.headers?.["X-Forwarded-Proto"] ||
      "https";

    const host =
      req.headers?.host ||
      req.headers?.Host ||
      "localhost";

    const url = new URL(
      req.url || "/",
      `${protocol}://${host}`
    );

    const request = new Request(url.toString(), {
      method: req.method || "GET",
      headers: req.headers,
    });

    const serverEntry = await getServerEntry();

    return await serverEntry.fetch(
      request,
      undefined,
      undefined
    );
  } catch (error) {
    console.error("SSR Handler Error:", error);

    return new Response(
      `
      <!DOCTYPE html>
      <html>
      <head>
        <title>SDS Consulting Service</title>
      </head>
      <body style="font-family: Arial; padding: 40px">
        <h1>Application Error</h1>
        <pre>${String(error)}</pre>
      </body>
      </html>
      `,
      {
        status: 500,
        headers: {
          "content-type": "text/html; charset=utf-8",
        },
      }
    );
  }
}