/**
 * Seed data for CurriculumCatalog — JEE Main 2025 (Paper 1: B.E./B.Tech.)
 *
 * Source: Official JEE Main 2025 syllabus (NTA).
 *
 * Hierarchy mapping:
 *   Exam    → JEE Main
 *   Subject → Mathematics | Physics | Chemistry
 *   Unit    → Official unit names from the syllabus (e.g. "Limits, Continuity and Differentiability")
 *   Chapter → Logical grouping within a unit
 *   Topic   → One study-session granularity (what a student would study in 1–2 sittings)
 *
 * SEED_EDGES: prerequisite, related, and cross-subject relationships.
 *   prerequisite_of : sourceTopicName must be learned before targetTopicName
 *   related_to      : symmetric reinforcement between topics
 *   applied_in      : source concept directly applied in target (primary cross-subject vehicle)
 *
 * Edge lookup key: { examSlug, topicName } — names must match exactly.
 * Cross-subject edges use different subjectNames (or even different exams).
 */

// ─── Type definitions ─────────────────────────────────────────────────────────

export interface SeedTopic {
  name: string;
  aliases: string[];
}

export interface SeedChapter {
  name: string;
  topics: SeedTopic[];
}

export interface SeedUnit {
  name: string;
  chapters: SeedChapter[];
}

export interface SeedSubject {
  name: string;
  units: SeedUnit[];
}

export interface SeedExam {
  name: string;
  slug: string;
  subjects: SeedSubject[];
}

export type SeedEdgeType = 'prerequisite_of' | 'related_to' | 'applied_in';
export type SeedEdgeStrength = 'required' | 'recommended' | 'helpful';

export interface SeedEdge {
  /** Name of the source topic (must match a SeedTopic name exactly). */
  sourceTopic: string;
  /** Name of the target topic (must match a SeedTopic name exactly). */
  targetTopic: string;
  edgeType: SeedEdgeType;
  /** Required only for prerequisite_of edges. */
  strength?: SeedEdgeStrength;
  /** Set true when source and target are in different subjects. */
  crossSubject?: boolean;
  notes?: string;
}

// ─── JEE Main seed ────────────────────────────────────────────────────────────

export const SEED_EXAMS: SeedExam[] = [
  {
    name: 'JEE Main',
    slug: 'jee-main',
    subjects: [

      // ════════════════════════════════════════════════════════════════════════
      // MATHEMATICS  (14 official units)
      // ════════════════════════════════════════════════════════════════════════
      {
        name: 'Mathematics',
        units: [
          {
            name: 'Sets, Relations and Functions',
            chapters: [
              {
                name: 'Sets',
                topics: [
                  { name: 'Set Representation and Operations', aliases: ['sets', 'set theory', 'union intersection complement', 'venn diagram'] },
                  { name: 'Power Set and Cartesian Product', aliases: ['power set', 'cartesian product'] },
                ],
              },
              {
                name: 'Relations',
                topics: [
                  { name: 'Types of Relations', aliases: ['reflexive symmetric transitive', 'types of relations', 'relation'] },
                  { name: 'Equivalence Relations', aliases: ['equivalence relation', 'equivalence class'] },
                ],
              },
              {
                name: 'Functions',
                topics: [
                  { name: 'Types of Functions', aliases: ['one-one onto into functions', 'injective surjective bijective', 'types of functions'] },
                  { name: 'Composition and Inverse of Functions', aliases: ['composite function', 'inverse function', 'fog gof'] },
                ],
              },
            ],
          },

          {
            name: 'Complex Numbers and Quadratic Equations',
            chapters: [
              {
                name: 'Complex Numbers',
                topics: [
                  { name: 'Algebra of Complex Numbers', aliases: ['complex numbers', 'imaginary numbers', 'a+ib', 'complex arithmetic'] },
                  { name: 'Argand Plane and Polar Form', aliases: ['argand diagram', 'modulus argument', 'amplitude complex', 'polar form complex'] },
                ],
              },
              {
                name: 'Quadratic Equations',
                topics: [
                  { name: 'Nature of Roots and Discriminant', aliases: ['discriminant', 'nature of roots', 'quadratic formula'] },
                  { name: 'Formation and Properties of Quadratic Equations', aliases: ['sum product of roots', "vieta's formulas", 'formation of quadratic'] },
                ],
              },
            ],
          },

          {
            name: 'Matrices and Determinants',
            chapters: [
              {
                name: 'Matrices',
                topics: [
                  { name: 'Types and Algebra of Matrices', aliases: ['matrix operations', 'matrix multiplication', 'types of matrices', 'matrix addition'] },
                  { name: 'Transpose, Adjoint and Inverse of Matrix', aliases: ['adjoint matrix', 'inverse matrix', 'transpose'] },
                ],
              },
              {
                name: 'Determinants',
                topics: [
                  { name: 'Evaluation of Determinants', aliases: ['determinant', 'cofactor expansion', 'order 2 3 determinant'] },
                  { name: 'Applications of Determinants', aliases: ['area triangle determinant', "cramer's rule", 'consistency of equations', 'system of linear equations'] },
                ],
              },
            ],
          },

          {
            name: 'Permutations and Combinations',
            chapters: [
              {
                name: 'Counting Principles',
                topics: [
                  { name: 'Fundamental Principle of Counting', aliases: ['multiplication principle', 'addition principle', 'fundamental counting'] },
                  { name: 'Permutations P(n,r)', aliases: ['permutation', 'arrangement', 'nPr', 'P(n r)'] },
                  { name: 'Combinations C(n,r)', aliases: ['combination', 'selection', 'nCr', 'C(n r)', 'choose'] },
                ],
              },
            ],
          },

          {
            name: 'Binomial Theorem and Its Simple Applications',
            chapters: [
              {
                name: 'Binomial Theorem',
                topics: [
                  { name: 'Binomial Theorem and Expansion', aliases: ['binomial theorem', 'binomial expansion', 'binomial coefficients'] },
                  { name: 'General Term and Middle Term', aliases: ['general term binomial', 'middle term binomial', 'Tr+1', 'term in binomial expansion'] },
                ],
              },
            ],
          },

          {
            name: 'Sequence and Series',
            chapters: [
              {
                name: 'Arithmetic Progression',
                topics: [
                  { name: 'Arithmetic Progression', aliases: ['AP', 'arithmetic progression', 'arithmetic series', 'common difference'] },
                  { name: 'Arithmetic Mean', aliases: ['AM', 'arithmetic mean', 'insertion of AM'] },
                ],
              },
              {
                name: 'Geometric Progression',
                topics: [
                  { name: 'Geometric Progression', aliases: ['GP', 'geometric progression', 'geometric series', 'common ratio'] },
                  { name: 'Geometric Mean and AM-GM Inequality', aliases: ['GM', 'geometric mean', 'AM-GM inequality', 'AM GM relation', 'insertion of GM'] },
                ],
              },
            ],
          },

          {
            name: 'Limit, Continuity and Differentiability',
            chapters: [
              {
                name: 'Limits',
                topics: [
                  { name: 'Concept and Evaluation of Limits', aliases: ['limits', 'standard limits', 'lim x->a', 'limit evaluation', 'algebraic limits'] },
                  { name: 'Indeterminate Forms', aliases: ['indeterminate forms', '0/0 form', 'infinity/infinity', "l'hopital rule"] },
                ],
              },
              {
                name: 'Continuity',
                topics: [
                  { name: 'Continuity of Functions', aliases: ['continuous function', 'continuity', 'discontinuity', 'types of discontinuity'] },
                ],
              },
              {
                name: 'Differentiation',
                topics: [
                  { name: 'Differentiation Rules', aliases: ['differentiation', 'derivatives', 'dy/dx', 'sum product quotient rule'] },
                  { name: 'Chain Rule and Implicit Differentiation', aliases: ['chain rule', 'implicit differentiation', 'implicit function'] },
                  { name: 'Differentiation of Special Functions', aliases: ['differentiate log exp trig', 'logarithmic differentiation', 'differentiation of inverse trig'] },
                  { name: 'Higher Order Derivatives', aliases: ['second derivative', 'd2y/dx2', 'higher order derivatives'] },
                ],
              },
              {
                name: 'Applications of Derivatives',
                topics: [
                  { name: 'Rate of Change of Quantities', aliases: ['rate of change', 'related rates', 'dy/dt'] },
                  { name: 'Increasing and Decreasing Functions', aliases: ['monotonic functions', 'increasing decreasing', 'monotonicity'] },
                  { name: 'Maxima and Minima', aliases: ['maxima minima', 'local maximum minimum', 'AOD', 'global max min', 'application of derivatives'] },
                  { name: 'Tangents and Normals', aliases: ['tangent to curve', 'normal to curve', 'slope of tangent'] },
                ],
              },
            ],
          },

          {
            name: 'Integral Calculus',
            chapters: [
              {
                name: 'Indefinite Integration',
                topics: [
                  { name: 'Standard Integrals and Integration by Substitution', aliases: ['integration', 'antiderivative', 'integration by substitution', 'standard integrals'] },
                  { name: 'Integration by Parts', aliases: ['integration by parts', 'ILATE', 'LIATE', 'IBP'] },
                  { name: 'Integration by Partial Fractions', aliases: ['partial fractions', 'rational function integration', 'partial fraction decomposition'] },
                  { name: 'Integration Using Trigonometric Identities', aliases: ['trig integration', 'integration of sin cos', 'trigonometric substitution'] },
                ],
              },
              {
                name: 'Definite Integration',
                topics: [
                  { name: 'Properties of Definite Integrals', aliases: ['definite integral properties', 'definite integration properties', 'King property', 'property of definite integral'] },
                  { name: 'Standard Definite Integral Forms', aliases: ['standard integrals definite', 'definite integral formulas', 'fundamental theorem of calculus'] },
                ],
              },
              {
                name: 'Application of Integrals',
                topics: [
                  { name: 'Area Under and Between Curves', aliases: ['area under curve', 'area between curves', 'AOI', 'area bounded by curves'] },
                ],
              },
            ],
          },

          {
            name: 'Differential Equations',
            chapters: [
              {
                name: 'Differential Equations',
                topics: [
                  { name: 'Order, Degree and Formation of Differential Equations', aliases: ['differential equation', 'ODE', 'order degree DE', 'formation of DE'] },
                  { name: 'Variable Separable Method', aliases: ['separation of variables', 'separable differential equation', 'variable separable'] },
                  { name: 'Homogeneous Differential Equations', aliases: ['homogeneous DE', 'homogeneous differential equation'] },
                  { name: 'Linear Differential Equations', aliases: ['linear DE', 'integrating factor', 'dy/dx + Py = Q'] },
                ],
              },
            ],
          },

          {
            name: 'Co-ordinate Geometry',
            chapters: [
              {
                name: 'Straight Lines',
                topics: [
                  { name: 'Coordinate System and Distance Formula', aliases: ['cartesian coordinates', 'distance formula', 'section formula', 'locus'] },
                  { name: 'Equations of Straight Line', aliases: ['slope intercept form', 'two-point form', 'normal form', 'straight line equations', 'various forms of line'] },
                  { name: 'Angle Between Lines and Perpendicular Distance', aliases: ['angle between lines', 'distance from point to line', 'perpendicular distance', 'concurrent lines'] },
                ],
              },
              {
                name: 'Circle',
                topics: [
                  { name: 'Circle Equation and Properties', aliases: ['circle equation', 'standard form of circle', 'general equation circle', 'centre radius circle'] },
                  { name: 'Chord, Tangent and Line-Circle Intersection', aliases: ['chord of circle', 'tangent to circle', 'line circle intersection', 'power of point'] },
                ],
              },
              {
                name: 'Conic Sections',
                topics: [
                  { name: 'Parabola', aliases: ['parabola', 'y^2=4ax', 'x^2=4ay', 'conic parabola', 'parabola standard form'] },
                  { name: 'Ellipse', aliases: ['ellipse', 'x^2/a^2+y^2/b^2=1', 'conic ellipse', 'ellipse standard form'] },
                  { name: 'Hyperbola', aliases: ['hyperbola', 'rectangular hyperbola', 'conic hyperbola', 'hyperbola standard form'] },
                ],
              },
            ],
          },

          {
            name: 'Three Dimensional Geometry',
            chapters: [
              {
                name: 'Lines in 3D',
                topics: [
                  { name: 'Direction Cosines and Direction Ratios', aliases: ['direction cosines', 'direction ratios', 'DC DR', 'angle between 3D lines'] },
                  { name: 'Equations of Lines in 3D', aliases: ['line in 3D', 'vector form line', 'parametric form line', 'symmetric form'] },
                  { name: 'Skew Lines and Shortest Distance', aliases: ['skew lines', 'distance between skew lines', 'coplanar lines', 'shortest distance 3D'] },
                ],
              },
            ],
          },

          {
            name: 'Vector Algebra',
            chapters: [
              {
                name: 'Vectors',
                topics: [
                  { name: 'Vector Operations and Components', aliases: ['vectors', 'vector addition', 'components of vector', 'unit vector', 'position vector'] },
                  { name: 'Scalar (Dot) Product', aliases: ['dot product', 'scalar product', 'projection vector', 'work done vectors'] },
                  { name: 'Vector (Cross) Product', aliases: ['cross product', 'vector product', 'area triangle vectors', 'area parallelogram'] },
                ],
              },
            ],
          },

          {
            name: 'Statistics and Probability',
            chapters: [
              {
                name: 'Statistics',
                topics: [
                  { name: 'Measures of Central Tendency', aliases: ['mean median mode', 'central tendency', 'statistics', 'grouped ungrouped data'] },
                  { name: 'Measures of Dispersion', aliases: ['standard deviation', 'variance', 'mean deviation', 'range'] },
                ],
              },
              {
                name: 'Probability',
                topics: [
                  { name: 'Probability Theorems', aliases: ['probability', 'addition theorem probability', 'multiplication theorem', 'probability of event'] },
                  { name: "Bayes' Theorem and Conditional Probability", aliases: ["bayes theorem", 'conditional probability', 'total probability'] },
                  { name: 'Probability Distribution of Random Variable', aliases: ['probability distribution', 'random variable', 'discrete distribution', 'expected value'] },
                ],
              },
            ],
          },

          {
            name: 'Trigonometry',
            chapters: [
              {
                name: 'Trigonometric Functions',
                topics: [
                  { name: 'Trigonometric Identities and Equations', aliases: ['trig identities', 'trig equations', 'compound angles', 'double angle', 'half angle'] },
                  { name: 'Properties of Triangles', aliases: ['sine rule', 'cosine rule', 'solution of triangle', 'area of triangle trig'] },
                ],
              },
              {
                name: 'Inverse Trigonometric Functions',
                topics: [
                  { name: 'Inverse Trigonometric Functions', aliases: ['arcsin arccos arctan', 'ITF', 'inverse trig', 'sin^-1 cos^-1 tan^-1'] },
                  { name: 'Properties of Inverse Trig Functions', aliases: ['ITF properties', 'inverse trig identities', 'inverse trig range domain'] },
                ],
              },
            ],
          },
        ],
      },

      // ════════════════════════════════════════════════════════════════════════
      // PHYSICS  (20 official units; Unit 20 Experimental Skills excluded)
      // ════════════════════════════════════════════════════════════════════════
      {
        name: 'Physics',
        units: [
          {
            name: 'Units and Measurements',
            chapters: [
              {
                name: 'Measurement',
                topics: [
                  { name: 'SI Units and Dimensional Analysis', aliases: ['dimensions', 'dimensional analysis', 'SI units', 'derived fundamental units'] },
                  { name: 'Errors and Significant Figures', aliases: ['errors in measurement', 'least count', 'significant figures', 'absolute relative error'] },
                ],
              },
            ],
          },

          {
            name: 'Kinematics',
            chapters: [
              {
                name: 'Motion in One Dimension',
                topics: [
                  { name: 'Uniform and Non-Uniform Motion', aliases: ['kinematics 1D', 'velocity acceleration', 'uniform motion', 'average speed instantaneous velocity'] },
                  { name: 'Uniformly Accelerated Motion', aliases: ['SUVAT', 'equations of motion', 'UAM', 'uniformly accelerated'] },
                  { name: 'Velocity-Time and Position-Time Graphs', aliases: ['v-t graph', 'position-time graph', 'x-t graph', 'graphs of motion'] },
                ],
              },
              {
                name: 'Motion in a Plane',
                topics: [
                  { name: 'Projectile Motion', aliases: ['projectile', 'projectile motion', 'range height time of flight'] },
                  { name: 'Uniform Circular Motion', aliases: ['UCM', 'circular motion kinematics', 'angular velocity', 'centripetal acceleration'] },
                  { name: 'Relative Velocity', aliases: ['relative velocity', 'relative motion', 'river boat problem', 'frame of reference'] },
                ],
              },
            ],
          },

          {
            name: 'Laws of Motion',
            chapters: [
              {
                name: "Newton's Laws of Motion",
                topics: [
                  { name: "Newton's First and Second Law", aliases: ["newton's laws", 'F=ma', 'inertia', 'momentum', 'force and acceleration'] },
                  { name: "Newton's Third Law and Conservation of Momentum", aliases: ['newton third law', 'conservation of linear momentum', 'impulse', 'action reaction'] },
                  { name: 'Equilibrium of Concurrent Forces', aliases: ["equilibrium of forces", "lami's theorem", 'free body diagram', 'FBD'] },
                ],
              },
              {
                name: 'Friction',
                topics: [
                  { name: 'Laws of Friction', aliases: ['friction', 'static kinetic friction', 'coefficient of friction', 'rolling friction'] },
                ],
              },
              {
                name: 'Circular Dynamics',
                topics: [
                  { name: 'Centripetal Force and Applications', aliases: ['centripetal', 'centrifugal', 'banked road', 'conical pendulum', 'vehicle circular road'] },
                ],
              },
            ],
          },

          {
            name: 'Work, Energy and Power',
            chapters: [
              {
                name: 'Work and Energy',
                topics: [
                  { name: 'Work Done by Forces', aliases: ['work done', 'work constant variable force', 'work definition'] },
                  { name: 'Kinetic and Potential Energy', aliases: ['KE', 'PE', 'kinetic energy potential energy', 'mechanical energy'] },
                  { name: 'Work-Energy Theorem', aliases: ['work energy theorem', 'WET', 'net work = ΔKE'] },
                ],
              },
              {
                name: 'Conservation and Collisions',
                topics: [
                  { name: 'Conservation of Mechanical Energy', aliases: ['conservation of energy', 'mechanical energy conservation'] },
                  { name: 'Spring Potential Energy and Vertical Circle', aliases: ['spring energy', 'elastic PE', 'spring constant', 'motion in vertical circle'] },
                  { name: 'Elastic and Inelastic Collisions', aliases: ['elastic collision', 'inelastic collision', 'coefficient of restitution', 'perfectly inelastic'] },
                ],
              },
              {
                name: 'Power',
                topics: [
                  { name: 'Power', aliases: ['power', 'rate of work', 'watt', 'P=Fv'] },
                ],
              },
            ],
          },

          {
            name: 'Rotational Motion',
            chapters: [
              {
                name: 'Centre of Mass',
                topics: [
                  { name: 'Centre of Mass', aliases: ['centre of mass', 'COM', 'center of mass system', 'COM of rigid body'] },
                ],
              },
              {
                name: 'Torque and Angular Momentum',
                topics: [
                  { name: 'Torque and Angular Momentum', aliases: ['torque', 'angular momentum', 'moment of force', 'τ = r×F'] },
                  { name: 'Conservation of Angular Momentum', aliases: ['conservation angular momentum', 'angular impulse'] },
                ],
              },
              {
                name: 'Moment of Inertia',
                topics: [
                  { name: 'Moment of Inertia and Radius of Gyration', aliases: ['MOI', 'moment of inertia', 'radius of gyration', 'I = mr^2'] },
                  { name: 'Parallel and Perpendicular Axis Theorems', aliases: ['parallel axis theorem', 'perpendicular axis theorem', 'Steiner theorem'] },
                ],
              },
              {
                name: 'Rotational Kinematics and Dynamics',
                topics: [
                  { name: 'Equations of Rotational Motion', aliases: ['rotational motion equations', 'angular displacement velocity acceleration', 'rotational kinematics'] },
                  { name: 'Rolling Motion', aliases: ['rolling without slipping', 'rolling motion', 'rolling kinetic energy'] },
                ],
              },
            ],
          },

          {
            name: 'Gravitation',
            chapters: [
              {
                name: 'Gravitation',
                topics: [
                  { name: "Newton's Law of Gravitation", aliases: ['gravitation', "Newton's law of gravitation", 'G universal constant'] },
                  { name: 'Acceleration Due to Gravity and Its Variation', aliases: ['g', 'acceleration due to gravity', 'variation with height depth latitude'] },
                  { name: 'Gravitational Potential and Escape Velocity', aliases: ['gravitational potential', 'escape velocity', 'gravitational PE', 'gravitational potential energy'] },
                  { name: "Kepler's Laws and Satellite Motion", aliases: ["kepler's laws", 'satellite motion', 'orbital velocity', 'time period satellite', 'geostationary'] },
                ],
              },
            ],
          },

          {
            name: 'Properties of Solids and Liquids',
            chapters: [
              {
                name: 'Elasticity',
                topics: [
                  { name: "Stress, Strain and Hooke's Law", aliases: ['stress strain', "hooke's law", 'elastic limit', 'stress-strain curve'] },
                  { name: 'Elastic Moduli', aliases: ["young's modulus", 'bulk modulus', 'modulus of rigidity', 'shear modulus', 'elastic moduli'] },
                ],
              },
              {
                name: 'Fluid Mechanics',
                topics: [
                  { name: "Pressure in Fluids and Pascal's Law", aliases: ['fluid pressure', "pascal's law", 'atmospheric pressure', 'hydraulic lift'] },
                  { name: "Bernoulli's Principle", aliases: ["bernoulli's principle", 'venturimeter', 'continuity equation', "torricelli's theorem"] },
                  { name: 'Viscosity and Terminal Velocity', aliases: ['viscosity', "stokes' law", 'terminal velocity', 'streamline turbulent flow', 'critical velocity'] },
                ],
              },
              {
                name: 'Surface Tension',
                topics: [
                  { name: 'Surface Tension and Capillarity', aliases: ['surface tension', 'capillary rise', 'surface energy', 'angle of contact', 'excess pressure bubble'] },
                ],
              },
              {
                name: 'Thermal Properties',
                topics: [
                  { name: 'Thermal Expansion', aliases: ['thermal expansion', 'coefficient of linear expansion', 'cubical expansion', 'anomalous expansion water'] },
                  { name: 'Specific Heat and Calorimetry', aliases: ['specific heat', 'calorimetry', 'heat capacity', 'latent heat', 'change of state'] },
                  { name: 'Heat Transfer', aliases: ['conduction', 'convection', 'radiation', "newton's law of cooling", 'stefan-boltzmann', 'heat transfer'] },
                ],
              },
            ],
          },

          {
            name: 'Thermodynamics',
            chapters: [
              {
                name: 'Laws of Thermodynamics',
                topics: [
                  { name: 'First Law of Thermodynamics', aliases: ['first law thermodynamics', 'internal energy', 'thermodynamic work', 'ΔU = Q - W'] },
                  { name: 'Isothermal and Adiabatic Processes', aliases: ['isothermal', 'adiabatic', 'isobaric', 'isochoric', 'thermodynamic processes'] },
                  { name: 'Second Law of Thermodynamics', aliases: ['second law thermodynamics', 'entropy', 'heat engine efficiency', 'Carnot cycle', 'refrigerator COP'] },
                ],
              },
            ],
          },

          {
            name: 'Kinetic Theory of Gases',
            chapters: [
              {
                name: 'Kinetic Theory',
                topics: [
                  { name: 'Kinetic Theory and Ideal Gas Equation', aliases: ['kinetic theory', 'ideal gas', 'PV=nRT', 'equation of state', 'gas laws'] },
                  { name: 'RMS Speed and Kinetic Interpretation of Temperature', aliases: ['RMS speed', 'kinetic interpretation of temperature', 'maxwell distribution', 'mean speed'] },
                  { name: 'Degrees of Freedom and Law of Equipartition', aliases: ['degrees of freedom', 'equipartition of energy', 'Cv Cp', 'mean free path', "avogadro's number"] },
                ],
              },
            ],
          },

          {
            name: 'Oscillations and Waves',
            chapters: [
              {
                name: 'Simple Harmonic Motion',
                topics: [
                  { name: 'SHM Equation and Characteristics', aliases: ['SHM', 'simple harmonic motion', 'amplitude frequency phase', 'x = A sin(ωt+φ)'] },
                  { name: 'Energy in SHM and Spring Systems', aliases: ['energy SHM', 'spring-mass system', 'spring oscillation', 'KE PE in SHM'] },
                  { name: 'Simple Pendulum', aliases: ['simple pendulum', 'pendulum time period', 'T = 2π√(l/g)'] },
                ],
              },
              {
                name: 'Waves',
                topics: [
                  { name: 'Wave Motion and Progressive Waves', aliases: ['wave motion', 'transverse longitudinal wave', 'wave speed', 'progressive wave equation'] },
                  { name: 'Superposition and Standing Waves', aliases: ['superposition', 'standing waves', 'nodes antinodes', 'resonance strings pipes', 'harmonics'] },
                  { name: 'Beats and Doppler Effect', aliases: ['beats', 'doppler effect', 'apparent frequency', 'beat frequency'] },
                ],
              },
            ],
          },

          {
            name: 'Electrostatics',
            chapters: [
              {
                name: 'Electric Field',
                topics: [
                  { name: "Coulomb's Law and Superposition", aliases: ["coulomb's law", 'electric force', 'superposition principle charges', 'ke^2/r^2'] },
                  { name: 'Electric Field and Field Lines', aliases: ['electric field', 'E field', 'field due to point charge', 'electric field lines'] },
                  { name: 'Electric Dipole', aliases: ['electric dipole', 'dipole moment', 'torque on dipole', 'field due to dipole'] },
                ],
              },
              {
                name: "Gauss's Law",
                topics: [
                  { name: "Electric Flux and Gauss's Law", aliases: ["gauss's law", 'electric flux', 'applications of gauss law', 'infinite wire plane spherical shell'] },
                ],
              },
              {
                name: 'Electric Potential',
                topics: [
                  { name: 'Electric Potential Calculation', aliases: ['electric potential', 'potential due to point charge', 'potential difference', 'V = kq/r'] },
                  { name: 'Equipotential Surfaces and Potential Energy', aliases: ['equipotential surfaces', 'electric potential energy', 'work done by electric field'] },
                ],
              },
              {
                name: 'Capacitance',
                topics: [
                  { name: 'Capacitors and Combinations', aliases: ['capacitor', 'capacitance', 'series parallel capacitors', 'equivalent capacitance'] },
                  { name: 'Parallel Plate Capacitor and Energy', aliases: ['parallel plate capacitor', 'energy stored in capacitor', 'C = ε₀A/d'] },
                  { name: 'Dielectrics in Capacitors', aliases: ['dielectric', 'dielectric constant', 'polarization', 'dielectric in capacitor'] },
                ],
              },
            ],
          },

          {
            name: 'Current Electricity',
            chapters: [
              {
                name: 'Basic Circuit Theory',
                topics: [
                  { name: "Drift Velocity and Ohm's Law", aliases: ["ohm's law", 'drift velocity', 'electric current', 'V=IR', 'I-V characteristics'] },
                  { name: 'Resistance and Resistivity', aliases: ['resistance', 'resistivity', 'conductivity', 'temperature resistance', 'colour code'] },
                  { name: 'Power and Energy in Circuits', aliases: ['electric power', 'electrical energy', 'joule heating', 'P=I^2R', 'P=V^2/R'] },
                ],
              },
              {
                name: 'Circuit Analysis',
                topics: [
                  { name: "Kirchhoff's Laws", aliases: ["kirchhoff's laws", 'KCL', 'KVL', 'loop analysis', 'junction rule loop rule'] },
                  { name: 'Wheatstone Bridge and Metre Bridge', aliases: ['wheatstone bridge', 'metre bridge', 'potentiometer', 'balanced bridge'] },
                  { name: 'Cells and EMF', aliases: ['EMF', 'internal resistance', 'cells in series parallel', 'terminal voltage', 'electromotive force'] },
                ],
              },
            ],
          },

          {
            name: 'Magnetic Effects of Current and Magnetism',
            chapters: [
              {
                name: 'Magnetic Effects of Current',
                topics: [
                  { name: 'Biot-Savart Law', aliases: ['biot-savart law', 'magnetic field due to current', 'B field circular loop'] },
                  { name: "Ampere's Law and Applications", aliases: ["ampere's law", 'solenoid field', 'toroid', 'infinite wire magnetic field'] },
                  { name: 'Force on Charges and Current-Carrying Conductors', aliases: ['force on moving charge', 'force on current conductor', 'F=qvB', 'F=BIL', 'Hall effect'] },
                  { name: 'Galvanometer and Its Conversions', aliases: ['galvanometer', 'ammeter', 'voltmeter', 'moving coil galvanometer', 'shunt'] },
                ],
              },
              {
                name: 'Magnetism',
                topics: [
                  { name: 'Magnetic Dipole and Bar Magnet', aliases: ['magnetic dipole', 'bar magnet', 'solenoid as dipole', 'magnetic field bar magnet'] },
                  { name: 'Magnetic Properties of Materials', aliases: ['diamagnetic', 'paramagnetic', 'ferromagnetic', 'curie temperature', 'hysteresis'] },
                ],
              },
            ],
          },

          {
            name: 'Electromagnetic Induction and Alternating Currents',
            chapters: [
              {
                name: 'Electromagnetic Induction',
                topics: [
                  { name: "Faraday's Law and Lenz's Law", aliases: ["faraday's law", "lenz's law", 'induced EMF', 'magnetic flux', 'e = -dΦ/dt'] },
                  { name: 'Self and Mutual Inductance', aliases: ['self inductance', 'mutual inductance', 'inductor', 'L', 'e = -L dI/dt'] },
                  { name: 'Eddy Currents', aliases: ['eddy currents', 'applications of eddy currents', 'Foucault currents'] },
                ],
              },
              {
                name: 'Alternating Currents',
                topics: [
                  { name: 'AC Fundamentals', aliases: ['AC', 'alternating current', 'peak RMS values', 'phasors', 'alternating voltage'] },
                  { name: 'Reactance and Impedance', aliases: ['inductive reactance', 'capacitive reactance', 'impedance', 'XL XC Z'] },
                  { name: 'LCR Series Circuit and Resonance', aliases: ['LCR circuit', 'series resonance', 'resonant frequency', 'Q factor'] },
                  { name: 'Power in AC and Transformer', aliases: ['AC power', 'power factor', 'wattless current', 'transformer', 'turns ratio'] },
                ],
              },
            ],
          },

          {
            name: 'Electromagnetic Waves',
            chapters: [
              {
                name: 'EM Waves',
                topics: [
                  { name: 'EM Wave Properties and Displacement Current', aliases: ['electromagnetic waves', 'transverse EM wave', 'displacement current', 'oscillating E B fields'] },
                  { name: 'Electromagnetic Spectrum', aliases: ['EM spectrum', 'radio microwaves infrared visible UV X-ray gamma', 'electromagnetic spectrum'] },
                ],
              },
            ],
          },

          {
            name: 'Optics',
            chapters: [
              {
                name: 'Ray Optics',
                topics: [
                  { name: 'Reflection and Spherical Mirrors', aliases: ['reflection', 'mirror formula', 'spherical mirrors', 'concave convex mirror', 'magnification mirror'] },
                  { name: 'Refraction and Total Internal Reflection', aliases: ['refraction', "snell's law", 'TIR', 'critical angle', 'optical fiber'] },
                  { name: 'Lenses and Lens Formula', aliases: ['lens formula', 'lens maker formula', 'thin lens', 'power of lens', 'magnification lens'] },
                  { name: 'Prism and Dispersion', aliases: ['prism', 'deviation prism', 'refractive index', 'dispersion of light'] },
                  { name: 'Optical Instruments', aliases: ['microscope', 'telescope', 'magnifying glass', 'magnifying power', 'eye', 'visual angle'] },
                ],
              },
              {
                name: 'Wave Optics',
                topics: [
                  { name: "Huygens' Principle", aliases: ["huygens' principle", 'wavefront', 'wave theory of light', 'huygens'] },
                  { name: "Young's Double Slit Experiment", aliases: ['YDSE', "young's double slit", 'interference', 'fringe width', 'coherent sources'] },
                  { name: 'Diffraction', aliases: ['diffraction', 'single slit diffraction', 'central maximum', 'secondary maxima'] },
                  { name: 'Polarization', aliases: ['polarization', 'polaroid', "brewster's angle", 'plane polarized light', 'law of malus'] },
                ],
              },
            ],
          },

          {
            name: 'Dual Nature of Matter and Radiation',
            chapters: [
              {
                name: 'Quantum Nature',
                topics: [
                  { name: 'Photoelectric Effect', aliases: ['photoelectric effect', 'work function', 'threshold frequency', 'stopping potential', "einstein's photoelectric equation"] },
                  { name: 'de Broglie Waves and Matter Waves', aliases: ['de broglie', 'matter waves', 'wave nature of particles', 'de broglie wavelength'] },
                ],
              },
            ],
          },

          {
            name: 'Atoms and Nuclei',
            chapters: [
              {
                name: 'Atomic Structure',
                topics: [
                  { name: "Rutherford's Atomic Model", aliases: ['rutherford model', 'alpha scattering', 'nuclear model of atom', 'geiger marsden'] },
                  { name: "Bohr's Model and Hydrogen Spectrum", aliases: ["bohr's model", 'energy levels atom', 'hydrogen spectrum', 'spectral series', 'bohr radius'] },
                ],
              },
              {
                name: 'Nuclear Physics',
                topics: [
                  { name: 'Nuclear Composition and Size', aliases: ['nucleus', 'proton neutron', 'atomic mass number', 'nuclear size density'] },
                  { name: 'Mass Defect and Binding Energy', aliases: ['mass defect', 'binding energy', 'binding energy per nucleon', 'mass-energy equivalence', 'E=mc^2'] },
                  { name: 'Radioactivity', aliases: ['radioactivity', 'alpha beta gamma decay', 'half-life', 'radioactive decay law'] },
                  { name: 'Nuclear Fission and Fusion', aliases: ['fission', 'fusion', 'chain reaction', 'nuclear reactor', 'nuclear energy'] },
                ],
              },
            ],
          },

          {
            name: 'Electronic Devices',
            chapters: [
              {
                name: 'Semiconductor Devices',
                topics: [
                  { name: 'Semiconductors and p-n Junction', aliases: ['semiconductor', 'p-n junction', 'diode', 'intrinsic extrinsic semiconductor', 'doping'] },
                  { name: 'Rectifier and Diode Applications', aliases: ['rectifier', 'half wave full wave rectifier', 'LED', 'photodiode', 'solar cell'] },
                  { name: 'Zener Diode', aliases: ['zener diode', 'voltage regulator', 'breakdown voltage', 'zener breakdown'] },
                ],
              },
              {
                name: 'Logic Gates',
                topics: [
                  { name: 'Basic Logic Gates', aliases: ['logic gates', 'AND OR NOT NAND NOR', 'boolean algebra', 'truth table', 'digital electronics'] },
                ],
              },
            ],
          },
        ],
      },

      // ════════════════════════════════════════════════════════════════════════
      // CHEMISTRY  (Physical: U1–8 | Inorganic: U9–12 | Organic: U13–20)
      // ════════════════════════════════════════════════════════════════════════
      {
        name: 'Chemistry',
        units: [
          // ─── Physical Chemistry ──────────────────────────────────────────
          {
            name: 'Some Basic Concepts in Chemistry',
            chapters: [
              {
                name: 'Mole Concept',
                topics: [
                  { name: 'Atomic and Molecular Masses', aliases: ['atomic mass', 'molecular mass', 'molar mass', 'amu', 'gram atomic mass'] },
                  { name: 'Mole Concept and Avogadro Number', aliases: ['mole concept', "avogadro's number", 'mole', 'number of moles'] },
                  { name: 'Stoichiometry and Chemical Equations', aliases: ['stoichiometry', 'balancing equations', 'limiting reagent', 'percentage composition'] },
                  { name: 'Empirical and Molecular Formulae', aliases: ['empirical formula', 'molecular formula', 'percentage composition empirical'] },
                ],
              },
            ],
          },

          {
            name: 'Atomic Structure',
            chapters: [
              {
                name: 'Atomic Models and Quantum Mechanics',
                topics: [
                  { name: 'Bohr Model of Hydrogen Atom (Chemistry)', aliases: ['bohr model chemistry', 'energy levels hydrogen', 'bohr postulates', 'limitations of bohr'] },
                  { name: 'Quantum Mechanical Model and Orbitals', aliases: ['quantum mechanics atom', 'orbital', 'wave function', 'heisenberg uncertainty', 'dual nature matter'] },
                  { name: 'Quantum Numbers and Electronic Configuration', aliases: ['quantum numbers', 'electronic configuration', 'aufbau principle', "hund's rule", 'pauli exclusion', 'extra stability filled half-filled'] },
                ],
              },
            ],
          },

          {
            name: 'Chemical Bonding and Molecular Structure',
            chapters: [
              {
                name: 'Ionic and Covalent Bonding',
                topics: [
                  { name: 'Ionic Bond Formation and Lattice Enthalpy', aliases: ['ionic bond', 'lattice enthalpy', 'ionic compound', 'born haber cycle'] },
                  { name: 'Covalent Bond and VSEPR Theory', aliases: ['covalent bond', 'VSEPR', 'shapes of molecules', 'bond angle', 'lewis structure'] },
                  { name: "Electronegativity and Fajan's Rules", aliases: ['electronegativity', "fajan's rules", 'bond polarity', 'dipole moment', 'partial ionic character'] },
                ],
              },
              {
                name: 'Advanced Bonding',
                topics: [
                  { name: 'Valence Bond Theory and Hybridization', aliases: ['VBT', 'hybridization', 'sp sp2 sp3', 'orbital overlap', 'sigma pi bond bonding'] },
                  { name: 'Molecular Orbital Theory', aliases: ['MOT', 'LCAO', 'bonding antibonding orbitals', 'bond order', 'MO diagram'] },
                  { name: 'Hydrogen Bonding', aliases: ['hydrogen bond', 'H bond', 'intermolecular hydrogen bonding', 'intramolecular H bond'] },
                ],
              },
            ],
          },

          {
            name: 'Chemical Thermodynamics',
            chapters: [
              {
                name: 'Thermodynamics',
                topics: [
                  { name: 'First Law and Internal Energy (Chemistry)', aliases: ['first law thermodynamics chemistry', 'enthalpy', "hess's law", 'internal energy chemistry', 'ΔH'] },
                  { name: 'Enthalpies of Reactions', aliases: ['enthalpy of combustion', 'enthalpy of formation', 'bond dissociation enthalpy', 'thermochemistry', 'born haber'] },
                  { name: 'Second Law and Gibbs Energy', aliases: ['entropy', 'second law chemistry', 'gibbs free energy', 'ΔG', 'spontaneity', 'gibbs energy'] },
                  { name: 'Gibbs Energy and Equilibrium Constant', aliases: ['ΔG and Keq', 'ΔG° = -RTlnK', 'gibbs equilibrium', 'standard gibbs energy'] },
                ],
              },
            ],
          },

          {
            name: 'Solutions',
            chapters: [
              {
                name: 'Solutions',
                topics: [
                  { name: 'Concentration Methods', aliases: ['molality', 'molarity', 'mole fraction', 'normality', 'solution concentration', 'ppm'] },
                  { name: "Vapour Pressure and Raoult's Law", aliases: ["raoult's law", 'vapour pressure', 'ideal non-ideal solutions', 'vapour pressure depression'] },
                  { name: 'Colligative Properties', aliases: ['colligative properties', 'depression of freezing point', 'elevation of boiling point', 'osmotic pressure', 'relative lowering'] },
                  { name: "van't Hoff Factor", aliases: ["van't hoff factor", 'degree of dissociation', 'abnormal molar mass', 'i factor'] },
                ],
              },
            ],
          },

          {
            name: 'Equilibrium',
            chapters: [
              {
                name: 'Chemical Equilibrium',
                topics: [
                  { name: 'Law of Chemical Equilibrium', aliases: ['Kp Kc', 'equilibrium constant', 'law of mass action', 'equilibrium expression'] },
                  { name: "Le Chatelier's Principle", aliases: ["le chatelier's principle", 'factors affecting equilibrium', 'effect of pressure temperature concentration'] },
                ],
              },
              {
                name: 'Ionic Equilibrium',
                topics: [
                  { name: 'Acid-Base Concepts', aliases: ['acid base', 'arrhenius bronsted lewis', 'conjugate acid base pair', 'concepts of acids bases'] },
                  { name: 'pH Scale and Degree of Ionization', aliases: ['pH', 'pOH', 'Ka Kb', 'ionic product of water', 'degree of ionization', 'weak acid base'] },
                  { name: 'Buffer Solutions', aliases: ['buffer', 'henderson-hasselbalch', 'buffer capacity', 'acidic basic buffer'] },
                  { name: 'Solubility Product', aliases: ['Ksp', 'solubility product', 'common ion effect', 'precipitation'] },
                ],
              },
            ],
          },

          {
            name: 'Redox Reactions and Electrochemistry',
            chapters: [
              {
                name: 'Redox Reactions',
                topics: [
                  { name: 'Oxidation Number and Redox Balancing', aliases: ['oxidation number', 'oxidation state', 'redox reaction', 'balancing redox', 'half-reaction method'] },
                ],
              },
              {
                name: 'Electrochemistry',
                topics: [
                  { name: 'Electrochemical Cells and EMF', aliases: ['electrochemical cell', 'galvanic cell', 'SHE', 'standard electrode potential', 'cell EMF'] },
                  { name: 'Nernst Equation', aliases: ['nernst equation', 'concentration cell', 'electrode potential concentration', 'E = E° - RT/nF lnQ'] },
                  { name: 'Electrolysis and Faraday Laws', aliases: ['electrolysis', "faraday's law", 'electrolytic cell', 'electroplating'] },
                  { name: 'Conductance and Kohlrausch Law', aliases: ['molar conductance', "kohlrausch's law", 'electrolytic conductance', 'equivalent conductance'] },
                ],
              },
            ],
          },

          {
            name: 'Chemical Kinetics',
            chapters: [
              {
                name: 'Chemical Kinetics',
                topics: [
                  { name: 'Rate Laws and Rate Constant', aliases: ['rate of reaction', 'rate law', 'rate constant k', 'rate expression'] },
                  { name: 'Order and Molecularity of Reactions', aliases: ['order of reaction', 'molecularity', 'zero order first order', 'pseudo first order'] },
                  { name: 'Integrated Rate Laws and Half-Life', aliases: ['integrated rate law', 'half-life', 'first order kinetics', 't1/2'] },
                  { name: 'Activation Energy and Arrhenius Equation', aliases: ['activation energy', 'arrhenius equation', 'temperature effect kinetics', 'Ea', 'collision theory'] },
                ],
              },
            ],
          },

          // ─── Inorganic Chemistry ─────────────────────────────────────────
          {
            name: 'Classification of Elements and Periodicity in Properties',
            chapters: [
              {
                name: 'Periodic Table',
                topics: [
                  { name: 'Modern Periodic Law and Table', aliases: ['periodic table', 'periodic law', 's p d f blocks', 'modern periodic table'] },
                  { name: 'Periodic Trends', aliases: ['periodic trends', 'atomic radius', 'ionization enthalpy', 'electron gain enthalpy', 'electronegativity trends'] },
                ],
              },
            ],
          },

          {
            name: 'p-Block Elements',
            chapters: [
              {
                name: 'p-Block',
                topics: [
                  { name: 'Group 13 and 14 Elements', aliases: ['group 13 14', 'boron aluminium', 'carbon silicon', 'p-block 13 14', 'boron family carbon family'] },
                  { name: 'Group 15 Elements', aliases: ['group 15', 'nitrogen phosphorus', 'nitrogen family', 'p-block 15', 'oxides of nitrogen phosphorus'] },
                  { name: 'Group 16 Elements', aliases: ['group 16', 'oxygen sulphur', 'chalcogens', 'p-block 16', 'SO2 H2SO4 H2S'] },
                  { name: 'Group 17 — Halogens', aliases: ['halogens', 'fluorine chlorine bromine iodine', 'group 17', 'interhalogen compounds', 'hydrogen halides'] },
                  { name: 'Group 18 — Noble Gases', aliases: ['noble gases', 'inert gases', 'group 18', 'xenon compounds', 'helium neon argon'] },
                ],
              },
            ],
          },

          {
            name: 'd and f-Block Elements',
            chapters: [
              {
                name: 'Transition and Inner Transition Metals',
                topics: [
                  { name: 'Transition Metals — Electronic Configuration and Properties', aliases: ['transition metals', 'd-block', 'first row transition', 'variable oxidation state', 'coloured compounds'] },
                  { name: 'K₂Cr₂O₇ and KMnO₄', aliases: ['potassium dichromate', 'potassium permanganate', 'K2Cr2O7', 'KMnO4', 'oxidizing agents inorganic'] },
                  { name: 'Lanthanoids and Actinoids', aliases: ['lanthanoids', 'actinoids', 'f-block', 'lanthanide contraction', 'rare earth'] },
                ],
              },
            ],
          },

          {
            name: 'Coordination Compounds',
            chapters: [
              {
                name: 'Coordination Chemistry',
                topics: [
                  { name: "Werner's Theory and IUPAC Nomenclature", aliases: ["werner's theory", 'ligands', 'coordination number', 'IUPAC nomenclature coordination', 'denticity chelation'] },
                  { name: 'Isomerism in Coordination Compounds', aliases: ['isomerism coordination', 'geometric isomers coordination', 'optical isomers coordination', 'structural isomerism coordination'] },
                  { name: 'Bonding — VBT and Crystal Field Theory', aliases: ['VBT coordination', 'crystal field theory', 'CFT', 'splitting', 'CFSE', 'high low spin'] },
                  { name: 'Colour and Magnetic Properties of Complexes', aliases: ['colour coordination compounds', 'magnetic moment', 'unpaired electrons', 'colour transition metal'] },
                ],
              },
            ],
          },

          // ─── Organic Chemistry ───────────────────────────────────────────
          {
            name: 'Purification and Characterisation of Organic Compounds',
            chapters: [
              {
                name: 'Organic Analysis',
                topics: [
                  { name: 'Purification Techniques', aliases: ['crystallization', 'distillation', 'chromatography', 'sublimation', 'purification organic'] },
                  { name: 'Qualitative and Quantitative Analysis', aliases: ["lassaigne's test", 'qualitative analysis organic', 'nitrogen sulphur halogen detection', 'quantitative analysis organic'] },
                ],
              },
            ],
          },

          {
            name: 'Some Basic Principles of Organic Chemistry',
            chapters: [
              {
                name: 'Structure and Nomenclature',
                topics: [
                  { name: 'Hybridization and Bond Types in Organic', aliases: ['hybridization organic', 'sp sp2 sp3 carbon', 'sigma pi bond organic', 'tetrahedral planar linear carbon'] },
                  { name: 'IUPAC Nomenclature of Organic Compounds', aliases: ['IUPAC nomenclature organic', 'naming organic compounds', 'functional group nomenclature'] },
                  { name: 'Isomerism in Organic Compounds', aliases: ['structural isomerism', 'stereoisomerism', 'geometric isomers organic', 'optical isomers organic', 'enantiomers'] },
                ],
              },
              {
                name: 'Reaction Mechanisms',
                topics: [
                  { name: 'Bond Fission and Reactive Intermediates', aliases: ['homolytic heterolytic fission', 'carbocation carbanion free radical', 'electrophile nucleophile'] },
                  { name: 'Electronic Effects in Organic', aliases: ['inductive effect', 'resonance effect', 'hyperconjugation', 'mesomeric effect', 'electronic effects organic'] },
                  { name: 'Types of Organic Reactions', aliases: ['substitution addition elimination rearrangement', 'nucleophilic electrophilic', 'types of organic reactions'] },
                ],
              },
            ],
          },

          {
            name: 'Hydrocarbons',
            chapters: [
              {
                name: 'Aliphatic Hydrocarbons',
                topics: [
                  { name: 'Alkanes', aliases: ['alkanes', 'methane ethane propane', 'conformations alkane', 'halogenation alkane', 'sawhorse newman projection'] },
                  { name: 'Alkenes', aliases: ['alkenes', 'ethylene propylene', 'electrophilic addition alkene', 'Markovnikov rule', 'ozonolysis polymerization'] },
                  { name: 'Alkynes', aliases: ['alkynes', 'acetylene', 'addition to alkynes', 'acidic character alkynes'] },
                ],
              },
              {
                name: 'Aromatic Hydrocarbons',
                topics: [
                  { name: 'Benzene and Aromaticity', aliases: ['benzene', 'aromaticity', 'resonance benzene', 'huckel rule', 'aromatic anti-aromatic'] },
                  { name: 'Electrophilic Aromatic Substitution', aliases: ['EAS', 'halogenation benzene', 'nitration', 'friedel-crafts', 'directive influence', 'sulphonation benzene'] },
                ],
              },
            ],
          },

          {
            name: 'Organic Compounds Containing Halogens',
            chapters: [
              {
                name: 'Halogenated Compounds',
                topics: [
                  { name: 'Haloalkanes — Preparation and Properties', aliases: ['haloalkanes', 'alkyl halides', 'R-X', 'preparation of haloalkanes', 'C-X bond'] },
                  { name: 'SN1 and SN2 Mechanisms', aliases: ['SN1', 'SN2', 'nucleophilic substitution', 'substitution mechanism', 'stereochemistry SN1 SN2'] },
                  { name: 'Haloarenes', aliases: ['haloarenes', 'chlorobenzene', 'aryl halides', 'nucleophilic aromatic substitution'] },
                ],
              },
            ],
          },

          {
            name: 'Organic Compounds Containing Oxygen',
            chapters: [
              {
                name: 'Alcohols, Phenols and Ethers',
                topics: [
                  { name: 'Alcohols', aliases: ['alcohols', 'ethanol', 'dehydration of alcohol', 'primary secondary tertiary alcohol', 'Lucas test'] },
                  { name: 'Phenols', aliases: ['phenols', 'phenol reactions', 'acidic nature of phenol', 'nitration sulphonation phenol', 'reimer-tiemann'] },
                  { name: 'Ethers', aliases: ['ethers', 'diethyl ether', 'williamson synthesis', 'cleavage of ethers'] },
                ],
              },
              {
                name: 'Carbonyl Compounds',
                topics: [
                  { name: 'Aldehydes and Ketones', aliases: ['aldehydes', 'ketones', 'carbonyl group', 'nucleophilic addition carbonyl', 'Grignard carbonyl'] },
                  { name: 'Named Reactions of Carbonyl Compounds', aliases: ['aldol condensation', 'cannizzaro reaction', 'clemmensen reduction', 'wolf-kishner', 'haloform reaction'] },
                  { name: 'Carboxylic Acids', aliases: ['carboxylic acids', 'COOH', 'acidity of carboxylic acids', 'carboxylic acid reactions'] },
                  { name: 'Acid Derivatives', aliases: ['acid chloride', 'ester', 'amide', 'acid anhydride', 'acid derivatives organic'] },
                ],
              },
            ],
          },

          {
            name: 'Organic Compounds Containing Nitrogen',
            chapters: [
              {
                name: 'Nitrogen Compounds',
                topics: [
                  { name: 'Amines', aliases: ['amines', 'amine basicity', 'primary secondary tertiary amine', 'aniline', 'preparation of amines'] },
                  { name: 'Diazonium Salts', aliases: ['diazonium salts', 'diazotization', 'coupling reaction', 'sandmeyer reaction'] },
                ],
              },
            ],
          },

          {
            name: 'Biomolecules',
            chapters: [
              {
                name: 'Biomolecules',
                topics: [
                  { name: 'Carbohydrates', aliases: ['carbohydrates', 'glucose fructose', 'monosaccharide disaccharide polysaccharide', 'aldoses ketoses'] },
                  { name: 'Proteins and Amino Acids', aliases: ['proteins', 'amino acids', 'peptide bond', 'denaturation of proteins', 'structure of proteins'] },
                  { name: 'Nucleic Acids', aliases: ['nucleic acids', 'DNA RNA', 'nucleotide', 'base pairs', 'structure of DNA'] },
                  { name: 'Vitamins', aliases: ['vitamins', 'classification of vitamins', 'fat water soluble vitamins'] },
                ],
              },
            ],
          },

          {
            name: 'Principles Related to Practical Chemistry',
            chapters: [
              {
                name: 'Laboratory Analysis',
                topics: [
                  { name: 'Qualitative Salt Analysis', aliases: ['salt analysis', 'cation anion tests', 'qualitative analysis inorganic', 'group reagents'] },
                  { name: 'Titrations and Practical Chemistry', aliases: ['titration', 'acid base titration', 'indicators', 'oxalic acid KMnO4', 'Mohr salt KMnO4'] },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

// ─── Topic relationship graph ─────────────────────────────────────────────────
//
// Convention for prerequisite_of:
//   sourceTopic ──prerequisite_of──► targetTopic
//   means: "learn sourceTopic before targetTopic"
//
// Convention for applied_in (cross-subject):
//   "Math:Integration" ──applied_in──► "Physics:Work Done by Forces"
//   means: the source concept is directly used/needed inside the target topic.

export const SEED_EDGES: SeedEdge[] = [

  // ══════════════════════════════════════════════════════════════════════════
  // MATHEMATICS — internal prerequisite chains
  // ══════════════════════════════════════════════════════════════════════════

  // Sets → Functions (functions defined on sets)
  { sourceTopic: 'Set Representation and Operations', targetTopic: 'Types of Functions', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Types of Relations', targetTopic: 'Equivalence Relations', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Types of Functions', targetTopic: 'Composition and Inverse of Functions', edgeType: 'prerequisite_of', strength: 'required' },

  // Functions → Limits → Continuity → Differentiation (the calculus chain)
  { sourceTopic: 'Composition and Inverse of Functions', targetTopic: 'Concept and Evaluation of Limits', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Concept and Evaluation of Limits', targetTopic: 'Indeterminate Forms', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Concept and Evaluation of Limits', targetTopic: 'Continuity of Functions', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Continuity of Functions', targetTopic: 'Differentiation Rules', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Differentiation Rules', targetTopic: 'Chain Rule and Implicit Differentiation', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Differentiation Rules', targetTopic: 'Differentiation of Special Functions', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Chain Rule and Implicit Differentiation', targetTopic: 'Higher Order Derivatives', edgeType: 'prerequisite_of', strength: 'required' },

  // Differentiation → Applications of Derivatives
  { sourceTopic: 'Differentiation Rules', targetTopic: 'Rate of Change of Quantities', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Differentiation Rules', targetTopic: 'Increasing and Decreasing Functions', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Increasing and Decreasing Functions', targetTopic: 'Maxima and Minima', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Differentiation Rules', targetTopic: 'Tangents and Normals', edgeType: 'prerequisite_of', strength: 'required' },

  // Differentiation → Integration (reverse operation)
  { sourceTopic: 'Differentiation Rules', targetTopic: 'Standard Integrals and Integration by Substitution', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Standard Integrals and Integration by Substitution', targetTopic: 'Integration by Parts', edgeType: 'prerequisite_of', strength: 'recommended' },
  { sourceTopic: 'Standard Integrals and Integration by Substitution', targetTopic: 'Integration by Partial Fractions', edgeType: 'prerequisite_of', strength: 'recommended' },
  { sourceTopic: 'Trigonometric Identities and Equations', targetTopic: 'Integration Using Trigonometric Identities', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Standard Integrals and Integration by Substitution', targetTopic: 'Properties of Definite Integrals', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Properties of Definite Integrals', targetTopic: 'Standard Definite Integral Forms', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Properties of Definite Integrals', targetTopic: 'Area Under and Between Curves', edgeType: 'prerequisite_of', strength: 'required' },

  // Integration → Differential Equations
  { sourceTopic: 'Differentiation Rules', targetTopic: 'Order, Degree and Formation of Differential Equations', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Standard Integrals and Integration by Substitution', targetTopic: 'Variable Separable Method', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Variable Separable Method', targetTopic: 'Homogeneous Differential Equations', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Standard Integrals and Integration by Substitution', targetTopic: 'Linear Differential Equations', edgeType: 'prerequisite_of', strength: 'required' },

  // Trigonometry prerequisite chain
  { sourceTopic: 'Trigonometric Identities and Equations', targetTopic: 'Inverse Trigonometric Functions', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Inverse Trigonometric Functions', targetTopic: 'Properties of Inverse Trig Functions', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Trigonometric Identities and Equations', targetTopic: 'Differentiation of Special Functions', edgeType: 'prerequisite_of', strength: 'recommended' },

  // Trig → Coordinate Geometry (polar form, parametric)
  { sourceTopic: 'Trigonometric Identities and Equations', targetTopic: 'Parabola', edgeType: 'related_to' },
  { sourceTopic: 'Trigonometric Identities and Equations', targetTopic: 'Ellipse', edgeType: 'related_to' },

  // Coordinate Geometry chain
  { sourceTopic: 'Coordinate System and Distance Formula', targetTopic: 'Equations of Straight Line', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Equations of Straight Line', targetTopic: 'Angle Between Lines and Perpendicular Distance', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Equations of Straight Line', targetTopic: 'Circle Equation and Properties', edgeType: 'prerequisite_of', strength: 'recommended' },
  { sourceTopic: 'Circle Equation and Properties', targetTopic: 'Chord, Tangent and Line-Circle Intersection', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Circle Equation and Properties', targetTopic: 'Parabola', edgeType: 'prerequisite_of', strength: 'recommended' },
  { sourceTopic: 'Parabola', targetTopic: 'Ellipse', edgeType: 'related_to' },
  { sourceTopic: 'Parabola', targetTopic: 'Hyperbola', edgeType: 'related_to' },
  { sourceTopic: 'Ellipse', targetTopic: 'Hyperbola', edgeType: 'related_to' },

  // Vectors → 3D Geometry (3D uses vector concepts)
  { sourceTopic: 'Vector Operations and Components', targetTopic: 'Scalar (Dot) Product', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Vector Operations and Components', targetTopic: 'Vector (Cross) Product', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Vector Operations and Components', targetTopic: 'Direction Cosines and Direction Ratios', edgeType: 'prerequisite_of', strength: 'recommended' },
  { sourceTopic: 'Direction Cosines and Direction Ratios', targetTopic: 'Equations of Lines in 3D', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Equations of Lines in 3D', targetTopic: 'Skew Lines and Shortest Distance', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Scalar (Dot) Product', targetTopic: 'Skew Lines and Shortest Distance', edgeType: 'prerequisite_of', strength: 'recommended' },

  // Algebra internal
  { sourceTopic: 'Nature of Roots and Discriminant', targetTopic: 'Formation and Properties of Quadratic Equations', edgeType: 'prerequisite_of', strength: 'recommended' },
  { sourceTopic: 'Algebra of Complex Numbers', targetTopic: 'Argand Plane and Polar Form', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Algebra of Complex Numbers', targetTopic: 'Nature of Roots and Discriminant', edgeType: 'related_to', notes: 'Complex roots arise from negative discriminant' },
  { sourceTopic: 'Combinations C(n,r)', targetTopic: 'Binomial Theorem and Expansion', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Binomial Theorem and Expansion', targetTopic: 'General Term and Middle Term', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Permutations P(n,r)', targetTopic: 'Combinations C(n,r)', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Fundamental Principle of Counting', targetTopic: 'Permutations P(n,r)', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Arithmetic Progression', targetTopic: 'Geometric Progression', edgeType: 'related_to' },
  { sourceTopic: 'Arithmetic Mean', targetTopic: 'Geometric Mean and AM-GM Inequality', edgeType: 'related_to' },
  { sourceTopic: 'Types and Algebra of Matrices', targetTopic: 'Transpose, Adjoint and Inverse of Matrix', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Evaluation of Determinants', targetTopic: 'Applications of Determinants', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Transpose, Adjoint and Inverse of Matrix', targetTopic: 'Applications of Determinants', edgeType: 'prerequisite_of', strength: 'recommended' },

  // Probability internal
  { sourceTopic: 'Probability Theorems', targetTopic: "Bayes' Theorem and Conditional Probability", edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: "Bayes' Theorem and Conditional Probability", targetTopic: 'Probability Distribution of Random Variable', edgeType: 'prerequisite_of', strength: 'recommended' },
  { sourceTopic: 'Combinations C(n,r)', targetTopic: 'Probability Theorems', edgeType: 'prerequisite_of', strength: 'recommended' },

  // ══════════════════════════════════════════════════════════════════════════
  // PHYSICS — internal prerequisite chains
  // ══════════════════════════════════════════════════════════════════════════

  // Measurement → everything (conceptual foundation)
  { sourceTopic: 'SI Units and Dimensional Analysis', targetTopic: 'Uniform and Non-Uniform Motion', edgeType: 'prerequisite_of', strength: 'required' },

  // Kinematics chain
  { sourceTopic: 'Uniform and Non-Uniform Motion', targetTopic: 'Uniformly Accelerated Motion', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Uniformly Accelerated Motion', targetTopic: 'Velocity-Time and Position-Time Graphs', edgeType: 'prerequisite_of', strength: 'recommended' },
  { sourceTopic: 'Uniformly Accelerated Motion', targetTopic: 'Projectile Motion', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Uniform and Non-Uniform Motion', targetTopic: 'Uniform Circular Motion', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Uniform and Non-Uniform Motion', targetTopic: 'Relative Velocity', edgeType: 'prerequisite_of', strength: 'recommended' },

  // Kinematics → Newton's Laws → downstream mechanics
  { sourceTopic: 'Uniformly Accelerated Motion', targetTopic: "Newton's First and Second Law", edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: "Newton's First and Second Law", targetTopic: "Newton's Third Law and Conservation of Momentum", edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: "Newton's First and Second Law", targetTopic: 'Equilibrium of Concurrent Forces', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: "Newton's First and Second Law", targetTopic: 'Laws of Friction', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: "Newton's First and Second Law", targetTopic: 'Centripetal Force and Applications', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Uniform Circular Motion', targetTopic: 'Centripetal Force and Applications', edgeType: 'prerequisite_of', strength: 'required' },

  // Work-Energy chain
  { sourceTopic: "Newton's First and Second Law", targetTopic: 'Work Done by Forces', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Work Done by Forces', targetTopic: 'Kinetic and Potential Energy', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Kinetic and Potential Energy', targetTopic: 'Work-Energy Theorem', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Work-Energy Theorem', targetTopic: 'Conservation of Mechanical Energy', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Conservation of Mechanical Energy', targetTopic: 'Spring Potential Energy and Vertical Circle', edgeType: 'prerequisite_of', strength: 'recommended' },
  { sourceTopic: "Newton's Third Law and Conservation of Momentum", targetTopic: 'Elastic and Inelastic Collisions', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Conservation of Mechanical Energy', targetTopic: 'Elastic and Inelastic Collisions', edgeType: 'prerequisite_of', strength: 'recommended' },

  // Rotational Motion
  { sourceTopic: "Newton's First and Second Law", targetTopic: 'Torque and Angular Momentum', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Torque and Angular Momentum', targetTopic: 'Conservation of Angular Momentum', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Moment of Inertia and Radius of Gyration', targetTopic: 'Parallel and Perpendicular Axis Theorems', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Torque and Angular Momentum', targetTopic: 'Moment of Inertia and Radius of Gyration', edgeType: 'related_to' },
  { sourceTopic: 'Uniformly Accelerated Motion', targetTopic: 'Equations of Rotational Motion', edgeType: 'related_to', notes: 'Rotational analogues of SUVAT' },
  { sourceTopic: 'Equations of Rotational Motion', targetTopic: 'Rolling Motion', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Conservation of Mechanical Energy', targetTopic: 'Rolling Motion', edgeType: 'prerequisite_of', strength: 'required' },

  // Gravitation
  { sourceTopic: "Newton's First and Second Law", targetTopic: "Newton's Law of Gravitation", edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: "Newton's Law of Gravitation", targetTopic: 'Acceleration Due to Gravity and Its Variation', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Kinetic and Potential Energy', targetTopic: 'Gravitational Potential and Escape Velocity', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Uniform Circular Motion', targetTopic: "Kepler's Laws and Satellite Motion", edgeType: 'prerequisite_of', strength: 'required' },

  // SHM → Waves
  { sourceTopic: "Newton's First and Second Law", targetTopic: 'SHM Equation and Characteristics', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'SHM Equation and Characteristics', targetTopic: 'Energy in SHM and Spring Systems', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'SHM Equation and Characteristics', targetTopic: 'Simple Pendulum', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'SHM Equation and Characteristics', targetTopic: 'Wave Motion and Progressive Waves', edgeType: 'prerequisite_of', strength: 'recommended' },
  { sourceTopic: 'Wave Motion and Progressive Waves', targetTopic: 'Superposition and Standing Waves', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Superposition and Standing Waves', targetTopic: 'Beats and Doppler Effect', edgeType: 'prerequisite_of', strength: 'recommended' },

  // Thermodynamics chain
  { sourceTopic: 'Kinetic Theory and Ideal Gas Equation', targetTopic: 'RMS Speed and Kinetic Interpretation of Temperature', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'RMS Speed and Kinetic Interpretation of Temperature', targetTopic: 'Degrees of Freedom and Law of Equipartition', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Kinetic Theory and Ideal Gas Equation', targetTopic: 'First Law of Thermodynamics', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'First Law of Thermodynamics', targetTopic: 'Isothermal and Adiabatic Processes', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Isothermal and Adiabatic Processes', targetTopic: 'Second Law of Thermodynamics', edgeType: 'prerequisite_of', strength: 'required' },

  // Electrostatics chain
  { sourceTopic: "Coulomb's Law and Superposition", targetTopic: 'Electric Field and Field Lines', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Electric Field and Field Lines', targetTopic: 'Electric Dipole', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Electric Field and Field Lines', targetTopic: "Electric Flux and Gauss's Law", edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: "Electric Flux and Gauss's Law", targetTopic: 'Electric Potential Calculation', edgeType: 'related_to' },
  { sourceTopic: 'Electric Potential Calculation', targetTopic: 'Equipotential Surfaces and Potential Energy', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Electric Potential Calculation', targetTopic: 'Capacitors and Combinations', edgeType: 'prerequisite_of', strength: 'recommended' },
  { sourceTopic: 'Capacitors and Combinations', targetTopic: 'Parallel Plate Capacitor and Energy', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Parallel Plate Capacitor and Energy', targetTopic: 'Dielectrics in Capacitors', edgeType: 'prerequisite_of', strength: 'required' },

  // Current Electricity chain
  { sourceTopic: "Drift Velocity and Ohm's Law", targetTopic: 'Resistance and Resistivity', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Resistance and Resistivity', targetTopic: 'Power and Energy in Circuits', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: "Drift Velocity and Ohm's Law", targetTopic: "Kirchhoff's Laws", edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: "Kirchhoff's Laws", targetTopic: 'Wheatstone Bridge and Metre Bridge', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: "Drift Velocity and Ohm's Law", targetTopic: 'Cells and EMF', edgeType: 'prerequisite_of', strength: 'required' },

  // Magnetism chain
  { sourceTopic: "Coulomb's Law and Superposition", targetTopic: 'Biot-Savart Law', edgeType: 'related_to', notes: 'Analogous inverse-square law structure' },
  { sourceTopic: 'Biot-Savart Law', targetTopic: "Ampere's Law and Applications", edgeType: 'prerequisite_of', strength: 'recommended' },
  { sourceTopic: 'Biot-Savart Law', targetTopic: 'Force on Charges and Current-Carrying Conductors', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Force on Charges and Current-Carrying Conductors', targetTopic: 'Galvanometer and Its Conversions', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Biot-Savart Law', targetTopic: 'Magnetic Dipole and Bar Magnet', edgeType: 'prerequisite_of', strength: 'recommended' },

  // EMI → AC Circuits
  { sourceTopic: "Faraday's Law and Lenz's Law", targetTopic: 'Self and Mutual Inductance', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Self and Mutual Inductance', targetTopic: 'LCR Series Circuit and Resonance', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Resistance and Resistivity', targetTopic: 'Reactance and Impedance', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Reactance and Impedance', targetTopic: 'LCR Series Circuit and Resonance', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'LCR Series Circuit and Resonance', targetTopic: 'Power in AC and Transformer', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Self and Mutual Inductance', targetTopic: 'Power in AC and Transformer', edgeType: 'prerequisite_of', strength: 'recommended' },

  // Modern Physics chain
  { sourceTopic: "Bohr's Model and Hydrogen Spectrum", targetTopic: 'Photoelectric Effect', edgeType: 'related_to', notes: 'Both quantum phenomena; Bohr quantization parallels photon energy' },
  { sourceTopic: 'Photoelectric Effect', targetTopic: 'de Broglie Waves and Matter Waves', edgeType: 'prerequisite_of', strength: 'recommended' },
  { sourceTopic: "Bohr's Model and Hydrogen Spectrum", targetTopic: 'Nuclear Composition and Size', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Nuclear Composition and Size', targetTopic: 'Mass Defect and Binding Energy', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Mass Defect and Binding Energy', targetTopic: 'Radioactivity', edgeType: 'prerequisite_of', strength: 'recommended' },
  { sourceTopic: 'Mass Defect and Binding Energy', targetTopic: 'Nuclear Fission and Fusion', edgeType: 'prerequisite_of', strength: 'required' },

  // Optics chain
  { sourceTopic: 'Reflection and Spherical Mirrors', targetTopic: 'Refraction and Total Internal Reflection', edgeType: 'prerequisite_of', strength: 'recommended' },
  { sourceTopic: 'Refraction and Total Internal Reflection', targetTopic: 'Lenses and Lens Formula', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Lenses and Lens Formula', targetTopic: 'Optical Instruments', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Refraction and Total Internal Reflection', targetTopic: 'Prism and Dispersion', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Wave Motion and Progressive Waves', targetTopic: "Huygens' Principle", edgeType: 'prerequisite_of', strength: 'recommended' },
  { sourceTopic: "Huygens' Principle", targetTopic: "Young's Double Slit Experiment", edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: "Young's Double Slit Experiment", targetTopic: 'Diffraction', edgeType: 'prerequisite_of', strength: 'recommended' },
  { sourceTopic: 'Diffraction', targetTopic: 'Polarization', edgeType: 'prerequisite_of', strength: 'recommended' },

  // Semiconductors chain
  { sourceTopic: 'Atomic Structure (in Atoms and Nuclei)', targetTopic: 'Semiconductors and p-n Junction', edgeType: 'related_to', notes: 'Band theory uses atomic orbital concepts' },
  { sourceTopic: 'Semiconductors and p-n Junction', targetTopic: 'Rectifier and Diode Applications', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Semiconductors and p-n Junction', targetTopic: 'Zener Diode', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Rectifier and Diode Applications', targetTopic: 'Basic Logic Gates', edgeType: 'prerequisite_of', strength: 'recommended' },

  // ══════════════════════════════════════════════════════════════════════════
  // CHEMISTRY — internal prerequisite chains
  // ══════════════════════════════════════════════════════════════════════════

  // Physical Chemistry foundation
  { sourceTopic: 'Atomic and Molecular Masses', targetTopic: 'Mole Concept and Avogadro Number', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Mole Concept and Avogadro Number', targetTopic: 'Stoichiometry and Chemical Equations', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Stoichiometry and Chemical Equations', targetTopic: 'Empirical and Molecular Formulae', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Mole Concept and Avogadro Number', targetTopic: 'Quantum Mechanical Model and Orbitals', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Quantum Mechanical Model and Orbitals', targetTopic: 'Quantum Numbers and Electronic Configuration', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Quantum Numbers and Electronic Configuration', targetTopic: 'Ionic Bond Formation and Lattice Enthalpy', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Quantum Numbers and Electronic Configuration', targetTopic: 'Covalent Bond and VSEPR Theory', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Covalent Bond and VSEPR Theory', targetTopic: "Electronegativity and Fajan's Rules", edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Quantum Numbers and Electronic Configuration', targetTopic: 'Valence Bond Theory and Hybridization', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Valence Bond Theory and Hybridization', targetTopic: 'Molecular Orbital Theory', edgeType: 'prerequisite_of', strength: 'recommended' },
  { sourceTopic: 'Covalent Bond and VSEPR Theory', targetTopic: 'Hydrogen Bonding', edgeType: 'prerequisite_of', strength: 'required' },

  // Periodicity
  { sourceTopic: 'Quantum Numbers and Electronic Configuration', targetTopic: 'Modern Periodic Law and Table', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Modern Periodic Law and Table', targetTopic: 'Periodic Trends', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Periodic Trends', targetTopic: 'Group 13 and 14 Elements', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Periodic Trends', targetTopic: 'Group 15 Elements', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Periodic Trends', targetTopic: 'Group 16 Elements', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Periodic Trends', targetTopic: 'Group 17 — Halogens', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Periodic Trends', targetTopic: 'Group 18 — Noble Gases', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Periodic Trends', targetTopic: 'Transition Metals — Electronic Configuration and Properties', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Valence Bond Theory and Hybridization', targetTopic: "Werner's Theory and IUPAC Nomenclature", edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: "Werner's Theory and IUPAC Nomenclature", targetTopic: 'Isomerism in Coordination Compounds', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: "Werner's Theory and IUPAC Nomenclature", targetTopic: 'Bonding — VBT and Crystal Field Theory', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Bonding — VBT and Crystal Field Theory', targetTopic: 'Colour and Magnetic Properties of Complexes', edgeType: 'prerequisite_of', strength: 'required' },

  // Chemical Thermodynamics chain
  { sourceTopic: 'Stoichiometry and Chemical Equations', targetTopic: 'First Law and Internal Energy (Chemistry)', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'First Law and Internal Energy (Chemistry)', targetTopic: 'Enthalpies of Reactions', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Enthalpies of Reactions', targetTopic: 'Second Law and Gibbs Energy', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Second Law and Gibbs Energy', targetTopic: 'Gibbs Energy and Equilibrium Constant', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Gibbs Energy and Equilibrium Constant', targetTopic: 'Law of Chemical Equilibrium', edgeType: 'prerequisite_of', strength: 'recommended' },

  // Equilibrium chain
  { sourceTopic: 'Law of Chemical Equilibrium', targetTopic: "Le Chatelier's Principle", edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Mole Concept and Avogadro Number', targetTopic: 'Acid-Base Concepts', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Acid-Base Concepts', targetTopic: 'pH Scale and Degree of Ionization', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'pH Scale and Degree of Ionization', targetTopic: 'Buffer Solutions', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'pH Scale and Degree of Ionization', targetTopic: 'Solubility Product', edgeType: 'prerequisite_of', strength: 'required' },

  // Electrochemistry chain
  { sourceTopic: 'Oxidation Number and Redox Balancing', targetTopic: 'Electrochemical Cells and EMF', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Electrochemical Cells and EMF', targetTopic: 'Nernst Equation', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Electrochemical Cells and EMF', targetTopic: 'Electrolysis and Faraday Laws', edgeType: 'prerequisite_of', strength: 'recommended' },
  { sourceTopic: 'Electrochemical Cells and EMF', targetTopic: 'Conductance and Kohlrausch Law', edgeType: 'related_to' },
  { sourceTopic: 'Law of Chemical Equilibrium', targetTopic: 'Nernst Equation', edgeType: 'related_to', notes: 'ΔG = -nFE connects equilibrium and electrochemistry' },

  // Kinetics chain
  { sourceTopic: 'Rate Laws and Rate Constant', targetTopic: 'Order and Molecularity of Reactions', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Order and Molecularity of Reactions', targetTopic: 'Integrated Rate Laws and Half-Life', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Integrated Rate Laws and Half-Life', targetTopic: 'Activation Energy and Arrhenius Equation', edgeType: 'prerequisite_of', strength: 'required' },

  // Organic Chemistry chain
  { sourceTopic: 'Hybridization and Bond Types in Organic', targetTopic: 'IUPAC Nomenclature of Organic Compounds', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'IUPAC Nomenclature of Organic Compounds', targetTopic: 'Isomerism in Organic Compounds', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Bond Fission and Reactive Intermediates', targetTopic: 'Electronic Effects in Organic', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Electronic Effects in Organic', targetTopic: 'Types of Organic Reactions', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Types of Organic Reactions', targetTopic: 'Alkanes', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Alkanes', targetTopic: 'Alkenes', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Alkenes', targetTopic: 'Alkynes', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Alkenes', targetTopic: 'Benzene and Aromaticity', edgeType: 'prerequisite_of', strength: 'recommended' },
  { sourceTopic: 'Benzene and Aromaticity', targetTopic: 'Electrophilic Aromatic Substitution', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Alkanes', targetTopic: 'Haloalkanes — Preparation and Properties', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Types of Organic Reactions', targetTopic: 'SN1 and SN2 Mechanisms', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Alkenes', targetTopic: 'Alcohols', edgeType: 'prerequisite_of', strength: 'recommended' },
  { sourceTopic: 'Alcohols', targetTopic: 'Aldehydes and Ketones', edgeType: 'prerequisite_of', strength: 'recommended' },
  { sourceTopic: 'Aldehydes and Ketones', targetTopic: 'Named Reactions of Carbonyl Compounds', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Aldehydes and Ketones', targetTopic: 'Carboxylic Acids', edgeType: 'prerequisite_of', strength: 'recommended' },
  { sourceTopic: 'Carboxylic Acids', targetTopic: 'Acid Derivatives', edgeType: 'prerequisite_of', strength: 'required' },
  { sourceTopic: 'Haloalkanes — Preparation and Properties', targetTopic: 'Amines', edgeType: 'prerequisite_of', strength: 'recommended' },
  { sourceTopic: 'Amines', targetTopic: 'Diazonium Salts', edgeType: 'prerequisite_of', strength: 'required' },

  // ══════════════════════════════════════════════════════════════════════════
  // CROSS-SUBJECT EDGES (applied_in, crossSubject: true)
  // ══════════════════════════════════════════════════════════════════════════

  // Math Calculus → Physics applications
  { sourceTopic: 'Differentiation Rules', targetTopic: 'Rate of Change of Quantities', edgeType: 'applied_in', crossSubject: false, notes: 'dx/dt for kinematics (within math AOD, but also consumed in physics)' },
  { sourceTopic: 'Differentiation Rules', targetTopic: 'SHM Equation and Characteristics', edgeType: 'applied_in', crossSubject: true, notes: 'v = dx/dt, a = d²x/dt² in SHM derivation' },
  { sourceTopic: 'Standard Integrals and Integration by Substitution', targetTopic: 'Work Done by Forces', edgeType: 'applied_in', crossSubject: true, notes: 'W = ∫F·dx for variable forces' },
  { sourceTopic: 'Standard Integrals and Integration by Substitution', targetTopic: "Electric Flux and Gauss's Law", edgeType: 'applied_in', crossSubject: true, notes: 'Φ = ∫E·dA proof uses surface integrals' },
  { sourceTopic: 'Linear Differential Equations', targetTopic: 'LCR Series Circuit and Resonance', edgeType: 'applied_in', crossSubject: true, notes: 'LCR circuit is a second-order linear ODE' },
  { sourceTopic: 'Variable Separable Method', targetTopic: 'Radioactivity', edgeType: 'applied_in', crossSubject: true, notes: 'dN/dt = -λN solved by separation of variables' },
  { sourceTopic: 'Variable Separable Method', targetTopic: 'Order and Molecularity of Reactions', edgeType: 'applied_in', crossSubject: true, notes: 'First-order rate law dC/dt = -kC is a separable DE' },
  { sourceTopic: 'Properties of Definite Integrals', targetTopic: 'Degrees of Freedom and Law of Equipartition', edgeType: 'applied_in', crossSubject: true, notes: 'Maxwell-Boltzmann distribution uses definite integrals' },

  // Math Vectors → Physics vector quantities
  { sourceTopic: 'Vector Operations and Components', targetTopic: 'Projectile Motion', edgeType: 'applied_in', crossSubject: true, notes: 'Decomposing velocity into components' },
  { sourceTopic: 'Scalar (Dot) Product', targetTopic: 'Work Done by Forces', edgeType: 'applied_in', crossSubject: true, notes: 'W = F·d = Fd cosθ' },
  { sourceTopic: 'Vector (Cross) Product', targetTopic: 'Torque and Angular Momentum', edgeType: 'applied_in', crossSubject: true, notes: 'τ = r × F; L = r × p' },
  { sourceTopic: 'Vector (Cross) Product', targetTopic: 'Force on Charges and Current-Carrying Conductors', edgeType: 'applied_in', crossSubject: true, notes: 'F = qv × B; F = IL × B' },
  { sourceTopic: 'Vector (Cross) Product', targetTopic: 'Biot-Savart Law', edgeType: 'applied_in', crossSubject: true, notes: 'dB = (μ₀/4π)(Idl × r̂)/r²' },

  // Math Coordinate Geometry → Physics
  { sourceTopic: 'Equations of Straight Line', targetTopic: 'Velocity-Time and Position-Time Graphs', edgeType: 'applied_in', crossSubject: true, notes: 'Slope of x-t graph = velocity (linear motion)' },

  // Math 3D → Physics
  { sourceTopic: 'Direction Cosines and Direction Ratios', targetTopic: 'Relative Velocity', edgeType: 'applied_in', crossSubject: true, notes: '3D motion problems use direction cosines' },

  // Math Binomial → Physics / Chemistry
  { sourceTopic: 'Binomial Theorem and Expansion', targetTopic: 'Acceleration Due to Gravity and Its Variation', edgeType: 'applied_in', crossSubject: true, notes: 'g at height h: (1 + h/R)^-2 ≈ 1 - 2h/R via binomial' },
  { sourceTopic: 'Binomial Theorem and Expansion', targetTopic: 'Errors and Significant Figures', edgeType: 'applied_in', crossSubject: true, notes: 'Error propagation uses binomial approximation' },

  // Math Quadratics → Physics
  { sourceTopic: 'Nature of Roots and Discriminant', targetTopic: 'Projectile Motion', edgeType: 'applied_in', crossSubject: true, notes: 'Time of flight equation is a quadratic in t' },

  // Math Probability → Chemistry
  { sourceTopic: 'Probability Theorems', targetTopic: 'Radioactivity', edgeType: 'applied_in', crossSubject: true, notes: 'Radioactive decay is a probabilistic process' },

  // Math Statistics → Chemistry
  { sourceTopic: 'Measures of Dispersion', targetTopic: 'Errors and Significant Figures', edgeType: 'applied_in', crossSubject: true, notes: 'SD is used to quantify measurement error' },

  // Chemistry ↔ Physics shared concepts
  { sourceTopic: 'Kinetic Theory and Ideal Gas Equation', targetTopic: 'Law of Chemical Equilibrium', edgeType: 'related_to', crossSubject: true, notes: 'Kp involves partial pressures from PV=nRT' },
  { sourceTopic: 'First Law of Thermodynamics', targetTopic: 'First Law and Internal Energy (Chemistry)', edgeType: 'related_to', crossSubject: true, notes: 'Identical first law — different notation/emphasis' },
  { sourceTopic: 'Second Law of Thermodynamics', targetTopic: 'Second Law and Gibbs Energy', edgeType: 'related_to', crossSubject: true, notes: 'Entropy and Gibbs energy: same second law' },
  { sourceTopic: 'Degrees of Freedom and Law of Equipartition', targetTopic: 'Enthalpies of Reactions', edgeType: 'related_to', crossSubject: true, notes: 'Molecular energy → Cv/Cp → enthalpy differences' },

  // Math Logarithm (inside differentiation) → Chemistry
  { sourceTopic: 'Differentiation of Special Functions', targetTopic: 'Integrated Rate Laws and Half-Life', edgeType: 'applied_in', crossSubject: true, notes: 'ln[A] = ln[A₀] - kt; differentiation of logarithm used' },
  { sourceTopic: 'Differentiation of Special Functions', targetTopic: 'Nernst Equation', edgeType: 'applied_in', crossSubject: true, notes: 'Nernst uses ln(Q) — log differentiation context' },
  { sourceTopic: 'Differentiation of Special Functions', targetTopic: 'Activation Energy and Arrhenius Equation', edgeType: 'applied_in', crossSubject: true, notes: 'ln k = ln A - Ea/RT; slope of ln k vs 1/T uses log differentiation' },

  // Trig → Physics SHM / Waves / AC
  { sourceTopic: 'Trigonometric Identities and Equations', targetTopic: 'SHM Equation and Characteristics', edgeType: 'applied_in', crossSubject: true, notes: 'x = A sin(ωt + φ) and energy expressions' },
  { sourceTopic: 'Trigonometric Identities and Equations', targetTopic: 'Wave Motion and Progressive Waves', edgeType: 'applied_in', crossSubject: true, notes: 'y = A sin(ωt - kx) requires trig' },
  { sourceTopic: 'Trigonometric Identities and Equations', targetTopic: 'AC Fundamentals', edgeType: 'applied_in', crossSubject: true, notes: 'v = Vm sin(ωt), phasors require trig' },
  { sourceTopic: 'Trigonometric Identities and Equations', targetTopic: "Young's Double Slit Experiment", edgeType: 'applied_in', crossSubject: true, notes: 'Path difference and fringe width formula uses geometry and trig' },
];
