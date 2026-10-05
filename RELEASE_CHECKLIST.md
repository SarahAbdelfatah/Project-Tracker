# Phase 6 release checklist

Record the app version, operating system, and starting project count before running destructive recovery tests. Export a backup first.

## Automated verification

- [ ] `npm test` passes save-queue, validation, backup rotation, failed-write recovery, malformed-primary fallback, and import/export round-trip tests.
- [ ] `npm run build` completes without warnings or errors that affect release.
- [ ] `git diff --check` reports no whitespace errors.

## Saving and recovery

- [ ] Make a normal edit, wait for **Saved locally**, restart, and confirm the edit remains.
- [ ] Make several consecutive edits quickly, restart, and confirm the last value remains.
- [ ] Export a backup, change data, import the backup, and confirm project count, IDs, requirements, inputs, BOM rows, workflow details, and activity are restored.
- [ ] Force-close the app immediately after an edit, reopen it, and confirm the tracker opens with the last fully saved state.
- [ ] With a safe exported backup available, corrupt only the main local data file, reopen, and confirm the newest valid rotating backup is restored.
- [ ] Corrupt the main file and every rotating backup, reopen, and confirm the recovery screen appears without silently creating an empty tracker.
- [ ] From the recovery screen, import the safe backup and confirm all projects return.
- [ ] Compare dashboard project count and project IDs before and after migration; confirm no existing project was lost.

## Display and core flows

- [ ] In light mode at desktop width, test create, edit, search, filter, open project, update details, BOM, inputs, and status controls.
- [ ] Repeat the core flows in dark mode.
- [ ] Repeat at a narrow window width and confirm content remains reachable without overlapping controls.
- [ ] Confirm the timeline inner area scrolls without moving the whole page until its own end is reached.

## Keyboard and accessibility

- [ ] Open each dialog with the keyboard, cycle forward and backward with `Tab`, and confirm focus stays inside.
- [ ] Press `Escape` in each dismissible dialog and confirm focus returns to the control that opened it.
- [ ] Edit direct fields using only the keyboard.
- [ ] Navigate filter menus with Arrow keys, `Home`, `End`, `Enter`, and `Escape`.
- [ ] Activate and complete an eligible timeline item using the keyboard; confirm unavailable future items cannot be changed.
- [ ] Delete a BOM row and a project input using keyboard focus.
- [ ] Open project deletion, verify the warning is announced as an alert dialog, cancel once, then confirm deletion on a disposable project.

