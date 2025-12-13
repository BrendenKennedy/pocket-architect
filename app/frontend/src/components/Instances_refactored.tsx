import { CrudPage } from './CrudPage';
import { InstanceDetailsDialog } from './InstanceDetailsDialog';
import { instancesConfig } from '../configs/instances';
import { useDialog } from '../hooks/useDialog';
import { Instance } from '../types/models';

export function Instances() {
  const detailsDialog = useDialog<Instance>();

  // Override the view action to use our custom details dialog
  const enhancedConfig = {
    ...instancesConfig,
    table: {
      ...instancesConfig.table,
      actions: instancesConfig.table.actions.map(action =>
        action.label === 'View'
          ? { ...action, onClick: (item: Instance) => detailsDialog.open(item) }
          : action
      ),
    },
  };

  return (
    <>
      <CrudPage config={enhancedConfig} />

      {/* Custom Details Dialog */}
      <InstanceDetailsDialog
        open={detailsDialog.isOpen}
        onOpenChange={detailsDialog.setIsOpen}
        instance={detailsDialog.data}
      />
    </>
  );
}