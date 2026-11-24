import Skeleton from "../Skeleton";

interface ICarListItemSkeletonProps {
    count?: number;
}

/** Rows for car pickers (compare search, calculator search): thumbnail + two text lines + price. */
export default function CarListItemSkeleton({ count = 4 }: ICarListItemSkeletonProps) {
    return (
        <div aria-busy="true">
            {Array.from({ length: count }).map((_, index) => (
                <div
                    key={index}
                    className="flex items-center gap-3 border-b border-[#EEF2F6] px-4 py-3 last:border-0"
                >
                    <Skeleton className="h-12 w-14 shrink-0 rounded-lg" />
                    <div className="flex flex-1 flex-col gap-2">
                        <Skeleton className="h-3 w-16 rounded" />
                        <Skeleton className="h-4 w-36 rounded" />
                    </div>
                    <Skeleton className="h-4 w-16 rounded" />
                </div>
            ))}
        </div>
    );
}
