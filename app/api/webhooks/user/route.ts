import { prisma } from "@/lib/db";
import { IncomingHttpHeaders } from "http";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { Webhook, WebhookRequiredHeaders } from "svix";

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET || "";

async function handler(request: NextRequest) {
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

    const existingUser = await prisma.users.findUnique({
      where: { user_id: id as string },
    });

    if (!existingUser) {
      await prisma.users.create({
        data: {
          user_id: id as string,
          attributes,
        },
      });
    } else {
      await prisma.users.update({
        where: { user_id: id as string },
        data: { attributes },
      });
    }
  }

  // ✅ Return a success response
  return NextResponse.json({ success: true, message: "Webhook processed successfully" }, { status: 200 });
}

// Export handlers
export const GET = handler;
export const POST = handler;
export const PUT = handler;

type EventType = "user.created" | "user.updated" | "*";

type Event = {
  data: Record<string, string | number>;
  object: "event";
  type: EventType;
};
