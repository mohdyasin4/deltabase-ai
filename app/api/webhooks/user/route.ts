import { prisma } from "@/lib/db";
import { IncomingHttpHeaders } from "http";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { Webhook, WebhookRequiredHeaders } from "svix";

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET || "";

async function handler(request: NextRequest) {
  if (request.method !== "POST") {
    return NextResponse.json({ error: "Method not allowed" }, { status: 405 });
  }

  const payload = await request.json();
  const headersList = headers();

  console.log("Headers:", {
    "svix-id": headersList.get("svix-id"),
    "svix-timestamp": headersList.get("svix-timestamp"),
    "svix-signature": headersList.get("svix-signature"),
  });

  const heads = {
    "svix-id": headersList.get("svix-id"),
    "svix-timestamp": headersList.get("svix-timestamp"),
    "svix-signature": headersList.get("svix-signature"),
  };

  const wh = new Webhook(webhookSecret);
  let evt: Event | null = null;
  console.log("Payload:", payload);

  try {
    evt = await wh.verify(
      JSON.stringify(payload),
      heads as unknown as IncomingHttpHeaders & WebhookRequiredHeaders
    ) as Event;
  } catch (err) {
    console.error("Webhook verification failed:", (err as Error).message);
    return NextResponse.json({ error: "Signature verification failed" }, { status: 400 });
  }

  const eventType: EventType = evt.type;
  if (eventType === "user.created" || eventType === "user.updated") {
    const { id, ...attributes } = evt.data;

    try {
      await prisma.users.upsert({
        where: { user_id: id as string },
        update: { attributes },
        create: {
          user_id: id as string,
          attributes,
          role: "authenticated", // ✅ Set the default role
        },
      });

      return NextResponse.json(
        { success: true, message: `User ${eventType} processed` },
        { status: 200 }
      );
    } catch (error) {
      console.error("Database error:", error);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }
  }

  return NextResponse.json(
    { success: true, message: "Event received but not processed" },
    { status: 200 }
  );
}

// ✅ Only export POST handler
export const POST = handler;

type EventType = "user.created" | "user.updated" | "*";

type Event = {
  data: Record<string, string | number>;
  object: "event";
  type: EventType;
};
