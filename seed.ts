/* Demo data. Every person, course detail and notice below is FICTIONAL. */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { indexResource } from "../src/lib/ai";

const db = new PrismaClient();
const day = 86400_000;
const inDays = (n: number, h = 17) => { const d = new Date(Date.now() + n * day); d.setHours(h, 0, 0, 0); return d; };

const MATERIALS: Record<string, { title: string; type: "NOTES" | "SLIDES" | "LAB_MANUAL" | "PAST_PAPER"; description: string; content: string }[]> = {
  "CSE-2101": [
    { title: "Binary search trees and balancing", type: "NOTES", description: "BST operations, rotations, AVL trees.", content: "A binary search tree (BST) keeps keys ordered: every key in the left subtree is smaller than the node and every key in the right subtree is larger. Search, insert and delete take O(h) time where h is the tree height. In a degenerate tree built from sorted input, h equals n, so operations degrade to O(n).\n\nAn AVL tree restores balance by tracking a balance factor, the height of the left subtree minus the height of the right subtree, at each node. When an insertion makes a balance factor +2 or -2, the tree performs a single or double rotation. Rotations preserve the BST ordering while reducing height, which guarantees O(log n) search, insert and delete." },
    { title: "Hash tables and collision handling", type: "SLIDES", description: "Hash functions, chaining and open addressing.", content: "A hash table maps keys to array indexes using a hash function. Two keys that map to the same index cause a collision. Separate chaining stores colliding keys in a linked list at each index. Open addressing stores every key in the array itself and probes for the next free slot using linear probing, quadratic probing or double hashing.\n\nThe load factor is the number of keys divided by the number of slots. Expected lookup time is O(1) when the load factor is kept below a constant, which is why tables resize and rehash when the load factor grows too high." },
  ],
  "CSE-2201": [
    { title: "Normalization and functional dependencies", type: "NOTES", description: "1NF to BCNF with examples.", content: "Normalization reduces redundancy and update anomalies by decomposing relations using functional dependencies. A relation is in first normal form (1NF) when all attribute values are atomic. It is in second normal form (2NF) when it is in 1NF and no non-key attribute depends on only part of a composite key. Third normal form (3NF) additionally removes transitive dependencies, where a non-key attribute depends on another non-key attribute.\n\nBoyce-Codd normal form (BCNF) is stricter: for every non-trivial functional dependency X -> Y, X must be a superkey. A decomposition should be lossless, meaning the original relation can be rebuilt by joining the parts." },
    { title: "Indexing and B-trees", type: "SLIDES", description: "Why databases use B+ trees.", content: "A database index speeds up lookups by avoiding a full table scan. Most relational databases use B+ trees because they are shallow and wide, so finding a key needs only a few disk reads. In a B-tree, a node splits when it overflows and the median key moves up to the parent. All leaves stay at the same depth, and the tree grows in height only when the root splits.\n\nIn a B+ tree all records live in the leaf nodes, which are linked together, making range queries efficient. Indexes speed up reads but slow down writes, because every insert or update must also maintain the index." },
    { title: "Transactions and ACID", type: "NOTES", description: "Atomicity, consistency, isolation, durability.", content: "A transaction is a unit of work that must either complete entirely or have no effect. ACID summarises its guarantees. Atomicity means all operations succeed or all are rolled back. Consistency means a transaction moves the database from one valid state to another. Isolation means concurrent transactions do not see each other's partial work. Durability means committed changes survive crashes, usually via a write-ahead log.\n\nIsolation levels trade correctness for concurrency. Read committed prevents dirty reads. Repeatable read also prevents non-repeatable reads. Serializable prevents phantom reads as well, but allows the least concurrency." },
  ],
  "CSE-3101": [
    { title: "CPU scheduling algorithms", type: "SLIDES", description: "FCFS, SJF, round robin, priority.", content: "CPU scheduling decides which ready process runs next. First-come first-served (FCFS) is simple but short jobs can wait behind long ones, the convoy effect. Shortest job first (SJF) minimises average waiting time but needs burst-time estimates and can starve long jobs. Round robin gives each process a fixed time quantum and then moves it to the back of the queue, which gives good response time. If the quantum is too large it behaves like FCFS, and if it is too small context-switch overhead dominates.\n\nPriority scheduling runs the highest-priority process first. Aging, gradually raising the priority of waiting processes, prevents starvation." },
    { title: "Deadlocks", type: "NOTES", description: "Conditions, prevention and detection.", content: "A deadlock occurs when a set of processes are each waiting for a resource held by another in the set. Four conditions must hold together: mutual exclusion, hold and wait, no preemption, and circular wait. Preventing any one of them prevents deadlock. For example, requiring all resources to be requested in a global order removes circular wait.\n\nDeadlock avoidance, such as the banker's algorithm, grants a request only if the system stays in a safe state. Detection builds a wait-for graph and looks for cycles. Recovery involves terminating a process or preempting resources." },
  ],
  "CSE-3201": [
    { title: "TCP congestion control", type: "NOTES", description: "Slow start, congestion avoidance, fast retransmit.", content: "TCP controls how fast it sends using a congestion window (cwnd). In slow start, cwnd begins small and doubles every round-trip time until it reaches the slow-start threshold (ssthresh). After that, congestion avoidance increases cwnd by about one segment per round trip. When packet loss is detected by a timeout, TCP sets ssthresh to half of cwnd and restarts slow start. When loss is detected by three duplicate acknowledgements, fast retransmit resends the missing segment and fast recovery halves cwnd without restarting from one.\n\nThis additive-increase, multiplicative-decrease (AIMD) behaviour lets competing flows share a link fairly." },
    { title: "OSI and TCP/IP models", type: "SLIDES", description: "Layers and their responsibilities.", content: "The OSI model has seven layers: physical, data link, network, transport, session, presentation and application. The TCP/IP model groups these into four: link, internet, transport and application. The network or internet layer routes packets between hosts using IP addresses. The transport layer provides process-to-process delivery, with TCP offering reliable ordered streams and UDP offering low-overhead datagrams. Each layer adds its own header to the data from the layer above, called encapsulation." },
  ],
};

async function main() {
  for (const m of ["auditLog", "message", "conversation", "documentChunk", "notification", "submission", "assignment", "calendarEvent", "resource", "notice", "enrollment", "project", "course", "passwordResetToken", "studentProfile", "facultyProfile", "user", "department"] as const)
    await (db[m] as unknown as { deleteMany: () => Promise<unknown> }).deleteMany();

  const up = path.resolve(process.env.UPLOAD_DIR ?? "./uploads");
  await mkdir(up, { recursive: true });
  await writeFile(path.join(up, "00000000-0000-0000-0000-000000000000.txt"), "Fictional demo submission file.\n");

  const hash = await bcrypt.hash("Demo@12345", 12);
  const cse = await db.department.create({ data: { code: "CSE", name: "Computer Science and Engineering (demo)" } });
  const eee = await db.department.create({ data: { code: "EEE", name: "Electrical and Electronic Engineering (demo)" } });
  void eee;

  const mk = (email: string, name: string, role: "ADMIN" | "FACULTY" | "STUDENT", extra: object = {}) => db.user.create({ data: { email, name, role, passwordHash: hash, bio: "Fictional demo account.", ...extra } });
  const admin = await mk("admin@smarthub.demo", "Demo Admin", "ADMIN");
  const f1 = await mk("faculty@smarthub.demo", "Dr. Amina Rahman", "FACULTY", { facultyProfile: { create: { designation: "Associate Professor", office: "Room 402", departmentId: cse.id } } });
  const f2 = await mk("faculty2@smarthub.demo", "Prof. Tanvir Hossain", "FACULTY", { facultyProfile: { create: { designation: "Professor", office: "Room 310", departmentId: cse.id } } });
  const names = ["Demo Student", "Nabila Karim", "Rafiq Ahmed", "Sadia Islam", "Imran Chowdhury", "Farhana Akter"];
  const students = [];
  for (let i = 0; i < names.length; i++)
    students.push(await mk(i === 0 ? "student@smarthub.demo" : `student${i + 1}@smarthub.demo`, names[i], "STUDENT", { studentProfile: { create: { studentId: `DEMO-${2400 + i}`, semester: 5, batch: "2023", departmentId: cse.id } } }));

  const courseData = [
    ["CSE-2101", "Data Structures", 3, 3, f1.id, "Core data structures and their analysis: trees, hashing, heaps and graphs.", "Week 1-3: Arrays, lists, stacks, queues\nWeek 4-6: Trees, BST, AVL\nWeek 7-9: Hashing, heaps\nWeek 10-13: Graphs and traversals\nWeek 14: Revision"],
    ["CSE-2201", "Database Systems", 3, 4, f1.id, "Relational model, SQL, normalization, indexing and transactions.", "Week 1-3: Relational model and SQL\nWeek 4-6: Normalization\nWeek 7-9: Indexing and query processing\nWeek 10-13: Transactions and concurrency\nWeek 14: Revision"],
    ["CSE-3101", "Operating Systems", 3, 5, f2.id, "Processes, scheduling, synchronization, deadlocks and memory management.", "Week 1-3: Processes and threads\nWeek 4-6: CPU scheduling\nWeek 7-9: Synchronization and deadlocks\nWeek 10-13: Memory and file systems\nWeek 14: Revision"],
    ["CSE-3201", "Computer Networks", 3, 6, f2.id, "Layered architecture, TCP/IP, routing and congestion control.", "Week 1-3: Layered models\nWeek 4-6: Transport layer\nWeek 7-9: Network layer and routing\nWeek 10-13: Link layer and wireless\nWeek 14: Revision"],
    ["CSE-3110", "Software Engineering Lab", 1.5, 5, f1.id, "Team-based software project using agile practices, version control and testing.", "Sprint planning, version control, code review, testing, CI, final demo."],
  ] as const;
  const courses: Record<string, { id: string }> = {};
  for (const [code, title, credits, semester, instructorId, description, syllabus] of courseData)
    courses[code] = await db.course.create({ data: { code, title, credits, semester, instructorId, description, syllabus, departmentId: cse.id } });

  for (const s of students) for (const code of ["CSE-2101", "CSE-2201", "CSE-3101", ...(s.email.endsWith("student@smarthub.demo") || Math.random() > 0.5 ? ["CSE-3201"] : [])])
    await db.enrollment.create({ data: { userId: s.id, courseId: courses[code].id } });

  for (const [code, items] of Object.entries(MATERIALS)) {
    const owner = courseData.find((c) => c[0] === code)![4];
    for (const m of items) { const r = await db.resource.create({ data: { ...m, courseId: courses[code].id, uploaderId: owner, isPublic: m.title.startsWith("OSI") } }); await indexResource(r.id); }
  }
  const lab = await db.resource.create({ data: { title: "Git workflow cheat sheet", type: "LINK", description: "Branching, rebasing and pull requests.", url: "https://git-scm.com/docs", courseId: courses["CSE-3110"].id, uploaderId: f1.id, isPublic: true } });
  void lab;

  const a = async (code: string, title: string, description: string, dueDays: number, by: string) => db.assignment.create({ data: { title, description, dueAt: inDays(dueDays), courseId: courses[code].id, creatorId: by, maxMarks: 100 } });
  const a1 = await a("CSE-2101", "Implement an AVL tree", "Implement insert and delete with rotations in C++ or Java. Submit source and a short report.", -5, f1.id);
  const a2 = await a("CSE-2201", "Normalize the library schema", "Decompose the provided library schema to BCNF and justify each step.", 3, f1.id);
  await a("CSE-3101", "Scheduler simulator", "Simulate FCFS, SJF and Round Robin and compare average waiting times.", 6, f2.id);
  await a("CSE-3201", "TCP congestion window plot", "Plot cwnd over time for a lossy link and annotate slow start and AIMD phases.", 10, f2.id);
  await a("CSE-2201", "Index design report", "Propose indexes for five queries and explain your choices.", 14, f1.id);

  await db.submission.create({ data: { assignmentId: a1.id, studentId: students[0].id, filePath: "00000000-0000-0000-0000-000000000000.txt", fileName: "avl-demo-submission.txt", note: "Demo placeholder", status: "REVIEWED", feedback: "Rotations are correct. Add tests for double rotations.", marks: 86, reviewerId: f1.id, reviewedAt: new Date() } });
  await db.submission.create({ data: { assignmentId: a1.id, studentId: students[1].id, filePath: "00000000-0000-0000-0000-000000000000.txt", fileName: "avl-nabila.txt", status: "LATE" } });
  await db.submission.create({ data: { assignmentId: a2.id, studentId: students[2].id, filePath: "00000000-0000-0000-0000-000000000000.txt", fileName: "bcnf-rafiq.txt", status: "SUBMITTED" } });

  const n = (title: string, body: string, category: "GENERAL" | "ACADEMIC" | "EXAM" | "EVENT" | "SCHOLARSHIP" | "LAB", priority: "LOW" | "NORMAL" | "HIGH" | "URGENT", authorId: string, ago: number, courseId?: string) =>
    db.notice.create({ data: { title, body, category, priority, authorId, courseId, publishedAt: new Date(Date.now() - ago * day) } });
  await n("Mid-term exam schedule (demo)", "Fictional schedule for demonstration. Mid-terms run over two weeks. Check the calendar for your course.", "EXAM", "HIGH", admin.id, 1);
  await n("Lab 4 moved to Thursday", "Database Systems lab 4 is moved to Thursday 2 PM because of a room clash.", "LAB", "NORMAL", f1.id, 2, courses["CSE-2201"].id);
  await n("Demo scholarship call", "A fictional merit scholarship is open for applications. This notice exists only to demonstrate the board.", "SCHOLARSHIP", "LOW", admin.id, 4);
  await n("Programming contest this Saturday", "Teams of three. Register with your batch representative. Demo event.", "EVENT", "NORMAL", admin.id, 3);
  await n("Server maintenance tonight", "SmartHub may be unavailable between 1 AM and 3 AM.", "GENERAL", "URGENT", admin.id, 0);

  await db.calendarEvent.createMany({ data: [
    { title: "Data Structures mid-term", type: "EXAM", startsAt: inDays(9, 10), courseId: courses["CSE-2101"].id, creatorId: f1.id, description: "Fictional date" },
    { title: "Operating Systems quiz 2", type: "EXAM", startsAt: inDays(5, 9), courseId: courses["CSE-3101"].id, creatorId: f2.id },
    { title: "Department tech fair", type: "EVENT", startsAt: inDays(12, 11), creatorId: admin.id, description: "Project demos and talks" },
    { title: "Course registration closes", type: "REMINDER", startsAt: inDays(7, 23), creatorId: admin.id },
  ] });
  await db.project.createMany({ data: [
    { title: "CampusBus Tracker", description: "Real-time campus shuttle tracking with a driver app and rider map.", technologies: ["React", "Node.js", "PostgreSQL", "WebSockets"], githubUrl: "https://github.com/example/campusbus", year: 2025, ownerId: students[1].id },
    { title: "Lab Inventory Manager", description: "Barcode-based inventory and issue tracking for departmental labs.", technologies: ["Next.js", "Prisma", "PostgreSQL"], demoUrl: "https://example.com/demo", year: 2025, ownerId: students[2].id },
    { title: "Bangla Handwriting Recognizer", description: "A CNN that recognises handwritten Bangla digits.", technologies: ["Python", "PyTorch"], githubUrl: "https://github.com/example/bangla-ocr", year: 2024, ownerId: students[3].id },
    { title: "Exam Seat Planner", description: "Generates seating plans that avoid adjacent batches.", technologies: ["TypeScript", "Next.js"], year: 2024, ownerId: students[0].id },
  ] });
  await db.notification.createMany({ data: [
    { userId: students[0].id, title: "New assignment: Normalize the library schema", href: `/assignments/${a2.id}` },
    { userId: students[0].id, title: "Feedback on Implement an AVL tree", href: `/assignments/${a1.id}` },
    { userId: students[0].id, title: "Mid-term exam schedule (demo)", href: "/notices" },
  ] });
  console.log("Seeded demo data. Sign in with student@smarthub.demo / faculty@smarthub.demo / admin@smarthub.demo, password Demo@12345");
}
main().then(() => db.$disconnect()).catch(async (e) => { console.error(e); await db.$disconnect(); process.exit(1); });
