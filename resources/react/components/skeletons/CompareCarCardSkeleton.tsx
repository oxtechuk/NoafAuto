import Skeleton from "../Skeleton";

/** Same footprint as compare/CompareCarCard, so the slot doesn't jump when the car arrives. */
export default function CompareCarCardSkeleton() {
    return (
        <div
            aria-busy="true"
            className="mx-auto flex w-full max-w-[480px] flex-col gap-4 rounded-[24px] border border-white/10 bg-[#0B1736] p-5 shadow-xl sm:rounded-[28px] sm:p-6"
        >
            <Skeleton tone="dark" className="h-[210px] w-full rounded-2xl sm:h-[230px]" />

            <div className="flex flex-col items-start gap-2">
                <Skeleton tone="dark" className="h-4 w-24 rounded-lg" />
                <Skeleton tone="dark" className="h-7 w-3/4 rounded-lg" />
            </div>

            <div className="grid grid-cols-3 gap-3">
                <Skeleton tone="dark" className="h-[72px] rounded-2xl sm:h-[80px]" />
                <Skeleton tone="dark" className="h-[72px] rounded-2xl sm:h-[80px]" />
                <Skeleton tone="dark" className="h-[72px] rounded-2xl sm:h-[80px]" />
            </div>
        </div>
    );
}
