import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { otpStore } from '@/lib/otpStore';

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
    const { otpCode, newEmail } = body;

    console.log("Verify OTP request:", { userId, otpCode: otpCode ? "***" : "missing", newEmail });

    // Validate input
    if (!otpCode || !newEmail) {
      console.log("Missing required fields:", { otpCode: !!otpCode, newEmail: !!newEmail });
      return NextResponse.json(
        { error: "OTP code and email are required" },
        { status: 400 }
      );
    }

    // Validate OTP format (should be 6 digits)
    if (!/^\d{6}$/.test(otpCode)) {
      return NextResponse.json(
        { error: "Invalid OTP format. Must be 6 digits." },
        { status: 400 }
      );
    }    // Verify OTP using the shared store
    const verificationResult = otpStore.verify(userId, otpCode, newEmail);
    
    console.log("OTP verification result:", { success: verificationResult.success, error: verificationResult.error });
    
    if (!verificationResult.success) {
      return NextResponse.json(
        { error: verificationResult.error },
        { status: 400 }
      );
    }    // OTP is valid, update email in both Clerk and Supabase
    let clerkUpdateMessage = "Email address updated successfully";
    
    try {
      // Update Supabase user attributes first
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

      // Get current user data to preserve existing attributes
      const { data: currentUser, error: fetchError } = await supabase
        .from("users")
        .select("attributes")
        .eq("user_id", userId)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        console.error("Error fetching current user:", fetchError);
      }

      // Update user attributes with new email
      const currentAttributes = currentUser?.attributes || {};
      const updatedAttributes = {
        ...currentAttributes,
        email: newEmail,
        email_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error: updateError } = await supabase
        .from("users")
        .upsert({
          user_id: userId,
          attributes: updatedAttributes,
          updatedAt: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (updateError) {
        console.error("Supabase email update error:", updateError);
        return NextResponse.json(
          { error: "Failed to update email address in database" },
          { status: 500 }
        );
      }      // Handle Clerk email update with improved error handling
      
      try {
        console.log("Attempting to update Clerk email...");
        
        // Get current user from Clerk
        const clerkUser = await clerkClient.users.getUser(userId);
        console.log("Current Clerk user found with", clerkUser.emailAddresses.length, "email addresses");
        
        // Check if the new email already exists in Clerk
        const existingEmailAddress = clerkUser.emailAddresses.find(
          email => email.emailAddress === newEmail
        );

        if (existingEmailAddress) {
          console.log("Email address already exists in Clerk");
          
          // If it exists and is verified, try to set it as primary
          if (existingEmailAddress.verification?.status === 'verified') {
            await clerkClient.users.updateUser(userId, {
              primaryEmailAddressID: existingEmailAddress.id,
            });
            clerkUpdateMessage = "Email updated successfully in both database and Clerk.";
            console.log("Successfully set existing verified email as primary in Clerk");
          } else {
            clerkUpdateMessage = "Email updated in database. Existing email in Clerk requires verification.";
            console.log("Email exists in Clerk but is not verified");
          }
        } else {
          console.log("Creating new email address in Clerk");
          
          // Create new email address in Clerk (it will be unverified initially)
          const newEmailAddress = await clerkClient.emailAddresses.createEmailAddress({
            userId,
            emailAddress: newEmail,
          });
          
          console.log("New email address created in Clerk with ID:", newEmailAddress.id);
          clerkUpdateMessage = "Email updated in database. Please verify the new email in Clerk to complete the process.";
          
          // Note: We don't try to set unverified email as primary as Clerk will reject it
        }

      } catch (clerkError) {
        console.error("Clerk email update failed:", clerkError);
        
        // Parse Clerk error for better user feedback
        let errorMessage = "Clerk sync failed but email was updated in database.";
        if (clerkError instanceof Error) {
          console.error("Clerk error details:", clerkError.message);
          
          // Check for specific Clerk error types
          if (clerkError.message.includes('already exists')) {
            errorMessage = "Email updated in database. Email may already exist in Clerk.";
          } else if (clerkError.message.includes('verification')) {
            errorMessage = "Email updated in database. Additional verification required in Clerk.";
          }
        }
        
        clerkUpdateMessage = errorMessage;
        
        // Don't fail the entire request - the email is successfully updated in our database
        console.log("Continuing despite Clerk error - user can complete Clerk verification separately");
      }

    } catch (updateError) {
      console.error("Error updating email:", updateError);
      return NextResponse.json(
        { error: "Failed to update email address" },
        { status: 500 }
      );
    }    return NextResponse.json({
      success: true,
      message: clerkUpdateMessage,
      data: {
        newEmail,
        updatedAt: new Date().toISOString(),
        requiresClerkVerification: clerkUpdateMessage.includes("verify") || clerkUpdateMessage.includes("verification")
      }
    });

  } catch (error) {
    console.error("Verify OTP error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
