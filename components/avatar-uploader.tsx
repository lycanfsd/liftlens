"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Loader2, Trash2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getIdentityInitials } from "@/components/user-avatar";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

function getFileExtension(file: File) {
  const nameExtension = file.name.split(".").pop()?.toLowerCase();
  if (nameExtension && /^[a-z0-9]+$/.test(nameExtension)) {
    return nameExtension;
  }

  return file.type.split("/")[1] ?? "jpg";
}

function getStoragePathFromPublicUrl(url: string | null) {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const marker = "/object/public/avatars/";
    const markerIndex = parsed.pathname.indexOf(marker);
    if (markerIndex === -1) return null;
    return decodeURIComponent(parsed.pathname.slice(markerIndex + marker.length));
  } catch {
    return null;
  }
}

export function AvatarUploader({
  userId,
  email,
  displayName,
  initialAvatarUrl
}: {
  userId: string | null;
  email: string;
  displayName: string;
  initialAvatarUrl: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const visibleAvatar = previewUrl ?? avatarUrl;
  const hasSavedAvatar = Boolean(avatarUrl);
  const initials = getIdentityInitials({
    userId,
    email,
    displayName,
    avatarUrl,
    planType: "Free"
  });

  function openFilePicker() {
    inputRef.current?.click();
  }

  function validateFile(file: File) {
    if (!file.type.startsWith("image/")) {
      return "Choose an image file like JPG, PNG, or WebP.";
    }

    if (file.size > MAX_AVATAR_SIZE) {
      return "Keep profile pictures under 5MB.";
    }

    return null;
  }

  function handleUpload(file: File) {
    const validationError = validateFile(file);
    setMessage(null);
    setError(null);

    if (validationError) {
      setError(validationError);
      return;
    }

    if (!isSupabaseConfigured || !userId) {
      setError("Connect Supabase and log in before uploading an avatar.");
      return;
    }

    const nextPreview = URL.createObjectURL(file);
    setPreviewUrl((currentPreview) => {
      if (currentPreview) URL.revokeObjectURL(currentPreview);
      return nextPreview;
    });

    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const extension = getFileExtension(file);
      const path = `${userId}/avatar-${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, {
        cacheControl: "3600",
        contentType: file.type,
        upsert: false
      });

      if (uploadError) {
        URL.revokeObjectURL(nextPreview);
        setPreviewUrl(null);
        setError(`Avatar upload failed: ${uploadError.message}`);
        return;
      }

      const {
        data: { publicUrl }
      } = supabase.storage.from("avatars").getPublicUrl(path);

      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          user_id: userId,
          email,
          avatar_url: publicUrl,
          updated_at: new Date().toISOString()
        },
        { onConflict: "user_id" }
      );

      if (profileError) {
        await supabase.storage.from("avatars").remove([path]);
        URL.revokeObjectURL(nextPreview);
        setPreviewUrl(null);
        setError(`Avatar saved to storage, but profile update failed: ${profileError.message}`);
        return;
      }

      const previousPath = getStoragePathFromPublicUrl(avatarUrl);
      if (previousPath && previousPath !== path) {
        await supabase.storage.from("avatars").remove([previousPath]);
      }

      URL.revokeObjectURL(nextPreview);
      setPreviewUrl(null);
      setAvatarUrl(publicUrl);
      setMessage("Profile photo updated.");
      router.refresh();
    });
  }

  function removeAvatar() {
    setMessage(null);
    setError(null);

    if (!isSupabaseConfigured || !userId) {
      setAvatarUrl(null);
      setPreviewUrl(null);
      setMessage("Avatar removed for this demo session.");
      return;
    }

    startTransition(async () => {
      const supabase = createSupabaseBrowserClient();
      const currentPath = getStoragePathFromPublicUrl(avatarUrl);

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          avatar_url: null,
          updated_at: new Date().toISOString()
        })
        .eq("user_id", userId);

      if (profileError) {
        setError(`Could not remove avatar: ${profileError.message}`);
        return;
      }

      if (currentPath) {
        await supabase.storage.from("avatars").remove([currentPath]);
      }

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setAvatarUrl(null);
      setMessage("Profile photo removed. Initials are back.");
      router.refresh();
    });
  }

  return (
    <div className="w-full">
      <div className="flex flex-col items-center gap-3 text-center sm:items-start sm:text-left">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-white">Profile photo</p>
          <p className="max-w-xs text-xs leading-5 text-muted-foreground">
            This photo updates your sidebar and top-right profile menu too.
          </p>
        </div>
        <div
          className={cn(
            "relative grid h-32 w-32 shrink-0 place-items-center overflow-hidden rounded-full border border-white/15 bg-black/35 text-4xl font-black text-white shadow-green ring-4 ring-primary/10",
            !visibleAvatar && "bg-primary text-primary-foreground"
          )}
        >
          {visibleAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={visibleAvatar} alt="Profile avatar preview" className="h-full w-full object-cover" />
          ) : (
            initials
          )}
          {isPending ? (
            <div className="absolute inset-0 grid place-items-center bg-black/55">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : null}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) handleUpload(file);
          }}
        />

        <div className="grid w-full gap-2 sm:max-w-44">
          <Button type="button" onClick={openFilePicker} disabled={isPending}>
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {isPending ? "Uploading..." : "Change photo"}
          </Button>
          <Button type="button" variant="outline" onClick={removeAvatar} disabled={isPending || !hasSavedAvatar}>
            <Trash2 className="h-4 w-4" />
            Remove photo
          </Button>
        </div>

        <p className="max-w-xs text-xs leading-5 text-muted-foreground">
          JPG, PNG, WebP, or GIF. Max 5MB.
        </p>
      </div>

      {message ? (
        <div className="mt-4 rounded-2xl border border-primary/25 bg-primary/10 p-3 text-sm font-medium text-primary">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="mt-4 rounded-2xl border border-destructive/25 bg-destructive/10 p-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}
    </div>
  );
}
