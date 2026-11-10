"use client";
import { cnx as cn } from "@/shared/utils/cn";
import { Text } from "react-aria-components";
export function Description({ className, ...props }) {
    return (<Text slot="description" data-slot="description" className={cn("text-sm text-text-50", className)} {...props}/>);
}
