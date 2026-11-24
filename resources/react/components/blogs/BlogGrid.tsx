import { useTranslation } from "react-i18next";
import BlogCard from "./BlogCard";
import BlogCardSkeleton from "../skeletons/BlogCardSkeleton";
import type { IBlogGridProps } from "../../interfaces/IBlogGridProps";

export default function BlogGrid({ articles, isLoading }: IBlogGridProps) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div aria-busy="true" className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <BlogCardSkeleton key={index} />
        ))}
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="py-24 text-center">
        <p className="text-lg font-medium text-gray-400">
          {t("blogPage.noArticles", { defaultValue: "لا توجد مقالات متوفرة حالياً." })}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
      {articles.map((article, idx) => (
        <BlogCard key={article.id} {...article} loading={idx < 3 ? "eager" : "lazy"} />
      ))}
    </div>
  );
}
