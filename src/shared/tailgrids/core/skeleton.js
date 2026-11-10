import { cnx as cn } from "@/shared/utils/cn";
export function Skeleton({ className, ...props }) {
    return (<div className={cn("h-3 animate-pulse-custom rounded-full bg-skeleton-gradient-50", className)} {...props}/>);
}
