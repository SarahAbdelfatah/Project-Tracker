# Project Tracker user guide

## Saving and recovery

Changes save automatically on this computer. The header shows **Saving…**, **Saved locally**, or **Save failed** so you can see the current state.

The desktop app keeps the current tracker file plus three rotating local backups. If the current file is damaged, the app tries the newest valid backup automatically and preserves the damaged file for investigation. If no valid copy can be read, the recovery screen lets you import an exported backup or deliberately start a clean tracker.

## Portable backups

Open **Data & backups** from the gear icon in the header.

- **Export backup** saves a readable JSON copy that can be stored elsewhere.
- **Import backup** validates a selected JSON backup before replacing the local tracker.

Export before major data changes or before moving the tracker to another computer.

## Finding projects

Use the dashboard search for a project name, client, OPID, requirement, BOM content, or recorded evidence. The **Filters** dialog supports focus views, state, workflow stage, bidding group, client, input coverage, content, update age, and sorting. **Clear all** returns to the default project list.

## Theme

Use the sun or moon icon in the header to switch between light and dark mode. The selection is saved with the tracker preferences.

## Project status progression

Open a project and use its status timeline. The active workflow item can be completed; the next eligible item can then be activated. Future items stay unavailable until their predecessor is complete. Use **Add specs…** or **Edit specs…** on an available item to record its date and supporting notes.

## Keyboard basics

- Use `Tab` and `Shift+Tab` to move through controls and dialogs.
- Use `Enter` or `Space` to activate focused buttons and editable previews.
- Use arrow keys in filter menus and on BOM column-resize handles.
- Use `Escape` to close a dismissible dialog.
- On a project detail page, press `Backspace` outside an input or dialog to return to all projects.

