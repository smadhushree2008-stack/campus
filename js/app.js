(function () {
  "use strict";

  let state = CampusStore.loadStateLocal();
  let currentView = "discover";
  let currentBoardFilter = "all";
  let currentSwapTab = "incoming";
  let selectedSwapId = null;

  // ---------- Helpers ----------
  function $(id) {
    return document.getElementById(id);
  }

  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getCurrentUser() {
    return (
      state.students.find((s) => s.id === state.currentUserId) ||
      state.students[0]
    );
  }

  function getStudentById(id) {
    return state.students.find((s) => s.id === id) || null;
  }

  function getAverageRating(student) {
    if (!student.reviews || student.reviews.length === 0) return null;
    const sum = student.reviews.reduce((acc, r) => acc + Number(r.rating || 0), 0);
    return (sum / student.reviews.length).toFixed(1);
  }

  function normalizeSkill(name) {
    return String(name || "").trim().toLowerCase();
  }

  function skillsMatch(a, b) {
    const na = normalizeSkill(a);
    const nb = normalizeSkill(b);
    if (!na || !nb) return false;
    return na === nb || na.includes(nb) || nb.includes(na);
  }

  function computeMatch(me, peer) {
    if (!me || !peer || me.id === peer.id) {
      return { theyTeachMe: [], iTeachThem: [], isMutual: false, isOneWay: false, score: 0 };
    }
    const theyTeachMe = peer.teaches
      .filter((pt) => me.wants.some((mw) => skillsMatch(pt.name, mw.name)))
      .map((s) => s.name);

    const iTeachThem = me.teaches
      .filter((mt) => peer.wants.some((pw) => skillsMatch(mt.name, pw.name)))
      .map((s) => s.name);

    const isMutual = theyTeachMe.length > 0 && iTeachThem.length > 0;
    const isOneWay = !isMutual && (theyTeachMe.length > 0 || iTeachThem.length > 0);
    const score = theyTeachMe.length * 2 + iTeachThem.length * 2 + (isMutual ? 5 : 0);

    return { theyTeachMe, iTeachThem, isMutual, isOneWay, score };
  }

  function showToast(message, undoHandler) {
    const container = $("toast-container");
    const toast = document.createElement("div");
    toast.className = "toast";

    const msgSpan = document.createElement("span");
    msgSpan.textContent = message;
    toast.appendChild(msgSpan);

    if (typeof undoHandler === "function") {
      const undoBtn = document.createElement("button");
      undoBtn.type = "button";
      undoBtn.className = "toast-undo";
      undoBtn.textContent = "Undo";
      undoBtn.addEventListener("click", () => {
        undoHandler();
        toast.remove();
      });
      toast.appendChild(undoBtn);
    }

    container.appendChild(toast);
    setTimeout(() => {
      if (toast.isConnected) toast.remove();
    }, undoHandler ? 5500 : 3800);
  }

  function saveAndRender() {
    CampusStore.persistState(state);
    renderAll();
  }

  function nowTimeLabel() {
    const d = new Date();
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  // ---------- Modals ----------
  function openModal(id) {
    const el = $(id);
    if (el) el.hidden = false;
  }

  function closeAllModals() {
    document.querySelectorAll(".modal-backdrop").forEach((m) => {
      m.hidden = true;
    });
  }

  // ---------- Navigation ----------
  function switchView(viewName) {
    currentView = viewName;
    document.querySelectorAll(".view").forEach((v) => {
      v.classList.toggle("active", v.id === "view-" + viewName);
    });
    document.querySelectorAll(".nav-link").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.view === viewName);
    });
    $("account-dropdown").hidden = true;
    $("account-menu-btn").setAttribute("aria-expanded", "false");
    renderAll();
  }

  // ---------- Header & Stats ----------
  function renderHeader() {
    const me = getCurrentUser();
    $("header-credits").textContent = String(me.credits);
    const avatar = $("header-avatar");
    avatar.textContent = me.initials;
    avatar.style.background = me.color;
    $("header-user-name").textContent = me.name.split(" ")[0];
    $("dropdown-user-name").textContent = me.name;
    $("dropdown-user-sub").textContent = me.major + " • " + me.year;

    const incomingPending = state.swaps.filter(
      (s) => s.recipientId === me.id && s.status === "pending"
    ).length;
    const swapsBadge = $("swaps-badge");
    if (incomingPending > 0) {
      swapsBadge.textContent = String(incomingPending);
      swapsBadge.hidden = false;
    } else {
      swapsBadge.hidden = true;
    }

    const unreadMail = (state.emails || []).filter(
      (m) => m.recipientId === me.id && !m.read
    ).length;
    const mailBadge = $("mail-badge");
    if (unreadMail > 0) {
      mailBadge.textContent = String(unreadMail);
      mailBadge.hidden = false;
    } else {
      mailBadge.hidden = true;
    }

    $("board-count-badge").textContent = String(state.boardPosts.length);
  }

  // ---------- View 1: Discover Marketplace ----------
  function renderDiscover() {
    const me = getCurrentUser();
    const peers = state.students.filter((s) => s.id !== me.id);

    const totalSkills = state.students.reduce((sum, s) => sum + s.teaches.length, 0);
    const totalCompleted = state.swaps.filter((s) => s.status === "completed").length + 24;
    const mutualCount = peers.filter((p) => computeMatch(me, p).isMutual).length;

    $("stat-students").textContent = String(state.students.length);
    $("stat-skills").textContent = String(totalSkills);
    $("stat-swaps").textContent = String(totalCompleted);
    $("stat-matches").textContent = String(mutualCount);

    const searchQ = normalizeSkill($("discover-search").value);
    const catFilter = $("filter-category").value;
    const fmtFilter = $("filter-format").value;
    const mutualOnly = $("filter-mutual").checked;

    const hasFilters = Boolean(searchQ || catFilter !== "all" || fmtFilter !== "all" || mutualOnly);
    $("clear-filters-btn").hidden = !hasFilters;

    const enriched = peers
      .map((peer) => ({ peer, match: computeMatch(me, peer) }))
      .filter(({ peer, match }) => {
        if (mutualOnly && !match.isMutual) return false;
        if (fmtFilter !== "all" && peer.format !== fmtFilter) return false;
        if (catFilter !== "all") {
          const hasCat =
            peer.teaches.some((t) => t.category === catFilter) ||
            peer.wants.some((w) => w.category === catFilter);
          if (!hasCat) return false;
        }
        if (searchQ) {
          const haystack = [
            peer.name,
            peer.major,
            peer.bio,
            ...peer.teaches.map((t) => t.name + " " + t.category),
            ...peer.wants.map((w) => w.name + " " + w.category)
          ]
            .join(" ")
            .toLowerCase();
          if (!haystack.includes(searchQ)) return false;
        }
        return true;
      })
      .sort((a, b) => b.match.score - a.match.score || b.peer.completedSwaps - a.peer.completedSwaps);

    $("discover-results-count").textContent =
      "Showing " + enriched.length + " of " + peers.length + " peer students";

    const grid = $("students-grid");
    if (enriched.length === 0) {
      grid.innerHTML =
        '<div class="empty-state" style="grid-column: 1 / -1;">' +
        '<div class="empty-icon">⌕</div>' +
        "<h3>No matching students found</h3>" +
        "<p>Try clearing your filters or adding more skills you want to learn in your profile.</p>" +
        "</div>";
      return;
    }

    grid.innerHTML = enriched
      .map(({ peer, match }) => {
        const avg = getAverageRating(peer);
        const ratingHtml = avg
          ? '<span class="rating-pill">★ ' + esc(avg) + " (" + peer.reviews.length + ")</span>"
          : '<span class="rating-pill">New Peer</span>';

        let matchBanner = "";
        if (match.isMutual) {
          matchBanner =
            '<div class="match-banner mutual">' +
            "<span>⇄ Mutual Match! Trade " +
            esc(match.iTeachThem[0]) +
            " ↔ " +
            esc(match.theyTeachMe[0]) +
            "</span>" +
            "</div>";
        } else if (match.theyTeachMe.length > 0) {
          matchBanner =
            '<div class="match-banner oneway">' +
            "<span>✦ Teaches " + esc(match.theyTeachMe[0]) + " you want</span>" +
            "</div>";
        } else if (match.iTeachThem.length > 0) {
          matchBanner =
            '<div class="match-banner oneway">' +
            "<span>✦ Wants to learn " + esc(match.iTeachThem[0]) + " from you</span>" +
            "</div>";
        }

        const teachesHtml = peer.teaches
          .map((t) => {
            const hl = match.theyTeachMe.includes(t.name) ? " highlight" : "";
            return (
              '<span class="skill-pill teach' +
              hl +
              '">' +
              esc(t.name) +
              ' <span class="skill-level">' +
              esc(t.level) +
              "</span></span>"
            );
          })
          .join("");

        const wantsHtml = peer.wants
          .map((w) => {
            const hl = match.iTeachThem.some((n) => skillsMatch(n, w.name)) ? " highlight" : "";
            return '<span class="skill-pill learn' + hl + '">' + esc(w.name) + "</span>";
          })
          .join("");

        return (
          '<article class="student-card' +
          (match.isMutual ? " is-mutual" : "") +
          '">' +
          '<div class="student-card-head">' +
          '<div class="avatar" style="background:' + esc(peer.color) + '">' + esc(peer.initials) + "</div>" +
          '<div class="student-head-info">' +
          '<div class="student-name-row">' +
          '<h3 class="student-name">' + esc(peer.name) + "</h3>" +
          ratingHtml +
          "</div>" +
          '<div class="student-meta">' +
          esc(peer.major) + " • " + esc(peer.year) + " • " + peer.completedSwaps + " swaps" +
          "</div>" +
          "</div>" +
          "</div>" +
          matchBanner +
          '<p class="student-bio">' + esc(peer.bio) + "</p>" +
          '<div><div class="skills-group-label">Can Teach</div><div class="skill-pills">' +
          teachesHtml +
          "</div></div>" +
          '<div><div class="skills-group-label">Wants to Learn</div><div class="skill-pills">' +
          wantsHtml +
          "</div></div>" +
          '<div class="student-card-footer">' +
          '<span class="format-tag">' + esc(peer.format) + "</span>" +
          '<div class="card-actions">' +
          '<button class="btn btn-outline btn-sm" data-action="view-student" data-id="' + esc(peer.id) + '" type="button">Profile</button>' +
          '<button class="btn btn-primary btn-sm" data-action="propose-swap" data-id="' + esc(peer.id) + '" type="button">Propose Swap</button>' +
          "</div>" +
          "</div>" +
          "</article>"
        );
      })
      .join("");
  }

  // ---------- View 2: Request Board ----------
  function renderBoard() {
    const me = getCurrentUser();
    const cat = $("board-category-filter").value;

    const posts = state.boardPosts.filter((p) => {
      if (currentBoardFilter === "mine" && p.authorId !== me.id) return false;
      if (currentBoardFilter !== "all" && currentBoardFilter !== "mine" && p.type !== currentBoardFilter) {
        return false;
      }
      if (cat !== "all" && p.category !== cat) return false;
      return true;
    });

    const grid = $("board-grid");
    if (posts.length === 0) {
      grid.innerHTML =
        '<div class="empty-state" style="grid-column: 1 / -1;">' +
        '<div class="empty-icon">📋</div>' +
        "<h3>No board posts match this filter</h3>" +
        "<p>Be the first to post a skill request or mini-workshop!</p>" +
        "</div>";
      return;
    }

    grid.innerHTML = posts
      .map((post) => {
        const author = getStudentById(post.authorId) || {
          name: "Student",
          initials: "ST",
          color: "#57534e",
          major: ""
        };
        const isMine = post.authorId === me.id;
        const typeBadge =
          post.type === "seeking"
            ? '<span class="badge indigo">Seeking Help</span>'
            : '<span class="badge green">Offering Session</span>';

        return (
          '<article class="board-card">' +
          '<div class="board-card-top">' +
          typeBadge +
          '<span class="badge gray">' + esc(post.category) + "</span>" +
          "</div>" +
          "<h3>" + esc(post.title) + "</h3>" +
          "<p>" + esc(post.details) + "</p>" +
          '<div class="skill-pills">' +
          '<span class="skill-pill ' + (post.type === "seeking" ? "learn" : "teach") + '">' +
          esc(post.skillTag) +
          "</span>" +
          '<span class="badge gray">⏱ ' + esc(post.timing) + "</span>" +
          "</div>" +
          '<div class="board-card-footer">' +
          '<div class="board-author">' +
          '<div class="avatar sm" style="background:' + esc(author.color) + '">' + esc(author.initials) + "</div>" +
          "<span>" + esc(author.name) + " • " + esc(post.createdAt) + "</span>" +
          "</div>" +
          (isMine
            ? '<button class="btn btn-outline btn-sm" data-action="delete-post" data-id="' + esc(post.id) + '" type="button">Delete Post</button>'
            : '<button class="btn btn-primary btn-sm" data-action="respond-post" data-id="' + esc(post.id) + '" type="button">Offer Swap</button>') +
          "</div>" +
          "</article>"
        );
      })
      .join("");
  }

  // ---------- View 3: My Swaps & Chat ----------
  function getSwapsByTab(me) {
    return {
      incoming: state.swaps.filter((s) => s.recipientId === me.id && s.status === "pending"),
      outgoing: state.swaps.filter((s) => s.senderId === me.id && s.status === "pending"),
      active: state.swaps.filter(
        (s) => (s.senderId === me.id || s.recipientId === me.id) && s.status === "active"
      ),
      completed: state.swaps.filter(
        (s) =>
          (s.senderId === me.id || s.recipientId === me.id) &&
          (s.status === "completed" || s.status === "declined")
      )
    };
  }

  function renderSwaps() {
    const me = getCurrentUser();
    const groups = getSwapsByTab(me);

    $("tab-count-incoming").textContent = String(groups.incoming.length);
    $("tab-count-active").textContent = String(groups.active.length);
    $("tab-count-outgoing").textContent = String(groups.outgoing.length);
    $("tab-count-completed").textContent = String(groups.completed.length);

    document.querySelectorAll("[data-swap-tab]").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.swapTab === currentSwapTab);
    });

    const listItems = groups[currentSwapTab] || [];
    if (!listItems.some((s) => s.id === selectedSwapId)) {
      selectedSwapId = listItems.length > 0 ? listItems[0].id : null;
    }

    const listEl = $("swaps-list");
    if (listItems.length === 0) {
      listEl.innerHTML =
        '<div class="empty-state" style="padding: 28px 12px;">' +
        "<p>No " + esc(currentSwapTab) + " swaps right now.</p>" +
        "</div>";
    } else {
      listEl.innerHTML = listItems
        .map((swap) => {
          const isSender = swap.senderId === me.id;
          const peer = getStudentById(isSender ? swap.recipientId : swap.senderId);
          const peerName = peer ? peer.name : "Student";
          const iTeach = isSender ? swap.offerSkill : swap.requestSkill;
          const iLearn = isSender ? swap.requestSkill : swap.offerSkill;
          const statusBadge =
            swap.status === "pending"
              ? '<span class="badge amber">Pending</span>'
              : swap.status === "active"
              ? '<span class="badge green">Active</span>'
              : swap.status === "completed"
              ? '<span class="badge indigo">Completed</span>'
              : '<span class="badge gray">Declined</span>';

          const exchangeSummary =
            swap.mode === "credit"
              ? isSender
                ? "Learn " + esc(iLearn) + " (1 Credit)"
                : "Teach " + esc(iTeach) + " (+1 Credit)"
              : esc(iTeach) + " ↔ " + esc(iLearn);

          return (
            '<button class="swap-item' +
            (swap.id === selectedSwapId ? " selected" : "") +
            '" data-select-swap="' +
            esc(swap.id) +
            '" type="button">' +
            '<div class="swap-item-top">' +
            '<span class="swap-item-peer">' + esc(peerName) + "</span>" +
            statusBadge +
            "</div>" +
            '<div class="swap-item-skills">' + exchangeSummary + "</div>" +
            '<div class="swap-item-meta">' + esc(swap.datetime) + " • " + swap.messages.length + " msgs</div>" +
            "</button>"
          );
        })
        .join("");
    }

    renderSwapDetail(me);
  }

  function renderSwapDetail(me) {
    const pane = $("swap-detail-pane");
    const swap = state.swaps.find((s) => s.id === selectedSwapId);
    if (!swap) {
      pane.innerHTML =
        '<div class="empty-state">' +
        '<div class="empty-icon">⇄</div>' +
        "<h3>Select a swap to view details &amp; chat</h3>" +
        "<p>Choose an incoming, active, or completed exchange on the left, or explore the Discover page to start a new swap.</p>" +
        "</div>";
      return;
    }

    const isSender = swap.senderId === me.id;
    const peer = getStudentById(isSender ? swap.recipientId : swap.senderId);
    const iTeach = isSender ? swap.offerSkill : swap.requestSkill;
    const iLearn = isSender ? swap.requestSkill : swap.offerSkill;
    const alreadyReviewed = (swap.reviewedBy || []).includes(me.id);

    let actionsHtml = "";
    if (swap.status === "pending" && !isSender) {
      actionsHtml =
        '<button class="btn btn-teach" data-swap-action="accept" data-id="' + esc(swap.id) + '" type="button">Accept Swap</button>' +
        '<button class="btn btn-outline" data-swap-action="decline" data-id="' + esc(swap.id) + '" type="button">Decline</button>';
    } else if (swap.status === "pending" && isSender) {
      actionsHtml =
        '<button class="btn btn-outline" data-swap-action="cancel" data-id="' + esc(swap.id) + '" type="button">Withdraw Request</button>';
    } else if (swap.status === "active") {
      actionsHtml =
        '<button class="btn btn-primary" data-swap-action="open-review" data-id="' + esc(swap.id) + '" type="button">Mark Completed &amp; Rate Partner</button>';
    } else if (swap.status === "completed" && !alreadyReviewed) {
      actionsHtml =
        '<button class="btn btn-primary" data-swap-action="open-review" data-id="' + esc(swap.id) + '" type="button">Leave Review</button>';
    }

    const messagesHtml = swap.messages
      .map((m) => {
        const mine = m.senderId === me.id;
        const senderObj = getStudentById(m.senderId);
        const senderLabel = mine ? "You" : senderObj ? senderObj.name.split(" ")[0] : "Peer";
        return (
          '<div class="chat-bubble ' + (mine ? "mine" : "theirs") + '">' +
          "<div>" + esc(m.text) + "</div>" +
          '<div class="chat-meta">' + esc(senderLabel) + " • " + esc(m.time) + "</div>" +
          "</div>"
        );
      })
      .join("");

    const leftSkillText =
      swap.mode === "credit"
        ? isSender
          ? "1 Skill Credit"
          : esc(iTeach)
        : esc(iTeach);
    const rightSkillText =
      swap.mode === "credit"
        ? isSender
          ? esc(iLearn)
          : "+1 Skill Credit Earned"
        : esc(iLearn);

    pane.innerHTML =
      '<div class="swap-detail-header">' +
      '<div style="display:flex;gap:12px;align-items:center;">' +
      '<div class="avatar" style="background:' + esc(peer ? peer.color : "#666") + '">' + esc(peer ? peer.initials : "ST") + "</div>" +
      "<div>" +
      '<h3 style="margin:0;">Swap with ' + esc(peer ? peer.name : "Student") + "</h3>" +
      '<div class="student-meta">' + esc(peer ? peer.major + " • " + peer.year : "") + "</div>" +
      "</div>" +
      "</div>" +
      '<div class="swap-actions-bar">' + actionsHtml + "</div>" +
      "</div>" +
      '<div class="swap-exchange-strip">' +
      "<div>" +
      '<div class="swap-side-label">You Give</div>' +
      '<div class="swap-side-skill">' + leftSkillText + "</div>" +
      "</div>" +
      '<div class="swap-arrow">⇄</div>' +
      "<div>" +
      '<div class="swap-side-label">You Receive</div>' +
      '<div class="swap-side-skill">' + rightSkillText + "</div>" +
      "</div>" +
      "</div>" +
      '<div class="swap-info-row">' +
      "<span>📍 " + esc(swap.location) + "</span>" +
      "<span>🕒 " + esc(swap.datetime) + "</span>" +
      "<span>📅 Proposed " + esc(swap.createdAt) + "</span>" +
      "</div>" +
      '<div class="chat-box">' +
      '<div class="chat-header">Direct Swap Messages</div>' +
      '<div class="chat-messages" id="chat-messages-scroll">' + messagesHtml + "</div>" +
      (swap.status === "declined"
        ? ""
        : '<form class="chat-form" id="swap-chat-form" data-swap-id="' + esc(swap.id) + '">' +
          '<input type="text" id="chat-input" placeholder="Message ' + esc(peer ? peer.name.split(" ")[0] : "peer") + ' about session notes or times..." required maxlength="300" />' +
          '<button class="btn btn-primary btn-sm" type="submit">Send</button>' +
          "</form>") +
      "</div>";

    const scrollEl = $("chat-messages-scroll");
    if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
  }

  // ---------- View 4: Leaderboard ----------
  function renderLeaderboard() {
    const ranked = [...state.students].sort((a, b) => {
      if (b.completedSwaps !== a.completedSwaps) return b.completedSwaps - a.completedSwaps;
      return b.hoursShared - a.hoursShared;
    });

    const list = $("leaderboard-list");
    list.innerHTML = ranked
      .map((stu, idx) => {
        const avg = getAverageRating(stu) || "—";
        const isTop = idx < 3;
        return (
          '<div class="leader-row' + (isTop ? " top" : "") + '">' +
          '<div class="rank-num">#' + (idx + 1) + "</div>" +
          '<div class="avatar" style="background:' + esc(stu.color) + '">' + esc(stu.initials) + "</div>" +
          "<div>" +
          '<div style="font-weight:700;font-size:16px;">' + esc(stu.name) + "</div>" +
          '<div class="student-meta">' + esc(stu.major) + " • " + esc(stu.year) + "</div>" +
          '<div class="skill-pills" style="margin-top:6px;">' +
          stu.teaches.map((t) => '<span class="skill-pill teach">' + esc(t.name) + "</span>").join("") +
          "</div>" +
          "</div>" +
          '<div class="leader-metrics">' +
          '<div><span class="leader-metric-val">' + stu.completedSwaps + '</span><span class="leader-metric-lbl">Swaps</span></div>' +
          '<div><span class="leader-metric-val">' + stu.hoursShared + 'h</span><span class="leader-metric-lbl">Shared</span></div>' +
          '<div><span class="leader-metric-val">★ ' + esc(avg) + '</span><span class="leader-metric-lbl">Rating</span></div>' +
          '<button class="btn btn-outline btn-sm" data-action="view-student" data-id="' + esc(stu.id) + '" type="button">View</button>' +
          "</div>" +
          "</div>"
        );
      })
      .join("");
  }

  // ---------- View 5: Profile ----------
  function renderProfile() {
    const me = getCurrentUser();
    $("prof-name").value = me.name;
    $("prof-email").value = me.email || "";
    $("prof-campus").value = me.campus;
    $("prof-major").value = me.major;
    $("prof-year").value = me.year;
    $("prof-format").value = me.format;
    $("prof-availability").value = me.availability;
    $("prof-bio").value = me.bio;
    $("prof-notify-email").checked = Boolean(me.notifyOnMatchPosts);
    $("prof-alert-keywords").value = (me.alertKeywords || []).join(", ");
    document.querySelectorAll('#prof-alert-categories input[type="checkbox"]').forEach((cb) => {
      cb.checked = (me.alertCategories || []).includes(cb.value);
    });

    const myPosts = state.boardPosts.filter((p) => p.authorId === me.id);
    const myPostsEl = $("prof-my-posts-list");
    if (myPosts.length === 0) {
      myPostsEl.innerHTML =
        '<p class="student-meta">You have not published any Request Board posts yet. Click "+ Add Post" above to create one.</p>';
    } else {
      myPostsEl.innerHTML = myPosts
        .map(
          (p) =>
            '<div class="my-post-row">' +
            '<div>' +
            '<div style="font-weight:700;font-size:13.5px;">' + esc(p.title) + "</div>" +
            '<div class="swap-item-meta">' + esc(p.type === "seeking" ? "Seeking" : "Offering") + " • " + esc(p.skillTag) + " • " + esc(p.createdAt) + "</div>" +
            "</div>" +
            '<button class="btn btn-outline btn-sm" data-action="delete-post" data-id="' + esc(p.id) + '" type="button">Delete</button>' +
            "</div>"
        )
        .join("");
    }

    $("prof-teach-list").innerHTML =
      me.teaches.length === 0
        ? '<span class="student-meta">No offered skills yet — add one below!</span>'
        : me.teaches
            .map(
              (t, idx) =>
                '<span class="editable-pill teach">' +
                esc(t.name) +
                " (" +
                esc(t.level) +
                ")" +
                '<button class="pill-remove" data-remove-teach="' + idx + '" type="button" aria-label="Remove ' + esc(t.name) + '">×</button>' +
                "</span>"
            )
            .join("");

    $("prof-learn-list").innerHTML =
      me.wants.length === 0
        ? '<span class="student-meta">No wanted skills yet — add one below!</span>'
        : me.wants
            .map(
              (w, idx) =>
                '<span class="editable-pill learn">' +
                esc(w.name) +
                '<button class="pill-remove" data-remove-learn="' + idx + '" type="button" aria-label="Remove ' + esc(w.name) + '">×</button>' +
                "</span>"
            )
            .join("");

    const revList = $("prof-reviews-list");
    if (!me.reviews || me.reviews.length === 0) {
      revList.innerHTML = '<p class="student-meta">No peer reviews yet. Complete a skill swap to earn your first rating!</p>';
    } else {
      revList.innerHTML = me.reviews
        .map(
          (r) =>
            '<div class="review-card">' +
            '<div class="review-head"><span>' + esc(r.fromName) + "</span><span>★ " + esc(r.rating) + "/5</span></div>" +
            "<div>" + esc(r.comment) + "</div>" +
            '<div class="swap-item-meta" style="margin-top:4px;">' + esc(r.date) + "</div>" +
            "</div>"
        )
        .join("");
    }
  }

  // ---------- Modals Population ----------
  function openStudentDetailModal(studentId) {
    const stu = getStudentById(studentId);
    if (!stu) return;
    const me = getCurrentUser();
    const match = computeMatch(me, stu);
    const avg = getAverageRating(stu);

    const reviewsHtml =
      stu.reviews && stu.reviews.length > 0
        ? stu.reviews
            .map(
              (r) =>
                '<div class="review-card">' +
                '<div class="review-head"><span>' + esc(r.fromName) + "</span><span>★ " + esc(r.rating) + "/5</span></div>" +
                "<div>" + esc(r.comment) + "</div>" +
                "</div>"
            )
            .join("")
        : '<p class="student-meta">No reviews yet.</p>';

    $("student-detail-body").innerHTML =
      '<div style="display:flex;gap:14px;align-items:center;margin-bottom:14px;">' +
      '<div class="avatar lg" style="background:' + esc(stu.color) + '">' + esc(stu.initials) + "</div>" +
      "<div>" +
      '<h2 id="detail-modal-title" style="margin:0;">' + esc(stu.name) + "</h2>" +
      '<div class="student-meta">' + esc(stu.campus) + " • " + esc(stu.major) + " (" + esc(stu.year) + ")</div>" +
      '<div class="student-meta">' +
      (avg ? "★ " + esc(avg) + " avg rating" : "New member") +
      " • " + stu.completedSwaps + " swaps • " + esc(stu.format) +
      "</div>" +
      "</div>" +
      "</div>" +
      (match.isMutual
        ? '<div class="match-banner mutual" style="margin-bottom:14px;">⇄ Mutual Match! You can teach ' +
          esc(match.iTeachThem.join(", ")) +
          " and learn " +
          esc(match.theyTeachMe.join(", ")) +
          "</div>"
        : "") +
      '<p style="margin:0 0 14px;">' + esc(stu.bio) + "</p>" +
      '<div style="margin-bottom:14px;"><strong>Availability:</strong> ' + esc(stu.availability) + "</div>" +
      '<div style="margin-bottom:14px;"><div class="skills-group-label">Can Teach</div><div class="skill-pills">' +
      stu.teaches
        .map((t) => '<span class="skill-pill teach">' + esc(t.name) + " (" + esc(t.level) + ")</span>")
        .join("") +
      "</div></div>" +
      '<div style="margin-bottom:18px;"><div class="skills-group-label">Wants to Learn</div><div class="skill-pills">' +
      stu.wants.map((w) => '<span class="skill-pill learn">' + esc(w.name) + "</span>").join("") +
      "</div></div>" +
      '<div style="margin-bottom:18px;"><div class="skills-group-label">Peer Reviews</div><div class="reviews-list">' +
      reviewsHtml +
      "</div></div>" +
      (stu.id !== me.id
        ? '<div class="form-actions"><button class="btn btn-primary" data-action="propose-from-detail" data-id="' + esc(stu.id) + '" type="button">Propose a Swap with ' + esc(stu.name.split(" ")[0]) + "</button></div>"
        : "");

    openModal("modal-student-detail");
  }

  function openProposeSwapModal(recipientId, options) {
    const opts = typeof options === "string" ? { requestSkill: options } : options || {};
    const me = getCurrentUser();
    const peer = getStudentById(recipientId);
    if (!peer) return;

    $("propose-recipient-id").value = peer.id;
    $("propose-target-sub").textContent =
      "Propose a 1-on-1 exchange with " + peer.name + " (" + peer.major + ").";

    const offerSel = $("propose-offer-skill");
    const mySkills = me.teaches.length > 0 ? me.teaches.map((t) => t.name) : ["General Peer Help"];
    if (opts.offerSkill && !mySkills.some((s) => skillsMatch(s, opts.offerSkill))) {
      mySkills.unshift(opts.offerSkill);
    }
    offerSel.innerHTML = mySkills
      .map((name) => {
        const wantedByPeer = peer.wants.some((pw) => skillsMatch(pw.name, name));
        const selected = opts.offerSkill && skillsMatch(opts.offerSkill, name) ? " selected" : "";
        return (
          '<option value="' +
          esc(name) +
          '"' +
          selected +
          ">" +
          esc(name) +
          (wantedByPeer ? " ★ (They want this!)" : "") +
          "</option>"
        );
      })
      .join("");

    const reqSel = $("propose-request-skill");
    const theirSkills = peer.teaches.length > 0 ? peer.teaches.map((t) => t.name) : ["Peer Mentoring"];
    if (opts.requestSkill && !theirSkills.some((s) => skillsMatch(s, opts.requestSkill))) {
      theirSkills.unshift(opts.requestSkill);
    }
    reqSel.innerHTML = theirSkills
      .map((name) => {
        const wantedByMe = me.wants.some((mw) => skillsMatch(mw.name, name));
        const selected =
          opts.requestSkill && skillsMatch(opts.requestSkill, name) ? " selected" : "";
        return (
          '<option value="' +
          esc(name) +
          '"' +
          selected +
          ">" +
          esc(name) +
          (wantedByMe ? " ★ (On your wish list)" : "") +
          "</option>"
        );
      })
      .join("");

    $("propose-mode").value = "direct";
    $("propose-offer-wrap").hidden = false;
    $("propose-location").value =
      peer.format === "Online" ? "Zoom / Google Meet" : "Campus Library Study Room";
    $("propose-datetime").value = "This week • 60 min";
    $("propose-message").value = "";

    openModal("modal-propose-swap");
  }

  function openAuthModal() {
    const me = getCurrentUser();
    $("switch-user-list").innerHTML = state.students
      .map((stu) => {
        const isCurrent = stu.id === me.id;
        return (
          '<button class="switch-user-btn' +
          (isCurrent ? " current" : "") +
          '" data-switch-user="' +
          esc(stu.id) +
          '" type="button">' +
          '<div class="avatar sm" style="background:' + esc(stu.color) + '">' + esc(stu.initials) + "</div>" +
          '<div style="flex:1;">' +
          '<div style="font-weight:700;font-size:14px;">' +
          esc(stu.name) +
          (isCurrent ? " (Signed In)" : "") +
          "</div>" +
          '<div class="student-meta">' + esc(stu.major) + " • " + stu.credits + " credits</div>" +
          "</div>" +
          "</button>"
        );
      })
      .join("");

    openModal("modal-auth");
  }

  function openReviewModal(swapId) {
    const me = getCurrentUser();
    const swap = state.swaps.find((s) => s.id === swapId);
    if (!swap) return;
    const peer = getStudentById(swap.senderId === me.id ? swap.recipientId : swap.senderId);
    $("review-swap-id").value = swapId;
    $("review-target-sub").textContent =
      "Rate your session with " + (peer ? peer.name : "your partner") + " and update your swap record.";
    $("review-rating").value = "5";
    $("review-comment").value = "";
    openModal("modal-review");
  }

  function findInterestMatchReason(stu, post) {
    if (!stu || !stu.notifyOnMatchPosts || !stu.email) return null;
    const postText = (post.skillTag + " " + post.title + " " + post.details).toLowerCase();

    const matchedWant = (stu.wants || []).find(
      (w) => skillsMatch(w.name, post.skillTag) || postText.includes(normalizeSkill(w.name))
    );
    if (matchedWant) return "Matches your wanted skill: " + matchedWant.name;

    const matchedKeyword = (stu.alertKeywords || []).find(
      (kw) => normalizeSkill(kw) && postText.includes(normalizeSkill(kw))
    );
    if (matchedKeyword) return "Matches your alert keyword: " + matchedKeyword;

    if ((stu.alertCategories || []).includes(post.category)) {
      return "Matches your subscribed category: " + post.category;
    }

    if (post.type === "seeking") {
      const matchedTeach = (stu.teaches || []).find((t) => skillsMatch(t.name, post.skillTag));
      if (matchedTeach) return "Needs help with a skill you teach: " + matchedTeach.name;
    }

    return null;
  }

  function dispatchInterestEmailsForPost(post, author) {
    if (!Array.isArray(state.emails)) state.emails = [];
    const notified = [];
    const newEmails = [];

    state.students.forEach((stu) => {
      if (stu.id === author.id) return;
      const reason = findInterestMatchReason(stu, post);
      if (!reason) return;

      const mail = {
        id: "mail-" + Date.now() + "-" + stu.id,
        recipientId: stu.id,
        toEmail: stu.email,
        fromName: author.name,
        postId: post.id,
        skillTag: post.skillTag,
        reason: reason,
        subject: "[CampusSwap Alert] " + author.name + " posted: " + post.title,
        body: post.details,
        sentAt: nowTimeLabel(),
        read: false
      };
      state.emails.unshift(mail);
      newEmails.push(mail);
      notified.push({ name: stu.name, email: stu.email });
    });

    if (newEmails.length > 0 && window.location.protocol.startsWith("http")) {
      fetch("/api/notify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notifications: newEmails })
      }).catch(() => {
        // Static mode without backend mail logger; in-app mail outbox still updated
      });
    }

    return notified;
  }

  function openMailAlertsModal() {
    const me = getCurrentUser();
    $("mail-target-sub").textContent =
      "Email alerts configured for " + (me.email || "your student email") + ".";

    const myEmails = (state.emails || []).filter((m) => m.recipientId === me.id);
    const listEl = $("mail-alerts-list");

    if (myEmails.length === 0) {
      listEl.innerHTML =
        '<div class="empty-state" style="padding: 30px 16px;">' +
        '<div class="empty-icon">✉</div>' +
        "<h3>No email alerts yet</h3>" +
        "<p>When another student publishes a post matching your wanted skills, keywords, or subscribed categories, the notification sent to <strong>" +
        esc(me.email || "your email") +
        "</strong> will appear here.</p>" +
        "</div>";
    } else {
      listEl.innerHTML = myEmails
        .map((m) => {
          const mailtoHref =
            "mailto:" +
            encodeURIComponent(m.toEmail) +
            "?subject=" +
            encodeURIComponent(m.subject) +
            "&body=" +
            encodeURIComponent(m.body + "\n\n--\nSent via CampusSwap Alert (" + m.reason + ")");

          return (
            '<div class="mail-item' +
            (m.read ? "" : " unread") +
            '">' +
            '<div class="mail-item-head">' +
            '<span class="badge ' +
            (m.read ? "gray" : "coral") +
            '">' +
            (m.read ? "Read" : "New Email Alert") +
            "</span>" +
            '<span class="mail-meta">To: ' +
            esc(m.toEmail) +
            " • " +
            esc(m.sentAt) +
            "</span>" +
            "</div>" +
            '<div class="mail-subject">' +
            esc(m.subject) +
            "</div>" +
            '<div class="mail-meta">' +
            esc(m.reason) +
            "</div>" +
            '<div class="mail-body">' +
            esc(m.body) +
            "</div>" +
            '<div class="mail-actions">' +
            '<button class="btn btn-primary btn-sm" data-mail-action="view-post" data-id="' +
            esc(m.id) +
            '" data-post-id="' +
            esc(m.postId) +
            '" type="button">View on Board</button>' +
            (m.read
              ? ""
              : '<button class="btn btn-outline btn-sm" data-mail-action="mark-read" data-id="' +
                esc(m.id) +
                '" type="button">Mark Read</button>') +
            '<a class="btn btn-outline btn-sm" href="' +
            esc(mailtoHref) +
            '" style="text-decoration:none;">Forward via Mail App</a>' +
            "</div>" +
            "</div>"
          );
        })
        .join("");
    }

    openModal("modal-mail-alerts");
  }

  function deleteBoardPost(postId) {
    const idx = state.boardPosts.findIndex((p) => p.id === postId);
    if (idx === -1) return;
    const removed = state.boardPosts[idx];
    state.boardPosts.splice(idx, 1);
    saveAndRender();

    showToast('Deleted post "' + removed.title + '".', () => {
      state.boardPosts.splice(Math.min(idx, state.boardPosts.length), 0, removed);
      saveAndRender();
    });
  }

  // ---------- Render All ----------
  function renderAll() {
    renderHeader();
    if (currentView === "discover") renderDiscover();
    if (currentView === "board") renderBoard();
    if (currentView === "swaps") renderSwaps();
    if (currentView === "leaderboard") renderLeaderboard();
    if (currentView === "profile") renderProfile();
  }

  // ---------- Event Wiring ----------
  function bindEvents() {
    // Top navigation
    document.querySelectorAll(".nav-link").forEach((btn) => {
      btn.addEventListener("click", () => switchView(btn.dataset.view));
    });

    $("nav-brand").addEventListener("click", () => switchView("discover"));

    $("hero-matches-btn").addEventListener("click", () => {
      $("filter-mutual").checked = true;
      renderDiscover();
      $("discover-results-count").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    $("hero-profile-btn").addEventListener("click", () => switchView("profile"));

    // Account menu dropdown
    $("account-menu-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      const dd = $("account-dropdown");
      const next = !dd.hidden;
      dd.hidden = next;
      $("account-menu-btn").setAttribute("aria-expanded", String(!next));
    });

    document.addEventListener("click", (e) => {
      const wrap = document.querySelector(".account-menu-wrap");
      if (wrap && !wrap.contains(e.target)) {
        $("account-dropdown").hidden = true;
        $("account-menu-btn").setAttribute("aria-expanded", "false");
      }
    });

    document.querySelectorAll("[data-view-jump]").forEach((btn) => {
      btn.addEventListener("click", () => switchView(btn.dataset.viewJump));
    });

    $("open-auth-modal-btn").addEventListener("click", () => {
      $("account-dropdown").hidden = true;
      openAuthModal();
    });

    $("reset-demo-btn").addEventListener("click", () => {
      state = CampusStore.resetState();
      selectedSwapId = null;
      $("discover-search").value = "";
      $("filter-category").value = "all";
      $("filter-format").value = "all";
      $("filter-mutual").checked = false;
      $("account-dropdown").hidden = true;
      $("account-menu-btn").setAttribute("aria-expanded", "false");
      showToast("Demo data restored to default campus state.");
      renderAll();
    });

    // Discover filters
    ["discover-search", "filter-category", "filter-format", "filter-mutual"].forEach((id) => {
      $(id).addEventListener("input", renderDiscover);
      $(id).addEventListener("change", renderDiscover);
    });

    $("clear-filters-btn").addEventListener("click", () => {
      $("discover-search").value = "";
      $("filter-category").value = "all";
      $("filter-format").value = "all";
      $("filter-mutual").checked = false;
      renderDiscover();
    });

    // Delegated clicks for student cards, board cards, detail modal, leaderboard
    document.addEventListener("click", (e) => {
      const viewBtn = e.target.closest('[data-action="view-student"]');
      if (viewBtn) {
        openStudentDetailModal(viewBtn.dataset.id);
        return;
      }

      const proposeBtn = e.target.closest('[data-action="propose-swap"]');
      if (proposeBtn) {
        openProposeSwapModal(proposeBtn.dataset.id);
        return;
      }

      const proposeDetailBtn = e.target.closest('[data-action="propose-from-detail"]');
      if (proposeDetailBtn) {
        closeAllModals();
        openProposeSwapModal(proposeDetailBtn.dataset.id);
        return;
      }

      const respondPostBtn = e.target.closest('[data-action="respond-post"]');
      if (respondPostBtn) {
        const post = state.boardPosts.find((p) => p.id === respondPostBtn.dataset.id);
        if (post) {
          const opts =
            post.type === "seeking"
              ? { offerSkill: post.skillTag }
              : { requestSkill: post.skillTag };
          openProposeSwapModal(post.authorId, opts);
        }
        return;
      }

      const deletePostBtn = e.target.closest('[data-action="delete-post"]');
      if (deletePostBtn) {
        deleteBoardPost(deletePostBtn.dataset.id);
        return;
      }

      const mailActionBtn = e.target.closest("[data-mail-action]");
      if (mailActionBtn) {
        const mailId = mailActionBtn.dataset.id;
        const mailObj = (state.emails || []).find((m) => m.id === mailId);
        if (mailObj) mailObj.read = true;
        if (mailActionBtn.dataset.mailAction === "view-post") {
          closeAllModals();
          currentBoardFilter = "all";
          document.querySelectorAll("[data-board-filter]").forEach((b) => {
            b.classList.toggle("active", b.dataset.boardFilter === "all");
          });
          switchView("board");
          CampusStore.persistState(state);
        } else {
          CampusStore.persistState(state);
          renderHeader();
          openMailAlertsModal();
        }
        return;
      }

      const selectSwapBtn = e.target.closest("[data-select-swap]");
      if (selectSwapBtn) {
        selectedSwapId = selectSwapBtn.dataset.selectSwap;
        renderSwaps();
        return;
      }

      const swapActionBtn = e.target.closest("[data-swap-action]");
      if (swapActionBtn) {
        handleSwapAction(swapActionBtn.dataset.swapAction, swapActionBtn.dataset.id);
        return;
      }

      const switchUserBtn = e.target.closest("[data-switch-user]");
      if (switchUserBtn) {
        state.currentUserId = switchUserBtn.dataset.switchUser;
        selectedSwapId = null;
        closeAllModals();
        const user = getCurrentUser();
        showToast("Signed in as " + user.name + ".");
        saveAndRender();
        return;
      }

      const rmTeach = e.target.closest("[data-remove-teach]");
      if (rmTeach) {
        const me = getCurrentUser();
        me.teaches.splice(Number(rmTeach.dataset.removeTeach), 1);
        showToast("Removed offered skill.");
        saveAndRender();
        return;
      }

      const rmLearn = e.target.closest("[data-remove-learn]");
      if (rmLearn) {
        const me = getCurrentUser();
        me.wants.splice(Number(rmLearn.dataset.removeLearn), 1);
        showToast("Removed wanted skill.");
        saveAndRender();
        return;
      }

      if (e.target.matches("[data-close-modal]") || e.target.classList.contains("modal-backdrop")) {
        closeAllModals();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeAllModals();
        $("account-dropdown").hidden = true;
      }
    });

    // Board filters
    document.querySelectorAll("[data-board-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        currentBoardFilter = btn.dataset.boardFilter;
        document.querySelectorAll("[data-board-filter]").forEach((b) => {
          b.classList.toggle("active", b === btn);
        });
        renderBoard();
      });
    });

    $("board-category-filter").addEventListener("change", renderBoard);

    // Post modal & mail inbox triggers
    $("open-post-modal-btn").addEventListener("click", () => openModal("modal-new-post"));
    $("board-new-post-btn").addEventListener("click", () => openModal("modal-new-post"));
    $("profile-add-post-btn").addEventListener("click", () => openModal("modal-new-post"));
    $("open-mail-modal-btn").addEventListener("click", openMailAlertsModal);

    $("mark-all-mail-read-btn").addEventListener("click", () => {
      const me = getCurrentUser();
      (state.emails || []).forEach((m) => {
        if (m.recipientId === me.id) m.read = true;
      });
      CampusStore.persistState(state);
      renderHeader();
      openMailAlertsModal();
      showToast("All email alerts marked as read.");
    });

    $("open-alert-prefs-btn").addEventListener("click", () => {
      closeAllModals();
      switchView("profile");
      $("prof-email").focus();
    });

    // Swap tabs
    document.querySelectorAll("[data-swap-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        currentSwapTab = btn.dataset.swapTab;
        selectedSwapId = null;
        renderSwaps();
      });
    });

    // Propose Swap Mode Toggle
    $("propose-mode").addEventListener("change", () => {
      $("propose-offer-wrap").hidden = $("propose-mode").value === "credit";
    });

    // Form: Propose Swap
    $("propose-swap-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const me = getCurrentUser();
      const recipientId = $("propose-recipient-id").value;
      const mode = $("propose-mode").value;

      if (mode === "credit" && me.credits < 1) {
        showToast("You need at least 1 Skill Credit for credit-only sessions, or choose a 1-for-1 Swap!");
        return;
      }

      const location = $("propose-location").value.trim();
      const datetime = $("propose-datetime").value.trim();
      const message = $("propose-message").value.trim();
      if (!location || !datetime || !message) {
        showToast("Please fill in location, date/time, and an intro message.");
        return;
      }

      const newSwap = {
        id: "swap-" + Date.now(),
        senderId: me.id,
        recipientId: recipientId,
        mode: mode,
        offerSkill: mode === "credit" ? "1 Skill Credit" : $("propose-offer-skill").value,
        requestSkill: $("propose-request-skill").value,
        location: location,
        datetime: datetime,
        status: "pending",
        createdAt: "Just now",
        messages: [
          {
            senderId: me.id,
            text: message,
            time: nowTimeLabel()
          }
        ],
        reviewedBy: []
      };

      state.swaps.unshift(newSwap);
      closeAllModals();
      currentSwapTab = "outgoing";
      selectedSwapId = newSwap.id;
      showToast("Swap request sent! Switching to My Swaps.");
      switchView("swaps");
      CampusStore.persistState(state);
    });

    // Form: New Board Post
    $("new-post-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const me = getCurrentUser();
      const title = $("post-title").value.trim();
      const details = $("post-details").value.trim();
      const skillTag = $("post-skill-tag").value.trim();
      const timing = $("post-timing").value.trim();
      if (!title || !details || !skillTag || !timing) {
        showToast("Please complete all post fields.");
        return;
      }

      const post = {
        id: "post-" + Date.now(),
        authorId: me.id,
        type: $("post-type").value,
        category: $("post-category").value,
        title: title,
        details: details,
        skillTag: skillTag,
        timing: timing,
        createdAt: "Just now"
      };
      state.boardPosts.unshift(post);
      const notified = dispatchInterestEmailsForPost(post, me);

      $("new-post-form").reset();
      closeAllModals();
      if (notified.length > 0) {
        const preview = notified
          .slice(0, 2)
          .map((n) => n.name + " (" + n.email + ")")
          .join(", ");
        const extra = notified.length > 2 ? " + " + (notified.length - 2) + " more" : "";
        showToast("Post published! Email alert sent to " + preview + extra + ".");
      } else {
        showToast("Published to Campus Request Board!");
      }
      switchView("board");
      CampusStore.persistState(state);
    });

    // Form: Register New Student
    $("register-student-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const name = $("reg-name").value.trim();
      const email = $("reg-email").value.trim();
      const major = $("reg-major").value.trim();
      const year = $("reg-year").value;
      const campus = $("reg-campus").value.trim();
      const teachName = $("reg-teach").value.trim();
      const learnName = $("reg-learn").value.trim();

      if (!name || !email || !major || !teachName || !learnName) {
        showToast("Please fill in all registration fields.");
        return;
      }

      const newStudent = {
        id: "stu-" + Date.now(),
        name: name,
        email: email,
        notifyOnMatchPosts: true,
        alertCategories: ["Tech & Coding", "Academics & Math"],
        alertKeywords: [learnName],
        initials: CampusStore.computeInitials(name),
        color: CampusStore.pickAvatarColor(state.students.length),
        campus: campus,
        major: major,
        year: year,
        format: "Hybrid",
        availability: "Flexible campus & online hours",
        bio: major + " (" + year + ") excited to trade " + teachName + " for " + learnName + "!",
        credits: 2,
        completedSwaps: 0,
        hoursShared: 0,
        teaches: [{ name: teachName, category: "Tech & Coding", level: "Intermediate" }],
        wants: [{ name: learnName, category: "Academics & Math" }],
        reviews: []
      };

      state.students.push(newStudent);
      state.currentUserId = newStudent.id;
      selectedSwapId = null;
      $("register-student-form").reset();
      closeAllModals();
      showToast("Welcome, " + newStudent.name + "! Email alerts enabled for " + newStudent.email + ".");
      saveAndRender();
    });

    // Form: Swap Chat (delegated)
    document.addEventListener("submit", (e) => {
      if (e.target.id !== "swap-chat-form") return;
      e.preventDefault();
      const swapId = e.target.dataset.swapId;
      const input = $("chat-input");
      const text = input.value.trim();
      if (!text) return;

      const swap = state.swaps.find((s) => s.id === swapId);
      const me = getCurrentUser();
      if (!swap) return;

      swap.messages.push({
        senderId: me.id,
        text: text,
        time: nowTimeLabel()
      });
      input.value = "";
      saveAndRender();
      const nextInput = $("chat-input");
      if (nextInput) nextInput.focus();
    });

    // Form: Complete Swap & Review
    $("review-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const me = getCurrentUser();
      const swapId = $("review-swap-id").value;
      const rating = Number($("review-rating").value);
      const comment = $("review-comment").value.trim();
      const swap = state.swaps.find((s) => s.id === swapId);
      if (!swap) return;

      const peer = getStudentById(swap.senderId === me.id ? swap.recipientId : swap.senderId);
      if (!swap.reviewedBy) swap.reviewedBy = [];

      if (swap.status !== "completed") {
        swap.status = "completed";
        const s1 = getStudentById(swap.senderId);
        const s2 = getStudentById(swap.recipientId);
        if (s1) {
          s1.completedSwaps += 1;
          s1.hoursShared = Number((s1.hoursShared + 1).toFixed(1));
        }
        if (s2) {
          s2.completedSwaps += 1;
          s2.hoursShared = Number((s2.hoursShared + 1).toFixed(1));
        }
        if (swap.mode === "credit") {
          if (s1 && s1.credits > 0) s1.credits -= 1;
          if (s2) s2.credits += 1;
        } else {
          // Direct mutual swaps reward both peers for mentoring!
          if (s1) s1.credits += 1;
          if (s2) s2.credits += 1;
        }
      }

      if (peer && !swap.reviewedBy.includes(me.id)) {
        peer.reviews.unshift({
          id: "rev-" + Date.now(),
          fromId: me.id,
          fromName: me.name,
          rating: rating,
          comment: comment,
          date: new Date().toISOString().slice(0, 10)
        });
        swap.reviewedBy.push(me.id);
      }

      closeAllModals();
      currentSwapTab = "completed";
      showToast("Swap marked completed! Review posted & credits updated.");
      saveAndRender();
    });

    // Form: Profile Basic Info & Email Alert Preferences
    $("profile-basic-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const me = getCurrentUser();
      me.name = $("prof-name").value.trim();
      me.email = $("prof-email").value.trim();
      me.initials = CampusStore.computeInitials(me.name);
      me.campus = $("prof-campus").value.trim();
      me.major = $("prof-major").value.trim();
      me.year = $("prof-year").value;
      me.format = $("prof-format").value;
      me.availability = $("prof-availability").value.trim();
      me.bio = $("prof-bio").value.trim();
      me.notifyOnMatchPosts = $("prof-notify-email").checked;
      me.alertKeywords = $("prof-alert-keywords")
        .value.split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      me.alertCategories = Array.from(
        document.querySelectorAll('#prof-alert-categories input[type="checkbox"]:checked')
      ).map((cb) => cb.value);
      showToast("Profile & email alert settings saved!");
      saveAndRender();
    });

    // Form: Add Teach Skill
    $("add-teach-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const me = getCurrentUser();
      const name = $("new-teach-name").value.trim();
      if (!name) return;
      if (me.teaches.some((t) => normalizeSkill(t.name) === normalizeSkill(name))) {
        showToast("That skill is already in your offered list.");
        return;
      }
      me.teaches.push({
        name: name,
        category: $("new-teach-cat").value,
        level: $("new-teach-level").value
      });
      $("new-teach-name").value = "";
      showToast("Added " + name + " to Skills You Can Teach!");
      saveAndRender();
    });

    // Form: Add Learn Skill
    $("add-learn-form").addEventListener("submit", (e) => {
      e.preventDefault();
      const me = getCurrentUser();
      const name = $("new-learn-name").value.trim();
      if (!name) return;
      if (me.wants.some((w) => normalizeSkill(w.name) === normalizeSkill(name))) {
        showToast("That skill is already in your wish list.");
        return;
      }
      me.wants.push({
        name: name,
        category: $("new-learn-cat").value
      });
      $("new-learn-name").value = "";
      showToast("Added " + name + " to Skills You Want to Learn!");
      saveAndRender();
    });
  }

  function handleSwapAction(action, swapId) {
    const swap = state.swaps.find((s) => s.id === swapId);
    if (!swap) return;
    const me = getCurrentUser();

    if (action === "accept") {
      swap.status = "active";
      swap.messages.push({
        senderId: me.id,
        text: "Accepted the swap request! Looking forward to our session.",
        time: nowTimeLabel()
      });
      currentSwapTab = "active";
      selectedSwapId = swap.id;
      showToast("Swap accepted! Moved to Active Swaps.");
      saveAndRender();
    } else if (action === "decline") {
      swap.status = "declined";
      currentSwapTab = "completed";
      showToast("Swap request declined.");
      saveAndRender();
    } else if (action === "cancel") {
      state.swaps = state.swaps.filter((s) => s.id !== swapId);
      selectedSwapId = null;
      showToast("Swap request withdrawn.");
      saveAndRender();
    } else if (action === "open-review") {
      openReviewModal(swapId);
    }
  }

  // ---------- Boot ----------
  bindEvents();
  renderAll();

  CampusStore.syncFromServerIfAvailable().then((serverState) => {
    if (serverState) {
      state = serverState;
      renderAll();
    }
  });
})();
