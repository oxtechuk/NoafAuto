import Skeleton from "../Skeleton";

interface IDarkBannerSkeletonProps {
    withDescription?: boolean;
}

/** Placeholder for the navy page banner used by Compare / Finance calculator. */
export default function DarkBannerSkeleton({ withDescription = false }: IDarkBannerSkeletonProps) {
    return (
        <section className="w-full bg-[#0F172A] py-14">
            <div className="mx-auto flex max-w-7xl flex-col items-center px-4 sm:px-6 lg:px-8">
                <Skeleton tone="dark" className="mb-3 h-4 w-28 rounded-lg" />
                <Skeleton tone="dark" className="h-10 w-64 rounded-xl md:w-80" />
                {withDescription && (
                    <Skeleton tone="dark" className="mt-4 h-4 w-full max-w-md rounded-lg" />
                )}
            </div>
        </section>
    );
}
