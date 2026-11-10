"use client";
import { cnx as cn } from "@/shared/utils/cn";
import { Button as AriaButton, DatePicker as AriaDatePicker, Group as AriaGroup, Popover as AriaPopover } from "react-aria-components";
export function DatePicker({ children, disabled = false, readOnly = false, required = false, invalid = false, className, ...props }) {
    return (<AriaDatePicker isDisabled={disabled} isReadOnly={readOnly} isRequired={required} isInvalid={invalid} className={cn("flex flex-col gap-1 w-full", className)} {...props}>
      {children}
    </AriaDatePicker>);
}
export function DatePickerGroup({ className, children, ...props }) {
    return (<AriaGroup className={cn("relative", className)} {...props}>
      {children}
    </AriaGroup>);
}
export function DatePickerTrigger({ className, children, ...props }) {
    return (<AriaButton slot="trigger" className={cn("absolute top-1/2 right-5 -translate-y-1/2 [:where(&>svg)]:size-5 outline-offset-5 rounded-full", className)} {...props}>
      {children}
    </AriaButton>);
}
export function DatePickerPopover({ className, children, ...props }) {
    return (<AriaPopover placement="bottom start" className={cn("duration-100 outline-none data-entering:animate-in data-entering:fade-in-0 data-entering:zoom-in-95 data-exiting:animate-out data-exiting:overflow-hidden data-exiting:fade-out-0 data-exiting:zoom-out-95 data-[placement^=bottom]:slide-in-from-top-2 data-[placement^=top]:slide-in-from-bottom-2 data-[placement^=left]:slide-in-from-right-2 data-[placement^=right]:slide-in-from-left-2", className)} {...props}>
      {children}
    </AriaPopover>);
}
