import {
  Calculator,
  Calendar,
  CreditCard,
  Settings,
  Smile,
  User,
  Search,
  Command,
} from "lucide-react"

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [, setLocation] = useLocation();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const runCommand = (command: () => void) => {
    setOpen(false)
    command()
  }

  return (
    <>
      <div 
        className="relative w-64 hidden md:flex items-center text-sm text-muted-foreground bg-secondary/50 border border-transparent hover:bg-secondary/80 hover:text-foreground transition-colors rounded-md px-3 h-9 cursor-pointer"
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span>Search...</span>
        <kbd className="pointer-events-none absolute right-2 top-[7px] hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </div>
      
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Suggestions">
            <CommandItem onSelect={() => runCommand(() => setLocation("/operations/orders/new"))}>
              <Calendar className="mr-2 h-4 w-4" />
              <span>Create Order</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => setLocation("/management/drivers"))}>
              <User className="mr-2 h-4 w-4" />
              <span>Manage Drivers</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => setLocation("/operations/tracking"))}>
              <Calculator className="mr-2 h-4 w-4" />
              <span>Live Map</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Settings">
            <CommandItem onSelect={() => runCommand(() => setLocation("/settings/team"))}>
              <User className="mr-2 h-4 w-4" />
              <span>Team & Roles</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => setLocation("/finance/transactions"))}>
              <CreditCard className="mr-2 h-4 w-4" />
              <span>Billing</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => setLocation("/settings"))}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  )
}
