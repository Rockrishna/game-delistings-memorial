import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function GET() {
  const hasClientId = !!env.IGDB_CLIENT_ID;
  const hasClientSecret = !!env.IGDB_CLIENT_SECRET;

  if (!hasClientId || !hasClientSecret) {
    return NextResponse.json(
      {
        ok: false,
        configured: { IGDB_CLIENT_ID: hasClientId, IGDB_CLIENT_SECRET: hasClientSecret },
        error: "IGDB credentials are not configured in environment variables.",
      },
      { status: 500 }
    );
  }

  try {
    const url = new URL("https://id.twitch.tv/oauth2/token");
    url.searchParams.set("client_id", env.IGDB_CLIENT_ID!);
    url.searchParams.set("client_secret", env.IGDB_CLIENT_SECRET!);
    url.searchParams.set("grant_type", "client_credentials");

    const res = await fetch(url.toString(), { method: "POST", cache: "no-store" });
    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json(
        { ok: false, configured: { IGDB_CLIENT_ID: true, IGDB_CLIENT_SECRET: true }, error: `Twitch token request failed (${res.status}): ${text}` },
        { status: 502 }
      );
    }

    const payload = (await res.json()) as { access_token: string; expires_in: number };
    return NextResponse.json({
      ok: true,
      configured: { IGDB_CLIENT_ID: true, IGDB_CLIENT_SECRET: true },
      token_expires_in: payload.expires_in,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, configured: { IGDB_CLIENT_ID: true, IGDB_CLIENT_SECRET: true }, error: (error as Error).message },
      { status: 502 }
    );
  }
}
