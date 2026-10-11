import type { ReactNode } from "react";
import {
  ChevronDown,
  Monitor,
  Moon,
  MousePointer2,
  Settings2,
  Sun,
  Volume2,
} from "lucide-react";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { useNotificationPreferences } from "@/hooks/use-notification-preferences";

const themeOptions = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
] as const;

function SettingRow({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-6 px-4 py-4 sm:px-5">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const {
    preferences,
    setSoundEnabled,
    setPopupEnabled,
    setAlwaysShowCursor,
    setCategoryPreference,
    setSoundVolume,
  } = useNotificationPreferences();
  const selectedTheme =
    themeOptions.find((option) => option.value === theme) ?? themeOptions[1];
  const ThemeIcon = selectedTheme.icon;

  return (
    <div className="mx-auto max-w-4xl space-y-9 pb-12">
      <header className="space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-primary">
          <Settings2 className="size-4" />
          Preferences
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
          Settings
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground">
          Personalize how Synodos looks and how collaboration feels across your
          documents.
        </p>
      </header>

      <section aria-label="Appearance">
        <div className="flex items-center gap-2 pb-3">
          <Sun className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Appearance</h2>
        </div>
        <div className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-card/40 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex min-w-0 items-center gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-border/60 bg-muted/60 text-foreground">
              <ThemeIcon className="size-5" />
            </span>
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground">Theme</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose light, dark, or match your system.
              </p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger
              className="flex h-10 w-full items-center gap-2 rounded-lg border border-border/70 bg-background/70 px-3 text-sm font-medium text-foreground outline-none transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring sm:w-44"
              aria-label="Choose theme"
            >
              <ThemeIcon className="size-4 text-muted-foreground" />
              <span>{selectedTheme.label}</span>
              <ChevronDown className="ml-auto size-4 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              <DropdownMenuRadioGroup
                value={selectedTheme.value}
                onValueChange={(value) => {
                  const option = themeOptions.find(
                    (entry) => entry.value === value,
                  );
                  if (option) setTheme(option.value);
                }}
              >
                {themeOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <DropdownMenuRadioItem
                      key={option.value}
                      value={option.value}
                      className="cursor-pointer"
                    >
                      <Icon className="size-4 text-muted-foreground" />
                      {option.label}
                    </DropdownMenuRadioItem>
                  );
                })}
              </DropdownMenuRadioGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </section>

      <section aria-labelledby="editor-settings-heading">
        <div className="mb-3 flex items-center gap-2">
          <Settings2 className="size-4 text-muted-foreground" />
          <h2
            id="editor-settings-heading"
            className="text-sm font-semibold text-foreground"
          >
            Editor Settings
          </h2>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/40 shadow-sm">
          <div className="border-b border-border/60 px-4 py-3 sm:px-5">
            <p className="text-sm text-muted-foreground">
              These preferences apply to your editor sessions and stay in sync
              with the settings in the document sidebar.
            </p>
          </div>
          <div className="divide-y divide-border/60">
            <SettingRow
              title="Notification sound"
              description="Play a sound when collaborators join or leave."
            >
              <Switch
                checked={preferences.soundEnabled}
                onCheckedChange={setSoundEnabled}
                aria-label="Notification sound"
              />
            </SettingRow>
            <SettingRow
              title="Notification pop-up"
              description="Show a pop-up for collaborator activity."
            >
              <Switch
                checked={preferences.popupEnabled}
                onCheckedChange={setPopupEnabled}
                aria-label="Notification pop-up"
              />
            </SettingRow>
            <SettingRow
              title="Presence alerts"
              description="Notify you when collaborators join or leave a document."
            >
              <Switch
                checked={preferences.categories.presence}
                onCheckedChange={(value) =>
                  setCategoryPreference("presence", value)
                }
                aria-label="Presence alerts"
              />
            </SettingRow>
            <SettingRow
              title="Access alerts"
              description="Notify you about document access and membership changes."
            >
              <Switch
                checked={preferences.categories.access}
                onCheckedChange={(value) =>
                  setCategoryPreference("access", value)
                }
                aria-label="Access alerts"
              />
            </SettingRow>
            <SettingRow
              title="Sound volume"
              description="Set the volume for collaboration sounds."
            >
              <div className="flex w-36 items-center gap-3">
                <Volume2
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={preferences.soundVolume}
                  onChange={(event) =>
                    setSoundVolume(Number(event.currentTarget.value))
                  }
                  aria-label="Sound volume"
                  aria-valuetext={`${Math.round(preferences.soundVolume * 100)} percent`}
                  className="w-full accent-primary"
                />
              </div>
            </SettingRow>
            <SettingRow
              title="Always show cursor"
              description="Keep collaborator cursor labels visible while they are in the document."
            >
              <Switch
                checked={preferences.alwaysShowCursor}
                onCheckedChange={setAlwaysShowCursor}
                aria-label="Always show cursor"
              />
            </SettingRow>
          </div>
          <div className="flex items-center gap-2 border-t border-border/60 bg-muted/20 px-4 py-3 text-xs text-muted-foreground sm:px-5">
            <MousePointer2 className="size-3.5 shrink-0" aria-hidden="true" />
            <span>
              Preference changes are saved automatically and sync with editor
              settings.
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
