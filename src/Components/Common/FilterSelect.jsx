import { useId } from "react";
import * as Select from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/Utils/Lib/utils";
// Native select popups cannot be consistently themed. Radix supplies a
// portaled, keyboard-accessible listbox with focus and collision management.
// Radix items can't carry "", so `clearable` adds a placeholder item under a
// sentinel value that is reported back as "". An option's optional `image`
// (e.g. a country flag) shows before its label, and its optional `description`
// (a balance, a code) on a second line in the list, not in the closed box.
// Long lists scroll inside the popup, which never grows past the screen.
const CLEAR_VALUE = "__clear__";
export default function FilterSelect({
  label,
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
  className,
  clearable = false,
}) {
  const id = useId();
  return (
    <div>
      {label && (
        <label htmlFor={id} className="mb-2 block text-sm font-medium">
          {label}
        </label>
      )}
      <Select.Root value={value} onValueChange={(v) => {
          // Radix can report "" on its own (e.g. while unmounting); only a
          // real pick, or the clear item, is a change.
          if (v === "") return;
          onChange(v === CLEAR_VALUE ? "" : v);
        }} disabled={disabled}>
        <Select.Trigger
          id={id}
          className={cn("field-control flex items-center justify-between gap-3 text-left data-[placeholder]:font-normal data-[placeholder]:text-slate-400", className)}
        >
          <span className="min-w-0 flex-1 truncate">
            <Select.Value placeholder={placeholder} />
          </span>
          <Select.Icon className="shrink-0 text-slate-500">
            <ChevronDown size={16} />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content
            position="popper"
            sideOffset={6}
            className="z-50 max-h-[min(20rem,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-slate-200 bg-surface p-1 shadow-xl"
          >
            <Select.ScrollUpButton className="flex h-6 items-center justify-center text-slate-500">
              <ChevronUp size={14} />
            </Select.ScrollUpButton>
            <Select.Viewport>
              {(clearable ? [{ value: CLEAR_VALUE, label: placeholder }, ...options] : options).map((option) => (
                <Select.Item
                  key={option.value}
                  value={option.value}
                  disabled={option.disabled}
                  className="relative cursor-pointer rounded-lg py-2 pl-8 pr-4 text-sm outline-none data-[highlighted]:bg-ink/10 data-[disabled]:opacity-40"
                >
                  <Select.ItemIndicator className="absolute left-2">
                    <Check size={14} />
                  </Select.ItemIndicator>
                  <Select.ItemText>
                    {option.image && (
                      <img src={option.image} alt="" className="mr-2 inline-block h-3.5 w-5 rounded-sm object-cover align-[-2px]" />
                    )}
                    {option.label}
                  </Select.ItemText>
                  {option.description && <span className="mt-0.5 block truncate text-xs text-slate-500">{option.description}</span>}
                </Select.Item>
              ))}
            </Select.Viewport>
            <Select.ScrollDownButton className="flex h-6 items-center justify-center text-slate-500">
              <ChevronDown size={14} />
            </Select.ScrollDownButton>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
    </div>
  );
}
