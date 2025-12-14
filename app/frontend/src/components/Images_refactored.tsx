import { CrudPage } from './CrudPage';
import { ImageDetailsDialog } from './ImageDetailsDialog';
import { imagesConfig } from '../configs/images';
import { useDialog } from '../hooks/useDialog';
import { Image } from '../types/models';

export function Images() {
  const detailsDialog = useDialog<Image>();

  return (
    <>
      <CrudPage
        config={imagesConfig}
        onView={(item) => detailsDialog.open(item)}
      />

      {/* Custom Details Dialog */}
      <ImageDetailsDialog
        open={detailsDialog.isOpen}
        onOpenChange={detailsDialog.setIsOpen}
        image={detailsDialog.data}
      />
    </>
  );
}