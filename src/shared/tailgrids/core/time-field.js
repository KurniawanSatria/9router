"use client";
import { cnx as cn } from "@/shared/utils/cn";
import { cva } from "class-variance-authority";
import { TimeField as AriaTimeField } from "react-aria-components";
const timeFieldStyles = cva("flex gap-3", {
    variants: {
        orientation: {
            vertical: "flex-col",
            horizontal: "flex-row items-center",
            responsive: "flex-col @sm/field-group:flex-row @sm/field-group:items-start"
        }
    },
    defaultVariants: {
        orientation: "vertical"
    }
});
export function TimeField({ className, orientation, invalid, required, disabled, readOnly, ...props }) {
    return (<AriaTimeField className={cn(timeFieldStyles({ orientation }), className)} isInvalid={invalid} isRequired={required} isDisabled={disabled} isReadOnly={readOnly} {...props}/>);
}
