import type { Project, ProjectItem } from '@srb/types';
import { getItemId, getItemName, getItemOrder, getItemParentId } from '@srb/types';

interface ProjectTreeProps {
  project: Project;
  onSelectMap: (mapId: string) => void;
  onNewMap: (parentId?: string) => void;
  onNewFolder: (parentId?: string) => void;
}

interface TreeNode {
  item: ProjectItem;
  children: TreeNode[];
}

/** Builds a nested tree from the flat project.items list. */
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

export function ProjectTree({ project, onSelectMap, onNewMap, onNewFolder }: ProjectTreeProps) {
  const roots = buildTree(project.items);
  return (
    <div className="project-tree">
      <div className="project-tree-toolbar">
        <button type="button" onClick={() => onNewMap(undefined)} title="Nouvelle map à la racine">
          + Map
        </button>
        <button
          type="button"
          onClick={() => onNewFolder(undefined)}
          title="Nouveau dossier à la racine"
        >
          + Dossier
        </button>
      </div>
      <ul className="tree-list">
        {roots.map((node) => (
          <TreeNodeView
            key={getItemId(node.item)}
            node={node}
            depth={0}
            activeMapId={project.activeMapId}
            onSelectMap={onSelectMap}
            onNewMap={onNewMap}
            onNewFolder={onNewFolder}
          />
        ))}
      </ul>
    </div>
  );
}

interface TreeNodeViewProps {
  node: TreeNode;
  depth: number;
  activeMapId: string | null;
  onSelectMap: (mapId: string) => void;
  onNewMap: (parentId?: string) => void;
  onNewFolder: (parentId?: string) => void;
}

function TreeNodeView({
  node,
  depth,
  activeMapId,
  onSelectMap,
  onNewMap,
  onNewFolder,
}: TreeNodeViewProps) {
  const id = getItemId(node.item);
  const name = getItemName(node.item);
  const isFolder = node.item.type === 'folder';
  const isActive = !isFolder && id === activeMapId;

  return (
    <li>
      <div
        className={`tree-row${isActive ? ' active' : ''}${isFolder ? ' folder' : ''}`}
        style={{ paddingLeft: 8 + depth * 14 }}
        onClick={() => {
          if (!isFolder) onSelectMap(id);
        }}
      >
        <span className="tree-icon">{isFolder ? '📁' : '🗺️'}</span>
        <span className="tree-name">{name}</span>
        {isFolder && (
          <span className="tree-actions">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNewMap(id);
              }}
              title="Ajouter une map dans ce dossier"
            >
              +M
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onNewFolder(id);
              }}
              title="Ajouter un sous-dossier"
            >
              +F
            </button>
          </span>
        )}
      </div>
      {node.children.length > 0 && (
        <ul className="tree-list">
          {node.children.map((child) => (
            <TreeNodeView
              key={getItemId(child.item)}
              node={child}
              depth={depth + 1}
              activeMapId={activeMapId}
              onSelectMap={onSelectMap}
              onNewMap={onNewMap}
              onNewFolder={onNewFolder}
            />
          ))}
        </ul>
      )}
    </li>
  );
}
