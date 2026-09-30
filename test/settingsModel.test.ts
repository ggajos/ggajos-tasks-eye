import { describe, expect, it, vi } from "vitest";
import {
  defaultSettings,
  normalizeSettings,
  SettingsModel,
} from "../src/settingsModel";
import type { EyeSettings } from "../src/types";

function harness(
  initial: Partial<EyeSettings> = {},
  folders: readonly string[] = ["Notes", "Notes/Archive", "Other"],
) {
  const settings: EyeSettings = { ...defaultSettings(), ...initial };
  settings.notesFolderPath = initial.notesFolderPath ?? "Notes";
  const host = {
    settings: () => settings,
    persist: vi.fn(async () => undefined),
    changed: vi.fn(async () => undefined),
    folderExists: (path: string) => folders.includes(path),
  };
  return { model: new SettingsModel(host, () => 1_000), host, settings };
}

describe("Settings model", () => {
  it("normalizes unknown saved data to defaults", () => {
    expect(normalizeSettings(null)).toEqual(defaultSettings());
    expect(
      normalizeSettings({ mode: "nope", contextFilter: "" }),
    ).toMatchObject({ mode: defaultSettings().mode, contextFilter: "*" });
  });

  it("resets the context filter and refreshes when the notes folder moves", async () => {
    const { model, host, settings } = harness({ contextFilter: "Work" });
    await model.setNotesFolderPath("Other/");

    expect(settings.notesFolderPath).toBe("Other");
    expect(settings.contextFilter).toBe("*");
    expect(host.persist).toHaveBeenCalledOnce();
    expect(host.changed).toHaveBeenCalledOnce();
  });

  it("rejects a notes folder hidden by an exclusion", async () => {
    const { model } = harness({ excludedFolderPaths: ["Notes/Archive"] });
    await expect(model.setNotesFolderPath("Notes/Archive")).rejects.toThrow();
    expect(model.notesFolderSettingError("Notes/Archive")).not.toBeNull();
    expect(model.notesFolderSettingError("Missing")).toMatch(/Missing/);
  });

  it("only saves a blank excluded row, but refreshes once it has a path", async () => {
    const { model, host, settings } = harness({ contextFilter: "Work" });
    await model.addExcludedFolder();
    expect(host.changed).not.toHaveBeenCalled();

    await model.setExcludedFolder(0, "Notes/Archive/");
    expect(settings.excludedFolderPaths).toEqual(["Notes/Archive"]);
    expect(settings.contextFilter).toBe("*");
    expect(host.changed).toHaveBeenCalledOnce();
    expect(model.excludedFolderExists("Notes/Archive")).toBe(true);

    await expect(model.setExcludedFolder(3, "x")).rejects.toThrow(/index 3/);
  });

  it("reports a notes folder covered by an exclusion", () => {
    const { model } = harness({ excludedFolderPaths: ["Notes"] });
    expect(model.managedFolderError()).not.toBeNull();
    expect(harness().model.managedFolderError()).toBeNull();
  });

  it("validates and deduplicates non-working weekdays", async () => {
    const { model, host, settings } = harness();
    await expect(model.setNonWorkingWeekdays([7])).rejects.toThrow();
    await model.setNonWorkingWeekdays([6, 0, 6]);
    expect(settings.availability.nonWorkingWeekdays).toEqual([0, 6]);
    expect(host.persist).not.toHaveBeenCalled();
    await model.setNonWorkingWeekdays([5]);
    expect(host.changed).toHaveBeenCalledOnce();
  });

  it("keeps personal time off sorted and trimmed", async () => {
    const { model, settings } = harness();
    await model.addPersonalTimeOff();
    await model.addPersonalTimeOff();
    const [first, second] = settings.availability.personalTimeOff;
    await model.updatePersonalTimeOff(second!.id, {
      from: "2020-01-01",
      label: " Trip ",
    });

    expect(settings.availability.personalTimeOff[0]).toMatchObject({
      id: second!.id,
      label: "Trip",
    });
    await model.deletePersonalTimeOff(first!.id);
    expect(settings.availability.personalTimeOff).toHaveLength(1);
  });

  it("saves mode and context changes without refreshing data", async () => {
    const { model, host, settings } = harness();
    await model.setMode("inbox");
    await model.setContextFilter("");
    await model.setContextFilter("Work");
    expect(settings).toMatchObject({ mode: "inbox", contextFilter: "Work" });
    expect(host.persist).toHaveBeenCalledTimes(2);
    expect(host.changed).not.toHaveBeenCalled();
  });
});
