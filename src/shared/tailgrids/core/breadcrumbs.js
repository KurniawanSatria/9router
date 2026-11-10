import { cnx as cn } from "@/shared/utils/cn";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
export function Breadcrumbs({ items, className, dividerType = "slash" }) {
    return (<ol className={cn("flex items-center gap-2", dividerType === "dot" && "gap-2", className)}>
      {items.map((item, index) => (<li key={`${item.href}-${index}`} className="contents text-text-tertiary [&_svg]:text-current!">
          {index > 0 && <Divider type={dividerType}/>}

          <Link href={item.href} className={cn("flex items-center gap-1 text-sm font-medium [&>svg]:size-4", index + 1 === items.length && "text-text-primary")}>
            {item.icon}

            {item.label}
          </Link>
        </li>))}
    </ol>);
}
function Divider({ type }) {
    switch (type) {
        case "chevron":
            return <ChevronRight className="size-4"/>;
        case "dot":
            return <span className="size-1 rounded-full bg-text-200"/>;
        default:
            return <span>/</span>;
    }
}
