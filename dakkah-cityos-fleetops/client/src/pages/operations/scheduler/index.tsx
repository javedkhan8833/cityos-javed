import { useState, useMemo } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Filter,
  Plus,
  Clock,
  Trash2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { addDays, format } from "date-fns";
import { schedulerTasksApi, driversApi, vehiclesApi } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import type { SchedulerTask } from "@shared/schema";

export default function SchedulerPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formResource, setFormResource] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formTaskType, setFormTaskType] = useState("order");
  const [formColor, setFormColor] = useState("blue");
  const [formStartHour, setFormStartHour] = useState(9);
  const [formDuration, setFormDuration] = useState(2);
  const [formDate, setFormDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const hours = Array.from({ length: 12 }, (_, i) => i + 8);

  const { toast } = useToast();
  const { data: tasks = [], isLoading: tasksLoading, error: tasksError } = schedulerTasksApi.useList();
  const { data: driversList = [], isLoading: driversLoading } = driversApi.useList();
  const { data: vehiclesList = [], isLoading: vehiclesLoading } = vehiclesApi.useList();
  const createTask = schedulerTasksApi.useCreate();
  const deleteTask = schedulerTasksApi.useDelete();

  const resources = useMemo(() => {
    const driverResources = driversList.map((d) => ({
      id: d.id,
      name: d.name,
      type: "driver" as const,
      avatar: d.photo_url || "",
    }));
    const vehicleResources = vehiclesList.map((v) => ({
      id: v.id,
      name: `${v.plate_number} ${v.model}`,
      type: "vehicle" as const,
      avatar: "",
    }));
    return [...driverResources, ...vehicleResources];
  }, [driversList, vehiclesList]);

  const [typeFilter, setTypeFilter] = useState<string>("all");

  const currentDateStr = format(currentDate, "yyyy-MM-dd");
  const filteredTasks = useMemo(
    () => tasks.filter((t) => {
      const matchesDate = t.date === currentDateStr;
      const matchesType = typeFilter === "all" || t.task_type === typeFilter;
      return matchesDate && matchesType;
    }),
    [tasks, currentDateStr, typeFilter]
  );

  const isLoading = tasksLoading || driversLoading || vehiclesLoading;

  function resetForm() {
    setFormResource("");
    setFormTitle("");
    setFormTaskType("order");
    setFormColor("blue");
    setFormStartHour(9);
    setFormDuration(2);
    setFormDate(format(currentDate, "yyyy-MM-dd"));
  }

  function handleOpenDialog() {
    resetForm();
    setFormDate(format(currentDate, "yyyy-MM-dd"));
    setDialogOpen(true);
  }

  function handleCreateTask() {
    const selectedResource = resources.find((r) => r.id === formResource);
    if (!selectedResource || !formTitle.trim()) return;

    createTask.mutate(
      {
        resource_id: selectedResource.id,
        resource_name: selectedResource.name,
        resource_type: selectedResource.type,
        title: formTitle.trim(),
        task_type: formTaskType,
        color: formColor,
        start_hour: formStartHour,
        duration: formDuration,
        date: formDate,
      } as Partial<SchedulerTask>,
      {
        onSuccess: () => {
          toast({ title: "Task created", description: `"${formTitle}" has been added to the schedule.` });
          setDialogOpen(false);
          resetForm();
        },
        onError: (err: Error) => {
          toast({ title: "Error", description: err.message, variant: "destructive" });
        },
      }
    );
  }

  function handleDeleteTask(task: SchedulerTask) {
    deleteTask.mutate(task.id, {
      onSuccess: () => {
        toast({ title: "Task deleted", description: `"${task.title}" has been removed.` });
      },
      onError: (err: Error) => {
        toast({ title: "Error", description: err.message, variant: "destructive" });
      },
    });
  }

  return (
    <MainLayout>
      <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
        <div className="flex items-center justify-between p-6 pb-2 shrink-0">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Scheduler</h1>
            <p className="text-muted-foreground">Manage shifts, orders, and maintenance schedules.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center border rounded-md bg-card">
              <Button data-testid="button-prev-day" variant="ghost" size="icon" onClick={() => setCurrentDate(addDays(currentDate, -1))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div data-testid="text-current-date" className="px-4 font-medium flex items-center gap-2 min-w-[140px] justify-center">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                {format(currentDate, "MMM d, yyyy")}
              </div>
              <Button data-testid="button-next-day" variant="ghost" size="icon" onClick={() => setCurrentDate(addDays(currentDate, 1))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button data-testid="button-filter" variant="outline">
                  <Filter className="mr-2 h-4 w-4" /> Filter
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTypeFilter("all")}>All Types</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTypeFilter("order")}>Orders</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTypeFilter("route")}>Routes</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTypeFilter("break")}>Breaks</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTypeFilter("maintenance")}>Maintenance</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button data-testid="button-add-task" onClick={handleOpenDialog}>
              <Plus className="mr-2 h-4 w-4" /> Add Task
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden p-6 pt-4 flex flex-col">
          {tasksError ? (
            <div data-testid="status-error" className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-2">
                <AlertCircle className="h-8 w-8 text-destructive mx-auto" />
                <p className="text-destructive font-medium">Failed to load scheduler data</p>
                <p className="text-sm text-muted-foreground">{(tasksError as Error).message}</p>
              </div>
            </div>
          ) : isLoading ? (
            <div data-testid="status-loading" className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="border rounded-md bg-card shadow-sm flex-1 flex flex-col overflow-hidden">
              <div className="flex border-b shrink-0">
                <div className="w-[200px] border-r p-3 bg-muted/30 font-medium text-sm flex items-center text-muted-foreground">
                  Resource
                </div>
                <div className="flex-1 flex">
                  {hours.map((hour) => (
                    <div key={hour} className="flex-1 border-r last:border-0 p-3 text-center text-sm text-muted-foreground bg-muted/10">
                      {format(new Date().setHours(hour, 0, 0, 0), "h a")}
                    </div>
                  ))}
                </div>
              </div>

              <ScrollArea className="flex-1">
                <div className="min-w-[1000px]">
                  {resources.map((resource) => (
                    <div key={resource.id} data-testid={`row-resource-${resource.id}`} className="flex border-b last:border-0 h-20 group hover:bg-muted/5 transition-colors">
                      <div className="w-[200px] border-r p-3 flex items-center gap-3 shrink-0 bg-card z-10 sticky left-0 group-hover:bg-muted/5">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={resource.avatar} />
                          <AvatarFallback>{resource.name.substring(0, 2)}</AvatarFallback>
                        </Avatar>
                        <div className="overflow-hidden">
                          <p className="font-medium text-sm truncate">{resource.name}</p>
                          <Badge variant="outline" className="text-[10px] h-4 px-1 capitalize">
                            {resource.type}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex-1 flex relative">
                        {hours.map((hour) => (
                          <div key={hour} className="flex-1 border-r last:border-0 h-full border-dashed border-muted/50" />
                        ))}

                        {filteredTasks
                          .filter((t) => t.resource_id === resource.id)
                          .map((task) => {
                            const startOffset = task.start_hour - 8;
                            const widthPercent = (task.duration / 12) * 100;
                            const leftPercent = (startOffset / 12) * 100;

                            return (
                              <DropdownMenu key={task.id}>
                                <DropdownMenuTrigger asChild>
                                  <div
                                    data-testid={`task-bar-${task.id}`}
                                    className={`absolute top-2 bottom-2 rounded-md p-2 text-xs font-medium border flex flex-col justify-center cursor-pointer hover:brightness-95 transition-all
                                      ${task.color === "blue" ? "bg-blue-100 border-blue-200 text-blue-700" :
                                        task.color === "green" ? "bg-green-100 border-green-200 text-green-700" :
                                        task.color === "red" ? "bg-red-100 border-red-200 text-red-700" :
                                        "bg-gray-100 border-gray-200 text-gray-700"}
                                    `}
                                    style={{
                                      left: `${leftPercent}%`,
                                      width: `${widthPercent}%`,
                                      marginLeft: "2px",
                                      marginRight: "2px",
                                    }}
                                  >
                                    <div className="font-bold truncate">{task.title}</div>
                                    <div className="flex items-center gap-1 opacity-80">
                                      <Clock className="h-3 w-3" />
                                      {task.start_hour}:00 - {task.start_hour + task.duration}:00
                                    </div>
                                  </div>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent>
                                  <DropdownMenuItem
                                    data-testid={`button-delete-task-${task.id}`}
                                    className="text-destructive"
                                    onClick={() => handleDeleteTask(task)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            );
                          })}
                      </div>
                    </div>
                  ))}
                </div>
                <ScrollBar orientation="horizontal" />
              </ScrollArea>
            </div>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent data-testid="dialog-add-task">
          <DialogHeader>
            <DialogTitle>Add Task</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="resource">Resource</Label>
              <Select value={formResource} onValueChange={setFormResource}>
                <SelectTrigger data-testid="select-resource">
                  <SelectValue placeholder="Select resource" />
                </SelectTrigger>
                <SelectContent>
                  {resources.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name} ({r.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input
                data-testid="input-title"
                id="title"
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Task title"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Task Type</Label>
                <Select value={formTaskType} onValueChange={setFormTaskType}>
                  <SelectTrigger data-testid="select-task-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="order">Order</SelectItem>
                    <SelectItem value="route">Route</SelectItem>
                    <SelectItem value="break">Break</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Color</Label>
                <Select value={formColor} onValueChange={setFormColor}>
                  <SelectTrigger data-testid="select-color">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blue">Blue</SelectItem>
                    <SelectItem value="green">Green</SelectItem>
                    <SelectItem value="red">Red</SelectItem>
                    <SelectItem value="gray">Gray</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startHour">Start Hour</Label>
                <Input
                  data-testid="input-start-hour"
                  id="startHour"
                  type="number"
                  min={8}
                  max={20}
                  value={formStartHour}
                  onChange={(e) => setFormStartHour(Number(e.target.value))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="duration">Duration (hours)</Label>
                <Input
                  data-testid="input-duration"
                  id="duration"
                  type="number"
                  min={1}
                  max={8}
                  value={formDuration}
                  onChange={(e) => setFormDuration(Number(e.target.value))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                data-testid="input-date"
                id="date"
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button data-testid="button-cancel-task" variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              data-testid="button-submit-task"
              onClick={handleCreateTask}
              disabled={!formResource || !formTitle.trim() || createTask.isPending}
            >
              {createTask.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
