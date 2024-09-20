"use client"
import { useRouter as useBaseRouter } from "next/navigation";
import NProgress from "nprogress";

export function useRouter() {
  const router = useBaseRouter();

  // Store the original methods
  const originalPush = router.push;
  const originalRefresh = router.refresh;

  // Override the push method
  router.push = async (...args: Parameters<typeof originalPush>) => {
    NProgress.start();
    try {
      const result = await originalPush.apply(router, args);
      return result;
    } finally {
      NProgress.done();
    }
  };

  // Override the refresh method
  router.refresh = async (...args: Parameters<typeof originalRefresh>) => {
    NProgress.start();
    try {
      const result = await originalRefresh.apply(router, args);
      return result;
    } finally {
      NProgress.done();
    }
  };

  return router;
}
