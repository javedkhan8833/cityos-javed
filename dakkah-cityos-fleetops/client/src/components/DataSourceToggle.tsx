import { Cloud, CloudOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useActiveFleetbaseServer, useFleetbaseStatus } from "@/lib/api";

export function DataSourceToggle() {
  const { data: activeServer } = useActiveFleetbaseServer();
  const { data: fbStatus } = useFleetbaseStatus();

  const isConnected = fbStatus?.configured && fbStatus?.connected;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border bg-card text-sm cursor-default" data-testid="server-status-indicator">
          {isConnected ? (
            <Cloud className="h-3.5 w-3.5 text-green-500" />
          ) : (
            <CloudOff className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <span className="text-xs font-medium truncate max-w-[160px]">
            {activeServer?.organization || activeServer?.name || "No Server"}
          </span>
          {isConnected ? (
            <Badge variant="secondary" className="px-1 py-0 text-[10px] bg-green-500/20 text-green-700">
              Connected
            </Badge>
          ) : (
            <Badge variant="secondary" className="px-1 py-0 text-[10px]">
              Offline
            </Badge>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {activeServer ? (
          <div>
            <p className="font-medium">{activeServer.name}</p>
            {activeServer.organization && (
              <p className="text-xs text-muted-foreground">Org: {activeServer.organization}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1">{activeServer.url}</p>
            <p className="text-xs mt-1">
              {isConnected ? "Connected to Fleetbase server" : fbStatus?.error || "Unable to connect"}
            </p>
          </div>
        ) : (
          <p className="text-sm">No server configured. Go to Settings &gt; Servers to add one.</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
