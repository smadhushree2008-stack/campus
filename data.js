(function (global) {
  const STORAGE_KEY = "campus_swap_state_v1";

  const AVATAR_COLORS = [
    "#E05336",
    "#176B50",
    "#3452C7",
    "#9333EA",
    "#B45309",
    "#0F766E",
    "#BE185D",
    "#1D4ED8"
  ];

  function defaultEmailForName(name) {
    const slug = String(name || "student")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ".")
      .replace(/^\.+|\.+$/g, "");
    return (slug || "student") + "@northgate.edu";
  }

  function createInitialState() {
    return {
      currentUserId: "stu-maya",
      students: [
        {
          id: "stu-maya",
          name: "Maya Lin",
          email: "maya.lin@northgate.edu",
          notifyOnMatchPosts: true,
          alertCategories: ["Design & Creative", "Music & Arts"],
          alertKeywords: ["Figma", "Guitar", "Spanish"],
          initials: "ML",
          color: "#E05336",
          campus: "Northgate University",
          major: "Computer Science",
          year: "Junior",
          format: "Hybrid",
          availability: "Tue/Thu after 4 PM, Sat mornings",
          bio: "CS junior building full-stack projects. Happy to walk through Python, React, or LeetCode prep in exchange for design critiques or acoustic guitar basics!",
          credits: 3,
          completedSwaps: 5,
          hoursShared: 7.5,
          teaches: [
            { name: "Python", category: "Tech & Coding", level: "Expert" },
            { name: "React & JavaScript", category: "Tech & Coding", level: "Advanced" },
            { name: "SQL & Databases", category: "Tech & Coding", level: "Intermediate" }
          ],
          wants: [
            { name: "Figma UI Design", category: "Design & Creative" },
            { name: "Acoustic Guitar", category: "Music & Arts" },
            { name: "Spanish Conversation", category: "Languages" }
          ],
          reviews: [
            {
              id: "rev-1",
              fromId: "stu-leo",
              fromName: "Leo Alvarez",
              rating: 5,
              comment: "Maya explained Python list comprehensions and API calls super clearly in one hour!",
              date: "2026-11-12"
            },
            {
              id: "rev-2",
              fromId: "stu-priya",
              fromName: "Priya Nair",
              rating: 5,
              comment: "Patient teacher and great study partner. Helped me debug my React state issue fast.",
              date: "2026-11-18"
            }
          ]
        },
        {
          id: "stu-leo",
          name: "Leo Alvarez",
          email: "leo.alvarez@northgate.edu",
          notifyOnMatchPosts: true,
          alertCategories: ["Tech & Coding"],
          alertKeywords: ["Python", "React", "Photography"],
          initials: "LA",
          color: "#176B50",
          campus: "Northgate University",
          major: "Interaction Design",
          year: "Senior",
          format: "In-Person",
          availability: "Mon/Wed 2–6 PM at Design Studio",
          bio: "Product design senior obsessed with clean typography and Figma component systems. Looking to level up my coding skills for technical interviews.",
          credits: 4,
          completedSwaps: 8,
          hoursShared: 11,
          teaches: [
            { name: "Figma UI Design", category: "Design & Creative", level: "Expert" },
            { name: "Spanish Conversation", category: "Languages", level: "Expert" },
            { name: "Portfolio Critique", category: "Career & Prep", level: "Advanced" }
          ],
          wants: [
            { name: "Python", category: "Tech & Coding" },
            { name: "React & JavaScript", category: "Tech & Coding" },
            { name: "Photography Lighting", category: "Design & Creative" }
          ],
          reviews: [
            {
              id: "rev-3",
              fromId: "stu-maya",
              fromName: "Maya Lin",
              rating: 5,
              comment: "Leo completely transformed my project UI with auto-layout tips in 45 minutes.",
              date: "2026-11-13"
            }
          ]
        },
        {
          id: "stu-priya",
          name: "Priya Nair",
          email: "priya.nair@northgate.edu",
          notifyOnMatchPosts: true,
          alertCategories: ["Tech & Coding", "Career & Prep"],
          alertKeywords: ["React", "Public Speaking"],
          initials: "PN",
          color: "#3452C7",
          campus: "Northgate University",
          major: "Applied Mathematics",
          year: "Grad Student",
          format: "Hybrid",
          availability: "Weekdays 5–8 PM, Sun afternoon",
          bio: "Math M.S. student & TA. Love breaking down Calculus, Linear Algebra, and Statistics intuitively. Currently learning acoustic guitar and web dev.",
          credits: 6,
          completedSwaps: 11,
          hoursShared: 16,
          teaches: [
            { name: "Calculus I & II", category: "Academics & Math", level: "Expert" },
            { name: "Linear Algebra", category: "Academics & Math", level: "Expert" },
            { name: "R & Statistics", category: "Academics & Math", level: "Advanced" }
          ],
          wants: [
            { name: "React & JavaScript", category: "Tech & Coding" },
            { name: "Public Speaking", category: "Career & Prep" }
          ],
          reviews: [
            {
              id: "rev-4",
              fromId: "stu-sam",
              fromName: "Samira Okafor",
              rating: 5,
              comment: "Saved my Linear Algebra midterm! Her visual examples finally made eigenvalues click.",
              date: "2026-11-15"
            }
          ]
        },
        {
          id: "stu-noah",
          name: "Noah Brooks",
          email: "noah.brooks@northgate.edu",
          notifyOnMatchPosts: true,
          alertCategories: ["Tech & Coding", "Design & Creative"],
          alertKeywords: ["Python", "Premiere"],
          initials: "NB",
          color: "#B45309",
          campus: "Northgate University",
          major: "Music Production",
          year: "Junior",
          format: "In-Person",
          availability: "Tue/Fri afternoons near Arts Quad",
          bio: "Guitarist for 8 years and Ableton Live producer. Bring a spare guitar or borrow my acoustic for beginner chord progressions and fingerpicking.",
          credits: 2,
          completedSwaps: 4,
          hoursShared: 5.5,
          teaches: [
            { name: "Acoustic Guitar", category: "Music & Arts", level: "Expert" },
            { name: "Ableton & Audio Mixing", category: "Music & Arts", level: "Advanced" },
            { name: "Music Theory Basics", category: "Music & Arts", level: "Advanced" }
          ],
          wants: [
            { name: "Python", category: "Tech & Coding" },
            { name: "Video Editing (Premiere)", category: "Design & Creative" },
            { name: "Financial Modeling", category: "Career & Prep" }
          ],
          reviews: [
            {
              id: "rev-5",
              fromId: "stu-chloe",
              fromName: "Chloe Park",
              rating: 5,
              comment: "Learned 4 chords and played my first full song in two sessions. Super chill vibe!",
              date: "2026-11-10"
            }
          ]
        },
        {
          id: "stu-sam",
          name: "Samira Okafor",
          email: "samira.okafor@northgate.edu",
          notifyOnMatchPosts: true,
          alertCategories: ["Academics & Math", "Languages"],
          alertKeywords: ["SQL", "Calculus", "French"],
          initials: "SO",
          color: "#9333EA",
          campus: "Northgate University",
          major: "Film & Media Studies",
          year: "Senior",
          format: "Online",
          availability: "Evenings after 6 PM",
          bio: "Student filmmaker & debate club captain. Happy to teach Premiere Pro editing, color grading, or confident presentation skills.",
          credits: 3,
          completedSwaps: 6,
          hoursShared: 8,
          teaches: [
            { name: "Video Editing (Premiere)", category: "Design & Creative", level: "Expert" },
            { name: "Public Speaking", category: "Career & Prep", level: "Expert" },
            { name: "Photography Lighting", category: "Design & Creative", level: "Advanced" }
          ],
          wants: [
            { name: "SQL & Databases", category: "Tech & Coding" },
            { name: "Calculus I & II", category: "Academics & Math" },
            { name: "French Conversation", category: "Languages" }
          ],
          reviews: [
            {
              id: "rev-6",
              fromId: "stu-ethan",
              fromName: "Ethan Vance",
              rating: 4,
              comment: "Samira's pitch deck feedback gave me so much confidence for our startup demo day.",
              date: "2026-11-08"
            }
          ]
        },
        {
          id: "stu-ethan",
          name: "Ethan Vance",
          email: "ethan.vance@northgate.edu",
          notifyOnMatchPosts: true,
          alertCategories: ["Academics & Math", "Tech & Coding"],
          alertKeywords: ["Python", "Statistics", "French"],
          initials: "EV",
          color: "#0F766E",
          campus: "Northgate University",
          major: "Economics & Finance",
          year: "Senior",
          format: "Hybrid",
          availability: "Mon/Thu mornings, Sunday evenings",
          bio: "Finance senior & case competition finalist. Can help with Excel modeling, resume tailoring, and microeconomics. Looking to learn data tools & French.",
          credits: 3,
          completedSwaps: 5,
          hoursShared: 6.5,
          teaches: [
            { name: "Financial Modeling", category: "Career & Prep", level: "Expert" },
            { name: "Excel & Pivot Tables", category: "Career & Prep", level: "Expert" },
            { name: "Resume & Case Prep", category: "Career & Prep", level: "Advanced" }
          ],
          wants: [
            { name: "R & Statistics", category: "Academics & Math" },
            { name: "Python", category: "Tech & Coding" },
            { name: "French Conversation", category: "Languages" }
          ],
          reviews: []
        },
        {
          id: "stu-chloe",
          name: "Chloe Park",
          email: "chloe.park@northgate.edu",
          notifyOnMatchPosts: true,
          alertCategories: ["Design & Creative", "Career & Prep"],
          alertKeywords: ["Figma", "Excel"],
          initials: "CP",
          color: "#BE185D",
          campus: "Northgate University",
          major: "Comparative Literature",
          year: "Sophomore",
          format: "Hybrid",
          availability: "Tue/Wed/Fri 11 AM–3 PM",
          bio: "Bilingual Korean/French speaker and campus magazine editor. Love helping peers polish essays or practice conversational French & Korean!",
          credits: 2,
          completedSwaps: 3,
          hoursShared: 4,
          teaches: [
            { name: "French Conversation", category: "Languages", level: "Expert" },
            { name: "Korean Basics", category: "Languages", level: "Expert" },
            { name: "Academic Essay Editing", category: "Academics & Math", level: "Advanced" }
          ],
          wants: [
            { name: "Figma UI Design", category: "Design & Creative" },
            { name: "Excel & Pivot Tables", category: "Career & Prep" }
          ],
          reviews: []
        }
      ],
      boardPosts: [
        {
          id: "post-1",
          authorId: "stu-noah",
          type: "seeking",
          category: "Tech & Coding",
          title: "Need help automating audio file sorting with Python",
          details: "Trying to write a small Python script to organize 400+ sample wav files by BPM/folder. Happy to trade a 1-hour Acoustic Guitar or Ableton session!",
          skillTag: "Python",
          timing: "This week, 1 hour",
          createdAt: "2 hours ago"
        },
        {
          id: "post-2",
          authorId: "stu-leo",
          type: "offering",
          category: "Design & Creative",
          title: "Offering 1-on-1 Figma Portfolio & Case Study Teardowns",
          details: "Preparing for summer internship applications? Bring your Figma deck or app prototype and I'll help tighten spacing, hierarchy, and storytelling.",
          skillTag: "Figma UI Design",
          timing: "Wed 3–5 PM",
          createdAt: "5 hours ago"
        },
        {
          id: "post-3",
          authorId: "stu-priya",
          type: "seeking",
          category: "Tech & Coding",
          title: "Looking for React Hooks & Tailwind review for research dashboard",
          details: "I have the statistical backend ready in R/JSON and want a clean React frontend. Happy to trade Calculus, Linear Algebra, or Stats tutoring!",
          skillTag: "React & JavaScript",
          timing: "Flexible evenings",
          createdAt: "1 day ago"
        },
        {
          id: "post-4",
          authorId: "stu-chloe",
          type: "offering",
          category: "Languages",
          title: "Casual French Coffee & Conversation Table",
          details: "Anyone prepping for study abroad or French 202? Meet at the Student Union cafe for 45 mins of zero-pressure speaking practice.",
          skillTag: "French Conversation",
          timing: "Fri 1:00 PM",
          createdAt: "2 days ago"
        }
      ],
      swaps: [
        {
          id: "swap-1",
          senderId: "stu-leo",
          recipientId: "stu-maya",
          mode: "direct",
          offerSkill: "Figma UI Design",
          requestSkill: "React & JavaScript",
          location: "Main Library — Collaboration Pod 3",
          datetime: "Thu 4:30 PM (60 min)",
          status: "pending",
          createdAt: "Today, 2:15 PM",
          messages: [
            {
              senderId: "stu-leo",
              text: "Hey Maya! Saw you want to learn Figma UI Design. Want to trade 30 min of Figma auto-layout for 30 min of React component patterns?",
              time: "2:15 PM"
            }
          ],
          reviewedBy: []
        },
        {
          id: "swap-2",
          senderId: "stu-maya",
          recipientId: "stu-noah",
          mode: "direct",
          offerSkill: "Python",
          requestSkill: "Acoustic Guitar",
          location: "Arts Quad Lawn / Practice Room B",
          datetime: "Sat 11:00 AM (60 min)",
          status: "active",
          createdAt: "Yesterday",
          messages: [
            {
              senderId: "stu-maya",
              text: "Hi Noah! I'd love to learn beginner acoustic guitar chords and can help with your Python file-sorting script!",
              time: "Yesterday, 4:10 PM"
            },
            {
              senderId: "stu-noah",
              text: "Awesome! I accepted the swap — I'll bring an extra guitar on Saturday morning. Bring your laptop for the Python script too!",
              time: "Yesterday, 5:02 PM"
            }
          ],
          reviewedBy: []
        },
        {
          id: "swap-3",
          senderId: "stu-priya",
          recipientId: "stu-maya",
          mode: "direct",
          offerSkill: "R & Statistics",
          requestSkill: "React & JavaScript",
          location: "Zoom Video Call",
          datetime: "Nov 18, 6:00 PM",
          status: "completed",
          createdAt: "Nov 16",
          messages: [
            {
              senderId: "stu-priya",
              text: "Thanks again for the React state walkthrough, Maya! That saved me hours.",
              time: "Nov 18, 7:05 PM"
            }
          ],
          reviewedBy: ["stu-priya", "stu-maya"]
        }
      ],
      emails: [
        {
          id: "mail-1",
          recipientId: "stu-maya",
          toEmail: "maya.lin@northgate.edu",
          fromName: "Leo Alvarez",
          postId: "post-2",
          skillTag: "Figma UI Design",
          reason: "Matches your interest in Figma UI Design",
          subject: "[CampusSwap Alert] Leo Alvarez posted: Offering 1-on-1 Figma Portfolio & Case Study Teardowns",
          body: "Preparing for summer internship applications? Bring your Figma deck or app prototype and I'll help tighten spacing, hierarchy, and storytelling.",
          sentAt: "5 hours ago",
          read: false
        }
      ]
    };
  }

  function clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function normalizeState(raw) {
    if (!raw || !Array.isArray(raw.students) || raw.students.length === 0) {
      return null;
    }
    raw.students = raw.students.map((s, idx) => ({
      id: s.id || "stu-" + idx,
      name: s.name || "Student",
      email: s.email || defaultEmailForName(s.name || "Student"),
      notifyOnMatchPosts: typeof s.notifyOnMatchPosts === "boolean" ? s.notifyOnMatchPosts : true,
      alertCategories: Array.isArray(s.alertCategories)
        ? s.alertCategories
        : Array.isArray(s.wants)
        ? [...new Set(s.wants.map((w) => w.category).filter(Boolean))]
        : [],
      alertKeywords: Array.isArray(s.alertKeywords) ? s.alertKeywords : [],
      initials: s.initials || computeInitials(s.name || "Student"),
      color: s.color || pickAvatarColor(idx),
      campus: s.campus || "Campus University",
      major: s.major || "Undeclared",
      year: s.year || "Junior",
      format: s.format || "Hybrid",
      availability: s.availability || "Flexible",
      bio: s.bio || "",
      credits: typeof s.credits === "number" ? s.credits : 2,
      completedSwaps: typeof s.completedSwaps === "number" ? s.completedSwaps : 0,
      hoursShared: typeof s.hoursShared === "number" ? s.hoursShared : 0,
      teaches: Array.isArray(s.teaches) ? s.teaches : [],
      wants: Array.isArray(s.wants) ? s.wants : [],
      reviews: Array.isArray(s.reviews) ? s.reviews : []
    }));
    raw.boardPosts = Array.isArray(raw.boardPosts) ? raw.boardPosts : [];
    raw.swaps = Array.isArray(raw.swaps)
      ? raw.swaps.map((sw) => ({
          ...sw,
          messages: Array.isArray(sw.messages) ? sw.messages : [],
          reviewedBy: Array.isArray(sw.reviewedBy) ? sw.reviewedBy : []
        }))
      : [];
    raw.emails = Array.isArray(raw.emails) ? raw.emails : [];
    if (!raw.students.some((s) => s.id === raw.currentUserId)) {
      raw.currentUserId = raw.students[0].id;
    }
    return raw;
  }

  function loadStateLocal() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = normalizeState(JSON.parse(raw));
        if (parsed) return parsed;
      }
    } catch (e) {
      // Fallback to initial state if storage is unreadable
    }
    const seed = createInitialState();
    saveStateLocal(seed);
    return seed;
  }

  function saveStateLocal(state) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      // Ignore quota errors
    }
  }

  async function syncFromServerIfAvailable() {
    if (!window.location.protocol.startsWith("http")) return null;
    try {
      const res = await fetch("/api/state", { cache: "no-store" });
      if (!res.ok) return null;
      const data = normalizeState(await res.json());
      if (data) {
        saveStateLocal(data);
        return data;
      }
    } catch (e) {
      // Static file server without /api/state; localStorage remains source of truth
    }
    return null;
  }

  function persistState(state) {
    saveStateLocal(state);
    if (window.location.protocol.startsWith("http")) {
      fetch("/api/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state)
      }).catch(function () {
        // Optional backend endpoint; ignore when static-only
      });
    }
  }

  function resetState() {
    const fresh = createInitialState();
    persistState(fresh);
    return fresh;
  }

  function pickAvatarColor(index) {
    return AVATAR_COLORS[index % AVATAR_COLORS.length];
  }

  function computeInitials(name) {
    const parts = String(name || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean);
    if (parts.length === 0) return "ST";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  global.CampusStore = {
    loadStateLocal: loadStateLocal,
    persistState: persistState,
    resetState: resetState,
    syncFromServerIfAvailable: syncFromServerIfAvailable,
    pickAvatarColor: pickAvatarColor,
    computeInitials: computeInitials,
    clone: clone
  };
})(window);
