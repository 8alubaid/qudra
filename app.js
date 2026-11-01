import { approvalBlocker } from "./review-readiness.js";
import { createJourney } from "./journey.js";
const api = createJourney();

let authEpoch = 0;
let analysisSequence = 0;
const app = document.querySelector("#app");
const dialog = document.querySelector("#dialog");
const state = {
  lang: "ar",
  role: null,
  request: null,
  draft: {},
  fulfillmentPlans: [],
  draftPlan: null,
  manualCandidates: [],
  evaluation: null,
  partialConfirmed: false,
  hideSuggestions: false,
  requestSearch: "",
  statusFilter: "",
  catalogReference: [],
  catalogReferenceError: "",
  catalogReferenceLoading: false,
  catalogReadSucceeded: false,
  fulfillmentError: "",
  fulfillmentLoading: false,
  activeStrategy: "ready_only",
  stockData: null,
  stockError: "",
  stockLoading: false,
  preparationConfirmed: false,
  requests: [],
  dataError: "",
  loading: false,
  submitted: null,
  analysisLoadingId: null,
  analysisError: "",
  error: "",
};
const t = (ar, en) => (state.lang === "ar" ? ar : en);
const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const b = (label, action, style = "", attr = "") =>
  `<button type="button" class="button ${style}" data-action="${action}" ${attr}>${label}</button>`;
const link = (label, path, style = "") =>
  `<a class="button ${style}" href="#${path}">${label}</a>`;
const badge = (text) => `<span class="badge">${text}</span>`;
const logo = (compact = false) =>
  `<span class="qudra-brand ${compact ? "compact" : ""}"><img src="qudra-logo.png" alt="${t("شعار قدرة", "Qudra logo")}"><span><strong>${t("قدرة", "Qudra")}</strong><small>${t("احتياج أوضح. قرار أذكى.", "Clearer needs. Smarter decisions.")}</small></span></span>`;
const title = (eyebrow, heading, desc = "") =>
  `<div class="page-heading"><span class="eyebrow">${eyebrow}</span><h1>${heading}</h1><p>${desc}</p></div>`;
const typeName = (type) =>
  type === "laptop" ? t("لابتوب", "Laptop") : t("كمبيوتر مكتبي", "Desktop PC");
const portalIcon = (name) =>
  ({
    search:
      '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="20" cy="20" r="15"/><path d="m31 31 12 12"/></svg>',
    account:
      '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="19"/><path d="M14 39v-6q0-5 5-7c-5-6-3-16 5-16s10 10 5 16q5 2 5 7v6"/></svg>',
  })[name];
function referenceHeader(homepage) {
  const dropdown = (name, entries) =>
    `<details class="reference-dropdown"><summary>${name}</summary><div>${entries.map(([label, path]) => `<a href="#${path}">${label}</a>`).join("")}</div></details>`;
  return `<div class="reference-utility"><div class="reference-container utility-controls" dir="ltr"><a class="orange-button donate-now" href="#portal/donate">${t("تبرع الآن", "Donate now")}</a>${b(t("English", "العربية"), "language", "reference-language", 'aria-label="Switch language / تغيير اللغة"')}<a class="reference-icon" href="#login/admin" aria-label="${t("دخول الفني", "Technician login")}">${portalIcon("account")}</a>${b(portalIcon("search"), "search", "reference-icon", `aria-label="${t("البحث", "Search")}"`)}</div></div><header class="reference-header ${homepage ? "over-hero" : ""}"><div class="reference-container reference-nav-row"><a class="ertiqa-brand" href="#home" aria-label="${t("ارتقاء — الرئيسية", "Ertiqa — Home")}"><span class="ertiqa-word">ارتقاء</span><span class="ertiqa-latin">ertiqa</span></a>${b("<span></span><span></span><span></span>", "toggle-menu", "menu-toggle", `aria-label="${t("القائمة", "Menu")}" aria-controls="public-navigation" aria-expanded="false"`)}<nav id="public-navigation" class="public-navigation" aria-label="${t("التنقل الرئيسي", "Main navigation")}"><a href="#home">${t("الرئيسية", "Home")}</a>${dropdown(
    t("عن ارتقاء", "About Ertiqa"),
    [
      [t("عن ارتقاء", "About Ertiqa"), "home/about"],
      [t("كيف تعمل قدرة؟", "How Qudra works"), "home/how"],
    ],
  )}<a href="#portal/donate">${t("تبرع", "Donate")}</a><a class="device-request-nav" href="#user/request">${t("طلب الأجهزة", "Request devices")}</a><a href="#portal/partners">${t("الشركاء", "Partners")}</a>${dropdown(t("المركز الإعلامي", "Media center"), [[t("المركز الإعلامي", "Media center"), "portal/media"]])}${dropdown(t("اللوائح والأنظمة", "Policies & regulations"), [[t("اللوائح والأنظمة", "Policies & regulations"), "portal/policies"]])}${dropdown(
    t("تواصل معنا / تطوع", "Contact / Volunteer"),
    [
      [t("تواصل معنا / تطوع", "Contact / Volunteer"), "portal/contact"],
      [t("دخول الفني", "Technician login"), "login/admin"],
    ],
  )}</nav></div></header>`;
}
function portalInfo(section) {
  const contents = {
    donate: [
      t("تبرع", "Donate"),
      t("امنح جهازك فرصة جديدة.", "Give your device a new purpose."),
      t(
        "تبدأ رحلة إعادة الاستخدام بجهاز يمكن الاستفادة منه أو من قطعه السليمة. تعرّف على قنوات التبرع والتواصل عبر موقع ارتقاء.",
        "Reuse begins with a device or its healthy components. Visit Ertiqa for donation and contact channels.",
      ),
    ],
    partners: [
      t("الشركاء", "Partners"),
      t("معاً، نصنع أثراً أكبر.", "Together, we create greater impact."),
      t(
        "التعاون يساعد على وصول التقنية إلى من يحتاجها، والاستفادة من الأجهزة وقطع الغيار بصورة أفضل.",
        "Collaboration helps technology reach those who need it and makes better use of devices and components.",
      ),
    ],
    media: [
      t("المركز الإعلامي", "Media center"),
      t("قصص تبدأ بتقنية تُعاد.", "Stories begin with technology reused."),
      t(
        "يمكن متابعة أخبار ارتقاء ومبادراتها من خلال موقعها. تعرّف هنا على رحلة طلب الأجهزة وخيارات إعادة الاستخدام عبر قدرة.",
        "Follow Ertiqa news and initiatives on its website. Explore device requests and reuse options through Qudra here.",
      ),
    ],
    policies: [
      t("اللوائح والأنظمة", "Policies & regulations"),
      t("وضوح في الإجراءات.", "Clear procedures."),
      t(
        "تخضع توصيات قدرة للمراجعة قبل الاعتماد. لا تُقترح ترقية دون توافق مسجل، ولا تُستخدم القطع المستعادة قبل فحص سلامتها. لوائح ارتقاء منشورة عبر موقعها.",
        "Qudra recommendations require review before approval. Upgrades need recorded compatibility and recovered components require health checks. Ertiqa policies are available on its website.",
      ),
    ],
    contact: [
      t("تواصل معنا / تطوع", "Contact / Volunteer"),
      t("كل مساهمة تصنع فرقاً.", "Every contribution makes a difference."),
      t(
        "للتواصل مع ارتقاء أو معرفة فرص التطوع، استخدم قنوات التواصل المنشورة في موقع ارتقاء. لطلبات الأجهزة، تابع عبر قدرة.",
        "Use the contact channels on Ertiqa’s website for enquiries and volunteering. For device requests, continue with Qudra.",
      ),
    ],
  };
  const [eyebrow, heading, description] = contents[section] || contents.contact;
  return `<section class="container workspace narrow">${title(eyebrow, heading, description)}<div class="card portal-information"><div class="actions"><a class="button" href="https://ertiqa.org/" target="_blank" rel="noopener noreferrer">${t("زيارة موقع ارتقاء", "Visit Ertiqa")}</a>${link(t("طلب الأجهزة عبر قدرة", "Request devices with Qudra"), "user/request", "outline")}${link(t("العودة للرئيسية", "Back to home"), "home", "text")}</div></div></section>`;
}

function shell(path, admin) {
  document.documentElement.lang = state.lang;
  document.documentElement.dir = state.lang === "ar" ? "rtl" : "ltr";
  document.title = t(
    "ارتقاء × قدرة | رحلة طلب الأجهزة",
    "Ertiqa × Qudra | Device request journey",
  );
  document.querySelector("#site-shell").innerHTML =
    `<div class="utility"><div class="container"><span>${t("مبادرة ارتقاء · رحلة الأجهزة", "Ertiqa initiative · Device journey")}</span><div>${b(t("English", "العربية"), "language", "text", 'aria-label="Switch language / تغيير اللغة"')}${!admin ? '<a href="#login/admin">' + t("دخول الفني", "Technician login") + "</a>" : '<a href="#home">' + t("العودة للموقع", "Back to website") + "</a>"}</div></div></div><header class="site-header container"><a class="portal-brand" href="#home"><span class="portal-symbol" aria-hidden="true">↻</span><span>${t("ارتقاء", "Ertiqa")}<small>${t("للتقنية حياة أخرى", "A new life for technology")}</small></span></a>${admin ? logo(true) : `<nav aria-label="${t("التنقل الرئيسي", "Main navigation")}"><a href="#home">${t("الرئيسية", "Home")}</a><a href="#home/about">${t("عن المبادرة", "About")}</a><a href="#user/request" class="nav-feature">${t("قدرة", "Qudra")} ${badge(t("طلب أجهزة", "Request devices"))}</a><a href="#home/how">${t("كيف تعمل؟", "How it works")}</a></nav>${link(t("طلب أجهزة عبر قدرة", "Request with Qudra"), "user/request", "small")}`}</header>`;
  const homepage = path === "home" || path.startsWith("home/");
  if (!admin)
    document.querySelector("#site-shell").innerHTML = referenceHeader(homepage);
  document.body.classList.toggle("homepage", homepage);
  document.querySelector("#footer").innerHTML =
    `<div class="container footer-inner">${logo(true)}<p>${t("قدرة · احتياج أوضح، قرار أذكى", "Qudra · Clearer needs. Smarter decisions.")}</p><a href="https://ertiqa.org/" target="_blank" rel="noopener noreferrer">${t("موقع ارتقاء المرجعي", "Ertiqa reference website")} →</a></div>`;
  document.body.classList.toggle("admin-view", admin);
}
function home() {
  return `<section class="reference-hero"><div class="reference-container reference-hero-content"><div class="reference-hero-copy"><h1>${t("لنعمة رقمية<br>تدوم", "For a digital blessing<br>that lasts")}</h1><a class="orange-button discover-button" href="#home/about">${t("اكتشف المزيد", "Discover more")}</a></div></div></section><section class="container qudra-feature-entry" id="qudra"><div>${logo()}<h2>${t("المخزون لا يكفي؟ قد تكون القطعة هي الحل.", "Not enough stock? The right part may be the answer.")}</h2><p>${t("تصف الجهة احتياجها، وتقترح قدرة خطة تستفيد من الأجهزة وقطع الغيار السليمة، ثم يراجع الفني القرار.", "Organizations describe their needs. Qudra proposes a plan using devices and healthy parts. A technician makes the final decision.")}</p></div><div class="actions">${link(t("طلب الأجهزة عبر قدرة", "Request devices with Qudra"), "user/request")}${link(t("مساحة الفني", "Technician workspace"), "login/admin", "outline")}</div></section><section class="container" id="how"><div class="section-heading"><span class="eyebrow">${t("رحلة واضحة من البداية للنهاية", "A clear journey from start to finish")}</span><h2>${t("الجهة تطلب. قدرة تقترح. الفني يقرر.", "You request. Qudra suggests. The technician decides.")}</h2></div><div class="three-grid">${[
    [
      t("اكتب احتياجك", "Describe your needs"),
      t(
        "نوع الجهاز والعدد والاستخدام، دون الحاجة لمعرفة تقنية دقيقة.",
        "Device type, quantity and use case. No technical expertise needed.",
      ),
    ],
    [
      t("راجع ثم أرسل", "Review and submit"),
      t(
        "ملخص مفهوم للمواصفات، ثم تأكيد واضح بأن الطلب وصل للمراجعة.",
        "An understandable specification summary, then a clear submission confirmation.",
      ),
    ],
    [
      t("قرار مدعوم بالتفاصيل", "Make an informed decision"),
      t(
        "يرى الفني الأجهزة الجاهزة، وإمكانية الترقية، والقطع السليمة من الأجهزة التالفة.",
        "The technician sees ready devices, upgradeability and healthy parts from damaged machines.",
      ),
    ],
  ]
    .map(
      ([h, p], i) =>
        `<article class="card process-card"><span class="number">0${i + 1}</span><h3>${h}</h3><p>${p}</p></article>`,
    )
    .join(
      "",
    )}</div></section><section class="container about-section" id="about"><div>${logo()}<h2>${t("الأثر في استخدام ما نملك بشكل أفضل.", "Make better use of what you already have.")}</h2><p>${t("للمستفيد: طلب سهل ومواصفات واضحة. للجهة المشغّلة: خطة قابلة للفهم، وتتبّع لمصدر القطع المستعادة، واستغلال أفضل للمخزون.", "For the requester: a simple form and clear requirements. For the organization: an explainable plan, traceable recovered components and better use of stock.")}</p></div><div class="info-card"><h3>${t("شاهد فائدة قدرة بنفسك", "See Qudra’s usefulness for yourself")}</h3><p>${t("جرّب طلباً لا تغطيه الأجهزة المطابقة، ثم قارن في لوحة الفني بين الأجهزة الجاهزة فقط وخطة قدرة.", "Try a request that exact stock cannot cover. Then compare ready-only allocation with Qudra’s plan in the admin dashboard.")}</p>${link(t("بدء تجربة الطلب", "Try the request journey"), "user/request")}${link(t("دخول الفني", "Technician login"), "login/admin", "outline")}</div></section>`;
}
function login() {
  return `<section class="container entry-page"><div>${logo()}${title(t("دخول الفني", "TECHNICIAN LOGIN"), t("مساحة الفني", "Technician workspace"), t("متابعة الطلبات وفهم الاحتياج ومراجعة الأجهزة قبل الاعتماد.", "Manage requests, analyze requirements and review devices before approval."))}<form method="post" id="technician-login-form" class="card"><label>${t("البريد الإلكتروني للفني", "Technician email")}<input name="email" type="email" required autocomplete="username" maxlength="254"></label><label>${t("كلمة المرور", "Password")}<input name="password" type="password" required autocomplete="current-password" maxlength="1024"></label><p class="error" role="alert">${state.error ? errorText(state.error) : ""}</p><button class="button full" type="submit">${t("تسجيل الدخول", "Sign in")}</button></form>${link(t("طلب أجهزة دون تسجيل دخول", "Request devices without signing in"), "user/request", "text")}</div><aside class="entry-art">${logo()}<h2>${t("الاحتياج أولاً.<br>والقرار للفني.", "Understand the need.<br>Keep the decision with the technician.")}</h2><p>${t("تحليل الوصف عبر Gemini ومقارنة الأجهزة وقطع الغيار المتاحة.", "Analyze descriptions with Gemini and compare available devices and components.")}</p></aside></section>`;
}
function requestView() {
  const d = state.draft,
    type = d.type || "laptop";
  return `<section class="container workspace public-request">${logo(true)}${title(t("طلبات الأجهزة", "DEVICE REQUESTS"), t("أخبرنا بما تحتاجه.", "Tell us what you need."), t("أرسل وصف الاحتياج ونوع الجهاز والكمية، وسيتولى الفني التحليل واختيار الأجهزة المناسبة. لا تحتاج إلى حساب.", "Submit your needs, device type and quantity. The technician analyzes the request and selects suitable devices. No account required."))}<form method="post" id="request-form"><div class="request-layout"><div class="card"><h2>${t("بيانات الطلب", "Request details")}</h2><label>${t("اسم الجهة", "Organization name")}<input name="organization" required minlength="2" maxlength="120" value="${esc(d.organization)}"></label><label>${t("صف احتياجك والتطبيقات المطلوبة", "Describe your needs and required applications")}<textarea name="description" required minlength="10" maxlength="2000" rows="5" placeholder="${t("مثال: نحتاج أجهزة لتدريب المستفيدين على Word وExcel والمتصفح داخل مقر الجمعية.", "Example: We need devices to train participants in Word, Excel and browser use at our office.")}">${esc(d.description)}</textarea></label><p class="hint">${t("اذكر الاستخدام والبرامج إن عرفت. لا تحتاج إلى تحديد إصدار البرنامج للاستخدام العام؛ تُقترح المواصفات من وصفك.", "Describe the use and applications if known. Software versions are not required for general use; specifications are proposed from your description.")}</p><div class="form-grid"><label>${t("نوع الجهاز", "Device type")}<select name="type"><option value="laptop" ${type === "laptop" ? "selected" : ""}>${typeName("laptop")}</option><option value="desktop" ${type === "desktop" ? "selected" : ""}>${typeName("desktop")}</option></select></label><label>${t("الكمية المطلوبة", "Quantity")}<input name="quantity" type="number" min="1" max="100" step="1" required value="${esc(d.quantity || 10)}"></label></div><p class="error" role="alert">${state.error ? errorText(state.error) : ""}</p><button class="button full" type="submit">${t("إرسال الطلب", "Send request")}</button></div></div></form></section>`;
}
function analysisView() {
  return requestView();
}
function submittedView() {
  const r = state.submitted;
  if (!r)
    return `<section class="container workspace narrow">${title(t("طلبات الأجهزة", "DEVICE REQUESTS"), t("أرسل طلبك لبدء المراجعة.", "Send a request to start the review."))}${link(t("طلب أجهزة", "Request devices"), "user/request")}</section>`;
  return `<section class="container workspace narrow"><div class="card submitted"><div class="success-mark">✓</div>${logo()}<h1>${t("تم استلام طلبك", "Your request has been received")}</h1><p>${t("رقم الطلب", "Request ID")}: <bdi>${esc(r.id)}</bdi></p><h2>${t("بانتظار مراجعة الفني", "Awaiting technician review")}</h2><p>${t("سيتولى الفني فهم الوصف ومراجعة الأجهزة والتوافق واختيار خطة التلبية. لا توجد خطوات إضافية مطلوبة منك.", "The technician will analyze the description, review devices and compatibility, and choose a fulfillment plan. No further steps are required from you.")}</p><div class="actions">${link(t("العودة للرئيسية", "Back to homepage"), "home")}${b(t("إرسال طلب آخر", "Send another request"), "new-public-request", "outline")}</div></div></section>`;
}
function adminShell(content, active) {
  const items = [
    ["dashboard", t("طلبات الأجهزة", "Device requests"), "◫"],
    ["review", t("المراجعة الفنية", "Technical review"), "✓"],
    ["inventory", t("المخزون", "Inventory"), "▦"],
  ];
  return `<div class="admin-layout container"><aside class="admin-sidebar">${logo()}<span class="admin-label">${t("مساحة فريق تجهيز الأجهزة", "DEVICE PREPARATION TEAM")}</span><nav aria-label="${t("تنقل الفني", "Technician navigation")}">${items.map(([id, label, icon]) => `<a class="${id === active ? "active" : ""}" href="#admin/${id}" ${id === active ? 'aria-current="page"' : ""}><span aria-hidden="true">${icon}</span>${label}</a>`).join("")}</nav><div class="sidebar-bottom">${b(t("فتح نموذج الطلب", "Open request form"), "return-user", "text")}${b(t("تسجيل الخروج", "Sign out"), "logout", "text")}</div></aside><div class="admin-content">${content}</div></div>`;
}
function metric(value, label, note = "") {
  return `<article class="metric"><strong>${value}</strong><span>${label}</span><small>${note}</small></article>`;
}
function dashboard() {
  const pending = state.requests.filter((r) => r.status === "pending");
  const visible = state.requests.filter(r => (!state.statusFilter || r.status === state.statusFilter) && (r.organization + " " + r.id).toLowerCase().includes(state.requestSearch.toLowerCase()));
  return `${title(t("قدرة / لوحة الفني", "QUDRA / TECHNICIAN DASHBOARD"), t("طلبات الجهات، في مساحة واحدة.", "Organization requests, in one workspace."), t("ابدأ بالطلب الأصلي، ثم حلل الوصف وراجع الأجهزة قبل اتخاذ القرار.", "Start with the original request, analyze its description and review devices before deciding."))}<div class="metrics">${metric(state.requests.length, t("طلبات مسجلة", "Recorded requests"))}${metric(pending.length, t("بانتظار المراجعة", "Awaiting review"))}${metric(state.requests.filter((r) => r.analysis).length, t("طلبات محللة", "Analyzed requests"))}${metric(state.requests.filter((r) => r.status === "completed").length, t("طلبات مجهزة", "Prepared requests"))}</div><div class="card-heading"><h2>${t("طلبات الأجهزة", "Device requests")}</h2>${b(t("تحديث الطلبات", "Refresh requests"), "refresh-requests", "outline")}</div><form id="request-filter-form" class="filter-form"><label>${t("بحث باسم الجهة أو رقم الطلب","Search organization or request ID")}<input name="search" type="search" value="${esc(state.requestSearch)}"></label><label>${t("الحالة","Status")}<select name="status"><option value="">${t("الكل","All")}</option>${["pending","approved","completed","modification","rejected"].map(x=>`<option value="${x}" ${state.statusFilter===x?"selected":""}>${requestStatus(x)}</option>`).join("")}</select></label><button class="button" type="submit">${t("بحث وتصفية","Search & filter")}</button></form>${state.dataError ? `<p class="warning">${errorText(state.dataError)}</p>` : ""}${state.loading ? `<p role="status">${t("جارٍ تحميل الطلبات…", "Loading requests…")}</p>` : visible.length ? visible.map((r) => `<article class="card request-row"><div><h2>${esc(r.organization)}</h2><p>${r.quantity} × ${typeName(r.requested_type)} · ${requestStatus(r.status)}</p><p>${esc(r.description.slice(0, 160))}</p></div>${b(t("فتح المراجعة الفنية", "Open technical review"), "open-request", "", `data-id="${r.id}"`)}</article>`).join("") : `<div class="card empty"><h2>${t("لا توجد طلبات محملة", "No requests loaded")}</h2><p>${t("تظهر هنا الطلبات المحفوظة بعد وصولها من الجهات.", "Saved organization requests appear here after submission.")}</p></div>`}`;
}
function strategyName(id) {
  return (
    {
      selected: t("الأجهزة المختارة", "Selected devices"),
      ready_only: t(
        "أجهزة جاهزة · الأقرب أولاً",
        "Ready devices · closest first",
      ),
      spare_upgrade: t("ترقية بقطع المخزون", "Upgrade using spare stock"),
      recovered_upgrade: t(
        "ترقية بقطع من أجهزة متعطلة",
        "Upgrade using damaged-device parts",
      ),
      combined_upgrade: t("دمج خيارات التلبية", "Combine fulfillment options"),
    }[id] || id
  );
}
function allocationCategory(id) {
  return (
    {
      exact: t("مطابق وجاهز", "Exact & ready"),
      higher: t("أقرب مواصفات أعلى", "Closest higher specification"),
      spare: t("ترقية من المخزون", "Spare-part upgrade"),
      recovered: t("قطع مستعادة مختبرة", "Tested donor-part upgrade"),
      mixed: t("ترقية بقطع مخزون ومستعادة", "Spare + donor upgrade"),
    }[id] || id
  );
}
function workflowSteps(r) {
  const active =
    r.status === "completed"
      ? 5
      : r.status === "approved"
        ? 4
        : r.analysis?.missingInformation?.length
          ? 1
          : r.analysis
          ? state.fulfillmentPlans.length
            ? 3
            : 2
          : 1;
  return `<ol class="workflow-strip">${[t("طلب الجهة", "Organization request"), t("فهم الاحتياج", "Requirements analysis"), t("مقارنة المخزون", "Inventory comparison"), t("خيارات التلبية", "Fulfillment options"), t("مراجعة الفني", "Technician approval"), t("التجهيز وتحديث المخزون", "Prepare & update stock")].map((name, i) => `<li class="${i <= active ? "current" : ""}"><span>${i < active ? "✓" : i + 1}</span>${name}</li>`).join("")}</ol>`;
}
function selectedPlan() {
  return (
    state.request?.fulfillment_plan ||
    state.draftPlan ||
    state.fulfillmentPlans.find((p) => p.strategy === state.activeStrategy) ||
    null
  );
}
function allocationCard(a) {
  return `<article class="card allocation-card"><div class="card-heading">${badge(allocationCategory(a.category))}<strong>${a.count} ${t("جهاز", "devices")}</strong></div><h3>${esc(a.model)}</h3><div class="chips"><span>${esc(a.cpuCategory)}</span><span>RAM ${a.ramBefore}${a.ramBefore !== a.ramAfter ? " → " + a.ramAfter : ""} GB</span><span>SSD ${a.storageBefore}${a.storageBefore !== a.storageAfter ? " → " + a.storageAfter : ""} GB</span></div>${a.upgrades.map((u) => `<div class="part-source"><strong>${u.component === "ram" ? "RAM" : "SSD"} · ${u.capacityGb} GB × ${a.count}</strong><p>${u.source === "recovered" ? t("قطعة سليمة من جهاز متعطل", "Healthy component from a damaged donor") : t("قطعة من مخزون قطع الغيار", "Component from spare stock")}${u.donorId ? " · " + esc(u.donorId) + " · " + esc(u.donorModel || "") : ""}</p><details><summary>${t("تفاصيل التوافق والفحص", "Compatibility & inspection details")}</summary><p>${esc(u.interface)} · ${esc(u.formFactor)} · ${u.method === "replace" ? t("استبدال", "Replacement") : t("إضافة في منفذ شاغر", "Add to a free slot")}</p><p>${t("مرجع التوافق", "Compatibility reference")}: ${esc(u.verificationRef)}</p><p>${t("فحص القطعة", "Part inspection")}: ${esc(u.partVerificationRef)}</p>${u.donorId ? `<p>${t("توثيق مصدر القطعة", "Donor verification")}: ${esc(u.donorVerificationRef)}</p>` : ""}</details></div>`).join("") || `<p>${a.category === "higher" ? t("يغطي المواصفات المطلوبة مع أقل زيادة متاحة في الفئة.", "Meets the requirements with the closest available higher specification.") : t("مطابق للمواصفات المطلوبة دون ترقية.", "Matches the requirements without an upgrade.")}</p>`}<p class="hint">${t("فحص الجهاز", "Device inspection")}: ${esc(a.verificationRef)}</p></article>`;
}
function inventorySelection(r) {
  if (r.status !== "pending") return "";
  const d = state.draftPlan;
  return `<details class="inventory-selection" ${d?.total || r.draft_lines?.length ? "open" : ""}><summary>${t("اختيار الأجهزة للمراجعة", "Select devices for review")}</summary><p>${t("اختر الأجهزة المقترحة أو حددها من المخزون. لا تُحجز إلا بعد اعتماد الفني.", "Select suggested devices or choose from inventory. Reservation requires technician approval.")}</p>${d?.blocked ? `<p class="warning">${errorText(d.blocked)}</p>` : ""}${r.draft_lines?.map((line)=> {const a={...line,model:d?.allocations.find(x=>x.key===line.key)?.model || line.key}; return `<form class="plan-quantity-form" data-key="${esc(a.key)}"><strong>${esc(a.model)}</strong><label>${t("الكمية","Quantity")}<input name="count" type="number" min="0" max="${r.quantity}" required value="${a.count}"></label><button class="button small" type="submit">${t("تحديث","Update")}</button>${b(t("إزالة","Remove"),"remove-line","text",`data-key="${esc(a.key)}"`)}</form>`;}).join("") || ""}<div class="actions">${b(t("استخدام الاقتراح","Use suggestion"),"apply-proposal","outline",!r.analysis || state.hideSuggestions ? "disabled" : "")}${b(t("اختيار يدوي من المخزون","Choose manually from inventory"),"manual-plan","outline",!r.analysis ? "disabled" : "")}${b(t("إزالة الاختيارات","Clear selection"),"clear-plan","text")}</div>${d?.remaining && d.total ? `<label class="technical-check"><input id="partial-confirmation" type="checkbox" ${state.partialConfirmed ? "checked" : ""}><span>${t("أؤكد اعتماد تجهيز جزئي مع بقاء النقص موضحاً.","I approve partial fulfillment with the shortage recorded.")}</span></label>` : ""}</details>`;
}
function fulfillmentView(r) {
  if (r.status === "pending" && r.analysis?.missingInformation?.length) return `<section class="card matching-pending"><h2>${t("مطابقة المخزون", "Inventory matching")}</h2><h3>${t("بانتظار توضيح الاحتياج", "Awaiting requirement clarification")}</h3><p>${t("لم تبدأ مقارنة المخزون لأن معلومات الاستخدام غير مكتملة. هذا لا يعني عدم توفر أجهزة. راجع الأسئلة في فهم الاحتياج واطلب توضيحها من الجهة قبل المقارنة والاعتماد.", "Inventory comparison has not started because required usage information is incomplete. This does not mean devices are out of stock. Review the questions in Understanding the Need and request clarification before matching or approval.")}</p>${b(t("طلب توضيح من الجهة", "Request clarification from organization"), "modify", "outline")}</section>`;

  if (state.hideSuggestions && r.status === "pending") return `<section class="card"><h2>${t("الاقتراحات مخفية","Suggestions hidden")}</h2><p>${t("اختيارات الأجهزة محفوظة.","Your device selections are preserved.")}</p>${b(t("إظهار الاقتراحات","Show suggestions"),"ignore-suggestions","outline")}</section>`;
  const p = selectedPlan();
  return `<section class="card"><div class="card-heading"><h2>${t("مطابقة المخزون", "Inventory matching")}</h2>${r.status === "pending" ? b(t("تحديث المخزون", "Refresh inventory"), "refresh-fulfillment", "outline small") + b(t("تجاهل الاقتراحات","Ignore suggestions"),"ignore-suggestions","text") : badge(requestStatus(r.status))}</div>${state.fulfillmentError ? `<p class="warning" role="alert">${errorText(state.fulfillmentError)}</p>` : ""}${state.fulfillmentLoading ? `<p role="status">${t("جارٍ مقارنة الاحتياج بالمخزون…", "Comparing requirements with inventory…")}</p>` : ""}${r.status === "pending" && state.fulfillmentPlans.length ? `<div class="plan-options">${state.fulfillmentPlans.map((x) => b(`<strong>${strategyName(x.strategy)}</strong><span>${x.total >= r.quantity ? t("يستوفي كامل الطلب","Fulfills the whole request") : x.total ? t("يستوفي جزئيًا","Partially fulfills the request") : t("غير متاح","Unavailable")} · ${x.total} / ${r.quantity} · ${t("المتبقي", "Remaining")}: ${x.remaining}</span>`, "choose-strategy", state.activeStrategy === x.strategy ? "selected" : "outline", `data-id="${x.strategy}" aria-pressed="${state.activeStrategy === x.strategy}"`)).join("")}</div>` : ""}${state.evaluation && r.analysis ? `<p class="${state.evaluation.direct ? "badge" : "warning"}">${state.evaluation.direct ? t("يمكن استيفاء الطلب مباشرة","The request can be fulfilled directly") : t("لا يمكن استيفاء الطلب مباشرة","The request cannot be fulfilled directly")} · ${t("جاهز مباشرة","Directly ready")}: ${state.evaluation.ready} / ${r.quantity} · ${t("المتبقي","Remaining")}: ${state.evaluation.remaining}</p>` : ""}${!r.analysis ? `<p>${t("ابدأ بتحليل وصف الاحتياج عبر Gemini.", "Start by analyzing the request description with Gemini.")}</p>` : !p && !state.fulfillmentError && !state.fulfillmentLoading ? `<p>${t("حمّل المخزون لعرض خيارات التلبية.", "Load inventory to see fulfillment options.")}</p>` : ""}${
    p
      ? `<h3>${strategyName(p.strategy)}</h3><div class="coverage-summary">${metric(p.total, t("جهاز مغطى", "Devices covered"))}${metric(p.remaining, t("نقص الكمية", "Unfilled quantity"))}${metric(
          p.allocations.reduce(
            (n, a) =>
              n +
              a.count * a.upgrades.filter((u) => u.source === "spare").length,
            0,
          ),
          t("قطع مخزون مطلوبة", "Spare components needed"),
        )}${metric(
          p.allocations.reduce(
            (n, a) =>
              n +
              a.count *
                a.upgrades.filter((u) => u.source === "recovered").length,
            0,
          ),
          t("قطع مستعادة مطلوبة", "Recovered components needed"),
        )}</div>${p.blocked ? `<p class="warning">${p.blocked === "missing_information" ? t("استكمل المعلومات الناقصة قبل مقارنة المخزون.", "Resolve missing information before inventory comparison.") : t("التحليل غير مكتمل.", "Analysis is incomplete.")}</p>` : ""}${p.remaining ? `<p class="warning">${t("الكمية غير مكتملة؛ يلزم تأكيد التجهيز الجزئي قبل الاعتماد.", "Coverage is incomplete; explicit partial-fulfillment confirmation is required.")}</p>` : ""}${p.allocations.map(allocationCard).join("")}${p.exclusions?.length ? `<details><summary>${t("الأجهزة المستبعدة أو المحتاجة إلى ترقية", "Excluded devices and upgrade needs")}</summary><ul>${p.exclusions.map((x) => `<li>${esc(x.model)} · ${exclusionText(x.reason)}</li>`).join("")}</ul></details>` : ""}`
      : ""
  }${inventorySelection(r)}</section>`;
}
function exclusionText(code) {
  return (
    {
      cpu_vendor_mismatch: t("المعالج لا يطابق الشركة المطلوبة أو لم تُحدد شركته.","CPU vendor is different or unknown."),
      wrong_type: t("نوع جهاز مختلف", "Different device type"),
      unverified_device: t(
        "الحالة أو الفحص غير متحقق",
        "Condition or inspection unverified",
      ),
      out_of_stock: t("لا يوجد رصيد متاح", "No available stock"),
      cpu_below_requirement: t(
        "فئة المعالج أقل من المطلوب",
        "CPU category below requirement",
      ),
      specialist_unverified: t(
        "المتطلبات المتخصصة غير متحققة",
        "Specialist requirements unverified",
      ),
      unknown_specifications: t(
        "مواصفات غير مكتملة",
        "Incomplete specifications",
      ),
      needs_upgrade: t(
        "يحتاج ترقية متحققة؛ راجع خيارات الترقية",
        "Needs a verified upgrade; compare upgrade plans",
      ),
      no_verified_upgrade: t(
        "لا توجد قطع ومسارات ترقية متحققة تكمل الاحتياج",
        "No verified parts and upgrade path fulfill the requirements",
      ),
    }[code] || code
  );
}
function reviewBlocker() {
  return approvalBlocker({row:state.request,plan:selectedPlan(),draftPlan:state.draftPlan,
    hasEligibleOptions:state.fulfillmentPlans.some(plan=>plan.total>0 && !plan.blocked),
    analysisLoading:state.analysisLoadingId===state.request?.id,
    inventoryLoading:state.fulfillmentLoading,inventoryError:!!state.fulfillmentError,
    reviewConfirmed:state.reviewConfirmed,partialConfirmed:state.partialConfirmed});
}
function approvalHelp(code) {
  const messages={
    analysis_pending:t("انتظر اكتمال التحليل قبل الاعتماد.","Wait for analysis to finish before approval."),
    analysis_required:t("حلّل وصف الطلب أولاً لتحديد الاحتياج.","Analyze the request first to establish requirements."),
    missing_information:t("الاعتماد متوقف: توجد أسئلة تحتاج إجابة من الجهة. مربع المراجعة لا يتجاوز المعلومات الناقصة.","Approval is blocked: the organization must answer the open questions. The review checkbox does not override missing information."),
    inventory_comparison_pending:t("انتظر اكتمال مقارنة المخزون.","Wait for inventory comparison to finish."),
    inventory_comparison_failed:t("تعذر التحقق من المخزون؛ أعد تحميله قبل الاعتماد.","Inventory could not be verified; refresh it before approval."),
    no_eligible_devices:t("لا توجد أجهزة مؤهلة للمتطلبات المتحققة في المخزون الحالي. راجع أسباب الاستبعاد أو اطلب تعديلاً؛ لا يمكن اعتماد كمية صفر.","No eligible devices meet the verified requirements in current inventory. Review exclusions or request changes; zero devices cannot be approved."),
    device_selection_required:t("اختر الأجهزة أولاً: افتح اختيار الأجهزة للمراجعة واستخدم الاقتراح أو حدد الأجهزة يدويًا. اختيار نوع الاقتراح وحده لا يحجزه.","Select devices first: open device selection and use the suggestion or choose devices manually. Viewing a suggestion alone does not select it."),
    partial_confirmation_required:t("أكد قبول الكمية الجزئية والنقص المتبقي قبل الاعتماد.","Acknowledge the partial quantity and remaining shortage before approval."),
    inspection_confirmation_required:t("أكد مراجعة الأجهزة والتوافق والفحص لتفعيل الاعتماد.","Confirm your review of devices, compatibility and inspection to enable approval."),
  };
  return messages[code] || errorText(code);
}
function review() {
  const r = state.request;
  if (!r) return dashboard();
  const a = r.analysis,
    p = selectedPlan(), blocker = reviewBlocker();
  return `${title(t("طلبات الأجهزة / المراجعة الفنية", "DEVICE REQUESTS / TECHNICAL REVIEW"), esc(r.organization), t("من فهم الاحتياج إلى اختيار الحل ثم التجهيز وتحديث المخزون.", "From understanding the need to choosing a plan, preparing devices and updating stock."))}${workflowSteps(r)}<div class="review-status">${badge(requestStatus(r.status))}${r.partial_approved ? badge(t("تجهيز جزئي","Partial fulfillment")) : ""}<bdi>${esc(r.id)}</bdi></div>${state.error ? `<p class="warning" role="alert">${errorText(state.error)}</p>` : ""}<div class="technical-grid"><div><section class="card need-panel"><h2>${t("معلومات الطلب", "Request information")}</h2><p class="organization-name">${esc(r.organization)}</p><blockquote>${esc(r.description)}</blockquote><div class="form-grid"><div><small>${t("العدد المطلوب", "Requested quantity")}</small><h3>${r.quantity} ${t("أجهزة", "devices")}</h3></div><div><small>${t("نوع الجهاز", "Device type")}</small><h3>${typeName(r.requested_type)}</h3></div></div></section><section class="card ai-panel"><div class="card-heading"><h2>${t("فهم الاحتياج", "Understanding the need")}</h2>${badge(r.analysis_model === "technician" ? t("مراجعة الفني","Technician requirements") : r.analysis_model?.startsWith("claude-") ? t("تحليل سابق", "Previous analysis") : "Gemini")}</div>${a ? `<p class="need-recommendation" dir="auto">${esc(a.explanation)}</p>${a.missingInformation.length ? `<div class="warning"><h3>${t("معلومة لم تستكمل بعد", "Information still needed")}</h3><ul>${a.missingInformation.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>` : ""}${a.specialized ? `<p class="warning">${t("هذا الاستخدام يتطلب قدرات متخصصة متحققة في سجل الجهاز.", "This workload requires verified specialist capabilities in the device record.")}</p>` : ""}` : `<p>${t("حلل الوصف لتحديد نوع الاستخدام ومتطلبات الأداء والمعلومات الناقصة.", "Analyze the description to identify use, performance requirements and missing information.")}</p>`}<form id="analysis-form" aria-busy="${state.analysisLoadingId === r.id}"><p class="hint">${t("يُحلل طلب الجهة ويُقارن بالمخزون وقطع الغيار تلقائياً. اختر الاقتراح المناسب بعد المراجعة؛ لا تحتاج لكتابة مواصفات.", "The organization request is analyzed and compared with stock and spare parts automatically. Review and choose a suggestion; no specifications to type.")}</p>${state.analysisLoadingId === r.id ? `<p class="analysis-progress" role="status" aria-live="polite">${t("جارٍ تحليل الاحتياج عبر Gemini… قد يستغرق ذلك حتى ٩٠ ثانية.", "Gemini is analyzing the request… This can take up to 90 seconds.")}</p>` : ""}${state.analysisError ? `<p class="error" role="alert">${errorText(state.analysisError)}</p>` : ""}<button class="button full" type="submit" ${r.status !== "pending" || state.analysisLoadingId === r.id ? "disabled" : ""}>${state.analysisLoadingId === r.id ? t("جارٍ التحليل…", "Analyzing…") : a ? t("تحديث التحليل عبر Gemini", "Update Gemini analysis") : t("تحليل الوصف عبر Gemini", "Analyze description with Gemini")}</button></form></section></div><div>${fulfillmentView(r)}<section class="card technical-decision"><h2>${r.status === "approved" ? t("تجهيز الأجهزة", "Prepare devices") : r.status === "completed" ? t("اكتمل التجهيز وتحديث المخزون", "Preparation and stock update completed") : t("قرار الفني", "Technician decision")}</h2>${r.status === "pending" ? `${blocker ? `<p class="warning approval-readiness" id="approval-readiness" role="status">${approvalHelp(blocker)}</p>${blocker === "device_selection_required" ? b(t("فتح اختيار الأجهزة", "Open device selection"), "review-selection", "outline") : ""}` : ""}<label class="technical-check"><input id="technical-confirmation" type="checkbox" ${state.reviewConfirmed ? "checked" : ""}><span>${t("راجعت الأجهزة والقطع ومراجع التوافق والفحص، وأوافق على الأجهزة المختارة والكمية الموضحة.", "I reviewed devices, components, compatibility and inspection evidence, and approve the selected devices and stated quantity.")}</span></label>${b(t("اعتماد الخطة وحجز مواردها", "Approve plan & reserve resources"), "confirm", "full", blocker ? 'disabled aria-describedby="approval-readiness"' : "")}<div class="actions">${b(t("طلب تعديل", "Request changes"), "modify", "outline")}${b(t("رفض الطلب", "Reject request"), "reject", "text")}</div><p class="hint">${t("لا يتغير المخزون قبل التأكيد. الاعتماد يحجز الأجهزة والقطع معاً.", "Stock stays unchanged until confirmation. Approval reserves devices and components together.")}</p>` : r.status === "approved" ? `<p>${t("الموارد محجوزة. نفّذ الترقيات والفحص الفعلي، ثم أكد التجهيز لإصدار الأجهزة والقطع وتحديث الأرصدة نهائياً.", "Resources are reserved. Perform upgrades and physical checks, then confirm preparation to issue devices/components and finalize stock balances.")}</p><form id="preparation-form"><label>${t("ملاحظات التجهيز والفحص", "Preparation and inspection notes")}<textarea name="note" maxlength="1000">${esc(state.preparationNote || "")}</textarea></label><label class="technical-check"><input type="checkbox" name="preparedConfirmed" required><span>${t("تم تجهيز جميع الأجهزة وفحصها وتنفيذ الترقيات المعتمدة.", "All devices are prepared, inspected and approved upgrades have been performed.")}</span></label><button class="button full" type="submit">${t("تأكيد التجهيز وتحديث المخزون", "Confirm preparation & update stock")}</button></form>` : r.status === "completed" ? `<div class="success-mark">✓</div><p>${t("أُصدرت الأجهزة والقطع وأُغلقت هذه العملية؛ لا يمكن خصمها مرة ثانية.", "Devices and components are issued and this operation is closed. They cannot be deducted again.")}</p><p>${esc(r.preparation_note || "")}</p>` : `<p>${esc(r.decision_reason || "")}</p>`}</section></div></div>`;
}
function inventory() {
  const d = state.stockData;
  return `${title(t("قدرة / المخزون", "QUDRA / INVENTORY"), t("الأجهزة والقطع والمصادر المتحققة", "Devices, parts and verified sources"), t("راجع الأجهزة وقطع الغيار ومصادر القطع الصالحة لتلبية الطلبات.", "Review devices, spare parts and healthy recovered components for fulfilling requests."))}${b(t("تحديث المخزون", "Refresh inventory"), "refresh-stock", "outline")}<section class="card"><h2>${t("كتالوج الأجهزة","Device catalog")}</h2><p>${t("مرجع مواصفات من Supabase؛ لا يمثل رصيد الأجهزة أو تأكيد التوافق.","Specifications from Supabase; catalog listings do not establish stock or verified compatibility.")}</p>${state.catalogReadSucceeded && !state.catalogReferenceLoading && !state.catalogReferenceError ? `<p role="status">${state.catalogReference.length ? t("نجحت قراءة Supabase. عدد سجلات الأجهزة المعروضة: ", "Supabase read succeeded. Visible device entries: ") + state.catalogReference.length : t("نجح طلب القراءة، لكن لا توجد سجلات أجهزة ظاهرة؛ قد يكون الجدول فارغاً أو القراءة محدودة بسياسات RLS.", "The read succeeded, but no device entries are visible; the table may be empty or filtered by RLS.")}</p>` : ""}${b(t("تحميل الكتالوج","Load catalog"),"load-reference","outline",state.catalogReferenceLoading?"disabled":"")}${state.catalogReferenceLoading?`<p role="status">${t("جارٍ التحميل…","Loading…")}</p>`:""}${state.catalogReferenceError?`<p class="warning" role="alert">${errorText(state.catalogReferenceError)}</p>`:""}<div class="catalog-reference">${state.catalogReference.map(x=>`<article><h3>${esc(x.model)}</h3><p>${esc(x.cpu)} · RAM ${x.ram ?? "—"} GB · SSD ${x.storage ?? "—"} GB</p><p>${t("ترقية الذاكرة حسب الكتالوج","Catalog RAM upgrade")}: ${esc(x.ramUpgrade)}</p></article>`).join("")}</div></section>${state.stockError ? `<p class="warning">${errorText(state.stockError)}</p>` : ""}${state.stockLoading ? `<p role="status">${t("جارٍ التحميل…", "Loading…")}</p>` : ""}${d ? `<div class="card table-scroll"><table><caption>${t("الأجهزة", "Devices")}</caption><thead><tr><th>${t("الجهاز", "Device")}</th><th>${t("المتاح", "Available")}</th><th>${t("المحجوز", "Reserved")}</th><th>${t("المُصدر", "Issued")}</th><th>RAM / SSD</th><th>${t("الفحص", "Inspection")}</th></tr></thead><tbody>${d.devices.map((x) => `<tr><th>${esc(x.model)}</th><td>${x.available_count}</td><td>${x.reserved_count}</td><td>${x.issued_count}</td><td>${x.ram_gb} / ${x.storage_gb} GB</td><td>${esc(x.verification_ref || "—")}</td></tr>`).join("")}</tbody></table></div><div class="card table-scroll"><table><caption>${t("قطع المخزون والقطع المستعادة", "Spare and recovered components")}</caption><thead><tr><th>${t("القطعة", "Part")}</th><th>${t("المصدر", "Source")}</th><th>${t("المتاح / المحجوز / المُصدر", "Available / reserved / issued")}</th><th>${t("الفحص", "Inspection")}</th></tr></thead><tbody>${d.parts.map((x) => `<tr><th>${esc(x.id)} · ${esc(x.component)} ${x.capacity_gb} GB</th><td>${x.source === "recovered" ? t("مستعاد", "Recovered") + " · " + esc(x.donor_id) : t("مخزون", "Spare stock")}</td><td>${x.available_count} / ${x.reserved_count} / ${x.issued_count}</td><td>${esc(x.verification_ref || "—")}</td></tr>`).join("")}</tbody></table></div><div class="two-grid">${d.donors.map((x) => `<article class="card"><h3>${esc(x.id)} · ${esc(x.model)}</h3><p>${x.condition === "quarantined" ? t("مستبعد — قيد التحقق", "Quarantined — not eligible") : t("مصدر جهاز متعطل؛ لا يُحسب جهازاً جاهزاً.", "Damaged-device source; never counted as a ready device.")}</p><p>${esc(x.verification_ref || "—")}</p></article>`).join("")}</div>` : ""}`;
}
function impact() {
  return dashboard();
}
function allocation() {
  return review();
}
function route(options = {}) {
  const scrollY = window.scrollY;
  dialog.close();
  let path = location.hash.slice(1) || "home";
  const admin = path.startsWith("admin/");
  if (admin && state.role !== "admin") path = "login/admin";
  if (path === "login/user" || path === "login") path = "user/request";
  if (path === "user/analysis") path = "user/request";
  shell(path, admin && state.role === "admin");
  const views = {
    home: home,
    "home/how": home,
    "home/about": home,
    "portal/donate": () => portalInfo("donate"),
    "portal/partners": () => portalInfo("partners"),
    "portal/media": () => portalInfo("media"),
    "portal/policies": () => portalInfo("policies"),
    "portal/contact": () => portalInfo("contact"),
    login: requestView,
    "login/user": requestView,
    "login/admin": login,
    "user/request": requestView,
    "user/analysis": analysisView,
    "user/submitted": submittedView,
  };
  const section = path.split("/")[1];
  app.innerHTML = path.startsWith("admin/")
    ? adminShell(
        (
          { dashboard, review, inventory, impact, allocation }[section] ||
          dashboard
        )(),
        section,
      )
    : (views[path] || home)();
  app.dataset.requestedRoute = location.hash.slice(1) || "home";
  app.focus({ preventScroll: true });
  if (path === "home/how" || path === "home/about")
    document
      .querySelector(path === "home/how" ? "#how" : "#about")
      ?.scrollIntoView();
  else window.scrollTo(0, options.preserveScroll ? scrollY : 0);
  if (
    path === "admin/inventory" &&
    state.role === "admin" &&
    !state.stockData &&
    !state.stockError &&
    !state.stockLoading
  )
    void fetchStock();
}
function go(path) {
  state.error = "";
  if (location.hash === `#${path}`) route();
  else location.hash = path;
}
function modal(heading, content, actions = "") {
  dialog.innerHTML = `<div class="card-heading"><h2 id="dialog-title">${heading}</h2>${b("×", "close-dialog", "text", `aria-label="${t("إغلاق", "Close")}"`)}</div>${content}<div class="actions">${actions}</div>`;
  dialog.showModal();
}
function errorText(code) {
  const messages = {
    database_not_configured: t("إعداد اتصال Supabase غير مكتمل في الخادم.","Supabase connection is not configured on the server."),
    database_key_invalid: t("مفتاح Supabase غير صالح أو لا يخص المشروع المحدد.", "The Supabase key is invalid or belongs to a different project."),
    database_permission_denied: t("لا توجد صلاحية لقراءة الكتالوج. راجع منح القراءة وسياسات RLS دون تعطيل الحماية.", "Catalog read permission denied. Check read grants and RLS policies."),
    catalog_not_found: t("جدول products_catalog غير موجود أو غير متاح عبر Data API.", "products_catalog is missing or not exposed through the Data API."),
    catalog_schema_invalid: t("أعمدة الكتالوج لا تطابق الأعمدة المطلوبة في التطبيق.", "Catalog columns do not match the application's required fields."),
    database_timeout: t("انتهت مهلة قراءة Supabase. أعد المحاولة بعد التحقق من الاتصال.", "The Supabase read timed out. Check connectivity and retry."),
    database_configuration_invalid: t("راجع رابط Supabase والمفتاح العام.","Check the Supabase URL and publishable key."),
    database_unreachable: t("تعذر الوصول إلى Supabase؛ يمكنك متابعة المخزون المحلي.","Cannot reach Supabase. Local inventory remains available."),
    catalog_unavailable: t("تعذر تحميل الكتالوج. راجع الجدول وصلاحيات القراءة.","Catalog could not be loaded. Check the table and read permissions."),
    catalog_invalid: t("بنية بيانات الكتالوج غير صالحة.","Catalog data is invalid."),
    catalog_incomplete: t("الكتالوج غير مكتمل؛ لم تُعرض بيانات جزئية.","Catalog is incomplete; partial data was not displayed."),
    plan_invalid: t("تغير التوافق أو الاحتياج؛ راجع الاختيارات.","Compatibility or requirements changed. Review selected devices."),
    missing_information: t("استكمل المعلومات الناقصة.","Resolve missing information."),
    plan_over_quantity: t("الاختيارات تتجاوز العدد المطلوب.","Selection exceeds the requested quantity."),
    plan_selection_conflict: t("تعارض مع اختياراتك الحالية أو الرصيد المتاح؛ لم يُستبدل شيء.","Conflict with current selections or available stock. Nothing was replaced."),
    plan_quantity_invalid: t("أدخل كمية صحيحة غير سالبة.","Enter a non-negative whole quantity."),
    inventory_invalid: t("بيانات المخزون غير مكتملة أو كبيرة جداً للتحليل؛ راجع سجل المخزون.", "Inventory data is incomplete or too large to analyze; review the inventory records."),
    requirements_invalid: t("راجع المواصفات وأدخل تفسيراً للفني.","Check requirements and enter technician rationale."),
    local_storage_unavailable: t("تعذر حفظ البيانات في المتصفح. اسمح بتخزين بيانات الموقع ثم أعد المحاولة.", "Browser storage is unavailable. Allow site storage and retry."),
    local_data_invalid: t("تعذر قراءة البيانات المحفوظة في المتصفح. احتفظ بنسخة منها قبل إعادة ضبط بيانات الموقع.", "Saved browser data could not be read. Preserve a copy before resetting site data."),
    request_not_pending: t("تمت مراجعة هذا الطلب بالفعل. حدّث الطلبات.", "This request has already been reviewed. Refresh requests."),
    request_not_found: t("الطلب غير موجود في هذا المتصفح.", "This request was not found in this browser."),
    rate_limited: t("محاولات كثيرة. انتظر دقيقة ثم أعد المحاولة.", "Too many attempts. Wait a minute and retry."),
    api_unreachable: t("تعذر الاتصال بالخادم. تأكد من تشغيله ثم أعد المحاولة.", "Cannot reach the server. Check that it is running and retry."),
    api_not_available: t("خدمة التحليل غير متاحة على هذا العنوان. شغّل npm.cmd run dev وافتح العنوان الظاهر في الطرفية.", "The analysis API is unavailable at this address. Run npm.cmd run dev and open the address printed in the terminal."),
    server_error: t("حدث خطأ داخلي في الخادم. أعد تشغيله وحدّث الصفحة.", "An internal server error occurred. Restart the server and refresh the page."),
    origin_denied: t("عنوان الصفحة لا يطابق عنوان الخادم. افتح الرابط الظاهر عند تشغيل التطبيق.", "The page address does not match the server. Open the address printed at startup."),
    login_invalid: t("أدخل بريد الفني وكلمة المرور.", "Enter the technician email and password."),
    inventory_unavailable: t(
      "تعذر تحميل المخزون. حدّث الصفحة ثم أعد المحاولة.",
      "Could not load inventory. Refresh the page and retry.",
    ),
    inventory_incomplete: t(
      "حجم المخزون تجاوز حد القراءة؛ لا نعرض خطة مبنية على بيانات جزئية.",
      "Inventory exceeds the read limit. A plan cannot use partial inventory.",
    ),
    inventory_changed: t(
      "تغير المخزون؛ حدّث الخطة وراجعها قبل الاعتماد.",
      "Inventory changed. Refresh and review the plan before approval.",
    ),
    compatibility_changed: t(
      "تغيرت بيانات التوافق أو الفحص؛ حدّث الخطة.",
      "Compatibility or inspection data changed. Refresh the plan.",
    ),
    plan_incomplete: t(
      "الخطة لا تغطي كامل الكمية المطلوبة.",
      "The plan does not cover the full requested quantity.",
    ),
    plan_selection_required: t(
      "اختر خطة تلبية كاملة قبل الاعتماد.",
      "Select a complete fulfillment plan before approval.",
    ),
    inventory_update_failed: t(
      "تعذر تحديث المخزون. تحقق من إجراءات التلبية وصلاحياتها.",
      "Inventory update failed. Check fulfillment procedures and permissions.",
    ),
    preparation_confirmation_required: t(
      "أكد الفحص والتجهيز وأدخل ملاحظات لا تقل عن خمسة أحرف.",
      "Confirm preparation and inspection and enter notes of at least five characters.",
    ),
    insufficient_recorded_stock: t(
      "الكمية المسجلة أقل من الطلب؛ اختر بديلاً أو اطلب تعديلاً.",
      "Recorded stock is below the requested quantity. Choose an alternative or request changes.",
    ),
    gemini_not_configured: t(
      "مفتاح Gemini غير مهيأ في الخادم. أضف GEMINI_API_KEY إلى ملف .env المحلي ثم أعد تشغيل الخادم.",
      "The Gemini key is not configured on the server. Set GEMINI_API_KEY in local .env and restart the server.",
    ),
    gemini_configuration_invalid: t("إعداد GEMINI_MODEL غير صالح. أدخل معرّف نموذج Gemini المتاح لمفتاحك ثم أعد تشغيل الخادم.", "GEMINI_MODEL is invalid. Set an accessible Gemini model ID and restart the server."),
    gemini_key_invalid: t("مفتاح Gemini غير صالح أو انتهت صلاحيته. حدّث المفتاح في إعدادات الخادم ثم أعد تشغيله.", "The Gemini key is invalid or expired. Update the server key and restart it."),
    gemini_service_disabled: t("خدمة Gemini غير مفعلة لمشروع المفتاح. فعّل Generative Language API في مشروع Google.", "Gemini is disabled for this key’s project. Enable the Generative Language API in Google Cloud."),
    gemini_access_denied: t("لا يملك مفتاح Gemini صلاحية الوصول. راجع قيود المفتاح وإتاحة الخدمة في مشروع Google.", "Gemini access was denied. Check API-key restrictions and service availability in the Google project."),
    gemini_model_unavailable: t("نموذج Gemini غير متاح للتوليد. اعرض النماذج عبر npm run ai:check -- --list وحدّث GEMINI_MODEL ثم أعد تشغيل الخادم.", "The configured Gemini model is unavailable for generation. List models with npm run ai:check -- --list, update GEMINI_MODEL, then restart the server."),
    gemini_quota_exceeded: t("تم بلوغ حد استخدام Gemini. راجع الحصة والفوترة في Google AI Studio أو أعد المحاولة لاحقاً.", "Gemini quota or rate limit reached. Check quota and billing in Google AI Studio, or retry later."),
    gemini_service_unavailable: t("خدمة Gemini غير متاحة مؤقتاً. أعد المحاولة لاحقاً.", "Gemini is temporarily unavailable. Retry later."),
    gemini_timeout: t("انتهت مهلة تحليل Gemini. بقي الطلب محفوظاً؛ أعد المحاولة.", "Gemini analysis timed out. Your request is saved; retry the analysis."),
    gemini_content_blocked: t("لم يُرجع Gemini تحليلاً مسموحاً. أعد صياغة وصف الاحتياج ثم حاول مجدداً.", "Gemini did not return an allowed analysis. Rephrase the requirements and retry."),
    gemini_response_truncated: t("انقطع رد Gemini قبل اكتماله. لم يُحفظ التحليل؛ أعد المحاولة بوصف مختصر.", "Gemini’s reply was cut short. The analysis was not saved; retry with a shorter description."),
    gemini_response_invalid: t("رد خدمة Gemini غير قابل للقراءة. لم يُحفظ التحليل؛ أعد المحاولة.", "Gemini returned an unreadable response. The analysis was not saved; retry."),
    gemini_request_invalid: t("رفض Gemini تنسيق طلب التحليل. حدّث التطبيق ثم أعد تشغيل الخادم.", "Gemini rejected the analysis request format. Update the app and restart the server."),
    gemini_unreachable: t("تعذر الوصول إلى Gemini.", "Could not reach Gemini."),
    gemini_request_failed: t(
      "تعذر إكمال التحليل عبر Gemini.",
      "Gemini could not complete the analysis.",
    ),
    analysis_invalid: t(
      "نتيجة التحليل غير مكتملة؛ لم نعتمدها. أعد المحاولة.",
      "The analysis result is incomplete and was not accepted. Retry.",
    ),
    technician_login_required: t(
      "يرجى تسجيل دخول الفني.",
      "Please sign in as a technician.",
    ),
    login_failed: t(
      "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
      "The email or password is incorrect.",
    ),
    request_changed: t(
      "تغير الطلب أثناء المراجعة؛ حدّث قائمة الطلبات.",
      "The request changed during review. Refresh the request list.",
    ),
    technical_review_required: t(
      "أكمل التحليل والمعلومات الناقصة وتأكيد المراجعة الفنية.",
      "Complete analysis, missing information and technical-review confirmation.",
    ),
    request_invalid: t(
      "تحقق من اسم الجهة والوصف والكمية (1–100).",
      "Check organization, description and quantity (1–100).",
    ),
    reason_required: t(
      "أدخل سبباً للقرار.",
      "Enter a reason for this decision.",
    ),
  };
  return (
    messages[code] ||
    t(
      "تعذر إكمال العملية. حاول مجدداً.",
      "Could not complete the operation. Please retry.",
    )
  );
}
function requestStatus(status) {
  return (
    {
      pending: t("بانتظار مراجعة الفني", "Awaiting technician review"),
      approved: t("معتمد — بانتظار التجهيز", "Approved — awaiting preparation"),
      completed: t("مجهز — تم تحديث المخزون", "Prepared — inventory updated"),
      rejected: t("مرفوض", "Rejected"),
      modification: t("مطلوب تعديل", "Changes requested"),
    }[status] || status
  );
}
async function fetchRequests() {
  state.loading = true;
  state.dataError = "";
  route();
  try {
    state.requests = (await api("/technician/requests")).items || [];
  } catch (e) {
    state.dataError = e.message;
  }
  state.loading = false;
  route();
}
async function fetchFulfillment(options = {}) {
  if (!state.request?.analysis) return;
  const requestId = state.request.id,
    epoch = (state.fulfillmentEpoch || 0) + 1;
  state.fulfillmentEpoch = epoch;
  state.fulfillmentLoading = true;
  state.fulfillmentError = "";
  state.reviewConfirmed = false;
  route(options);
  try {
    const data = await api(
      "/technician/requests/" + requestId + "/fulfillment",
    );
    if (state.request?.id !== requestId || state.fulfillmentEpoch !== epoch)
      return;
    if (data.item) state.request = data.item;
    state.fulfillmentPlans = data.plans || [];
    state.draftPlan = data.draft || null;
    state.manualCandidates = data.candidates || [];
    state.evaluation = data.evaluation || null;
    if (data.approvedPlan) state.request.fulfillment_plan = data.approvedPlan;
  } catch (e) {
    if (state.request?.id !== requestId || state.fulfillmentEpoch !== epoch)
      return;
    state.fulfillmentPlans = [];
    state.fulfillmentError = e.message;
  }
  state.fulfillmentLoading = false;
  route(options);
}
async function fetchStock() {
  state.stockLoading = true;
  state.stockError = "";
  route();
  try {
    state.stockData = (await api("/technician/inventory")).inventory;
  } catch (e) {
    state.stockError = e.message;
  }
  state.stockLoading = false;
  route();
}
function syncRequest(r) {
  state.request = r;
  state.fulfillmentPlans = [];
  state.draftPlan = null;
  state.partialConfirmed = false;
  state.fulfillmentError = "";
  state.stockData = null;
  state.preparationNote = "";
  state.requests = state.requests.map((x) => (x.id === r.id ? r : x));
  state.reviewConfirmed = false;
}
function draft() {
  const form = document.querySelector("#request-form");
  if (form) state.draft = Object.fromEntries(new FormData(form));
}
document.addEventListener("input", (e) => {
  if (e.target.matches('#preparation-form [name="note"]'))
    state.preparationNote = e.target.value;
  if (e.target.closest("#request-form")) draft();
});
document.addEventListener("change", (e) => {
  if (e.target.id === "partial-confirmation") { state.partialConfirmed = e.target.checked; route({preserveScroll:true}); }
  if (e.target.matches("#technical-confirmation")) {
    state.reviewConfirmed = e.target.checked;
    route();
  }
});
document.addEventListener("click", async (e) => {
  const button = e.target.closest("[data-action]");
  if (!button || button.disabled) return;
  const action = button.dataset.action;
  if (action === "review-selection") {
    if(state.hideSuggestions){state.hideSuggestions=false;route({preserveScroll:true});}
    const selection=document.querySelector(".inventory-selection");
    if(selection){selection.open=true;selection.scrollIntoView({block:"center"});selection.querySelector("button")?.focus();}
  }
  if (action === "choose-strategy") {
    state.activeStrategy = button.dataset.id;
    state.reviewConfirmed = false;
    route();
  }
  if (action === "refresh-fulfillment" && state.role === "admin")
    await fetchFulfillment();
  if (action === "refresh-stock" && state.role === "admin") await fetchStock();
  if (action === "language") {
    draft();
    state.lang = state.lang === "ar" ? "en" : "ar";
    route();
  }
  if (action === "toggle-menu") {
    const nav = document.querySelector("#public-navigation"),
      open = button.getAttribute("aria-expanded") !== "true";
    button.setAttribute("aria-expanded", String(open));
    nav.classList.toggle("is-open", open);
  }
  if (action === "close-dialog") dialog.close();
  if (action === "search")
    modal(
      t("البحث", "Search"),
      `<form id="site-search-form"><label>${t("ابحث في الموقع", "Search the site")}<input name="query" type="search" required></label><button class="button" type="submit">${t("بحث", "Search")}</button></form><div id="search-results" role="status"></div>`,
    );
  if (action === "new-public-request") {
    state.draft = {};
    state.submitted = null;
    go("user/request");
  }
  if (action === "return-user") go("user/request");
  if (action === "logout") {
    authEpoch++;
    state.analysisError = "";
    try {
      await api("/technician/logout", "POST", {});
    } catch {}
    state.role = null;
    state.requests = [];
    state.request = null;
    state.stockData = null;
    state.fulfillmentPlans = [];
    go("login/admin");
  }
  if (action === "refresh-requests" && state.role === "admin")
    await fetchRequests();
  if (action === "open-request" && state.role === "admin") {
    state.analysisError = "";
    state.hideSuggestions = false;
    state.request = state.requests.find((r) => r.id === button.dataset.id);
    state.reviewConfirmed = false;
    state.activeStrategy = "ready_only";
    state.draftPlan = null;
    state.partialConfirmed = false;
    state.fulfillmentPlans = [];
    state.fulfillmentError = "";
    go("admin/review");
    await fetchFulfillment();
  }
  if (
    ["modify", "reject"].includes(action) &&
    state.role === "admin" &&
    state.request?.status === "pending"
  )
    modal(
      action === "modify"
        ? t("طلب تعديل", "Request changes")
        : t("رفض الطلب", "Reject request"),
      `<form id="decision-form" data-kind="${action}"><label>${t("سبب القرار", "Decision reason")}<textarea name="reason" required maxlength="1000">${esc(action === "modify" ? (state.request.analysis?.missingInformation?.join(" · ") || t("يرجى توضيح الاستخدام والتطبيقات المطلوبة.", "Please clarify the intended use and required applications.")) : t("الطلب غير مناسب للتلبية بالمخزون المتاح.", "The request cannot be fulfilled suitably from available inventory."))}</textarea></label><button class="button" type="submit">${t("حفظ القرار", "Save decision")}</button></form>`,
    );
  if (
    action === "confirm" &&
    state.role === "admin" &&
    state.request?.status === "pending" &&
    state.reviewConfirmed
  ) {
    const p = selectedPlan();
    if (reviewBlocker()) return;
    modal(
      t("تأكيد الخطة وحجز المخزون", "Confirm plan & reserve inventory"),
      `<p>${esc(state.request.organization)} · ${p.total} ${t("جهازاً", "devices")}</p><ul class="confirm-list">${p.allocations.map((x) => `<li>${esc(x.model)} × ${x.count}<small>${allocationCategory(x.category)}</small></li>`).join("")}</ul><p>${t("سيُحجز رصيد الأجهزة والقطع في عملية واحدة. التجهيز الفعلي والتحديث النهائي خطوة تالية منفصلة.", "Devices and components will be reserved in one transaction. Physical preparation and final issuance are a separate next step.")}</p>`,
      b(t("تأكيد الاعتماد", "Confirm approval"), "approve") +
        b(t("إلغاء", "Cancel"), "close-dialog", "outline"),
    );
  }
  if (action === "approve" && state.role === "admin" && state.request) {
    button.disabled = true;
    try {
      const r = await api(
        "/technician/requests/" + state.request.id + "/decision",
        "POST",
        {
          status: "approved",
          strategy: "selected",
          partialConfirmed: state.partialConfirmed,
          planFingerprint: selectedPlan()?.fingerprint,
          reviewConfirmed: state.reviewConfirmed,
        },
      );
      syncRequest(r.item);
      state.error = "";
      dialog.close();
      route();
    } catch (err) {
      state.error = err.message;
      dialog.close();
      route();
    }
  }
});
async function updatePlan(input) {
  try {
    const result = await api("/technician/requests/" + state.request.id + "/draft", "POST", input);
    syncRequest(result.item); state.error = "";
    await fetchFulfillment({preserveScroll:true});
  } catch (error) { state.error = error.message; dialog.close(); route({preserveScroll:true}); }
}
document.addEventListener("click", async (e) => {
  const button = e.target.closest("[data-action]");
  if (!button || state.role !== "admin") return;
  const action = button.dataset.action;
  if (action === "load-reference") {
    state.catalogReferenceLoading=true;state.catalogReferenceError="";route({preserveScroll:true});
    state.catalogReadSucceeded=false;
    try {state.catalogReference=(await api("/technician/catalog")).items;state.catalogReadSucceeded=true;}catch(error){state.catalogReference=[];state.catalogReferenceError=error.message;}
    state.catalogReferenceLoading=false;route({preserveScroll:true});
  }
  if (!state.request) return;
  if (action === "ignore-suggestions") { state.hideSuggestions=!state.hideSuggestions;route({preserveScroll:true}); }
  if (action === "apply-proposal") await updatePlan({action:"apply",strategy:state.activeStrategy});
  if (action === "remove-line") await updatePlan({action:"remove",key:button.dataset.key});
  if (action === "clear-plan") modal(t("إزالة اختيارات الأجهزة؟","Clear device selections?"),`<p>${t("سيُحذف الاختيار فقط. يبقى الطلب والمخزون كما هما.","Only the selection is cleared. The request and inventory remain.")}</p>`,b(t("تأكيد الإزالة","Confirm clear"),"confirm-clear"));
  if (action === "confirm-clear") {dialog.close(); await updatePlan({action:"clear"});}
  if (action === "manual-plan") modal(t("اختيار يدوي من المخزون","Choose manually from inventory"), `<div class="manual-options">${state.manualCandidates.map((a)=>`<form class="manual-add-form" data-key="${esc(a.key)}"><h3>${esc(a.model)}</h3><p>${allocationCategory(a.category)} · RAM ${a.ramAfter} GB · SSD ${a.storageAfter} GB</p><label>${t("الكمية","Quantity")}<input name="count" type="number" min="1" max="${a.count}" value="1" required></label><button type="submit" class="button">${t("إضافة للخطة","Add to plan")}</button></form>`).join("") || `<p>${t("لا توجد خيارات متوافقة متاحة.","No eligible options available.")}</p>`}</div>`);

});
document.addEventListener("submit", async (e) => {
  const form=e.target;
  if (form.id === "request-filter-form") {e.preventDefault();state.requestSearch=form.elements.search.value.trim();state.statusFilter=form.elements.status.value;route();return;}
  if (!form.matches(".manual-add-form,.plan-quantity-form")) return;
  e.preventDefault();
  if (state.role!=="admin" || !state.request) return;
  const input=Object.fromEntries(new FormData(form));
  dialog.close();
  await updatePlan({action:form.matches(".manual-add-form")?"add":"quantity",key:form.dataset.key,count:Number(input.count)});
});
document.addEventListener("submit", async (e) => {
  if (
    ![
      "request-form",
      "technician-login-form",
      "analysis-form",
      "preparation-form",
      "decision-form",
      "site-search-form",
    ].includes(e.target.id)
  )
    return;
  e.preventDefault();
  const form = e.target;
  if (form.id === "site-search-form") {
    const q = form.elements.query.value.trim().toLowerCase(),
      pages = [
        [
          t("طلب الأجهزة عبر قدرة", "Request devices with Qudra"),
          "user/request",
        ],
        [t("دخول الفني", "Technician login"), "login/admin"],
        [t("عن ارتقاء", "About Ertiqa"), "home/about"],
      ];
    const found = pages.filter(([x]) => x.toLowerCase().includes(q));
    document.querySelector("#search-results").innerHTML = found.length
      ? found.map(([x, path]) => link(x, path, "outline")).join("")
      : `<p>${t("لا توجد نتائج.", "No results.")}</p>`;
    return;
  }
  if (form.id === "analysis-form") {
    if (state.role !== "admin" || !state.request || state.analysisLoadingId === state.request.id) return;
    const requestId = state.request.id, epoch = authEpoch, sequence = ++analysisSequence;
    const isCurrent = () => sequence === analysisSequence && epoch === authEpoch && state.request?.id === requestId;
    state.analysisError = "";
    state.error = "";
    state.reviewConfirmed = false;
    state.analysisLoadingId = requestId;
    route({ preserveScroll: true });
    try {
      const result = await api("/technician/requests/" + requestId + "/analyze", "POST", {
        lang: state.lang,
      });
      if (!isCurrent()) return;
      syncRequest(result.item);
      await fetchFulfillment({ preserveScroll: true });
    } catch (error) {
      if (isCurrent()) state.analysisError = error.message;
    } finally {
      if (sequence === analysisSequence) state.analysisLoadingId = null;
      if (isCurrent()) route({ preserveScroll: true });
    }
    return;
  }
  const submit = form.querySelector('[type="submit"]');
  submit.disabled = true;
  form.setAttribute("aria-busy", "true");
  try {
    if (form.id === "request-form") {
      draft();
      const result = await api("/requests", "POST", state.draft);
      state.submitted = result;
      if (state.role === "admin") {
        try { state.requests = (await api("/technician/requests")).items; } catch {}
      }
      go("user/submitted");
    }
    if (form.id === "technician-login-form") {
      authEpoch++;
      const email = form.elements.email.value,
        password = form.elements.password.value;
      form.elements.password.value = "";
      await api("/technician/login", "POST", { email, password });
      state.role = "admin";
      go("admin/dashboard");
      await fetchRequests();
    }
    if (form.id === "preparation-form" && state.role === "admin") {
      state.preparationNote = form.elements.note.value.trim() || t("تم تجهيز الأجهزة وفحصها وفق الاختيار المعتمد.", "Devices prepared and inspected according to the approved selection.");
      const result = await api(
        "/technician/requests/" + state.request.id + "/prepare",
        "POST",
        {
          expectedVersion: state.request.updated_at,
          preparedConfirmed: form.elements.preparedConfirmed.checked,
          note: state.preparationNote,
        },
      );
      syncRequest(result.item);
      state.error = "";
      route();
    }
    if (form.id === "decision-form" && state.role === "admin") {
      const r = await api(
        "/technician/requests/" + state.request.id + "/decision",
        "POST",
        {
          status: form.dataset.kind === "modify" ? "modification" : "rejected",
          reason: form.elements.reason.value,
        },
      );
      syncRequest(r.item);
      state.error = "";
      dialog.close();
      route();
    }
  } catch (err) {
    state.error = err.message;
    if (form.id === "decision-form") dialog.close();
    route();
  } finally {
    if (submit.isConnected) {
      submit.disabled = false;
      form.removeAttribute("aria-busy");
    }
  }
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    document.querySelector("#public-navigation")?.classList.remove("is-open");
    document
      .querySelector('[data-action="toggle-menu"]')
      ?.setAttribute("aria-expanded", "false");
  }
});
window.addEventListener("hashchange", route);
route();
(async () => {
  const epoch = authEpoch;
  const session = api("/technician/session")
    .then(() => true)
    .catch(() => false);
  const authenticated = await session;
  if (epoch === authEpoch && authenticated) state.role = "admin";
  draft();
  if (!document.activeElement?.closest("#technician-login-form")) route();
  if (state.role === "admin") await fetchRequests();
})();
