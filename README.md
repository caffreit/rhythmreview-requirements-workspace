# RhythmReview Requirements Workspace

A standalone Blue Bridge demonstration of discovery-to-requirements work for a fictional software as a medical device project. AI proposes content inside typed records; named human roles edit, reject, defer, disposition, submit, and approve it.

The project is intentionally independent from `Compliance_demo`. The only handoff is the frozen `UN-001` through `UN-008` and `REQ-001` through `REQ-016` identifier and wording contract.

## Run locally

Requirements: Node.js 22.13 or later.

```bash
npm install
npm run dev
```

Replay mode is deterministic and does not require an API key. To enable optional live extraction and drafting, copy `.env.example` to `.env.local` and provide an OpenAI API key.

## Verification

```bash
npm test
npm run verify:demo
npm run typecheck
npm run lint
npm run build
```

The guided verifier exercises the complete replay path from the reset seed to an immutable QA-approved baseline.

## Design boundary

- Five fictional source records remain read only.
- AI originals and human versions are stored separately.
- Workflow operations are enforced in both the interface and service layer.
- Rejected or deferred discovery candidates do not create accepted derivation links.
- Only Jamie Chen, the separate QA reviewer, can approve a submitted candidate.
- Reset restores the fictional source pack and removes presentation activity.
