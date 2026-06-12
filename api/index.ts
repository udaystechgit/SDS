import "../src/lib/error-capture";
import { consumeLastCapturedError } from "../src/lib/error-capture";
import { renderErrorPage } from "../src/lib/error-page";

type ServerEntry = {
  fetch: (
    request: Request,
    env: unknown,
    ctx: unknown
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

async function normalizeCatastrophicSsrResponse(
  response: Response
): Promise<Response> {
  if (response.status < 500) return response;

  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    return response;
  }

  const body = await response.clone().text();

  if (
    !body.includes('"unhandled":true') ||
    !body.includes('"message":"HTTPError"')
  ) {
    return response;
  }

  console.error(
    consumeLastCapturedError() ??
      new Error(`h3 swallowed SSR error: ${body}`)
  );

  return new Response(renderErrorPage(), {
    status: 500,
    headers: {
      "content-type": "text/html; charset=utf-8",
    },
  });
}

/**
 * IMPORTANT:
 * TanStack Start SSR requires Node.js runtime.
 * Do NOT use "edge" runtime here.
 */
export const config = {
  runtime: "nodejs",
};

export default async function handler(request: Request) {
  try {
    const serverEntry = await getServerEntry();

    const response = await serverEntry.fetch(
      request,
      undefined,
      undefined
    );

    return await normalizeCatastrophicSsrResponse(response);
  } catch (error) {
    console.error("SSR Handler Error:", error);

    return new Response(renderErrorPage(), {
      status: 500,
      headers: {
        "content-type": "text/html; charset=utf-8",
      },
    });
  }
}