import type { IContactFormValues } from "./IContactFormValues";

export interface IContactUsSectionProps {
  eyebrow: string;
  title: string;
  description: string;
  isSubmitting?: boolean;
  onSubmit?: (values: IContactFormValues) => void;
}
