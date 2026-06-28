"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { saveProject, deleteProject } from "@/app/actions";
import type { PricingType, Project, ProjectInput } from "@/lib/types";

const LIMITS = { one_liner: 60, tagline: 100, short_desc: 240 } as const;

const PRICING_OPTIONS: { value: PricingType; label: string }[] = [
  { value: "free", label: "Free" },
  { value: "freemium", label: "Freemium" },
  { value: "paid", label: "Paid" },
  { value: "subscription", label: "Subscription" },
  { value: "one_time", label: "One-time purchase" },
];

function emptyInput(): ProjectInput {
  return {
    name: "",
    url: "",
    one_liner: "",
    tagline: "",
    short_desc: "",
    long_desc: "",
    tags: [],
    pricing_type: "freemium",
    contact_email: "",
    logo_url: null,
    screenshot_urls: [],
  };
}

export default function ProjectForm({ project }: { project?: Project }) {
  const router = useRouter();
  const [form, setForm] = useState<ProjectInput>(
    project ? toInput(project) : emptyInput(),
  );
  const [tagsText, setTagsText] = useState(project?.tags.join(", ") ?? "");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  function set<K extends keyof ProjectInput>(key: K, value: ProjectInput[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function uploadAsset(file: File): Promise<string> {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) throw new Error("Not signed in");
    const ext = file.name.split(".").pop() ?? "bin";
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage
      .from("assets")
      .upload(path, file, { upsert: true });
    if (error) throw error;
    return supabase.storage.from("assets").getPublicUrl(path).data.publicUrl;
  }

  async function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      set("logo_url", await uploadAsset(file));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleScreenshots(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    setError("");
    try {
      const urls = await Promise.all(files.map(uploadAsset));
      set("screenshot_urls", [...form.screenshot_urls, ...urls]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    const input: ProjectInput = {
      ...form,
      tags: tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    };
    try {
      await saveProject(input, project?.id);
      // saveProject redirects on success; nothing else to do.
    } catch (err) {
      // redirect() throws a special error we must rethrow.
      if (isRedirectError(err)) throw err;
      setError(err instanceof Error ? err.message : "Save failed");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Field label="Project name" required>
        <input
          required
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          className={inputCls}
        />
      </Field>

      <Field label="Website URL" required>
        <input
          required
          type="url"
          placeholder="https://"
          value={form.url}
          onChange={(e) => set("url", e.target.value)}
          className={inputCls}
        />
      </Field>

      <LimitedField
        label="One-liner"
        help="Short punchy hook (Product Hunt tagline, etc.)"
        value={form.one_liner}
        max={LIMITS.one_liner}
        onChange={(v) => set("one_liner", v)}
      />

      <LimitedField
        label="Tagline"
        help="Slightly longer pitch."
        value={form.tagline}
        max={LIMITS.tagline}
        onChange={(v) => set("tagline", v)}
      />

      <LimitedField
        label="Short description"
        help="The ~240-char blurb most directories want."
        value={form.short_desc}
        max={LIMITS.short_desc}
        textarea
        onChange={(v) => set("short_desc", v)}
      />

      <Field label="Long description" help="Full pitch for HN/Reddit/Indie Hackers.">
        <textarea
          rows={5}
          value={form.long_desc}
          onChange={(e) => set("long_desc", e.target.value)}
          className={inputCls}
        />
      </Field>

      <Field label="Tags" help="Comma-separated.">
        <input
          value={tagsText}
          onChange={(e) => setTagsText(e.target.value)}
          placeholder="saas, productivity, ai"
          className={inputCls}
        />
      </Field>

      <Field label="Pricing">
        <select
          value={form.pricing_type}
          onChange={(e) => set("pricing_type", e.target.value as PricingType)}
          className={inputCls}
        >
          {PRICING_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Contact email">
        <input
          type="email"
          value={form.contact_email}
          onChange={(e) => set("contact_email", e.target.value)}
          className={inputCls}
        />
      </Field>

      <Field label="Logo">
        <div className="flex items-center gap-3">
          {form.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={form.logo_url}
              alt="logo"
              className="h-12 w-12 rounded-lg object-cover"
            />
          )}
          <input type="file" accept="image/*" onChange={handleLogo} />
        </div>
      </Field>

      <Field label="Screenshots">
        <input type="file" accept="image/*" multiple onChange={handleScreenshots} />
        {form.screenshot_urls.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {form.screenshot_urls.map((url) => (
              <div key={url} className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt=""
                  className="h-16 w-24 rounded border border-border object-cover"
                />
                <button
                  type="button"
                  onClick={() =>
                    set(
                      "screenshot_urls",
                      form.screenshot_urls.filter((u) => u !== url),
                    )
                  }
                  className="absolute -right-2 -top-2 h-5 w-5 rounded-full bg-accent text-xs text-accent-fg"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </Field>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      <div className="flex items-center gap-3 border-t border-border pt-4">
        <button
          type="submit"
          disabled={saving || uploading}
          className="rounded-lg bg-accent px-5 py-2 text-sm font-medium text-accent-fg disabled:opacity-50"
        >
          {saving ? "Saving…" : uploading ? "Uploading…" : "Save project"}
        </button>
        <button
          type="button"
          onClick={() => router.push(project ? `/projects/${project.id}` : "/")}
          className="text-sm text-muted"
        >
          Cancel
        </button>
        {project && (
          <button
            type="button"
            onClick={async () => {
              if (confirm("Delete this project and all its progress?")) {
                await deleteProject(project.id);
              }
            }}
            className="ml-auto text-sm text-red-600 dark:text-red-400"
          >
            Delete
          </button>
        )}
      </div>
    </form>
  );
}

const inputCls =
  "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm outline-none focus:border-fg";

function Field({
  label,
  help,
  required,
  children,
}: {
  label: string;
  help?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {help && <span className="block text-xs text-muted">{help}</span>}
      <div className="mt-1">{children}</div>
    </label>
  );
}

function LimitedField({
  label,
  help,
  value,
  max,
  textarea,
  onChange,
}: {
  label: string;
  help?: string;
  value: string;
  max: number;
  textarea?: boolean;
  onChange: (v: string) => void;
}) {
  const over = value.length > max;
  return (
    <div>
      <div className="flex items-end justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span
          className={`text-xs ${over ? "text-red-600 dark:text-red-400" : "text-faint"}`}
        >
          {value.length}/{max}
        </span>
      </div>
      {help && <span className="block text-xs text-muted">{help}</span>}
      <div className="mt-1">
        {textarea ? (
          <textarea
            rows={3}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`${inputCls} ${over ? "border-red-400 dark:border-red-500" : ""}`}
          />
        ) : (
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className={`${inputCls} ${over ? "border-red-400 dark:border-red-500" : ""}`}
          />
        )}
      </div>
    </div>
  );
}

function toInput(p: Project): ProjectInput {
  return {
    name: p.name,
    url: p.url,
    one_liner: p.one_liner,
    tagline: p.tagline,
    short_desc: p.short_desc,
    long_desc: p.long_desc,
    tags: p.tags,
    pricing_type: p.pricing_type,
    contact_email: p.contact_email,
    logo_url: p.logo_url,
    screenshot_urls: p.screenshot_urls,
  };
}

function isRedirectError(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "digest" in err &&
    typeof (err as { digest?: unknown }).digest === "string" &&
    (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}
