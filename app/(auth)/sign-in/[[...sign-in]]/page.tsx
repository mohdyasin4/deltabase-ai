"use client";
import * as Clerk from "@clerk/elements/common";
import * as SignInn from "@clerk/elements/sign-in";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Github } from "lucide-react";
import { cn } from "@/lib/utils";
import { FaFile, FaGithub, FaGoogle } from "react-icons/fa";
import { Icons } from "@/components/ui/icons";
import { SignIn } from "@clerk/nextjs";
import { dark, shadesOfPurple } from "@clerk/themes";

export default function SignInPage() {
  return (
    <div className="absolute w-full lg:grid lg:grid-cols-2 min-h-screen dark">
      <div className="absolute w-full flex justify-between p-6 items-center">
        <Link href="/">
          <Image
            src="/images/refractlogo/whitelogo.svg"
            alt="Refract"
            width={135}
            height={135}
          />
        </Link>
        <Button disabled className="relative justify-center cursor-pointer text-white inline-flex items-center dark:border space-x-2 text-center font-medium gap-2 ease-out duration-200 rounded-md outline-none transition-all outline-0 focus-visible:outline-4 focus-visible:outline-offset-1 bg-alternative bg-[#1a1a1a] hover:bg-selection border-strong hover:border-stronger focus-visible:outline-brand-600 data-[state=open]:bg-selection data-[state=open]:outline-brand-600 data-[state=open]:border-button-hover text-xs px-2.5 py-1 h-[26px]">
          <FileText color="#ffbe18" size={16} />
          Documentation
        </Button>
      </div>
      <div className="flex items-center justify-center py-12 bg-[#0E0E0E]">
        <div className="grid w-full grow items-center px-4 sm:justify-center">
          <SignIn
            appearance={{
              elements: {
                footer: {
                  background: "transparent",
                },
              },
            }}
          />
        </div>
      </div>
      <div className="relative h-full z-[-99]">
        <video
          className="z-50 top-0 left-0 object-cover w-full h-full"
          autoPlay
          muted
          controls={false}
          loop
        >
          <source src="/videos/data.mp4" />
          Your browser does not support the video tag...
        </video>
      </div>
    </div>
  );
}
