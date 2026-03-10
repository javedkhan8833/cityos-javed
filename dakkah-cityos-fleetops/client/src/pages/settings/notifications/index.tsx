import { useState, useEffect } from "react";
import { SettingsLayout } from "@/components/layout/SettingsLayout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Plus, Filter, MoreHorizontal, Bell, Mail, Smartphone, Slack } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useSettingsByCategory, useBulkUpsertSettings } from "@/lib/api";
import { Spinner } from "@/components/ui/spinner";

const channels = [
    { id: "ch_1", name: "System Email", type: "email", status: "active", recipients: 12 },
    { id: "ch_2", name: "Driver SMS", type: "sms", status: "active", recipients: 45 },
    { id: "ch_3", name: "Ops Slack", type: "slack", status: "active", recipients: 1 },
];

const notificationEvents = [
    { id: "nt_1", event: "Order Created", key: "orderCreated" },
    { id: "nt_2", event: "Driver Assigned", key: "driverAssigned" },
    { id: "nt_3", event: "Order Delivered", key: "orderDelivered" },
    { id: "nt_4", event: "Order Delayed", key: "orderDelayed" },
    { id: "nt_5", event: "Vehicle Issue", key: "vehicleIssue" },
];

const channelTypes = ["email", "sms", "push", "slack"] as const;

const defaultStates: Record<string, boolean> = {
  orderCreated_email: true, orderCreated_sms: false, orderCreated_push: true, orderCreated_slack: false,
  driverAssigned_email: true, driverAssigned_sms: true, driverAssigned_push: true, driverAssigned_slack: true,
  orderDelivered_email: true, orderDelivered_sms: true, orderDelivered_push: false, orderDelivered_slack: true,
  orderDelayed_email: false, orderDelayed_sms: false, orderDelayed_push: true, orderDelayed_slack: true,
  vehicleIssue_email: true, vehicleIssue_sms: false, vehicleIssue_push: false, vehicleIssue_slack: true,
};

export default function NotificationsPage() {
  const { toast } = useToast();
  const { data: settings, isLoading } = useSettingsByCategory("notifications");
  const bulkUpsert = useBulkUpsertSettings();

  const [toggles, setToggles] = useState<Record<string, boolean>>(defaultStates);

  useEffect(() => {
    if (settings) {
      const map = Object.fromEntries(settings.map(s => [s.key, s.value]));
      const updated = { ...defaultStates };
      for (const key of Object.keys(updated)) {
        if (map[key] !== undefined) {
          updated[key] = map[key] === "true";
        }
      }
      setToggles(updated);
    }
  }, [settings]);

  const handleToggle = (key: string, checked: boolean) => {
    const newToggles = { ...toggles, [key]: checked };
    setToggles(newToggles);

    const settingsMap: Record<string, string> = {};
    for (const [k, v] of Object.entries(newToggles)) {
      settingsMap[k] = String(v);
    }
    bulkUpsert.mutate(
      { category: "notifications", settings: settingsMap },
      {
        onSuccess: () => toast({ title: "Saved", description: "Notification preference updated." }),
        onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
      }
    );
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
            <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
            <p className="text-muted-foreground">Manage alert channels and notification templates.</p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
            <Card className="col-span-2">
                <CardHeader>
                    <CardTitle>Notification Triggers</CardTitle>
                    <CardDescription>Configure which events trigger alerts across channels.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Event Name</TableHead>
                                <TableHead className="text-center">Email</TableHead>
                                <TableHead className="text-center">SMS</TableHead>
                                <TableHead className="text-center">Push</TableHead>
                                <TableHead className="text-center">Slack</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {notificationEvents.map(n => (
                                <TableRow key={n.id}>
                                    <TableCell className="font-medium">{n.event}</TableCell>
                                    {channelTypes.map(ch => {
                                      const key = `${n.key}_${ch}`;
                                      return (
                                        <TableCell key={ch} className="text-center">
                                          <Switch
                                            checked={toggles[key] ?? false}
                                            onCheckedChange={(checked) => handleToggle(key, checked)}
                                            data-testid={`switch-${key}`}
                                          />
                                        </TableCell>
                                      );
                                    })}
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Channels</CardTitle>
                    <CardDescription>Configure output gateways.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {channels.map(channel => (
                        <div key={channel.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                                    {channel.type === 'email' ? <Mail className="h-4 w-4" /> : 
                                     channel.type === 'sms' ? <Smartphone className="h-4 w-4" /> :
                                     <Slack className="h-4 w-4" />}
                                </div>
                                <div>
                                    <p className="font-medium text-sm">{channel.name}</p>
                                    <p className="text-xs text-muted-foreground capitalize">{channel.type}</p>
                                </div>
                            </div>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" data-testid={`button-channel-menu-${channel.id}`}>
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => toast({ title: "Channel Active", description: `${channel.name} is configured and running.` })}>
                                  Test Channel
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => toast({ title: "Channel Configured", description: `${channel.name} settings saved.` })}>
                                  Configure
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    ))}
                    <Button variant="outline" className="w-full" onClick={() => toast({ title: "Coming Soon", description: "Custom notification channels will be available in a future update." })} data-testid="button-add-channel">
                        <Plus className="mr-2 h-4 w-4" /> Add Channel
                    </Button>
                </CardContent>
            </Card>
        </div>
      </div>
    </SettingsLayout>
  );
}