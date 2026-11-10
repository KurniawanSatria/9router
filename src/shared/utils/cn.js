// Utility function to merge class names
// Handles conditional classes and removes duplicates

import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...classes) {
  return classes
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

export function cnx(...inputs) {
  return twMerge(clsx(inputs));
}

