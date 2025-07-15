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

    const formData = await req.formData();
    const imageFile = formData.get('image') as File;

    if (!imageFile) {
      return NextResponse.json(
        { error: "No image file provided" },
        { status: 400 }
      );
    }

    // Validate file type
    if (!imageFile.type.startsWith('image/')) {
      return NextResponse.json(
        { error: "File must be an image" },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (imageFile.size > maxSize) {
      return NextResponse.json(
        { error: "Image size must be less than 5MB" },
        { status: 400 }
      );
    }    // Update Clerk user profile image first
    let imageUrl: string;
    try {
      // Convert File to Buffer for Clerk
      const arrayBuffer = await imageFile.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Create FormData for Clerk API
      const formData = new FormData();
      const blob = new Blob([buffer], { type: imageFile.type });
      formData.append('file', blob);

      // Upload profile image to Clerk using REST API
      const clerkResponse = await fetch(`https://api.clerk.com/v1/users/${userId}/profile_image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
        },
        body: formData,
      });

      if (!clerkResponse.ok) {
        const errorData = await clerkResponse.text();
        console.error("Clerk API response error:", errorData);
        throw new Error(`Clerk API error: ${clerkResponse.status} ${clerkResponse.statusText}`);
      }

      const clerkUser = await clerkResponse.json();
      imageUrl = clerkUser.image_url || clerkUser.profile_image_url;

      if (!imageUrl) {
        throw new Error("Failed to get image URL from Clerk response");
      }
    } catch (clerkError) {
      console.error("Clerk image upload error:", clerkError);
      return NextResponse.json(
        { error: "Failed to upload image to Clerk" },
        { status: 500 }
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

    // Update user attributes in Supabase
    const { data: currentUser, error: fetchError } = await supabase
      .from("users")
      .select("attributes")
      .eq("user_id", userId)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("Error fetching current user:", fetchError);
    }

    // Prepare updated attributes - merge with existing attributes
    const currentAttributes = currentUser?.attributes || {};
    const updatedAttributes = {
      ...currentAttributes,
      profile_image_url: imageUrl,
      updated_at: new Date().toISOString()
    };

    // Update or create user record with new attributes
    const { error: dbError } = await supabase
      .from("users")
      .upsert({
        user_id: userId,
        attributes: updatedAttributes,
        updatedAt: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (dbError) {
      console.error("Supabase database update error:", dbError);
      return NextResponse.json(
        { error: "Failed to update profile in database" },
        { status: 500 }
      );
    }    return NextResponse.json({
      success: true,
      message: "Profile image updated successfully",
      data: {
        imageUrl,
        updatedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Profile image update error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
