import { ReactNode } from "react";
import { ClerkProvider } from "@clerk/nextjs";
import config from "@/config";
import { dark, shadesOfPurple } from "@clerk/themes";
interface AuthWrapperProps {
  children: ReactNode;
}

const AuthWrapper = ({ children }: AuthWrapperProps) => {
  if (!config.auth.enabled) {
    return <>{children}</>;
  }

  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}
      appearance={{
        baseTheme: dark,
        layout: {
          unsafe_disableDevelopmentModeWarnings: true,
        }
      }}
    >
      {children}
    </ClerkProvider>
  );
};

export default AuthWrapper;
