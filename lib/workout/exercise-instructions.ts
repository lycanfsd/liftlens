import type { ExerciseInstructionSections, ExerciseInstructionValue, ExercisePrescription } from "@/lib/types";

type InstructionTitle =
  | "Setup"
  | "How to perform"
  | "Form cues"
  | "Breathing"
  | "Common mistakes"
  | "Safety tips"
  | "Muscles worked";

export type ExerciseInstructionSection = {
  title: InstructionTitle | string;
  items: string[];
};

type MuscleMap = {
  primary: string[];
  secondary: string[];
};

type InstructionTemplate = {
  setup: string[];
  howToPerform: string[];
  formCues: string[];
  breathing: string[];
  commonMistakes: string[];
  safetyTips: string[];
  muscles: MuscleMap;
};

const orderedTitles: InstructionTitle[] = [
  "Setup",
  "How to perform",
  "Form cues",
  "Breathing",
  "Common mistakes",
  "Safety tips",
  "Muscles worked"
];

const sourceFields: Array<{ key: keyof ExercisePrescription; title: InstructionTitle }> = [
  { key: "instructions", title: "How to perform" },
  { key: "coachingNotes", title: "Form cues" },
  { key: "cues", title: "Form cues" },
  { key: "formTips", title: "Form cues" },
  { key: "techniqueNotes", title: "How to perform" },
  { key: "coachingCues", title: "Form cues" }
];

function toItems(value?: string | string[]) {
  if (!value) return [];
  return Array.isArray(value) ? value.map((item) => item.trim()).filter(Boolean) : [value.trim()].filter(Boolean);
}

function isInstructionSections(value: unknown): value is ExerciseInstructionSections {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function section(title: InstructionTitle | string, value?: string | string[]): ExerciseInstructionSection | null {
  const items = toItems(value);
  return items.length ? { title, items } : null;
}

function dedupe(items: string[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function titleCase(value: string) {
  return value
    .split(/[-_\s]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function hasAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function fromStructuredInstructions(value: ExerciseInstructionSections) {
  return [
    section("Setup", value.setup),
    section("How to perform", value.howToPerform ?? value.execution),
    section("Form cues", value.formCues),
    section("Breathing", value.breathing),
    section("Common mistakes", value.commonMistakes),
    section("Safety tips", value.safetyTips),
    section("Muscles worked", value.musclesWorked)
  ].filter(Boolean) as ExerciseInstructionSection[];
}

function fromInstructionValue(value: ExerciseInstructionValue | undefined, title: InstructionTitle) {
  if (!value) return [];
  if (isInstructionSections(value)) return fromStructuredInstructions(value);
  return section(title, value) ? [section(title, value) as ExerciseInstructionSection] : [];
}

function providedInstructionSections(exercise: ExercisePrescription) {
  const sections: ExerciseInstructionSection[] = [];

  for (const source of sourceFields) {
    const value = exercise[source.key] as ExerciseInstructionValue | undefined;
    sections.push(...fromInstructionValue(value, source.title));
  }

  return sections;
}

function musclesWorkedSection(exercise: ExercisePrescription | null, muscles: MuscleMap) {
  const primary = exercise?.primaryTargets?.length ? exercise.primaryTargets.map(titleCase) : muscles.primary;
  const secondary = exercise?.secondaryTargets?.length ? exercise.secondaryTargets.map(titleCase) : muscles.secondary;
  const items = [
    primary.length ? `Primary: ${dedupe(primary).join(", ")}` : null,
    secondary.length ? `Secondary: ${dedupe(secondary).join(", ")}` : null
  ].filter(Boolean) as string[];

  return { title: "Muscles worked", items };
}

function templateToSections(template: InstructionTemplate, exercise: ExercisePrescription | null = null): ExerciseInstructionSection[] {
  return [
    { title: "Setup", items: template.setup },
    { title: "How to perform", items: template.howToPerform },
    { title: "Form cues", items: template.formCues },
    { title: "Breathing", items: template.breathing },
    { title: "Common mistakes", items: template.commonMistakes },
    { title: "Safety tips", items: template.safetyTips },
    musclesWorkedSection(exercise, template.muscles)
  ];
}

function mergeSections(fallback: ExerciseInstructionSection[], provided: ExerciseInstructionSection[]) {
  const byTitle = new Map<string, ExerciseInstructionSection>();

  for (const item of fallback) {
    byTitle.set(item.title.toLowerCase(), { ...item, items: [...item.items] });
  }

  for (const item of provided) {
    const key = item.title.toLowerCase();
    const existing = byTitle.get(key);
    byTitle.set(key, {
      title: existing?.title ?? item.title,
      items: dedupe([...(item.items ?? []), ...(existing?.items ?? [])])
    });
  }

  const ordered = orderedTitles
    .map((title) => byTitle.get(title.toLowerCase()))
    .filter(Boolean) as ExerciseInstructionSection[];
  const extras = Array.from(byTitle.values()).filter((item) => !orderedTitles.some((title) => title.toLowerCase() === item.title.toLowerCase()));

  return [...ordered, ...extras].filter((item) => item.items.length);
}

function mergeSafetyNote(sections: ExerciseInstructionSection[], safetyNote?: string) {
  if (!safetyNote) return sections;

  return sections.map((item) => {
    if (item.title.toLowerCase() !== "safety tips") return item;
    return { ...item, items: dedupe([safetyNote, ...item.items]) };
  });
}

function detectExercisePattern(exerciseOrName: string | ExercisePrescription) {
  const name = typeof exerciseOrName === "string" ? exerciseOrName.toLowerCase() : exerciseOrName.name.toLowerCase();
  const movementPattern = typeof exerciseOrName === "string" ? "" : exerciseOrName.movementPattern?.toLowerCase() ?? "";

  if (hasAny(name, ["leg press"])) return "leg-press";
  if (hasAny(name, ["split squat", "walking lunge", "lunge", "step-up", "step up"])) return "lunge";
  if (hasAny(name, ["squat"]) || movementPattern === "squat") return "squat";
  if (hasAny(name, ["hip thrust", "glute bridge"])) return "glute-bridge";
  if (hasAny(name, ["deadlift", "romanian", "rdl", "hinge"]) || movementPattern === "hinge") return "hinge";
  if (hasAny(name, ["leg extension"])) return "leg-extension";
  if (hasAny(name, ["hamstring curl"])) return "hamstring-curl";
  if (hasAny(name, ["calf raise"])) return "calf-raise";
  if (hasAny(name, ["fly", "pec deck"])) return "chest-fly";
  if (hasAny(name, ["push-up", "pushup", "bench", "chest press", "floor press"]) || movementPattern === "horizontal-push") return "horizontal-press";
  if (hasAny(name, ["shoulder press", "overhead", "landmine press"]) || movementPattern === "vertical-push") return "vertical-press";
  if (hasAny(name, ["lateral raise", "rear delt", "raise"])) return "lateral-raise";
  if (hasAny(name, ["pull-up", "pullup", "chin-up", "chinup", "pulldown", "lat"]) || movementPattern === "vertical-pull") return "vertical-pull";
  if (hasAny(name, ["row", "face pull"]) || movementPattern === "horizontal-pull") return "horizontal-pull";
  if (hasAny(name, ["curl"])) return "biceps-curl";
  if (hasAny(name, ["triceps", "pressdown", "pushdown", "skull crusher", "extension"])) return "triceps-extension";
  if (hasAny(name, ["pallof", "anti-rotation", "rotation"]) || movementPattern === "anti-rotation") return "anti-rotation";
  if (hasAny(name, ["dead bug", "plank"]) || movementPattern === "anti-extension") return "core-stability";
  if (hasAny(name, ["crunch", "sit-up", "situp"])) return "crunch";
  if (hasAny(name, ["carry"]) || movementPattern === "carry") return "carry";
  if (hasAny(name, ["kettlebell swing", "swing"]) || movementPattern === "power") return "power";
  if (hasAny(name, ["bike", "sled", "burpee", "mountain climber", "interval", "sprint"]) || movementPattern === "conditioning") return "conditioning";

  return "general";
}

function templateForPattern(pattern: ReturnType<typeof detectExercisePattern>): InstructionTemplate {
  switch (pattern) {
    case "squat":
      return {
        setup: [
          "Stand with feet about shoulder-width apart, or slightly wider if that feels stronger.",
          "Turn your toes slightly out if comfortable, keep your chest tall, and brace your core before the first rep.",
          "Keep the whole foot connected to the floor: big toe, little toe, and heel."
        ],
        howToPerform: [
          "Push your hips back slightly and bend your knees at the same time.",
          "Lower until your thighs are around parallel, or as low as you can control without pain.",
          "Keep your knees tracking in the same direction as your toes.",
          "Drive through your midfoot and heels to stand back up without letting your chest collapse."
        ],
        formCues: ["Chest tall.", "Knees track over toes.", "Brace before each rep.", "Control the way down."],
        breathing: ["Inhale and brace before lowering.", "Hold your brace through the hardest part, then exhale as you stand tall."],
        commonMistakes: ["Knees collapsing inward.", "Heels lifting off the floor.", "Rounding the lower back.", "Bouncing out of the bottom position."],
        safetyTips: ["Reduce the weight if your back rounds or your knees cave in.", "Stop if you feel sharp knee, hip, or back pain."],
        muscles: { primary: ["Quads", "Glutes"], secondary: ["Hamstrings", "Core", "Calves"] }
      };
    case "leg-press":
      return {
        setup: [
          "Sit with your back and hips fully against the pad.",
          "Place your feet about shoulder-width on the platform with toes slightly out if comfortable.",
          "Set the seat so your knees can bend deeply without your hips curling off the pad."
        ],
        howToPerform: [
          "Unlock the sled and lower it with control.",
          "Let your knees bend toward your chest while keeping your lower back against the pad.",
          "Press the platform away through your midfoot.",
          "Stop just short of aggressively locking your knees at the top."
        ],
        formCues: ["Back stays on the pad.", "Knees follow toes.", "Control the lower.", "Press through the whole foot."],
        breathing: ["Inhale as the sled lowers.", "Exhale as you press the platform away."],
        commonMistakes: ["Lower back rounding off the seat.", "Knees caving inward.", "Cutting the range short.", "Locking the knees hard at the top."],
        safetyTips: ["Use the safety handles correctly.", "Reduce load if you cannot control the bottom position."],
        muscles: { primary: ["Quads", "Glutes"], secondary: ["Hamstrings", "Calves"] }
      };
    case "lunge":
      return {
        setup: [
          "Stand tall with ribs stacked over hips and eyes forward.",
          "Use dumbbells at your sides or bodyweight until balance feels reliable.",
          "Take a long enough step that both knees can bend comfortably."
        ],
        howToPerform: [
          "Step or split into position and lower under control.",
          "Let the front knee track over the toes while the back knee moves toward the floor.",
          "Push through the front midfoot and heel to return to the start.",
          "Keep your torso controlled instead of bouncing or twisting."
        ],
        formCues: ["Tall posture.", "Front foot heavy.", "Knee follows toes.", "Smooth reps."],
        breathing: ["Inhale before lowering.", "Exhale as you drive back up."],
        commonMistakes: ["Taking too short of a step.", "Pushing mostly through the back leg.", "Knee collapsing inward.", "Losing balance by rushing."],
        safetyTips: ["Shorten the range if knees or hips feel irritated.", "Hold support if balance limits your form."],
        muscles: { primary: ["Quads", "Glutes"], secondary: ["Hamstrings", "Core", "Calves"] }
      };
    case "hinge":
      return {
        setup: [
          "Start with the weight close to your body and feet about hip-width apart.",
          "Soften your knees, brace your core, and pull your shoulders slightly back and down.",
          "Think about closing a car door with your hips."
        ],
        howToPerform: [
          "Push your hips back while keeping your spine long and quiet.",
          "Lower until you feel a strong hamstring stretch or until your torso position wants to change.",
          "Keep the weight close to your legs.",
          "Drive the hips forward to stand tall without leaning back at the top."
        ],
        formCues: ["Hips back.", "Weight close.", "Lats tight.", "Stand tall, do not lean back."],
        breathing: ["Inhale and brace before lowering.", "Exhale as you return to standing."],
        commonMistakes: ["Rounding the back.", "Squatting instead of hinging.", "Letting the weight drift forward.", "Overextending the low back at lockout."],
        safetyTips: ["Reduce the range or weight if your lower back takes over.", "Stop if you feel sharp back or hamstring pain."],
        muscles: { primary: ["Hamstrings", "Glutes"], secondary: ["Lower back", "Upper back", "Core"] }
      };
    case "glute-bridge":
      return {
        setup: [
          "Set your upper back on a bench for hip thrusts, or lie on the floor for glute bridges.",
          "Place feet about hip-width apart with shins close to vertical at the top.",
          "Tuck your ribs down and lightly brace your core before lifting."
        ],
        howToPerform: [
          "Drive through your heels and lift your hips until your body forms a straight line from shoulders to knees.",
          "Squeeze your glutes at the top without arching your lower back.",
          "Lower with control and keep tension instead of relaxing fully between reps."
        ],
        formCues: ["Ribs down.", "Drive through heels.", "Squeeze glutes, not low back.", "Pause at the top."],
        breathing: ["Inhale before lifting.", "Exhale as you drive the hips up and squeeze."],
        commonMistakes: ["Overarching the lower back.", "Feet too far away.", "Pushing through the toes.", "Rushing the top position."],
        safetyTips: ["Move the feet closer or lower the load if you feel mostly hamstrings or low back.", "Stop if the movement causes sharp hip or back pain."],
        muscles: { primary: ["Glutes"], secondary: ["Hamstrings", "Core"] }
      };
    case "horizontal-press":
      return {
        setup: [
          "Set your shoulder blades back and down before pressing.",
          "Keep wrists stacked over elbows and choose a grip that feels stable.",
          "Plant your feet firmly so your whole body feels anchored."
        ],
        howToPerform: [
          "Lower the weight toward your mid-chest or the target line with control.",
          "Keep elbows slightly tucked instead of flared straight out.",
          "Press smoothly until arms are extended without losing shoulder position.",
          "Keep the lowering phase slower than the press."
        ],
        formCues: ["Shoulders back and down.", "Control the descent.", "Wrists over elbows.", "Press smoothly."],
        breathing: ["Inhale and brace before lowering.", "Exhale as you press through the hardest part."],
        commonMistakes: ["Bouncing reps.", "Flaring elbows too wide.", "Letting wrists bend back.", "Losing upper-back tightness."],
        safetyTips: ["Use a spotter or safety arms for heavy barbell work.", "Stop if you feel sharp shoulder pain."],
        muscles: { primary: ["Chest"], secondary: ["Triceps", "Front delts"] }
      };
    case "chest-fly":
      return {
        setup: [
          "Set handles or dumbbells at chest level with a slight bend in your elbows.",
          "Keep shoulder blades gently set and ribs down.",
          "Use a lighter load than you would for pressing."
        ],
        howToPerform: [
          "Open your arms slowly until you feel a chest stretch you can control.",
          "Keep the elbow angle mostly the same through the rep.",
          "Bring the hands back together by squeezing the chest, not by shrugging.",
          "Stop before your shoulders glide forward."
        ],
        formCues: ["Soft elbows.", "Stretch with control.", "Squeeze the chest.", "Shoulders stay quiet."],
        breathing: ["Inhale as you open.", "Exhale as you bring the hands together."],
        commonMistakes: ["Going too heavy.", "Turning the fly into a press.", "Overstretching the shoulder.", "Shrugging at the top."],
        safetyTips: ["Keep range pain-free and controlled.", "Reduce the stretch if shoulders feel unstable."],
        muscles: { primary: ["Chest"], secondary: ["Front delts", "Biceps stabilizers"] }
      };
    case "vertical-press":
      return {
        setup: [
          "Set feet firmly and stack ribs over hips.",
          "Start with hands around shoulder height and wrists stacked over elbows.",
          "Brace your core so you do not lean back to move the weight."
        ],
        howToPerform: [
          "Press the weight up in a smooth path.",
          "Keep your neck relaxed and avoid shrugging into your ears.",
          "Finish with arms extended while ribs stay down.",
          "Lower under control back to the starting position."
        ],
        formCues: ["Ribs down.", "Press up, not back.", "Neck relaxed.", "Control the lower."],
        breathing: ["Inhale and brace before the press.", "Exhale as the weight passes the hardest point."],
        commonMistakes: ["Leaning back.", "Flaring ribs.", "Shrugging hard.", "Lowering too quickly."],
        safetyTips: ["Use a pain-free range and lighter load if shoulders pinch.", "Stop if pressing changes your shoulder mechanics."],
        muscles: { primary: ["Shoulders"], secondary: ["Triceps", "Upper chest", "Core"] }
      };
    case "horizontal-pull":
      return {
        setup: [
          "Set your torso stable before pulling.",
          "Let the arm reach forward without rounding aggressively through your upper back.",
          "Start the pull by setting the shoulder blade, then drive the elbow back."
        ],
        howToPerform: [
          "Pull the handle or weight toward your ribs or hip.",
          "Keep your torso from twisting or rocking.",
          "Squeeze briefly at the top, then return with control.",
          "Let the shoulder blade move naturally without shrugging."
        ],
        formCues: ["Pull with elbows.", "No torso swing.", "Shoulders away from ears.", "Control the stretch."],
        breathing: ["Exhale as you pull.", "Inhale as you return to the stretched position."],
        commonMistakes: ["Using momentum.", "Shrugging into the neck.", "Twisting to finish reps.", "Cutting off the stretch."],
        safetyTips: ["Reduce load if your torso moves more than the weight.", "Stop if shoulder discomfort gets sharper."],
        muscles: { primary: ["Lats", "Mid-back"], secondary: ["Rear delts", "Biceps", "Core"] }
      };
    case "vertical-pull":
      return {
        setup: [
          "Grip the bar or handles just outside shoulder-width unless the exercise calls for another grip.",
          "Sit or hang tall with ribs controlled and shoulders away from your ears.",
          "Start each rep from a stable shoulder position."
        ],
        howToPerform: [
          "Pull elbows down toward your ribs.",
          "Keep chest lifted without leaning back excessively.",
          "Pause briefly when the bar or body reaches the strongest position.",
          "Return with control until you feel a lat stretch."
        ],
        formCues: ["Elbows to ribs.", "Chest tall.", "Do not yank.", "Own the stretch."],
        breathing: ["Exhale as you pull.", "Inhale as you return under control."],
        commonMistakes: ["Pulling with only the arms.", "Swinging or leaning far back.", "Shoulders rolling forward.", "Rushing the return."],
        safetyTips: ["Use assistance or reduce load if reps become jerky.", "Stop if the shoulder pinches or loses control."],
        muscles: { primary: ["Lats", "Upper back"], secondary: ["Biceps", "Rear delts", "Core"] }
      };
    case "lateral-raise":
      return {
        setup: [
          "Stand tall with a light bend in the elbows.",
          "Keep ribs down and shoulders relaxed before lifting.",
          "Use a light enough weight that you do not need to swing."
        ],
        howToPerform: [
          "Raise the arms out to the sides until they are around shoulder height.",
          "Lead with elbows and keep wrists neutral.",
          "Pause briefly, then lower slowly.",
          "Keep tension on the shoulders instead of resting at the bottom."
        ],
        formCues: ["Lead with elbows.", "No shrug.", "Light and strict.", "Slow lower."],
        breathing: ["Exhale as you raise.", "Inhale as you lower with control."],
        commonMistakes: ["Swinging the body.", "Shrugging traps up.", "Going too heavy.", "Raising beyond a comfortable range."],
        safetyTips: ["Lower the range if shoulders pinch.", "Choose a lighter weight if you cannot pause at the top."],
        muscles: { primary: ["Side delts"], secondary: ["Rear delts", "Upper traps stabilizers"] }
      };
    case "biceps-curl":
      return {
        setup: [
          "Stand tall or sit with elbows close to your sides.",
          "Keep wrists neutral and shoulders relaxed.",
          "Start with arms fully lengthened without losing posture."
        ],
        howToPerform: [
          "Curl the weight up by bending the elbows.",
          "Keep elbows mostly still instead of letting them drift forward.",
          "Squeeze briefly near the top.",
          "Lower slowly until the arms are long again."
        ],
        formCues: ["Elbows pinned.", "No swing.", "Wrists neutral.", "Slow lower."],
        breathing: ["Exhale as you curl up.", "Inhale as you lower."],
        commonMistakes: ["Swinging the hips.", "Letting elbows travel forward.", "Bending wrists back.", "Cutting the lower short."],
        safetyTips: ["Use less weight if your back moves.", "Stop if elbow or wrist pain sharpens."],
        muscles: { primary: ["Biceps", "Brachialis"], secondary: ["Forearms"] }
      };
    case "triceps-extension":
      return {
        setup: [
          "Set elbows close to your sides or fixed in the position the exercise requires.",
          "Keep wrists neutral and shoulders down.",
          "Start with a load you can control without leaning."
        ],
        howToPerform: [
          "Extend the elbows until the arms are straight or nearly straight.",
          "Squeeze the triceps at the finish.",
          "Return slowly while keeping elbows from drifting.",
          "Keep the torso still through the whole set."
        ],
        formCues: ["Elbows stay put.", "Lock out with control.", "Shoulders quiet.", "Slow return."],
        breathing: ["Exhale as you extend.", "Inhale as you return to the start."],
        commonMistakes: ["Rocking the torso.", "Letting elbows flare or drift.", "Using too much shoulder.", "Rushing the negative."],
        safetyTips: ["Reduce load if elbows feel irritated.", "Keep wrists neutral and avoid painful lockout positions."],
        muscles: { primary: ["Triceps"], secondary: ["Shoulders stabilizers"] }
      };
    case "core-stability":
      return {
        setup: [
          "Find a stacked position with ribs down and pelvis controlled.",
          "Keep your neck neutral and brace like you are about to be lightly bumped.",
          "Use the easiest version that lets you keep full control."
        ],
        howToPerform: [
          "Move slowly or hold the position while keeping the spine still.",
          "Stop the rep before your lower back arches or your hips rotate.",
          "Keep tension steady instead of rushing for more reps.",
          "Reset your brace when form starts to fade."
        ],
        formCues: ["Ribs down.", "Slow reps.", "No low-back arch.", "Own the position."],
        breathing: ["Use controlled exhales while keeping your brace.", "Avoid holding your breath for the entire set."],
        commonMistakes: ["Arching the lower back.", "Moving too fast.", "Letting hips rotate.", "Shrugging into the neck."],
        safetyTips: ["Choose a simpler variation if your back takes over.", "Stop if you feel sharp back or hip pain."],
        muscles: { primary: ["Core"], secondary: ["Hip flexors", "Shoulders stabilizers"] }
      };
    case "anti-rotation":
      return {
        setup: [
          "Stand or kneel side-on to the cable or band.",
          "Set ribs down, brace your core, and keep hips square.",
          "Hold the handle at the center of your chest before pressing out."
        ],
        howToPerform: [
          "Press the handle straight away from your chest.",
          "Resist the cable or band pulling you into rotation.",
          "Pause briefly with arms extended.",
          "Return to the chest with control and repeat without leaning."
        ],
        formCues: ["Hips square.", "Press straight out.", "Do not rotate.", "Brace the whole rep."],
        breathing: ["Exhale as you press out.", "Inhale as you bring the handle back without losing position."],
        commonMistakes: ["Leaning away from the cable.", "Letting hips twist.", "Shrugging.", "Using too much weight."],
        safetyTips: ["Step closer or lighten the band if you cannot stay square.", "Stop if your back feels strained."],
        muscles: { primary: ["Core"], secondary: ["Glutes", "Shoulders stabilizers"] }
      };
    case "carry":
      return {
        setup: [
          "Pick up the weight with a braced torso and a tall posture.",
          "Keep shoulders level and ribs stacked over hips.",
          "Choose a load that challenges posture without forcing you to lean."
        ],
        howToPerform: [
          "Walk slowly and smoothly for the prescribed distance or time.",
          "Keep the weight from pulling you sideways or forward.",
          "Take controlled steps and keep breathing.",
          "Set the weight down with the same control you used to pick it up."
        ],
        formCues: ["Walk tall.", "Shoulders level.", "No leaning.", "Quiet steps."],
        breathing: ["Breathe steadily while maintaining your brace.", "Do not hold your breath for the whole carry."],
        commonMistakes: ["Leaning into or away from the weight.", "Rushing steps.", "Shrugging.", "Setting the weight down carelessly."],
        safetyTips: ["Use a lighter weight if posture breaks.", "Stop if grip failure makes the weight unsafe to control."],
        muscles: { primary: ["Core", "Grip"], secondary: ["Glutes", "Upper back", "Shoulders"] }
      };
    case "power":
      return {
        setup: [
          "Start with feet about hip-width and the kettlebell or implement close.",
          "Brace your core and hinge at the hips instead of squatting down.",
          "Keep shoulders packed and arms relaxed."
        ],
        howToPerform: [
          "Hike the weight back like a football snap.",
          "Snap the hips forward to float the weight.",
          "Let the arms guide the path without lifting with the shoulders.",
          "Absorb the weight by hinging again and keeping the spine controlled."
        ],
        formCues: ["Hips snap.", "Arms relaxed.", "Spine quiet.", "Float, do not lift."],
        breathing: ["Exhale sharply as the hips snap.", "Inhale as the weight returns into the hinge."],
        commonMistakes: ["Squatting the swing.", "Lifting with the shoulders.", "Rounding the back.", "Letting the bell pull too low."],
        safetyTips: ["Use a lighter weight until the hinge is crisp.", "Stop if your lower back feels loaded instead of your hips and glutes."],
        muscles: { primary: ["Glutes", "Hamstrings"], secondary: ["Core", "Back", "Conditioning"] }
      };
    case "conditioning":
      return {
        setup: [
          "Set the machine or space so you can move without rushing the start.",
          "Choose a resistance or pace that lets you keep posture for the full interval.",
          "Know your work and rest times before you begin."
        ],
        howToPerform: [
          "Build into the effort instead of sprinting the first few seconds.",
          "Keep posture steady while you push the pace.",
          "Use the rest period fully so the next round stays clean.",
          "Stop the interval if form breaks down."
        ],
        formCues: ["Smooth start.", "Stay tall.", "Breathe rhythmically.", "Quality pace."],
        breathing: ["Use steady rhythmic breathing.", "Avoid breath-holding during high-effort intervals."],
        commonMistakes: ["Starting too hard.", "Ignoring rest periods.", "Letting posture collapse.", "Turning every round into a max effort."],
        safetyTips: ["Back off if you feel dizzy, chest pain, or unusual shortness of breath.", "Keep intensity challenging but controlled."],
        muscles: { primary: ["Conditioning"], secondary: ["Legs", "Core"] }
      };
    case "leg-extension":
      return {
        setup: [
          "Set the seat so your knees line up with the machine pivot.",
          "Place the pad above your ankles, not on top of your feet.",
          "Keep hips and back against the pad."
        ],
        howToPerform: [
          "Extend the knees until legs are straight or nearly straight.",
          "Squeeze the quads briefly at the top.",
          "Lower slowly without letting the stack slam.",
          "Keep hips down through the whole rep."
        ],
        formCues: ["Hips down.", "Squeeze quads.", "Slow lower.", "No bouncing."],
        breathing: ["Exhale as you extend.", "Inhale as you lower."],
        commonMistakes: ["Using momentum.", "Letting hips lift.", "Slamming the stack.", "Using painful range."],
        safetyTips: ["Reduce load or range if the knees feel sharp.", "Control every rep instead of kicking the weight."],
        muscles: { primary: ["Quads"], secondary: [] }
      };
    case "hamstring-curl":
      return {
        setup: [
          "Set the machine so the knee lines up with the pivot point.",
          "Place the pad above the heel or lower calf depending on the machine.",
          "Keep hips pressed into the pad or seat."
        ],
        howToPerform: [
          "Curl the pad toward you by bending the knees.",
          "Squeeze the hamstrings at the shortest position.",
          "Lower slowly until legs are long again.",
          "Keep hips still instead of lifting to finish reps."
        ],
        formCues: ["Hips stay down.", "Curl smoothly.", "Squeeze hamstrings.", "Slow return."],
        breathing: ["Exhale as you curl.", "Inhale as you lower."],
        commonMistakes: ["Arching the back.", "Lifting hips.", "Using momentum.", "Letting the weight stack slam."],
        safetyTips: ["Use a controlled range if hamstrings cramp.", "Stop if you feel sharp pain behind the knee."],
        muscles: { primary: ["Hamstrings"], secondary: ["Calves"] }
      };
    case "calf-raise":
      return {
        setup: [
          "Place the balls of your feet on the platform with heels free to move.",
          "Stand tall and hold support if balance is an issue.",
          "Keep knees softly extended unless the variation asks for bent knees."
        ],
        howToPerform: [
          "Lower heels slowly until you feel a calf stretch.",
          "Drive through the balls of the feet to rise as high as you can.",
          "Pause briefly at the top.",
          "Lower with control before the next rep."
        ],
        formCues: ["Full stretch.", "Tall at the top.", "No bouncing.", "Control every rep."],
        breathing: ["Exhale as you rise.", "Inhale as you lower."],
        commonMistakes: ["Bouncing out of the bottom.", "Using half reps.", "Rolling ankles outward.", "Going too fast."],
        safetyTips: ["Use support if balance limits control.", "Reduce load if Achilles or foot pain appears."],
        muscles: { primary: ["Calves"], secondary: ["Foot stabilizers"] }
      };
    case "crunch":
      return {
        setup: [
          "Lie down with ribs stacked and lower back comfortable.",
          "Keep hands light behind the head or across the chest.",
          "Set your brace before curling up."
        ],
        howToPerform: [
          "Curl ribs toward pelvis without yanking the neck.",
          "Pause briefly when abs are contracted.",
          "Lower slowly until shoulders return with control.",
          "Keep reps small and controlled rather than chasing height."
        ],
        formCues: ["Ribs to pelvis.", "Neck relaxed.", "Small controlled reps.", "Abs do the work."],
        breathing: ["Exhale as you curl up.", "Inhale as you lower."],
        commonMistakes: ["Pulling on the neck.", "Using momentum.", "Holding breath.", "Arching between reps."],
        safetyTips: ["Stop if the neck or lower back feels strained.", "Use a smaller range if needed."],
        muscles: { primary: ["Abs"], secondary: ["Hip flexors"] }
      };
    default:
      return {
        setup: [
          "Set up in a stable position before the first rep.",
          "Align the working joints and choose a load you can control.",
          "Brace lightly so your posture stays consistent."
        ],
        howToPerform: [
          "Move through the full comfortable range of motion with control.",
          "Keep the target muscle doing the work instead of using momentum.",
          "Control the lowering phase and reset your position before the next rep."
        ],
        formCues: ["Control the lower.", "Stay aligned.", "No momentum.", "Stop before form changes."],
        breathing: ["Brace before each rep.", "Exhale through the hardest part of the movement."],
        commonMistakes: ["Using momentum.", "Losing posture.", "Shortening the range of motion.", "Choosing a weight that is too heavy."],
        safetyTips: ["Stop if you feel sharp pain.", "Keep the movement controlled and prioritize form over load."],
        muscles: { primary: ["Target muscle group"], secondary: ["Supporting muscles"] }
      };
  }
}

function fallbackForExercise(input: string | ExercisePrescription) {
  const pattern = detectExercisePattern(input);
  return templateToSections(templateForPattern(pattern), typeof input === "string" ? null : input);
}

export function getExerciseInstructions(exerciseName: string): ExerciseInstructionSection[];
export function getExerciseInstructions(exercise: ExercisePrescription): ExerciseInstructionSection[];
export function getExerciseInstructions(input: string | ExercisePrescription): ExerciseInstructionSection[] {
  if (typeof input === "string") return fallbackForExercise(input);

  const fallback = fallbackForExercise(input);
  const provided = providedInstructionSections(input);
  const withProvided = provided.length ? mergeSections(fallback, provided) : fallback;
  const withCue = input.cue ? mergeSections(withProvided, [{ title: "Form cues", items: [input.cue] }]) : withProvided;

  return mergeSafetyNote(withCue, input.safetyNote);
}
