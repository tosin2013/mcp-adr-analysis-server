# GitHub Support Request: Remove Sensitive Data

**Repository**: tosin2013/mcp-adr-analysis-server  
**Type**: Sensitive data removal (API key)  
**Date**: 2025-11-24

## Summary

An OpenRouter API key was accidentally committed to `playbooks/VAULT_SETUP.md` and has been removed from git history using `git-filter-repo --sensitive-data-removal`. The secret has been rotated/revoked.

## Affected Pull Requests

- **Number of affected PRs**: 0 (no PRs need to be dereferenced)
- All PR refs failed to push (expected - GitHub marks them as read-only)

## First Changed Commit(s)

The following commits were the first to be modified by git-filter-repo (old → new):

```
1cc293ce8f7f1f4c7408c184be96c0d51e6b215e → fa7df25cc54cebaf53e32fe00d2366be5bde4ffa
2b17b02711ffb089971d70a9dbf603a33ee4ac6a → 7d60646194bd6149884b3ddc889ca4e22925e596
446ebe6ddd5b5c1b55df0d808dbab0f8376ae9d0 → 7e2d682203f00fc762ac245782b60f0593d2c9d2
5bda07a9946f1daef11d712bc98403ff9faabd5b → ae404a3538c145f8c4545814fd0e9a783d970302
5c802add2970d7054e7b8c6290cf038d58772471 → b29c8c29fff6e11a67f72648c968b3702547c948
637568475a327f725186f271aa81581b683dbe92 → 50ae37d997f7ff76953e22ebdd84ac748d61acc7
6579b53c0da886f354483490f9abd193e42a85e0 → 8d44a0c6fc07edbfb27b9cbbb2e8965d4bc59f59
ca22a20391e997240787e92276e8f8a3160d654c → d9f0290ee0d32e75e6a82f26d28ff10068cefeb3
e282c9144261241a38f1092166cb5ad135e33169 → ae3b19429a14fbfc93139ae29f6a939f8de15e16
feee00bcd359fc1727ea7955d289ca99f7e8be65 → 8dec63c6ef032312f12c67e3aa0af448b04e9050
ff50b7f50f6c1c2b87651c123b141d781251cd54 → e2a4035e218fbf10ef391ef2cee22d387f855316
```

## Sensitive Data Details

- **Type**: OpenRouter API Key
- **Pattern**: `sk-or-v1-*` (64-character hex string)
- **Location**: `playbooks/VAULT_SETUP.md`
- **Status**: ✅ Secret has been rotated/revoked in OpenRouter
- **Note**: Actual key value removed for security - GitHub Support can reference commit `f681d2931e764205da54c1a1dfb0c5c3cec90a83` to see the original

## Actions Completed

1. ✅ Used `git-filter-repo --sensitive-data-removal --replace-text` to rewrite history
2. ✅ Replaced secret with placeholder (`sk-or-v1-your-api-key-here`) in all commits
3. ✅ Verified secret removed from all commits (0 occurrences found)
4. ✅ Force pushed cleaned history to GitHub using `git push --force --mirror origin`
5. ✅ Updated all branches and tags (main branch and 30+ version tags)
6. ✅ Added `playbooks/vault.yml` to `.gitignore` to prevent future commits

## Verification

- ✅ Secret not found in current codebase
- ✅ Secret not found in git history (0 commits contain it)
- ✅ 0 pull requests affected
- ✅ All branches and tags updated successfully

## Requested Actions from GitHub Support

Please assist with:

1. **Run garbage collection** on the repository to expunge the sensitive data from storage
2. **Remove cached views** of old commits (specifically commit `f681d29` which is still accessible via direct URL)
3. **Dereference any PRs** that may reference the old commits (though we found 0 affected PRs)
4. **Ensure commit `f681d2931e764205da54c1a1dfb0c5c3cec90a83` is no longer accessible** via direct commit hash URLs

## Additional Context

- The secret was in an example/documentation file (`playbooks/VAULT_SETUP.md`)
- The file has been updated with placeholder text
- All collaborators will need to re-clone or follow git-filter-repo cleanup steps
- The API key has been rotated/revoked in OpenRouter

## Reference

Following official GitHub documentation:  
https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository
