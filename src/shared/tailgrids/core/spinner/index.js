import { cnx as cn } from "@/shared/utils/cn";
import { cva } from "class-variance-authority";
import { DefaultSpinner } from "./default";
import { DottedSpinner } from "./dotted";
import { DottedRoundSpinner } from "./dotted-round";
const spinnerStyles = cva("animate-spin", {
    variants: {
        size: {
            sm: "size-5",
            md: "size-7",
            lg: "size-9",
            xl: "size-10",
            xxl: "size-12"
        }
    },
    defaultVariants: {
        size: "md"
    }
});
export function Spinner({ className, size = "md", type = "default" }) {
    switch (type) {
        case "dotted":
            return (<DottedSpinner className={cn(spinnerStyles({ size }), className)}/>);
        case "dotted-round":
            return (<DottedRoundSpinner className={cn(spinnerStyles({ size }), className)}/>);
        default:
            return (<DefaultSpinner className={cn(spinnerStyles({ size }), className)} percentage={50}/>);
    }
}
