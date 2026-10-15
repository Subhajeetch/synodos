import { LINKS } from "@/components/landing/content";

export interface DocsSection {
  title: string;
  paragraphs: readonly string[];
  bullets?: readonly string[];
}

export interface DocsPage {
  href: string;
  title: string;
  eyebrow: string;
  description: string;
  sections: readonly DocsSection[];
  related: readonly string[];
}

export interface DocsNavGroup {
  label: string;
  items: readonly { label: string; href: string }[];
}

export const DOCS_PAGES: readonly DocsPage[] = [
  {
    href: LINKS.seeHow,
    title: "Work together in one shared document",
    eyebrow: "Collaboration",
    description:
      "Synodos gives your team a shared place to write, develop ideas, and keep project information together. Learn how live editing, collaborator presence, and document sharing fit into a straightforward team workflow.",
    sections: [
      {
        title: "A shared space for your work",
        paragraphs: [
          "Start by creating a document for the work you want to do together. It might be a meeting record, a project brief, a product plan, or a first draft. Give it a clear title and a short introduction so that anyone who opens it can understand its purpose.",
          "When the document is ready for other people, the owner can invite teammates through the sharing controls. After an invitation is accepted, the new member can access the document according to the role they have been given. Everyone with the right permissions can work from the same shared document instead of maintaining separate copies.",
          "Keeping the work in one place is especially helpful when a document changes over time. Rather than asking which attachment is the newest, teammates can return to the shared page to read the current content and see it develop.",
        ],
      },
      {
        title: "See who is working with you",
        paragraphs: [
          "The editor shows which collaborators are online. Their cursors can also help you see where they are working in the document. This makes it easier to coordinate naturally when multiple people are writing or reviewing the same page.",
          "Presence is a useful signal, but it does not replace clear communication. When you need feedback on a particular section, tell teammates what to look at and what kind of decision you need. Write important outcomes into the document so the team has a clear record to return to later.",
        ],
        bullets: [
          "Write and revise content in the shared document.",
          "Check collaborator presence while you work.",
          "Use visible cursors to follow where teammates are editing.",
          "Keep important decisions and next steps in the document.",
        ],
      },
      {
        title: "Build a workflow the team can repeat",
        paragraphs: [
          "A simple workflow is often enough to make collaboration useful. Give the document a clear purpose, invite the people who need to contribute, organize information with headings and lists, and record important decisions as they happen.",
          "For work that changes significantly, version history provides a way to review previous snapshots. This helps the team look back at earlier content when it needs context or when the owner decides that restoring an earlier version is appropriate.",
          "The aim is not to create more process than the work requires. It is to make the document easy to understand, easy to contribute to, and useful after the original conversation has ended.",
        ],
      },
    ],
    related: [LINKS.realtimeEditing, LINKS.share],
  },
  {
    href: LINKS.realtimeEditing,
    title: "Real-time editing",
    eyebrow: "Features",
    description:
      "Write in the same document as your teammates and see collaborative activity in the editor. Real-time editing keeps the team focused on shared content instead of separate drafts.",
    sections: [
      {
        title: "Work from one current document",
        paragraphs: [
          "Synodos uses live collaboration to keep changes synchronized between people working in the same document. A teammate can add a paragraph, revise a heading, or reorganize part of the content while others continue working in that shared space.",
          "This approach reduces the need to exchange updated copies just to keep everyone working from the same draft. The shared document becomes the place to return to when you need to read the current content or make another change.",
          "Each collaborator's permissions still apply. Owners and editors can make changes to document content, while viewers can read without editing. Real-time collaboration does not give a person more access than their assigned role allows.",
        ],
      },
      {
        title: "Understand collaborator presence",
        paragraphs: [
          "The editor displays collaborators who are currently online in the document. Cursor indicators can help you see where another person is working, which is useful when the team is reviewing the same passage or dividing work across different sections.",
          "You can adjust some presence behavior in your editor preferences, including whether collaborator cursors should always remain visible. Notification settings can also control whether collaboration activity produces sounds or pop-up alerts.",
        ],
        bullets: [
          "See active collaborators in the document.",
          "Use cursor indicators to understand where teammates are working.",
          "Adjust collaboration sounds, pop-ups, and cursor visibility.",
          "Check the connection status when shared updates do not appear as expected.",
        ],
      },
      {
        title: "Stay aware of connection status",
        paragraphs: [
          "Live editing depends on the collaboration connection. Synodos provides connection and synchronization status indicators so you can notice when the editor reports a problem.",
          "If a warning appears, read it before assuming that the latest changes have reached everyone. Resolve the connection issue and check the current document state before continuing with work that depends on a shared update.",
          "For the best results, make substantial decisions visible in the document itself. Live editing helps the team work together, while clear writing ensures that the result still makes sense to someone who returns to the page later.",
        ],
      },
    ],
    related: [LINKS.seeHow, LINKS.share, LINKS.versionHistory],
  },
  {
    href: LINKS.richText,
    title: "Using the rich-text editor",
    eyebrow: "Features",
    description:
      "Turn a blank document into clear, structured writing with headings, formatting, lists, tables, images, and other tools built into the shared editor.",
    sections: [
      {
        title: "Structure information clearly",
        paragraphs: [
          "The editor supports headings, paragraphs, and several kinds of text formatting. Headings divide long documents into topics, while paragraphs give each idea room to be explained. Bold text and other emphasis tools can draw attention to important words when used with a clear purpose.",
          "Choose a heading level based on the structure of the document rather than using headings only to change text size. A consistent hierarchy helps readers understand how individual sections relate to the main topic and makes the page easier to scan.",
          "The toolbar includes controls for text alignment and styling. You can also use links to point readers toward relevant information, quotes to distinguish referenced material, and inline code to set apart short technical terms or examples.",
        ],
        bullets: [
          "Use heading levels to organize major topics and subsections.",
          "Apply bold, italic, underline, strikethrough, and highlighting where helpful.",
          "Add links, quotes, and inline code to give readers more context.",
          "Adjust alignment and text styling from the toolbar.",
        ],
      },
      {
        title: "Choose the right content element",
        paragraphs: [
          "Lists make related information easier to scan. Use numbered lists when readers need to follow an order, bullet lists when order is not important, and task lists when you want individual items to be easy to identify and check off.",
          "Tables are helpful for information that needs to be compared in rows and columns. You can insert a table and adjust its structure as the information changes. Code blocks keep longer technical examples separate from ordinary prose, while images can provide visual context that would be difficult to explain with words alone.",
          "Choose an element because it helps the reader understand the content. A simple paragraph may be the clearest choice for an explanation, while a table or list can be more useful when people need to compare details or find a particular item quickly.",
        ],
        bullets: [
          "Create bullet lists, numbered lists, and task lists.",
          "Insert and adjust tables to present related information.",
          "Use code blocks for examples that should stay distinct from regular text.",
          "Add images when a visual explanation is useful.",
        ],
      },
      {
        title: "Organize a document into pages",
        paragraphs: [
          "Some documents need more than one continuous writing area. Synodos supports document pages, each of which can have its own title. Pages can be added, duplicated, moved, or removed as the content develops, which makes it possible to keep related material together while separating distinct parts.",
          "Give pages names that tell readers what they contain. For example, a project document might use separate pages for background, requirements, and follow-up notes. A consistent structure helps teammates move through the content without having to search a long block of text for every detail.",
          "Use the available controls to manage the page order and structure. Keep the layout as simple as possible, and make sure each page has a clear reason to exist.",
        ],
      },
    ],
    related: [LINKS.realtimeEditing, LINKS.documentation],
  },
  {
    href: LINKS.versionHistory,
    title: "Version history",
    eyebrow: "Features",
    description:
      "Review how a document has developed, create named checkpoints for important milestones, and restore an earlier version when returning to previous content is the right choice.",
    sections: [
      {
        title: "Understand saved versions",
        paragraphs: [
          "A collaborative document can change considerably over time. Version history gives you a record of saved snapshots so you can review earlier content without relying on memory or keeping a separate copy for every major edit.",
          "Synodos creates automatic snapshots as the document changes. Entries include details such as the version type, creation time, and author where available. The version history panel groups entries by date, making it easier to browse the available history.",
          "Select a version to preview its content. You can move between available historical versions to review different points in the document's development, then return to the current document when you have finished inspecting the history.",
        ],
      },
      {
        title: "Create named checkpoints",
        paragraphs: [
          "Automatic snapshots are useful when you need to look back at previous content. Named checkpoints are helpful when you want to mark a specific milestone that will be easy to recognize later.",
          'For example, you might name a version "First complete draft" before asking teammates to review it, or "Before restructure" before making a substantial change to a document. The label gives the team a clear reference without requiring another manually stored copy.',
          "Owners and editors can create named checkpoints and rename existing labels. Choose names that describe the state of the document, not just the date, so a teammate can understand why that point may matter.",
        ],
        bullets: [
          "Review automatic snapshots as the document changes.",
          "Create a named checkpoint at an important stage.",
          "Use descriptive labels to make meaningful versions easy to recognize.",
          "Preview historical content before deciding what to do next.",
        ],
      },
      {
        title: "Restore an earlier version carefully",
        paragraphs: [
          "If the team decides that an earlier state is more useful than the current content, the document owner can restore that version. Restoring replaces the current document content with the selected historical state, so it can affect everyone who uses the document.",
          "Always preview the version first and confirm that it contains the content you want to recover. Do not rely only on a label or timestamp if you are unsure which snapshot is correct.",
          "Before restoration, Synodos saves the current content as a separate pre-restore version. This provides a record of the state that existed immediately before the restore. Version history is a useful way to revisit earlier work, but taking time to select the right snapshot helps avoid unnecessary changes for the team.",
        ],
      },
    ],
    related: [LINKS.realtimeEditing, LINKS.documentation],
  },
  {
    href: LINKS.share,
    title: "Share a document with your team",
    eyebrow: "Features",
    description:
      "Invite specific people into a document, choose the access role that fits their work, and review membership as the team changes.",
    sections: [
      {
        title: "Invite the people who need access",
        paragraphs: [
          "Document sharing begins with the document owner. The owner can open the sharing controls, enter a person's email address, and choose a role for the invitation. The person must accept the invitation before becoming a member with access to the document.",
          "Keep invitations connected to the document's actual purpose. Some people need to contribute directly, while others only need to read the current content. Giving each person the appropriate role makes those expectations clear.",
          "A document URL does not, by itself, replace the invitation and permission process. If a teammate cannot access a document, check the document's membership and ask its owner to review the person's access.",
        ],
      },
      {
        title: "Understand document roles",
        paragraphs: [
          "Synodos distinguishes between three document roles. The Owner manages membership and has permission to perform owner-only actions. An Editor can change the document's content and collaborate on the work. A Viewer can read the document but cannot edit its content.",
          "These roles help teams separate responsibility for managing a document from responsibility for writing it or simply reading it. Choose a role based on what the person needs to do rather than automatically granting everyone editing access.",
        ],
        bullets: [
          "Owner: manages document membership and can restore historical versions.",
          "Editor: can make changes and create named version checkpoints.",
          "Viewer: can read the document without editing its content.",
          "The owner can change member roles or remove members when appropriate.",
        ],
      },
      {
        title: "Keep membership up to date",
        paragraphs: [
          "A document's intended audience can change as a project moves forward. Review membership when someone joins the team, moves to different responsibilities, or no longer needs access. Removing access when it is no longer needed helps keep document permissions aligned with the team's actual work.",
          "When someone asks to join or reports that they cannot open a document, the owner should review the request and decide whether access is appropriate. Do not assume every request must be approved; consider the document's audience and purpose first.",
          "Good sharing practices are simple: invite the intended people, choose roles carefully, and revisit those choices when the work changes. These habits help the team collaborate while keeping access decisions clear.",
        ],
      },
    ],
    related: [LINKS.seeHow, LINKS.realtimeEditing],
  },
  {
    href: LINKS.teamWikis,
    title: "Build a team wiki that stays useful",
    eyebrow: "Use cases",
    description:
      "Turn recurring questions, working practices, and project context into shared documents that teammates can understand and maintain over time.",
    sections: [
      {
        title: "Start with knowledge people need",
        paragraphs: [
          "A team wiki is most useful when it answers real questions. Start with the information teammates need repeatedly: how a process works, how a decision was reached, what someone needs before beginning a task, or where to find important project context.",
          "Avoid trying to document every detail at once. Choose a useful starting point, give it a descriptive title, and explain the information in the order a reader is likely to need it. A focused document is easier to maintain than a page trying to cover too many unrelated topics.",
          "Think about readers who were not present when the information was first discussed. Explain unfamiliar terms, include the reasoning behind important decisions, and make assumptions clear instead of expecting everyone to know the background.",
        ],
      },
      {
        title: "Make pages easy to read",
        paragraphs: [
          "Use headings to divide a document into meaningful sections and lists to make steps or related points easier to scan. Put the most important information near the beginning, and use examples when they help readers understand how to apply an instruction.",
          "A title should describe what readers will find in the document. Section headings should do the same for smaller parts of the content. This helps people recognize whether they have found the right information without reading every paragraph first.",
        ],
        bullets: [
          "Give each document a clear purpose and descriptive title.",
          "Explain the context behind decisions and processes.",
          "Use headings and lists to make longer instructions easier to scan.",
          "Write for teammates who are new to the topic.",
        ],
      },
      {
        title: "Keep the wiki current",
        paragraphs: [
          "Documentation can become misleading when a process changes but its instructions remain the same. Ask the people closest to a process to review its documentation whenever important steps, responsibilities, or decisions change.",
          "Because Synodos supports shared editing, the people who know the work can help maintain the document directly, provided they have editing access. Keep useful information in the shared page, update details when they become outdated, and make important decisions clear to future readers.",
          "You do not need an elaborate review process for every document. Start with the pages people rely on most often and make updating them part of the team's normal work.",
        ],
      },
    ],
    related: [LINKS.documentation, LINKS.contentTeams, LINKS.share],
  },
  {
    href: LINKS.meetingNotes,
    title: "Write meeting notes people can act on",
    eyebrow: "Use cases",
    description:
      "Give meetings a clear record of the topics discussed, the decisions made, the questions that remain, and the work that follows.",
    sections: [
      {
        title: "Prepare a useful agenda",
        paragraphs: [
          "Begin with the purpose of the meeting and the questions the group needs to answer. Add the main topics in an order that makes sense, and include background information participants should understand before the conversation begins.",
          "A shared document gives participants a place to read the agenda and contribute context. It also provides a natural place to capture the discussion as the meeting moves from one topic to the next.",
          "Keep the agenda realistic. A short list of clear topics is easier to use than a long list that leaves no time for questions or decisions.",
        ],
      },
      {
        title: "Record decisions and open questions",
        paragraphs: [
          "Meeting notes should help readers understand the outcome, not just reproduce the conversation. Record important decisions beside the topic they resolve, and distinguish them from ideas that are still being considered.",
          "When the group cannot reach a conclusion, write down the open question and what information or action is needed next. This prevents an unresolved discussion from being mistaken for an agreed decision.",
        ],
        bullets: [
          "List the purpose and agenda before the meeting.",
          "Record decisions beside the topics they resolve.",
          "Keep unanswered questions visible.",
          "Write follow-up tasks with clear owners and next steps.",
        ],
      },
      {
        title: "Make follow-through part of the notes",
        paragraphs: [
          "After the meeting, share the notes with the participants while the discussion is still fresh. Check that decisions are understandable and that action items describe a specific task rather than a broad intention.",
          "Return to the document as the work progresses. Update an item when the plan changes, record important follow-up decisions, and keep completed tasks distinguishable from work that still needs attention.",
          "Over time, meeting notes can also provide useful context for people who were not present. A clear record helps teammates understand why the team made a decision instead of asking someone to reconstruct the conversation later.",
        ],
      },
    ],
    related: [LINKS.teamWikis, LINKS.share, LINKS.richText],
  },
  {
    href: LINKS.productSpecs,
    title: "Write product specifications together",
    eyebrow: "Use cases",
    description:
      "Bring product goals, requirements, assumptions, and open questions into one shared document so the team can review the plan and keep it current.",
    sections: [
      {
        title: "Explain the problem before the solution",
        paragraphs: [
          "A useful product specification starts by explaining who the work is for, what problem they face, and why solving it matters. Give readers enough context to understand the need before presenting a proposed solution.",
          "Describe the outcome the team wants to achieve and make the limits of the work clear. A shared understanding of the problem helps reviewers judge whether the proposed requirements address the right issue.",
          "Avoid treating assumptions as confirmed facts. If an important detail is still uncertain, identify it directly so the team knows which questions need further discussion.",
        ],
      },
      {
        title: "Make requirements easy to review",
        paragraphs: [
          "Organize the specification into clear sections covering requirements, scope, non-goals, assumptions, and unresolved questions. Describe expected behavior in specific language and include important edge cases when they may change the design or implementation.",
          "Invite the relevant product, design, and engineering teammates to review the document. Ask them to focus on particular requirements or open questions so the review can resolve practical issues before the plan moves forward.",
        ],
        bullets: [
          "State the problem, goals, and intended outcome.",
          "Separate requirements from non-goals and assumptions.",
          "Describe important edge cases and expected behavior.",
          "Identify unresolved questions and decisions that need review.",
        ],
      },
      {
        title: "Keep the specification connected to the work",
        paragraphs: [
          "A specification should describe the plan the team is actually following. As requirements or assumptions change, update the document and make important decisions visible so that teammates do not continue working from outdated information.",
          "The shared editor makes it possible to work on the document together, while version history provides a way to revisit earlier snapshots. These tools are useful when the team needs to understand how the plan evolved or recover an earlier direction.",
          "Before a major milestone, review the specification for consistency. Check that requirements, decisions, and outstanding questions still agree with one another and that the document gives a new reader enough context to understand the plan.",
        ],
      },
    ],
    related: [LINKS.versionHistory, LINKS.realtimeEditing],
  },
  {
    href: LINKS.contentTeams,
    title: "A clearer workflow for content teams",
    eyebrow: "Use cases",
    description:
      "Keep briefs, drafts, and review decisions in shared documents so writers and reviewers can work from the same current copy and understand why changes are being made.",
    sections: [
      {
        title: "Give every piece of work a clear starting point",
        paragraphs: [
          "Create a document for the brief, draft, or review notes and give it a title that is easy to recognize. Put the intended audience, purpose, and important constraints near the beginning so everyone involved understands what the content needs to accomplish.",
          "A brief does not need to contain every detail of the project. It should give writers enough direction to begin and make the major questions visible before time is spent polishing the wrong approach.",
          "As the draft develops, keep the key context close to the writing. This makes it easier for reviewers to judge the content against the agreed goal instead of relying on scattered messages or memory.",
        ],
      },
      {
        title: "Make feedback specific and useful",
        paragraphs: [
          "Before inviting reviewers, explain what kind of feedback you need. A request to check accuracy, clarity, tone, or completeness gives people a clear focus and makes it easier to compare different opinions.",
          "Ask reviewers to identify the passage they mean and explain what they think should change. The author can then discuss the suggestion with the people involved and update the shared document when a decision has been made.",
        ],
        bullets: [
          "Share the brief and its requirements before drafting begins.",
          "Tell reviewers which questions or qualities to focus on.",
          "Ask for specific feedback tied to the relevant section.",
          "Keep the latest working copy in one shared document.",
        ],
      },
      {
        title: "Create a process the team can repeat",
        paragraphs: [
          "For recurring work, use a consistent outline that covers the details the team needs each time. Adapt the structure to the project rather than forcing every piece of content into a template that does not fit.",
          "Record important review decisions and update the document to reflect the agreed direction. If a major rewrite changes the approach, use version history to revisit an earlier stage when needed.",
          "The goal is a process people can follow without unnecessary hand-offs. Clear briefs, focused reviews, and a shared current draft make responsibilities easier to understand and reduce confusion about which changes have been accepted.",
        ],
      },
    ],
    related: [LINKS.teamWikis, LINKS.guides],
  },
  {
    href: LINKS.documentation,
    title: "Synodos documentation",
    eyebrow: "Documentation",
    description:
      "Learn the basics of creating, editing, sharing, and maintaining documents in Synodos. This guide explains the main tools and the permissions that shape how your team works together.",
    sections: [
      {
        title: "Create a document with a clear purpose",
        paragraphs: [
          "Open your dashboard and create a document for the work you want to organize. Give it a title that communicates its purpose, then add a short introduction so readers can understand the subject without having to work through the entire page.",
          "Think about the structure that will help someone use the document. Headings and paragraphs work well for explanations, lists help present steps or related points, and tables can make comparisons easier to follow. You can also organize longer documents into pages.",
          "When other people need access, use the document's sharing controls to invite them. Choose a role that fits what they need to do, whether that is reading the content or contributing edits.",
        ],
      },
      {
        title: "Write, format, and collaborate",
        paragraphs: [
          "The editor supports rich-text formatting, lists, links, images, tables, quotes, and code blocks. These tools let you present different kinds of information in a way that is easier for teammates to scan and understand.",
          "Synodos supports live collaboration and displays presence information in the editor. Authorized collaborators can work in the shared document while seeing who is online. Pay attention to connection warnings if the editor reports a problem synchronizing changes.",
        ],
        bullets: [
          "Use formatting tools to structure and clarify your content.",
          "Invite collaborators with the appropriate document role.",
          "Use presence indicators to understand who is working in the document.",
          "Check connection status if shared updates appear to be delayed or interrupted.",
        ],
      },
      {
        title: "Keep important work organized",
        paragraphs: [
          "Use descriptive document titles and a consistent structure so teammates can recognize the pages they need. Write down decisions and next steps instead of leaving important context only in a conversation.",
          "Version history lets you review automatic snapshots and create named checkpoints. Editors can create named versions, while restoring an earlier version is an owner-only action because it changes the current content for everyone.",
          "Good documentation is not finished simply because a first draft exists. Review the page when the work changes, correct outdated instructions, and keep important decisions clear for people who return to the document later.",
        ],
      },
    ],
    related: [LINKS.guides, LINKS.realtimeEditing, LINKS.share],
  },
  {
    href: LINKS.guides,
    title: "Guides for better team documents",
    eyebrow: "Learn",
    description:
      "Explore practical ways to make shared writing easier to create, review, and maintain, from meeting notes and team wikis to product specifications and content drafts.",
    sections: [
      {
        title: "Start with the purpose of the document",
        paragraphs: [
          "Before you begin writing, ask what the document should help someone understand or do. A meeting record, a team wiki page, and a product specification all serve different purposes, so they benefit from different structures and levels of detail.",
          "Use that purpose to decide what belongs near the beginning, which topics need their own headings, and what information can be left out. A focused document is easier to maintain and more useful to its readers than one that tries to cover everything at once.",
        ],
      },
      {
        title: "Write for the person who reads it next",
        paragraphs: [
          "Clear writing does not require complicated language. Use specific headings, direct sentences, and short sections. Explain unfamiliar terms and include the context behind decisions when a reader might otherwise need to ask someone what they mean.",
          "Choose lists when they make related points easier to find, and use tables when comparing information matters. Keep important decisions, responsibilities, and next steps explicit so readers do not need to infer what the team agreed to do.",
        ],
        bullets: [
          "Give the document a descriptive title.",
          "Put the main purpose and useful context near the beginning.",
          "Use headings and lists to make longer content easier to scan.",
          "Make decisions and next steps clear.",
        ],
      },
      {
        title: "Keep shared knowledge up to date",
        paragraphs: [
          "A document becomes less useful when its instructions no longer reflect the way the team works. Ask the people who own the process to review important pages when requirements, responsibilities, or decisions change.",
          "Shared editing helps multiple authorized people maintain a document, and version history provides a way to inspect earlier snapshots. Use these features to support the writing process while keeping the content accurate and understandable.",
          "Start with small habits the team can maintain. A clear title, a useful structure, and a regular check of important information can do more for a document than a complicated process nobody follows.",
        ],
      },
    ],
    related: [LINKS.documentation, LINKS.teamWikis, LINKS.meetingNotes],
  },
  {
    href: LINKS.blog,
    title: "Ideas for better collaboration",
    eyebrow: "From the Synodos team",
    description:
      "The Synodos blog does not have any published articles yet. This page outlines the themes the blog is intended to cover, including clear writing, shared knowledge, and practical collaboration habits.",
    sections: [
      {
        title: "Make work easier to understand",
        paragraphs: [
          "Useful collaboration is not only about keeping people busy or creating more status updates. It also means making the context behind a project visible, recording important decisions, and giving people a clear place to contribute their ideas.",
          "When the reasoning behind a decision stays hidden in a conversation, teammates may struggle to understand it later. A shared document can hold that context close to the work so that people can return to it when questions come up.",
        ],
      },
      {
        title: "Write things down while they are useful",
        paragraphs: [
          "Meeting notes, project briefs, and team guides are valuable when they preserve the information someone will need afterward. They should explain what was decided, why it matters, and what needs to happen next.",
          "Keep the writing focused on the reader's needs. A short explanation with a clear heading may be more useful than a long passage full of details that do not affect the decision or task at hand.",
        ],
        bullets: [
          "Capture decisions while the context is still fresh.",
          "Make ownership and next steps explicit.",
          "Update shared documents when the plan changes.",
          "Ask the people closest to the work to review important information.",
        ],
      },
      {
        title: "Build habits that fit your team",
        paragraphs: [
          "Every team works differently. Begin with one document that solves a real problem, pay attention to what makes it useful, and improve the structure as people use it.",
          "There are no published blog posts to browse yet. For now, the documentation and guides provide practical material for creating, sharing, and maintaining team documents.",
        ],
      },
    ],
    related: [LINKS.guides, LINKS.teamWikis, LINKS.meetingNotes],
  },
  {
    href: LINKS.privacy,
    title: "Privacy at Synodos",
    eyebrow: "Company",
    description:
      "Synodos uses account, document, and collaboration information to provide its core features. This page explains those uses at a general level and offers guidance for handling sensitive information responsibly.",
    sections: [
      {
        title: "Account and sign-in information",
        paragraphs: [
          "Synodos maintains account information such as a user's display name and email address so the application can identify the account associated with a session. The application also maintains session information to support authenticated access.",
          "Profile details appear within the app, and a user's display name can be updated through the profile interface. Keep account information current enough for teammates to recognize who they are working with.",
          "This overview describes the account-related information visible in the application and its supporting code. It should not be treated as a complete legal privacy policy or as a guarantee about every aspect of the deployment's data handling.",
        ],
      },
      {
        title: "Documents and collaboration",
        paragraphs: [
          "Synodos stores document content so authorized members can continue working on it. The application also stores document membership and invitation information to determine who has access, along with version snapshots that support the history and restore features.",
          "Collaboration features use presence information to show who is online and where teammates are working. Profile and editor preferences also control parts of the user experience, including the appearance theme and the way collaboration activity is presented.",
          "Because documents may contain information intended for a particular audience, review member roles before inviting others. Do not assume a link alone grants the necessary access, and avoid putting confidential material into a demo project unless you have confirmed it is appropriate for your use.",
        ],
        bullets: [
          "Invite only people who should have access to the document.",
          "Choose roles according to each collaborator's responsibilities.",
          "Review membership when access is no longer needed.",
          "Do not share passwords, access tokens, or private document contents in public reports.",
        ],
      },
      {
        title: "Questions about privacy",
        paragraphs: [
          "If you have a question about how the demo application handles account or document information, contact the project maintainer through the published contact details or repository.",
          "When reporting a concern publicly, describe the issue without including private account information, passwords, access tokens, or document contents. Share only the details needed to explain the problem.",
          "Synodos is a demo project. For information about a particular deployment, its configuration, or its data-handling practices, those details need to be checked with the people responsible for that deployment.",
        ],
      },
    ],
    related: [LINKS.contact, LINKS.documentation, LINKS.share],
  },
  {
    href: LINKS.contact,
    title: "Get in touch",
    eyebrow: "Company",
    description:
      "Have a question, found a problem, or want to suggest an improvement? Contact the Synodos project maintainer or use the GitHub repository to share clear, actionable feedback.",
    sections: [
      {
        title: "Share a question or suggestion",
        paragraphs: [
          "Explain what you are trying to do and what information would help you move forward. If you have an idea for improving the app, describe the problem it would solve and how the change might help the people using Synodos.",
          "Specific context makes feedback easier to understand. Include the part of the application you were using, what you expected to happen, and what you observed instead when those details are relevant.",
          "The goal is to make the issue or suggestion understandable without requiring someone else to guess what you meant. Keep the message focused on the behavior or improvement you want to discuss.",
        ],
      },
      {
        title: "Report a bug",
        paragraphs: [
          "When something does not work as expected, describe the steps that led to the problem. Explain what you expected to happen and what actually happened. If the issue is intermittent, mention that rather than presenting it as something that happens every time.",
          "Include the browser you were using and a relevant screenshot when either would help explain the problem. For document or collaboration issues, describe the action you were performing and any visible error message that appeared.",
          "Before sharing a screenshot or writing a public issue, check it for sensitive information. Remove private document content, passwords, access tokens, and other details that should not be made public.",
        ],
        bullets: [
          "Describe what you were trying to do.",
          "List the steps that reproduce the issue.",
          "Explain the expected result and the actual result.",
          "Include useful browser details or screenshots when relevant.",
          "Remove private or sensitive information before sharing.",
        ],
      },
      {
        title: "Reach the project",
        paragraphs: [
          "You can email the project maintainer using the address provided on the Contact page, or visit the Synodos GitHub repository to explore the code and report an issue.",
          "Synodos is a demo project, so support response times and ongoing availability are not guaranteed. When sharing feedback, provide enough detail to make the problem understandable while keeping private information out of the report.",
          "For code-related feedback, the repository is a useful place to explain what needs improvement and give the project maintainer the context needed to review it.",
        ],
      },
    ],
    related: [LINKS.github, LINKS.documentation, LINKS.guides],
  },
];

export const DOCS_NAV: readonly DocsNavGroup[] = [
  {
    label: "Features",
    items: [
      { label: "Collaboration", href: LINKS.seeHow },
      { label: "Real-time editing", href: LINKS.realtimeEditing },
      { label: "Rich-text editor", href: LINKS.richText },
      { label: "Version history", href: LINKS.versionHistory },
      { label: "Sharing", href: LINKS.share },
    ],
  },
  {
    label: "Use cases",
    items: [
      { label: "Team wikis", href: LINKS.teamWikis },
      { label: "Meeting notes", href: LINKS.meetingNotes },
      { label: "Product specs", href: LINKS.productSpecs },
      { label: "Content teams", href: LINKS.contentTeams },
    ],
  },
];

export const LEARN_PAGES = DOCS_PAGES.filter(
  (page) =>
    page.href !== LINKS.documentation &&
    page.href !== LINKS.guides &&
    page.href !== LINKS.blog &&
    page.href !== LINKS.contact,
);
