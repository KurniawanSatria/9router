"use client";

import { cnx } from "@/shared/utils/cn";
import Icon from "@/shared/components/Icon";

export default function Card({
  children,
  title,
  subtitle,
  icon,
  action,
  padding = "md",
  hover = false,
  elev = false,
  className,
  ...props
}) {
  const paddings = {
    none: "",
    xs: "p-3",
    sm: "p-4",
    md: "p-5",
    lg: "p-8",
  };

  return (
    <div
      className={cnx(
        "rounded-xl border-[0.5px] border-card-border bg-card-background",
        elev && "shadow-[var(--shadow-elev)]",
        hover && "hover:border-primary-500/30 hover:shadow-[var(--shadow-warm)] transition-all cursor-pointer",
        paddings[padding],
        className
      )}
      {...props}
    >
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {icon && (
              <div className="flex items-center justify-center size-8 rounded-lg bg-background-soft-50 border border-card-border text-text-secondary">
                <Icon name={icon} className="size-4.5" />
              </div>
            )}
            <div>
              {title && (
                <h3 className="text-base font-semibold text-text-primary">{title}</h3>
              )}
              {subtitle && (
                <p className="text-sm text-text-secondary">{subtitle}</p>
              )}
            </div>
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

Card.Section = function CardSection({ children, className, ...props }) {
  return (
    <div
      className={cnx(
        "p-4 rounded-lg",
        "bg-background-soft-50 border border-card-border",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

Card.Row = function CardRow({ children, className, ...props }) {
  return (
    <div
      className={cnx(
        "p-3 -mx-3 px-3 transition-colors",
        "border-b border-card-border last:border-b-0",
        "hover:bg-background-gray-primary",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};

Card.ListItem = function CardListItem({
  children,
  actions,
  className,
  ...props
}) {
  return (
    <div
      className={cnx(
        "group flex items-center justify-between p-3 -mx-3 px-3",
        "border-b border-card-border last:border-b-0",
        "hover:bg-background-gray-primary transition-colors",
        className
      )}
      {...props}
    >
      <div className="flex-1 min-w-0">{children}</div>
      {actions && (
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {actions}
        </div>
      )}
    </div>
  );
};
