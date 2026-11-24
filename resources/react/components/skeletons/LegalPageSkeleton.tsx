import Skeleton from "../Skeleton";

/** Terms / Privacy: one white card of headed text sections. */
export default function LegalPageSkeleton() {
    return (
        <main
            aria-busy="true"
            aria-label="Loading page"
            className="min-h-screen select-none bg-[#F8FAFC] py-12 sm:py-16"
        >
            <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
                <div className="rounded-3xl border border-[#E7E9EF] bg-white p-6 shadow-sm sm:p-12">
                    <div className="mb-6 flex items-center gap-3">
                        <Skeleton className="h-12 w-12 rounded-2xl" />
                        <div className="flex flex-col gap-2">
                            <Skeleton className="h-5 w-24 rounded-full" />
                            <Skeleton className="h-8 w-56 rounded-lg" />
                        </div>
                    </div>

                    <Skeleton className="mb-8 h-4 w-full rounded" />

                    <div className="space-y-8">
                        {[0, 1, 2, 3].map((section) => (
                            <div key={section}>
                                <Skeleton className="mb-3 h-5 w-48 rounded-lg" />
                                <Skeleton className="h-4 w-full rounded" />
                                <Skeleton className="mt-2 h-4 w-full rounded" />
                                <Skeleton className="mt-2 h-4 w-3/4 rounded" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </main>
    );
}
