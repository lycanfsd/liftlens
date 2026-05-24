"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Film,
  Loader2,
  Save,
  ShieldCheck,
  Sparkles,
  Upload,
  Video
} from "lucide-react";

import { EmptyState } from "@/components/empty-state";
import { ProgressRing } from "@/components/progress-ring";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formCoachExercises, type FormCoachAnalysis, type FormCoachExercise } from "@/lib/form-coach";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { FORM_VIDEO_BUCKET, buildFormVideoStoragePath } from "@/lib/supabase/storage";
import { cn, formatDate } from "@/lib/utils";

const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

export type FormCheckHistoryItem = {
  id: string;
  exercise: string;
  formScore: number;
  date: string;
  topCorrection: string;
};

function formatFileSize(size: number) {
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getExerciseLabel(value: FormCoachExercise) {
  return formCoachExercises.find((exercise) => exercise.value === value)?.label ?? "Exercise";
}

function getRecorderMimeType() {
  if (typeof MediaRecorder === "undefined") return "";

  const supportedTypes = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"];
  return supportedTypes.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function waitForVideoEvent(video: HTMLVideoElement, eventName: "loadedmetadata" | "seeked") {
  return new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("Video frame extraction timed out."));
    }, 7000);

    function cleanup() {
      window.clearTimeout(timeout);
      video.removeEventListener(eventName, handleEvent);
      video.removeEventListener("error", handleError);
    }

    function handleEvent() {
      cleanup();
      resolve();
    }

    function handleError() {
      cleanup();
      reject(new Error("Video could not be loaded for frame extraction."));
    }

    video.addEventListener(eventName, handleEvent, { once: true });
    video.addEventListener("error", handleError, { once: true });
  });
}

async function extractKeyFramesFromVideo(file: File) {
  const objectUrl = URL.createObjectURL(file);
  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = objectUrl;

  try {
    await waitForVideoEvent(video, "loadedmetadata");

    if (!video.videoWidth || !video.videoHeight) {
      throw new Error("Video frames were not readable.");
    }

    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 1;
    const frameTimes = [0.12, 0.35, 0.6, 0.85].map((position) =>
      Math.min(Math.max(duration * position, 0), Math.max(duration - 0.05, 0))
    );
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Your browser could not prepare video frames.");
    }

    const maxSide = 768;
    const scale = Math.min(1, maxSide / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
    canvas.height = Math.max(1, Math.round(video.videoHeight * scale));

    const frames: string[] = [];

    for (const time of frameTimes) {
      video.currentTime = time;
      await waitForVideoEvent(video, "seeked");
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      frames.push(canvas.toDataURL("image/jpeg", 0.76));
    }

    return frames;
  } finally {
    URL.revokeObjectURL(objectUrl);
    video.removeAttribute("src");
    video.load();
  }
}

function getVideoFileExtension(file: File) {
  const nameExtension = file.name.split(".").pop()?.toLowerCase();
  if (nameExtension && /^[a-z0-9]+$/.test(nameExtension)) {
    return nameExtension;
  }

  const mimeExtension = file.type.split("/")[1]?.toLowerCase();
  if (mimeExtension === "quicktime") return "mov";
  if (mimeExtension && /^[a-z0-9]+$/.test(mimeExtension)) return mimeExtension;

  return "mp4";
}

function isMissingFormVideoBucketError(message: string) {
  const normalized = message.toLowerCase();
  return normalized.includes("bucket not found") || (normalized.includes("bucket") && normalized.includes("not found"));
}

function ResultList({
  title,
  items,
  icon: Icon,
  tone = "default"
}: {
  title: string;
  items: string[];
  icon: typeof CheckCircle2;
  tone?: "default" | "warning" | "good";
}) {
  return (
    <Card className={cn(tone === "warning" && "border-amber-400/20 bg-amber-400/10")}>
      <CardContent className="p-5">
        <div className="flex items-center gap-2">
          <Icon
            className={cn(
              "h-5 w-5 text-primary",
              tone === "warning" && "text-amber-300",
              tone === "good" && "text-primary"
            )}
          />
          <h3 className="font-semibold text-white">{title}</h3>
        </div>
        <ul className="mt-4 space-y-3">
          {items.map((item) => (
            <li key={item} className="flex gap-3 text-sm leading-6 text-muted-foreground">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function FormCoachClient({
  initialHistory,
  demoMode
}: {
  initialHistory: FormCheckHistoryItem[];
  demoMode: boolean;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraPreviewRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const previewUrlRef = useRef<string | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<FormCoachExercise>("squat");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<FormCoachAnalysis | null>(null);
  const [history, setHistory] = useState(initialHistory);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [savedCheckId, setSavedCheckId] = useState<string | null>(null);
  const [uploadedVideoPath, setUploadedVideoPath] = useState<string | null>(null);
  const [canRecord, setCanRecord] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isAnalyzing, startAnalyzeTransition] = useTransition();
  const [isSaving, startSaveTransition] = useTransition();

  const selectedExerciseLabel = useMemo(() => getExerciseLabel(selectedExercise), [selectedExercise]);

  useEffect(() => {
    setCanRecord(Boolean(navigator.mediaDevices?.getUserMedia) && typeof MediaRecorder !== "undefined");

    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  useEffect(() => {
    if (cameraPreviewRef.current && cameraStreamRef.current) {
      cameraPreviewRef.current.srcObject = cameraStreamRef.current;
    }
  }, [isRecording]);

  function resetResultState() {
    setAnalysis(null);
    setSavedCheckId(null);
    setUploadedVideoPath(null);
    setMessage(null);
  }

  function setNextPreviewUrl(file: File) {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    const nextUrl = URL.createObjectURL(file);
    previewUrlRef.current = nextUrl;
    setPreviewUrl(nextUrl);
  }

  function validateVideo(file: File) {
    if (!file.type.startsWith("video/")) {
      return "Choose a video file so FlexFit can analyze the set.";
    }

    if (file.size > MAX_VIDEO_SIZE) {
      return `Keep form videos under 50MB. This one is ${formatFileSize(file.size)}.`;
    }

    return null;
  }

  function handleVideoFile(file: File) {
    const validationError = validateVideo(file);
    setError(null);
    resetResultState();

    if (validationError) {
      setError(validationError);
      return;
    }

    setVideoFile(file);
    setNextPreviewUrl(file);
  }

  async function startRecording() {
    setError(null);
    setMessage(null);

    if (!canRecord) {
      setError("Recording is not available in this browser. Upload a short video instead.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false
      });
      const mimeType = getRecorderMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);

      chunksRef.current = [];
      cameraStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      setIsRecording(true);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const blobType = recorder.mimeType || "video/webm";
        const blob = new Blob(chunksRef.current, { type: blobType });
        const file = new File([blob], `flexfit-form-${Date.now()}.webm`, { type: blobType });
        stream.getTracks().forEach((track) => track.stop());
        cameraStreamRef.current = null;
        mediaRecorderRef.current = null;
        setIsRecording(false);
        handleVideoFile(file);
      };

      recorder.start();
    } catch {
      setError("We could not open the camera. Check browser permissions or upload a video instead.");
      cameraStreamRef.current?.getTracks().forEach((track) => track.stop());
      cameraStreamRef.current = null;
      setIsRecording(false);
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
    }
  }

  function analyzeForm() {
    setError(null);
    setMessage(null);

    if (!videoFile) {
      setError("Upload or record a short set before analyzing form.");
      return;
    }

    startAnalyzeTransition(async () => {
      try {
        setMessage("Extracting key frames from your set...");
        const frames = await extractKeyFramesFromVideo(videoFile);

        if (frames.length < 3) {
          setError("We could not extract enough clear frames. Try a shorter clip from a side or front angle.");
          setMessage(null);
          return;
        }

        setMessage("Sending key frames to FlexFit vision analysis...");
        const response = await fetch("/api/form-coach/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ exercise: selectedExercise, frames })
        });
        const payload = (await response.json()) as { analysis?: FormCoachAnalysis; error?: string };

        if (!response.ok || !payload.analysis) {
          setError(payload.error ?? "Form analysis is temporarily unavailable.");
          return;
        }

        setAnalysis(payload.analysis);
        setSavedCheckId(null);
        setMessage("Analysis ready. Review the cues before your next set.");
      } catch (analysisError) {
        setError(
          analysisError instanceof Error
            ? `Form analysis could not start: ${analysisError.message}`
            : "Form analysis could not start. Check your connection and try again."
        );
        setMessage(null);
      }
    });
  }

  function saveAnalysis() {
    if (!analysis) return;

    setError(null);
    setMessage(null);

    if (savedCheckId) {
      setMessage("This form check is already saved.");
      return;
    }

    if (demoMode || !isSupabaseConfigured) {
      const demoId = `demo-${Date.now()}`;
      setSavedCheckId(demoId);
      setHistory((current) => [
        {
          id: demoId,
          exercise: selectedExerciseLabel,
          formScore: analysis.formScore,
          date: new Date().toISOString(),
          topCorrection: analysis.corrections[0] ?? "Keep the next set smooth and controlled."
        },
        ...current
      ]);
      setMessage("Saved in demo mode. Connect Supabase to persist form checks and videos.");
      return;
    }

    startSaveTransition(async () => {
      try {
        const supabase = createSupabaseBrowserClient();
        const {
          data: { user },
          error: userError
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setError("Log in again before saving a form check.");
          return;
        }

        let videoPath = uploadedVideoPath;

        if (videoFile && !videoPath) {
          const extension = getVideoFileExtension(videoFile);
          const path = buildFormVideoStoragePath(user.id, analysis.exercise, extension);

          if (!path.startsWith(`${user.id}/`)) {
            setError("Video upload could not start because the storage path did not match your account.");
            return;
          }

          const { error: uploadError } = await supabase.storage.from(FORM_VIDEO_BUCKET).upload(path, videoFile, {
            cacheControl: "3600",
            contentType: videoFile.type || "video/mp4",
            upsert: false
          });

          if (uploadError) {
            if (!isMissingFormVideoBucketError(uploadError.message)) {
              setError(`Video upload failed: ${uploadError.message}`);
              return;
            }

            videoPath = null;
            setError(
              `Video was not uploaded because the Supabase Storage bucket "${FORM_VIDEO_BUCKET}" was not found. Create that bucket or run supabase/schema.sql, then future videos will save normally.`
            );
          } else {
            videoPath = path;
            setUploadedVideoPath(path);
          }
        }

        const { data, error: insertError } = await supabase
          .from("form_checks")
          .insert({
            user_id: user.id,
            exercise: analysis.exercise,
            video_url: videoPath,
            form_score: analysis.formScore,
            positives: analysis.positives,
            corrections: analysis.corrections,
            safety_warnings: analysis.safetyWarnings,
            next_cues: analysis.nextCues
          })
          .select("id, created_at")
          .single();

        if (insertError || !data) {
          setError(`We could not save that form check yet: ${insertError?.message ?? "Unknown error"}`);
          return;
        }

        setSavedCheckId(data.id);
        setHistory((current) => [
          {
            id: data.id,
            exercise: selectedExerciseLabel,
            formScore: analysis.formScore,
            date: data.created_at,
            topCorrection: analysis.corrections[0] ?? "Keep the next set smooth and controlled."
          },
          ...current
        ]);
        setMessage(
          videoPath
            ? "Form check saved. Your next set has a clearer target."
            : "Form check saved without a video attachment."
        );
      } catch (saveError) {
        setError(
          saveError instanceof Error
            ? `Form check could not be saved: ${saveError.message}`
            : "Form check could not be saved. Please try again."
        );
      }
    });
  }

  return (
    <div className="space-y-6">
      <Card className="border-amber-400/20 bg-amber-400/10">
        <CardContent className="flex gap-3 p-4">
          <ShieldCheck className="mt-1 h-5 w-5 shrink-0 text-amber-300" />
          <p className="text-sm leading-6 text-amber-50/90">
            FlexFit Form Coach is educational and not a medical diagnosis. Stop if you feel sharp pain,
            dizziness, chest pain, or symptoms of injury. For injury concerns, consult a qualified clinician
            or coach.
          </p>
        </CardContent>
      </Card>

      {message ? (
        <div className="rounded-2xl border border-primary/25 bg-primary/10 p-4 text-sm font-medium text-primary">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-2xl border border-destructive/25 bg-destructive/10 p-4 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="h-5 w-5" />
              <span className="text-sm font-semibold">Exercise selector</span>
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-white">Choose the lift you filmed.</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Feedback is exercise-specific today, with a clean path for future video-frame analysis.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {formCoachExercises.map((exercise) => {
                const active = selectedExercise === exercise.value;
                return (
                  <button
                    key={exercise.value}
                    type="button"
                    onClick={() => {
                      setSelectedExercise(exercise.value);
                      resetResultState();
                    }}
                    className={cn(
                      "rounded-2xl border border-white/10 bg-white/[0.035] p-4 text-left text-sm font-semibold text-white transition hover:border-primary/45 hover:bg-white/[0.06]",
                      active && "border-primary/70 bg-primary/10 shadow-green"
                    )}
                  >
                    {exercise.label}
                    <span className="mt-2 block text-xs font-medium text-muted-foreground">
                      {active ? "Selected for analysis" : "Tap to select"}
                    </span>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-primary/20 bg-gradient-to-br from-primary/12 via-white/[0.045] to-accent/10">
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center gap-2 text-primary">
              <Camera className="h-5 w-5" />
              <span className="text-sm font-semibold">Video upload / record</span>
            </div>
            <h2 className="mt-4 text-2xl font-semibold text-white">Upload a set. Keep it short and clear.</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Best results: one set, stable phone, whole body in frame, and the weight visible.
            </p>

            <div className="mt-5 rounded-3xl border border-dashed border-white/15 bg-black/25 p-5 text-center">
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  event.target.value = "";
                  if (file) handleVideoFile(file);
                }}
              />
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-primary/15 text-primary">
                <Film className="h-7 w-7" />
              </div>
              <p className="mt-4 font-semibold text-white">
                {videoFile ? videoFile.name : "Add a video for FlexFit to review"}
              </p>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                Video files only. Max 50MB for this MVP.
              </p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Button type="button" onClick={() => fileInputRef.current?.click()}>
                  <Upload className="h-4 w-4" />
                  Upload video
                </Button>
                <Button
                  type="button"
                  variant={isRecording ? "danger" : "outline"}
                  onClick={isRecording ? stopRecording : startRecording}
                  disabled={!canRecord && !isRecording}
                >
                  <Video className="h-4 w-4" />
                  {isRecording ? "Stop recording" : canRecord ? "Record video" : "Recording unavailable"}
                </Button>
              </div>
            </div>

            <Button
              type="button"
              onClick={analyzeForm}
              disabled={isAnalyzing || isRecording || !videoFile}
              className="mt-5 w-full"
            >
              {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {isAnalyzing ? "Analyzing form..." : "Analyze Form"}
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <Card>
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center gap-2 text-primary">
              <Video className="h-5 w-5" />
              <span className="text-sm font-semibold">Video preview</span>
            </div>
            <div className="mt-5 overflow-hidden rounded-3xl border border-white/10 bg-black/35">
              {isRecording ? (
                <video ref={cameraPreviewRef} autoPlay muted playsInline className="aspect-video w-full object-cover" />
              ) : previewUrl ? (
                <video src={previewUrl} controls playsInline className="aspect-video w-full bg-black object-contain" />
              ) : (
                <div className="grid min-h-72 place-items-center p-6">
                  <EmptyState
                    icon={Camera}
                    title="No video selected yet"
                    copy="Upload or record one short set to unlock form feedback."
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 sm:p-6">
            <div className="flex items-center gap-2 text-primary">
              <ShieldCheck className="h-5 w-5" />
              <span className="text-sm font-semibold">What FlexFit checks first</span>
            </div>
            <div className="mt-5 space-y-3">
              {[
                ["Safety", "Pain signals, risky fatigue breakdown, and obvious setup issues."],
                ["Repeatability", "Can the next rep look like the last rep without guessing?"],
                ["Next cue", "One or two memorable cues before your next set, not a lecture."]
              ].map(([title, copy]) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="font-semibold text-white">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {analysis ? (
        <section className="space-y-6">
          <Card className="border-primary/25 bg-gradient-to-br from-primary/14 via-white/[0.05] to-accent/10">
            <CardContent className="flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <Badge className="border-primary/25 bg-primary/10 text-primary">{selectedExerciseLabel}</Badge>
                <h2 className="mt-4 text-3xl font-semibold text-white">Form analysis ready.</h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Use the safety notes and next-set cues before adding weight or chasing more reps.
                </p>
              </div>
              <ProgressRing value={analysis.formScore} label="form score" className="shrink-0" />
            </CardContent>
          </Card>

          <div className="grid gap-4 lg:grid-cols-3">
            <ResultList title="What looked good" items={analysis.positives} icon={CheckCircle2} tone="good" />
            <ResultList title="Fix before next set" items={analysis.corrections} icon={Sparkles} />
            <ResultList title="Safety notes" items={analysis.safetyWarnings} icon={AlertTriangle} tone="warning" />
          </div>

          <div className="grid gap-4 lg:grid-cols-4">
            <ResultList title="Next set cues" items={analysis.nextCues} icon={ShieldCheck} />
            <Card className={cn(analysis.shouldRefilm && "border-amber-400/20 bg-amber-400/10")}>
              <CardContent className="p-5">
                <h3 className="font-semibold text-white">Filming quality</h3>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">{analysis.filmingQuality}</p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{analysis.uncertainty}</p>
                {analysis.shouldRefilm ? (
                  <p className="mt-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3 text-sm font-medium text-amber-100">
                    Re-film from a side or front 45-degree angle before trusting the score.
                  </p>
                ) : null}
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <h3 className="font-semibold text-white">Regression / progression</h3>
                <p className="mt-4 text-sm leading-6 text-muted-foreground">{analysis.regressionProgression}</p>
              </CardContent>
            </Card>
            <ResultList title="Film better next time" items={analysis.filmingTips} icon={Camera} />
          </div>

          <Card>
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-white">Save analysis</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  Saves the score, cues, safety notes, and video path to your Form Coach history.
                </p>
              </div>
              <Button type="button" onClick={saveAnalysis} disabled={isSaving || Boolean(savedCheckId)} className="w-full sm:w-auto">
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {savedCheckId ? "Saved" : isSaving ? "Saving..." : "Save analysis"}
              </Button>
            </CardContent>
          </Card>
        </section>
      ) : null}

      <section id="form-history">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-primary">History</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">Previous form checks</h2>
          </div>
        </div>
        {history.length === 0 ? (
          <EmptyState
            icon={Video}
            title="No form checks yet"
            copy="Analyze and save a set to start building your form history."
          />
        ) : (
          <div className="grid gap-3">
            {history.map((item) => (
              <Card key={item.id}>
                <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-white">{item.exercise}</h3>
                      <Badge>{item.formScore}/100</Badge>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.topCorrection}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">{formatDate(item.date)}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
