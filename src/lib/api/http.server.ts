import { setResponseHeaders } from "@tanstack/react-start/server";

export function setNoStoreResponseHeaders() {
  setResponseHeaders({
    "Cache-Control": "no-store",
    Vary: "Authorization",
  } as unknown as Parameters<typeof setResponseHeaders>[0]);
}
