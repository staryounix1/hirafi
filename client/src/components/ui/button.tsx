import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// أزرار «حِرْفي» بأسلوب inDrive: حبّية (pill)، ارتفاع كبير لهدف لمس واضح،
// واللون الأساسي هو الأخضر الليموني بنصّ أسود — لا تدرّجات ولا ظلال ثقيلة.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-[15px] font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-brand text-brand-ink hover:bg-brand-dark active:bg-brand-dark",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "bg-background text-foreground ring-1 ring-inset ring-input hover:bg-muted",
        secondary: "bg-secondary text-secondary-foreground hover:bg-muted",
        ghost: "text-foreground hover:bg-muted",
        link: "text-foreground underline underline-offset-4 hover:no-underline",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-4 text-[13px]",
        lg: "h-13 px-6 text-[16px]",
        icon: "size-11",
        "icon-sm": "size-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

// React 19 shadcn style: plain function + data-slot, no forwardRef.
function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
