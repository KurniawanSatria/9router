"use client";
import { cnx as cn } from "@/shared/utils/cn";
import { cva } from "class-variance-authority";
import { Separator as AriaSeparator, } from "react-aria-components";
const separatorStyles = cva("shrink-0 bg-(--border-color-base-200)", {
    variants: {
        orientation: {
            horizontal: "h-px w-full",
            vertical: "h-full w-px",
        },
    },
    defaultVariants: {
        orientation: "horizontal",
    },
});
export function Separator({ className, orientation = "horizontal", ...props }) {
    return (<AriaSeparator orientation={orientation} className={cn(separatorStyles({ orientation }), className)} {...props}/>);
}
