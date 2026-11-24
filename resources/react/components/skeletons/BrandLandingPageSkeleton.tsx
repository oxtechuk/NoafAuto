import Skeleton from "../Skeleton";
import CarsGridSkeleton from "./CarsGridSkeleton";

export default function BrandLandingPageSkeleton() {
    return (
        <main
            aria-busy="true"
            aria-label="Loading brand page"
            className="min-h-screen select-none bg-[#F8FAFC] pb-20"
        >
            <section className="bg-gradient-to-b from-[#16254F] to-[#0F1E36] px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
                <div className="mx-auto max-w-7xl">
                    <Skeleton tone="dark" className="mb-6 h-4 w-48 rounded-lg" />
                    <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
                        <div className="w-full max-w-2xl">
                            <Skeleton tone="dark" className="mb-3 h-6 w-32 rounded-full" />
                            <Skeleton tone="dark" className="h-10 w-full max-w-md rounded-xl sm:h-12" />
                            <Skeleton tone="dark" className="mt-4 h-4 w-full rounded-lg" />
                            <Skeleton tone="dark" className="mt-2 h-4 w-2/3 rounded-lg" />
                        </div>
                        <Skeleton tone="dark" className="h-24 w-32 shrink-0 rounded-2xl" />
                    </div>
                </div>
            </section>

            <section className="mx-auto -mt-6 max-w-7xl px-4 sm:px-6 lg:px-8">
                <div className="mb-8 flex items-center justify-between rounded-2xl border border-[#E7E9EF] bg-white p-6 shadow-sm">
                    <Skeleton className="h-5 w-40 rounded-lg" />
                    <Skeleton className="h-5 w-36 rounded-lg" />
                </div>
                <CarsGridSkeleton />
            </section>
        </main>
    );
}
