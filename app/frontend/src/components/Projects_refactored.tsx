import { CrudPage } from './CrudPage';
import { ProjectDetailsDialog } from './ProjectDetailsDialog';
import { projectsConfig } from '../configs/projects';
import { useDialog } from '../hooks/useDialog';
import { Project } from '../types/models';

export function Projects() {
  const detailsDialog = useDialog<Project>();

  return (
    <>
      <CrudPage
        config={projectsConfig}
        onView={(item) => detailsDialog.open(item)}
      />

      {/* Custom Details Dialog */}
      <ProjectDetailsDialog
        open={detailsDialog.isOpen}
        onOpenChange={detailsDialog.setIsOpen}
        project={detailsDialog.data}
      />
    </>
  );
}