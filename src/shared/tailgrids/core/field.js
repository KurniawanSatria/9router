"use client";
import { cnx as cn } from "@/shared/utils/cn";
import { cva } from "class-variance-authority";
import * as React from "react";
import { FieldError as AriaFieldError, Group as AriaGroup, Label as AriaLabel, Separator as AriaSeparator, Text as AriaText, } from "react-aria-components";
// FieldSet
const fieldSetStyles = cva("flex flex-col gap-4", {
    variants: {
        hasCheckboxGroup: {
            true: "has-[>[data-slot=checkbox-group]]:gap-3",
            false: "",
        },
        hasRadioGroup: {
            true: "has-[>[data-slot=radio-group]]:gap-3",
            false: "",
        },
    },
    defaultVariants: {
        hasCheckboxGroup: false,
        hasRadioGroup: false,
    },
});
export function FieldSet({ className, hasCheckboxGroup, hasRadioGroup, ...props }) {
    return (<fieldset data-slot="field-set" className={cn(fieldSetStyles({ hasCheckboxGroup, hasRadioGroup }), className)} {...props}/>);
}
// FieldLegend
const fieldLegendStyles = cva("mb-1.5 font-medium", {
    variants: {
        variant: {
            label: "text-sm",
            legend: "text-base",
        },
    },
    defaultVariants: {
        variant: "legend",
    },
});
export function FieldLegend({ className, variant = "legend", ...props }) {
    return (<legend data-slot="field-legend" data-variant={variant} className={cn(fieldLegendStyles({ variant }), className)} {...props}/>);
}
// FieldGroup
const fieldGroupStyles = cva("@container/field-group flex flex-col gap-6");
export function FieldGroup({ className, disabled, readOnly, ...props }) {
    return (<AriaGroup className={cn(fieldGroupStyles(), className)} isDisabled={disabled} isReadOnly={readOnly} {...props}/>);
}
// FieldContent
const fieldContentStyles = cva("group/field-content flex flex-1 flex-col gap-0.5 leading-snug");
export function FieldContent({ className, ...props }) {
    return (<div data-slot="field-content" className={cn(fieldContentStyles(), className)} {...props}/>);
}
// FieldLabel
const fieldLabelStyles = cva("cursor-pointer text-sm font-medium text-input-label-text select-none data-disabled:cursor-not-allowed data-disabled:text-input-disabled-text");
export function FieldLabel({ className, ...props }) {
    return <AriaLabel className={cn(fieldLabelStyles(), className)} {...props}/>;
}
// FieldTitle
const fieldTitleStyles = cva("text-sm font-medium text-input-label-text select-none");
export function FieldTitle({ className, ...props }) {
    return <AriaText className={cn(fieldTitleStyles(), className)} {...props}/>;
}
// FieldDescription
const fieldDescriptionStyles = cva("text-sm font-normal text-text-50 data-horizontal:text-balance");
export function FieldDescription({ className, ...props }) {
    return (<AriaText slot="description" className={cn(fieldDescriptionStyles(), className)} {...props}/>);
}
// FieldError
const fieldErrorStyles = cva("text-sm font-normal text-error-500 data-horizontal:text-balance");
export function FieldError({ className, ...props }) {
    return <AriaFieldError className={cn(fieldErrorStyles(), className)} {...props}/>;
}
// FieldSeparator
const fieldSeparatorStyles = cva("relative flex items-center gap-4 text-sm text-text-100", {
    variants: {
        hasContent: {
            true: "before:h-px before:flex-1 before:bg-(--border-color-base-200) after:h-px after:flex-1 after:bg-(--border-color-base-200)",
            false: "h-px bg-(--border-color-base-200)",
        },
    },
});
export function FieldSeparator({ className, children, ...props }) {
    const hasContent = Boolean(children);
    if (!children) {
        return <AriaSeparator className={cn(fieldSeparatorStyles({ hasContent }), className)}/>;
    }
    return (<div className={cn(fieldSeparatorStyles({ hasContent }), className)} role="separator" {...props}>
      {children}
    </div>);
}
