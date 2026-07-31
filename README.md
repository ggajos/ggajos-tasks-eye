# Tasks Eye

Tasks Eye is an Obsidian plugin that helps you track what to do next across your notes. 
Instead of a giant list of tasks, Tasks Eye treats your notes as projects or work items, and surfaces the next actionable task for each one. 

Your Markdown notes and Obsidian Tasks checkboxes remain the source of truth.

## Core Features

Tasks Eye gives you three main views to manage your work:

- **Focus**: Shows tasks due today or overdue. This is your daily dashboard for tasks that need immediate attention.
- **Open**: Shows all your active notes and their next tasks grouped by due date, helping you plan ahead.
- **Inbox**: Highlights notes that are missing metadata (e.g. not in a context folder, missing a due date, or having no unchecked tasks) so you can fix them.

## How it works

1. **Create a note** using the **Tasks Eye: Create note** command and put it in a context folder (e.g., `Tasks/Work/` or `Tasks/Private/`).
2. **Add a task** to the note using the Obsidian Tasks format with a scheduled or due date:

```md
# Renew passport

- [ ] Find the required documents 📅 2026-08-03
- [ ] Take a compliant photo
- [ ] Submit the application
```

3. Tasks Eye will automatically surface the **first unchecked dated task** from that note in your Focus or Open views, depending on the date.

## Requirements

Tasks Eye requires Obsidian 1.12.7 or newer and the
[Tasks](https://obsidian.md/plugins?id=obsidian-tasks-plugin) community plugin.

## Documentation and Workflows

For full feature documentation, commands, and optional workflow guides (such as using Tasks Eye for GTD), visit the [Tasks Eye Documentation](https://ggajos.com/ggajos-tasks-eye/).

## Network use

Public-holiday support optionally connects to the
[Nager.Date API](https://date.nager.at/) to request its supported country list
and, after you select a country, nationwide holiday dates for the relevant
years. Tasks Eye does not send note or vault content. Downloaded holiday data
is cached locally in the plugin settings.
