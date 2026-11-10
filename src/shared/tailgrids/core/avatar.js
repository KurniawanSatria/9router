"use client";
import { cnx as cn } from "@/shared/utils/cn";
import { Avatar as AvatarPrimitive } from "@base-ui/react/avatar";
import * as React from "react";
const sizeClasses = {
    xs: "size-6",
    sm: "size-8",
    md: "size-10",
    lg: "size-12",
    xl: "size-14",
    xxl: "size-16",
};
const fontWeightClasses = {
    xs: "font-medium",
    sm: "font-medium",
    md: "font-semibold",
    lg: "font-semibold",
    xl: "font-semibold",
    xxl: "font-semibold",
};
const badgeSizeClasses = {
    xs: "size-1.5",
    sm: "size-2",
    md: "size-2.5",
    lg: "size-3",
    xl: "size-3.5",
    xxl: "size-4",
};
const statusClasses = {
    online: "bg-green-500",
    offline: "bg-red-500",
    busy: "bg-yellow-500",
};
export function Avatar({ className, size = "md", children, ...props }) {
    return (<AvatarPrimitive.Root data-slot="avatar" data-size={size} className={cn("group/avatar relative flex shrink-0 rounded-full select-none", sizeClasses[size], fontWeightClasses[size], className)} {...props}>
      {children}
    </AvatarPrimitive.Root>);
}
export function AvatarImage({ className, ...props }) {
    return (<AvatarPrimitive.Image data-slot="avatar-image" className={cn("flex aspect-square size-full items-center rounded-full object-cover", className)} {...props}/>);
}
export function AvatarFallback({ className, ...props }) {
    return (<AvatarPrimitive.Fallback data-slot="avatar-fallback" className={cn("absolute inset-0 flex items-center justify-center rounded-full bg-primary-100 text-primary-500 uppercase", className)} {...props}/>);
}
export function AvatarBadge({ className, status = "online", size = "md", live = false, ping = false, ...props }) {
    return (<span data-slot="avatar-badge" aria-label={status} aria-live={live ? "polite" : undefined} data-status={status} className={cn("absolute right-0 bottom-0.5 z-10 inline-flex items-center justify-center rounded-full text-white ring-[1.5px] ring-background-50 select-none", badgeSizeClasses[size], statusClasses[status], className)} {...props}>
      {ping && (<span className={cn("absolute inset-0 -z-1 animate-ping rounded-full opacity-75", statusClasses[status])}/>)}
    </span>);
}
export function AvatarGroup({ className, children, ...props }) {
    return (<div data-slot="avatar-group" role="group" className={cn("group/avatar-group flex -space-x-3 *:data-[slot=avatar]:ring-[1.5px] *:data-[slot=avatar]:ring-background-50", className)} {...props}>
      {children}
    </div>);
}
export function AvatarGroupCount({ className, size = "md", children, "aria-label": ariaLabel, ...props }) {
    const computedLabel = ariaLabel ?? (typeof children === "string" ? `${children} more` : undefined);
    return (<div data-slot="avatar-group-count" data-size={size} aria-label={computedLabel} className={cn("relative flex shrink-0 items-center justify-center rounded-full bg-primary-100 text-primary-500 ring-[1.5px] ring-background-50", sizeClasses[size], className)} {...props}>
      {children}
    </div>);
}
