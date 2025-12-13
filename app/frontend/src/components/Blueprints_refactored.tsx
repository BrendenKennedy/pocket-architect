import { CrudPage } from './CrudPage';
import { BlueprintDetailsDialog } from './BlueprintDetailsDialog';
import { blueprintsConfig } from '../configs/blueprints';
import { useDialog } from '../hooks/useDialog';
import { Blueprint } from '../types/models';

export function Blueprints() {
  const detailsDialog = useDialog<Blueprint>();

  return (
    <>
      <CrudPage
        config={blueprintsConfig}
        onView={(item) => detailsDialog.open(item)}
      />

      {/* Custom Details Dialog */}
      <BlueprintDetailsDialog
        open={detailsDialog.isOpen}
        onOpenChange={detailsDialog.setIsOpen}
        blueprint={detailsDialog.data}
      />
    </>
  );
}