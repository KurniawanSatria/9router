"use client";
import { cnx as cn } from "@/shared/utils/cn";
import { cva } from "class-variance-authority";
import { createContext, useContext, useId, useState } from "react";
import { Badge } from "./badge";
const TabsContext = createContext(undefined);
function useTabsContext() {
    const context = useContext(TabsContext);
    if (!context) {
        throw new Error("useTabsContext must be used within a Tabs Component");
    }
    return context;
}
const tabRootStyles = cva("max-w-full rounded-xl border border-card-border", {
    variants: {
        variant: {
            default: "",
            minimal: "",
        },
        direction: {
            vertical: "",
            horizontal: "flex gap-8 p-6 max-sm:flex-wrap",
        },
    },
    compoundVariants: [
        {
            variant: "minimal",
            direction: "vertical",
            className: "px-6 pt-3",
        },
    ],
});
export function TabRoot({ defaultValue, children, className, variant = "default", direction = "vertical", }) {
    const [activeTab, setActiveTab] = useState(defaultValue);
    const id = useId();
    return (<TabsContext.Provider value={{ activeTab, setActiveTab, variant, id, direction }}>
      <div className={cn(tabRootStyles({ variant, direction }), className)}>{children}</div>
    </TabsContext.Provider>);
}
const tabListWrapperStyles = cva("max-sm:w-full", {
    variants: {
        variant: {
            default: "",
            minimal: "",
        },
        direction: {
            vertical: "",
            horizontal: "",
        },
    },
    compoundVariants: [
        {
            direction: "vertical",
            className: "border-b border-card-border [&>div]:w-full",
        },
        {
            direction: "vertical",
            variant: "default",
            className: "p-3 [&>div]:rounded-lg [&>div]:bg-background-gray-secondary [&>div]:p-1",
        },
    ],
});
const tabListStyles = cva("flex overflow-x-auto overflow-y-hidden", {
    variants: {
        variant: {
            default: "",
            minimal: "",
        },
        direction: {
            vertical: "",
            horizontal: "flex-col gap-2 max-sm:items-center sm:min-w-50",
        },
    },
    compoundVariants: [
        {
            direction: "vertical",
            variant: "default",
            className: "gap-1",
        },
        {
            direction: "vertical",
            variant: "minimal",
            className: "gap-2",
        },
    ],
});
export function TabList({ children, className }) {
    const { variant, direction } = useTabsContext();
    return (<div className={tabListWrapperStyles({ variant, direction })}>
      <div role="tablist" className={cn(tabListStyles({ variant, direction }), className)}>
        {children}
      </div>
    </div>);
}
const tabTriggerStyles = cva("flex items-center gap-2 px-3 text-sm font-medium whitespace-nowrap text-text-100 [&>svg]:size-5 [&>svg]:text-current!", {
    variants: {
        variant: {
            default: "",
            minimal: "",
        },
        direction: {
            vertical: "",
            horizontal: "rounded-lg p-3 hover:bg-tab-secondary-active-background hover:text-neutral-brand-color max-sm:w-full max-sm:justify-center",
        },
    },
    compoundVariants: [
        {
            direction: "vertical",
            variant: "default",
            className: "rounded-md py-2 data-[active=true]:bg-tab-active-background data-[active=true]:text-title-50 data-[active=true]:shadow-xs",
        },
        {
            direction: "vertical",
            variant: "minimal",
            className: "py-3.5 data-[active=true]:border-b-2 data-[active=true]:border-primary-500 data-[active=true]:text-neutral-brand-color",
        },
        {
            direction: "horizontal",
            variant: "default",
            className: "data-[active=true]:bg-tab-secondary-active-background data-[active=true]:text-neutral-brand-color",
        },
        {
            direction: "horizontal",
            variant: "minimal",
            className: "data-[active=true]:border data-[active=true]:border-primary-500 data-[active=true]:text-neutral-brand-color",
        },
    ],
});
export function TabTrigger({ value, children, className, icon, badge, ...props }) {
    const { activeTab, setActiveTab, variant, id, direction } = useTabsContext();
    const isActive = activeTab === value;
    return (<button data-active={isActive} onClick={() => setActiveTab(value)} className={cn(tabTriggerStyles({ variant, direction }), className)} role="tab" aria-selected={isActive} id={`${id}-trigger-${value}`} aria-controls={`${id}-content-${value}`} {...props}>
      {icon}
      {children}
      {badge && (<Badge size={"sm"} color="primary">
          {badge}
        </Badge>)}
    </button>);
}
const tabContentStyles = cva("text-sm font-normal text-text-100", {
    variants: {
        variant: {
            default: "",
            minimal: "",
        },
        direction: {
            horizontal: "",
            vertical: "",
        },
    },
    compoundVariants: [
        {
            direction: "vertical",
            className: "py-6",
        },
        {
            direction: "vertical",
            variant: "default",
            className: "px-6",
        },
    ],
});
export function TabContent({ value, children, className }) {
    const { activeTab, id, variant, direction } = useTabsContext();
    return (<div role="tabpanel" id={`${id}-content-${value}`} aria-labelledby={`${id}-trigger-${value}`} className={cn(tabContentStyles({ variant, direction }), className)} hidden={activeTab !== value}>
      {children}
    </div>);
}
