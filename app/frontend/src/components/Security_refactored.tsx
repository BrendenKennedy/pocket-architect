import { CrudPage } from './CrudPage';
import { SecurityDetailsDialog } from './SecurityDetailsDialog';
import { securityPageConfig } from '../configs/security';
import { useDialog } from '../hooks/useDialog';

export function Security() {
  const detailsDialog = useDialog<any>();

  return (
    <>
      <CrudPage
        config={securityPageConfig}
        onView={(item) => detailsDialog.open(item)}
      />

      {/* Custom Details Dialog */}
      <SecurityDetailsDialog
        open={detailsDialog.isOpen}
        onOpenChange={detailsDialog.setIsOpen}
        item={detailsDialog.data}
      />
    </>
  );
}