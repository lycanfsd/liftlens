export const formCoachExercises = [
  { value: "squat", label: "Squat" },
  { value: "deadlift", label: "Deadlift" },
  { value: "bench-press", label: "Bench press" },
  { value: "overhead-press", label: "Overhead press" },
  { value: "row", label: "Row" },
  { value: "pull-up", label: "Pull-up" },
  { value: "lunge", label: "Lunge" }
] as const;

export type FormCoachExercise = (typeof formCoachExercises)[number]["value"];

export type FormCoachAnalysis = {
  exercise: FormCoachExercise;
  formScore: number;
  positives: string[];
  corrections: string[];
  safetyWarnings: string[];
  nextCues: string[];
  filmingQuality: string;
  uncertainty: string;
  shouldRefilm: boolean;
  regressionProgression: string;
  filmingTips: string[];
};

type MockFormCoachFeedback = Omit<
  FormCoachAnalysis,
  "exercise" | "filmingQuality" | "uncertainty" | "shouldRefilm"
>;

const feedbackByExercise: Record<FormCoachExercise, MockFormCoachFeedback> = {
  squat: {
    formScore: 82,
    positives: [
      "Good controlled descent instead of dropping into the bottom.",
      "Feet stay planted through most of the rep.",
      "You keep your chest organized without overextending your low back."
    ],
    corrections: [
      "Let the knees track in the same direction as the toes on every rep.",
      "Brace before you descend, then keep the rib cage stacked over the pelvis.",
      "Slow the final two inches so depth stays consistent without bouncing."
    ],
    safetyWarnings: [
      "Reduce load if knee cave increases as the set gets harder.",
      "Stop the set if you feel sharp hip, knee, or back pain."
    ],
    nextCues: [
      "Tripod foot: big toe, little toe, heel.",
      "Breathe and brace before each rep.",
      "Drive the floor away, not your hips backward first."
    ],
    regressionProgression: "Use a goblet squat to a box for the next set. Progress by lowering the box or adding tempo.",
    filmingTips: [
      "Film from a 45-degree front angle so knee tracking and torso angle are visible.",
      "Include your feet and the top of the bar in frame."
    ]
  },
  deadlift: {
    formScore: 78,
    positives: [
      "The bar path stays fairly close to your legs.",
      "You reset between reps instead of rushing the pull.",
      "Lockout looks controlled without leaning far back."
    ],
    corrections: [
      "Set your lats before the bar leaves the floor: think armpits to pockets.",
      "Push the floor away so hips and shoulders rise together.",
      "Keep the bar over midfoot before initiating the pull."
    ],
    safetyWarnings: [
      "Do not chase reps if your low back starts rounding more each pull.",
      "Stop immediately for sharp back pain, numbness, or radiating symptoms."
    ],
    nextCues: [
      "Wedge in, then push.",
      "Shins close, arms long.",
      "Finish tall without overextending."
    ],
    regressionProgression: "Pull from blocks or use a kettlebell deadlift today. Progress by lowering the start height.",
    filmingTips: [
      "Film from the side at hip height.",
      "Keep the plates, hips, shoulders, and lockout fully visible."
    ]
  },
  "bench-press": {
    formScore: 80,
    positives: [
      "Shoulders look mostly pinned to the bench.",
      "The bar lowers with control.",
      "Your feet stay engaged instead of shifting around."
    ],
    corrections: [
      "Touch the bar at a consistent lower-chest point.",
      "Keep wrists stacked over elbows instead of letting them bend back.",
      "Use leg drive without letting your hips pop off the bench."
    ],
    safetyWarnings: [
      "Use safeties or a spotter for heavy sets.",
      "Stop if shoulder pain feels sharp or changes your bar path."
    ],
    nextCues: [
      "Bend the bar apart.",
      "Wrists over elbows.",
      "Press back toward the rack."
    ],
    regressionProgression: "Use dumbbell bench or push-ups with a slower tempo. Progress by returning to barbell volume.",
    filmingTips: [
      "Film from a diagonal side angle near the foot of the bench.",
      "Make sure the bar touch point and elbow position are visible."
    ]
  },
  "overhead-press": {
    formScore: 76,
    positives: [
      "You start each rep with a deliberate setup.",
      "The bar finishes close to stacked over the shoulders.",
      "You avoid turning the press into a push press."
    ],
    corrections: [
      "Squeeze glutes and brace so the ribs do not flare.",
      "Move your head through after the bar clears your forehead.",
      "Keep forearms vertical before the press starts."
    ],
    safetyWarnings: [
      "Lower the load if you need to lean back to clear the bar.",
      "Stop for sharp shoulder, neck, or back pain."
    ],
    nextCues: [
      "Glutes on, ribs down.",
      "Press close to the face.",
      "Head through at the top."
    ],
    regressionProgression: "Try a half-kneeling dumbbell press. Progress back to standing once rib flare stays quiet.",
    filmingTips: [
      "Film from the side so rib position and bar path are visible.",
      "Include feet through lockout in the frame."
    ]
  },
  row: {
    formScore: 84,
    positives: [
      "You keep the pull smooth instead of jerking the weight.",
      "The shoulder blades move instead of the arms doing everything.",
      "Tempo looks consistent across the set."
    ],
    corrections: [
      "Pause briefly near the body to own the top position.",
      "Avoid shrugging the shoulders toward the ears.",
      "Keep your torso angle stable across reps."
    ],
    safetyWarnings: [
      "Reduce weight if low-back position changes rep to rep.",
      "Stop if pulling causes sharp shoulder or elbow pain."
    ],
    nextCues: [
      "Reach, then row.",
      "Elbows to back pockets.",
      "Neck long, shoulders low."
    ],
    regressionProgression: "Use a chest-supported row. Progress by removing support once torso control is solid.",
    filmingTips: [
      "Film from a 45-degree side angle.",
      "Keep the shoulder blades and elbow path visible."
    ]
  },
  "pull-up": {
    formScore: 74,
    positives: [
      "You initiate with intent instead of kicking immediately.",
      "You control the lowering phase better than most reps.",
      "Grip width looks reasonable for your shoulder position."
    ],
    corrections: [
      "Start each rep from a quiet dead hang or active hang.",
      "Drive elbows down instead of craning the chin upward.",
      "Reduce swinging before adding more reps."
    ],
    safetyWarnings: [
      "Avoid forcing reps through sharp shoulder or elbow pain.",
      "Use assistance if swinging increases with fatigue."
    ],
    nextCues: [
      "Ribs down.",
      "Elbows to ribs.",
      "Quiet legs."
    ],
    regressionProgression: "Use band-assisted pull-ups or slow negatives. Progress by reducing assistance.",
    filmingTips: [
      "Film from the front at chest height.",
      "Show the full hang, chin position, and lower body."
    ]
  },
  lunge: {
    formScore: 81,
    positives: [
      "Step length is consistent enough to repeat.",
      "You lower under control rather than crashing into the bottom.",
      "The front foot stays grounded through the rep."
    ],
    corrections: [
      "Keep the front knee tracking over the middle toes.",
      "Stay tall through the torso instead of folding forward late in the set.",
      "Push through the front foot to return, not the back toe."
    ],
    safetyWarnings: [
      "Shorten range if knee discomfort appears at the bottom.",
      "Stop for sharp hip, knee, or ankle pain."
    ],
    nextCues: [
      "Train tracks, not tightrope.",
      "Front heel heavy.",
      "Control down, smooth up."
    ],
    regressionProgression: "Use a split squat holding support. Progress by removing support or adding load.",
    filmingTips: [
      "Film from a 45-degree front angle.",
      "Include both feet and the full torso in frame."
    ]
  }
};

export function getMockFormCoachAnalysis(exercise: FormCoachExercise): FormCoachAnalysis {
  return {
    exercise,
    ...feedbackByExercise[exercise],
    filmingQuality: "Demo mode: camera angle looks usable, but real analysis requires uploaded frames.",
    uncertainty: "Demo feedback is not based on the uploaded video.",
    shouldRefilm: false
  };
}

export function isFormCoachExercise(value: string): value is FormCoachExercise {
  return formCoachExercises.some((exercise) => exercise.value === value);
}
