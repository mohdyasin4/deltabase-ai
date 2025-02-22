"use client"
import { useState } from "react";
import { Tabs, Tab, Chip, Switch } from "@heroui/react";
import { useUser } from "@clerk/nextjs";
import { SettingsIcon, BellIcon, User2, Sun, Bell } from "lucide-react"; // Add your icons here
import ModeToggle from "@/components/mode-toggle";

export default function Settings() {
  const { user } = useUser();
  const [theme, setTheme] = useState("light"); // Track the current theme (light or dark mode)

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
    document.body.className = theme === "light" ? "dark" : "light"; // Apply theme globally
  };

  return (
    <div className="flex w-full flex-col px-6 h-[calc(100vh-5vh)]">
      <h2 className="text-3xl font-semibold mt-10 mb-6">Settings</h2>
      
      <Tabs
        aria-label="Settings Tabs"
        color="primary"
        variant="underlined"
        classNames={{
          tabList: "gap-6 w-2/7 relative rounded-none p-0 border-b border-divider",
          cursor: " bg-[#ffcc19]",
          tab: "max-w-fit px-0 h-12",
          tabContent: "group-data-[selected=true]:text-[#ffcc19]",
        }}
      >
        <Tab
          key="general"
          title={
            <div className="flex items-center space-x-2">
              <SettingsIcon />
              <span>General</span>
            </div>
          }
        >
          <div className="py-4">
            <h3 className="text-xl font-bold mb-4">General Information</h3>
            <div className="flex flex-col gap-4">
              <div className="flex gap-4">
                <div className="flex flex-col w-1/2">
                  <label>First Name</label>
                  <input
                    type="text"
                    disabled
                    defaultValue={user?.firstName ?? ""}
                    className="input-field p-4 h-12 rounded-sm"
                  />
                </div>
                <div className="flex flex-col w-1/2">
                  <label>Last Name</label>
                  <input
                    type="text"
                    disabled
                    defaultValue={user?.lastName ?? ""}
                    className="input-field p-4 h-12 rounded-sm"
                  />
                </div>
              </div>
              <div className="flex flex-col mt-3">
                <label>Email</label>
                <input
                  type="text"
                  disabled
                  defaultValue={user?.primaryEmailAddress?.emailAddress ?? ""}
                  className="input-field p-4 h-12 rounded-sm"
                />
              </div>
            </div>
          </div>
        </Tab>

        <Tab
          key="notifications"
          title={
            <div className="flex items-center space-x-2">
              <Bell />
              <span>Notifications</span>
            </div>
          }
        >
          <div className="py-4">
            <h3 className="text-xl font-bold mb-4">Notification Settings</h3>
            <p>Manage how you receive notifications.</p>
            {/* Add notification settings here */}
          </div>
        </Tab>

        <Tab
          key="account"
          title={
            <div className="flex items-center space-x-2">
              <User2 />
              <span>Account</span>
            </div>
          }
        >
          <div className="py-4">
            <h3 className="text-xl font-bold mb-4">Account Settings</h3>
            {/* Add account settings here */}
          </div>
        </Tab>

        <Tab
          key="appearance"
          title={
            <div className="flex items-center space-x-2">
              <Sun />
              <span>Appearance</span>
            </div>
          }
        >
          <div className="py-4">
            <h3 className="text-xl font-bold mb-4">Appearance Settings</h3>
            <div className="flex items-center justify-between">
              <span>Theme</span>
              <ModeToggle/>
            </div>
          </div>
        </Tab>
      </Tabs>
    </div>
  );
}
