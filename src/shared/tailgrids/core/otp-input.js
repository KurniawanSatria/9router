"use client";
import { cnx as cn } from "@/shared/utils/cn";
import React, { useEffect, useId, useRef, useState } from "react";
import { Group, Input, Label, Text } from "react-aria-components";
export default function OtpInput({ digitLength = 4, label, hint, errorMessage, isInvalid = false, className, disabled, onChange, value, id: externalId, autoFocus, ...props }) {
    const [otp, setOtp] = useState(Array(digitLength).fill(""));
    const inputRefs = useRef([]);
    const baseId = useId();
    const id = externalId || baseId;
    const labelId = `${baseId}-label`;
    const hintId = `${baseId}-hint`;
    // Sync value prop from parent to local state
    useEffect(() => {
        if (value !== undefined) {
            const digits = value.split("").slice(0, digitLength);
            const paddedDigits = [...digits, ...Array(digitLength - digits.length).fill("")];
            setOtp((prev) => {
                if (prev.join("") === paddedDigits.join("")) {
                    return prev;
                }
                return paddedDigits;
            });
        }
    }, [value, digitLength]);
    // Sync local state changes back to parent onChange
    useEffect(() => {
        if (onChange) {
            const otpValue = otp.join("");
            if (value !== undefined && otpValue === value) {
                return;
            }
            const event = {
                target: { value: otpValue },
            };
            onChange(event);
        }
    }, [otp, onChange, value]);
    const handleKeyDown = (e, index) => {
        if (!/^[0-9]{1}$/.test(e.key) &&
            e.key !== "Backspace" &&
            e.key !== "Delete" &&
            e.key !== "Tab" &&
            e.key !== "ArrowLeft" &&
            e.key !== "ArrowRight" &&
            !e.metaKey) {
            e.preventDefault();
        }
        if (e.key === "Delete" || e.key === "Backspace") {
            e.preventDefault();
            if (otp[index]) {
                setOtp((prevOtp) => [...prevOtp.slice(0, index), "", ...prevOtp.slice(index + 1)]);
            }
            else if (index > 0) {
                setOtp((prevOtp) => [...prevOtp.slice(0, index - 1), "", ...prevOtp.slice(index)]);
                inputRefs.current[index - 1]?.focus();
            }
        }
        else if (e.key === "ArrowLeft" && index > 0) {
            e.preventDefault();
            inputRefs.current[index - 1]?.focus();
        }
        else if (e.key === "ArrowRight" && index < otp.length - 1) {
            e.preventDefault();
            inputRefs.current[index + 1]?.focus();
        }
    };
    const handleInput = (e, index) => {
        const { target } = e;
        const val = target.value;
        if (val) {
            const digit = val.slice(-1);
            setOtp((prevOtp) => [...prevOtp.slice(0, index), digit, ...prevOtp.slice(index + 1)]);
            if (index < otp.length - 1) {
                inputRefs.current[index + 1]?.focus();
            }
        }
    };
    const handleFocus = (e) => {
        e.target.select();
    };
    const handlePaste = (e) => {
        e.preventDefault();
        const text = e.clipboardData
            .getData("text")
            .trim()
            .replace(/[^0-9]/g, "");
        if (text.length === digitLength) {
            const digits = text.split("");
            setOtp(digits);
            inputRefs.current[digitLength - 1]?.focus();
        }
    };
    return (<div>
      {label && (<Label id={labelId} className="mb-2 block text-sm font-medium text-text-50">
          {label}
        </Label>)}

      <Group role="group" isInvalid={isInvalid} aria-labelledby={label ? labelId : undefined} aria-describedby={hint || (isInvalid && errorMessage) ? hintId : undefined} aria-label={!label ? "Verification code" : undefined} className="flex items-center gap-2 not-focus-within:text-input-placeholder-text focus-within:text-text-50">
        {otp.map((digit, index) => (<Input key={index} type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="one-time-code" aria-label={`Digit ${index + 1}`} id={index === 0 ? id : undefined} maxLength={1} value={digit} onChange={(e) => handleInput(e, index)} onKeyDown={(e) => handleKeyDown(e, index)} onFocus={handleFocus} onPaste={handlePaste} data-invalid={isInvalid || undefined} aria-invalid={isInvalid || undefined} ref={(el) => {
                inputRefs.current[index] = el;
            }} className={cn("flex size-11 items-center justify-center rounded-lg border bg-input-background p-2 text-center text-base font-normal shadow-xs transition duration-300 focus:ring-4 focus:outline-none disabled:border-base-100 disabled:bg-background-soft-50 disabled:text-input-disabled-text", isInvalid
                ? "border-input-error-focus-border focus:ring-input-error-focus-border/20 data-invalid:border-input-error-focus-border data-invalid:ring-input-error-focus-border/20 data-invalid:focus:ring-input-error-focus-border/20"
                : "border-base-300 focus:border-input-primary-focus-border focus:ring-input-primary-focus-border/20", digit && "text-text-50", className)} style={{
                order: digitLength === 6 && index > 2 ? index + 1 : index,
            }} disabled={disabled} autoFocus={autoFocus && index === 0} {...props}/>))}

        {/* Divider */}
        {digitLength === 6 && (<div className="order-3 mx-2 h-0.5 w-3 shrink-0 rounded-full bg-background-soft-500"/>)}
      </Group>

      {isInvalid && errorMessage ? (<p id={hintId} className="mt-2 text-sm font-normal text-input-error">
          {errorMessage}
        </p>) : (hint && (<Text id={hintId} slot="description" className="mt-2 block text-sm text-text-50">
            {hint}
          </Text>))}
    </div>);
}
