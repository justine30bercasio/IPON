---

description: Run the IPON independent security, financial, architecture, UI/UX, and verification review.
agent: ipon-main
subagent: false
---------------

Review the current IPON implementation/change.

Do not immediately modify code.

First determine which specialist reviews are required.

For financial changes, use @ipon-finance.

For security-sensitive changes, use @ipon-security.

For architecture/database changes, use @ipon-architect.

For UI/UX changes, use @ipon-uiux.

After specialist reviews are complete:

1. Summarize findings.
2. Fix verified issues.
3. Run @ipon-verify.
4. Do not claim PASS without evidence.
5. Report:

   * changed files
   * specialist findings
   * fixes
   * tests executed
   * verification status
   * remaining risks
