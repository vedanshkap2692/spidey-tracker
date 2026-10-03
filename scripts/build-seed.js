// Builds templates/gate-da-2027.json from:
//   templates/gate-da-syllabus.txt   – the master checklist (subjects → topics → grouped items)
//   templates/research/*.json        – researched resources, PYQ links, tips, hours, weightage
// Run: npm run seed
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const T = (p) => path.join(ROOT, 'templates', p)
const readJson = (p) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null)

// ── 1. parse the syllabus outline ────────────────────────────────────────────
function parseSyllabus(text) {
  const subjects = []
  let subj, topic, group
  for (const raw of text.split('\n')) {
    const line = raw.trimEnd()
    if (!line.trim()) continue
    let m
    if ((m = line.match(/^# (\S+) \| (.+)$/))) {
      subj = { id: m[1], title: m[2].trim(), topics: [] }
      subjects.push(subj)
      topic = group = undefined
    } else if (line.startsWith('# ')) continue // comment
    else if ((m = line.match(/^## (.+)$/))) {
      topic = { title: m[1].trim(), items: [] }
      subj.topics.push(topic)
      group = undefined
    } else if ((m = line.match(/^### (.+)$/))) group = m[1].trim()
    else if ((m = line.match(/^- (.+)$/))) topic.items.push({ title: m[1].trim(), group })
  }
  return subjects
}

// ── 2. syllabus topic → research topic ids ───────────────────────────────────
const MAP = {
  ga: {
    'Verbal Aptitude': ['ga-verbal-grammar', 'ga-verbal-rc'],
    'Quantitative Aptitude': ['ga-quant-numerical', 'ga-quant-di', 'ga-quant-geometry', 'ga-quant-stats-prob'],
    'Analytical Aptitude': ['ga-analytical'],
    'Spatial Aptitude': ['ga-spatial'],
  },
  'prob-stats': {
    Counting: ['counting'],
    'Probability Foundations': ['probability-basics', 'conditional-bayes'],
    'Random Variables': ['random-variables-expectation'],
    'Expectation & Moments': ['random-variables-expectation', 'joint-conditional-expectation'],
    'Descriptive Statistics': ['descriptive-statistics'],
    'Discrete Distributions': ['discrete-distributions'],
    'Continuous Distributions': ['continuous-distributions'],
    'CDF / PDF Concepts': ['joint-conditional-expectation'],
    'Central Limit Theorem': ['sampling-clt-ci'],
    'Confidence Intervals': ['sampling-clt-ci'],
    'Hypothesis Testing': ['hypothesis-testing'],
  },
  'linear-algebra': {
    Vectors: ['vector-spaces-independence'],
    'Vector Spaces': ['vector-spaces-independence'],
    Matrices: ['matrices-special'],
    'Matrix Properties': ['rank-nullity-determinant'],
    'Systems of Linear Equations': ['systems-gaussian-elimination'],
    'Gaussian Elimination': ['systems-gaussian-elimination'],
    Determinants: ['rank-nullity-determinant'],
    'Eigenvalues & Eigenvectors': ['eigenvalues-eigenvectors'],
    Orthogonality: ['orthogonality-projections'],
    Projections: ['orthogonality-projections'],
    'Quadratic Forms': ['quadratic-forms-definiteness'],
    'LU Decomposition': ['lu-decomposition'],
    'Singular Value Decomposition': ['svd'],
  },
  calculus: {
    'Functions of One Variable': ['functions-limits'],
    Limits: ['functions-limits'],
    Continuity: ['continuity-differentiability'],
    Differentiability: ['continuity-differentiability'],
    'Taylor Series': ['taylor-series'],
    'Maxima & Minima': ['maxima-minima'],
    'Single-variable Optimization': ['single-variable-optimization'],
  },
  dsa: {
    'Python Programming': ['python-core', 'python-functions'],
    'Complexity Analysis': ['complexity'],
    Stacks: ['stacks-queues-linked-lists'],
    Queues: ['stacks-queues-linked-lists'],
    'Linked Lists': ['stacks-queues-linked-lists'],
    Trees: ['trees'],
    'Hash Tables': ['hash-tables'],
    Searching: ['search-basic-sorting'],
    Sorting: ['search-basic-sorting', 'divide-and-conquer'],
    'Graph Fundamentals': ['graph-traversals'],
    'Graph Traversal': ['graph-traversals'],
    'Shortest Paths': ['shortest-paths'],
  },
  dbms: {
    'ER Model': ['er-model'],
    'Relational Model': ['relational-model-constraints'],
    'Relational Algebra': ['relational-algebra'],
    'Tuple Relational Calculus': ['tuple-calculus'],
    SQL: ['sql'],
    'Integrity Constraints': ['relational-model-constraints'],
    Normalization: ['normalization'],
    'File Organization': ['file-org-indexing'],
    Indexing: ['file-org-indexing'],
    'Data Types': ['relational-model-constraints', 'data-transformation'],
    'Data Transformation': ['data-transformation'],
    'Data Warehousing': ['warehouse-modelling', 'measures'],
  },
  ml: {
    'Supervised Learning Foundations': ['ml-foundations-regression-classification'],
    'Linear Regression': ['linear-regression', 'ridge-regression-regularization'],
    'Logistic Regression': ['logistic-regression'],
    'k-Nearest Neighbour': ['knn-naive-bayes'],
    'Naive Bayes': ['knn-naive-bayes'],
    'Linear Discriminant Analysis': ['linear-discriminant-analysis'],
    'Support Vector Machine': ['support-vector-machine'],
    'Decision Trees': ['decision-trees'],
    'Bias–Variance Trade-off': ['bias-variance-cross-validation'],
    'Cross-Validation': ['bias-variance-cross-validation'],
    'Multi-layer Perceptron': ['neural-networks-mlp'],
    'Feed-forward Neural Networks': ['neural-networks-mlp'],
    'Clustering: k-means & k-medoids': ['clustering-kmeans-kmedoid'],
    'Hierarchical Clustering': ['hierarchical-clustering'],
    'Dimensionality Reduction & PCA': ['pca-dimensionality-reduction'],
  },
  ai: {
    'Search Fundamentals': ['uninformed-search'],
    'Uninformed Search': ['uninformed-search'],
    'Informed Search': ['informed-search'],
    'Adversarial Search': ['adversarial-search'],
    'Propositional Logic': ['propositional-logic'],
    'Predicate / First-Order Logic': ['predicate-logic'],
    'Conditional Independence & Bayesian Networks': ['bayes-nets-conditional-independence'],
    'Exact Inference: Variable Elimination': ['exact-inference-variable-elimination'],
    'Approximate Inference: Sampling': ['approximate-inference-sampling'],
  },
}

// Fallback: pick the research topic with the best word overlap.
const words = (s) => new Set(s.toLowerCase().replace(/[^a-z0-9+ ]/g, ' ').split(/\s+/).filter((w) => w.length > 2))
function autoMatch(topic, rTopics) {
  const mine = words(topic.title + ' ' + topic.items.map((i) => i.title).join(' '))
  let best = null
  let bestScore = 0
  for (const r of rTopics) {
    const theirs = words(r.title + ' ' + (r.subtopics || []).join(' '))
    let s = 0
    for (const w of theirs) if (mine.has(w)) s++
    s += [...words(r.title)].filter((w) => words(topic.title).has(w)).length * 3
    if (s > bestScore) (bestScore = s), (best = r)
  }
  return best ? [best.id] : []
}

const SUBJECT_META = {
  'prob-stats': { icon: '🎲', key: 'Probability & Statistics' },
  'linear-algebra': { icon: '🧮', key: 'Linear Algebra' },
  calculus: { icon: '📈', key: 'Calculus & Optimization' },
  dsa: { icon: '🐍', key: 'Programming DS & Algorithms' },
  dbms: { icon: '🗄️', key: 'DBMS & Data Warehousing' },
  ml: { icon: '🤖', key: 'Machine Learning' },
  ai: { icon: '♟️', key: 'Artificial Intelligence' },
  ga: { icon: '🧩', key: 'General Aptitude' },
}
const ORDER = ['prob-stats', 'linear-algebra', 'calculus', 'dsa', 'dbms', 'ml', 'ai', 'ga']

const cleanRes = (r) => ({
  title: r.title,
  url: r.url,
  type: r.type,
  source: r.source,
  note: r.note,
  free: r.free,
})
const cleanPyq = (r) => ({ title: r.title, url: r.url, type: 'practice', source: r.source, note: r.note })
const uniqBy = (xs, k) => {
  const seen = new Set()
  return xs.filter((x) => (seen.has(k(x)) ? false : (seen.add(k(x)), true)))
}
const PRI = { high: 3, medium: 2, low: 1 }

// ── 3. build ────────────────────────────────────────────────────────────────
const syllabus = parseSyllabus(fs.readFileSync(T('gate-da-syllabus.txt'), 'utf8'))
const meta = readJson(T('research/meta.json')) || {}
const weightRows = meta.weightage || []
const missing = []

const nodes = ORDER.map((sid) => {
  const s = syllabus.find((x) => x.id === sid)
  if (!s) throw new Error('syllabus missing subject ' + sid)
  const r = readJson(T(`research/${sid}.json`)) || { topics: [], resources: [], pyqs: [] }
  if (!r.topics.length) missing.push(sid)
  const wr = weightRows.find((w) => w.subject === SUBJECT_META[sid].key)
  const marks = wr ? [wr.marks2024, wr.marks2025, wr.marks2026].filter((x) => x != null) : []
  const avg = marks.length ? Math.round((marks.reduce((a, b) => a + b, 0) / marks.length) * 10) / 10 : undefined

  // how many syllabus topics share each research topic (to split its hours)
  const mapping = Object.fromEntries(s.topics.map((t) => [t.title, MAP[sid]?.[t.title] || autoMatch(t, r.topics)]))
  const share = {}
  Object.values(mapping).flat().forEach((id) => (share[id] = (share[id] || 0) + 1))

  const children = s.topics.map((t) => {
    const src = mapping[t.title].map((id) => r.topics.find((x) => x.id === id)).filter(Boolean)
    const hoursFromSrc = src.reduce((h, x) => h + (x.estHours || 0) / share[x.id], 0)
    const hoursFromItems = Math.max(2, Math.round(t.items.length / 3))
    const estHours = Math.max(2, Math.round(Math.max(hoursFromSrc, hoursFromItems * 0.8)))
    const pr = src.reduce((p, x) => Math.max(p, PRI[x.priority] || 0), 0)
    return {
      title: t.title,
      subtopics: t.items.map((i) => ({ title: i.title, group: i.group })),
      estHours,
      priority: pr ? Object.keys(PRI).find((k) => PRI[k] === pr) : 'medium',
      tips: [...new Set(src.map((x) => x.tips).filter(Boolean))].join(' '),
      resources: uniqBy(src.flatMap((x) => x.resources || []).map(cleanRes), (x) => x.url),
      pyqs: uniqBy(src.flatMap((x) => x.pyqs || []).map(cleanPyq), (x) => x.url),
    }
  })

  return {
    title: s.title,
    icon: SUBJECT_META[sid].icon,
    summary: r.summary,
    notesGuide: r.notesGuide,
    weightage: marks.length ? `${marks.join(' · ')} marks` : r.weightage,
    marks: avg,
    tips: wr?.note ? `Past-paper weightage: ${wr.note}` : undefined,
    resources: uniqBy((r.resources || []).map(cleanRes), (x) => x.url),
    pyqs: uniqBy((r.pyqs || []).map(cleanPyq), (x) => x.url),
    children,
  }
})

const titleFor = (key) => {
  const i = ORDER.findIndex((k) => SUBJECT_META[k].key === key)
  return i >= 0 ? nodes[i].title : key
}
const ex = meta.exam || {}
const dates = ex.importantDates || {}
const template = {
  name: 'GATE 2027 — DA',
  emoji: '🕷️',
  tagline: 'Data Science & AI. With great syllabus comes great responsibility: 8 subjects, every topic, every PYQ.',
  targetDate: ex.expectedExamDate || '2027-02-14',
  targetLabel: 'GATE DA',
  dailyGoalMinutes: 300,
  levelNames: ['Subject', 'Topic', 'Sub-topic'],
  practiceLabel: 'PYQs',
  meta: {
    examName: ex.name,
    examInfo: [
      { label: 'Organising institute', value: 'IIT Madras (GATE 2027). Earlier DA papers: IISc 2024, IIT Roorkee 2025, IIT Guwahati 2026.' },
      { label: 'Exam window', value: '6, 7, 13, 14, 20 & 21 Feb 2027. The DA paper-wise date is TBA (expected Dec 2026 / Jan 2027).' },
      { label: 'Countdown target', value: '14 Feb 2027 is a best guess: DA has been a weekend afternoon paper every year. Aim to be exam-ready by 6 Feb and update the date in Settings.' },
      { label: 'Registration', value: 'Regular closes 5 Oct 2026, with late fee 12 Oct 2026. Corrections 14–21 Oct.' },
      { label: 'City slip / Result', value: '4 Jan 2027 / 19 Mar 2027' },
      { label: 'Pattern', value: '65 Qs · 100 marks · 3 h. GA 15 + DA 85. MCQ / MSQ / NAT; only wrong MCQs are negative (−1/3, −2/3). Virtual calculator.' },
      { label: 'PYQs on GATE Overflow', value: 'No separate DA site. DA questions are tagged gate-ds-ai-2024, gateda-2025 and gateda-2026 on gateoverflow.in. Free compiled PDFs: https://github.com/GATEOverflow/GO-PDFs/releases/tag/gateda-2026' },
      { label: 'Official site', value: ex.officialSite },
      { label: 'Official DA syllabus (PDF)', value: ex.syllabusPdf },
    ].filter((x) => x.value),
    milestones: [
      { date: '2026-10-05', label: 'GATE registration closes (regular)' },
      { date: '2026-10-12', label: 'GATE registration closes (late fee)' },
      { date: '2026-10-21', label: 'Application correction window ends' },
      { date: '2026-11-30', label: 'Finish first pass of all subjects' },
      { date: '2026-12-15', label: 'Start weekly full-length mocks' },
      { date: '2027-01-04', label: 'Exam city allotment' },
      { date: '2027-01-25', label: 'Stop new topics: revision + mocks only' },
      { date: '2027-02-06', label: 'GATE 2027 window opens' },
      { date: '2027-03-19', label: 'Results' },
    ],
    strategy: meta.strategy,
    papers: (meta.papers || []).map((p) => ({ ...p, type: /\.pdf/i.test(p.url) ? 'pdf' : 'practice' })),
    mockTests: (meta.mockTests || []).map((p) => ({ ...p, type: 'practice' })),
    generalResources: meta.generalResources,
    weightageYears: ['2024', '2025', '2026'],
    weightage: weightRows.map((w) => ({ subject: titleFor(w.subject), marks: [w.marks2024, w.marks2025, w.marks2026], note: w.note })),
    weightageNote: meta.weightageSources,
    outOfScope: [
      'Multivariable calculus', 'Partial derivatives', 'Gradient / Jacobian / Hessian as standalone calculus', 'Fourier transforms', 'Differential equations',
      'Complex analysis', 'Markov chains', 'Poisson processes', 'ANOVA', 'Regression hypothesis testing beyond named tests', 'Random forests', 'AdaBoost',
      'XGBoost', 'Architectures beyond MLP / feed-forward', 'CNNs', 'RNNs / LSTMs / Transformers', 'Reinforcement learning', 'NLP', 'Generative AI',
      'Bayesian optimization', 'PCA variants', 'DB transactions / concurrency / recovery', 'Operating systems', 'Computer networks', 'Compiler design',
      'Automata / theory of computation',
    ],
    dontSkip: [
      'Partition matrices', 'Idempotent matrices', 'Tuple relational calculus', 'Data transformation (normalization, discretization, sampling, compression)',
      'Measure categorization (additive / semi / non-additive)', 't & χ² distributions', 'LOOCV', 'Conditional PDF', 'Quadratic forms', 'LU decomposition',
      'Concept hierarchies', 'Approximate inference via sampling', 'k-medoids', 'LDA',
    ],
  },
  nodes,
}

fs.writeFileSync(T('gate-da-2027.json'), JSON.stringify(template, null, 1))
let topics = 0, items = 0, res = 0, pyq = 0
for (const n of nodes) {
  res += n.resources.length
  pyq += n.pyqs.length
  for (const c of n.children) (topics++, (items += c.subtopics.length), (res += c.resources.length), (pyq += c.pyqs.length))
}
console.log(`✓ templates/gate-da-2027.json — ${nodes.length} subjects, ${topics} topics, ${items} checklist items, ${res} resources, ${pyq} PYQ links`)
if (missing.length) console.log('  ⚠ no research yet for:', missing.join(', '))
