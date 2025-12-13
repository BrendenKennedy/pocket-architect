import { CrudPage } from './CrudPage';
import { SecurityDetailsDialog } from './SecurityDetailsDialog';
import { securityPageConfig } from '../configs/security';
import { useDialog } from '../hooks/useDialog';
import { SecurityItem } from '../types/models';

export function Security() {
  const detailsDialog = useDialog<SecurityItem>();

  // Override view actions to use custom details dialog
  const enhancedConfig = {
    ...securityPageConfig,
    tabs: securityPageConfig.tabs?.map(tab => ({
      ...tab,
      table: {
        ...tab.table,
        actions: tab.table.actions.map(action =>
          action.label === 'View'
            ? { ...action, onClick: (item: any) => detailsDialog.open(item) }
            : action
        ),
      },
    })),
  };

  return (
    <>
      <CrudPage config={enhancedConfig} />

      {/* Custom Details Dialog */}
      <SecurityDetailsDialog
        open={detailsDialog.isOpen}
        onOpenChange={detailsDialog.setIsOpen}
        item={detailsDialog.data}
      />
    </>
  );
}