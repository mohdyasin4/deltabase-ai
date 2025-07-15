"use client";
import { useRouter as useBaseRouter } from "next/navigation";
import NProgress from "nprogress";

export function useRouter() {
  const baseRouter = useBaseRouter();

  const push = async (...args: Parameters<typeof baseRouter.push>) => {
    NProgress.start();
    try {
      const result = await baseRouter.push(...args);
      return result;
    } finally {
      NProgress.done();
    }
  };

  const refresh = async (...args: Parameters<typeof baseRouter.refresh>) => {
    NProgress.start();
    try {
      const result = await baseRouter.refresh(...args);
      return result;
    } finally {
      NProgress.done();
    }
  };

  return {
    ...baseRouter,
    push,
    refresh,
  };
}
