import { cnx as cn } from "@/shared/utils/cn";
import { cva } from "class-variance-authority";
import { Button as AriaButton, Group as AriaGroup, NumberField as AriaNumberField } from "react-aria-components";
export function NumberField({ children, invalid, required, disabled, readOnly, ...props }) {
    return (<AriaNumberField {...props} isInvalid={invalid} isRequired={required} isDisabled={disabled} isReadOnly={readOnly}>
      {children}
    </AriaNumberField>);
}
const numberFieldStyles = cva(["relative w-fit"]);
export function NumberFieldGroup({ children, className, ...params }) {
    return (<AriaGroup className={cn(numberFieldStyles(), className)} {...params}>
      {children}
    </AriaGroup>);
}
const numberFieldActionStyles = cva("h-[calc(100%-2px)] px-2 border-button-outline-border absolute top-1/2 -translate-y-1/2 duration-300 hover:bg-button-outline-hover-background focus:outline-none focus:ring-2 disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed focus:ring-button-primary-focus-ring [:where([slot=decrement])]:border-r [:where([slot=decrement])]:rounded-l-lg [:where([slot=decrement])]:left-px [:where([slot=increment])]:border-l [:where([slot=increment])]:rounded-r-lg [:where([slot=increment])]:right-px [:where(&>svg)]:size-5");
export function NumberFieldAction({ children, className, ...params }) {
    return (<AriaButton className={cn(numberFieldActionStyles(), className)} {...params}>
      {children}
    </AriaButton>);
}
