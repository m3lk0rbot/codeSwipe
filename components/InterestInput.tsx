
import React from 'react';
import { MobileCodeEditor } from './MobileCodeEditor';

interface CodeEditorProps {
  code: string;
  setCode: (value: string) => void;
  language?: string;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ 
  code, 
  setCode, 
  language = 'javascript' 
}) => {
  return (
    <div className="code-editor-container h-full">
      <label htmlFor="code-editor" className="sr-only">Code Editor</label>
      <div className="h-full rounded-md border border-slate-700/50 overflow-hidden bg-slate-900 shadow-sm ring-1 ring-inset ring-slate-700/50 focus-within:ring-2 focus-within:ring-inset focus-within:ring-red-500 transition">
        <MobileCodeEditor
          value={code}
          onChange={setCode}
          language={language}
          placeholder="// Your solution goes here..."
        />
      </div>
    </div>
  );
};
