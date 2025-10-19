"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

type SimpleRichTextEditorProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
};

const TOOLBAR_BUTTONS = [
  {
    label: "H1",
    ariaLabel: "Başlık 1",
    command: { type: "formatBlock", value: "h1" }
  },
  {
    label: "H2",
    ariaLabel: "Başlık 2",
    command: { type: "formatBlock", value: "h2" }
  },
  {
    label: "B",
    ariaLabel: "Kalın",
    command: { type: "bold" as const }
  },
  {
    label: "İ",
    ariaLabel: "İtalik",
    command: { type: "italic" as const }
  },
  {
    label: "•",
    ariaLabel: "Madde işaretli liste",
    command: { type: "insertUnorderedList" as const }
  },
  {
    label: "Temizle",
    ariaLabel: "Biçimlendirmeyi temizle",
    command: { type: "removeFormat" as const }
  }
];

export function SimpleRichTextEditor({
  id,
  value,
  onChange,
  onBlur,
  disabled
}: SimpleRichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }
    const nextValue = value ?? "";
    if (editor.innerHTML !== nextValue) {
      editor.innerHTML = nextValue;
    }
  }, [value]);

  const focusEditor = () => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }
    editor.focus();
    const selection = window.getSelection();
    if (!selection || selection.rangeCount > 0) {
      return;
    }
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  const emitChange = () => {
    onChange(editorRef.current?.innerHTML ?? "");
  };

  const handleInput = () => {
    emitChange();
  };

  const handleBlur = () => {
    onBlur?.();
    emitChange();
  };

  const applyCommand = (command: (typeof TOOLBAR_BUTTONS)[number]["command"]) => {
    if (disabled) {
      return;
    }
    focusEditor();
    const commandName = command.type;
    const argument = "value" in command ? command.value : undefined;
    if (typeof document !== "undefined") {
      document.execCommand(commandName, false, argument);
      emitChange();
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {TOOLBAR_BUTTONS.map((button) => (
          <button
            key={button.label}
            type="button"
            className={cn(
              "rounded-lg border border-brand-dark/20 bg-white px-3 py-1 text-xs font-medium text-brand-dark transition",
              "hover:border-brand-dark/40 hover:bg-brand hover:text-brand-dark",
              disabled && "cursor-not-allowed opacity-60 hover:bg-white hover:text-brand-dark"
            )}
            onClick={() => applyCommand(button.command)}
            aria-label={button.ariaLabel}
            disabled={disabled}
          >
            {button.label}
          </button>
        ))}
      </div>
      <div
        ref={editorRef}
        id={id}
        role="textbox"
        aria-multiline="true"
        className={cn(
          "min-h-[160px] w-full rounded-2xl border border-brand-dark/20 bg-white p-4 text-sm leading-relaxed text-brand-dark shadow-inner",
          "focus:outline-none focus:ring-2 focus:ring-brand",
          "disabled:cursor-not-allowed disabled:opacity-60",
          "[&:empty:before]:pointer-events-none [&:empty:before]:text-brand-dark/40 [&:empty:before]:content-[attr(data-placeholder)]"
        )}
        contentEditable={!disabled}
        data-placeholder="SEO metninizi buraya ekleyin..."
        onInput={handleInput}
        onBlur={handleBlur}
        suppressContentEditableWarning
      />
    </div>
  );
}
