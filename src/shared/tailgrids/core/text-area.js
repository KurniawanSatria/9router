"use client";
import { cnx as cn } from "@/shared/utils/cn";
import { cva } from "class-variance-authority";
import { TextArea as AriaTextAria, } from "react-aria-components";
const textAreaStyles = cva("peer w-full rounded-lg border bg-input-background px-4 py-3.5 text-title-50 outline-none placeholder:text-input-placeholder-text focus:ring-4 disabled:cursor-not-allowed disabled:border-input-disabled-border disabled:bg-input-disabled-background disabled:text-input-disabled-text disabled:placeholder:text-input-disabled-text data-invalid:border-input-error-focus-border data-invalid:ring-input-error-focus-border/20", {
    variants: {
        state: {
            default: "border-card-border focus:border-input-primary-focus-border focus:ring-input-primary-focus-border/20",
            error: "border-input-error-focus-border focus:ring-input-error-focus-border/20",
            success: "border-input-success-focus-border focus:ring-input-success-focus-border/20",
        },
    },
});
export function TextArea({ className, rows = 4, state = "default", ...props }) {
    return (<AriaTextAria rows={rows} className={cn(textAreaStyles({ state }), className)} {...props}/>);
}
