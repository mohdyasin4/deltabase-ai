"server only"

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { userCreateProps } from "@/utils/types";

export const userCreate = async ({
  email,
  first_name,
  last_name,
  profile_image_url,
  user_id,
}: userCreateProps) => {
  const cookieStore = cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_DATABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
      },
    }
  );

  try {
    // First, check if a user with this email already exists
    const { data: existingUser, error: checkError } = await supabase
      .from("users")
      .select("*")
      .eq("email", email)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      // PGRST116 means no rows returned, which is expected if the user doesn't exist
      throw checkError;
    }

    if (existingUser) {
      // If user exists, update their details
      const { data, error } = await supabase
        .from("users")
        .update({
          first_name,
          last_name,
          profile_image_url,
          user_id,
        })
        .eq("email", email)
        .select();

      if (error) throw error;
      return data;
    } else {
      // If user doesn't exist, create a new entry
      const { data, error } = await supabase
        .from("users")
        .insert([
          {
            email,
            first_name,
            last_name,
            profile_image_url,
            user_id,
          },
        ])
        .select();

      if (error) throw error;
      return data;
    }
  } catch (error: any) {
    throw new Error(error.message);
  }
};
