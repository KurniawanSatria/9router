"use client";
import { cnx as cn } from "@/shared/utils/cn";
import { Heading } from "react-aria-components";
export function Card({ children, className }) {
    return (<div className={cn("rounded-xl border-[0.5px] border-card-border bg-card-background p-5", className)}>
      {children}
    </div>);
}
export function CardHeader({ children, className }) {
    return (<div className={cn("relative flex w-full flex-wrap items-center justify-between gap-3", className)}>
      {children}
    </div>);
}
export function CardTitle({ children, className, ...props }) {
    return (<Heading className={cn("leading-6 font-semibold tracking-[-0.2px] text-text-primary", className)} {...props}>
      {children}
    </Heading>);
}
export function CardDescription({ children, className }) {
    return (<div className={cn("mt-0.5 text-base leading-6 tracking-[-0.2px] text-text-secondary", className)}>
      {children}
    </div>);
}
export function CardAction({ children, className }) {
    return <div className={cn("absolute top-5 right-5 text-text-50", className)}>{children}</div>;
}
export function CardContent({ children, className }) {
    return <div className={cn("p-6 text-text-primary", className)}>{children}</div>;
}
export function CardFooter({ children, className }) {
    return <div className={cn("px-5 pb-5", className)}>{children}</div>;
}
