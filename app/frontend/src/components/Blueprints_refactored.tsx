import { CrudPage } from './CrudPage';
import { BlueprintDetailsDialog } from './BlueprintDetailsDialog';
import { blueprintsConfig } from '../configs/blueprints';
import { useDialog } from '../hooks/useDialog';
import { Blueprint } from '../types/models';

export function Blueprints() {
  const detailsDialog = useDialog<Blueprint>();

  // Override the view action to use our custom details dialog
  const enhancedConfig = {
    ...blueprintsConfig,
    table: {
      ...blueprintsConfig.table,
      actions: blueprintsConfig.table.actions.map(action =>
        action.label === 'View'
          ? { ...action, onClick: (item: Blueprint) => detailsDialog.open(item) }
          : action
      ),
    },
  };

  return (
    <>
      <CrudPage config={enhancedConfig} />

      {/* Custom Details Dialog */}
      <BlueprintDetailsDialog
        open={detailsDialog.isOpen}
        onOpenChange={detailsDialog.setIsOpen}
        blueprint={detailsDialog.data}
      />
    </>
  );
}