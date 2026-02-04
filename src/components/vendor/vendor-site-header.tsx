import { IconBell, IconPlus } from "@tabler/icons-react";
import { Link } from "@tanstack/react-router";

import { Button } from "~/components/ui/button";
import { Separator } from "~/components/ui/separator";
import { SidebarTrigger } from "~/components/ui/sidebar";
import { Can } from "~/shared/components/can";

interface VendorSiteHeaderProps {
  title?: string;
}

export function VendorSiteHeader({
  title = "Dashboard",
}: VendorSiteHeaderProps) {
  return (
    <header className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)">
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ms-1" />
        <Separator
          className="mx-2 data-[orientation=vertical]:h-4"
          orientation="vertical"
        />
        <h1 className="font-medium text-base">{title}</h1>
        <div className="ms-auto flex items-center gap-2">
          <Button className="relative" size="icon" variant="ghost">
            <IconBell className="size-5" />
            <span className="absolute -end-0.5 -top-0.5 flex size-4 items-center justify-center rounded-full bg-primary font-medium text-[10px] text-primary-foreground">
              3
            </span>
            <span className="sr-only">Notifications</span>
          </Button>
          <Can a="Product" I="create">
            <Button asChild className="hidden sm:flex" size="sm">
              <Link to="/v/products">
                <IconPlus className="size-4" />
                <span>Add Product</span>
              </Link>
            </Button>
          </Can>
        </div>
      </div>
    </header>
  );
}
