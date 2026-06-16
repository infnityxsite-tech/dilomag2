/**
 * strictCurriculumPlan.js
 *
 * AUTHORITATIVE TARGET STRUCTURE — AI Mastery Group 2
 *
 * ALL titles and exactDBTitle values validated against live Firestore
 * (47 lectures, 71 assets) via exportFirestoreAudit.js on 2026-06-16.
 *
 * Rules enforced by strictMigrationAudit.js:
 *  - exactDBTitle  → matched first, highest priority (user-confirmed or DB-validated)
 *  - alts[]        → secondary exact candidates
 *  - mats[]        → asset titles (exact DB titles only — no guesses)
 *  - hw[]          → homework/lab titles (exact DB titles only)
 *  - lectureOnlyMove  → add moduleId to lecture ONLY; skip all asset writes
 *  - preserveExisting → never overwrite existing lectureId links on assets
 *
 * DO NOT EDIT titles without re-running exportFirestoreAudit.js to validate.
 */

export const STRICT_PLAN = {
  programName: 'AI Mastery Group 2',

  modules: [

    // ══════════════════════════════════════════════════════════
    // MODULE 1 — Python Foundations
    // DB id: HrsiVRAPbJBDvEGjqW4s
    // ══════════════════════════════════════════════════════════
    {
      name: 'Python Foundations',
      order: 1,
      lectures: [
        {
          title:        'Master Python Basics: Variables, Math & Logic in One Lesson',
          order:        1,
          // DB title: "Master Python Basics: Variables, Math & Logic in One Lesson! 🐍"
          // DB id: 8qhHgZ8re0myEitg1zJF
          alts:  ['Master Python Basics: Variables, Math & Logic in One Lesson! 🐍'],
          // Asset "Python Programming Basic to Advanced" NOT in DB (71 assets) — removed.
          mats:  ['Python Fundamentals: Lecture Notes & Examples'],
          hw:    ['Python Practical Labs: 20 Hands-on Tasks'],
        },
        {
          title:        'Python Data Structures: Lists, Dictionaries & Advanced Looping',
          order:        2,
          // DB id: ICzjdBNZyGz2HoglBpyZ — EXACT match
          mats:  ['Python Fundamentals: Lecture Notes & Examples'],
          hw:    ['Python Practical Labs: 20 Hands-on Tasks',
                  'Python Data Structures & Loops: 20 Practical Challenges'],
        },
        {
          title:        'Python Functions Essentials: From Basics to Advanced Scope',
          order:        3,
          // DB id: yWtiq1yRRFIUyf3ifYNV — EXACT match
          mats:  ['Source Code: Python Functions & Modular Programming'],
          hw:    ['Python Functions Masterclass: 30 Practical Challenges',
                  'OOP & FUNCTION (LIGHT)'],
        },
        {
          title:        'From Functions to Objects: Smart Student Project & OOP Basics',
          order:        4,
          // DB id: Z0wweFhjmBzevMe8OGya — EXACT match
          // Currently in "Module 1 — Foundations" → will REASSIGN to Python Foundations
          alts:  ['From Functions to Objects'],
          mats:  [],
          hw:    [],
        },
        {
          title:        'OOP in Python Part 2',
          order:        5,
          // DB id: lIj15gLUZbCTsiYe4HA0
          // DB title has trailing space: "OOP in Python Part 2 "
          mats:  ['Mastering OOP in Python: The Complete Source Code & Guide'],
          hw:    ['Python Functions Masterclass: 30 Practical Challenges'],
        },
        {
          title:        'OOP in Python Part 3 + Final Project',
          order:        6,
          // DB id: 5OumelkH1IhpRl1tTHy0 — EXACT
          mats:  ['Library Management System (OOP Tutorial) Final Project'],
          hw:    [],
        },
      ],
    },

    // ══════════════════════════════════════════════════════════
    // MODULE 2 — Mathematics & Data Analysis
    // DB id: R1Up5vkSc1TkhSXxBhKh
    // ══════════════════════════════════════════════════════════
    {
      name: 'Mathematics & Data Analysis',
      order: 2,
      lectures: [
        {
          title:  'Mathematics for Data Science P1',
          order:  1,
          // DB id: 3l2tr7EcVzGhjMIQtal4 — EXACT
          mats:   ['Mathematics for Data Science Book'],
          // NOTE: "Numpy & Pandas (Complete Tutorial)" NOT in DB — "Pandas" exists.
          // "Numpy Guide " exists as id M38T5BkbQFm5ouHqTVht.
          hw:     [],
        },
        {
          title:  'Mathematics for Data Science P2 + NumPy',
          order:  2,
          // DB id: n82KqCV03He4DbXV0mx3
          // DB title: "Mathematics for Data Science P2 + Numpy" (lowercase N)
          alts:   ['Mathematics for Data Science P2 + Numpy'],
          mats:   ['Mathematics for Data Science Book',
                   'Numpy Guide '],               // DB title has trailing space
          hw:     [],
        },
        {
          title:  "Pandas: Python's Foundation for Data Manipulation",
          order:  3,
          // DB id: PGhpoKvFdHvIm0LUEbh4 — EXACT
          mats:   ['Pandas', 'Data File (Pokemon Data)'],
          hw:     ['Pandas Homework'],
        },
        {
          title:  'Master Data Visualization with Matplotlib & Seaborn | Beginner to Pro',
          order:  4,
          // DB id: jkhBEL37sg8ACnGGUqWS — EXACT
          // "Visualization Notes (Matplotlib & Seaborn)" does NOT exist in DB.
          // Confirmed DB material titles:
          mats:   ['Master Data Visualization with Matplotlib & Seaborn | Beginner to Pro',
                   'Mathematic & Visualization Quick Revision Session'],
          hw:     [],
        },
        {
          title:  'Capstone Project: Data Analysis with NumPy, Pandas, Matplotlib & Seaborn',
          order:  5,
          // DB id: riAVKvktpe9yxpOuHLMD
          // DB title: "📊 Capstone Project: Data Analysis with NumPy, Pandas, Matplotlib & Seaborn"
          alts:   ['📊 Capstone Project: Data Analysis with NumPy, Pandas, Matplotlib & Seaborn'],
          mats:   ['📊 Capstone Project: Data Analysis with NumPy, Pandas, Matplotlib & Seaborn'],
          // "Capstone Project Lab N" assets do NOT exist in DB.
          // Final Project Labs are DIFFERENT assets owned by the Final Project lecture.
          hw:     [],
        },
      ],
    },

    // ══════════════════════════════════════════════════════════
    // MODULE 3 — Data Preprocessing
    // DB id: 4slgZ0S9gfEbdzyZwSO0
    // DO NOT RENAME. Keep "Data Preprocessing" exactly.
    // DO NOT ARCHIVE old materials. Preserve as-is.
    // ══════════════════════════════════════════════════════════
    {
      name: 'Data Preprocessing',
      order: 3,
      lectures: [
        {
          title:           'Data Preprocessing P1',
          order:           1,
          preserveExisting: true,
          // DB id: A8V6TXSQwyNboq6wY87W — EXACT
          mats:  ['Data Preprocessing P1 Notebook',
                  'Comprehensive Guide to Data Preprocessing in Machine Learning'],
          hw:    [],
        },
        {
          title:           'Data Preprocessing P2',
          order:           2,
          preserveExisting: true,
          // DB id: 9gcSLdlXhYbq35dCiSNz — EXACT
          mats:  ['Comprehensive Guide to Data Preprocessing in Machine Learning'],
          hw:    [],
        },
        {
          title:           'Data Preprocessing P3',
          order:           3,
          preserveExisting: true,
          // DB id: 0YwZWsl6ehkjsRBABr3S — EXACT
          mats:  ['Comprehensive Guide to Data Preprocessing in Machine Learning'],
          hw:    [],
        },
        {
          title:           'Data Preprocessing P4',
          order:           4,
          preserveExisting: true,
          // DB id: EonyD6HciDv9bTCzczaQ — EXACT
          mats:  ['Comprehensive Guide to Data Preprocessing in Machine Learning'],
          hw:    [],
        },
        // Data Preprocessing P5 (DB id: 5lUKEyEjoHg1sVhJ8RLD) — NOT in target plan.
        // Preserved in DB as-is. Not touched.
      ],
    },

    // ══════════════════════════════════════════════════════════
    // MODULE 4 — Machine Learning
    // DB id: 8RKnHh6WoJ21SKp65h76
    // ══════════════════════════════════════════════════════════
    {
      name: 'Machine Learning',
      order: 4,
      lectures: [
        {
          title:  'Regression Analysis in Machine Learning: From Basics to Applications P1',
          order:  1,
          // DB id: HdhaxOzFFHSeoRu9LdpA — EXACT
          // DB asset title CONFIRMED: "Regression Analysis in Machine Learning: NoteBook - Data - Slides"
          mats:   ['Regression Analysis in Machine Learning: NoteBook - Data - Slides'],
          hw:     ['Lap 1'],
        },
        {
          title:  'Classification Models in Machine Learning: A Deep Dive',
          order:  2,
          // DB id: n0ftozww9D4W4PGPeuXv
          // DB title: "Classification Models in Machine Learning  A Deep Dive" (two spaces)
          alts:   ['Classification Models in Machine Learning A Deep Dive',
                   'Classification Models in Machine Learning  A Deep Dive'],
          mats:   ['Classification Models in Machine Learning 4 A Deep Dive (Notebook)'],
          hw:     ['Lap 2'],
        },
        {
          title:  'SVM Model and Application',
          order:  3,
          // DB id: MtrEziftUcK8j4F5A8OZ
          // DB title: "SVM Model and Applicaton" (typo — one 'i')
          alts:   ['SVM Model and Applicaton'],
          mats:   ['Classification Models in Machine Learning'],
          hw:     ['Lap 3'],
        },
        {
          title:  'State-of-the-Art Boosting Algorithms: A Professional Guide to Modern Ensemble Learning',
          order:  4,
          // DB id: 7X9QBBinFUzdF0QyjnuP
          // DB title: "State-of-the-Art Boosting Algorithms AProfessional Guide to Modern Ensemble Learning"
          alts:   ['State-of-the-Art Boosting Algorithms AProfessional Guide to Modern Ensemble Learning'],
          mats:   ['State-of-the-Art Boosting Algorithms AProfessional Guide to Modern Ensemble Learning'],
          hw:     ['Lap 4 '],  // DB title has trailing space
        },
        {
          title:  'ML Application',
          order:  5,
          // DB id: P1uTVHq0C3wYdZsm6PO6
          // DB title: "ML Applicattion" (double t typo)
          alts:   ['ML Applicattion'],
          // DB asset confirmed: "Unsupervised Machine Learning Notebook" (id: oqQUI3CX9K92rrBNOnMr)
          mats:   ['Unsupervised Machine Learning Notebook',
                   'ML Application'],  // also "ML Application" asset (id: 2bsyGOCJ4KgS0cB0b2pf)
          hw:     ['Lap 5'],
        },
        {
          title:        'Unsupervised Machine Learning: Practical Understanding beyond Classification',
          order:        6,
          // DB id: WgY6tkPdU0JM9GDsPdZE (was in unmatched list — now has exactDBTitle)
          exactDBTitle: 'Unsupervised Machine Learning Practical Understanding A clear, intuitive guide beyond classification and regression.',
          alts:         ['Unsupervised Machine Learning Practical Understanding'],
          mats:         ['Unsupervised Machine Learning Notebook',
                         'Unsupervised Machine Learning Practical Understanding A clear, intuitive guide beyond classification and regression.'],
          hw:           [],
        },
        {
          // LECTURE-ONLY MOVE: adds moduleId to lecture, does NOT touch any assets.
          // Materials and labs already linked to this lecture remain unchanged.
          // Backward compatibility and progress tracking preserved.
          title:           'Full Machine Learning Project 1',
          order:           7,
          // DB id: talZdvqvmIsfV6RwXite
          // DB title: "Full Machine learning Project 1" (lowercase 'l')
          alts:            ['Full Machine learning Project 1'],
          lectureOnlyMove: true,
          mats:            [],
          hw:              [],
        },
      ],
    },

    // ══════════════════════════════════════════════════════════
    // MODULE 5 — Deep Learning
    // DB id: TTvajPDQJCHXnHV7hlBW
    // Absorbs: Computer Vision (Whw3lRTN3ve3G9a8NX8X)
    //          Advanced Sequence Models (confirmed from Transformers lecture)
    // ══════════════════════════════════════════════════════════
    {
      name: 'Deep Learning',
      order: 5,
      lectures: [
        {
          title:  'Deep Learning Part 1',
          order:  1,
          // DB id: tsj1UL3Aee6wIaI8F8iI
          // DB title: "Deep Learning Part1" (no space before 1)
          alts:   ['Deep Learning Part1'],
          mats:   ['Deep Learning Notebook Part1', 'Deep Learning Part1'],
          hw:     ['DL Lab 1', 'DL Lab 2'],
        },
        {
          title:  'Deep Learning Part 2',
          order:  2,
          // DB id: 1lelnnGGmDGW29KhVpxf
          // DB title: "Deep Learning Part 2 " (trailing space)
          // NOTE: "Deep Learning Part 2 Notebook" does NOT exist in 71 assets.
          // Only "Deep Learning Part 4 Notebook" exists for multi-part notebooks.
          mats:   [],
          hw:     ['DL Lab 3', 'DL Lab 4', 'DL Lab 5'],
        },
        // NOTE: "Deep Learning Part 3" lecture does NOT exist in Firestore.
        // KP6dpYBO7kLEb7tHNWLh was referenced by DL Lab 6/7 but document is absent.
        // DL Lab 6/7 remain on their existing assignment — not touched.
        {
          title:  'Deep Learning Part 4',
          order:  3,
          // DB id: DFmsk79kF0MKgWJA9B27 — EXACT
          mats:   ['Deep Learning Part 4 Notebook'],
          hw:     ['DL Lab 8', 'DL Lab 9', 'DL Lab 10'],
        },

        // ── Transfer Learning (user-confirmed DB titles) ──
        {
          title:        'Transfer Learning: Fine-Tuning Pretrained Models',
          order:        4,
          // DB id: CFBebTQoziCLvv0OHDYZ
          exactDBTitle: 'Transfer Learning, Fine-Tuning Pretrained Models Fine-tune ResNet /VGG on data Custom dataset tuning Part 1',
          mats:         [],
          hw:           [],
        },
        {
          title:        'Transfer Learning Application',
          order:        5,
          // DB id: oP4gHYNEJtK8sXRPNSSf
          exactDBTitle: 'Transfer learning Application',
          alts:         ['Transfer learning Application'],
          mats:         ['CNN Exercise Notebook'],
          hw:           [],
        },

        // ── Image Fundamentals (user-confirmed DB title) ──
        {
          title:        'Image Fundamentals: Preprocessing, Convolution, Filters & Exercises',
          order:        6,
          // DB id: AAg6YbJSLsCBhhjvll0J
          exactDBTitle: ' Image Fundamentals, Preprocessing, Convolution & Filters Image processing & filter application Convolution exercises',
          // Note: leading space in DB title
          mats:         ['CNN Fundamental'],
          hw:           [],
        },

        // ── From old Computer Vision module ──
        {
          title:  'Computer Vision Object Detection: YOLO Basics',
          order:  7,
          // DB id: 6tStuV4Ty1iHYwQUEham
          // DB title: "Computer Vision Object Detection Yolo Basics"
          alts:   ['Computer Vision Object Detection Yolo Basics'],
          mats:   ['Computer Vision Object Detection Yolo Basics'],
          hw:     [],
        },
        {
          title:  'YOLO Application',
          order:  8,
          // DB id: izdVBv0Rx9hqBo7fcb11
          // DB title: "YOLO Application " (trailing space)
          mats:   ['CNN Application '],  // DB title: "CNN Application " (trailing space)
          hw:     [],
        },
        {
          title:  'Computer Vision Image Segmentation U-Net',
          order:  9,
          // DB id: V6poZXAURgJkRQWb2fxZ
          // DB title: "Computer Vision Image Segmentation U net"
          alts:   ['Computer Vision Image Segmentation U net',
                   'Computer Vision Image Segmentation Unet'],
          mats:   ['CNN Fundamental'],
          hw:     [],
        },
        {
          title:        'CNN App',
          order:        10,
          // DB id: W5Ja9MPCqUMZqzZmJlVq — EXACT
          exactDBTitle: 'CNN App',
          mats:         ['CNN Application '],  // trailing space in DB
          hw:           [],
        },

        // ── From old Advanced Sequence Models module ──
        {
          title:        'Transformers',
          order:        11,
          // DB id: Nwtc4DKHxVl0uKOJswEK — EXACT
          exactDBTitle: 'Transformers',
          // "Sequence Model (Transformers)" NOT in 71 assets — removed.
          mats:         [],
          hw:           ['Sequence model Lab'],  // DB title: "Sequence model Lab" (lowercase m)
        },

        // ── Vision Transformers ──
        {
          title:        'Vision Transformers Lecture',
          order:        12,
          // DB id: KkxNwNIf4BUMXKK4k2Wb
          // DB title: "vison transformers lecture " (typo: "vison" + trailing space)
          exactDBTitle: 'vison transformers lecture',
          alts:         ['Vision Transformer Lecture', 'vision transformers lecture'],
          // DB asset titles (both confirmed):
          // ixv2paOj0WfgL8scZI2O | "Hugging face pdf "  (trailing space)
          // hWqjiGonq2KZm1Kx2EXQ | "vison transformers  code" (two spaces + typo)
          mats:         ['Hugging face pdf ',
                         'vison transformers  code'],
          hw:           [],
        },

        // ── RCNN LSTM ──
        {
          title:  'RCNN LSTM',
          order:  13,
          // DB id: 4hXBQEq62JDXCKpqBJJk
          // DB title: "RCNN LSTM " (trailing space)
          // DB asset: ajQQc4m0XLwEVIAah9xQ | "RNN " (trailing space)
          mats:   ['RNN '],
          hw:     [],
        },
      ],
    },

  ], // end modules
};

/**
 * Lab / homework exact DB titles for reference.
 * Listed for documentation — actual matching done via mats/hw arrays above.
 */
export const LAB_TITLES_DB = [
  'Lap 1', 'Lap 2', 'Lap 3', 'Lap 4 ', 'Lap 5',       // note: "Lap 4 " has trailing space
  'DL Lab 1', 'DL Lab 2', 'DL Lab 3', 'DL Lab 4', 'DL Lab 5',
  'DL Lab 6', 'DL Lab 7', 'DL Lab 8', 'DL Lab 9', 'DL Lab 10',
  'Sequence model Lab',
  'Final Project Lab 1', 'Final Project Lab 2', 'Final Project Lab 3',
  'Final Project Lab 4', 'Final Project Lab 5', 'Final Project Lab 6',
  'Final Project Lab 7', 'Final Project Lab 8',
  'Python Practical Labs: 20 Hands-on Tasks',
  'Python Data Structures & Loops: 20 Practical Challenges',
  'Python Functions Masterclass: 30 Practical Challenges',
  'OOP & FUNCTION (LIGHT)',
  'Pandas Homework',
];
