import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, Globe, MapPin, Radio, ChevronDown, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLocation } from "wouter";

interface CityOSContext {
  country?: string;
  city?: string;
  tenant?: string;
  channel?: string;
}

export function CityOSContextSelector() {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();

  const { data: context } = useQuery<CityOSContext>({
    queryKey: ["/api/fleetbase/cityos-context"],
    queryFn: async () => {
      const res = await fetch("/api/fleetbase/cityos-context");
      if (!res.ok) return { country: "", city: "", tenant: "", channel: "" };
      return res.json();
    },
    refetchInterval: 30000,
  });

  const ctx = context || { country: "", city: "", tenant: "", channel: "" };
  const hasContext = !!(ctx.country || ctx.city || ctx.tenant || ctx.channel);
  const contextLabel = [ctx.country, ctx.city, ctx.tenant, ctx.channel]
    .filter(Boolean).join(" / ") || "No context";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 h-8 text-xs font-medium max-w-[220px]"
              data-testid="button-cityos-context"
            >
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">
                {hasContext ? contextLabel : "CityOS Context"}
              </span>
              {hasContext && (
                <Badge variant="secondary" className="px-1 py-0 text-[10px] bg-blue-500/20 text-blue-700">
                  Active
                </Badge>
              )}
              <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p className="text-xs">CityOS tenant context from active server</p>
          {hasContext && <p className="text-xs text-muted-foreground mt-1">{contextLabel}</p>}
        </TooltipContent>
      </Tooltip>

      <PopoverContent className="w-80 p-0" align="end" data-testid="popover-cityos-context">
        <div className="border-b px-4 py-3">
          <h4 className="font-semibold text-sm">CityOS Context</h4>
          <p className="text-xs text-muted-foreground mt-0.5">
            Context is configured per server in Settings &gt; Servers
          </p>
        </div>

        <div className="p-4 space-y-3">
          <ContextRow icon={<Globe className="h-3.5 w-3.5" />} label="Country" value={ctx.country} />
          <ContextRow icon={<MapPin className="h-3.5 w-3.5" />} label="City" value={ctx.city} />
          <ContextRow icon={<Building2 className="h-3.5 w-3.5" />} label="Tenant" value={ctx.tenant} />
          <ContextRow icon={<Radio className="h-3.5 w-3.5" />} label="Channel" value={ctx.channel} />

          {!hasContext && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs">
              No CityOS context configured for the active server. Go to Settings &gt; Servers to add context to your server configuration.
            </div>
          )}
        </div>

        <div className="border-t px-4 py-3">
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs h-7"
            onClick={() => {
              navigate("/settings/servers");
              setOpen(false);
            }}
            data-testid="button-cityos-go-to-servers"
          >
            <Settings className="h-3 w-3 mr-1.5" />
            Configure in Server Settings
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function ContextRow({ icon, label, value }: { icon: React.ReactNode; label: string; value?: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <div className="text-muted-foreground shrink-0">{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={`text-sm font-medium truncate ${value ? "" : "text-muted-foreground/50 italic"}`}>
          {value || "Not set"}
        </p>
      </div>
    </div>
  );
}
