"use client";
import { cnx as cn } from "@/shared/utils/cn";
import { X as Close } from "lucide-react";
import { cva } from "class-variance-authority";
import { Button as AriaButton, Dialog as AriaDialog, DialogTrigger as AriaDialogTrigger, Heading, Modal, ModalOverlay, } from "react-aria-components";
export function Sheet(props) {
    return <AriaDialogTrigger {...props}/>;
}
export function SheetTrigger({ className, ...props }) {
    return <AriaButton className={cn("outline-none", className)} {...props}/>;
}
export function SheetOverlay({ className, isDismissable = true, ...props }) {
    return (<ModalOverlay isDismissable={isDismissable} className={cn("fixed inset-0 isolate z-9999 bg-black/50 duration-200 data-entering:animate-in data-entering:fade-in-0 data-exiting:animate-out data-exiting:fade-out-0 supports-backdrop-filter:backdrop-blur-xs dark:bg-black/70", className)} {...props}/>);
}
// Sheet Content
const sheetVariants = cva("fixed z-50 duration-200 outline-none data-entering:animate-in data-exiting:animate-out", {
    variants: {
        side: {
            right: "inset-y-0 right-0 h-full data-entering:slide-in-from-right data-exiting:slide-out-to-right",
            left: "inset-y-0 left-0 h-full data-entering:slide-in-from-left data-exiting:slide-out-to-left",
            top: "inset-x-0 top-0 data-entering:slide-in-from-top data-exiting:slide-out-to-top",
            bottom: "inset-x-0 bottom-0 data-entering:slide-in-from-bottom data-exiting:slide-out-to-bottom",
        },
    },
    defaultVariants: {
        side: "right",
    },
});
const sheetDialogVariants = cva("relative flex flex-col gap-4 bg-background-100 p-6 shadow-lg outline-none", {
    variants: {
        side: {
            right: "h-full w-full min-w-xs border-l border-base-100 pr-4 sm:max-w-sm",
            left: "h-full w-full min-w-xs border-r border-base-100 sm:max-w-sm",
            top: "w-full border-b border-base-100",
            bottom: "w-full border-t border-base-100",
        },
    },
    defaultVariants: {
        side: "right",
    },
});
export function SheetContent({ children, className, side = "right", modalProps, showCloseButton = true, ...props }) {
    const { className: modalClassName, ...restModalProps } = modalProps || {};
    return (<Modal className={cn(sheetVariants({ side }), modalClassName)} {...restModalProps}>
      <AriaDialog className={cn(sheetDialogVariants({ side }), className)} {...props}>
        {({ close }) => (<>
            {typeof children === "function" ? children({ close }) : children}
            {showCloseButton && (<AriaButton onPress={close} aria-label="Close" className={cn("absolute top-4 right-4 flex size-7 items-center justify-center rounded-md text-text-100 opacity-70 transition-opacity outline-none hover:opacity-100 focus-visible:ring-2 focus-visible:ring-primary-500 disabled:pointer-events-none [&>svg]:size-5", side === "right" && "sm:right-0")}>
                <Close />
                <span className="sr-only">Close</span>
              </AriaButton>)}
          </>)}
      </AriaDialog>
    </Modal>);
}
export function SheetHeader({ className, ...props }) {
    return (<div data-slot="sheet-header" className={cn("flex flex-col gap-1.5 text-left", className)} {...props}/>);
}
export function SheetTitle({ className, ...props }) {
    return (<Heading slot="title" className={cn("text-lg leading-none font-semibold text-title-50", className)} {...props}/>);
}
export function SheetDescription({ className, ...props }) {
    return (<p data-slot="sheet-description" className={cn("text-sm text-text-100", className)} {...props}/>);
}
export function SheetBody({ className, ...props }) {
    return (<div data-slot="sheet-body" className={cn("-mx-1 flex-1 overflow-y-auto px-1 text-sm text-text-100", className)} {...props}/>);
}
export function SheetFooter({ className, showCloseButton = false, children, ...props }) {
    return (<div data-slot="sheet-footer" className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props}>
      {showCloseButton && (<SheetClose className="inline-flex h-10 items-center justify-center rounded-lg border border-base-100 bg-background-100 px-4 text-sm font-medium text-title-50 transition outline-none hover:bg-background-soft-50 focus-visible:ring-2 focus-visible:ring-primary-500">
          Close
        </SheetClose>)}
      {children}
    </div>);
}
export function SheetClose({ className, ...props }) {
    return <AriaButton slot="close" className={cn("outline-none", className)} {...props}/>;
}
