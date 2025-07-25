"use server";

import { auth } from "@clerk/nextjs/server";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function actionTemplate() {
  const { userId } = auth();

  if (!userId) {
    return "You must be signed in";
  }

  const supabase = createServerComponentClient({ cookies });

  try {
    let { data: user, error } = await supabase.from("users").select("*");

    if (user) return user;

    if (error) return error;
  } catch (error: any) {
    throw new Error(error.message);
  }

}
