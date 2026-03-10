import { useState, useEffect } from "react";
import { SettingsLayout } from "@/components/layout/SettingsLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useSettingsByCategory, useBulkUpsertSettings } from "@/lib/api";
import { Spinner } from "@/components/ui/spinner";

export default function ProfilePage() {
  const { toast } = useToast();
  const { data: settings, isLoading } = useSettingsByCategory("profile");
  const bulkUpsert = useBulkUpsertSettings();

  const [firstName, setFirstName] = useState("John");
  const [lastName, setLastName] = useState("Doe");
  const [email, setEmail] = useState("john.doe@fleetops.com");
  const [phone, setPhone] = useState("+1 (555) 123-4567");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    if (settings) {
      const map = Object.fromEntries(settings.map(s => [s.key, s.value]));
      if (map.firstName) setFirstName(map.firstName);
      if (map.lastName) setLastName(map.lastName);
      if (map.email) setEmail(map.email);
      if (map.phone) setPhone(map.phone);
    }
  }, [settings]);

  const handleSaveProfile = () => {
    bulkUpsert.mutate(
      { category: "profile", settings: { firstName, lastName, email, phone } },
      {
        onSuccess: () => toast({ title: "Saved", description: "Profile updated successfully." }),
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
  };

  const [passwordLoading, setPasswordLoading] = useState(false);

  const handleUpdatePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "New passwords do not match.", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Error", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    setPasswordLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      if (!res.ok) {
        const err = await res.json();
        toast({ title: "Error", description: err.error || "Failed to update password", variant: "destructive" });
        return;
      }
      toast({ title: "Saved", description: "Password updated successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      toast({ title: "Error", description: "Failed to update password", variant: "destructive" });
    } finally {
      setPasswordLoading(false);
    }
  };

  if (isLoading) {
    return (
      <SettingsLayout>
        <div className="flex items-center justify-center h-64">
          <Spinner className="h-8 w-8" />
        </div>
      </SettingsLayout>
    );
  }

  return (
    <SettingsLayout>
      <div className="space-y-6">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">My Profile</h1>
            <p className="text-muted-foreground">Manage your account settings and preferences.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Personal Information</CardTitle>
                    <CardDescription>Update your photo and personal details.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-center gap-6">
                        <Avatar className="h-20 w-20">
                            <AvatarImage src="https://github.com/shadcn.png" />
                            <AvatarFallback>JD</AvatarFallback>
                        </Avatar>
                        <div className="space-y-2">
                            <Button variant="outline" size="sm" data-testid="button-change-photo" onClick={() => toast({ title: "Photo Upload", description: "Photo upload functionality will be available soon." })}>Change Photo</Button>
                            <p className="text-xs text-muted-foreground">JPG or PNG. Max 1MB.</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>First Name</Label>
                            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} data-testid="input-first-name" />
                        </div>
                        <div className="space-y-2">
                            <Label>Last Name</Label>
                            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} data-testid="input-last-name" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label>Email</Label>
                        <Input value={email} onChange={(e) => setEmail(e.target.value)} data-testid="input-email" />
                    </div>
                    <div className="space-y-2">
                        <Label>Phone</Label>
                        <Input value={phone} onChange={(e) => setPhone(e.target.value)} data-testid="input-phone" />
                    </div>
                </CardContent>
                <CardFooter className="border-t bg-muted/20 px-6 py-4">
                    <Button onClick={handleSaveProfile} disabled={bulkUpsert.isPending} data-testid="button-save-profile">
                      {bulkUpsert.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
                      Save Changes
                    </Button>
                </CardFooter>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Security</CardTitle>
                    <CardDescription>Manage your password and security preferences.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Current Password</Label>
                        <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} data-testid="input-current-password" />
                    </div>
                    <div className="space-y-2">
                        <Label>New Password</Label>
                        <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} data-testid="input-new-password" />
                    </div>
                    <div className="space-y-2">
                        <Label>Confirm Password</Label>
                        <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} data-testid="input-confirm-password" />
                    </div>
                    <Separator className="my-4" />
                    <div className="space-y-2">
                        <h4 className="font-medium text-sm">Two-Factor Authentication</h4>
                        <p className="text-sm text-muted-foreground mb-4">Add an extra layer of security to your account.</p>
                        <Button variant="outline" data-testid="button-enable-2fa" onClick={() => toast({ title: "Two-Factor Authentication", description: "2FA setup will be available soon." })}>Enable 2FA</Button>
                    </div>
                </CardContent>
                <CardFooter className="border-t bg-muted/20 px-6 py-4">
                    <Button onClick={handleUpdatePassword} disabled={passwordLoading} data-testid="button-update-password">
                      {passwordLoading ? <Spinner className="mr-2 h-4 w-4" /> : null}
                      Update Password
                    </Button>
                </CardFooter>
            </Card>
        </div>
      </div>
    </SettingsLayout>
  );
}