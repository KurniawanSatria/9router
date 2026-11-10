"use client";
import { buttonStyles } from "@/shared/tailgrids/core/button";
import { cnx as cn } from "@/shared/utils/cn";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { cva } from "class-variance-authority";
import { useContext, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button as AriaButton, Calendar as AriaCalendar, CalendarCell as AriaCalendarCell, CalendarGrid as AriaCalendarGrid, CalendarGridBody as AriaCalendarGridBody, CalendarGridHeader as AriaCalendarGridHeader, Heading as AriaHeading, CalendarHeaderCell, CalendarStateContext, ListBox, ListBoxItem, Popover, useLocale, } from "react-aria-components";
const calendarStyles = cva("flex w-full flex-col rounded-3xl border border-base-100 bg-background-50 p-4 shadow-[0_20px_45px_rgba(15,23,42,0.08)] sm:p-5");
export function Calendar({ className, children, disabled, readonly, ...props }) {
    return (<AriaCalendar {...props} className={cn(calendarStyles(), className)} isDisabled={disabled} isReadOnly={readonly}>
      {children}
    </AriaCalendar>);
}
const calendarHeaderStyles = cva("mb-4 flex items-center gap-2 px-1");
export function CalendarHeader({ className, ...props }) {
    return (<header className={cn(calendarHeaderStyles(), className)} {...props}>
      {props.children}
    </header>);
}
export function NavButton({ slot, className, ...props }) {
    const { direction } = useLocale();
    return (<AriaButton slot={slot} type="button" className={cn(buttonStyles({
            variant: "ghost",
            iconOnly: true,
            size: "sm",
        }), "size-9 shrink-0 rounded-full text-text-50", className)} aria-label={slot === "previous" ? "Previous month" : "Next month"} {...props}>
      {slot === "previous" ? (direction === "rtl" ? (<ChevronRight aria-hidden/>) : (<ChevronLeft aria-hidden/>)) : direction === "rtl" ? (<ChevronLeft aria-hidden/>) : (<ChevronRight aria-hidden/>)}
    </AriaButton>);
}
export function CalendarYearPicker({ className }) {
    const state = useContext(CalendarStateContext);
    const { locale } = useLocale();
    const [isOpen, setIsOpen] = useState(false);
    const triggerRef = useRef(null);
    const listboxRef = useRef(null);
    const currentMonth = state?.focusedDate.month ?? new Date().getMonth() + 1;
    const currentYear = state?.focusedDate.year ?? new Date().getFullYear();
    const years = useMemo(() => {
        const yearStart = currentYear - 20;
        return Array.from({ length: 40 }, (_, index) => yearStart + index);
    }, [currentYear]);
    const monthFormatter = useMemo(() => new Intl.DateTimeFormat(locale, { month: "short" }), [locale]);
    const currentMonthLabel = monthFormatter.format(new Date(Date.UTC(2000, currentMonth - 1, 1)));
    useLayoutEffect(() => {
        if (!isOpen) {
            return;
        }
        const frame = requestAnimationFrame(() => {
            const listboxElement = listboxRef.current;
            const selectedItem = listboxElement?.querySelector("[data-selected='true']");
            if (!listboxElement || !selectedItem) {
                return;
            }
            const targetScrollTop = selectedItem.offsetTop - listboxElement.clientHeight / 2 + selectedItem.clientHeight / 2;
            listboxElement.scrollTop = Math.max(0, targetScrollTop);
        });
        return () => {
            cancelAnimationFrame(frame);
        };
    }, [isOpen, currentYear]);
    if (!state) {
        return;
    }
    const focusedDate = state.focusedDate;
    const currentDay = focusedDate.day;
    const clampFocusedDateToYear = (year) => {
        const safeDate = focusedDate.set({ day: 1, year });
        const maxDay = safeDate.calendar.getDaysInMonth(safeDate);
        return safeDate.set({ day: Math.min(currentDay, maxDay) });
    };
    return (<>
      <button ref={triggerRef} type="button" aria-label="Select year" aria-haspopup="listbox" aria-expanded={isOpen} onClick={() => {
            setIsOpen((open) => !open);
        }} className={cn(buttonStyles({
            variant: "ghost",
            iconOnly: false,
            size: "sm",
        }), "h-10 min-w-24 justify-between rounded-full border border-base-100 bg-white-100 px-3 text-sm font-medium text-title-50 hover:bg-white-100 hover:text-title-50 focus:ring-button-primary-focus-ring sm:h-11", className)}>
        <span>
          {currentMonthLabel} {currentYear}
        </span>
        <ChevronDown aria-hidden className="size-4 shrink-0 text-text-100"/>
      </button>

      <Popover isOpen={isOpen} onOpenChange={setIsOpen} triggerRef={triggerRef} placement="bottom" offset={8} className="w-56 overflow-hidden rounded-xl border border-base-100 bg-dropdown-background p-0 shadow-md">
        <ListBox ref={listboxRef} aria-label="Select year" autoFocus selectionMode="single" selectedKeys={[String(currentYear)]} disallowEmptySelection shouldFocusWrap onSelectionChange={(keys) => {
            if (keys === "all") {
                return;
            }
            const selectedYear = Number([...keys][0]);
            if (Number.isNaN(selectedYear)) {
                return;
            }
            state.setFocusedDate(clampFocusedDateToYear(selectedYear));
            setIsOpen(false);
        }} className="max-h-60 overflow-y-auto p-1.5 outline-none">
          {years.map((year) => (<ListBoxItem key={year} id={String(year)} textValue={String(year)} className={cn("flex w-full justify-between rounded-md px-3 py-2 text-left text-sm outline-hidden", "data-[selected=true]:bg-dropdown-hover-background data-[selected=true]:text-title-50", "data-[focused=true]:bg-dropdown-hover-background data-[focused=true]:text-title-50")}>
              {year}
            </ListBoxItem>))}
        </ListBox>
      </Popover>
    </>);
}
const calendarGridStyles = cva("w-full border-collapse border-spacing-0");
export function CalendarGrid({ className, ...props }) {
    return <AriaCalendarGrid className={cn(calendarGridStyles(), className)} {...props}/>;
}
export function CalendarGridBody({ ...props }) {
    return <AriaCalendarGridBody {...props}/>;
}
export function CalendarHeading({ className, ...props }) {
    return <AriaHeading {...props} className={cn("flex-1 text-center", className)}/>;
}
const calendarGridHeaderCellStyles = cva("table-grid-header-cell pb-2 text-center text-[0.7rem] font-medium tracking-[0.16em] text-text-100 uppercase sm:text-xs");
export function CalendarGridHeader({ className }) {
    return (<AriaCalendarGridHeader>
      {(day) => (<CalendarHeaderCell className={cn(calendarGridHeaderCellStyles(), className)}>
          {day}
        </CalendarHeaderCell>)}
    </AriaCalendarGridHeader>);
}
const calendarCellButtonStyles = cva("flex size-10 items-center justify-center rounded-full text-sm font-medium text-title-50 transition forced-color-adjust-none outline-none [-webkit-tap-highlight-color:transparent] group-data-[today=true]:bg-datepicker-selected-background/90 group-data-[today=true]:text-white group-[[data-unavailable=true]:not([data-today=true])]:text-text-100 group-[&[data-disabled=true]:not([data-outside-month]):not([data-today])]:text-text-100 hover:bg-datepicker-selected-hover-background group-data-[today=true]:hover:bg-datepicker-selected-background/90 data-[disabled=true]:cursor-not-allowed data-[focus-visible=true]:ring-2 data-[focus-visible=true]:ring-button-primary-focus-ring data-[focus-visible=true]:ring-offset-2 data-[focus-visible=true]:ring-offset-background-50 data-[outside-month=true]:pointer-events-none data-[outside-month=true]:text-text-200 data-[pressed=true]:scale-95 data-[selected=true]:bg-datepicker-selected-background data-[selected=true]:text-white-100 sm:size-11 [&[data-disabled=true]:not([data-outside-month])]:line-through");
export function CalendarCell({ className, disabled, focusVisible, outsideMonth, pressed, selected, ...props }) {
    return (<AriaCalendarCell {...props} className="group p-0 outline-none">
      {({ formattedDate, isDisabled, isFocusVisible, isOutsideMonth, isPressed, isSelected, }) => (<span data-disabled={(disabled ?? isDisabled) || undefined} data-focus-visible={(focusVisible ?? isFocusVisible) || undefined} data-outside-month={(outsideMonth ?? isOutsideMonth) || undefined} data-pressed={(pressed ?? isPressed) || undefined} data-selected={(selected ?? isSelected) || undefined} className={cn(calendarCellButtonStyles(), className)}>
          {formattedDate}
        </span>)}
    </AriaCalendarCell>);
}
