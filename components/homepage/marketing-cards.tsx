"use client";
import { TITLE_TAILWIND_CLASS } from '@/utils/constants';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Database,
  Cpu,
  BarChart2,
  Layout,
  Link2,
  Shield,
  UserCheck,
  Users
} from 'lucide-react';

const RefractFeaturesData = [
  {
    id: 1,
    name: 'AI-Powered Query Assistance',
    description: 'Use AI to generate SQL queries, table name suggestions, and interact with your database effortlessly.',
    icon: Cpu,
    url: "#"
  },
  {
    id: 2,
    name: 'Multi-Database Support',
    description: 'Connect and manage multiple databases such as MySQL, PostgreSQL, MongoDB, and more, all in one place.',
    icon: Database,
    url: "#"
  },
  {
    id: 3,
    name: 'Dynamic Dashboards',
    description: 'Create and customize dashboards with real-time data visualizations from various datasets.',
    icon: BarChart2,
    url: "#"
  },
  {
    id: 4,
    name: 'Advanced Query Builder',
    description: 'Build complex SQL queries using an intuitive interface, simplifying database interactions.',
    icon: Layout,
    url: "#"
  },
  {
    id: 5,
    name: 'Embedding & Integration',
    description: 'Embed charts and dashboards into your applications or websites with ease.',
    icon: Link2,
    url: "#"
  },
  {
    id: 6,
    name: 'Supabase Integration',
    description: 'Leverage Supabase’s powerful backend infrastructure with PostgreSQL for seamless database management.',
    icon: Database,
    url: "https://supabase.com/"
  },
  {
    id: 7,
    name: 'Secure Authentication',
    description: 'Clerk-based authentication ensures that only authorized users access your databases and dashboards.',
    icon: Shield,
    url: "https://clerk.com/"
  },
  {
    id: 8,
    name: 'Real-Time Collaboration',
    description: 'Collaborate in real-time with your team on data analysis, dashboard creation, and more.',
    icon: Users,
    url: "#"
  },
];

const RefractFeaturesComponent = () => {
  return (
    <div className="flex flex-col justify-center items-center lg:w-[75%]">
      <div className="flex flex-col mb-[3rem]">
        <h2 className={`${TITLE_TAILWIND_CLASS} mt-2 font-semibold tracking-tight dark:text-white text-gray-900`}>
          Refract: Your AI-Powered Business Intelligence Platform
        </h2>
        <p className="mx-auto max-w-[500px] text-gray-600 dark:text-gray-400 text-center mt-2">
          Unlock insights from your data with the most advanced features, powered by AI and tailored for multi-database support.
        </p>
      </div>
      <div className="grid w-full grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {RefractFeaturesData.map((feature) => {
          const Icon = feature.icon;
          return (
            <motion.div
              whileHover={{
                y: -8,
              }}
              transition={{
                type: 'spring',
                bounce: 0.7,
              }}
              key={feature.id}
              className="mt-5 text-left border p-6 rounded-md dark:bg-black"
            >
              <Link href={feature?.url} target="_blank" rel="noopener noreferrer">
                <Icon className="mb-3 w-10 h-10 text-[#ffcc19]" />
                <div className="mb-1 text-sm font-medium">
                  {feature.name}
                </div>
                <div className="max-w-[250px] text-sm font-normal text-gray-600 dark:text-gray-400">
                  {feature.description}
                </div>
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default RefractFeaturesComponent;
