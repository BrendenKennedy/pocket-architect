import { CrudPage } from './CrudPage';
import { ImageDetailsDialog } from './ImageDetailsDialog';
import { imagesConfig } from '../configs/images';
import { useDialog } from '../hooks/useDialog';
import { Image } from '../types/models';

export function Images() {
  const detailsDialog = useDialog<Image>();

  // Override the view action to use our custom details dialog
  const enhancedConfig = {
    ...imagesConfig,
    table: {
      ...imagesConfig.table,
      actions: imagesConfig.table.actions.map(action =>
        action.label === 'View'
          ? { ...action, onClick: (item: Image) => detailsDialog.open(item) }
          : action
      ),
    },
  };

  return (
    <>
      <CrudPage config={enhancedConfig} />

      {/* Custom Details Dialog */}
      <ImageDetailsDialog
        open={detailsDialog.isOpen}
        onOpenChange={detailsDialog.setIsOpen}
        image={detailsDialog.data}
      />
    </>
  );
}