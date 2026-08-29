import { useState, type ReactNode } from 'react';

type FileName = 'app.py' | 'utils.py' | 'README.md' | 'requirements.txt';

const codeByFile: Record<FileName, string[]> = {
  'app.py': [
    'import streamlit as st',
    'from ui_styles import inject_custom_css',
    'from views import login_view, quiz_view, short_quiz_view',
    'from data_providers import get_quiz_questions, get_short_quiz_questions, get_answer_questions',
    '',
    'st.set_page_config(page_title="배틀그라운드 모의고사", layout="centered")',
    'inject_custom_css()', '', '# 세션 상태 관리',
    'if "logged_in" not in st.session_state:',
    '    st.session_state.logged_in = False', '',
    'if "submitted" not in st.session_state:',
    '    st.session_state.submitted = False',
  ],
  'utils.py': ['def load_questions(path):', '    with open(path, encoding="utf-8") as file:', '        return json.load(file)', '', 'def calculate_score(answers):', '    return sum(answer.is_correct for answer in answers)'],
  'README.md': ['# Streamlit quiz app', '', '배틀그라운드 퀴즈를 풀고 결과를 확인하는 프로젝트입니다.', '', '## Run', 'streamlit run app.py'],
  'requirements.txt': ['streamlit==1.37.0', 'pandas==2.2.2'],
};

const quickPrompts = ['어떤 웹 접근성 표준을 충족하지 못했는지 점검해줘', '발생한 에러를 수정해줘', '지금까지의 수정사항을 커밋해줘'];

function Glyph({ children, size = 16 }: { children: ReactNode; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>;
}

function Chevron({ open }: { open: boolean }) {
  return <span className={`inline-flex transition-transform ${open ? 'rotate-90' : ''}`}><Glyph size={13}><path d="m9 18 6-6-6-6" /></Glyph></span>;
}

function FileIcon() {
  return <span className="text-[#657184]"><Glyph size={15}><path d="M6 2.5h8l4 4v15H6z" /><path d="M14 2.5v4h4" /></Glyph></span>;
}

function Explorer({ activeFile, onFileSelect }: { activeFile: FileName; onFileSelect: (file: FileName) => void }) {
  const [filesOpen, setFilesOpen] = useState(true);
  const [srcOpen, setSrcOpen] = useState(true);
  const [viewsOpen, setViewsOpen] = useState(false);
  const [graphOpen, setGraphOpen] = useState(true);
  const otherFiles: FileName[] = ['utils.py', 'README.md', 'requirements.txt'];
  return (
    <aside className="flex min-h-0 w-55 shrink-0 flex-col border-r border-[#e5e7eb] bg-[#fafafa] text-[13px] text-[#384152] [&_svg]:h-[17px] [&_svg]:w-[17px]">
      <section className="min-h-0 flex-[0_0_53%] overflow-hidden border-b border-[#e5e7eb]">
        <button type="button" onClick={() => setFilesOpen(!filesOpen)} className="flex h-9 w-full items-center gap-1.5 border-b border-[#e5e7eb] px-3 text-left text-[12px] font-bold tracking-[.02em] text-[#4a5565]"><Chevron open={filesOpen} /> EXPLORER</button>
        {filesOpen && <div className="py-1.5">
          <button type="button" onClick={() => setSrcOpen(!srcOpen)} className="flex h-7 w-full items-center gap-1 px-3 text-left hover:bg-[#f0f3f8]"><Chevron open={srcOpen} /><span className="text-[#1688ee]"><Glyph size={16}><path d="M3 6h6l2 2h10v11H3z" /></Glyph></span>src</button>
          {srcOpen && <>
            <button type="button" onClick={() => onFileSelect('app.py')} className={`flex h-7 w-full items-center gap-1.5 pl-7 text-left ${activeFile === 'app.py' ? 'bg-[#eaf3ff] font-semibold text-[#178cf3]' : 'hover:bg-[#f0f3f8]'}`}><FileIcon /> app.py</button>
            <button type="button" onClick={() => setViewsOpen(!viewsOpen)} className="flex h-7 w-full items-center gap-1 pl-6 text-left hover:bg-[#f0f3f8]"><Chevron open={viewsOpen} /><span className="text-[#1688ee]"><Glyph size={16}><path d="M3 6h6l2 2h10v11H3z" /></Glyph></span>views</button>
            {viewsOpen && <div className="pl-11 text-[12px] leading-6 text-[#788397]">login_view.py<br />quiz_view.py</div>}
          </>}
          {otherFiles.map((file) => <button key={file} type="button" onClick={() => onFileSelect(file)} className={`flex h-7 w-full items-center gap-1.5 px-3 text-left ${activeFile === file ? 'bg-[#eaf3ff] font-semibold text-[#178cf3]' : 'hover:bg-[#f0f3f8]'}`}><FileIcon /> {file}</button>)}
        </div>}
      </section>
      <section className="min-h-0 flex-1 overflow-hidden">
        <button type="button" onClick={() => setGraphOpen(!graphOpen)} className="flex h-9 w-full items-center gap-1.5 border-b border-[#e5e7eb] px-3 text-left text-[12px] font-bold tracking-[.02em] text-[#30343b]"><Chevron open={graphOpen} /> GRAPH</button>
        {graphOpen && <div className="scrollbar-subtle h-[calc(100%-34px)] overflow-y-auto px-3 py-4">
          <div className="relative space-y-4 pl-5 before:absolute before:top-2 before:bottom-3 before:left-[7px] before:w-px before:bg-[#d7dce5]">
            {[
              ['#3b82f6', 'Merge remote repository', 'songsonghi', 'main'], ['#f59e0b', 'Initial commit', 'Mynameis', 'develop'], ['#ec4899', 'Add README', 'rangbabo', 'feature/ui'], ['#ec4899', 'Add Streamlit quiz app', 'kiki', 'feature/ui'],
            ].map(([color, title, author, branch]) => <div key={title} className="relative">
              <span className="absolute top-1 -left-5.25 z-10 size-3 rounded-full border-2 border-white" style={{ backgroundColor: color, boxShadow: `0 0 0 1px ${color}` }} />
              <div className="flex items-center gap-1.5 whitespace-nowrap font-semibold text-[#34373d]"><span className="truncate">{title}</span><span className="rounded-full px-2 py-0.5 text-[10px] font-semibold text-white" style={{ backgroundColor: color }}>{branch}</span></div>
              <div className="mt-1 text-[11px] text-[#9298a2]">{author}</div>
            </div>)}
          </div>
          <div className="mt-6 mb-2 flex items-center justify-between text-[11px] font-bold tracking-[.08em] text-[#858b95]"><span>BRANCHES</span><span className="text-lg font-normal">＋</span></div>
          {['main', 'develop', 'feature/ui'].map((branch, index) => <div key={branch} className={`flex h-7.5 items-center gap-2 rounded px-2 font-mono text-[11px] ${index === 0 ? 'bg-[#eaf3ff] text-[#2076df]' : ''}`}><span className="size-2 rounded-full" style={{ backgroundColor: ['#3b82f6', '#f59e0b', '#ec4899'][index] }} />{branch}{index === 0 && <span className="ml-auto">✓</span>}</div>)}
        </div>}
      </section>
    </aside>
  );
}

function ProblemsPanel() {
  type ProblemSeverity = 'warning' | 'error' | 'info';
  type Problem = { message: string; severity: ProblemSeverity };
  const [tab, setTab] = useState('PROBLEMS');
  const groups: [string, Problem[]][] = [
    ['app.py', [
      { message: 'Import "views.login_view" could not be resolved', severity: 'error' },
      { message: '"submitted" is not defined', severity: 'warning' },
    ]],
    ['views/quiz_view.py', [
      { message: 'Argument of type "None" cannot be assigned to parameter "user_id" of type "str"', severity: 'warning' },
      { message: 'Variable "result" is assigned but never used', severity: 'info' },
    ]],
    ['utils.py', [
      { message: 'Expected indented block', severity: 'error' },
      { message: 'Function "load_questions" is not accessed', severity: 'warning' },
    ]],
  ];
  const allProblems = groups.flatMap(([, problems]) => problems);
  const problemCounts = allProblems.reduce<Record<ProblemSeverity, number>>(
    (counts, problem) => ({ ...counts, [problem.severity]: counts[problem.severity] + 1 }),
    { warning: 0, error: 0, info: 0 },
  );
  const severityColors: Record<ProblemSeverity, string> = {
    warning: '#f5b700', error: '#ff3347', info: '#1688ee',
  };
  const ProblemIcon = ({ severity }: { severity: ProblemSeverity }) => (
    <span style={{ color: severityColors[severity] }} className="inline-flex shrink-0">
      {severity === 'warning' ? (
        <Glyph size={15}><path d="M10.3 3.7 2.2 18a2 2 0 0 0 1.8 3h16a2 2 0 0 0 1.8-3L13.7 3.7a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></Glyph>
      ) : (
        <Glyph size={15}><circle cx="12" cy="12" r="9" /><path d="M12 8v5" /><path d="M12 17h.01" /></Glyph>
      )}
    </span>
  );
  return <section className="h-52 shrink-0 border-t border-[#e5e7eb] bg-white text-[11px] [&_svg]:h-[16px] [&_svg]:w-[16px]">
    <div className="flex h-8 items-center border-b border-[#e5e7eb] bg-[#fafafa] px-2">
      {['PROBLEMS', 'OUTPUT', 'DEBUG CONSOLE', 'TERMINAL'].map((item) => <button key={item} type="button" onClick={() => setTab(item)} className={`flex h-full items-center gap-1.5 px-2 text-[10px] font-semibold ${tab === item ? 'border-b-2 border-[#6c47ff] text-[#6c47ff]' : 'text-[#7b8494]'}`}>
        {item}
        {item === 'PROBLEMS' && (
          <span className="flex items-center gap-1.5 font-bold">
            {(['warning', 'error', 'info'] as ProblemSeverity[]).map((severity) => problemCounts[severity] > 0 && (
              <span key={severity} style={{ color: severityColors[severity] }}>{problemCounts[severity]}</span>
            ))}
          </span>
        )}
      </button>)}
      <div className="ml-auto flex h-5 w-43 items-center rounded border border-[#e3e6eb] bg-white px-2 text-[#c2c7d0]">▽&nbsp; Filter (e.g. text, **/*.ts, !...)</div>
    </div>
    <div className="scrollbar-subtle h-[calc(100%-32px)] overflow-y-auto px-3 py-1.5">
      {tab !== 'PROBLEMS' ? <div className="p-4 text-[#a0a6b0]">표시할 {tab.toLowerCase()} 내용이 없습니다.</div> : groups.map(([name, issues]) => <div key={name} className="mb-1.5">
        <div className="flex h-6 items-center gap-1 text-[13px] font-semibold text-[#526072]"><Chevron open />{name}<span className="text-[10px] text-[#9da5b1]">({issues.length})</span></div>
        {issues.map((issue, index) => <div key={issue.message} className="flex h-6 items-center gap-2 pl-5 text-[#5e6878]"><ProblemIcon severity={issue.severity} /><span className="truncate">{issue.message}</span><span className="ml-auto whitespace-nowrap text-[#a5adba]">Pylance&nbsp;&nbsp; Ln {index ? 14 : 3}, Col {index ? 8 : 6}</span></div>)}
      </div>)}
    </div>
  </section>;
}

function CodeEditor({ file }: { file: FileName }) {
  return <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-white">
    <div className="flex h-8.5 shrink-0 items-center border-b border-[#e5e7eb] bg-[#f7f7f7]"><div className="flex h-full min-w-25 items-center gap-2 border-r border-[#e5e7eb] bg-white px-3 text-xs font-semibold text-[#333b49]">{file}<span className="ml-auto text-base font-normal text-[#737985]">×</span></div></div>
    <div className="flex h-9 shrink-0 items-center border-b border-[#e5e7eb] px-3 text-[12px] font-medium text-[#657184]">AI Version<div className="ml-auto flex items-center gap-3 text-[#9ba5b4]"><Glyph size={16}><rect x="8" y="8" width="11" height="12" rx="1" /><path d="M16 8V4H5v12h3" /></Glyph><Glyph size={16}><path d="m9 14-4-4 4-4" /><path d="M5 10h8a5 5 0 0 1 5 5v2" /></Glyph><Glyph size={16}><path d="m5 12 4 4L19 6" /></Glyph></div></div>
    <div className="min-h-0 flex-1 overflow-auto py-1 font-mono text-[13px] leading-7 text-[#344054]">
      {codeByFile[file].map((line, index) => {
        const number = index + 1, isError = file === 'app.py' && number === 3, isAdded = file === 'app.py' && number >= 12 && number <= 14;
        return <div key={`${number}-${line}`} className={`grid min-w-max grid-cols-[42px_1fr] ${isError ? 'bg-[#fff0f0] text-[#d82f3f]' : isAdded ? 'bg-[#effcf4] text-[#078841]' : ''}`}><span className={`select-none border-r px-3 text-right ${isError ? 'border-[#ffc9ce] bg-[#ffe5e7] text-[#f04452]' : isAdded ? 'border-[#c9f2d7] bg-[#ddf8e8] text-[#08a34a]' : 'border-transparent text-[#a4adba]'}`}>{number}</span><code className="whitespace-pre px-3">{line || ' '}</code></div>;
      })}
    </div>
    <ProblemsPanel />
  </section>;
}

function AiAssistant() {
  const [message, setMessage] = useState('');
  const [sentMessages, setSentMessages] = useState<string[]>([]);
  const send = (value: string) => { const trimmed = value.trim(); if (!trimmed) return; setSentMessages((items) => [...items, trimmed]); setMessage(''); };
  return <aside className="flex min-h-0 flex-col border-l border-[#e5e7eb] bg-[#fcfcfc] px-3 py-10 text-[#171717] [&_svg]:h-[17px] [&_svg]:w-[17px]">
    <h2 className="m-0 px-5 text-[16px] font-bold leading-7">현재 웹사이트에서<br />수정하고 싶은 내용이 무엇인가요?</h2>
    <div className="scrollbar-subtle mt-6 min-h-0 flex-1 overflow-y-auto">{sentMessages.map((item, index) => <div key={`${item}-${index}`} className="ml-4 mt-2 rounded-xl bg-[#eee] px-3 py-2 text-[12px] leading-5">{item}</div>)}</div>
    <div className="mb-5 space-y-2">{quickPrompts.map((prompt) => <button key={prompt} type="button" onClick={() => send(prompt)} className="flex max-w-full items-center gap-2 rounded-full bg-[#f0f0f0] px-4 py-2.5 text-left text-[11px] font-medium hover:bg-[#e8e4ff]"><Glyph size={14}><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></Glyph><span className="truncate">{prompt}</span></button>)}</div>
    <form onSubmit={(event) => { event.preventDefault(); send(message); }} className="shrink-0 rounded-2xl bg-white p-3 shadow-[0_2px_8px_rgb(0_0_0/12%)]">
      <textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="메시지를 입력해주세요" rows={2} className="w-full resize-none border-0 bg-transparent text-[13px] outline-none placeholder:text-[#b4b4b4]" />
      <div className="mt-2 flex items-center justify-between"><button type="button" className="text-xl font-light">＋</button><button type="submit" aria-label="메시지 전송" className="grid size-7 place-items-center rounded-full hover:bg-[#f0edff]"><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m3 4 18 8-18 8 2-7 10-1-10-1z" /></svg></button></div>
    </form>
  </aside>;
}

export default function CodeTab() {
  const [activeFile, setActiveFile] = useState<FileName>('app.py');
  return <><main className="flex h-full min-h-0 min-w-0 overflow-hidden bg-white [&_svg]:h-[17px] [&_svg]:w-[17px]"><Explorer activeFile={activeFile} onFileSelect={setActiveFile} /><CodeEditor file={activeFile} /></main><AiAssistant /></>;
}
