"use client"
import { ArrowRight, Github } from 'lucide-react';
import Link from "next/link";
import { BorderBeam } from "../magicui/border-beam";
import { Button } from "../ui/button";
import Image from 'next/image';

export default function HeroSection() {
    return (
        <div className='flex flex-col items-center justify-center leading-6 mt-[3rem]'>
            {/* <div className="my-5"
                <AnimatedGradientTextComponent />
            </div> */}
            <h1 className="scroll-m-20 text-4xl sm:text-4xl md:text-6xl font-semibold tracking-tight lg:text-6xl text-center max-w-[1000px]  dark:text-white">
                Unleash the Power of Your Data with <span className='text-primary'>Deltabase</span>
            </h1>
            <p className="mx-auto max-w-[800px] text-gray-500 text-xl text-center mt-2 dark:text-gray-400">
                Transform raw data into actionable insights with our intuitive analysis and dashboard building tool. Make data-driven decisions effortlessly
            </p>
            <div className="flex justify-center items-center gap-3">
                <Link href="/dashboard" className="mt-5">
                    <Button className="animate-buttonheartbeat rounded-md bg-primary hover:bg-primary text-sm font-semibold text-black">Get Started</Button>
                </Link>
                <Link href="https://discord.gg/HUcHdrrDgY" target='_blank' className="mt-5">
                    <Button variant="outline" className="flex gap-1 ">Join Discord<ArrowRight className='w-4 h-4' /></Button>
                </Link>
                <Link href="https://github.com/michaelshimeles/nextjs14-starter-template" target='_blank' className='animate-buttonheartbeat border p-2 rounded-full mt-5 hover:dark:bg-black hover:cursor-pointer'>
                    <Github className='w-5 h-5' />
                </Link>
            </div>
            <div>
                <div className="relative flex max-w-6xl justify-center overflow-hidden mt-7 ">
                    <div className="relative rounded-xl">
                        <Image
                            src="https://utfs.io/f/31dba2ff-6c3b-4927-99cd-b928eaa54d5f-5w20ij.png"
                            alt="Hero Image"
                            width={1200}
                            height={1200}
                            className="block w-[1200px] rounded-[inherit] border object-contain shadow-lg dark:hidden"
                        />
                        <Image
                            src="https://utfs.io/f/69a12ab1-4d57-4913-90f9-38c6aca6c373-1txg2.png"
                            alt="Hero Image"
                            width={1200}
                            height={1200}
                            className="dark:block w-[1200px] rounded-[inherit] border object-contain shadow-lg hidden"
                        />
                        <BorderBeam size={250} duration={12} delay={9} />
                    </div>
                </div>
            </div>

        </div>
    )
}
