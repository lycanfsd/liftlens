import { PageHeader } from "@/components/page-header";
import { WeakPointBuilder } from "@/components/weak-point-builder";

export default function WeakPointsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Weak-point builder"
        title="Add focused work without overcomplicating the week."
        copy="Pick one weak point and get two accessories, a frequency target, common mistakes, and one metric to track."
      />
      <WeakPointBuilder />
    </>
  );
}
