import { cnx as cn } from "@/shared/utils/cn";
import { cva } from "class-variance-authority";
const tableRootStyles = cva("min-w-full border-separate border-spacing-0 overflow-clip border-border-primary text-left", {
    variants: {
        fullBleed: {
            true: "border-y",
            false: "rounded-lg border",
        },
    },
    defaultVariants: {
        fullBleed: false,
    },
});
export function TableRoot({ className, fullBleed, ...props }) {
    return (<div className="overflow-x-auto">
      <table className={cn(tableRootStyles({ fullBleed }), className)} {...props}/>
    </div>);
}
const tableHeaderStyles = cva("text-title-50 [&_th]:border-b [&_th]:border-border-primary [&_th]:text-xs");
export function TableHeader({ className, ...props }) {
    return <thead className={cn(tableHeaderStyles(), className)} {...props}/>;
}
const tableBodyStyle = cva();
export function TableBody({ className, ...props }) {
    return <tbody className={cn(tableBodyStyle(), className)} {...props}/>;
}
const tableHeadStyles = cva("px-5 py-3.5 font-medium");
export function TableHead({ className, ...props }) {
    return <th className={cn(tableHeadStyles(), className)} {...props}/>;
}
const tableRowStyles = cva("not-last:*:border-border-primary not-last:[&>td]:border-b not-last:[&>th]:border-b");
export function TableRow({ className, ...props }) {
    return <tr className={cn(tableRowStyles(), className)} {...props}/>;
}
const tableCellStyles = cva("px-5 py-3.5 font-medium text-text-100");
export function TableCell({ className, ...props }) {
    return <td className={cn(tableCellStyles(), className)} {...props}/>;
}
