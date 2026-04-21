import { useState } from 'react';
import type { Project, ProjectItem } from '@srb/types';
import { getItemId, getItemName, getItemOrder, getItemParentId } from '@srb/types';
import type React from 'react';

const DRAG_MIME = 'application/srb-item-id';

interface ProjectTreeProps {
  project: Project;
  onSelectMap: (mapId: string) => void;
  onNewMap: (parentId?: string) => void;
  onNewFolder: (parentId?: string) => void;
  onRename: (itemId: string, newName: string) => void;
  onDelete: (itemId: string) => void;
  onMove: (sourceId: string, newParentId?: string) => void;
  onOpenMapSettings: (mapId: string) => void;
}

interface TreeNode {
  item: ProjectItem;
  children: TreeNode[];
}

function buildTree(items: ProjectItem[]): TreeNode[] {
  const byParent = new Map<string | undefined, ProjectItem[]>();
  for (const item of items) {
    const parent = getItemParentId(item);
    const bucket = byParent.get(parent);
    if (bucket) bucket.push(item);
    else byParent.set(parent, [item]);
  }
  function build(parentId: string | undefined): TreeNode[] {
    const siblings = byParent.get(parentId) ?? [];
    siblings.sort((a, b) => getItemOrder(a) - getItemOrder(b));
    return siblings.map((item) => ({
      item,
      children: build(getItemId(item)),
    }));
  }
  return build(undefined);
}

export function ProjectTree(props: ProjectTreeProps) {
  const roots = buildTree(props.project.items);
  const [rootIsDropTarget, setRootIsDropTarget] = useState(false);

  const handleRootDragOver = (e: React.DragEvent): void => {
    if (!e.dataTransfer.types.includes(DRAG_MIME)) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setRootIsDropTarget(true);
  };
  const handleRootDragLeave = (): void => setRootIsDropTarget(false);
  const handleRootDrop = (e: React.DragEvent): void => {
    setRootIsDropTarget(false);
    const sourceId = e.dataTransfer.getData(DRAG_MIME);
    if (!sourceId) return;
    e.preventDefault();
    props.onMove(sourceId, undefined);
  };

  return (
    <div className="project-tree">
      <div
        className={`project-tree-toolbar${rootIsDropTarget ? ' drop-target' : ''}`}
        onDragOver={handleRootDragOver}
        onDragLeave={handleRootDragLeave}
        onDrop={handleRootDrop}
      >
        <button type="button" onClick={() => props.onNewMap(undefined)}>
          + Map
        </button>
        <button type="button" onClick={() => props.onNewFolder(undefined)}>
          + Dossier
        </button>
        <span className="tree-hint">
          {rootIsDropTarget ? 'Lâcher ici pour détacher à la racine' : 'Glisse ici = racine'}
        </span>
      </div>
      <ul className="tree-list">
        {roots.map((node) => (
          <TreeNodeView key={getItemId(node.item)} node={node} depth={0} {...props} />
        ))}
      </ul>
    </div>
  );
}

interface TreeNodeViewProps extends ProjectTreeProps {
  node: TreeNode;
  depth: number;
}

function TreeNodeView({
  node,
  depth,
  project,
  onSelectMap,
  onNewMap,
  onNewFolder,
  onRename,
  onDelete,
  onMove,
  onOpenMapSettings,
}: TreeNodeViewProps) {
  const id = getItemId(node.item);
  const name = getItemName(node.item);
  const isFolder = node.item.type === 'folder';
  const isActive = !isFolder && id === project.activeMapId;
  const hasParent = getItemParentId(node.item) !== undefined;

  const [editing, setEditing] = useState(false);
  const [editedName, setEditedName] = useState(name);
  const [isDropTarget, setIsDropTarget] = useState(false);

  const commitRename = (): void => {
    const v = editedName.trim();
    if (v && v !== name) onRename(id, v);
    setEditing(false);
  };

  const handleDragStart = (e: React.DragEvent): void => {
    e.stopPropagation();
    e.dataTransfer.setData(DRAG_MIME, id);
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e: React.DragEvent): void => {
    if (!e.dataTransfer.types.includes(DRAG_MIME)) return;
    e.stopPropagation();
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDropTarget(true);
  };
  const handleDragLeave = (): void => setIsDropTarget(false);
  const handleDrop = (e: React.DragEvent): void => {
    setIsDropTarget(false);
    const sourceId = e.dataTransfer.getData(DRAG_MIME);
    if (!sourceId || sourceId === id) return;
    e.stopPropagation();
    e.preventDefault();
    onMove(sourceId, id);
  };

  const handleDelete = (): void => {
    const kind = isFolder ? 'le dossier' : 'la map';
    const ok = window.confirm(
      `Supprimer ${kind} "${name}" ? Tous ses enfants seront supprimés aussi.`,
    );
    if (ok) onDelete(id);
  };

  return (
    <li>
      <div
        className={`tree-row${isActive ? ' active' : ''}${isFolder ? ' folder' : ''}${isDropTarget ? ' drop-target' : ''}`}
        style={{ paddingLeft: 8 + depth * 14 }}
        draggable={!editing}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => {
          if (editing) return;
          if (!isFolder) onSelectMap(id);
        }}
        onDoubleClick={() => {
          setEditedName(name);
          setEditing(true);
        }}
      >
        <span className="tree-icon">{isFolder ? '📁' : '🗺️'}</span>
        {editing ? (
          <input
            className="tree-rename-input"
            value={editedName}
            autoFocus
            onChange={(e) => setEditedName(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitRename();
              }
              if (e.key === 'Escape') {
                setEditing(false);
              }
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="tree-name">{name}</span>
        )}
        <span className="tree-actions">
          {isFolder && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onNewMap(id);
                }}
                title="Map ici"
              >
                +M
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onNewFolder(id);
                }}
                title="Sous-dossier"
              >
                +F
              </button>
            </>
          )}
          {!isFolder && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenMapSettings(id);
              }}
              title="Paramètres de la map"
            >
              ⚙
            </button>
          )}
          {hasParent && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMove(id, undefined);
              }}
              title="Détacher à la racine"
            >
              ⇡
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setEditedName(name);
              setEditing(true);
            }}
            title="Renommer (dbl-clic)"
          >
            ✎
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            title="Supprimer"
          >
            ✕
          </button>
        </span>
      </div>
      {node.children.length > 0 && (
        <ul className="tree-list">
          {node.children.map((child) => (
            <TreeNodeView
              key={getItemId(child.item)}
              node={child}
              depth={depth + 1}
              project={project}
              onSelectMap={onSelectMap}
              onNewMap={onNewMap}
              onNewFolder={onNewFolder}
              onRename={onRename}
              onDelete={onDelete}
              onMove={onMove}
              onOpenMapSettings={onOpenMapSettings}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
