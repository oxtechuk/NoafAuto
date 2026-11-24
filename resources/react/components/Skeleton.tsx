interface ISkeletonProps {
  className?: string;
  /** "dark" = for placeholders sitting on navy banners/cards. */
  tone?: "light" | "dark";
}

export default function Skeleton({ className = "", tone = "light" }: ISkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={`skeleton ${tone === "dark" ? "skeleton-dark" : ""} ${className}`}
    />
  );
}
