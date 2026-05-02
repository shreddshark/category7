export const categoryWeights = {
  labelsAndSafety: 22,
  structuralPestsAndIPM: 22,
  applicationMethods: 16,
  lawsAndRegulations: 12,
  applicationMath: 10,
  personalProtectiveEquipment: 8,
  environmentalProtection: 5,
  storageAndDisposal: 5,
}

export const questionPool = [
  {
    id: 1,
    category: "labelsAndSafety",
    question:
      "Which signal word indicates the highest level of acute toxicity on a pesticide label?",
    choices: ["Caution", "Warning", "Danger", "Notice"],
    correctAnswer: "Danger",
    explanation:
      "Danger indicates the highest toxicity level and may include skull and crossbones.",
    difficulty: "medium",
  },
  {
    id: 2,
    category: "labelsAndSafety",
    question:
      "The pesticide label should be considered which of the following?",
    choices: [
      "A general guideline",
      "A legal document that must be followed",
      "A suggestion for mixing only",
      "Optional for experienced applicators",
    ],
    correctAnswer: "A legal document that must be followed",
    explanation: "The pesticide label is enforceable by law under FIFRA.",
    difficulty: "medium",
  },
  {
    id: 3,
    category: "personalProtectiveEquipment",
    question:
      "Which type of gloves should be worn when mixing or applying pesticides?",
    choices: [
      "Cotton gloves",
      "Leather gloves",
      "Chemical-resistant gloves",
      "Cloth gloves",
    ],
    correctAnswer: "Chemical-resistant gloves",
    explanation:
      "Chemical-resistant gloves reduce pesticide absorption through the skin.",
    difficulty: "easy",
  },
  {
    id: 4,
    category: "applicationMath",
    question: "What is the area of a 20 ft by 30 ft space?",
    choices: ["300 sq ft", "400 sq ft", "600 sq ft", "900 sq ft"],
    correctAnswer: "600 sq ft",
    explanation: "Area = length × width = 20 × 30.",
    difficulty: "easy",
  },
  {
    id: 5,
    category: "lawsAndRegulations",
    question: "Using a pesticide in a way not listed on the label is:",
    choices: [
      "Acceptable with experience",
      "Allowed if diluted",
      "A violation of federal law",
      "Recommended for severe infestations",
    ],
    correctAnswer: "A violation of federal law",
    explanation:
      "Using pesticides contrary to label directions violates FIFRA.",
    difficulty: "medium",
  },
  {
    id: 6,
    category: "environmentalProtection",
    question: "Which of the following best describes pesticide drift?",
    choices: [
      "Movement of pesticide off the target site",
      "Breakdown of pesticide in soil",
      "Mixing error",
      "Application rate issue",
    ],
    correctAnswer: "Movement of pesticide off the target site",
    explanation:
      "Drift occurs when pesticide moves away from the intended area.",
    difficulty: "medium",
  },
  {
    id: 7,
    category: "storageAndDisposal",
    question: "Pesticides should always be stored:",
    choices: [
      "In any sealed container",
      "In original labeled containers",
      "Near food for convenience",
      "In open areas",
    ],
    correctAnswer: "In original labeled containers",
    explanation:
      "Original containers prevent misuse and provide safety information.",
    difficulty: "easy",
  },
  {
    id: 8,
    category: "applicationMethods",
    question: "Why is calibration important when applying pesticides?",
    choices: [
      "To reduce odor",
      "To ensure the correct amount is applied",
      "To eliminate PPE",
      "To speed up applications",
    ],
    correctAnswer: "To ensure the correct amount is applied",
    explanation:
      "Calibration ensures proper application rate and legal compliance.",
    difficulty: "medium",
  },
  {
    id: 9,
    category: "applicationMath",
    question:
      "What is the area of a triangle with a base of 20 ft and height of 10 ft?",
    choices: ["50 sq ft", "100 sq ft", "150 sq ft", "200 sq ft"],
    correctAnswer: "100 sq ft",
    explanation: "½ × base × height = ½ × 20 × 10.",
    difficulty: "medium",
  },
  {
    id: 10,
    category: "labelsAndSafety",
    question: "Which section of the pesticide label lists PPE requirements?",
    choices: [
      "Directions for Use",
      "Precautionary Statements",
      "Storage and Disposal",
      "Warranty",
    ],
    correctAnswer: "Precautionary Statements",
    explanation: "PPE is listed under precautionary statements.",
    difficulty: "medium",
  },

  // 🔥 NEW HIGH-QUALITY EXAM-STYLE QUESTIONS

  {
    id: 200,
    category: "labelsAndSafety",
    question:
      "Which of the following is NOT typically found on a pesticide label?",
    choices: [
      "Application rates",
      "First aid instructions",
      "Storage directions",
      "Service pricing recommendations",
    ],
    correctAnswer: "Service pricing recommendations",
    explanation:
      "Labels contain safety and usage information, not business guidance.",
    difficulty: "easy",
  },
  {
    id: 201,
    category: "personalProtectiveEquipment",
    question: "Which of the following is NOT a good PPE practice?",
    choices: [
      "Inspect gloves before use",
      "Wash gloves before removing",
      "Wipe gloves on clothing",
      "Replace damaged PPE",
    ],
    correctAnswer: "Wipe gloves on clothing",
    explanation: "This increases pesticide exposure risk.",
    difficulty: "medium",
  },
  {
    id: 202,
    category: "environmentalProtection",
    question: "Highly water-soluble pesticides are more likely to:",
    choices: [
      "Bind tightly to soil",
      "Remain at the application site",
      "Move with water and cause runoff",
      "Break down instantly",
    ],
    correctAnswer: "Move with water and cause runoff",
    explanation: "Higher solubility increases movement in water.",
    difficulty: "medium",
  },
  {
    id: 203,
    category: "lawsAndRegulations",
    question: "Who may legally purchase restricted-use pesticides?",
    choices: [
      "Anyone over 18",
      "Only certified applicators",
      "Homeowners",
      "Any licensed driver",
    ],
    correctAnswer: "Only certified applicators",
    explanation: "Restricted-use pesticides require certification.",
    difficulty: "medium",
  },
  {
    id: 204,
    category: "applicationMethods",
    question: "A contact pesticide works by:",
    choices: [
      "Being absorbed systemically",
      "Moving through soil",
      "Killing pests on direct contact",
      "Only affecting eggs",
    ],
    correctAnswer: "Killing pests on direct contact",
    explanation: "Contact pesticides must physically touch the pest.",
    difficulty: "medium",
  },
  {
    id: 205,
    category: "labelsAndSafety",
    question: "Which route of exposure is most common for applicators?",
    choices: ["Dermal", "Oral", "Inhalation", "Injection"],
    correctAnswer: "Dermal",
    explanation: "Skin exposure accounts for most pesticide exposure.",
    difficulty: "medium",
  },
  {
    id: 206,
    category: "labelsAndSafety",
    question: "LD50 refers to:",
    choices: [
      "Amount needed to kill 100%",
      "Dose to kill 50% of test animals",
      "Mixing ratio",
      "Application rate",
    ],
    correctAnswer: "Dose to kill 50% of test animals",
    explanation: "LD50 measures acute toxicity.",
    difficulty: "hard",
  },
  {
    id: 207,
    category: "lawsAndRegulations",
    question: "Applying pesticide to a site not listed on the label is:",
    choices: ["Acceptable", "Recommended", "A misuse", "Optional"],
    correctAnswer: "A misuse",
    explanation: "Applications must match label directions.",
    difficulty: "easy",
  },
  {
    id: 208,
    category: "storageAndDisposal",
    question: "Empty pesticide containers should be handled according to:",
    choices: [
      "Personal preference",
      "Local rumors",
      "Label directions",
      "Customer instructions",
    ],
    correctAnswer: "Label directions",
    explanation: "Proper disposal is specified on the label.",
    difficulty: "easy",
  },
]
