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
      appearance={{
        baseTheme: dark,
      }}
    >
      {children}
    </ClerkProvider>
  );
};

export default AuthWrapper;
