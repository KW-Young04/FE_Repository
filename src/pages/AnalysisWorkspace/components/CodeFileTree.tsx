import { useState } from 'react';

type FileItem = {
  id: string;
  name: string;
  type: 'file' | 'folder';
  children?: FileItem[];
};

const files: FileItem[] = [
  {
    id: 'src',
    name: 'src',
    type: 'folder',
    children: [
      {
        id: 'pages',
        name: 'pages',
        type: 'folder',
        children: [
          {
            id: 'main',
            name: 'Main.tsx',
            type: 'file',
          },
          {
            id: 'header',
            name: 'Header.tsx',
            type: 'file',
          },
        ],
      },
      {
        id: 'components',
        name: 'components',
        type: 'folder',
        children: [
          {
            id: 'button',
            name: 'Button.tsx',
            type: 'file',
          },
        ],
      },
      {
        id: 'app',
        name: 'App.tsx',
        type: 'file',
      },
    ],
  },
  {
    id: 'public',
    name: 'public',
    type: 'folder',
    children: [
      {
        id: 'favicon',
        name: 'favicon.svg',
        type: 'file',
      },
    ],
  },
  {
    id: 'package',
    name: 'package.json',
    type: 'file',
  },
];

interface CodeFileTreeProps {
  selectedFile: string;
  onSelectFile: (file: string) => void;
}

export default function CodeFileTree({
  selectedFile,
  onSelectFile,
}: CodeFileTreeProps) {
  return (
    <aside className="code-file-tree">
      <div className="code-panel-header">
        EXPLORER
      </div>

      <div className="code-file-tree__repo">
        <span>⌄</span>
        <strong>FE_REPOSITORY</strong>
      </div>

      <div className="code-file-tree__list">
        {files.map((item) => (
          <TreeItem
            key={item.id}
            item={item}
            depth={0}
            selectedFile={selectedFile}
            onSelectFile={onSelectFile}
          />
        ))}
      </div>
    </aside>
  );
}

interface TreeItemProps {
  item: FileItem;
  depth: number;
  selectedFile: string;
  onSelectFile: (file: string) => void;
}

function TreeItem({
  item,
  depth,
  selectedFile,
  onSelectFile,
}: TreeItemProps) {
  const [opened, setOpened] = useState(true);

  const isSelected =
    item.type === 'file' &&
    selectedFile === item.name;

  return (
    <div>
      <button
        type="button"
        className={
          isSelected
            ? 'code-tree-item is-selected'
            : 'code-tree-item'
        }
        style={{
          paddingLeft: `${12 + depth * 14}px`,
        }}
        onClick={() => {
          if (item.type === 'folder') {
            setOpened((current) => !current);
            return;
          }

          onSelectFile(item.name);
        }}
      >
        <span className="code-tree-item__icon">
          {item.type === 'folder'
            ? opened
              ? '⌄'
              : '›'
            : '◇'}
        </span>

        <span>{item.name}</span>
      </button>

      {item.type === 'folder' &&
        opened &&
        item.children?.map((child) => (
          <TreeItem
            key={child.id}
            item={child}
            depth={depth + 1}
            selectedFile={selectedFile}
            onSelectFile={onSelectFile}
          />
        ))}
    </div>
  );
}