"use client";
import { useState, useEffect } from "react";
import { Tabs, Tab, Switch } from "@heroui/react";
import { useUser } from "@clerk/nextjs";
import {
  Settings as SettingsIcon,
  Bell,
  User2,
  Palette,
  Shield,
  Mail,
  Clock,
  Globe,
  Monitor,
  Smartphone,
  Volume2,
  VolumeX,
  Eye,
  EyeOff,
  Save,
  CheckCircle,
  Edit3,
  X,
  Loader2,
  Camera,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import ModeToggle from "@/components/mode-toggle";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { motion } from "framer-motion";

export default function Settings() {
  const { user } = useUser();
  
  // Notification states
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [privateProfile, setPrivateProfile] = useState(false);
    // Editing states
  const [isEditingName, setIsEditingName] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);

  // Update name fields when user data loads
  useEffect(() => {
    if (user?.firstName) {
      setFirstName(user.firstName);
    }
    if (user?.lastName) {
      setLastName(user.lastName);
    }  }, [user?.firstName, user?.lastName]);
  
  // Profile picture states
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isImageDialogOpen, setIsImageDialogOpen] = useState(false);  const handleSaveName = async () => {
    setIsSavingName(true);
    const toastId = toast.loading("Updating name...");
    
    try {
      const response = await fetch('/api/profile/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ firstName, lastName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update name');
      }
      
      setIsEditingName(false);
      // Refresh user data in Clerk
      await user?.reload();
      
      toast.dismiss(toastId);
      toast.success("Name updated successfully!");
    } catch (error) {
      toast.dismiss(toastId);
      toast.error("Failed to update name. Please try again.");
      console.error("Failed to update name:", error);
    } finally {
      setIsSavingName(false);
    }
  };
  const handleCancelNameEdit = () => {
    setFirstName(user?.firstName ?? "");
    setLastName(user?.lastName ?? "");
    setIsEditingName(false);
  };
  
  // Profile picture handlers
  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error('Image size must be less than 5MB');
        return;
      }

      setSelectedImage(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  const handleImageUpload = async () => {
    if (!selectedImage) return;

    setIsUploadingImage(true);
    const toastId = toast.loading("Uploading profile picture...");
    
    try {
      const formData = new FormData();
      formData.append('image', selectedImage);

      const response = await fetch('/api/profile/image/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload image');
      }

      setIsImageDialogOpen(false);
      setSelectedImage(null);
      setImagePreview(null);
      
      // Refresh user data in Clerk without page reload
      await user?.reload();
      
      toast.dismiss(toastId);
      toast.success("Profile picture updated successfully!");
    } catch (error) {
      console.error("Failed to upload image:", error);
      toast.dismiss(toastId);
      toast.error("Failed to upload image. Please try again.");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleCloseImageDialog = () => {
    setIsImageDialogOpen(false);
    setSelectedImage(null);
    setImagePreview(null);
  };

  return (
    <div className="flex w-full flex-col px-6 py-8 h-[calc(100vh-5vh)] max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mb-8"
      >
        {" "}
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/10 border border-primary/20">
            <SettingsIcon className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Settings
          </h1>
        </div>
        <p className="text-muted-foreground">
          Manage your account preferences and application settings
        </p>
      </motion.div>

      <Tabs
        aria-label="Settings Tabs"
        color="primary"
        variant="underlined"
        classNames={{
          tabList:
            "gap-8 w-full relative rounded-none p-0 border-b border-border/50",
          cursor: "bg-primary",
          tab: "max-w-fit px-0 h-12 data-[selected=true]:text-primary",
          tabContent: "group-data-[selected=true]:text-primary font-medium",
        }}
      >
        <Tab
          key="general"
          title={
            <div className="flex items-center space-x-2">
              <User2 className="h-4 w-4" />
              <span>Profile</span>
            </div>
          }
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="py-6 space-y-6"
          >            <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-semibold">
                      Personal Information
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      Update your personal details and contact information
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="border-green-600 text-green-600 dark:border-green-400 dark:text-green-400"
                    >
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                    {!isEditingName && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsEditingName(true)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit3 className="h-4 w-4" />
                        <span className="sr-only">Edit name</span>
                      </Button>
                    )}                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Profile Picture Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <Avatar className="h-20 w-20 border-2 border-border/50">
                        <AvatarImage src={user?.imageUrl} alt="Profile picture" />
                        <AvatarFallback className="text-lg">
                          {user?.firstName?.charAt(0)?.toUpperCase() ?? "U"}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="flex-1 space-y-2">
                      <div>
                        <h4 className="text-sm font-medium">Profile Picture</h4>
                        <p className="text-xs text-muted-foreground">
                          Upload a new profile picture. JPG, PNG or GIF. Max 5MB.
                        </p>
                      </div>
                      <Dialog open={isImageDialogOpen} onOpenChange={setIsImageDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="h-8">
                            <Camera className="h-3 w-3 mr-1" />
                            Change Picture
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Update Profile Picture</DialogTitle>
                            <DialogDescription>
                              Choose a new profile picture. The image will be updated in both your account and across the platform.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div className="flex flex-col items-center gap-4">
                              {imagePreview ? (
                                <div className="relative">
                                  <Avatar className="h-32 w-32 border-2 border-border">
                                    <AvatarImage src={imagePreview} alt="Preview" />
                                  </Avatar>
                                </div>
                              ) : (
                                <div className="flex h-32 w-32 items-center justify-center rounded-full border-2 border-dashed border-border bg-muted/20">
                                  <Upload className="h-8 w-8 text-muted-foreground" />
                                </div>
                              )}
                              <div className="w-full">
                                <input
                                  id="image-upload"
                                  type="file"
                                  accept="image/*"
                                  onChange={handleImageSelect}
                                  className="hidden"
                                />
                                <label htmlFor="image-upload">
                                  <Button variant="outline" asChild className="w-full cursor-pointer">
                                    <span>
                                      <Upload className="h-4 w-4 mr-2" />
                                      Select Image
                                    </span>
                                  </Button>
                                </label>
                              </div>
                            </div>
                          </div>
                          <DialogFooter className="flex gap-2">
                            <Button
                              variant="outline"
                              onClick={handleCloseImageDialog}
                              disabled={isUploadingImage}
                            >
                              Cancel
                            </Button>
                            <Button
                              onClick={handleImageUpload}
                              disabled={!selectedImage || isUploadingImage}
                            >
                              {isUploadingImage ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Uploading...
                                </>
                              ) : (
                                <>
                                  <Save className="h-4 w-4 mr-2" />
                                  Upload Picture
                                </>
                              )}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                  <Separator />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-sm font-medium">
                      First Name
                    </Label>
                    <Input
                      id="firstName"
                      type="text"
                      disabled={!isEditingName}
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className={isEditingName ? "" : "bg-muted/50"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-sm font-medium">
                      Last Name
                    </Label>
                    <Input
                      id="lastName"
                      type="text"
                      disabled={!isEditingName}
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className={isEditingName ? "" : "bg-muted/50"}
                    />
                  </div>
                </div>
                
                {isEditingName && (
                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={handleSaveName}
                      disabled={isSavingName}
                      size="sm"
                      className="h-8"
                    >
                      {isSavingName ? (
                        <>
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-3 w-3 mr-1" />
                          Save
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancelNameEdit}
                      disabled={isSavingName}
                      size="sm"
                      className="h-8"
                    >
                      <X className="h-3 w-3 mr-1" />
                      Cancel
                    </Button>
                  </div>
                )}                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">
                    Email Address
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        disabled
                        defaultValue={
                          user?.primaryEmailAddress?.emailAddress ?? ""
                        }
                        className="pl-10 bg-muted/50"
                      />
                    </div>
                  </div>
                </div>
                <div className="pt-4 border-t border-border/50">
                  <p className="text-xs text-muted-foreground">
                    Name changes are updated immediately.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Privacy & Security
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Control your account visibility and security settings
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-muted/20">
                  <div className="space-y-1">
                    <p className="font-medium">Private Profile</p>
                    <p className="text-sm text-muted-foreground">
                      Hide your profile from other users
                    </p>
                  </div>
                  <Switch
                    checked={privateProfile}
                    onValueChange={setPrivateProfile}
                    color="primary"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </Tab>

        <Tab
          key="notifications"
          title={
            <div className="flex items-center space-x-2">
              <Bell className="h-4 w-4" />
              <span>Notifications</span>
            </div>
          }
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="py-6 space-y-6"
          >
            <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email Notifications
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Choose what email notifications you'd like to receive
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-muted/20">
                  <div className="space-y-1">
                    <p className="font-medium">Dashboard Updates</p>
                    <p className="text-sm text-muted-foreground">
                      Get notified when dashboards are shared with you
                    </p>
                  </div>
                  <Switch
                    checked={emailNotifications}
                    onValueChange={setEmailNotifications}
                    color="primary"
                  />
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-muted/20">
                  <div className="space-y-1">
                    <p className="font-medium">Marketing Communications</p>
                    <p className="text-sm text-muted-foreground">
                      Receive updates about new features and tips
                    </p>
                  </div>
                  <Switch
                    checked={marketingEmails}
                    onValueChange={setMarketingEmails}
                    color="primary"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Push Notifications
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Manage real-time notifications for your browser
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-muted/20">
                  <div className="space-y-1">
                    <p className="font-medium">Real-time Alerts</p>
                    <p className="text-sm text-muted-foreground">
                      Get instant notifications for important updates
                    </p>
                  </div>
                  <Switch
                    checked={pushNotifications}
                    onValueChange={setPushNotifications}
                    color="primary"
                  />
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-muted/20">
                  <div className="space-y-1">
                    <p className="font-medium">Sound Notifications</p>
                    <p className="text-sm text-muted-foreground">
                      Play sounds for important notifications
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {soundEnabled ? (
                      <Volume2 className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <VolumeX className="h-4 w-4 text-muted-foreground" />
                    )}
                    <Switch
                      checked={soundEnabled}
                      onValueChange={setSoundEnabled}
                      color="primary"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </Tab>

        <Tab
          key="appearance"
          title={
            <div className="flex items-center space-x-2">
              <Palette className="h-4 w-4" />
              <span>Appearance</span>
            </div>
          }
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="py-6 space-y-6"
          >
            <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Theme Preferences
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Customize the look and feel of your interface
                </p>
              </CardHeader>
              <CardContent className="space-y-4">                <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-muted/20">
                  <div className="space-y-1">
                    <p className="font-medium">Theme Selection</p>
                    <p className="text-sm text-muted-foreground">
                      Choose between light, dark, or system theme
                    </p>
                  </div>
                  <ModeToggle />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Dashboard Preferences
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Configure how your dashboards behave
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-muted/20">
                  <div className="space-y-1">
                    <p className="font-medium">Auto-refresh Data</p>
                    <p className="text-sm text-muted-foreground">
                      Automatically refresh dashboard data every 5 minutes
                    </p>
                  </div>
                  <Switch
                    checked={autoRefresh}
                    onValueChange={setAutoRefresh}
                    color="primary"
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </Tab>

        <Tab
          key="preferences"
          title={
            <div className="flex items-center space-x-2">
              <Globe className="h-4 w-4" />
              <span>Preferences</span>
            </div>
          }
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="py-6 space-y-6"
          >
            <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">
                  Regional Settings
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Configure your language, timezone, and date formats
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="language" className="text-sm font-medium">
                      Language
                    </Label>
                    <Input
                      id="language"
                      type="text"
                      disabled
                      defaultValue="English (US)"
                      className="bg-muted/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timezone" className="text-sm font-medium">
                      Timezone
                    </Label>
                    <Input
                      id="timezone"
                      type="text"
                      disabled
                      defaultValue="UTC-05:00 (Eastern)"
                      className="bg-muted/50"
                    />
                  </div>
                </div>
                <div className="pt-4 border-t border-border/50">
                  <p className="text-xs text-muted-foreground">
                    Regional settings are automatically detected from your
                    browser. Contact support for manual adjustments.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">
                  Data Export
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Export your data and account information
                </p>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-muted/20">
                  <div className="space-y-1">
                    <p className="font-medium">Download Account Data</p>
                    <p className="text-sm text-muted-foreground">
                      Get a copy of all your dashboards and configurations
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Save className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </Tab>
      </Tabs>
    </div>
  );
}
