import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { generateNotifications, Notification } from "@/lib/mock-data";
import { formatDistanceToNow } from "date-fns";

export function NotificationsMenu() {
  const [notifications, setNotifications] = useState<Notification[]>(() => generateNotifications(8));
  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-background" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
            <h4 className="font-semibold text-sm">Notifications</h4>
            {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="h-auto px-2 text-xs" onClick={markAllRead}>
                    Mark all read
                </Button>
            )}
        </div>
        <ScrollArea className="h-[300px]">
            {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4 text-center">
                    <Bell className="h-8 w-8 mb-2 opacity-20" />
                    <p className="text-sm">No notifications yet</p>
                </div>
            ) : (
                <div className="divide-y">
                    {notifications.map((notification) => (
                        <div key={notification.id} className={`p-4 hover:bg-muted/50 transition-colors ${!notification.read ? 'bg-muted/20' : ''}`}>
                            <div className="flex justify-between items-start gap-2">
                                <h5 className="text-sm font-medium leading-none">{notification.title}</h5>
                                <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                    {formatDistanceToNow(notification.timestamp)}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {notification.message}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
