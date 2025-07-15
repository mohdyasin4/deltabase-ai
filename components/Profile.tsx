"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SignOutButton, useUser } from "@clerk/nextjs";
import {
  User,
  Settings,
  HelpCircle,
  LogOut,
  Crown,
  Moon,
  Sun,
  CreditCard,
  Activity,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import { useTheme } from "next-themes";

interface ProfileProps {
  isExpanded: boolean;
}

export function Profile({ isExpanded }: ProfileProps) {
  const { user } = useUser();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  // Get user's plan status
  const userPlan = user?.publicMetadata?.plan || "Free";
  const isProUser = userPlan === "Pro" || userPlan === "Premium";
  
  // Enhanced user name display logic
  const getUserDisplayName = () => {
    if (user?.firstName || user?.lastName) {
      const firstName = user?.firstName || "";
      const lastName = user?.lastName || "";
      return `${firstName} ${lastName}`.trim();
    }
    
    // Fallback to other available names
    return user?.username || 
           user?.fullName || 
           user?.emailAddresses?.[0]?.emailAddress?.split('@')[0] || 
           "User";
  };

  const getUserInitials = () => {
    if (user?.firstName || user?.lastName) {
      const firstInitial = user?.firstName?.charAt(0)?.toUpperCase() || "";
      const lastInitial = user?.lastName?.charAt(0)?.toUpperCase() || "";
      return `${firstInitial}${lastInitial}` || "U";
    }
    
    // Fallback initials
    const fallbackName = user?.username || user?.fullName || user?.emailAddresses?.[0]?.emailAddress || "User";
    return fallbackName.charAt(0)?.toUpperCase() || "U";
  };
  
  useEffect(() => {
    setMounted(true);
    // Debug: Log user data to see what's available
    if (user) {
      console.log("User data:", {
        firstName: user.firstName,
        lastName: user.lastName,
        username: user.username,
        fullName: user.fullName,
        email: user.emailAddresses?.[0]?.emailAddress
      });
    }
  }, [user]);

  const handleNavigation = (path: string) => {
    router.push(path);
    setIsOpen(false);
  };
  const toggleTheme = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    toast.success(`${newTheme === 'dark' ? '🌙' : '☀️'} Switched to ${newTheme} mode`, {
      duration: 2000,
    });
  };
  const handleAction = (action: string) => {
    setIsOpen(false);
    
    switch (action) {
      case "profile":
        handleNavigation("/dashboard/settings");
        toast.success("Opening profile settings...", { duration: 1500 });
        break;
      case "settings":
        handleNavigation("/dashboard/settings");
        toast.success("Opening settings...", { duration: 1500 });
        break;      case "billing":
        toast("💳 Billing & Subscription - Manage your subscription and billing", {
          duration: 2500,
        });
        break;
      case "activity":
        handleNavigation("/dashboard/logs");
        toast.success("Opening activity log...", { duration: 1500 });
        break;
      case "help":
        window.open("mailto:support@deltabase.ai", "_blank");
        toast.success("Opening email client...", { duration: 1500 });
        break;      case "upgrade":
        handleNavigation("/dashboard/billing");
        toast.success("✨ Upgrade to Pro! - Unlock premium features", {
          duration: 3000,
        });
        break;
      default:
        break;
    }
  };  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen} >
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="relative h-11 w-11 rounded-full p-0 hover:bg-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 transition-all duration-300 group"
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative"
          >
            {/* Animated ring effect */}
            <motion.div
              className="absolute inset-0 rounded-full bg-gradient-to-r from-amber-500/20 via-amber-500/20 to-amber-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              animate={isOpen ? { 
                rotate: 360,
                scale: [1, 1.1, 1]
              } : { rotate: 0 }}
              transition={{ 
                rotate: { duration: 3, repeat: Infinity, ease: "linear" },
                scale: { duration: 2, repeat: Infinity, ease: "easeInOut" }
              }}
            />
            
            {/* Glow effect */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400/10 via-purple-400/10 to-pink-400/10 blur-lg opacity-0 group-hover:opacity-60 transition-opacity duration-300" />
            
            <Avatar className="h-11 w-11 border-2 border-amber-500/30 shadow-lg hover:shadow-xl hover:shadow-amber-500/25 transition-all duration-300 relative z-10 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
              <AvatarImage  
                src={user?.imageUrl} 
                alt={user?.firstName || "User"}
                className="object-cover transition-all duration-300 group-hover:brightness-110"
              />
              <AvatarFallback className="bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 text-white font-bold text-sm shadow-inner">
                {user?.firstName?.charAt(0)?.toUpperCase() || 
                 user?.lastName?.charAt(0)?.toUpperCase() || 
                 user?.emailAddresses?.[0]?.emailAddress?.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            
            {/* Enhanced online indicator with pulse */}
            <motion.div 
              className="absolute z-10 -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-background shadow-lg"
              animate={{
                scale: [1, 1.2, 1],
                boxShadow: [
                  "0 0 0 0px rgba(16, 185, 129, 0.4)",
                  "0 0 0 4px rgba(16, 185, 129, 0)",
                  "0 0 0 0px rgba(16, 185, 129, 0)"
                ]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            />
            
            {/* Cool Pro badge with animation */}
            {isProUser && (
              <motion.div 
                className="absolute -top-0.5 -right-0.5 h-5 w-5 rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 border-2 border-background flex items-center justify-center shadow-lg"
                animate={{
                  rotate: [0, 15, -15, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              >
                <Crown className="h-2.5 w-2.5 text-white drop-shadow-sm" />
                
                {/* Sparkle effect */}
                <motion.div
                  className="absolute inset-0 rounded-full"
                  animate={{
                    boxShadow: [
                      "0 0 0 0px rgba(251, 191, 36, 0.4)",
                      "0 0 0 3px rgba(251, 191, 36, 0)",
                      "0 0 0 0px rgba(251, 191, 36, 0)"
                    ]
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1
                  }}
                />
              </motion.div>
            )}
          </motion.div>
        </Button>
      </DropdownMenuTrigger><DropdownMenuContent 
        className="w-64 p-0"
        align="end"
        side="right"
        sideOffset={14}
      >
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.1, ease: "easeOut" }}
          className="bg-background border border-border rounded-lg shadow-lg overflow-hidden"
        >
          {/* Header Section */}
          <div className="p-4 border-b border-border/50">
            <div className="flex items-center space-x-3">
              <Avatar className="h-10 w-10">
                <AvatarImage 
                  src={user?.imageUrl} 
                  alt={user?.firstName || "User"}
                  className="object-cover"
                />
                <AvatarFallback className="bg-muted text-muted-foreground text-sm font-medium">
                  {user?.firstName?.charAt(0)?.toUpperCase() || 
                   user?.lastName?.charAt(0)?.toUpperCase() || 
                   user?.emailAddresses?.[0]?.emailAddress?.charAt(0)?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm text-foreground truncate">
                    {user?.firstName && user?.lastName 
                      ? `${user.firstName} ${user.lastName}`
                      : user?.username || "User"}
                  </p>
                  {isProUser && (
                    <Badge variant="secondary" className="text-xs h-5">
                      <Crown className="h-3 w-3 mr-1" />
                      Pro
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.emailAddresses?.[0]?.emailAddress}
                </p>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="p-1">
            <DropdownMenuItem 
              onClick={() => handleAction("profile")}
              className="flex items-center space-x-3 px-3 py-2 rounded-md cursor-pointer transition-colors"
            >
              <User className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Profile</span>
            </DropdownMenuItem>

            <DropdownMenuItem 
              onClick={() => handleAction("settings")}
              className="flex items-center space-x-3 px-3 py-2 rounded-md cursor-pointer transition-colors"
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Settings</span>
            </DropdownMenuItem>

            <DropdownMenuItem 
              onClick={() => handleAction("billing")}
              className="flex items-center space-x-3 px-3 py-2 rounded-md cursor-pointer transition-colors"
            >
              <CreditCard className="h-4 w-4 text-muted-foreground" />
              <div className="flex-1 flex items-center justify-between">
                <span className="text-sm">Billing</span>
                {!isProUser && (
                  <Badge variant="outline" className="text-xs h-5">
                    Upgrade
                  </Badge>
                )}
              </div>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="my-1" />

            <DropdownMenuItem 
              onClick={() => handleAction("activity")}
              className="flex items-center space-x-3 px-3 py-2 rounded-md cursor-pointer transition-colors"
            >
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Activity</span>
            </DropdownMenuItem>

            <DropdownMenuItem 
              onClick={toggleTheme}
              className="flex items-center space-x-3 px-3 py-2 rounded-md cursor-pointer transition-colors"
            >
              {mounted && theme === 'dark' ? (
                <Sun className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Moon className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm">
                {mounted && theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
              </span>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="my-1" />

            <DropdownMenuItem 
              onClick={() => handleAction("help")}
              className="flex items-center space-x-3 px-3 py-2 rounded-md cursor-pointer transition-colors"
            >
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">Help & Support</span>
            </DropdownMenuItem>

            {/* Upgrade CTA for Free Users */}
            {!isProUser && (
              <>
                <DropdownMenuSeparator className="my-1" />
                <DropdownMenuItem 
                  onClick={() => handleAction('upgrade')}
                  className="flex items-center space-x-3 px-3 py-2 rounded-md cursor-pointer transition-colors bg-muted/50 hover:bg-muted"
                >
                  <Sparkles className="h-4 w-4 text-foreground" />
                  <span className="text-sm font-medium">Upgrade to Pro</span>
                </DropdownMenuItem>
              </>
            )}

            <DropdownMenuSeparator className="my-1" />

            {/* Sign Out */}
            <DropdownMenuItem className="p-0">
              <SignOutButton redirectUrl="/sign-in">
                <button className="w-full flex items-center space-x-3 px-3 py-2 rounded-md cursor-pointer transition-colors hover:bg-destructive/10 text-destructive">
                  <LogOut className="h-4 w-4" />
                  <span className="text-sm">Sign Out</span>
                </button>
              </SignOutButton>
            </DropdownMenuItem>
          </div>
        </motion.div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
