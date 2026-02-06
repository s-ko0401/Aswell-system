import { cn } from "@/lib/utils";

interface LoadingBarProps {
  className?: string;
  isLoading?: boolean;
}

export function LoadingBar({ className, isLoading }: LoadingBarProps) {
  return (
    <div
      className={cn(
        "h-[1px] w-full bg-secondary overflow-hidden -mt-[1px] rounded-full",
        isLoading ? "" : "hidden",
        className,
      )}
    >
      <div className="h-full w-full bg-primary origin-left animate-indeterminate-bar" />
    </div>
  );
}
