import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { firstName, lastName } = body;

    // Validate input
    if (!firstName || !lastName) {
      return NextResponse.json(
        { error: "First name and last name are required" },
        { status: 400 }
      );
    }

    // Validate name format
    const nameRegex = /^[a-zA-Z\s'-]+$/;
    if (!nameRegex.test(firstName) || !nameRegex.test(lastName)) {
      return NextResponse.json(
        { error: "Names can only contain letters, spaces, hyphens, and apostrophes" },
        { status: 400 }
      );
    }

    // Create Supabase client
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_SUPABASE_SERVICE_ROLE_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // First, get the current user data to preserve existing attributes
    const { data: currentUser, error: fetchError } = await supabase
      .from("users")
      .select("attributes")
      .eq("user_id", userId)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("Error fetching current user:", fetchError);
      return NextResponse.json(
        { error: "Failed to fetch user data" },
        { status: 500 }
      );
    }

    // Prepare updated attributes - merge with existing attributes
    const currentAttributes = currentUser?.attributes || {};
    const updatedAttributes = {
      ...currentAttributes,
      first_name: firstName,
      last_name: lastName,
      updated_at: new Date().toISOString()
    };    // Update or create user record with new attributes
    const { data, error } = await supabase
      .from("users")
      .upsert({
        user_id: userId,
        attributes: updatedAttributes,
        updatedAt: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select();

    if (error) {
      console.error("Supabase update error:", error);
      return NextResponse.json(
        { error: "Failed to update profile in database" },
        { status: 500 }
      );
    }

    // Update Clerk user profile as well
    try {
      await clerkClient.users.updateUser(userId, {
        firstName: firstName,
        lastName: lastName,
      });
    } catch (clerkError) {
      console.error("Clerk update error:", clerkError);
      // Note: We don't return an error here since Supabase update succeeded
      // In production, you might want to implement a retry mechanism or rollback
    }

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      data: {
        firstName,
        lastName,
        updatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Profile update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}