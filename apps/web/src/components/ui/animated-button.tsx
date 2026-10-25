import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva } from "class-variance-authority";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { cn } from "cn";

const exportButtonVariants = cva(
  "group/button relative isolate inline-flex h-10 shrink-0 items-center justify-center gap-2 overflow-hidden rounded-4xl border border-transparent bg-primary bg-clip-padding px-5 text-sm font-medium whitespace-nowrap text-primary-foreground shadow-sm shadow-primary/20 transition-[background-color,box-shadow] duration-200 outline-none select-none hover:bg-primary/90 hover:shadow-md hover:shadow-primary/30 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0",
);

const arrowVariants: Variants = {
  rest: { y: 0, opacity: 1 },
  hover: {
    y: [0, 7, -7, 0],
    opacity: [1, 0, 0, 1],
    transition: {
      duration: 0.65,
      times: [0, 0.4, 0.5, 1],
      ease: ["easeIn", "linear", "easeOut"],
    },
  },
};

const shineVariants: Variants = {
  rest: {
    x: "-150%",
    opacity: 0,
    transition: {
      opacity: { duration: 0.15 },
      x: { duration: 0, delay: 0.15 },
    },
  },
  hover: {
    x: "350%",
    opacity: 1,
    transition: {
      x: { duration: 0.75, ease: [0.4, 0, 0.2, 1] },
      opacity: { duration: 0.1 },
    },
  },
};

function ExportIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="size-4"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <motion.g variants={arrowVariants}>
        <path d="M12 3v12" />
        <path d="m7 10 5 5 5-5" />
      </motion.g>
    </svg>
  );
}

function Shine() {
  return (
    <motion.span
      aria-hidden="true"
      variants={shineVariants}
      style={{ skewX: -20 }}
      className="pointer-events-none absolute inset-y-0 left-0 -z-10 w-1/3 bg-linear-to-r from-transparent via-primary-foreground/25 to-transparent"
    />
  );
}

function ExportButton({
  className,
  children = "Export document",
  ...props
}: Omit<ButtonPrimitive.Props, "render">) {
  const reduceMotion = useReducedMotion();

  return (
    <ButtonPrimitive
      data-slot="export-button"
      className={cn(exportButtonVariants({ className }))}
      render={
        <motion.button
          initial="rest"
          animate="rest"
          whileHover={reduceMotion ? undefined : "hover"}
          whileFocus={reduceMotion ? undefined : "hover"}
          whileTap={reduceMotion ? undefined : { scale: 0.97 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      }
      {...props}
    >
      <ExportIcon />
      <span>{children}</span>
      <Shine />
    </ButtonPrimitive>
  );
}

export { ExportButton };
