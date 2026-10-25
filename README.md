<p align="center">
  <img src="assets/images/main-logo.png" alt="Synodos Logo" width="700" />
</p>
<p align="center">
  <a href="https://github.com/Subhajeetch/synodos/commits/main"><img src="https://img.shields.io/github/last-commit/Subhajeetch/synodos?style=flat-square&color=3B82F6" alt="Last Commit" /></a>
  <a href="https://discord.com/invite/6DhssCN2Ph"><img src="https://img.shields.io/badge/Discord-Join%20Chat-5865F2?style=flat-square&logo=discord&logoColor=white" alt="Discord" /></a>
  <a href="https://turbo.build/repo"><img src="https://img.shields.io/badge/Turborepo-EF4444?style=flat-square&logo=turborepo&logoColor=white" alt="Turborepo" /></a>
  <a href="https://fastify.dev/"><img src="https://img.shields.io/badge/Fastify-000000?style=flat-square&logo=fastify&logoColor=white" alt="Fastify" /></a>
  <a href="https://redis.io/"><img src="https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white" alt="Redis" /></a>
  <a href="https://tiptap.dev/docs/hocuspocus/introduction"><img src="https://img.shields.io/badge/Hocuspocus-2563EB?style=flat-square&logo=socketdotio&logoColor=white" alt="Hocuspocus" /></a>
  <a href="https://tiptap.dev/"><img src="https://img.shields.io/badge/Tiptap-000000?style=flat-square&logo=tiptap&logoColor=white" alt="Tiptap" /></a>
  <a href="https://www.postgresql.org/"><img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL" /></a>
</p>

---

## About

Synodos is an open-source, real-time collaborative document editor for teams. It provides a fast, shared space where teammates can write, format text, and organize ideas together in the browser. Synodos is built for creators, product squads, and developers who need instant teamwork without distractions.

> **Live Demo:** [synodos.pages.dev](https://synodos.pages.dev)

### What's inside

Synodos is arranged as a monorepo (one repository holding several related apps):

- **`apps/web`**: The React user interface where you create documents and write with teammates.
- **`apps/api`**: The Fastify server that manages user accounts, permissions, and database records.
- **`apps/collab`**: The WebSocket server that broadcasts live edits and cursor positions across all active users.

---

## Demo Video

Watch the demo video to see Synodos in action:  
https://youtu.be/ausL8Qs1C-g

---

## Screenshots

![Synodos Document Editor](assets/images/screenshot-1.png)
![Synodos Document Editor In Action](assets/images/synodos-demo.gif)

<details>
<summary><b>Click to view more screenshots</b></summary>
<br />

|                      Landing Page                       |                         Document Overview                          |
| :-----------------------------------------------------: | :----------------------------------------------------------------: |
| ![Landing Page Preview](assets/images/screenshot-2.png) | ![Document Overview and Dashboard](assets/images/screenshot-3.png) |

|                     Dark Mode Editor                     |                       Version History                       |
| :------------------------------------------------------: | :---------------------------------------------------------: |
| ![Dark Mode Editor View](assets/images/screenshot-4.png) | ![Document Version History](assets/images/screenshot-5.png) |

|                              Dashboard                               |
| :------------------------------------------------------------------: |
| ![User Profile and Account Settings](assets/images/screenshot-6.png) |

</details>

---

## Getting Started

To install Synodos and run it on your computer, check out our step-by-step setup guide:

👉 **[Read the Usage Guide (docs/USAGE.md)](docs/USAGE.md)**

### App Guides

- **Web Frontend**: [apps/web README](apps/web/README.md)
- **API Backend**: `apps/api` does not have its own README yet. Everything you need to run it is covered in the [Usage Guide](docs/USAGE.md).
- **Collab Server**: `apps/collab` does not have its own README yet. Everything you need to run it is covered in the [Usage Guide](docs/USAGE.md).

---

## Contributing

We welcome contributions of all kinds, including bug fixes, design improvements, and documentation help!

Please read our **[Contributing Guide (docs/CONTRIBUTING.md)](docs/CONTRIBUTING.md)** to learn how to set up your environment, write good commit messages, and open a pull request.

---

## Support

If you find Synodos helpful or exciting, please consider giving this repository a star ⭐ on GitHub!

- Follow updates on X: [@subhajeetch](https://x.com/subhajeetch)
- Join our community on Discord: [Join Chat](https://discord.com/invite/6DhssCN2Ph)

---

## License

Synodos is free and open-source software released under the [MIT License](LICENSE).
