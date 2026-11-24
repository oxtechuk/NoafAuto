import Skeleton from "../Skeleton";

interface IBrandCardsGridSkeletonProps {
    count?: number;
}

/** Same grid + card size as BrandsPage / BrandCard. */
export default function BrandCardsGridSkeleton({ count = 10 }: IBrandCardsGridSkeletonProps) {
    return (
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:grid-cols-5">
            {Array.from({ length: count }).map((_, index) => (
                <div
                    key={index}
                    className="flex h-[150px] w-full flex-col items-center justify-center rounded-[16px] bg-white px-6 shadow-sm"
                >
                    <Skeleton className="h-[52px] w-20 rounded-lg" />
                    <Skeleton className="mt-5 h-5 w-24 rounded-lg" />
                </div>
            ))}
        </div>
    );
}
