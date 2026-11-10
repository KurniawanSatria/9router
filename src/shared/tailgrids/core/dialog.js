import { cnx as cn } from "@/shared/utils/cn";
import { X as Close } from "lucide-react";
import { Button as AriaButton, Dialog as AriaDialog, Modal as AriaModal, Heading, } from "react-aria-components";
import { Button } from "./button";
import { Description } from "./description";
export function Dialog({ isOpen, defaultOpen, onOpenChange, className, showCloseButton = true, children, ...props }) {
    return (<AriaModal isOpen={isOpen} defaultOpen={defaultOpen} onOpenChange={onOpenChange} className={cn("fixed top-1/2 left-1/2 w-full max-w-140 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border-primary bg-background-white-primary p-6 shadow-lg outline-none max-sm:max-w-[calc(100%-2rem)]", "duration-100 data-entering:animate-in data-entering:fade-in-0 data-entering:zoom-in-95 data-exiting:animate-out data-exiting:fade-out-0 data-exiting:zoom-out-95", className)}>
      <AriaDialog className="outline-none" {...props}>
        {({ close }) => (<>
            {typeof children === "function" ? children({ close }) : children}
            {showCloseButton && (<AriaButton onPress={close} aria-label="Close" className="absolute top-4 right-4 flex size-7 items-center justify-center rounded-md text-text-100 opacity-70 transition-opacity outline-none hover:opacity-100 focus-visible:ring-2 focus-visible:ring-primary-500 disabled:pointer-events-none [&>svg]:size-5">
                <Close />
                <span className="sr-only">Close</span>
              </AriaButton>)}
          </>)}
      </AriaDialog>
    </AriaModal>);
}
export function DialogHeader({ className, ...props }) {
    return (<div data-slot="dialog-header" className={cn("flex flex-col gap-1.5 text-left", className)} {...props}/>);
}
export function DialogTitle({ className, ...props }) {
    return (<Heading slot="title" className={cn("text-lg leading-none font-semibold text-title-50", className)} {...props}/>);
}
export function DialogDescription({ ...props }) {
    return <Description {...props}/>;
}
export function DialogBody({ className, ...props }) {
    return (<div data-slot="dialog-body" className={cn("py-4 text-sm text-text-100", className)} {...props}/>);
}
export function DialogFooter({ className, children, ...props }) {
    return (<div data-slot="dialog-footer" className={cn("flex flex-col-reverse gap-2 pt-4 sm:flex-row sm:justify-end", className)} {...props}>
      {children}
    </div>);
}
export function DialogClose({ ...props }) {
    return <Button slot="close" {...props}/>;
}
