const updated = (await res.json()) as MediationCase;
setCaseData(updated);
setLocalStatus(updated.status);
setLocalNotes(updated.notes ?? "");
setCaseSaveSuccess(true);

// Ensure server-rendered pages (like /dashboard) don't show stale cached data after mutations.
router.refresh();

// Optional: warm the dashboard route so if the user clicks there next, it fetches fresh.
router.prefetch("/dashboard");