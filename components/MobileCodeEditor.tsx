import React, { useRef, useEffect, useState } from 'react';
import Editor from '@monaco-editor/react';

interface MobileCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: string;
  placeholder?: string;
}

export const MobileCodeEditor: React.FC<MobileCodeEditorProps> = ({
  value,
  onChange,
  language,
  placeholder = "// Your code here"
}) => {
  const editorRef = useRef<any>(null);
  const [editorError, setEditorError] = useState(false);

  const handleEditorDidMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    
    // Mobile-specific configurations
    editor.updateOptions({
      fontSize: 13,
      lineHeight: 19,
      minimap: { enabled: false }, // Disable minimap
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      automaticLayout: true,
      padding: { top: 10, bottom: 10 },
      // Mobile touch optimizations
      mouseWheelZoom: true,
      fastScrollSensitivity: 5,
      scrollbar: {
        vertical: 'auto',
        horizontal: 'auto',
        verticalScrollbarSize: 12,
        horizontalScrollbarSize: 12,
      },
      // Hide overview ruler completely
      overviewRulerLanes: 0,
      hideCursorInOverviewRuler: true,
      overviewRulerBorder: false,
    });

    // Set dark theme
    monaco.editor.setTheme('vs-dark');

    // Mobile keyboard handling
    editor.addCommand(monaco.KeyCode.Enter, () => {
      editor.trigger('keyboard', 'type', { text: '\n' });
    });

    // Focus handling for mobile
    editor.onDidFocusEditorText(() => {
      // Scroll editor into view on mobile when focused
      if (window.innerWidth <= 768) {
        setTimeout(() => {
          editor.getContainerDomNode().scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }, 300); // Wait for keyboard to appear
      }
    });
  };

  const handleChange = (newValue: string | undefined) => {
    if (newValue !== undefined) {
      onChange(newValue);
    }
  };

  // Mobile-specific editor options
  const editorOptions = {
    selectOnLineNumbers: true,
    roundedSelection: false,
    readOnly: false,
    cursorStyle: 'line',
    automaticLayout: true,
    fontSize: 13, // Uniform font size
    lineHeight: 19,
    minimap: { enabled: false }, // Always disable minimap
    scrollBeyondLastLine: false,
    wordWrap: 'on' as const,
    theme: 'vs-dark',
    padding: { top: 12, bottom: 12 },
    // Mobile optimizations
    mouseWheelZoom: true,
    multiCursorModifier: 'ctrlCmd' as const,
    formatOnPaste: true,
    formatOnType: true,
    // Touch-friendly scrollbars
    scrollbar: {
      vertical: 'auto' as const,
      horizontal: 'auto' as const,
      verticalScrollbarSize: window.innerWidth <= 768 ? 14 : 12,
      horizontalScrollbarSize: window.innerWidth <= 768 ? 14 : 12,
    },
    // Better mobile selection
    selectionHighlight: false,
    occurrencesHighlight: false,
    // Disable features that don't work well on mobile
    hover: { enabled: window.innerWidth > 768 },
    parameterHints: { enabled: window.innerWidth > 768 },
    suggestOnTriggerCharacters: window.innerWidth > 768,
    // Hide overview ruler (the gray area on the right)
    overviewRulerLanes: 0,
    hideCursorInOverviewRuler: true,
    overviewRulerBorder: false,
  };

  // Fallback textarea for when Monaco fails to load
  if (editorError) {
    return (
      <div className="fallback-editor h-full">
        <textarea
          className="w-full h-full bg-slate-900 text-white font-mono text-sm p-4 border border-slate-700 rounded-md resize-none focus:ring-2 focus:ring-sky-500 focus:border-transparent"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          spellCheck="false"
          style={{ fontSize: '16px' }} // Prevent zoom on iOS
        />
      </div>
    );
  }

  return (
    <div className="mobile-code-editor h-full">
      <Editor
        height="100%"
        language={language.toLowerCase()}
        value={value}
        onChange={handleChange}
        onMount={handleEditorDidMount}
        options={editorOptions}
        theme="vs-dark"
        loading={
          <div className="flex items-center justify-center h-full bg-slate-900 text-slate-400">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p>Loading editor...</p>
            </div>
          </div>
        }
        onValidate={(markers) => {
          // Handle validation errors if needed
        }}
        beforeMount={(monaco) => {
          // Configure Monaco before mounting
          monaco.editor.defineTheme('custom-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [],
            colors: {
              'editor.background': '#0f172a',
              'editor.foreground': '#e2e8f0',
            }
          });
        }}
      />
    </div>
  );
};