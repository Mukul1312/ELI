/**
 * Seed data for CurriculumCatalog.
 * Covers JEE Main, NEET, and MHT-CET with core Physics, Chemistry, and Math/Biology topics.
 * ~150 topics — enough for launch; expand via ImportCurriculum for institute-specific needs.
 */

export interface SeedExam {
  name: string;
  slug: string;
  subjects: SeedSubject[];
}

export interface SeedSubject {
  name: string;
  units: SeedUnit[];
}

export interface SeedUnit {
  name: string;
  chapters: SeedChapter[];
}

export interface SeedChapter {
  name: string;
  topics: SeedTopic[];
}

export interface SeedTopic {
  name: string;
  aliases: string[];
}

export const SEED_EXAMS: SeedExam[] = [
  {
    name: 'JEE Main',
    slug: 'jee-main',
    subjects: [
      {
        name: 'Physics',
        units: [
          {
            name: 'Mechanics',
            chapters: [
              {
                name: 'Kinematics',
                topics: [
                  { name: 'Kinematics', aliases: ['motion', 'kinematics'] },
                  { name: 'Projectile Motion', aliases: ['projectile', 'projectile motion'] },
                  { name: 'Relative Motion', aliases: ['relative motion'] },
                ],
              },
              {
                name: 'Laws of Motion',
                topics: [
                  { name: 'Newton\'s Laws', aliases: ['newtons laws', 'nlt', 'laws of motion'] },
                  { name: 'Friction', aliases: ['friction'] },
                  { name: 'Circular Motion', aliases: ['circular motion'] },
                ],
              },
              {
                name: 'Work, Energy & Power',
                topics: [
                  { name: 'Work Energy Theorem', aliases: ['wet', 'work energy'] },
                  { name: 'Conservation of Energy', aliases: ['energy conservation'] },
                  { name: 'Power', aliases: ['power'] },
                ],
              },
              {
                name: 'Rotational Motion',
                topics: [
                  { name: 'Moment of Inertia', aliases: ['moi', 'moment of inertia'] },
                  { name: 'Angular Momentum', aliases: ['angular momentum'] },
                  { name: 'Torque', aliases: ['torque'] },
                ],
              },
              {
                name: 'Gravitation',
                topics: [
                  { name: 'Gravitation', aliases: ['gravity', 'gravitation'] },
                  { name: 'Orbital Mechanics', aliases: ['satellites', 'orbital'] },
                ],
              },
            ],
          },
          {
            name: 'Thermodynamics & Waves',
            chapters: [
              {
                name: 'Thermodynamics',
                topics: [
                  { name: 'Thermodynamics', aliases: ['thermo', 'thermodynamics'] },
                  { name: 'Kinetic Theory of Gases', aliases: ['ktg', 'kinetic theory'] },
                  { name: 'Heat Transfer', aliases: ['heat transfer', 'conduction convection'] },
                ],
              },
              {
                name: 'Waves & Oscillations',
                topics: [
                  { name: 'Simple Harmonic Motion', aliases: ['shm', 'simple harmonic'] },
                  { name: 'Wave Motion', aliases: ['waves', 'wave motion'] },
                  { name: 'Sound Waves', aliases: ['sound', 'acoustics'] },
                ],
              },
            ],
          },
          {
            name: 'Electromagnetism',
            chapters: [
              {
                name: 'Electrostatics',
                topics: [
                  { name: 'Electrostatics', aliases: ['electrostatics', 'coulombs law'] },
                  { name: 'Capacitance', aliases: ['capacitors', 'capacitance'] },
                  { name: 'Gauss\'s Law', aliases: ['gauss law', 'electric flux'] },
                ],
              },
              {
                name: 'Current Electricity',
                topics: [
                  { name: 'Current Electricity', aliases: ['current electricity', 'ohms law'] },
                  { name: 'Kirchhoff\'s Laws', aliases: ['kirchhoff', 'kcl kvl'] },
                ],
              },
              {
                name: 'Magnetism',
                topics: [
                  { name: 'Magnetic Effects of Current', aliases: ['biot savart', 'ampere law'] },
                  { name: 'Electromagnetic Induction', aliases: ['emi', 'faradays law'] },
                  { name: 'AC Circuits', aliases: ['ac', 'alternating current'] },
                ],
              },
            ],
          },
          {
            name: 'Optics & Modern Physics',
            chapters: [
              {
                name: 'Optics',
                topics: [
                  { name: 'Ray Optics', aliases: ['ray optics', 'reflection refraction'] },
                  { name: 'Wave Optics', aliases: ['wave optics', 'interference diffraction'] },
                ],
              },
              {
                name: 'Modern Physics',
                topics: [
                  { name: 'Photoelectric Effect', aliases: ['photoelectric', 'pee'] },
                  { name: 'Atomic Structure', aliases: ['bohr model', 'atomic structure'] },
                  { name: 'Nuclear Physics', aliases: ['nuclear', 'radioactivity'] },
                  { name: 'Semiconductors', aliases: ['semiconductors', 'pn junction'] },
                ],
              },
            ],
          },
        ],
      },
      {
        name: 'Chemistry',
        units: [
          {
            name: 'Physical Chemistry',
            chapters: [
              {
                name: 'Mole Concept & Stoichiometry',
                topics: [
                  { name: 'Mole Concept', aliases: ['mole concept', 'stoichiometry'] },
                ],
              },
              {
                name: 'Atomic Structure',
                topics: [
                  { name: 'Atomic Structure (Chemistry)', aliases: ['atomic structure chemistry', 'quantum numbers'] },
                ],
              },
              {
                name: 'Chemical Equilibrium',
                topics: [
                  { name: 'Chemical Equilibrium', aliases: ['equilibrium', 'le chateliers'] },
                  { name: 'Ionic Equilibrium', aliases: ['ionic equilibrium', 'ph'] },
                ],
              },
              {
                name: 'Thermodynamics & Thermochemistry',
                topics: [
                  { name: 'Chemical Thermodynamics', aliases: ['enthalpy', 'gibbs energy', 'chemical thermodynamics'] },
                ],
              },
              {
                name: 'Chemical Kinetics',
                topics: [
                  { name: 'Chemical Kinetics', aliases: ['kinetics', 'rate of reaction'] },
                ],
              },
              {
                name: 'Electrochemistry',
                topics: [
                  { name: 'Electrochemistry', aliases: ['electrochemistry', 'galvanic cell', 'nernst equation'] },
                ],
              },
            ],
          },
          {
            name: 'Organic Chemistry',
            chapters: [
              {
                name: 'General Organic Chemistry',
                topics: [
                  { name: 'GOC', aliases: ['goc', 'general organic chemistry', 'isomerism'] },
                ],
              },
              {
                name: 'Hydrocarbons',
                topics: [
                  { name: 'Hydrocarbons', aliases: ['alkanes', 'alkenes', 'alkynes', 'hydrocarbons'] },
                ],
              },
              {
                name: 'Functional Group Chemistry',
                topics: [
                  { name: 'Alcohols Phenols Ethers', aliases: ['alcohols', 'phenols', 'ethers'] },
                  { name: 'Aldehydes & Ketones', aliases: ['aldehydes', 'ketones', 'carbonyl'] },
                  { name: 'Carboxylic Acids', aliases: ['carboxylic acids', 'acid derivatives'] },
                  { name: 'Amines', aliases: ['amines', 'diazonium'] },
                ],
              },
            ],
          },
          {
            name: 'Inorganic Chemistry',
            chapters: [
              {
                name: 'Periodic Table & Bonding',
                topics: [
                  { name: 'Periodic Table', aliases: ['periodic table', 'periodic trends'] },
                  { name: 'Chemical Bonding', aliases: ['chemical bonding', 'vsepr', 'mot'] },
                ],
              },
              {
                name: 'Coordination Chemistry',
                topics: [
                  { name: 'Coordination Compounds', aliases: ['coordination compounds', 'ligands', 'cft'] },
                ],
              },
              {
                name: 'p-Block Elements',
                topics: [
                  { name: 'p-Block Elements', aliases: ['p block', 'halogens', 'noble gases'] },
                ],
              },
              {
                name: 'd and f-Block Elements',
                topics: [
                  { name: 'd-Block Elements', aliases: ['d block', 'transition metals'] },
                ],
              },
            ],
          },
        ],
      },
      {
        name: 'Mathematics',
        units: [
          {
            name: 'Algebra',
            chapters: [
              {
                name: 'Quadratic Equations',
                topics: [
                  { name: 'Quadratic Equations', aliases: ['quadratics', 'quadratic equations'] },
                ],
              },
              {
                name: 'Complex Numbers',
                topics: [
                  { name: 'Complex Numbers', aliases: ['complex numbers', 'argand plane'] },
                ],
              },
              {
                name: 'Matrices & Determinants',
                topics: [
                  { name: 'Matrices & Determinants', aliases: ['matrices', 'determinants'] },
                ],
              },
              {
                name: 'Permutations & Combinations',
                topics: [
                  { name: 'Permutations & Combinations', aliases: ['pnc', 'permutations', 'combinations'] },
                ],
              },
              {
                name: 'Binomial Theorem',
                topics: [
                  { name: 'Binomial Theorem', aliases: ['binomial', 'binomial theorem'] },
                ],
              },
              {
                name: 'Sequences & Series',
                topics: [
                  { name: 'Sequences & Series', aliases: ['ap', 'gp', 'sequences', 'series'] },
                ],
              },
            ],
          },
          {
            name: 'Calculus',
            chapters: [
              {
                name: 'Limits & Continuity',
                topics: [
                  { name: 'Limits & Continuity', aliases: ['limits', 'continuity'] },
                ],
              },
              {
                name: 'Differentiation',
                topics: [
                  { name: 'Differentiation', aliases: ['differentiation', 'derivatives'] },
                  { name: 'Application of Derivatives', aliases: ['aod', 'maxima minima', 'application of derivatives'] },
                ],
              },
              {
                name: 'Integration',
                topics: [
                  { name: 'Indefinite Integration', aliases: ['indefinite integration', 'antiderivatives'] },
                  { name: 'Definite Integration', aliases: ['definite integration', 'area under curve'] },
                ],
              },
              {
                name: 'Differential Equations',
                topics: [
                  { name: 'Differential Equations', aliases: ['ode', 'differential equations'] },
                ],
              },
            ],
          },
          {
            name: 'Coordinate Geometry',
            chapters: [
              {
                name: 'Straight Lines',
                topics: [
                  { name: 'Straight Lines', aliases: ['straight lines', 'coordinate geometry lines'] },
                ],
              },
              {
                name: 'Circles',
                topics: [
                  { name: 'Circles', aliases: ['circles', 'circle equations'] },
                ],
              },
              {
                name: 'Conics',
                topics: [
                  { name: 'Parabola', aliases: ['parabola'] },
                  { name: 'Ellipse', aliases: ['ellipse'] },
                  { name: 'Hyperbola', aliases: ['hyperbola'] },
                ],
              },
            ],
          },
          {
            name: 'Trigonometry & Vectors',
            chapters: [
              {
                name: 'Trigonometry',
                topics: [
                  { name: 'Trigonometric Functions', aliases: ['trigonometry', 'trig functions'] },
                  { name: 'Inverse Trigonometry', aliases: ['inverse trig', 'itf'] },
                ],
              },
              {
                name: 'Vectors & 3D Geometry',
                topics: [
                  { name: 'Vectors', aliases: ['vectors', 'vector algebra'] },
                  { name: '3D Geometry', aliases: ['3d geometry', 'lines and planes'] },
                ],
              },
            ],
          },
          {
            name: 'Probability & Statistics',
            chapters: [
              {
                name: 'Probability',
                topics: [
                  { name: 'Probability', aliases: ['probability', 'bayes theorem'] },
                ],
              },
              {
                name: 'Statistics',
                topics: [
                  { name: 'Statistics', aliases: ['statistics', 'mean median mode'] },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: 'NEET',
    slug: 'neet',
    subjects: [
      {
        name: 'Biology',
        units: [
          {
            name: 'Botany',
            chapters: [
              {
                name: 'Cell Biology',
                topics: [
                  { name: 'Cell Structure', aliases: ['cell structure', 'cell biology'] },
                  { name: 'Cell Division', aliases: ['mitosis', 'meiosis', 'cell division'] },
                ],
              },
              {
                name: 'Plant Physiology',
                topics: [
                  { name: 'Photosynthesis', aliases: ['photosynthesis'] },
                  { name: 'Plant Growth', aliases: ['plant growth', 'auxins'] },
                  { name: 'Transport in Plants', aliases: ['transpiration', 'transport in plants'] },
                ],
              },
              {
                name: 'Genetics',
                topics: [
                  { name: 'Mendelian Genetics', aliases: ['mendelian genetics', 'mendels laws'] },
                  { name: 'Molecular Biology', aliases: ['dna replication', 'transcription', 'molecular biology'] },
                ],
              },
              {
                name: 'Ecology',
                topics: [
                  { name: 'Ecology', aliases: ['ecology', 'ecosystem'] },
                  { name: 'Biodiversity', aliases: ['biodiversity', 'conservation'] },
                ],
              },
            ],
          },
          {
            name: 'Zoology',
            chapters: [
              {
                name: 'Human Physiology',
                topics: [
                  { name: 'Digestion & Absorption', aliases: ['digestion', 'digestive system'] },
                  { name: 'Breathing & Exchange of Gases', aliases: ['respiration', 'breathing'] },
                  { name: 'Body Fluids & Circulation', aliases: ['circulatory system', 'blood'] },
                  { name: 'Excretory System', aliases: ['excretion', 'kidney'] },
                  { name: 'Neural Control', aliases: ['nervous system', 'neural control'] },
                ],
              },
              {
                name: 'Human Reproduction',
                topics: [
                  { name: 'Human Reproduction', aliases: ['human reproduction', 'reproductive system'] },
                  { name: 'Reproductive Health', aliases: ['reproductive health', 'contraception'] },
                ],
              },
              {
                name: 'Evolution',
                topics: [
                  { name: 'Evolution', aliases: ['evolution', 'natural selection'] },
                ],
              },
            ],
          },
        ],
      },
      {
        name: 'Physics',
        units: [
          {
            name: 'NEET Physics Core',
            chapters: [
              {
                name: 'Mechanics (NEET)',
                topics: [
                  { name: 'Kinematics (NEET)', aliases: ['neet kinematics'] },
                  { name: 'Laws of Motion (NEET)', aliases: ['neet laws of motion'] },
                  { name: 'Work Energy Power (NEET)', aliases: ['neet wep'] },
                ],
              },
              {
                name: 'Electrostatics (NEET)',
                topics: [
                  { name: 'Electrostatics (NEET)', aliases: ['neet electrostatics'] },
                  { name: 'Current Electricity (NEET)', aliases: ['neet current electricity'] },
                ],
              },
              {
                name: 'Optics (NEET)',
                topics: [
                  { name: 'Ray Optics (NEET)', aliases: ['neet ray optics'] },
                  { name: 'Wave Optics (NEET)', aliases: ['neet wave optics'] },
                ],
              },
            ],
          },
        ],
      },
      {
        name: 'Chemistry',
        units: [
          {
            name: 'NEET Chemistry Core',
            chapters: [
              {
                name: 'Physical Chemistry (NEET)',
                topics: [
                  { name: 'Chemical Equilibrium (NEET)', aliases: ['neet equilibrium'] },
                  { name: 'Chemical Kinetics (NEET)', aliases: ['neet kinetics'] },
                ],
              },
              {
                name: 'Organic Chemistry (NEET)',
                topics: [
                  { name: 'Biomolecules', aliases: ['biomolecules', 'carbohydrates', 'proteins'] },
                  { name: 'Polymers', aliases: ['polymers'] },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    name: 'MHT-CET',
    slug: 'mht-cet',
    subjects: [
      {
        name: 'Physics',
        units: [
          {
            name: 'MHT-CET Physics',
            chapters: [
              {
                name: 'Rotational Dynamics',
                topics: [
                  { name: 'Rotational Dynamics (MHT-CET)', aliases: ['mht rotational'] },
                ],
              },
              {
                name: 'Oscillations',
                topics: [
                  { name: 'Oscillations (MHT-CET)', aliases: ['mht oscillations'] },
                ],
              },
              {
                name: 'Electrostatics (MHT-CET)',
                topics: [
                  { name: 'Electrostatics (MHT-CET)', aliases: ['mht electrostatics'] },
                ],
              },
            ],
          },
        ],
      },
      {
        name: 'Chemistry',
        units: [
          {
            name: 'MHT-CET Chemistry',
            chapters: [
              {
                name: 'Solid State',
                topics: [
                  { name: 'Solid State', aliases: ['solid state', 'crystal structure'] },
                ],
              },
              {
                name: 'Solutions',
                topics: [
                  { name: 'Solutions & Colligative Properties', aliases: ['solutions', 'colligative'] },
                ],
              },
            ],
          },
        ],
      },
      {
        name: 'Mathematics',
        units: [
          {
            name: 'MHT-CET Mathematics',
            chapters: [
              {
                name: 'Mathematical Logic',
                topics: [
                  { name: 'Mathematical Logic', aliases: ['mathematical logic', 'truth tables'] },
                ],
              },
              {
                name: 'Matrices (MHT-CET)',
                topics: [
                  { name: 'Matrices (MHT-CET)', aliases: ['mht matrices'] },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];
