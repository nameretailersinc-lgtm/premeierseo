"use client";

import { useMemo, useState } from "react";
import { useTool } from "../ui/ToolContext";
import { useDebounced, usePersistentOptions, useSessionText } from "../ui/primitives";
import type { WidgetProps } from "../types";
import { convertCase, type CaseMode } from "../lib/text/case";
import { Workbench } from "../lib/text/workbench";

/*
 * Case converter. Each button shows its own effect in its label; the chosen mode applies live.
 * The result is editable, and edits are kept until the input or the mode changes.
 */

const MODES: { mode: CaseMode; label: string; hint: string }[] = [
  { mode: "lower", label: "lowercase", hint: "all small letters" },
  { mode: "upper", label: "UPPERCASE", hint: "all capitals" },
  { mode: "sentence", label: "Sentence case", hint: "capital after . ! ?" },
  { mode: "title", label: "Title Case", hint: "small words stay lowercase" },
  { mode: "capitalize", label: "Capitalize Each Word", hint: "every word" },
  { mode: "alternating", label: "aLtErNaTiNg", hint: "every other letter" },
  { mode: "inverse", label: "InVeRsE", hint: "swap capitals and small letters" },
  { mode: "camel", label: "camelCase", hint: "for code" },
  { mode: "pascal", label: "PascalCase", hint: "for code" },
  { mode: "snake", label: "snake_case", hint: "for code" },
  { mode: "kebab", label: "kebab-case", hint: "for URLs and CSS" },
  { mode: "constant", label: "CONSTANT_CASE", hint: "for code" },
];

const SAMPLE = "THIS TEXT WAS TYPED WITH CAPS LOCK ON. i noticed too late! the guide to SEO and the web";

export default function CaseConverter({ toolId, config }: WidgetProps) {
  const { announce, used } = useTool();
  const initial = (MODES.find((m) => m.mode === config?.mode)?.mode ?? "lower") as CaseMode;
  const [o, setO] = usePersistentOptions(toolId, { mode: initial });
  const [input, setInput] = useSessionText(toolId);
  const text = useDebounced(input, input.length > 50_000 ? 300 : 60);
  const mode = (MODES.find((m) => m.mode === o.mode)?.mode ?? "lower") as CaseMode;
  const computed = useMemo(() => (text ? convertCase(text, mode) : ""), [text, mode]);
  // Manual edits to the result, tied to the input and mode they were made for.
  const [edit, setEdit] = useState<{ key: string; value: string } | null>(null);
  const key = `${mode}\u0000${text}`;
  const output = edit && edit.key === key ? edit.value : computed;

  return (
    <Workbench
      toolId={toolId}
      input={input}
      setInput={setInput}
      sample={SAMPLE}
      output={output}
      onOutputChange={(v) => setEdit({ key, value: v })}
      inputLabel="Text to convert"
      outputLabel={`Result: ${MODES.find((m) => m.mode === mode)?.label}`}
      note={edit && edit.key === key ? "Edited by you; choose a case again to reset" : undefined}
      options={
        <div role="group" aria-label="Convert to" className="grid gap-2">
          <p className="field-label">Convert to</p>
          <div className="flex flex-wrap gap-2">
            {MODES.map((m) => (
              <button
                key={m.mode}
                type="button"
                className="chip"
                aria-pressed={mode === m.mode}
                title={m.hint}
                onClick={() => {
                  setO({ mode: m.mode });
                  setEdit(null);
                  used("mode");
                  announce(`Converted to ${m.label}`);
                }}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      }
    />
  );
}
