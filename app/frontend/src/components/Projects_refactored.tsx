import { CrudPage } from './CrudPage';
import { ProjectDetailsDialog } from './ProjectDetailsDialog';
import { projectsConfig } from '../configs/projects';
import { useDialog } from '../hooks/useDialog';
import { Project } from '../types/models';

export function Projects() {
  const detailsDialog = useDialog<Project>();

  // Override the view action to use our custom details dialog
  const enhancedConfig = {
    ...projectsConfig,
    table: {
      ...projectsConfig.table,
      actions: projectsConfig.table.actions.map(action =>
        action.label === 'View'
          ? { ...action, onClick: (item: Project) => detailsDialog.open(item) }
          : action
      ),
    },
  };

  return (
    <>
      <CrudPage config={enhancedConfig} />

      {/* Custom Details Dialog */}
      <ProjectDetailsDialog
        open={detailsDialog.isOpen}
        onOpenChange={detailsDialog.setIsOpen}
        project={detailsDialog.data}
      />
    </>
  );
}