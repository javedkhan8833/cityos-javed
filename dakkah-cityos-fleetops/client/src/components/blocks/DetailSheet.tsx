import { ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LucideIcon } from "lucide-react";

interface DetailSheetTab {
  value: string;
  label: string;
  content: ReactNode;
}

interface DetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string | ReactNode;
  description?: string;
  icon?: LucideIcon;
  tabs?: DetailSheetTab[];
  children?: ReactNode;
  size?: "default" | "lg" | "xl";
}

export function DetailSheet({
  open,
  onOpenChange,
  title,
  description,
  icon: Icon,
  tabs,
  children,
  size = "default",
}: DetailSheetProps) {
  const sizeClass = size === "xl" ? "sm:max-w-2xl" : size === "lg" ? "sm:max-w-xl" : "sm:max-w-lg";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className={`${sizeClass} overflow-y-auto`} data-testid="detail-sheet">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {Icon && <Icon className="h-5 w-5 text-primary" />}
            {title}
          </SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>

        <div className="mt-6">
          {tabs ? (
            <Tabs defaultValue={tabs[0]?.value}>
              <TabsList className={`w-full grid grid-cols-${tabs.length}`}>
                {tabs.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value} data-testid={`tab-${tab.value}`}>
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              {tabs.map((tab) => (
                <TabsContent key={tab.value} value={tab.value} className="mt-4">
                  {tab.content}
                </TabsContent>
              ))}
            </Tabs>
          ) : (
            children
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
