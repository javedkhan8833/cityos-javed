import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export type FieldType = "text" | "email" | "tel" | "number" | "password" | "textarea" | "select" | "switch";

export interface FieldConfig {
  name: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  options?: { value: string; label: string }[];
  defaultValue?: string | number | boolean;
  description?: string;
  className?: string;
}

interface EntityFormProps {
  fields: FieldConfig[];
  values: Record<string, any>;
  onChange: (name: string, value: any) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  submitLabel?: string;
  isSubmitting?: boolean;
  layout?: "single" | "grid";
  children?: ReactNode;
}

export function EntityForm({
  fields,
  values,
  onChange,
  onSubmit,
  onCancel,
  submitLabel = "Save",
  isSubmitting = false,
  layout = "single",
  children,
}: EntityFormProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" data-testid="entity-form">
      <div className={layout === "grid" ? "grid grid-cols-2 gap-4" : "space-y-4"}>
        {fields.map((field) => (
          <div key={field.name} className={`space-y-2 ${field.className || ""}`}>
            {field.type === "switch" ? (
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor={field.name}>{field.label}</Label>
                  {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
                </div>
                <Switch
                  id={field.name}
                  checked={!!values[field.name]}
                  onCheckedChange={(checked) => onChange(field.name, checked)}
                  data-testid={`switch-${field.name}`}
                />
              </div>
            ) : (
              <>
                <Label htmlFor={field.name}>
                  {field.label}
                  {field.required && <span className="text-destructive ml-1">*</span>}
                </Label>
                {field.type === "select" ? (
                  <Select
                    value={values[field.name] || ""}
                    onValueChange={(val) => onChange(field.name, val)}
                  >
                    <SelectTrigger data-testid={`select-${field.name}`}>
                      <SelectValue placeholder={field.placeholder || `Select ${field.label.toLowerCase()}...`} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : field.type === "textarea" ? (
                  <Textarea
                    id={field.name}
                    placeholder={field.placeholder}
                    value={values[field.name] || ""}
                    onChange={(e) => onChange(field.name, e.target.value)}
                    data-testid={`textarea-${field.name}`}
                  />
                ) : (
                  <Input
                    id={field.name}
                    type={field.type}
                    placeholder={field.placeholder}
                    value={values[field.name] || ""}
                    onChange={(e) => onChange(field.name, field.type === "number" ? Number(e.target.value) : e.target.value)}
                    required={field.required}
                    data-testid={`input-${field.name}`}
                  />
                )}
                {field.description && field.type !== "switch" && (
                  <p className="text-xs text-muted-foreground">{field.description}</p>
                )}
              </>
            )}
          </div>
        ))}
      </div>

      {children}

      <div className="flex justify-end gap-2 pt-4 border-t">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} data-testid="button-cancel">
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={isSubmitting} data-testid="button-submit">
          {isSubmitting ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
