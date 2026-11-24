import Skeleton from "../Skeleton";
import DarkBannerSkeleton from "./DarkBannerSkeleton";

export default function FinanceCalculatorPageSkeleton() {
    return (
        <main
            aria-busy="true"
            aria-label="Loading finance calculator"
            className="min-h-screen w-full select-none bg-[#F3F4F6]"
        >
            <DarkBannerSkeleton />

            <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
                {/* Stepper */}
                <div className="mx-auto mb-8 flex max-w-xl items-center justify-center gap-4">
                    {[0, 1, 2].map((step) => (
                        <div key={step} className="flex items-center gap-2">
                            <Skeleton className="h-9 w-9 rounded-full" />
                            <Skeleton className="hidden h-4 w-20 rounded sm:block" />
                        </div>
                    ))}
                </div>

                {/* Step form card */}
                <div className="mx-auto w-full max-w-3xl rounded-[24px] border border-[#E5E9F0] bg-white px-6 py-8 shadow-sm md:px-10">
                    <Skeleton className="h-6 w-40 rounded-lg" />
                    <Skeleton className="mt-2 h-4 w-56 rounded-lg" />

                    <div className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-2">
                        {[0, 1, 2, 3].map((field) => (
                            <div key={field}>
                                <Skeleton className="mb-2 h-4 w-24 rounded" />
                                <Skeleton className="h-[50px] w-full rounded-xl" />
                            </div>
                        ))}
                    </div>

                    <Skeleton className="mt-8 h-[52px] w-full rounded-xl" />
                </div>
            </div>
        </main>
    );
}
