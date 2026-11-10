"use client";
import { cnx as cn } from "@/shared/utils/cn";
import { ScrollArea as ScrollAreaPrimitive } from "@base-ui/react/scroll-area";
import { cva } from "class-variance-authority";
const scrollBarStyles = cva("flex touch-none rounded-[inherit] bg-background-soft-100 p-px transition-colors select-none", {
    variants: {
        orientation: {
            vertical: "h-full w-2.5 border-x border-x-transparent",
            horizontal: "h-2.5 flex-col border-y border-y-transparent",
        },
    },
    defaultVariants: {
        orientation: "vertical",
    },
});
const scrollBarThumbStyles = cva("relative flex-1 rounded-full bg-background-soft-500");
function ScrollArea({ className, children, ...props }) {
    return (<ScrollAreaPrimitive.Root data-slot="scroll-area" className={cn("relative", className)} {...props}>
      {children}
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>);
}
function ScrollAreaViewport({ className, children, ...props }) {
    return (<ScrollAreaPrimitive.Viewport data-slot="scroll-area-viewport" className={cn("size-full rounded-[inherit] transition-[color,box-shadow] outline-none", className)} {...props}>
      {children}
    </ScrollAreaPrimitive.Viewport>);
}
function ScrollBar({ className, orientation = "vertical", ...props }) {
    return (<ScrollAreaPrimitive.Scrollbar data-slot="scroll-area-scrollbar" data-orientation={orientation || "vertical"} orientation={orientation || "vertical"} className={cn(scrollBarStyles({ orientation }), className)} {...props}>
      <ScrollAreaPrimitive.Thumb data-slot="scroll-area-thumb" className={cn(scrollBarThumbStyles(), className)}/>
    </ScrollAreaPrimitive.Scrollbar>);
}
export { ScrollArea, ScrollAreaViewport, ScrollBar };
