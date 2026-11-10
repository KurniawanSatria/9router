"use client";
import { cnx as cn } from "@/shared/utils/cn";
export function Progress({ progress, withLabel, className, trackColor, barColor }) {
    return (<div className={cn("flex max-w-80 items-center gap-3", className)}>
      <div className="relative h-1.5 w-full rounded-full" style={{
            // Fix overflow clipping in Safari
            // https://gist.github.com/domske/b66047671c780a238b51c51ffde8d3a0
            transform: "translateZ(0)",
            backgroundColor: trackColor || "var(--color-border-primary)",
        }} aria-valuemax={100} aria-valuemin={0} aria-valuenow={progress} aria-valuetext={`${progress}%`} role="progressbar">
        <div className="size-full overflow-hidden rounded-full">
          <div className="size-full rounded-full text-center transition-transform duration-300 ease-in-out" style={{
            transform: `translateX(-${100 - progress}%)`,
            backgroundColor: barColor || "var(--color-brand-500)",
        }}/>
        </div>
      </div>

      {withLabel && (<div className="text-sm leading-none font-medium text-text-secondary">{progress}%</div>)}
    </div>);
}
