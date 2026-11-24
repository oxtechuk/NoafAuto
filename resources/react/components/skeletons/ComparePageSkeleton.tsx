import Skeleton from "../Skeleton";
import DarkBannerSkeleton from "./DarkBannerSkeleton";
import CompareCarCardSkeleton from "./CompareCarCardSkeleton";

export default function ComparePageSkeleton() {
    return (
        <main
            aria-busy="true"
            aria-label="Loading compare page"
            className="min-h-screen select-none bg-[#F3F4F6]"
        >
            <DarkBannerSkeleton withDescription />

            <div className="px-6 py-12">
                <div className="mx-auto grid max-w-[960px] grid-cols-1 items-start gap-8 md:grid-cols-2">
                    <CompareCarCardSkeleton />
                    <div className="flex min-h-[300px] w-full flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed border-gray-200 bg-white/60">
                        <Skeleton className="h-[70px] w-[70px] rounded-full" />
                        <Skeleton className="h-4 w-32 rounded-lg" />
                    </div>
                </div>
            </div>
        </main>
    );
}
