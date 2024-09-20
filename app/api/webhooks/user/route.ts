import { prisma } from "@/lib/db";
import { IncomingHttpHeaders } from "http";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { Webhook, WebhookRequiredHeaders } from "svix";

const webhookSecret = process.env.WEBHOOK_SECRET || "";

async function handler(request: NextRequest) {
  const payload = await request.json();
  const headersList = headers();
  const heads = {
    "svix-id": headersList.get("svix-id"),
    "svix-timestamp": headersList.get("svix-timestamp"),
    "svix-signature": headersList.get("svix-signature"),
  };
  const wh = new Webhook(webhookSecret);
  let evt: Event | null = null;

  try {
    evt = await wh.verify(
      JSON.stringify(payload),
      heads as unknown as IncomingHttpHeaders & WebhookRequiredHeaders
    ) as Event;
  } catch (err) {
    console.error((err as Error).message);
    return NextResponse.json({}, { status: 400 });
  }

  const eventType: EventType = evt.type;
  if (eventType === "user.created" || eventType === "user.updated") {
    const { id, ...attributes } = evt.data;

    // Check if the user already exists
    const existingUser = await prisma.user.findUnique({
      where: { user_id: id as string },
    });

    if (!existingUser) {
      // If the user does not exist, create a new record
      await prisma.user.create({
        data: {
          user_id: id as string,
          attributes,
        },
      });
    } else {
      // If the user exists, update their attributes
      await prisma.user.update({
        where: { user_id: id as string },
        data: { attributes },
      });
    }
  }

  type EventType = "user.created" | "user.updated" | "*";

  type Event = {
    data: Record<string, string | number>,
    object: "event",
    type: EventType,
  };
}

export const GET = handler;
export const POST = handler;
export const PUT = handler;
