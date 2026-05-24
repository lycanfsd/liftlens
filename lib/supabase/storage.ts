export const FORM_VIDEO_BUCKET = "form-videos";

export function buildFormVideoStoragePath(
  userId: string,
  exercise: string,
  extension: string,
  timestamp = Date.now()
) {
  const safeExercise = exercise
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  const safeExtension = extension
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 8);

  return `${userId}/${timestamp}-${safeExercise || "exercise"}.${safeExtension || "mp4"}`;
}
