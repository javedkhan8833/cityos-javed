import { useState, useEffect } from "react";
import { SettingsLayout } from "@/components/layout/SettingsLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Globe, Palette, Clock, Laptop, Loader2 } from "lucide-react";
import { useSettingsByCategory, useBulkUpsertSettings } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { data: settings, isLoading } = useSettingsByCategory("general");
  const bulkUpsert = useBulkUpsertSettings();
  const { toast } = useToast();

  const [language, setLanguage] = useState("en");
  const [dateFormat, setDateFormat] = useState("mdy");
  const [timeFormat, setTimeFormat] = useState("12");
  const [theme, setTheme] = useState("system");
  const [timezone, setTimezone] = useState("utc");
  const [primaryColor, setPrimaryColor] = useState("blue");

  useEffect(() => {
    if (settings && settings.length > 0) {
      const findValue = (key: string, fallback: string) => {
        const setting = settings.find((s) => s.key === key);
        return setting?.value ?? fallback;
      };
      setLanguage(findValue("language", "en"));
      setDateFormat(findValue("dateFormat", "mdy"));
      setTimeFormat(findValue("timeFormat", "12"));
      setTheme(findValue("theme", "system"));
      setTimezone(findValue("timezone", "utc"));
      setPrimaryColor(findValue("primaryColor", "blue"));
    }
  }, [settings]);

  const handleSave = () => {
    bulkUpsert.mutate(
      {
        category: "general",
        settings: { language, dateFormat, timeFormat, theme, timezone },
      },
      {
        onSuccess: () => {
          toast({ title: "Settings saved", description: "Your general settings have been updated." });
        },
        onError: (error) => {
          toast({ title: "Error", description: error.message, variant: "destructive" });
        },
      }
    );
  };

  if (isLoading) {
    return (
      <SettingsLayout>
        <div className="flex items-center justify-center min-h-[400px]" data-testid="settings-loading">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </SettingsLayout>
    );
  }

  const colors = [
    { name: "blue", className: "bg-blue-600", ring: "ring-blue-600" },
    { name: "green", className: "bg-green-600", ring: "ring-green-600" },
    { name: "orange", className: "bg-orange-600", ring: "ring-orange-600" },
    { name: "purple", className: "bg-purple-600", ring: "ring-purple-600" },
  ];

  return (
    <SettingsLayout>
      <div className="space-y-6">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">General Settings</h1>
            <p className="text-muted-foreground">Manage application preferences and appearance.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Globe className="h-5 w-5" />
                        Localization
                    </CardTitle>
                    <CardDescription>Set your language and region preferences.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Language</Label>
                        <Select value={language} onValueChange={setLanguage} data-testid="select-language">
                            <SelectTrigger data-testid="select-language-trigger">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="en">English (US)</SelectItem>
                                <SelectItem value="es">Spanish</SelectItem>
                                <SelectItem value="fr">French</SelectItem>
                                <SelectItem value="de">German</SelectItem>
                                <SelectItem value="ar">Arabic</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Date Format</Label>
                        <Select value={dateFormat} onValueChange={setDateFormat} data-testid="select-date-format">
                            <SelectTrigger data-testid="select-date-format-trigger">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="mdy">MM/DD/YYYY</SelectItem>
                                <SelectItem value="dmy">DD/MM/YYYY</SelectItem>
                                <SelectItem value="ymd">YYYY-MM-DD</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Time Format</Label>
                        <Select value={timeFormat} onValueChange={setTimeFormat} data-testid="select-time-format">
                            <SelectTrigger data-testid="select-time-format-trigger">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="12">12-hour (AM/PM)</SelectItem>
                                <SelectItem value="24">24-hour</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Palette className="h-5 w-5" />
                        Appearance
                    </CardTitle>
                    <CardDescription>Customize the look and feel of the dashboard.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Theme</Label>
                        <Select value={theme} onValueChange={setTheme} data-testid="select-theme">
                            <SelectTrigger data-testid="select-theme-trigger">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="light">Light</SelectItem>
                                <SelectItem value="dark">Dark</SelectItem>
                                <SelectItem value="system">System</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Primary Color</Label>
                        <div className="flex items-center gap-2">
                            {colors.map((color) => (
                              <div
                                key={color.name}
                                data-testid={`color-${color.name}`}
                                onClick={() => setPrimaryColor(color.name)}
                                className={`w-8 h-8 rounded border ${color.className} shadow-sm cursor-pointer ${
                                  primaryColor === color.name ? `ring-2 ring-offset-2 ${color.ring}` : ""
                                }`}
                              />
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Timezone
                    </CardTitle>
                    <CardDescription>Set the system timezone for operations.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                     <div className="space-y-2">
                        <Label>System Timezone</Label>
                        <Select value={timezone} onValueChange={setTimezone} data-testid="select-timezone">
                            <SelectTrigger data-testid="select-timezone-trigger">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="utc">UTC (Coordinated Universal Time)</SelectItem>
                                <SelectItem value="est">EST (Eastern Standard Time)</SelectItem>
                                <SelectItem value="pst">PST (Pacific Standard Time)</SelectItem>
                                <SelectItem value="ast">AST (Arabia Standard Time)</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">This affects all timestamps in reports and logs.</p>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Laptop className="h-5 w-5" />
                        System Info
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Version</span>
                        <span className="font-mono">v2.4.0-beta</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Build</span>
                        <span className="font-mono">2024.02.15.1042</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Environment</span>
                        <Badge variant="outline">Production</Badge>
                    </div>
                </CardContent>
            </Card>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={bulkUpsert.isPending} data-testid="button-save-settings">
            {bulkUpsert.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Settings
          </Button>
        </div>
      </div>
    </SettingsLayout>
  );
}
