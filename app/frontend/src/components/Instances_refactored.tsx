import { CrudPage } from './CrudPage';
import { InstanceDetailsDialog } from './InstanceDetailsDialog';
import { instancesConfig } from '../configs/instances';
import { useDialog } from '../hooks/useDialog';
import { Instance } from '../types/models';

export function Instances() {
  const detailsDialog = useDialog<Instance>();

  return (
    <>
      <CrudPage
        config={instancesConfig}
        onView={(item) => detailsDialog.open(item)}
      />

      {/* Custom Details Dialog */}
      <InstanceDetailsDialog
        open={detailsDialog.isOpen}
        onOpenChange={detailsDialog.setIsOpen}
        instance={detailsDialog.data}
      />
    </>
  );
}