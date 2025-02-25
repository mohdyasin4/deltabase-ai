import { prisma } from "@/lib/db";
import { createClient } from "@supabase/supabase-js";
import { IncomingHttpHeaders } from "http";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { Webhook, WebhookRequiredHeaders } from "svix";
import { supabaseClient } from "@/lib/supabaseClient";

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
    const { id, attributes } = evt.data;

    // ✅ Step 1: Insert/Update User in Supabase
    const { error } = await supabaseClient.from("users").upsert(
      {
        user_id: id, // Clerk user ID
        attributes: attributes, // JSON attributes object
        role: "authenticated", // Assign role
      },
      { onConflict: "id" } // Ensure unique user
    );

    if (error) {
      console.error("Supabase Error:", error);
      return NextResponse.json({ error: "Failed to sync user to Supabase" }, { status: 500 });
    }

    // ✅ Step 2: Insert into Prisma (if needed)
    const existingUser = await prisma.users.findUnique({
      where: { user_id: id as string },
    });

    if (!existingUser) {
      await prisma.users.create({
        data: { user_id: id as string, attributes },
      });
    } else {
      await prisma.users.update({
        where: { user_id: id as string },
        data: { attributes },
      });
    }

    return NextResponse.json({ success: true, message: `User ${eventType} processed` }, { status: 200 });
  }

  return NextResponse.json({ success: true, message: "Event received but not processed" }, { status: 200 });
}

// ✅ Only export POST handler
export const POST = handler;

type EventType = "user.created" | "user.updated" | "*";

type Event = {
  data: {
    id: string;
    attributes: Record<string, any>;
  };
  object: "event";
  type: EventType;
};
