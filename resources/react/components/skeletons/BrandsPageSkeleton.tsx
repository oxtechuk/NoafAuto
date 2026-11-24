import Skeleton from "../Skeleton";
import BrandCardsGridSkeleton from "./BrandCardsGridSkeleton";

export default function BrandsPageSkeleton() {
    return (
        <section
            aria-busy="true"
            aria-label="Loading brands"
            className="w-full select-none bg-[#F0F2F5] py-16"
        >
            <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mb-10">
                    <Skeleton className="h-10 w-64 rounded-xl md:w-80" />
                    <Skeleton className="mt-4 h-4 w-full max-w-2xl rounded-lg" />
                    <Skeleton className="mt-2 h-4 w-2/3 max-w-xl rounded-lg" />
                </div>

                <Skeleton className="mb-12 h-[52px] w-full max-w-xl rounded-2xl" />

                <BrandCardsGridSkeleton />
            </div>
        </section>
    );
}
