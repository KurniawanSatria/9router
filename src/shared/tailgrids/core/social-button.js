"use client";
import { cnx as cn } from "@/shared/utils/cn";
import { Button } from "./button";
export function SocialButton({ className, ...props }) {
    return (<Button appearance="outline" className={cn("w-full max-w-84 py-3 disabled:[&>svg]:opacity-60", className)} {...props}/>);
}
