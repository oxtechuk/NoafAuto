import type { ILoadingSlotProps } from "../../interfaces/ILoadingSlotProps";
import CompareCarCardSkeleton from "../skeletons/CompareCarCardSkeleton";

export default function LoadingSlot({}: ILoadingSlotProps) {
  return <CompareCarCardSkeleton />;
}
