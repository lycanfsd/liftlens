import { CoachChat } from "@/components/coach-chat";
import { PageHeader } from "@/components/page-header";

export default function CoachPage() {
  return (
    <>
      <PageHeader
        eyebrow="AI coach"
        title="Ask for the version of the plan that fits today."
        copy="The MVP uses local coaching responses with an API route ready for OpenAI. Ask about short sessions, soreness, meals, or a packed gym."
      />
      <CoachChat />
    </>
  );
}
