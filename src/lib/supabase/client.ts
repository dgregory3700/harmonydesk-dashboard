import { createBrowserClient } from "@supabase/ssr";

type CookieSetItem = {
  name: string;
  value: string;
  options?: {
    path?: string;
    domain?: string;
    maxAge?: number;
    expires?: Date;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "lax" | "strict" | "none";
  };
};

function buildCookieString(item: CookieSetItem) {
  const opts = item.options ?? {};
  const parts: string[] = [`${encodeURIComponent(item.name)}=${encodeURIComponent(item.value)}`];

  parts.push(`Path=${opts.path ?? "/"}`);

  if (opts.domain) parts.push(`Domain=${opts.domain}`);
  if (opts.expires) parts.push(`Expires=${opts.expires.toUTCString()}`);
  if (typeof opts.maxAge === "number") parts.push(`Max-Age=${opts.maxAge}`);

  if (opts.sameSite) parts.push(`SameSite=${opts.sameSite}`);
  if (opts.secure) parts.push("Secure");

  // httpOnly cannot be set from the browser; ignore if provided
  return parts.join("; ");
}

export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: "pkce",
      },
      cookies: {
        getAll() {
          if (typeof document === "undefined") return [];

          return document.cookie
            .split(";")
            .map((c) => c.trim())
            .filter(Boolean)
            .map((c) => {
              const idx = c.indexOf("=");
              const name = idx >= 0 ? decodeURIComponent(c.slice(0, idx)) : decodeURIComponent(c);
              const value = idx >= 0 ? decodeURIComponent(c.slice(idx + 1)) : "";
              return { name, value };
            });
        },

        setAll(cookiesToSet: CookieSetItem[]) {
          if (typeof document === "undefined") return;
          cookiesToSet.forEach((item) => {
            document.cookie = buildCookieString(item);
          });
        },

        remove(name: string, options?: CookieSetItem["options"]) {
          if (typeof document === "undefined") return;
          document.cookie = buildCookieString({
            name,
            value: "",
            options: {
              ...(options ?? {}),
              path: options?.path ?? "/",
              expires: new Date(0),
              maxAge: 0,
            },
          });
        },
      },
    }
  );
}
