# Merge Conflict Resolution Notes

These notes describe how to resolve merge conflicts when you pull the latest GitHub version (which only contains the original README) into this branch that introduces the full application.

## README.md
- Choose **Accept Incoming** for the entire conflict block. The incoming content includes the full deployment instructions and keeps the original heading `# Mik-Management`.
- There are no sections where you need "Accept Both" after this update. If your editor still shows isolated conflicts for blank lines, prefer the incoming version.

## Newly added files
All files under `backend/` and `frontend/` are new in this branch and do not exist upstream. Stage them as new files (no conflict markers should appear). If your tool still flags them, mark them as **Accept Incoming**.

## General workflow
1. Run `git pull --rebase` to bring in the upstream changes.
2. Resolve any conflicts as described above.
3. Verify that `git status` shows no remaining conflict markers.
4. Commit the merge and push your branch.

This keeps the deployed application and documentation in sync with the repository on GitHub.
