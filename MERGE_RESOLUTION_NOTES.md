# Merge Conflict Resolution Notes

These notes describe how to resolve merge conflicts when you pull the latest GitHub version (which only contains the original README) into this branch that introduces the full application.

## README.md

Use the table below whenever the README shows conflicts. The "Incoming" column refers to the version from this repository.

| Section | What to keep | Reason |
| --- | --- | --- |
| Top-level heading (`# Mik-Management`) | **Accept Incoming** | Preserves the canonical project name and matches GitHub. |
| Table of Contents and "Project Structure" | **Accept Incoming** | Keeps links to Ubuntu, Nginx, and Git workflow guidance. |
| "Prerequisites" and "Installing Node.js and npm on Ubuntu" | **Accept Incoming** | Retains the Node.js setup steps that align with the deployment scripts. |
| "Getting Started" through "Troubleshooting" (including "Updating an Existing Installation") | **Accept Incoming** | Ensures the deployment, update, conflict, and npm error fixes remain available. |
| Any new blank lines introduced by Git | **Accept Incoming** (or manually delete) | Prevents duplicate spacing when merging. |

There are no sections that require **Accept Both** with the current GitHub upstream. If future upstream changes add content you want to keep, resolve section by section and prefer incoming unless the upstream text introduces new requirements.

## Newly added files
All files under `backend/` and `frontend/` are new in this branch and do not exist upstream. Stage them as new files (no conflict markers should appear). If your tool still flags them, mark them as **Accept Incoming**.

## General workflow
1. Run `git pull --rebase` to bring in the upstream changes.
2. Resolve any conflicts as described above.
3. Verify that `git status` shows no remaining conflict markers.
4. Commit the merge and push your branch.

This keeps the deployed application and documentation in sync with the repository on GitHub.
