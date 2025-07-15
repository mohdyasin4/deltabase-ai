"use client";
import { useForm } from 'react-hook-form';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

export default function Footer() {
    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm();

    const onSubmit = async (data: any) => {
        // Add your submission logic here, such as sending data to an API or handling user subscriptions.
        console.log(data);
        reset(); // Reset the form after submission
    };

    return (
        <footer className="border-t dark:bg-black">
            <div className="mx-auto max-w-screen-xl px-4 sm:px-6 lg:px-8">
                <div className="lg:grid lg:grid-cols-2">
                    <div
                        className="border-b py-8 lg:order-last lg:border-b-0 lg:border-s lg:py-16 lg:ps-16"
                    >
                        <div className="mt-8 space-y-4 lg:mt-0">
                            <div>
                                <h3 className="text-2xl font-medium">Stay Updated with Refract</h3>
                                <p className="mt-4 max-w-lg">
                                    Sign up for our newsletter to receive the latest news, updates, and insights on data analytics and visualization.
                                </p>
                            </div>
                            <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col border rounded-xl p-4 gap-3 mt-6 w-full">
                                <Input
                                    {...register('email', { required: 'Email is required' })}
                                    placeholder="Enter your email"
                                    type="email"
                                    className={`border ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
                                />
                                {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
                                <Button type="submit">Sign Up</Button>
                            </form>
                        </div>
                    </div>

                    <div className="py-8 lg:py-16 lg:pe-16">
                        <div className="mt-8 grid grid-cols-1 gap-8 sm:grid-cols-2">
                            <div>
                                <p className="font-medium">Connect with Us</p>
                                <ul className="mt-6 space-y-4 text-sm">
                                    <li>
                                        <a href="https://twitter.com/Refract" target="_blank" rel="noopener noreferrer" className="transition hover:opacity-75"> Twitter </a>
                                    </li>
                                    <li>
                                        <a href="https://www.linkedin.com/company/Refract" target="_blank" rel="noopener noreferrer" className="transition hover:opacity-75"> LinkedIn </a>
                                    </li>
                                    <li>
                                        <a href="https://www.youtube.com/channel/Refract" target="_blank" rel="noopener noreferrer" className="transition hover:opacity-75"> YouTube </a>
                                    </li>
                                </ul>
                            </div>

                            <div>
                                <p className="font-medium">Helpful Links</p>
                                <ul className="mt-6 space-y-4 text-sm">
                                    <li>
                                        <a href="/docs" target="_blank" rel="noopener noreferrer" className="transition hover:opacity-75"> Documentation </a>
                                    </li>
                                    <li>
                                        <a href="/methodology" target="_blank" rel="noopener noreferrer" className="transition hover:opacity-75"> Methodology </a>
                                    </li>
                                    <li>
                                        <a href="/blog" target="_blank" rel="noopener noreferrer" className="transition hover:opacity-75"> Blog </a>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        <div className="mt-8 border-t pt-8">
                            <ul className="flex flex-wrap gap-4 text-xs">
                                <li>
                                    <a href="/terms" target="_blank" rel="noopener noreferrer" className="transition hover:opacity-75">Terms & Conditions </a>
                                </li>
                                <li>
                                    <a href="/privacy" target="_blank" rel="noopener noreferrer" className="transition hover:opacity-75">Privacy Policy </a>
                                </li>
                            </ul>
                            <p className="mt-8 text-xs">&copy; 2024. Refract LLC. All rights reserved.</p>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
}
