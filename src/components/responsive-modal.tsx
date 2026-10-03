"use client";

import { useMediaQuery } from "@/hooks/use-media-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

/**
 * Bottom sheet on phones, centered dialog from `sm` up. Both trap focus, close on Escape,
 * and lock background scroll (iOS included). Pass `dismissible={false}` to pin it open.
 */
export function ResponsiveModal({
  open,
  onOpenChange,
  dismissible = true,
  title,
  titleRef,
  description,
  children,
  footer,
  onCloseAutoFocus,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dismissible?: boolean;
  title: React.ReactNode;
  /** Receives focus on open, so screen readers start from the title. */
  titleRef?: React.Ref<HTMLHeadingElement>;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Where focus goes back to on close; call `preventDefault()` to override Radix's default. */
  onCloseAutoFocus?: (e: Event) => void;
}) {
  const desktop = useMediaQuery("(min-width: 640px)");

  function handleOpenChange(next: boolean) {
    if (!next && !dismissible) return;
    onOpenChange(next);
  }

  function focusTitle(e: Event) {
    e.preventDefault();
    if (titleRef && "current" in titleRef) titleRef.current?.focus({ preventScroll: true });
  }

  const titleClass = "font-display text-2xl uppercase tracking-wide text-zinc-50 outline-none";
  const descriptionClass = cn("text-zinc-400", !description && "sr-only");

  if (desktop) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          showCloseButton={dismissible}
          onOpenAutoFocus={focusTitle}
          onCloseAutoFocus={onCloseAutoFocus}
          className="flex max-h-[85dvh] flex-col gap-0 overflow-hidden border-zinc-800 bg-zinc-900 p-0 text-zinc-100 sm:max-w-md"
        >
          <DialogHeader className="gap-1 p-5 pb-2 pr-12">
            <DialogTitle ref={titleRef} tabIndex={-1} className={cn(titleClass, "leading-tight")}>
              {title}
            </DialogTitle>
            <DialogDescription className={descriptionClass}>{description ?? title}</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5 pt-1">{children}</div>
          {footer && <div className="border-t border-zinc-800 p-5 pt-4">{footer}</div>}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange} dismissible={dismissible}>
      <DrawerContent
        onOpenAutoFocus={focusTitle}
        onCloseAutoFocus={onCloseAutoFocus}
        className="max-h-[90dvh] border-zinc-800 bg-zinc-900 text-zinc-100 data-[vaul-drawer-direction=bottom]:max-h-[90dvh]"
      >
        <DrawerHeader className="gap-1 px-4 pb-2 pt-3">
          <DrawerTitle ref={titleRef} tabIndex={-1} className={titleClass}>
            {title}
          </DrawerTitle>
          <DrawerDescription className={descriptionClass}>{description ?? title}</DrawerDescription>
        </DrawerHeader>
        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pt-1",
            // With no footer, the list itself is the last thing above the iPhone home indicator.
            footer ? "pb-4" : "pb-[max(1.5rem,calc(env(safe-area-inset-bottom)+1rem))]"
          )}
        >
          {children}
        </div>
        {footer && (
          <div className="border-t border-zinc-800 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
            {footer}
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
}
