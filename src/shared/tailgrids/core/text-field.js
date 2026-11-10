"use client";
import { cnx as cn } from "@/shared/utils/cn";
import { cva } from "class-variance-authority";
import { TextField as AriaTextField, } from "react-aria-components";
const textFieldStyles = cva("flex", {
    variants: {
        orientation: {
            vertical: "flex-col",
            horizontal: "flex-row items-center gap-3",
            responsive: "flex-col @sm/field-group:flex-row @sm/field-group:items-start",
        },
    },
    defaultVariants: {
        orientation: "vertical",
    },
});
export function TextField({ className, orientation, invalid, required, disabled, readOnly, ...props }) {
    return (<AriaTextField className={cn(textFieldStyles({ orientation }), className)} isInvalid={invalid} isRequired={required} isDisabled={disabled} isReadOnly={readOnly} {...props}/>);
}
