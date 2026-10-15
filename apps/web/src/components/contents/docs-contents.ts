export interface ResourceSection {
  id: string;
  title: string;
  description: string;
  paragraphs: readonly string[];
  bullets?: readonly string[];
}

export interface Guide {
  title: string;
  category: string;
  description: string;
  steps: readonly string[];
}

export const DOCS_CONTENT = {
  title: "Synodos documentation",
  description:
    "Learn how to create documents, use the editor, collaborate with teammates, manage document access, review previous versions, and organize your work. These guides explain the available tools and how to use them in everyday situations.",
  sections: [
    {
      id: "getting-started",
      title: "Getting started",
      description:
        "Create your first document, give it a clear purpose, and prepare it for the people who will work with you.",
      paragraphs: [
        "Sign in to Synodos and open your dashboard to see your documents. Create a new document and give it a title that explains what you intend to use it for. For example, you might name it after a project, a meeting, a product idea, or a set of instructions. A useful title makes the document easier to recognize later.",
        "Before adding too much detail, think about who will read the document and what they need to understand. Start with a short introduction, explain the main idea, and organize the content into sections. You do not need to make the first draft perfect. The important thing is to give yourself and your teammates a clear starting point.",
        "When other people need to contribute, invite them through the document's sharing controls. Choose the appropriate access role and make sure the people involved understand what the document is for. You can then develop the content together instead of collecting separate copies and trying to combine them later.",
      ],
      bullets: [
        "Create a document from your dashboard and choose a descriptive title.",
        "Explain the purpose of the document near the beginning.",
        "Use headings and lists to organize information as it grows.",
        "Invite teammates who need to read or edit the document.",
      ],
    },
    {
      id: "editor",
      title: "Using the editor",
      description:
        "Write, format, and organize your content with the rich-text tools available in the document editor.",
      paragraphs: [
        "Open a document and click into the writing area to begin. The editor is designed for more than plain text: you can create headings and paragraphs, emphasize important words, add links, insert quotes, and organize information into different types of lists. Most formatting options are available through the toolbar, so you can focus on writing before adjusting how the content looks.",
        "Choose formatting that helps explain the information rather than adding decoration without a purpose. Headings divide a long document into manageable sections. Numbered lists work well when order matters, while bullet lists are useful for related points. Task lists make individual items easier to identify and check off. Tables help readers compare information, and code blocks make technical examples easier to distinguish from regular text.",
        "The editor also supports text alignment, font styling, highlighting, and images. For a document with several distinct parts, you can organize the content into pages. Pages can have their own titles, and you can add, duplicate, move, or remove them when your document structure changes. This is useful when a single document needs to hold several related topics without becoming difficult to navigate.",
      ],
      bullets: [
        "Use headings, paragraphs, bold text, italics, underlining, and highlighting to make information easier to understand.",
        "Create bullet lists, numbered lists, and task lists for different kinds of content.",
        "Insert links, quotes, images, tables, and code blocks where they help explain an idea.",
        "Adjust text alignment and other formatting through the editor toolbar.",
        "Use document pages to separate related sections into a clearer structure.",
      ],
    },
    {
      id: "collaboration",
      title: "Collaborating in real time",
      description:
        "Work in the same document as your teammates and use the editor's presence indicators to coordinate your work.",
      paragraphs: [
        "Synodos lets multiple authorized people work on a shared document. When collaborators make changes, the editor synchronizes those changes through its live collaboration connection. Everyone can work from the shared document rather than creating separate drafts and trying to work out which copy contains the latest edits.",
        "The editor also shows collaborator presence. You can see who is online and use their visible cursors to understand where they are working. These signals are especially useful when several people are reviewing the same paragraph or making changes to different parts of a longer document.",
        "A shared editor does not remove the need for good communication. Agree on the document's purpose, make important decisions clear in the text, and let teammates know when a substantial change needs their attention. If the editor reports a connection or synchronization problem, check that status instead of assuming a new change has already reached everyone.",
      ],
      bullets: [
        "Work from one shared document rather than exchanging separate drafts.",
        "Check collaborator presence to see who is working in the document.",
        "Use visible cursors to follow where teammates are editing.",
        "Write important decisions and next steps into the document itself.",
        "Pay attention to connection or synchronization warnings.",
      ],
    },
    {
      id: "sharing",
      title: "Sharing and access",
      description:
        "Invite the right people to a document and give each collaborator the access they need to do their work.",
      paragraphs: [
        "Document sharing is managed through the document's own access controls. The owner can invite a person by email and choose a role for that person. An invitation is tied to the document, and the invited person must accept it before joining as a member. Sending someone a document address alone should not be treated as a substitute for granting access.",
        "Synodos has three document roles: Owner, Editor, and Viewer. The owner manages the document's membership and has the highest level of control. Editors can change the document's content, while viewers can read the document without editing it. Choosing the right role helps people contribute without giving everyone the same permissions.",
        "Teams change over time, so review membership when someone joins a project, changes responsibilities, or no longer needs access. If a person cannot open a document, access may need to be granted by the owner. Keep the intended audience in mind whenever you share document information outside its existing membership.",
      ],
      bullets: [
        "Invite collaborators by email through the document's sharing controls.",
        "Use Owner, Editor, and Viewer roles to distinguish responsibilities.",
        "Remember that viewers can read but cannot edit document content.",
        "Ask the owner to review access when a teammate needs permission.",
        "Remove or change access when a person's responsibilities change.",
      ],
    },
    {
      id: "history",
      title: "Version history",
      description:
        "Review saved document snapshots, create named checkpoints, and return to an earlier version when necessary.",
      paragraphs: [
        "Documents often change substantially as people discuss ideas, review drafts, and make decisions. Version history helps you look back at saved snapshots instead of relying entirely on memory or keeping multiple manual copies. Each entry includes information such as when the version was created and who created it, making it easier to find a useful point in the document's history.",
        "Synodos creates automatic snapshots as your team edits. You can also name an important version to mark a milestone, such as the point before a major rewrite or the completion of an outline. A descriptive name makes that checkpoint easier to recognize when you return to it later.",
        "When you select a historical version, you can preview it and move between available versions to inspect their content. Restoring a version changes the current document to match the selected snapshot, so the decision affects everyone working on that document. Only the document owner can perform a restore. Synodos also saves the current content before restoration, giving the team a way to revisit the state that existed immediately beforehand.",
      ],
      bullets: [
        "Browse saved snapshots to understand how a document has changed.",
        "Preview an earlier version before deciding what to do with it.",
        "Give important checkpoints meaningful names.",
        "Use the restore action carefully because it changes the current document.",
        "Ask the document owner to restore a historical version when necessary.",
      ],
    },
    {
      id: "account-and-preferences",
      title: "Account and preferences",
      description:
        "Update your display name, choose an interface theme, and adjust the collaboration notifications shown in your editor.",
      paragraphs: [
        "Your profile contains your display name and account email address. You can edit your display name from the profile area, and the name is used across your account. The email address is displayed as account information. Keep your profile details recognizable so teammates can identify you when they work with you.",
        "Synodos provides Light, Dark, and System appearance options. Choose Light or Dark to use the corresponding interface theme, or choose System to follow your device's appearance preference. Pick the option that is most comfortable for your working environment.",
        "Editor settings let you control how collaboration activity is presented. You can enable or disable sounds and pop-up notifications, adjust sound volume, decide whether collaborator cursors should always remain visible, and choose which notification categories you want to receive. These preferences are saved in your browser and can be accessed from the settings area or the document sidebar.",
      ],
      bullets: [
        "Update your display name from your profile.",
        "Choose Light, Dark, or System appearance.",
        "Turn collaboration sounds and pop-up notifications on or off.",
        "Adjust presence, access, and system notification preferences.",
        "Set sound volume and control the visibility of collaborator cursors.",
      ],
    },
  ] satisfies readonly ResourceSection[],
} as const;

export const GUIDES_CONTENT = {
  title: "Practical guides for better team documents",
  description:
    "Detailed, practical advice for common writing and collaboration tasks. Learn how to create useful meeting notes, maintain team knowledge, prepare product specifications, and review shared drafts with less confusion.",
  guides: [
    {
      title: "Write meeting notes people can use",
      category: "Meetings",
      description:
        "Turn a conversation into a clear record of decisions, unanswered questions, responsibilities, and next steps. Good meeting notes help everyone understand what happened and what needs to happen afterward.",
      steps: [
        "Start with the purpose of the meeting. Add a short agenda so participants know what needs to be discussed and which questions the group needs to answer.",
        "Record important decisions next to the topic they relate to. Separate confirmed decisions from ideas that are still being discussed or questions that do not yet have an answer.",
        "Write action items as specific tasks. Where possible, identify who is responsible, what they need to do, and what the next step should be.",
        "Share the notes with participants while the discussion is still fresh. Update the document if a decision changes or if the team needs to clarify an action item later.",
      ],
    },
    {
      title: "Build a team wiki that stays current",
      category: "Knowledge",
      description:
        "Create a shared collection of useful information that teammates can understand, contribute to, and revisit when they need an answer or want to follow a process.",
      steps: [
        "Begin with real questions people ask repeatedly. Examples include how a common process works, where a decision came from, or what someone needs to know before starting a task.",
        "Give each document one main purpose and a descriptive title. Put related information together, explain unfamiliar terms, and arrange instructions in the order a reader will use them.",
        "Ask the people closest to a process to review its documentation. They are often best placed to notice missing steps, outdated instructions, or assumptions that need explaining.",
        "Build a habit of reviewing important pages when the work changes. Update the existing document with the new information so teammates are not left choosing between conflicting instructions.",
      ],
    },
    {
      title: "Draft a product spec together",
      category: "Product",
      description:
        "Bring the problem, requirements, assumptions, and decisions into one shared document so the team can understand the plan and review it before moving forward.",
      steps: [
        "Describe the user problem, who experiences it, and the outcome the team wants. A clear problem statement gives everyone a common reason for the work.",
        "Separate requirements from non-goals, assumptions, and unresolved questions. Explain the expected behavior and include relevant edge cases when they affect the design or implementation.",
        "Invite the teammates who need to review the plan, including relevant product, design, and engineering partners. Ask for feedback on specific questions rather than requesting an unfocused review.",
        "Record the decisions the team makes and update the spec when the plan changes. A useful specification reflects the current direction while leaving enough context to understand how the team reached it.",
      ],
    },
    {
      title: "Run a focused document review",
      category: "Collaboration",
      description:
        "Make it easier for reviewers to give useful feedback and for the author to turn that feedback into clear, agreed-upon changes.",
      steps: [
        "Explain what you want reviewers to focus on. For example, ask them to check factual accuracy, missing details, clarity, or whether the draft answers the intended question.",
        "Ask reviewers to identify the particular section or passage they are discussing and explain their concern. Specific feedback is easier to understand and act on than a general request to improve the document.",
        "Work through questions with the people involved. Separate changes the team has agreed to make from suggestions that still need discussion, then update the draft to reflect the decisions.",
        "Use version history when you need to revisit an earlier direction. A named checkpoint can help preserve an important stage of the work before a substantial revision.",
      ],
    },
  ] satisfies readonly Guide[],
} as const;

export const BLOG_CONTENT = {
  title: "Notes on working together",
  description:
    "Read blog posts about writing, collaboration, and team productivity. Learn how to create better documents, communicate more clearly, and work together with less confusion.",
} as const;

export const CONTACT_CONTENT = {
  title: "Contact the Synodos project",
  description:
    "Have a question, spotted a bug, or thought of an improvement? Send a message to the project maintainer or visit the GitHub repository to explore the code and report an issue.",
  email: "subhajeetchx@gmail.com",
  github: "https://github.com/Subhajeetch/synodos",
  note: "Synodos is a demo project, so replies and ongoing support are not guaranteed. When reporting an issue, describe what happened and how to reproduce it. Please do not send passwords, access tokens, or private document contents.",
} as const;
