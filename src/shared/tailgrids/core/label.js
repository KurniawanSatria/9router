"use client";
import { cnx as cn } from "@/shared/utils/cn";
import { Label as AriaLabel } from "react-aria-components";
export function Label({ className, ...props }) {
    return (<AriaLabel className={cn("block text-sm font-medium text-input-label-text-color", className)} {...props}/>);
}
